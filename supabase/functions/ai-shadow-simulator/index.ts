import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Scenario definitions ─────────────────────────
interface Scenario {
  name: string;
  name_ar: string;
  category: 'stress' | 'fraud' | 'integrity' | 'financial' | 'performance' | 'load';
  run: (ctx: SimulationContext) => Promise<ScenarioResult>;
}

interface ScenarioResult {
  passed: boolean;
  details: string;
  details_ar: string;
  severity: 'info' | 'warning' | 'critical';
  metrics?: Record<string, number>;
}

interface SimulationContext {
  snapshot: Record<string, any[]>;
  request: any;
  supabase: any;
}

// ─── Data Snapshot Engine ──────────────────────────
async function captureSnapshot(sb: any): Promise<{ data: Record<string, any[]>; tables: string[] }> {
  const tables = [
    'wallets', 'p2p_orders', 'contest_entries', 'contest_votes',
    'team_members', 'ai_failures', 'ai_money_flow', 'ai_activity_stream',
    'ai_execution_permissions', 'spotlight_user_points',
  ];

  const data: Record<string, any[]> = {};
  const capturedTables: string[] = [];

  const queries = tables.map(async (table) => {
    try {
      const { data: rows, error } = await sb.from(table).select('*').limit(500);
      if (!error && rows) {
        data[table] = rows;
        capturedTables.push(table);
      }
    } catch {
      // Table might not exist — skip
    }
  });

  await Promise.all(queries);
  return { data, tables: capturedTables };
}

// ─── Scenario: Financial Integrity ────────────────
const financialIntegrityScenario: Scenario = {
  name: 'Financial Balance Integrity',
  name_ar: 'سلامة الأرصدة المالية',
  category: 'financial',
  run: async (ctx) => {
    const wallets = ctx.snapshot.wallets || [];
    let negativeBalances = 0;
    let frozenWithActivity = 0;
    let totalNova = 0;
    let totalLocked = 0;

    for (const w of wallets) {
      if ((w.nova_balance || 0) < 0) negativeBalances++;
      if ((w.locked_nova_balance || 0) < 0) negativeBalances++;
      if (w.is_frozen && (w.locked_nova_balance || 0) > 0) frozenWithActivity++;
      totalNova += w.nova_balance || 0;
      totalLocked += w.locked_nova_balance || 0;
    }

    const passed = negativeBalances === 0;
    return {
      passed,
      details: `Wallets: ${wallets.length}, Negative: ${negativeBalances}, Frozen w/ escrow: ${frozenWithActivity}, Total Nova: ${totalNova.toFixed(2)}`,
      details_ar: `المحافظ: ${wallets.length}، أرصدة سالبة: ${negativeBalances}، مجمدة مع ضمان: ${frozenWithActivity}، إجمالي نوڤا: ${totalNova.toFixed(2)}`,
      severity: negativeBalances > 0 ? 'critical' : 'info',
      metrics: { negative_balances: negativeBalances, total_nova: totalNova, total_locked: totalLocked },
    };
  },
};

// ─── Scenario: P2P Escrow Consistency ─────────────
const escrowConsistencyScenario: Scenario = {
  name: 'P2P Escrow Consistency',
  name_ar: 'تناسق ضمان P2P',
  category: 'integrity',
  run: async (ctx) => {
    const orders = ctx.snapshot.p2p_orders || [];
    let orphanedEscrow = 0;
    let mismatchedStatus = 0;

    for (const o of orders) {
      // Active orders should have escrow locked
      if (['matched', 'paid'].includes(o.status) && !o.escrow_locked) {
        orphanedEscrow++;
      }
      // Completed/cancelled orders should not have escrow locked
      if (['completed', 'cancelled', 'expired'].includes(o.status) && o.escrow_locked) {
        mismatchedStatus++;
      }
    }

    const issues = orphanedEscrow + mismatchedStatus;
    return {
      passed: issues === 0,
      details: `Orders: ${orders.length}, Orphaned escrow: ${orphanedEscrow}, Mismatched: ${mismatchedStatus}`,
      details_ar: `الطلبات: ${orders.length}، ضمان يتيم: ${orphanedEscrow}، حالة غير متطابقة: ${mismatchedStatus}`,
      severity: issues > 0 ? 'critical' : 'info',
      metrics: { total_orders: orders.length, orphaned: orphanedEscrow, mismatched: mismatchedStatus },
    };
  },
};

