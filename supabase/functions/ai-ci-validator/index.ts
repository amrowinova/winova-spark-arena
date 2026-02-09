import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── GitHub API Helpers ───────────────────────────

async function fetchPRDetails(token: string, owner: string, repo: string, prNumber: number) {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`,
    { headers: { Authorization: `token ${token}`, Accept: "application/vnd.github.v3+json" } }
  );
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Failed to fetch PR #${prNumber}: ${res.status} ${t}`);
  }
  return res.json();
}

async function fetchPRFiles(token: string, owner: string, repo: string, prNumber: number) {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=100`,
    { headers: { Authorization: `token ${token}`, Accept: "application/vnd.github.v3+json" } }
  );
  if (!res.ok) {
    await res.text();
    return [];
  }
  return res.json();
}

async function fetchCheckRuns(token: string, owner: string, repo: string, ref: string) {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits/${ref}/check-runs?per_page=100`,
    { headers: { Authorization: `token ${token}`, Accept: "application/vnd.github.v3+json" } }
  );
  if (!res.ok) {
    await res.text();
    return [];
  }
  const data = await res.json();
  return data.check_runs || [];
}

async function fetchCommitStatuses(token: string, owner: string, repo: string, ref: string) {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/commits/${ref}/status`,
    { headers: { Authorization: `token ${token}`, Accept: "application/vnd.github.v3+json" } }
  );
  if (!res.ok) {
    await res.text();
    return { state: "unknown", statuses: [] };
  }
  return res.json();
}

// ─── Analysis Logic ───────────────────────────────

interface ValidationResult {
  build_status: "pass" | "fail" | "unknown";
  lint_status: "pass" | "fail" | "unknown";
  test_status: "pass" | "fail" | "unknown";
  risk_level: "low" | "medium" | "high";
  details: Record<string, any>;
}

function analyzeChecks(checkRuns: any[], statuses: any): ValidationResult {
  const result: ValidationResult = {
    build_status: "unknown",
    lint_status: "unknown",
    test_status: "unknown",
    risk_level: "unknown",
    details: { check_runs: [], statuses: [] },
  };

  const checkSummaries: any[] = [];

  for (const run of checkRuns) {
    const name = (run.name || "").toLowerCase();
    const conclusion = run.conclusion || "pending";
    const status = run.status || "queued";

    checkSummaries.push({
      name: run.name,
      status,
      conclusion,
    });

    const passed = conclusion === "success" || conclusion === "neutral";
    const failed = conclusion === "failure" || conclusion === "timed_out" || conclusion === "cancelled";

    // Classify by name patterns
    if (name.includes("build") || name.includes("compile") || name.includes("deploy")) {
      if (passed) result.build_status = "pass";
      if (failed) result.build_status = "fail";
    }

    if (name.includes("lint") || name.includes("eslint") || name.includes("prettier") || name.includes("format")) {
      if (passed) result.lint_status = "pass";
      if (failed) result.lint_status = "fail";
    }

    if (name.includes("test") || name.includes("jest") || name.includes("vitest") || name.includes("spec")) {
      if (passed) result.test_status = "pass";
      if (failed) result.test_status = "fail";
    }

    // Generic: if no specific match, use as build indicator
    if (
      !name.includes("lint") && !name.includes("test") && !name.includes("jest") &&
      !name.includes("vitest") && !name.includes("spec") && !name.includes("format")
    ) {
      if (failed && result.build_status === "unknown") result.build_status = "fail";
      if (passed && result.build_status === "unknown") result.build_status = "pass";
    }
  }

  // Also check commit statuses
  const statusSummaries: any[] = [];
  if (statuses?.statuses) {
    for (const s of statuses.statuses) {
      statusSummaries.push({ context: s.context, state: s.state });
      const ctx = (s.context || "").toLowerCase();
      if (ctx.includes("build") || ctx.includes("ci")) {
        if (s.state === "success") result.build_status = result.build_status === "fail" ? "fail" : "pass";
        if (s.state === "failure" || s.state === "error") result.build_status = "fail";
      }
    }
  }

  result.details = { check_runs: checkSummaries, statuses: statusSummaries };

  // Calculate risk
  const anyFail = result.build_status === "fail" || result.lint_status === "fail" || result.test_status === "fail";
  const allPass = result.build_status === "pass" && result.lint_status === "pass" && result.test_status === "pass";
  const allUnknown = result.build_status === "unknown" && result.lint_status === "unknown" && result.test_status === "unknown";

  if (anyFail) {
    result.risk_level = "high";
  } else if (allPass) {
    result.risk_level = "low";
  } else if (allUnknown) {
    result.risk_level = "medium";
  } else {
    result.risk_level = "medium";
  }

  return result;
}

// ─── Main Handler ─────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const githubToken = Deno.env.get("GITHUB_TOKEN");
    if (!githubToken) throw new Error("GITHUB_TOKEN not configured");

    const owner = Deno.env.get("GITHUB_REPO_OWNER") || "";
    const repo = Deno.env.get("GITHUB_REPO_NAME") || "";
    if (!owner || !repo) throw new Error("GITHUB_REPO_OWNER or GITHUB_REPO_NAME not configured");

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Accept input: explicit params or scan for AI-generated PRs
    let prNumber: number | null = null;
    let branch: string | null = null;

    try {
      const body = await req.json();
      prNumber = body.pr_number || null;
      branch = body.branch || null;
    } catch {
      // No body — scan mode
    }

    // ─── Scan Mode: find AI-generated PRs not yet validated ────
    if (!prNumber) {
      console.log("[CI Validator] Scan mode — looking for unvalidated AI PRs");

      // Get recent AI engineer reports with PR numbers
      const { data: reports } = await sb
        .from("ai_engineer_reports")
        .select("id, github_pr_number, github_branch")
        .not("github_pr_number", "is", null)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!reports || reports.length === 0) {
        return new Response(JSON.stringify({
          success: true,
          message: "No AI PRs to validate",
          validated: 0,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Check which ones already have CI reports
      const prNumbers = reports.map((r: any) => r.github_pr_number).filter(Boolean);
      const { data: existing } = await sb
        .from("ai_ci_reports")
        .select("pr_number")
        .in("pr_number", prNumbers);

      const existingSet = new Set((existing || []).map((e: any) => e.pr_number));
      const unvalidated = reports.filter((r: any) => !existingSet.has(r.github_pr_number));

      if (unvalidated.length === 0) {
        return new Response(JSON.stringify({
          success: true,
          message: "All AI PRs already validated",
          validated: 0,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Validate each unvalidated PR
      let validatedCount = 0;
      for (const report of unvalidated) {
        try {
          await validatePR(sb, githubToken, owner, repo, report.github_pr_number, report.github_branch, report.id);
          validatedCount++;
        } catch (e) {
          console.error(`[CI Validator] Failed PR #${report.github_pr_number}:`, e);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        validated: validatedCount,
        scanned: unvalidated.length,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── Direct Mode: validate a specific PR ────
    await validatePR(sb, githubToken, owner, repo, prNumber, branch || "unknown");

    return new Response(JSON.stringify({
      success: true,
      pr_number: prNumber,
      message: "Validation complete",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: unknown) {
    console.error("[CI Validator] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ─── Core Validation Logic ────────────────────────

async function validatePR(
  sb: any,
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
  branchName: string | null,
  reportId?: string
) {
  console.log(`[CI Validator] Validating PR #${prNumber}`);

  // 1. Fetch PR details
  const pr = await fetchPRDetails(token, owner, repo, prNumber);
  const headSha = pr.head?.sha;
  const branch = branchName || pr.head?.ref || "unknown";

  if (!headSha) throw new Error(`No HEAD SHA for PR #${prNumber}`);

  // 2. Fetch check runs and statuses in parallel
  const [checkRuns, statuses, files] = await Promise.all([
    fetchCheckRuns(token, owner, repo, headSha),
    fetchCommitStatuses(token, owner, repo, headSha),
    fetchPRFiles(token, owner, repo, prNumber),
  ]);

  // 3. Analyze results
  const result = analyzeChecks(checkRuns, statuses);

  // Add file summary to details
  result.details.files_changed = files.length;
  result.details.file_summary = (files as any[]).slice(0, 20).map((f: any) => ({
    filename: f.filename,
    status: f.status,
    additions: f.additions,
    deletions: f.deletions,
  }));
  result.details.pr_title = pr.title;
  result.details.pr_state = pr.state;
  result.details.pr_labels = (pr.labels || []).map((l: any) => l.name);

  console.log(`[CI Validator] PR #${prNumber}: build=${result.build_status} lint=${result.lint_status} test=${result.test_status} risk=${result.risk_level}`);

  // 4. Insert CI report
  const { error: insertError } = await sb.from("ai_ci_reports").insert({
    pr_number: prNumber,
    branch,
    repository: `${owner}/${repo}`,
    build_status: result.build_status,
    lint_status: result.lint_status,
    test_status: result.test_status,
    risk_level: result.risk_level,
    raw_logs: result.details,
    report_id: reportId || null,
  });

  if (insertError) console.error("[CI Validator] Insert error:", insertError.message);

  // 5. Post summary to ai_chat_room
  const { data: agent } = await sb
    .from("ai_agents")
    .select("id")
    .eq("is_active", true)
    .limit(1)
    .single();

  if (agent) {
    const statusIcon = (s: string) => s === "pass" ? "✅" : s === "fail" ? "❌" : "⚠️";
    const riskEmoji = result.risk_level === "low" ? "🟢" : result.risk_level === "medium" ? "🟡" : "🔴";
    const readiness = result.risk_level === "low" ? "Ready for human review" : result.risk_level === "high" ? "NOT ready — failures detected" : "Needs attention — some checks unknown";

    const content = `🧪 **AI Validation Report**
PR: #${prNumber} — \`${branch}\`
Build: ${statusIcon(result.build_status)} ${result.build_status.toUpperCase()}
Lint: ${statusIcon(result.lint_status)} ${result.lint_status.toUpperCase()}
Tests: ${statusIcon(result.test_status)} ${result.test_status.toUpperCase()}
Risk: ${riskEmoji} ${result.risk_level.toUpperCase()}
Files changed: ${files.length}
Status: ${readiness}`;

    const contentAr = `🧪 **تقرير التحقق الآلي**
PR: #${prNumber} — \`${branch}\`
البناء: ${statusIcon(result.build_status)} ${result.build_status.toUpperCase()}
التنسيق: ${statusIcon(result.lint_status)} ${result.lint_status.toUpperCase()}
الاختبارات: ${statusIcon(result.test_status)} ${result.test_status.toUpperCase()}
المخاطر: ${riskEmoji} ${result.risk_level.toUpperCase()}
الملفات المعدلة: ${files.length}
الحالة: ${result.risk_level === "low" ? "جاهز للمراجعة البشرية" : result.risk_level === "high" ? "غير جاهز — تم اكتشاف أخطاء" : "يحتاج انتباه — بعض الفحوصات غير معروفة"}`;

    await sb.from("ai_chat_room").insert({
      agent_id: agent.id,
      content,
      content_ar: contentAr,
      message_type: "ci_report",
      message_category: result.risk_level === "high" ? "critical" : result.risk_level === "medium" ? "warning" : "info",
      is_summary: true,
    });
  }
}
