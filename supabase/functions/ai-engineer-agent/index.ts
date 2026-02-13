import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Types ────────────────────────────────────────

interface FailurePattern {
  rpc_name: string;
  count: number;
  latest_error: string;
  sample_params: any;
}

interface ActivityAnomaly {
  action_type: string;
  failure_count: number;
  total_count: number;
  failure_rate: number;
  common_error: string;
}

interface MoneyAnomaly {
  operation: string;
  total_amount: number;
  tx_count: number;
}

interface Finding {
  title: string;
  title_ar: string;
  description: string;
  description_ar: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  affected_area: string;
  technical_reason: string;
  suggested_fix: string;
  confidence_score: number;
  risk_label: 'critical' | 'high' | 'medium' | 'low';
  code_patch?: string;
}

// ─── Data Collection ──────────────────────────────

async function collectFailurePatterns(supabase: any, since: string): Promise<FailurePattern[]> {
  const { data, error } = await supabase
    .from('ai_failures')
    .select('rpc_name, error_message, parameters, created_at')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error || !data?.length) return [];

  // Group by rpc_name
  const groups: Record<string, { count: number; errors: string[]; params: any }> = {};
  for (const row of data) {
    if (!groups[row.rpc_name]) {
      groups[row.rpc_name] = { count: 0, errors: [], params: row.parameters };
    }
    groups[row.rpc_name].count++;
    if (row.error_message && groups[row.rpc_name].errors.length < 5) {
      groups[row.rpc_name].errors.push(row.error_message);
    }
  }

  return Object.entries(groups)
    .filter(([_, g]) => g.count >= 2) // At least 2 failures = pattern
    .map(([name, g]) => ({
      rpc_name: name,
      count: g.count,
      latest_error: g.errors[0] || 'unknown',
      sample_params: g.params,
    }))
    .sort((a, b) => b.count - a.count);
}

async function collectActivityAnomalies(supabase: any, since: string): Promise<ActivityAnomaly[]> {
  const { data, error } = await supabase
    .from('ai_activity_stream')
    .select('action_type, success, error_code')
    .gte('created_at', since)
    .limit(1000);

  if (error || !data?.length) return [];

  const groups: Record<string, { total: number; failures: number; errors: string[] }> = {};
  for (const row of data) {
    if (!groups[row.action_type]) {
      groups[row.action_type] = { total: 0, failures: 0, errors: [] };
    }
    groups[row.action_type].total++;
    if (row.success === false) {
      groups[row.action_type].failures++;
      if (row.error_code && groups[row.action_type].errors.length < 3) {
        groups[row.action_type].errors.push(row.error_code);
      }
    }
  }

  return Object.entries(groups)
    .filter(([_, g]) => g.failures > 0 && g.failures / g.total > 0.1) // >10% failure rate
    .map(([action, g]) => ({
      action_type: action,
      failure_count: g.failures,
      total_count: g.total,
      failure_rate: Math.round((g.failures / g.total) * 100),
      common_error: g.errors[0] || 'unknown',
    }))
    .sort((a, b) => b.failure_rate - a.failure_rate);
}

async function collectMoneyAnomalies(supabase: any, since: string): Promise<MoneyAnomaly[]> {
  const { data, error } = await supabase
    .from('ai_money_flow')
    .select('operation, amount, from_user, to_user')
    .gte('created_at', since)
    .limit(500);

  if (error || !data?.length) return [];

  const groups: Record<string, { total: number; count: number }> = {};
  for (const row of data) {
    if (!groups[row.operation]) {
      groups[row.operation] = { total: 0, count: 0 };
    }
    groups[row.operation].total += Number(row.amount) || 0;
    groups[row.operation].count++;
  }

  return Object.entries(groups).map(([op, g]) => ({
    operation: op,
    total_amount: g.total,
    tx_count: g.count,
  }));
}

// ─── AI Analysis ──────────────────────────────────