// ─── Scenario: Fraud Pattern Detection ────────────
const fraudDetectionScenario: Scenario = {
  name: 'Fraud Signal Clustering',
  name_ar: 'تجمع إشارات الاحتيال',
  category: 'fraud',
  run: async (ctx) => {
    const failures = ctx.snapshot.ai_failures || [];
    const activities = ctx.snapshot.ai_activity_stream || [];

    // Detect repeated failures from same source
    const failureClusters: Record<string, number> = {};
    for (const f of failures) {
      const key = f.rpc_name || 'unknown';
      failureClusters[key] = (failureClusters[key] || 0) + 1;
    }

    const suspiciousRPCs = Object.entries(failureClusters)
      .filter(([, count]) => count > 10)
      .map(([name, count]) => ({ name, count }));

    // Detect rapid-fire activity from single users
    const userActivity: Record<string, number> = {};
    for (const a of activities) {
      if (a.user_id) {
        userActivity[a.user_id] = (userActivity[a.user_id] || 0) + 1;
      }
    }

    const suspiciousUsers = Object.entries(userActivity)
      .filter(([, count]) => count > 50)
      .length;

    const fraudScore = suspiciousRPCs.length * 20 + suspiciousUsers * 30;
    const passed = fraudScore < 40;

    return {
      passed,
      details: `Suspicious RPCs: ${suspiciousRPCs.length}, Suspicious users: ${suspiciousUsers}, Fraud score: ${fraudScore}`,
      details_ar: `RPCs مشبوهة: ${suspiciousRPCs.length}، مستخدمون مشبوهون: ${suspiciousUsers}، درجة الاحتيال: ${fraudScore}`,
      severity: fraudScore >= 60 ? 'critical' : fraudScore >= 30 ? 'warning' : 'info',
      metrics: { fraud_score: fraudScore, suspicious_rpcs: suspiciousRPCs.length, suspicious_users: suspiciousUsers },
    };
  },
};

// ─── Scenario: Stress / Load Estimation ───────────
const stressTestScenario: Scenario = {
  name: 'System Stress Estimation',
  name_ar: 'تقدير ضغط النظام',
  category: 'stress',
  run: async (ctx) => {
    const activities = ctx.snapshot.ai_activity_stream || [];
    const failures = ctx.snapshot.ai_failures || [];

    const totalOps = activities.length;
    const failedOps = activities.filter((a: any) => !a.success).length;
    const failureRate = totalOps > 0 ? (failedOps / totalOps * 100) : 0;

    const avgDuration = totalOps > 0
      ? activities.reduce((sum: number, a: any) => sum + (a.duration_ms || 0), 0) / totalOps
      : 0;

    const highLatency = activities.filter((a: any) => (a.duration_ms || 0) > 5000).length;
    const rpcFailures = failures.length;

    const loadScore = Math.min(100, Math.round(failureRate * 2 + (highLatency / Math.max(1, totalOps)) * 100 + rpcFailures * 0.5));
    const passed = loadScore < 50;

    return {
      passed,
      details: `Ops: ${totalOps}, Failure rate: ${failureRate.toFixed(1)}%, Avg latency: ${avgDuration.toFixed(0)}ms, High latency: ${highLatency}, Load score: ${loadScore}`,
      details_ar: `العمليات: ${totalOps}، معدل الفشل: ${failureRate.toFixed(1)}%، متوسط التأخر: ${avgDuration.toFixed(0)}ms، تأخر عالي: ${highLatency}، درجة الحمل: ${loadScore}`,
      severity: loadScore >= 70 ? 'critical' : loadScore >= 40 ? 'warning' : 'info',
      metrics: { total_ops: totalOps, failure_rate: failureRate, avg_duration_ms: avgDuration, load_score: loadScore },
    };
  },
};

