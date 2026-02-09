import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const AI_SYSTEM_USER_ID = '00000000-0000-0000-0000-a10000000001';
const AGENT_NAME = 'Performance Analyst';
const AGENT_NAME_AR = 'محلل الأداء';

// ─── Chat Reporter ────────────────────────────────

async function postToChat(sb: any, agentId: string, content: string, category: string = 'info', type: string = 'analysis') {
  await sb.from('ai_chat_room').insert({
    agent_id: agentId,
    content,
    content_ar: content,
    message_type: type,
    message_category: category,
    is_summary: true,
  });
}

async function postToDM(sb: any, content: string, messageType: string = 'agent_report') {
  const { data: convos } = await sb
    .from('conversations')
    .select('id')
    .or(`participant1_id.eq.${AI_SYSTEM_USER_ID},participant2_id.eq.${AI_SYSTEM_USER_ID}`)
    .limit(10);

  if (convos) {
    for (const convo of convos) {
      await sb.from('direct_messages').insert({
        conversation_id: convo.id,
        sender_id: AI_SYSTEM_USER_ID,
        content,
        message_type: messageType,
        is_read: false,
      });
    }
  }
}

async function logActivity(sb: any, actionType: string, entityId: string | null, success: boolean, durationMs: number, beforeState: any = null, afterState: any = null) {
  await sb.from('ai_activity_stream').insert({
    action_type: actionType,
    entity_type: 'performance_analysis',
    entity_id: entityId,
    success,
    duration_ms: durationMs,
    role: 'agent',
    before_state: beforeState,
    after_state: afterState,
  });
}

// ─── Data Collection ──────────────────────────────

async function collectPerformanceData(sb: any) {
  const [tableStats, indexStats, dbOverview, slowQueries] = await Promise.all([
    sb.rpc('get_table_performance_stats'),
    sb.rpc('get_index_usage_stats'),
    sb.rpc('get_database_size_overview'),
    sb.rpc('get_slow_query_stats'),
  ]);

  return {
    tables: tableStats.data || [],
    indexes: indexStats.data || [],
    overview: dbOverview.data || [],
    slowQueries: slowQueries.data || [],
  };
}

// ─── Analysis Engine ──────────────────────────────

interface Finding {
  type: 'slow_query' | 'missing_index' | 'unused_index' | 'table_bloat' | 'seq_scan_heavy' | 'vacuum_needed';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  title_ar: string;
  description: string;
  description_ar: string;
  table_name: string;
  metric_value: string;
  suggested_fix: string;
  suggested_fix_ar: string;
  risk_level: string;
  auto_fixable: boolean;
}

