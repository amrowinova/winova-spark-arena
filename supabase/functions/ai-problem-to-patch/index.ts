import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AI_SYSTEM_USER_ID = '00000000-0000-0000-0000-a10000000001';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// ─── Priority Scoring Model ────────────────────────
interface PriorityFactors {
  money_risk: number;        // 0-10
  exploitability: number;    // 0-10
  support_cost: number;      // 0-10
  user_lock_probability: number; // 0-10
  legal_exposure: number;    // 0-10
  system_integrity: number;  // 0-10
}

function computePriority(f: PriorityFactors): number {
  return Math.round(
    f.money_risk * 25 +
    f.exploitability * 20 +
    f.support_cost * 15 +
    f.user_lock_probability * 15 +
    f.legal_exposure * 15 +
    f.system_integrity * 10
  ) / 10;
}

function riskFromScore(score: number): string {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

// ─── Thinking Stream ───────────────────────────────
const PHASES = [
  { key: 'command_received',   emoji: '📩', en: 'Scan initiated',         ar: 'بدء الفحص' },
  { key: 'understanding',      emoji: '🧠', en: 'Loading signals',        ar: 'تحميل الإشارات' },
  { key: 'planning',           emoji: '📋', en: 'Selecting scanners',     ar: 'اختيار الماسحات' },
  { key: 'collecting_data',    emoji: '📡', en: 'Collecting evidence',    ar: 'جمع الأدلة' },
  { key: 'analyzing',          emoji: '🔬', en: 'Diagnosing problems',    ar: 'تشخيص المشاكل' },
  { key: 'building',           emoji: '🏗️', en: 'Generating fixes',       ar: 'إنشاء الإصلاحات' },
  { key: 'validating',         emoji: '✅', en: 'Validating requests',    ar: 'التحقق من الطلبات' },
  { key: 'preparing_output',   emoji: '📝', en: 'Publishing results',     ar: 'نشر النتائج' },
  { key: 'completed',          emoji: '🏁', en: 'Completed',              ar: 'مكتمل' },
] as const;

async function streamPhase(sb: any, agentId: string, phaseKey: string, detail?: string) {
  const phase = PHASES.find(p => p.key === phaseKey)!;
  const idx = PHASES.findIndex(p => p.key === phaseKey);
  const progress = `[${idx + 1}/${PHASES.length}]`;
  const content = `${phase.emoji} **${phase.en}** ${progress}\n🤖 Agent: Problem-to-Patch\n${detail ? `→ ${detail}` : ''}`;
  const contentAr = `${phase.emoji} **${phase.ar}** ${progress}\n🤖 الوكيل: المشكلة-إلى-الإصلاح\n${detail ? `→ ${detail}` : ''}`;
  await Promise.all([
    sb.from('ai_chat_room').insert({
      agent_id: agentId,
      content, content_ar: contentAr,
      message_type: 'thinking_stream',
      message_category: phaseKey === 'completed' ? 'success' : 'info',
      is_summary: false,
    }),
    postToDM(sb, contentAr, 'thinking_stream'),
  ]);
}

async function postToDM(sb: any, content: string, messageType = 'system') {
  const { data: convos } = await sb.from('conversations').select('id')
    .or(`participant1_id.eq.${AI_SYSTEM_USER_ID},participant2_id.eq.${AI_SYSTEM_USER_ID}`).limit(5);
  if (convos) {
    for (const c of convos) {
      await sb.from('direct_messages').insert({
        conversation_id: c.id, sender_id: AI_SYSTEM_USER_ID,
        content, message_type: messageType, is_read: false,
      });
    }
  }
}

async function postToChatRoom(sb: any, content: string, contentAr: string, category = 'info') {
  const { data: agent } = await sb.from('ai_agents').select('id').eq('is_active', true).limit(1).single();
  if (agent) {
    await sb.from('ai_chat_room').insert({
      agent_id: agent.id, content, content_ar: contentAr,
      message_type: 'execution_request', message_category: category, is_summary: true,
    });
  }
}

// ─── Finding Interface ─────────────────────────────
interface Finding {
  title: string;
  title_ar: string;
  description: string;
  description_ar: string;
  why_it_matters: string;
  affected_services: string[];
  request_type: string;
  risk_level: string;
  priority_score: number;
  confidence: number;
  suggested_fix: string;
  expected_behavior: string;
  rollback_plan: string;
  evidence: Record<string, any>;
  dedup_key: string;
}

// ═══════════════════════════════════════════════════
// SCANNER MODULES — each reads REAL data only
// ═══════════════════════════════════════════════════

// 1) Agent Health Degradation → Engineering Tasks
async function scanAgentHealth(sb: any): Promise<Finding[]> {
  const findings: Finding[] = [];
  const { data: agents } = await sb.from('ai_agents').select('id, agent_name, agent_name_ar, lifecycle_state, success_rate, failure_rate, trust_score')
    .in('lifecycle_state', ['warning', 'probation', 'disabled']);

  if (!agents?.length) return findings;

  for (const agent of agents) {
    if (agent.lifecycle_state === 'disabled') {
      findings.push({
        title: `Replace disabled agent: ${agent.agent_name}`,
        title_ar: `استبدال وكيل معطل: ${agent.agent_name_ar}`,
        description: `Agent ${agent.agent_name} has been disabled due to repeated failures (success rate: ${agent.success_rate || 0}%, trust: ${agent.trust_score}). Requires architectural replacement or deep fix.`,
        description_ar: `الوكيل ${agent.agent_name_ar} معطل بسبب إخفاقات متكررة. يتطلب استبدال أو إصلاح جذري.`,
        why_it_matters: 'Disabled agents create blind spots in monitoring and automation coverage.',
        affected_services: ['ai-orchestrator', agent.agent_name],
        request_type: 'agent_replacement',
        risk_level: 'high',
        priority_score: computePriority({ money_risk: 3, exploitability: 2, support_cost: 6, user_lock_probability: 4, legal_exposure: 1, system_integrity: 8 }),
        confidence: 95,
        suggested_fix: `Review agent edge function code for root failure cause. Rebuild with improved error handling and retry logic. Update agent_schedules with new function reference.`,
        expected_behavior: 'Agent restored to healthy state with >80% success rate.',
        rollback_plan: 'Keep old agent function as backup. If new version fails, revert agent_function reference.',
        evidence: { agent_id: agent.id, lifecycle_state: agent.lifecycle_state, success_rate: agent.success_rate, trust_score: agent.trust_score },
        dedup_key: `agent_disabled_${agent.id}`,
      });
    } else if (agent.lifecycle_state === 'probation') {
      findings.push({
        title: `Fix probation agent: ${agent.agent_name}`,
        title_ar: `إصلاح وكيل تحت المراقبة: ${agent.agent_name_ar}`,
        description: `Agent ${agent.agent_name} is on probation with ${agent.failure_rate || 0}% failure rate. Autonomy reduced to zero. Needs code-level investigation.`,
        description_ar: `الوكيل ${agent.agent_name_ar} تحت المراقبة. يحتاج تحقيق على مستوى الكود.`,
        why_it_matters: 'Probation agents consume resources without producing value and may escalate to disabled.',
        affected_services: [agent.agent_name],
        request_type: 'agent_fix',
        risk_level: 'medium',
        priority_score: computePriority({ money_risk: 2, exploitability: 1, support_cost: 4, user_lock_probability: 2, legal_exposure: 0, system_integrity: 6 }),
        confidence: 85,
        suggested_fix: `Inspect recent failures in ai_activity_stream for agent ${agent.agent_name}. Check for timeout, auth, or logic errors in edge function.`,
        expected_behavior: 'Agent returns to healthy lifecycle state within 24h.',
        rollback_plan: 'No destructive changes. Investigation only.',
        evidence: { agent_id: agent.id, lifecycle_state: agent.lifecycle_state, failure_rate: agent.failure_rate },
        dedup_key: `agent_probation_${agent.id}`,
      });
    }
  }
  return findings;
}

// 2) Failed P2P Orders → Structural Fixes
async function scanFailedP2POrders(sb: any): Promise<Finding[]> {
  const findings: Finding[] = [];
  const oneDay = new Date(Date.now() - 86400000).toISOString();

  // Stuck orders (not terminal state for >6h)
  const { data: stuckOrders, count: stuckCount } = await sb.from('p2p_orders')
    .select('id, status, created_at, updated_at', { count: 'exact' })
    .in('status', ['pending_payment', 'paid', 'matched'])
    .lt('updated_at', new Date(Date.now() - 6 * 3600000).toISOString())
    .limit(100);

  if (stuckCount && stuckCount > 0) {
    findings.push({
      title: `${stuckCount} P2P orders stuck in non-terminal state >6h`,
      title_ar: `${stuckCount} طلب P2P عالق في حالة غير نهائية لأكثر من 6 ساعات`,
      description: `Found ${stuckCount} orders stuck in transitional states (pending_payment/paid/matched) for over 6 hours. These indicate timer failures or missing auto-expire logic.`,
      description_ar: `تم العثور على ${stuckCount} طلب عالق. يشير إلى فشل في المؤقتات أو منطق الانتهاء التلقائي.`,
      why_it_matters: 'Stuck orders lock user funds in escrow indefinitely and generate support tickets.',
      affected_services: ['p2p-auto-expire', 'P2PContext', 'p2pEscrowService'],
      request_type: 'p2p_timer_fix',
      risk_level: 'high',
      priority_score: computePriority({ money_risk: 9, exploitability: 5, support_cost: 8, user_lock_probability: 9, legal_exposure: 6, system_integrity: 7 }),
      confidence: 95,
      suggested_fix: `1. Add guard in p2p-auto-expire to force-cancel orders stuck >6h.\n2. Add DB trigger on p2p_orders to auto-expire if updated_at unchanged for >timer_duration.\n3. Add cron verification every 15min.`,
      expected_behavior: 'No order remains in transitional state beyond its timer + 30min grace period.',
      rollback_plan: 'Changes only add new expiry checks. Existing orders unaffected. Can disable cron to stop.',
      evidence: { stuck_count: stuckCount, sample_ids: (stuckOrders || []).slice(0, 5).map((o: any) => o.id) },
      dedup_key: `p2p_stuck_orders_batch`,
    });
  }

  // Cancelled-after-paid (dispute risk)
  const { data: cancelledPaid, count: cancelPaidCount } = await sb.from('p2p_orders')
    .select('id, status, created_at', { count: 'exact' })
    .eq('status', 'cancelled')
    .gte('created_at', oneDay)
    .limit(200);

  // Check if any had payment confirmed before cancellation via ledger
  if (cancelPaidCount && cancelPaidCount > 5) {
    findings.push({
      title: `${cancelPaidCount} P2P cancellations in 24h — dispute pattern check needed`,
      title_ar: `${cancelPaidCount} إلغاء P2P في 24 ساعة — يحتاج فحص نمط النزاعات`,
      description: `High cancellation volume detected. Some may be cancelled after payment confirmation, risking funds loss.`,
      description_ar: `حجم إلغاء مرتفع. قد يكون بعضها بعد تأكيد الدفع.`,
      why_it_matters: 'Cancellation after payment = potential fraud or UX trap. Support cannot verify truth without receipts.',
      affected_services: ['P2PStatusActions', 'P2PCancelOrderDialog', 'p2pEscrowService'],
      request_type: 'p2p_cancel_safety',
      risk_level: 'high',
      priority_score: computePriority({ money_risk: 8, exploitability: 7, support_cost: 7, user_lock_probability: 6, legal_exposure: 7, system_integrity: 5 }),
      confidence: 75,
      suggested_fix: `1. Block cancel if order status was ever 'paid' — force dispute flow instead.\n2. Add cancel_reason to p2p_orders schema.\n3. Log cancellation in wallet_ledger as audit event.`,
      expected_behavior: 'Orders that reached paid status cannot be cancelled — only disputed or completed.',
      rollback_plan: 'Remove cancel block check. Existing data unaffected.',
      evidence: { cancel_count_24h: cancelPaidCount },
      dedup_key: `p2p_cancel_abuse_pattern`,
    });
  }

  return findings;
}

// 3) Commander Reviews → Systemic Issues
async function scanCommanderReviews(sb: any): Promise<Finding[]> {
  const findings: Finding[] = [];
  const { data: reviews } = await sb.from('commander_reviews')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (!reviews?.length) return findings;

  for (const review of reviews) {
    const decisions = review.decisions || [];
    const escalations = decisions.filter((d: any) => d.new_state === 'probation' || d.new_state === 'disabled');

    if (escalations.length >= 3) {
      findings.push({
        title: `Systemic agent failure: ${escalations.length} agents escalated in single review`,
        title_ar: `فشل نظامي: ${escalations.length} وكلاء تمت تصعيدهم في مراجعة واحدة`,
        description: `Commander review found ${escalations.length} agents needing escalation simultaneously. This suggests a systemic issue — possibly shared dependency failure, rate limiting, or infrastructure problem.`,
        description_ar: `مراجعة القائد وجدت ${escalations.length} وكلاء بحاجة للتصعيد. يشير إلى مشكلة نظامية.`,
        why_it_matters: 'Multiple simultaneous agent failures indicate infrastructure-level problems, not individual bugs.',
        affected_services: escalations.map((e: any) => e.agent_name),
        request_type: 'infrastructure_investigation',
        risk_level: 'critical',
        priority_score: computePriority({ money_risk: 5, exploitability: 3, support_cost: 8, user_lock_probability: 5, legal_exposure: 2, system_integrity: 10 }),
        confidence: 80,
        suggested_fix: `1. Check shared dependencies (Supabase rate limits, API key expiry, edge function cold starts).\n2. Add circuit breaker pattern to orchestrator dispatch.\n3. Implement shared health endpoint all agents can verify.`,
        expected_behavior: 'Correlated failures detected and isolated before cascading.',
        rollback_plan: 'Investigation only. No destructive changes.',
        evidence: { review_id: review.id, escalation_count: escalations.length, agents: escalations.map((e: any) => e.agent_name) },
        dedup_key: `systemic_failure_${review.id}`,
      });
    }
  }
  return findings;
}

// 4) Analysis Logs → Unresolved Critical Issues
async function scanAnalysisLogs(sb: any): Promise<Finding[]> {
  const findings: Finding[] = [];
  const { data: criticals } = await sb.from('ai_analysis_logs')
    .select('id, title, title_ar, description, severity, affected_area, suggested_fix, status')
    .eq('severity', 'critical')
    .in('status', ['pending', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(10);

  if (!criticals?.length) return findings;

  for (const log of criticals) {
    findings.push({
      title: `Unresolved critical: ${log.title}`,
      title_ar: `مشكلة حرجة لم تحل: ${log.title_ar || log.title}`,
      description: `Critical analysis finding "${log.title}" remains unresolved. Area: ${log.affected_area || 'unknown'}. ${log.description}`,
      description_ar: `نتيجة تحليل حرجة "${log.title_ar || log.title}" لم تحل بعد.`,
      why_it_matters: 'Unresolved critical findings accumulate risk and may compound into exploitable vulnerabilities.',
      affected_services: [log.affected_area || 'unknown'],
      request_type: 'critical_resolution',
      risk_level: 'high',
      priority_score: computePriority({ money_risk: 6, exploitability: 7, support_cost: 5, user_lock_probability: 4, legal_exposure: 5, system_integrity: 8 }),
      confidence: 90,
      suggested_fix: log.suggested_fix || 'Requires manual investigation of the affected area.',
      expected_behavior: 'Critical finding resolved and status updated to resolved.',
      rollback_plan: 'Depends on specific fix. Each patch should include rollback SQL.',
      evidence: { analysis_log_id: log.id, severity: log.severity, area: log.affected_area },
      dedup_key: `critical_log_${log.id}`,
    });
  }
  return findings;
}

// 5) Audit Gaps — Orders without ledger entries
async function scanAuditGaps(sb: any): Promise<Finding[]> {
  const findings: Finding[] = [];

  // Completed orders in last 48h
  const twoDays = new Date(Date.now() - 48 * 3600000).toISOString();
  const { data: completedOrders } = await sb.from('p2p_orders')
    .select('id, nova_amount, created_at')
    .eq('status', 'completed')
    .gte('created_at', twoDays)
    .limit(200);

  if (!completedOrders?.length) return findings;

  // Check ledger for these orders
  const orderIds = completedOrders.map((o: any) => o.id);
  const { data: ledgerEntries } = await sb.from('wallet_ledger')
    .select('reference_id')
    .in('reference_id', orderIds.slice(0, 50));

  const ledgerRefIds = new Set((ledgerEntries || []).map((l: any) => l.reference_id));
  const missingAudit = orderIds.filter((id: string) => !ledgerRefIds.has(id));

  if (missingAudit.length > 0) {
    findings.push({
      title: `${missingAudit.length} completed P2P orders missing ledger audit trail`,
      title_ar: `${missingAudit.length} طلب P2P مكتمل بدون سجل تدقيق`,
      description: `Found ${missingAudit.length} completed P2P orders with no corresponding wallet_ledger entry. Financial reconciliation impossible for these transactions.`,
      description_ar: `تم العثور على ${missingAudit.length} طلب مكتمل بدون سجل مالي مقابل.`,
      why_it_matters: 'Missing ledger entries = invisible money movement. Auditors and support cannot verify transaction integrity.',
      affected_services: ['p2pEscrowService', 'walletService', 'wallet_ledger'],
      request_type: 'audit_gap_fix',
      risk_level: 'critical',
      priority_score: computePriority({ money_risk: 10, exploitability: 6, support_cost: 9, user_lock_probability: 3, legal_exposure: 9, system_integrity: 9 }),
      confidence: 95,
      suggested_fix: `1. Ensure p2p_release_escrow RPC writes to wallet_ledger atomically.\n2. Add DB trigger on p2p_orders status='completed' to verify ledger entry exists.\n3. Create reconciliation cron job to detect and backfill gaps.`,
      expected_behavior: 'Every completed order has exactly 2 ledger entries (debit + credit).',
      rollback_plan: 'Backfill script is additive only. No data modified.',
      evidence: { missing_count: missingAudit.length, sample_ids: missingAudit.slice(0, 5) },
      dedup_key: `audit_gap_ledger`,
    });
  }
  return findings;
}

// 6) Repeated Activity Failures → Code Fix Needed
async function scanRepeatedFailures(sb: any): Promise<Finding[]> {
  const findings: Finding[] = [];
  const oneHour = new Date(Date.now() - 3600000).toISOString();

  const { data: failures } = await sb.from('ai_activity_stream')
    .select('action_type, error_code')
    .eq('success', false)
    .gte('created_at', oneHour)
    .limit(500);

  if (!failures?.length) return findings;

  // Group by action_type
  const grouped: Record<string, number> = {};
  for (const f of failures) {
    grouped[f.action_type] = (grouped[f.action_type] || 0) + 1;
  }

  for (const [action, count] of Object.entries(grouped)) {
    if (count >= 5) {
      findings.push({
        title: `Repeated failure pattern: ${action} (${count}x in 1h)`,
        title_ar: `نمط فشل متكرر: ${action} (${count} مرة في ساعة)`,
        description: `Action "${action}" failed ${count} times in the last hour. This indicates a systematic bug, not transient error.`,
        description_ar: `الإجراء "${action}" فشل ${count} مرة في الساعة الأخيرة. يشير إلى خلل منهجي.`,
        why_it_matters: 'Repeated failures waste compute, degrade user experience, and mask real issues in noise.',
        affected_services: [action],
        request_type: 'repeated_failure_fix',
        risk_level: count >= 20 ? 'critical' : 'high',
        priority_score: computePriority({ money_risk: 3, exploitability: 2, support_cost: 5, user_lock_probability: 3, legal_exposure: 1, system_integrity: 7 }),
        confidence: 90,
        suggested_fix: `Inspect edge function for "${action}". Check error_code patterns. Add retry with exponential backoff or fix root cause.`,
        expected_behavior: `Action "${action}" maintains <5% failure rate.`,
        rollback_plan: 'Fix is code-level. Revert commit if regression detected.',
        evidence: { action_type: action, failure_count_1h: count },
        dedup_key: `repeated_failure_${action}`,
      });
    }
  }
  return findings;
}

// 7) Dispute SLA Violations
async function scanDisputeSLA(sb: any): Promise<Finding[]> {
  const findings: Finding[] = [];
  const { data: staleDisputes, count } = await sb.from('p2p_orders')
    .select('id, status, updated_at', { count: 'exact' })
    .eq('status', 'disputed')
    .lt('updated_at', new Date(Date.now() - 24 * 3600000).toISOString())
    .limit(50);

  if (count && count > 0) {
    findings.push({
      title: `${count} P2P disputes exceed 24h SLA`,
      title_ar: `${count} نزاع P2P يتجاوز اتفاقية مستوى الخدمة 24 ساعة`,
      description: `${count} disputed orders have not been resolved within 24 hours. Users are locked out of their funds.`,
      description_ar: `${count} طلب متنازع عليه لم يتم حله خلال 24 ساعة.`,
      why_it_matters: 'Stale disputes erode user trust, lock capital, and may violate regulatory obligations.',
      affected_services: ['SupportDisputes', 'P2PContext', 'p2p_orders'],
      request_type: 'dispute_sla_enforcement',
      risk_level: 'high',
      priority_score: computePriority({ money_risk: 8, exploitability: 4, support_cost: 9, user_lock_probability: 10, legal_exposure: 8, system_integrity: 5 }),
      confidence: 95,
      suggested_fix: `1. Add automated escalation: disputes >24h get flagged to admin with buzzer.\n2. Add dispute_escalated_at column.\n3. Create admin notification cron for stale disputes.\n4. Consider auto-refund for disputes >72h with no admin response.`,
      expected_behavior: 'All disputes resolved or escalated within 24h.',
      rollback_plan: 'Escalation is notification-only. No funds moved automatically.',
      evidence: { stale_count: count, sample_ids: (staleDisputes || []).slice(0, 5).map((d: any) => d.id) },
      dedup_key: `dispute_sla_breach`,
    });
  }
  return findings;
}

// ═══════════════════════════════════════════════════
// MAIN PIPELINE
// ═══════════════════════════════════════════════════

async function runProblemToPatch(sb: any): Promise<{ success: boolean; findings_count: number; requests_created: number }> {
  const { data: agentRow } = await sb.from('ai_agents').select('id').eq('is_active', true).limit(1).single();
  const agentId = agentRow?.id || AI_SYSTEM_USER_ID;

  await streamPhase(sb, agentId, 'command_received', 'Autonomous fix generation scan starting');

  // Phase 2: Load signals
  await streamPhase(sb, agentId, 'understanding', 'Loading health checks, P2P orders, commander reviews, analysis logs');

  // Phase 3: Select scanners
  const scanners = [
    { name: 'Agent Health', fn: scanAgentHealth },
    { name: 'Failed P2P Orders', fn: scanFailedP2POrders },
    { name: 'Commander Reviews', fn: scanCommanderReviews },
    { name: 'Analysis Logs', fn: scanAnalysisLogs },
    { name: 'Audit Gaps', fn: scanAuditGaps },
    { name: 'Repeated Failures', fn: scanRepeatedFailures },
    { name: 'Dispute SLA', fn: scanDisputeSLA },
  ];
  await streamPhase(sb, agentId, 'planning', `Running ${scanners.length} diagnostic modules`);

  // Phase 4: Collect evidence
  await streamPhase(sb, agentId, 'collecting_data', 'Querying production data across all modules');

  const allFindings: Finding[] = [];
  for (const scanner of scanners) {
    try {
      const results = await scanner.fn(sb);
      allFindings.push(...results);
    } catch (err) {
      console.error(`[Problem-to-Patch] Scanner "${scanner.name}" failed:`, err);
    }
  }

  // Phase 5: Diagnose
  await streamPhase(sb, agentId, 'analyzing', `Found ${allFindings.length} actionable problems`);

  if (allFindings.length === 0) {
    await streamPhase(sb, agentId, 'completed', '✅ No actionable problems detected. System healthy.');
    return { success: true, findings_count: 0, requests_created: 0 };
  }

  // Sort by priority
  allFindings.sort((a, b) => b.priority_score - a.priority_score);

  // Phase 6: Generate execution requests
  await streamPhase(sb, agentId, 'building', `Generating ${allFindings.length} execution requests`);

  let requestsCreated = 0;

  // Safety: max 10 requests per run
  const batch = allFindings.slice(0, 10);

  for (const finding of batch) {
    // Dedup check
    const { count: existing } = await sb.from('ai_execution_requests')
      .select('id', { count: 'exact' })
      .in('status', ['pending', 'approved', 'in_progress'])
      .eq('request_type', finding.request_type)
      .ilike('title', `%${finding.title.substring(0, 50)}%`)
      .limit(1);

    if (existing && existing > 0) continue;

    const { data: req } = await sb.from('ai_execution_requests').insert({
      title: finding.title,
      title_ar: finding.title_ar,
      description: finding.description,
      description_ar: finding.description_ar,
      request_type: finding.request_type,
      risk_level: finding.risk_level,
      confidence_score: finding.confidence,
      status: 'pending',
      parameters: {
        why_it_matters: finding.why_it_matters,
        affected_services: finding.affected_services,
        suggested_fix: finding.suggested_fix,
        expected_behavior: finding.expected_behavior,
        rollback_plan: finding.rollback_plan,
        evidence: finding.evidence,
        priority_score: finding.priority_score,
        generated_by: 'ai-problem-to-patch',
      },
      affected_entities: finding.affected_services,
    }).select('id').single();

    if (req) {
      requestsCreated++;

      // Post each HIGH+ finding to Intelligence DM
      if (finding.risk_level === 'critical' || finding.risk_level === 'high') {
        const urgencyIcon = finding.risk_level === 'critical' ? '🚨' : '⚠️';
        const notification = `${urgencyIcon} **مهمة هندسية جديدة** | New Engineering Task

📋 **${finding.title}**
📊 الأولوية: ${finding.priority_score}/100 | الثقة: ${finding.confidence}%
⚠️ المخاطر: ${finding.risk_level}

**لماذا يهم:**
${finding.why_it_matters}

**ما يجب تغييره:**
${finding.suggested_fix}

**التأثير إذا تم تجاهله:**
${finding.description}

🔄 الاسترجاع: ${finding.rollback_plan}
📂 الخدمات المتأثرة: ${finding.affected_services.join(', ')}`;

        await Promise.all([
          postToDM(sb, notification, 'execution_request'),
          postToChatRoom(sb, notification, notification, finding.risk_level === 'critical' ? 'critical' : 'warning'),
        ]);
      }
    }
  }

  // Phase 7: Validate
  await streamPhase(sb, agentId, 'validating', `Created ${requestsCreated} execution requests (${batch.length - requestsCreated} deduplicated)`);

  // Phase 8: Summary
  const summaryContent = `🔧 **تقرير المشكلة-إلى-الإصلاح** | Problem-to-Patch Report

📊 المشاكل المكتشفة: ${allFindings.length}
✅ طلبات التنفيذ المنشأة: ${requestsCreated}
🔄 مكرر/تم تجاهله: ${batch.length - requestsCreated}

${batch.slice(0, 5).map((f, i) => `${i + 1}. [${f.risk_level.toUpperCase()}] ${f.title} (${f.priority_score}/100)`).join('\n')}

${allFindings.length > 5 ? `... و ${allFindings.length - 5} مشكلة أخرى` : ''}`;

  await Promise.all([
    postToDM(sb, summaryContent, 'patch_report'),
    postToChatRoom(sb, summaryContent, summaryContent, requestsCreated > 0 ? 'warning' : 'success'),
  ]);

  // Log to knowledge memory
  await sb.from('knowledge_memory').insert({
    source: 'ai',
    event_type: 'problem_to_patch_scan',
    area: 'engineering',
    payload: {
      findings_count: allFindings.length,
      requests_created: requestsCreated,
      top_findings: batch.slice(0, 3).map(f => ({ title: f.title, risk: f.risk_level, priority: f.priority_score })),
    },
  });

  // Log to agent memory
  await sb.from('agent_memory').insert({
    agent_function: 'ai-problem-to-patch',
    memory_type: 'decision',
    content: `Scan completed: ${allFindings.length} problems found, ${requestsCreated} execution requests created. Top: ${batch[0]?.title || 'none'}`,
    importance: requestsCreated > 0 ? 7 : 3,
    tags: ['problem-to-patch', 'autonomous'],
  });

  await streamPhase(sb, agentId, 'completed', `✅ ${requestsCreated} engineering tasks generated`);

  return { success: true, findings_count: allFindings.length, requests_created: requestsCreated };
}

// ─── HTTP Handler ──────────────────────────────────
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
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
    const result = await runProblemToPatch(sb);

    return new Response(JSON.stringify({
      ...result,
      duration_ms: Date.now() - t0,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Problem-to-Patch] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown',
      duration_ms: Date.now() - t0,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