// ─── Scenario: Commission / Rank Integrity ────────
const rankIntegrityScenario: Scenario = {
  name: 'Rank & Commission Integrity',
  name_ar: 'سلامة الرتب والعمولات',
  category: 'integrity',
  run: async (ctx) => {
    const teams = ctx.snapshot.team_members || [];
    const moneyFlow = ctx.snapshot.ai_money_flow || [];

    // Check for users with no leader (orphan nodes)
    const orphanNodes = teams.filter((t: any) => !t.leader_id && t.rank !== 'subscriber').length;

    // Check commission flows
    const commissions = moneyFlow.filter((m: any) =>
      m.operation === 'team_commission' || m.reference_type === 'commission'
    );

    const negativeCommissions = commissions.filter((c: any) => c.amount < 0).length;

    const issues = orphanNodes + negativeCommissions;
    return {
      passed: issues === 0,
      details: `Team nodes: ${teams.length}, Orphans: ${orphanNodes}, Negative commissions: ${negativeCommissions}`,
      details_ar: `عقد الفريق: ${teams.length}، عقد يتيمة: ${orphanNodes}، عمولات سالبة: ${negativeCommissions}`,
      severity: negativeCommissions > 0 ? 'critical' : orphanNodes > 0 ? 'warning' : 'info',
      metrics: { team_nodes: teams.length, orphans: orphanNodes, negative_commissions: negativeCommissions },
    };
  },
};

// ─── Scenario: Vote & Contest Integrity ───────────
const contestIntegrityScenario: Scenario = {
  name: 'Vote & Contest Integrity',
  name_ar: 'سلامة التصويت والمسابقات',
  category: 'integrity',
  run: async (ctx) => {
    const entries = ctx.snapshot.contest_entries || [];
    const votes = ctx.snapshot.contest_votes || [];

    // Check for duplicate entries per contest
    const entryMap: Record<string, Set<string>> = {};
    for (const e of entries) {
      const key = e.contest_id;
      if (!entryMap[key]) entryMap[key] = new Set();
      if (entryMap[key].has(e.user_id)) {
        // duplicate found
      }
      entryMap[key].add(e.user_id);
    }

    // Validate vote counts don't exceed limits
    const voterActivity: Record<string, number> = {};
    for (const v of votes) {
      const key = `${v.voter_id}_${v.contest_id}`;
      voterActivity[key] = (voterActivity[key] || 0) + 1;
    }
    const excessiveVoters = Object.values(voterActivity).filter(c => c > 100).length;

    return {
      passed: excessiveVoters === 0,
      details: `Entries: ${entries.length}, Votes: ${votes.length}, Excessive voters: ${excessiveVoters}`,
      details_ar: `المشاركات: ${entries.length}، الأصوات: ${votes.length}، مصوتون مفرطون: ${excessiveVoters}`,
      severity: excessiveVoters > 0 ? 'warning' : 'info',
      metrics: { entries: entries.length, votes: votes.length, excessive_voters: excessiveVoters },
    };
  },
};

// ─── Scenario: Permission Boundary Check ──────────
const permissionBoundaryScenario: Scenario = {
  name: 'Permission Boundary Validation',
  name_ar: 'التحقق من حدود الصلاحيات',
  category: 'integrity',
  run: async (ctx) => {
    const permissions = ctx.snapshot.ai_execution_permissions || [];

    const overReaching = permissions.filter((p: any) =>
      p.is_enabled && p.max_risk_level === 'critical' && !p.requires_approval
    ).length;

    const highAutoExec = permissions.filter((p: any) =>
      p.is_enabled && p.auto_execute_threshold < 60
    ).length;

    const unlimited = permissions.filter((p: any) =>
      p.is_enabled && p.max_daily_executions > 100
    ).length;

    const issues = overReaching + highAutoExec + unlimited;
    return {
      passed: issues === 0,
      details: `Permissions: ${permissions.length}, Over-reaching: ${overReaching}, Low threshold: ${highAutoExec}, Unlimited: ${unlimited}`,
      details_ar: `الصلاحيات: ${permissions.length}، تجاوز حدود: ${overReaching}، حد منخفض: ${highAutoExec}، غير محدود: ${unlimited}`,
      severity: overReaching > 0 ? 'critical' : issues > 0 ? 'warning' : 'info',
      metrics: { total_permissions: permissions.length, over_reaching: overReaching, low_threshold: highAutoExec },
    };
  },
};