function analyzeLocally(data: any): Finding[] {
  const findings: Finding[] = [];

  // 1. Sequential scan heavy tables (no index usage)
  for (const t of data.tables) {
    if (t.seq_scan > 100 && t.idx_scan === 0 && t.row_estimate > 1000) {
      findings.push({
        type: 'seq_scan_heavy',
        severity: t.row_estimate > 10000 ? 'critical' : 'high',
        title: `Table "${t.table_name}" has ${t.seq_scan} sequential scans and ZERO index scans`,
        title_ar: `جدول "${t.table_name}" لديه ${t.seq_scan} مسح تسلسلي وصفر مسح فهرسة`,
        description: `With ${t.row_estimate} rows, every query does a full table scan. This degrades as data grows.`,
        description_ar: `مع ${t.row_estimate} صف، كل استعلام يمسح الجدول كاملاً. هذا يتدهور مع نمو البيانات.`,
        table_name: t.table_name,
        metric_value: `seq_scan=${t.seq_scan}, idx_scan=0, rows=${t.row_estimate}`,
        suggested_fix: `Analyze query patterns on "${t.table_name}" and add indexes on commonly filtered columns.`,
        suggested_fix_ar: `تحليل أنماط الاستعلام على "${t.table_name}" وإضافة فهارس على الأعمدة المفلترة بشكل شائع.`,
        risk_level: 'low',
        auto_fixable: false,
      });
    }

    // High seq scan ratio
    if (t.seq_scan > 50 && t.idx_scan > 0 && t.row_estimate > 500) {
      const ratio = t.seq_scan / (t.idx_scan || 1);
      if (ratio > 10) {
        findings.push({
          type: 'seq_scan_heavy',
          severity: 'medium',
          title: `Table "${t.table_name}" has ${ratio.toFixed(1)}x more seq scans than index scans`,
          title_ar: `جدول "${t.table_name}" لديه ${ratio.toFixed(1)}x مسح تسلسلي أكثر من مسح الفهارس`,
          description: `seq_scan=${t.seq_scan} vs idx_scan=${t.idx_scan}. Consider adding or optimizing indexes.`,
          description_ar: `مسح تسلسلي=${t.seq_scan} مقابل مسح فهرسة=${t.idx_scan}. فكر بإضافة أو تحسين الفهارس.`,
          table_name: t.table_name,
          metric_value: `ratio=${ratio.toFixed(1)}, seq=${t.seq_scan}, idx=${t.idx_scan}`,
          suggested_fix: `Review queries hitting "${t.table_name}" and ensure WHERE clauses match existing indexes.`,
          suggested_fix_ar: `مراجعة الاستعلامات على "${t.table_name}" والتأكد من تطابق شروط WHERE مع الفهارس الموجودة.`,
          risk_level: 'low',
          auto_fixable: false,
        });
      }
    }

    // 2. Table bloat (dead tuples)
    if (t.n_dead_tup > 10000) {
      const bloatRatio = t.n_live_tup > 0 ? (t.n_dead_tup / t.n_live_tup) : 999;
      if (bloatRatio > 0.2) {
        findings.push({
          type: 'table_bloat',
          severity: bloatRatio > 1 ? 'high' : 'medium',
          title: `Table "${t.table_name}" has ${t.n_dead_tup} dead tuples (${(bloatRatio * 100).toFixed(0)}% bloat)`,
          title_ar: `جدول "${t.table_name}" لديه ${t.n_dead_tup} صف ميت (${(bloatRatio * 100).toFixed(0)}% تضخم)`,
          description: `Dead tuples waste storage and slow scans. VACUUM should be run.`,
          description_ar: `الصفوف الميتة تهدر التخزين وتبطئ المسح. يجب تشغيل VACUUM.`,
          table_name: t.table_name,
          metric_value: `dead=${t.n_dead_tup}, live=${t.n_live_tup}, bloat=${(bloatRatio * 100).toFixed(0)}%`,
          suggested_fix: `Run VACUUM ANALYZE on "${t.table_name}" to reclaim space.`,
          suggested_fix_ar: `تشغيل VACUUM ANALYZE على "${t.table_name}" لاستعادة المساحة.`,
          risk_level: 'low',
          auto_fixable: true,
        });
      }
    }

    // 3. Missing vacuum
    if (t.row_estimate > 1000 && !t.last_autovacuum && !t.last_vacuum) {
      findings.push({
        type: 'vacuum_needed',
        severity: 'medium',
        title: `Table "${t.table_name}" has NEVER been vacuumed`,
        title_ar: `جدول "${t.table_name}" لم يتم تنظيفه أبداً`,
        description: `Table has ${t.row_estimate} rows but no vacuum history. This can cause bloat over time.`,
        description_ar: `الجدول لديه ${t.row_estimate} صف بدون سجل تنظيف. هذا قد يسبب تضخم مع الوقت.`,
        table_name: t.table_name,
        metric_value: `rows=${t.row_estimate}, last_vacuum=never`,
        suggested_fix: `Schedule VACUUM ANALYZE on "${t.table_name}".`,
        suggested_fix_ar: `جدولة VACUUM ANALYZE على "${t.table_name}".`,
        risk_level: 'low',
        auto_fixable: true,
      });
    }
  }

  // 4. Unused indexes (wasting space)
  for (const idx of data.indexes) {
    if (idx.idx_scan === 0 && idx.index_name && !idx.index_name.endsWith('_pkey')) {
      findings.push({
        type: 'unused_index',
        severity: 'low',
        title: `Index "${idx.index_name}" on "${idx.table_name}" has ZERO scans`,
        title_ar: `فهرس "${idx.index_name}" على "${idx.table_name}" لديه صفر استخدام`,
        description: `This index (${idx.index_size}) is never used. It slows down writes without benefiting reads.`,
        description_ar: `هذا الفهرس (${idx.index_size}) غير مستخدم أبداً. يبطئ الكتابة بدون فائدة للقراءة.`,
        table_name: idx.table_name,
        metric_value: `scans=0, size=${idx.index_size}`,
        suggested_fix: `Consider dropping unused index "${idx.index_name}" to improve write performance.`,
        suggested_fix_ar: `فكر في حذف الفهرس غير المستخدم "${idx.index_name}" لتحسين أداء الكتابة.`,
        risk_level: 'medium',
        auto_fixable: false,
      });
    }
  }

  // 5. Slow queries (from pg_stat_statements if available)
  for (const q of data.slowQueries) {
    if (q.mean_exec_time > 500) {
      findings.push({
        type: 'slow_query',
        severity: q.mean_exec_time > 2000 ? 'critical' : q.mean_exec_time > 1000 ? 'high' : 'medium',
        title: `Slow query averaging ${q.mean_exec_time.toFixed(0)}ms (called ${q.calls} times)`,
        title_ar: `استعلام بطيء بمتوسط ${q.mean_exec_time.toFixed(0)}ms (تم استدعاؤه ${q.calls} مرة)`,
        description: `Query: ${q.query_text}. Total time: ${(q.total_exec_time / 1000).toFixed(1)}s across ${q.calls} calls.`,
        description_ar: `استعلام: ${q.query_text}. الوقت الإجمالي: ${(q.total_exec_time / 1000).toFixed(1)}ث عبر ${q.calls} استدعاء.`,
        table_name: 'N/A',
        metric_value: `mean=${q.mean_exec_time.toFixed(0)}ms, calls=${q.calls}, total=${(q.total_exec_time / 1000).toFixed(1)}s`,
        suggested_fix: `Analyze the execution plan with EXPLAIN ANALYZE and consider adding appropriate indexes.`,
        suggested_fix_ar: `تحليل خطة التنفيذ باستخدام EXPLAIN ANALYZE وإضافة الفهارس المناسبة.`,
        risk_level: 'low',
        auto_fixable: false,
      });
    }
  }

  // Sort by severity
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return findings.slice(0, 15); // Cap at 15
}