async function analyzeWithAI(
  apiKey: string,
  failures: FailurePattern[],
  activities: ActivityAnomaly[],
  moneyFlows: MoneyAnomaly[]
): Promise<Finding[]> {
  const prompt = `You are WINOVA's AI Engineering Agent. Analyze the following system data from the last hour and identify actionable technical issues.

## RPC Failure Patterns (recurring errors)
${JSON.stringify(failures, null, 2)}

## Activity Anomalies (high failure rates)
${JSON.stringify(activities, null, 2)}

## Money Flow Summary
${JSON.stringify(moneyFlows, null, 2)}

## Your Task
1. Identify REAL technical problems (not noise)
2. Determine root causes
3. Suggest specific code fixes
4. Rate confidence (0-100%) and risk (critical/high/medium/low)

## Rules
- Only report genuine issues, not expected behavior
- If no issues found, return empty array
- Be specific about file paths and function names
- Include code patches when possible
- NEVER suggest changes to production data

Respond with a JSON array of findings:
[{
  "title": "Short problem title",
  "title_ar": "العنوان بالعربي",
  "description": "What failed and why",
  "description_ar": "الوصف بالعربي",
  "severity": "critical|high|medium|low",
  "affected_area": "e.g. P2P, Wallet, Auth",
  "technical_reason": "Root cause analysis",
  "suggested_fix": "Specific fix description",
  "confidence_score": 85,
  "risk_label": "low|medium|high|critical",
  "code_patch": "optional: actual code diff or snippet"
}]

If there are no genuine issues, respond with: []`;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: 'You are a senior backend engineer analyzing production telemetry. Respond only with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('AI analysis failed:', response.status, text);
    throw new Error(`AI analysis failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim() || '[]';

  // Extract JSON from possible markdown code blocks
  let jsonStr = content;
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();

  try {
    const findings = JSON.parse(jsonStr);
    return Array.isArray(findings) ? findings : [];
  } catch (e) {
    console.error('Failed to parse AI response:', e, content);
    return [];
  }
}

// ─── GitHub PR Creation ───────────────────────────

async function createGitHubPR(
  token: string,
  owner: string,
  repo: string,
  findings: Finding[],
  reportId: string
): Promise<{ pr_url: string; pr_number: number; branch: string } | null> {
  if (!token || !owner || !repo || findings.length === 0) return null;

  const branchName = `ai-fix/${reportId.slice(0, 8)}`;
  const timestamp = new Date().toISOString().slice(0, 16);

  try {
    // 1. Get default branch SHA
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' },
    });
    if (!repoRes.ok) { await repoRes.text(); return null; }
    const repoData = await repoRes.json();
    const defaultBranch = repoData.default_branch || 'main';

    const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`, {
      headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3+json' },
    });
    if (!refRes.ok) { await refRes.text(); return null; }
    const refData = await refRes.json();
    const baseSha = refData.object.sha;

    // 2. Create branch
    const createBranchRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: baseSha }),
    });
    if (!createBranchRes.ok) { await createBranchRes.text(); return null; }

    // 3. Create report file on branch
    const reportContent = findings.map((f, i) => `
## Finding ${i + 1}: ${f.title}

**Severity:** ${f.severity} | **Confidence:** ${f.confidence_score}% | **Risk:** ${f.risk_label}
**Affected Area:** ${f.affected_area}

### Description
${f.description}

### Technical Reason
${f.technical_reason}

### Suggested Fix
${f.suggested_fix}

${f.code_patch ? `### Code Patch\n\`\`\`\n${f.code_patch}\n\`\`\`` : ''}
`).join('\n---\n');

    const fileContent = `# AI Engineer Report — ${timestamp}

Report ID: \`${reportId}\`
Findings: ${findings.length}
Critical: ${findings.filter(f => f.severity === 'critical').length}

${reportContent}

---
*Generated by WINOVA AI Engineer Agent*
*This PR requires human review before merge*
`;

    const createFileRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/ai-reports/${reportId.slice(0, 8)}.md`,
      {
        method: 'PUT',
        headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `AI Fix: ${findings[0].title}`,
          content: btoa(unescape(encodeURIComponent(fileContent))),
          branch: branchName,
        }),
      }
    );
    if (!createFileRes.ok) { await createFileRes.text(); return null; }

    // 4. Create PR
    const criticalCount = findings.filter(f => f.severity === 'critical').length;
    const highCount = findings.filter(f => f.severity === 'high').length;
    const avgConfidence = Math.round(findings.reduce((s, f) => s + f.confidence_score, 0) / findings.length);

    const prTitle = findings.length === 1
      ? `AI Fix: ${findings[0].title}`
      : `AI Fix: ${findings.length} issues detected (${criticalCount} critical, ${highCount} high)`;

    const prBody = `## 🤖 AI Engineer Report

### Summary
- **Findings:** ${findings.length}
- **Critical:** ${criticalCount}
- **High:** ${highCount}
- **Average Confidence:** ${avgConfidence}%

### Findings

${findings.map((f, i) => `#### ${i + 1}. ${f.title}
- **What failed:** ${f.description}
- **How often:** Detected in hourly scan
- **Why:** ${f.technical_reason}
- **Proposed solution:** ${f.suggested_fix}
- **Risk level:** ${f.risk_label}
- **Confidence:** ${f.confidence_score}%
`).join('\n')}

---

⚠️ **This PR was generated by the WINOVA AI Engineer Agent.**
- Label: \`ai-generated\`
- Requires human review and approval before merge
- Report ID: \`${reportId}\`
`;

    const prRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
      method: 'POST',
      headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: prTitle,
        body: prBody,
        head: branchName,
        base: defaultBranch,
        labels: ['ai-generated'],
      }),
    });

    if (!prRes.ok) {
      const errText = await prRes.text();
      console.error('PR creation failed:', errText);
      return null;
    }

    const prData = await prRes.json();

    // 5. Try to add label (may fail if label doesn't exist — that's ok)
    try {
      await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${prData.number}/labels`, {
        method: 'POST',
        headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ labels: ['ai-generated'] }),
      });
    } catch { /* label may not exist — ignore */ }

    return {
      pr_url: prData.html_url,
      pr_number: prData.number,
      branch: branchName,
    };
  } catch (err) {
    console.error('GitHub PR error:', err);
    return null;
  }
}

// ─── Main Handler ─────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // ── Auth Gate: Service Role or Admin ──
  {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const svcKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    if (token !== svcKey) {
      const authClient = createClient(Deno.env.get('SUPABASE_URL')!, svcKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: { user } } = await authClient.auth.getUser(token);
      if (!user) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: roles } = await authClient.from('user_roles').select('role').eq('user_id', user.id);
      if (!roles?.some((r: any) => r.role === 'admin')) {
        return new Response(JSON.stringify({ error: 'Admin access required' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
  }

  const t0 = Date.now();

  try {
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) throw new Error('LOVABLE_API_KEY not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const githubToken = Deno.env.get('GITHUB_TOKEN') || '';
    const githubOwner = Deno.env.get('GITHUB_REPO_OWNER') || '';
    const githubRepo = Deno.env.get('GITHUB_REPO_NAME') || '';

    // Look back 1 hour
    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    console.log(`[AI Engineer] Starting analysis since ${since}`);

    // ─── Collect Data ──────────────────────────────
    const [failures, activities, moneyFlows] = await Promise.all([
      collectFailurePatterns(supabase, since),
      collectActivityAnomalies(supabase, since),
      collectMoneyAnomalies(supabase, since),
    ]);

    console.log(`[AI Engineer] Data: ${failures.length} failure patterns, ${activities.length} activity anomalies, ${moneyFlows.length} money flows`);

    // If no data at all, create a minimal report
    if (failures.length === 0 && activities.length === 0 && moneyFlows.length === 0) {
      const { data: report } = await supabase.from('ai_engineer_reports').insert({
        analysis_type: 'hourly_scan',
        status: 'completed',
        failures_scanned: 0,
        activities_scanned: 0,
        money_flows_scanned: 0,
        findings_count: 0,
        patches_proposed: 0,
        critical_issues: 0,
        summary: 'No anomalies detected in the last hour.',
        summary_ar: 'لم يتم اكتشاف أي مشاكل في الساعة الأخيرة.',
        duration_ms: Date.now() - t0,
        model_used: 'none',
      }).select('id').single();

      return new Response(JSON.stringify({
        success: true,
        report_id: report?.id,
        findings: 0,
        message: 'No anomalies detected',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ─── AI Analysis ───────────────────────────────
    const findings = await analyzeWithAI(apiKey, failures, activities, moneyFlows);
    console.log(`[AI Engineer] AI found ${findings.length} issues`);

    // ─── Create Report ─────────────────────────────
    const criticalCount = findings.filter(f => f.severity === 'critical').length;

    const { data: report } = await supabase.from('ai_engineer_reports').insert({
      analysis_type: 'hourly_scan',
      status: 'completed',
      failures_scanned: failures.length,
      activities_scanned: activities.length,
      money_flows_scanned: moneyFlows.length,
      findings_count: findings.length,
      patches_proposed: findings.filter(f => f.code_patch).length,
      critical_issues: criticalCount,
      summary: findings.length > 0
        ? `Found ${findings.length} issues: ${findings.map(f => f.title).join(', ')}`
        : 'System healthy — no actionable issues.',
      summary_ar: findings.length > 0
        ? `تم اكتشاف ${findings.length} مشاكل: ${findings.map(f => f.title_ar).join('، ')}`
        : 'النظام سليم — لا توجد مشاكل.',
      raw_analysis: { failures, activities, moneyFlows, findings } as any,
      duration_ms: Date.now() - t0,
      model_used: 'google/gemini-2.5-flash',
    }).select('id').single();

    const reportId = report?.id || crypto.randomUUID();

    // ─── GitHub PR (only if findings exist) ────────
    let prInfo: { pr_url: string; pr_number: number; branch: string } | null = null;
    if (findings.length > 0 && githubToken) {
      prInfo = await createGitHubPR(githubToken, githubOwner, githubRepo, findings, reportId);
      console.log(`[AI Engineer] GitHub PR: ${prInfo?.pr_url || 'skipped'}`);

      // Update report with PR info
      if (prInfo) {
        await supabase.from('ai_engineer_reports').update({
          github_pr_url: prInfo.pr_url,
          github_pr_number: prInfo.pr_number,
          github_branch: prInfo.branch,
        }).eq('id', reportId);
      }
    }

    // ─── Store Findings as Proposals ───────────────
    for (const finding of findings) {
      await supabase.from('ai_proposals').insert({
        title: finding.title,
        title_ar: finding.title_ar,
        description: finding.description,
        description_ar: finding.description_ar,
        proposal_type: 'bug_fix',
        priority: finding.severity,
        affected_area: finding.affected_area,
        status: 'pending',
        risk_level: finding.risk_label,
        code_snippet: finding.code_patch || null,
        confidence_score: finding.confidence_score,
        risk_label: finding.risk_label,
        github_pr_url: prInfo?.pr_url || null,
        github_pr_number: prInfo?.pr_number || null,
        source: 'ai_engineer',
        report_id: reportId,
      });
    }

    // ─── Store in Analysis Logs ────────────────────
    // Get a default agent for logging (use first active agent)
    const { data: defaultAgent } = await supabase
      .from('ai_agents')
      .select('id')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (defaultAgent) {
      for (const finding of findings) {
        await supabase.from('ai_analysis_logs').insert({
          agent_id: defaultAgent.id,
          analysis_type: 'ai_engineer_scan',
          title: finding.title,
          title_ar: finding.title_ar,
          description: finding.description,
          description_ar: finding.description_ar,
          severity: finding.severity,
          affected_area: finding.affected_area,
          technical_reason: finding.technical_reason,
          suggested_fix: finding.suggested_fix,
          status: 'open',
          metadata: {
            confidence_score: finding.confidence_score,
            risk_label: finding.risk_label,
            report_id: reportId,
            github_pr_url: prInfo?.pr_url,
          },
        });
      }
    }

    // ─── Post to AI Chat Room ──────────────────────
    if (defaultAgent && findings.length > 0) {
      const summaryContent = `🔧 **تقرير المهندس AI (الساعة ${new Date().toLocaleTimeString('ar-SA')})**

📊 البيانات: ${failures.length} أنماط أخطاء | ${activities.length} شذوذ | ${moneyFlows.length} تدفق مالي
🔍 الاكتشافات: ${findings.length} مشكلة (${criticalCount} حرجة)
${prInfo ? `📋 PR: ${prInfo.pr_url}` : ''}

${findings.map((f, i) => `${i + 1}. **${f.title_ar}** [${f.severity}] — ثقة ${f.confidence_score}%`).join('\n')}`;

      await supabase.from('ai_chat_room').insert({
        agent_id: defaultAgent.id,
        content: summaryContent,
        content_ar: summaryContent,
        message_type: 'engineer_report',
        message_category: criticalCount > 0 ? 'critical' : 'warning',
        is_summary: true,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      report_id: reportId,
      findings: findings.length,
      critical: criticalCount,
      patches: findings.filter(f => f.code_patch).length,
      github_pr: prInfo?.pr_url || null,
      duration_ms: Date.now() - t0,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: unknown) {
    console.error('[AI Engineer] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