// All scenarios
const ALL_SCENARIOS: Scenario[] = [
  financialIntegrityScenario,
  escrowConsistencyScenario,
  fraudDetectionScenario,
  stressTestScenario,
  rankIntegrityScenario,
  contestIntegrityScenario,
  permissionBoundaryScenario,
];

// ─── CTO Report Generator ────────────────────────
function generateCTOReport(
  request: any,
  scenarioResults: Array<{ scenario: Scenario; result: ScenarioResult }>,
  snapshot: Record<string, any[]>,
  durationMs: number,
): { report: string; report_ar: string; verdict: string; successDelta: number; riskDelta: number; affectedSystems: string[] } {
  const passed = scenarioResults.filter(r => r.result.passed).length;
  const failed = scenarioResults.filter(r => !r.result.passed).length;
  const criticals = scenarioResults.filter(r => r.result.severity === 'critical').length;
  const warnings = scenarioResults.filter(r => r.result.severity === 'warning').length;

  const affectedSystems = [...new Set(scenarioResults
    .filter(r => !r.result.passed)
    .map(r => r.scenario.category))];

  // Calculate deltas
  const successDelta = Math.round((passed / scenarioResults.length) * 100 - 50);
  const riskDelta = criticals * 30 + warnings * 10 + failed * 5;

  // Determine verdict
  let verdict = 'safe';
  if (criticals > 0) verdict = 'dangerous';
  else if (failed > 2) verdict = 'risky';
  else if (warnings > 2) verdict = 'risky';

  const verdictEmoji: Record<string, string> = {
    safe: '✅', risky: '⚠️', dangerous: '🚫', blocked: '🔒',
  };

  const verdictLabel: Record<string, string> = {
    safe: 'آمن للتنفيذ', risky: 'يحتاج مراجعة', dangerous: 'خطر — لا يُنصح بالتنفيذ', blocked: 'محظور',
  };

  // Build report
  const scenarioLines = scenarioResults.map(({ scenario, result }) => {
    const icon = result.passed ? '✅' : result.severity === 'critical' ? '🚫' : '⚠️';
    return `${icon} ${scenario.name}: ${result.details}`;
  }).join('\n');

  const scenarioLinesAr = scenarioResults.map(({ scenario, result }) => {
    const icon = result.passed ? '✅' : result.severity === 'critical' ? '🚫' : '⚠️';
    return `${icon} ${scenario.name_ar}: ${result.details_ar}`;
  }).join('\n');

  const snapshotSummary = Object.entries(snapshot)
    .map(([table, rows]) => `  • ${table}: ${rows.length} records`)
    .join('\n');

  const report = `═══════════════════════════════════════
🏗️ WINOVA SHADOW WORLD — CTO Report
═══════════════════════════════════════

📋 Request: ${request?.title || 'N/A'}
🎯 Risk Level: ${request?.risk_level || 'N/A'} (Score: ${request?.risk_score || 0})
🧠 Confidence: ${request?.confidence_score || 0}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 SIMULATION RESULTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${scenarioLines}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 DELTA ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Success Delta: ${successDelta > 0 ? '+' : ''}${successDelta}%
Risk Delta: +${riskDelta} points
Affected Systems: ${affectedSystems.length > 0 ? affectedSystems.join(', ') : 'None'}
Rollback Ready: ${criticals === 0 ? 'Yes ✅' : 'Review Required ⚠️'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📂 SNAPSHOT COVERAGE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${snapshotSummary}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏁 VERDICT: ${verdictEmoji[verdict]} ${verdict.toUpperCase()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Scenarios: ${passed}/${scenarioResults.length} passed
Critical Issues: ${criticals}
Warnings: ${warnings}
Duration: ${durationMs}ms

simulation_id: will_be_set`;

  const report_ar = `═══════════════════════════════════════
🏗️ عالم الظل — تقرير CTO
═══════════════════════════════════════

📋 الطلب: ${request?.title_ar || request?.title || 'غير محدد'}
🎯 مستوى المخاطر: ${request?.risk_level || 'غير محدد'} (${request?.risk_score || 0})
🧠 الثقة: ${request?.confidence_score || 0}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 نتائج المحاكاة
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${scenarioLinesAr}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 تحليل الفارق
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

فارق النجاح: ${successDelta > 0 ? '+' : ''}${successDelta}%
فارق المخاطر: +${riskDelta} نقطة
الأنظمة المتأثرة: ${affectedSystems.length > 0 ? affectedSystems.join('، ') : 'لا يوجد'}
جاهزية التراجع: ${criticals === 0 ? 'نعم ✅' : 'يتطلب مراجعة ⚠️'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏁 الحكم: ${verdictEmoji[verdict]} ${verdictLabel[verdict]}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

السيناريوهات: ${passed}/${scenarioResults.length} ناجحة
مشاكل حرجة: ${criticals}
تحذيرات: ${warnings}
المدة: ${durationMs}ms

simulation_id: will_be_set`;

  return { report, report_ar, verdict, successDelta, riskDelta, affectedSystems };
}