// ─── AI-Enhanced Analysis ─────────────────────────

async function enhanceWithAI(findings: Finding[], rawData: any, apiKey: string): Promise<string> {
  const prompt = `You are the Performance Analyst AI agent for WINOVA platform.

PERFORMANCE DATA COLLECTED:
- Tables scanned: ${rawData.tables.length}
- Indexes scanned: ${rawData.indexes.length}
- Database overview: ${JSON.stringify(rawData.overview)}
- Slow queries found: ${rawData.slowQueries.length}

LOCAL ANALYSIS FINDINGS (${findings.length} issues):
${JSON.stringify(findings.map(f => ({
    type: f.type,
    severity: f.severity,
    title: f.title,
    metric: f.metric_value,
    fix: f.suggested_fix,
  })), null, 2)}

TASK:
1. Prioritize the top 5 most impactful findings
2. For each, explain WHY it matters for WINOVA specifically
3. Suggest concrete SQL fixes where possible
4. Identify any patterns (e.g., multiple tables with same issue)
5. Rate overall database health: critical/needs_attention/healthy

Respond in JSON:
{
  "health_status": "critical|needs_attention|healthy",
  "health_score": 0-100,
  "summary": "2-3 sentence overall assessment",
  "summary_ar": "ملخص بالعربي",
  "top_issues": [
    {
      "rank": 1,
      "finding_type": "...",
      "table": "...",
      "impact": "why this matters",
      "impact_ar": "لماذا هذا مهم",
      "sql_fix": "CREATE INDEX ... or VACUUM ... or null if complex",
      "requires_approval": true/false,
      "risk_of_fix": "low|medium|high"
    }
  ],
  "patterns": ["pattern descriptions"],
  "recommended_next_scan": "1h|6h|24h"
}`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are a PostgreSQL performance expert. Respond only with valid JSON. Be precise and actionable." },
        { role: "user", content: prompt },
      ],
      temperature: 0.1,
      max_tokens: 3000,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[PerfAnalyst] AI failed:", response.status, text);
    throw new Error(`AI analysis failed: ${response.status}`);
  }

  const result = await response.json();
  return result.choices?.[0]?.message?.content?.trim() || "{}";
}