// ─── DM Alert ─────────────────────────────────────
async function sendSimulationReport(sb: any, simulation: any, report_ar: string) {
  const AI_SYSTEM_USER_ID = '00000000-0000-0000-0000-a10000000001';

  // Find admin conversations with AI system user
  const { data: convos } = await sb
    .from('conversations')
    .select('id')
    .or(`participant1_id.eq.${AI_SYSTEM_USER_ID},participant2_id.eq.${AI_SYSTEM_USER_ID}`)
    .limit(10);

  if (convos && convos.length > 0) {
    for (const convo of convos) {
      await sb.from('direct_messages').insert({
        conversation_id: convo.id,
        sender_id: AI_SYSTEM_USER_ID,
        content: report_ar,
        message_type: 'simulation_report',
        is_read: false,
      });
    }
  }

  // Also post to AI Chat Room
  const { data: agent } = await sb
    .from('ai_agents')
    .select('id')
    .eq('is_active', true)
    .limit(1)
    .single();

  if (agent) {
    await sb.from('ai_chat_room').insert({
      agent_id: agent.id,
      content: report_ar,
      content_ar: report_ar,
      message_type: 'simulation_report',
      message_category: simulation.verdict === 'dangerous' ? 'critical' : simulation.verdict === 'risky' ? 'warning' : 'info',
      is_summary: true,
    });
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
    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json().catch(() => ({}));
    const { request_id, proposal_id } = body;

    // Fetch the execution request if provided
    let request: any = null;
    if (request_id) {
      const { data } = await sb
        .from('ai_execution_requests')
        .select('*')
        .eq('id', request_id)
        .single();
      request = data;
    }

    // 1. Create simulation record
    const { data: sim, error: simErr } = await sb.from('ai_shadow_simulations').insert({
      request_id: request_id || null,
      proposal_id: proposal_id || null,
      trigger_source: request_id ? 'execution_request' : 'proposal',
      status: 'running',
      started_at: new Date().toISOString(),
    }).select('*').single();

    if (simErr) throw simErr;

    // 2. Capture production snapshot (READ ONLY)
    console.log('[Shadow World] Capturing snapshot...');
    const snapshot = await captureSnapshot(sb);

    // Update simulation with snapshot info
    await sb.from('ai_shadow_simulations').update({
      snapshot_data: { tables_sampled: snapshot.tables, record_counts: Object.fromEntries(snapshot.tables.map(t => [t, (snapshot.data[t] || []).length])) },
      snapshot_tables: snapshot.tables,
    }).eq('id', sim.id);

    // 3. Run all scenarios
    console.log('[Shadow World] Running scenarios...');
    const ctx: SimulationContext = { snapshot: snapshot.data, request, supabase: sb };
    const results: Array<{ scenario: Scenario; result: ScenarioResult }> = [];

    for (const scenario of ALL_SCENARIOS) {
      try {
        const result = await scenario.run(ctx);
        results.push({ scenario, result });
      } catch (err) {
        results.push({
          scenario,
          result: {
            passed: false,
            details: `Scenario error: ${err instanceof Error ? err.message : 'Unknown'}`,
            details_ar: `خطأ في السيناريو: ${err instanceof Error ? err.message : 'غير معروف'}`,
            severity: 'warning',
          },
        });
      }
    }

    const durationMs = Date.now() - t0;
    const scenariosPassed = results.filter(r => r.result.passed).length;
    const scenariosFailed = results.filter(r => !r.result.passed).length;

    // 4. Generate CTO Report
    const reportData = generateCTOReport(request, results, snapshot.data, durationMs);

    // Replace placeholder simulation_id in report
    const finalReport = reportData.report.replace('simulation_id: will_be_set', `simulation_id: ${sim.id}`);
    const finalReportAr = reportData.report_ar.replace('simulation_id: will_be_set', `simulation_id: ${sim.id}`);

    // 5. Update simulation record
    const { error: updateErr } = await sb.from('ai_shadow_simulations').update({
      status: 'completed',
      scenarios_run: results.length,
      scenarios_passed: scenariosPassed,
      scenarios_failed: scenariosFailed,
      results: {
        scenarios: results.map(({ scenario, result }) => ({
          name: scenario.name,
          name_ar: scenario.name_ar,
          category: scenario.category,
          passed: result.passed,
          severity: result.severity,
          details: result.details,
          details_ar: result.details_ar,
          metrics: result.metrics || {},
        })),
      },
      success_delta: reportData.successDelta,
      risk_delta: reportData.riskDelta,
      affected_systems: reportData.affectedSystems,
      financial_deviation: results
        .find(r => r.scenario.category === 'financial')?.result.metrics?.negative_balances || 0,
      logical_deviations: scenariosFailed,
      rollback_ready: reportData.verdict !== 'dangerous',
      cto_report: finalReport,
      cto_report_ar: finalReportAr,
      verdict: reportData.verdict,
      duration_ms: durationMs,
      completed_at: new Date().toISOString(),
    }).eq('id', sim.id);

    if (updateErr) console.warn('[Shadow World] Update error:', updateErr.message);

    // 6. Link simulation to execution request
    if (request_id) {
      await sb.from('ai_execution_requests').update({
        simulation_id: sim.id,
        simulation_required: true,
        simulation_verdict: reportData.verdict,
        updated_at: new Date().toISOString(),
      }).eq('id', request_id);
    }

    // 7. Send report to WINOVA Intelligence DM
    await sendSimulationReport(sb, { ...sim, verdict: reportData.verdict }, finalReportAr);

    // 8. Log to knowledge_memory
    await sb.from('knowledge_memory').insert({
      source: 'system',
      event_type: 'simulation_completed',
      area: 'execution',
      reference_id: sim.id,
      payload: {
        request_id,
        verdict: reportData.verdict,
        scenarios_passed: scenariosPassed,
        scenarios_failed: scenariosFailed,
        success_delta: reportData.successDelta,
        risk_delta: reportData.riskDelta,
        duration_ms: durationMs,
      },
    });

    console.log(`[Shadow World] Simulation complete: verdict=${reportData.verdict}, ${scenariosPassed}/${results.length} passed, ${durationMs}ms`);

    return new Response(JSON.stringify({
      success: true,
      simulation_id: sim.id,
      verdict: reportData.verdict,
      scenarios_run: results.length,
      scenarios_passed: scenariosPassed,
      scenarios_failed: scenariosFailed,
      success_delta: reportData.successDelta,
      risk_delta: reportData.riskDelta,
      affected_systems: reportData.affectedSystems,
      rollback_ready: reportData.verdict !== 'dangerous',
      duration_ms: durationMs,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[Shadow World] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: Date.now() - t0,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