// ─── Format Report ────────────────────────────────

function formatReport(findings: Finding[], aiAnalysis: any): string {
  const icon = aiAnalysis.health_status === 'critical' ? '🔴' : aiAnalysis.health_status === 'needs_attention' ? '🟡' : '🟢';

  let report = `${icon} **تقرير تحليل الأداء — ${AGENT_NAME_AR}**\n`;
  report += `━━━━━━━━━━━━━━━━━━━━━━\n`;
  report += `🤖 الوكيل: ${AGENT_NAME_AR}\n`;
  report += `🏅 الرتبة: Expert\n`;
  report += `📊 الصحة: ${aiAnalysis.health_score}/100\n`;
  report += `🔍 المشاكل المكتشفة: ${findings.length}\n\n`;
  report += `📝 ${aiAnalysis.summary_ar || aiAnalysis.summary}\n\n`;

  if (aiAnalysis.top_issues && aiAnalysis.top_issues.length > 0) {
    report += `**أهم المشاكل:**\n`;
    for (const issue of aiAnalysis.top_issues.slice(0, 5)) {
      const reqApproval = issue.requires_approval ? '⏳ يحتاج موافقة' : '✅ قابل للتنفيذ التلقائي';
      report += `\n${issue.rank}. **${issue.table || issue.finding_type}**\n`;
      report += `   ${issue.impact_ar || issue.impact}\n`;
      report += `   🔧 الإصلاح: \`${issue.sql_fix || 'يحتاج مراجعة يدوية'}\`\n`;
      report += `   ${reqApproval} | المخاطر: ${issue.risk_of_fix}\n`;
    }
  }

  if (aiAnalysis.patterns && aiAnalysis.patterns.length > 0) {
    report += `\n**أنماط مكتشفة:**\n`;
    for (const p of aiAnalysis.patterns) {
      report += `• ${p}\n`;
    }
  }

  report += `\n⏰ المسح القادم المقترح: ${aiAnalysis.recommended_next_scan || '6h'}`;
  return report;
}

// ─── Create Execution Requests ────────────────────

async function createFixRequests(sb: any, aiAnalysis: any, agentId: string) {
  const requestIds: string[] = [];

  if (!aiAnalysis.top_issues) return requestIds;

  for (const issue of aiAnalysis.top_issues) {
    if (!issue.sql_fix || issue.sql_fix === 'null') continue;

    const needsApproval = issue.requires_approval !== false;
    const permissionKey = needsApproval ? 'database_design' : 'performance_optimization';

    // Check if permission exists and is enabled
    const { data: perm } = await sb
      .from('ai_execution_permissions')
      .select('id, is_enabled, requires_approval, required_auto_execute_level')
      .eq('permission_key', permissionKey)
      .eq('is_enabled', true)
      .single();

    if (!perm) continue;

    const { data: request, error } = await sb.from('ai_execution_requests').insert({
      permission_id: perm.id,
      request_type: permissionKey,
      title: `Performance Fix: ${issue.table || issue.finding_type}`,
      title_ar: `إصلاح أداء: ${issue.table || issue.finding_type}`,
      description: `${issue.impact}\nSQL: ${issue.sql_fix}`,
      description_ar: `${issue.impact_ar || issue.impact}\nSQL: ${issue.sql_fix}`,
      risk_score: issue.risk_of_fix === 'high' ? 70 : issue.risk_of_fix === 'medium' ? 40 : 15,
      risk_level: issue.risk_of_fix || 'low',
      confidence_score: 85,
      parameters: { sql_fix: issue.sql_fix, table: issue.table, finding_type: issue.finding_type },
      rollback_plan: `Revert: DROP INDEX or restore original configuration for ${issue.table}`,
      rollback_plan_ar: `تراجع: حذف الفهرس أو استعادة الإعدادات الأصلية لـ ${issue.table}`,
      estimated_impact: `Improve query performance on ${issue.table}`,
      estimated_impact_ar: `تحسين أداء الاستعلامات على ${issue.table}`,
      affected_entities: issue.table ? [issue.table] : [],
      status: needsApproval ? 'pending' : 'approved',
      simulation_required: issue.risk_of_fix === 'high',
    }).select('id').single();

    if (!error && request) {
      requestIds.push(request.id);
    }
  }

  return requestIds;
}

// ─── Main Handler ─────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const t0 = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    const sb = createClient(supabaseUrl, serviceRoleKey);

    // ─── EMERGENCY CHECK ─────────────────────────────
    const { data: execFreeze } = await sb.from('emergency_controls')
      .select('is_active').eq('control_key', 'FREEZE_EXECUTION').single();
    if (execFreeze?.is_active) {
      return new Response(JSON.stringify({ error: 'FREEZE_EXECUTION active', frozen: true }), {
        status: 423, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── Find agent record ───────────────────────────
    let agentId: string;
    const { data: agent } = await sb.from('ai_agents')
      .select('id').eq('agent_name', AGENT_NAME).eq('is_active', true).single();

    if (agent) {
      agentId = agent.id;
    } else {
      // Use any active agent as fallback
      const { data: fallback } = await sb.from('ai_agents').select('id').eq('is_active', true).limit(1).single();
      agentId = fallback?.id || '';
    }

    if (!agentId) {
      return new Response(JSON.stringify({ error: 'No active agent found' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── Step 1: Announce scan start ──────────────────
    const startMsg = `🔍 **بدء تحليل الأداء**\n━━━━━━━━━━━━━━━━━━━━━━\n🤖 الوكيل: ${AGENT_NAME_AR}\n📡 جاري مسح قاعدة البيانات...\n⏳ الحالة: قيد التنفيذ`;
    await Promise.all([
      postToChat(sb, agentId, startMsg, 'info', 'agent_action'),
      postToDM(sb, startMsg, 'agent_action'),
    ]);

    // ─── Step 2: Collect raw performance data ────────
    console.log('[PerfAnalyst] Collecting performance data...');
    const rawData = await collectPerformanceData(sb);

    const collectMsg = `📊 **تم جمع البيانات**\n• ${rawData.tables.length} جدول\n• ${rawData.indexes.length} فهرس\n• ${rawData.slowQueries.length} استعلام بطيء\n• ${JSON.stringify(rawData.overview[0] || {})}`;
    await postToChat(sb, agentId, collectMsg, 'info', 'agent_progress');

    // ─── Step 3: Local analysis ──────────────────────
    console.log('[PerfAnalyst] Running local analysis...');
    const findings = analyzeLocally(rawData);

    if (findings.length === 0) {
      const healthyMsg = `🟢 **تحليل الأداء — لا مشاكل مكتشفة**\n━━━━━━━━━━━━━━━━━━━━━━\n🤖 ${AGENT_NAME_AR}\n✅ قاعدة البيانات بصحة جيدة\n📊 الجداول: ${rawData.tables.length}\n⏱️ المدة: ${Date.now() - t0}ms`;

      await Promise.all([
        postToChat(sb, agentId, healthyMsg, 'info', 'analysis_complete'),
        postToDM(sb, healthyMsg, 'analysis_complete'),
        logActivity(sb, 'perf_analysis_clean', null, true, Date.now() - t0, null, { tables: rawData.tables.length, findings: 0 }),
      ]);

      return new Response(JSON.stringify({
        success: true, health: 'healthy', findings: 0, duration_ms: Date.now() - t0,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const localMsg = `⚠️ **تحليل محلي — ${findings.length} مشكلة مكتشفة**\n${findings.slice(0, 3).map(f => `• [${f.severity.toUpperCase()}] ${f.title_ar}`).join('\n')}\n${findings.length > 3 ? `... و ${findings.length - 3} أخرى` : ''}`;
    await postToChat(sb, agentId, localMsg, 'warning', 'agent_progress');

    // ─── Step 4: AI-enhanced analysis ────────────────
    let aiAnalysis: any = {
      health_status: findings.some(f => f.severity === 'critical') ? 'critical' : 'needs_attention',
      health_score: Math.max(20, 100 - findings.length * 10),
      summary: `Found ${findings.length} performance issues.`,
      summary_ar: `تم اكتشاف ${findings.length} مشكلة في الأداء.`,
      top_issues: findings.slice(0, 5).map((f, i) => ({
        rank: i + 1,
        finding_type: f.type,
        table: f.table_name,
        impact: f.description,
        impact_ar: f.description_ar,
        sql_fix: null,
        requires_approval: !f.auto_fixable,
        risk_of_fix: f.risk_level,
      })),
      patterns: [],
      recommended_next_scan: '6h',
    };

    if (lovableApiKey) {
      try {
        console.log('[PerfAnalyst] Enhancing with AI...');
        const aiRaw = await enhanceWithAI(findings, rawData, lovableApiKey);
        let parsed = aiRaw;
        const jsonMatch = aiRaw.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) parsed = jsonMatch[1].trim();
        aiAnalysis = JSON.parse(typeof parsed === 'string' ? parsed : JSON.stringify(parsed));
      } catch (e) {
        console.warn('[PerfAnalyst] AI enhancement failed, using local analysis:', e);
        await postToChat(sb, agentId, `⚠️ تعزيز AI غير متاح — استخدام التحليل المحلي فقط`, 'warning', 'agent_progress');
      }
    } else {
      await postToChat(sb, agentId, `ℹ️ مفتاح AI غير متوفر — تحليل محلي فقط`, 'info', 'agent_progress');
    }

    // ─── Step 5: Post full report ────────────────────
    const report = formatReport(findings, aiAnalysis);
    await Promise.all([
      postToChat(sb, agentId, report, aiAnalysis.health_status === 'critical' ? 'critical' : 'warning', 'analysis_complete'),
      postToDM(sb, report, 'analysis_complete'),
    ]);

    // ─── Step 6: Create execution requests for fixes ─
    const requestIds = await createFixRequests(sb, aiAnalysis, agentId);

    if (requestIds.length > 0) {
      const fixMsg = `🔧 **طلبات إصلاح تم إنشاؤها: ${requestIds.length}**\n${requestIds.map((id, i) => `${i + 1}. request_id: ${id}`).join('\n')}\n\n⏳ بانتظار الموافقة للمشاكل التي تحتاج مراجعة بشرية.`;
      await Promise.all([
        postToChat(sb, agentId, fixMsg, 'info', 'execution_request'),
        postToDM(sb, fixMsg, 'execution_request'),
      ]);
    }

    // ─── Step 7: Log to knowledge_memory ─────────────
    await sb.from('knowledge_memory').insert({
      source: 'ai',
      event_type: 'performance_analysis',
      area: 'performance',
      payload: {
        agent: AGENT_NAME,
        health_status: aiAnalysis.health_status,
        health_score: aiAnalysis.health_score,
        findings_count: findings.length,
        fix_requests: requestIds.length,
        duration_ms: Date.now() - t0,
        tables_scanned: rawData.tables.length,
        indexes_scanned: rawData.indexes.length,
      },
    });

    // ─── Step 8: Activity log ────────────────────────
    await logActivity(sb, 'perf_analysis_complete', null, true, Date.now() - t0,
      { tables: rawData.tables.length, indexes: rawData.indexes.length },
      { findings: findings.length, health: aiAnalysis.health_status, fix_requests: requestIds.length },
    );

    const durationMs = Date.now() - t0;
    console.log(`[PerfAnalyst] Analysis complete: ${findings.length} findings, ${requestIds.length} fix requests, ${durationMs}ms`);

    return new Response(JSON.stringify({
      success: true,
      agent: AGENT_NAME,
      health_status: aiAnalysis.health_status,
      health_score: aiAnalysis.health_score,
      findings_count: findings.length,
      fix_requests_created: requestIds.length,
      request_ids: requestIds,
      duration_ms: durationMs,
      next_scan: aiAnalysis.recommended_next_scan,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    const durationMs = Date.now() - t0;
    console.error('[PerfAnalyst] Error:', error);

    // Try to report failure to chat
    try {
      const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const failMsg = `❌ **فشل تحليل الأداء**\n🤖 ${AGENT_NAME_AR}\n⚠️ ${error instanceof Error ? error.message : 'Unknown error'}\n⏱️ ${durationMs}ms`;
      await postToDM(sb, failMsg, 'agent_failure');
      await logActivity(sb, 'perf_analysis_failed', null, false, durationMs, null, { error: error instanceof Error ? error.message : 'Unknown' });
    } catch { /* best effort */ }

    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: durationMs,
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
