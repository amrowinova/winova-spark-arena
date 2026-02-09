import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const AI_SYSTEM_USER_ID = '00000000-0000-0000-0000-a10000000001';

// ═══════════════════════════════════════════════════════
// WINOVA P2P SECURITY SCANNER
// Thinks like: fraud attacker, backend engineer, support, CTO
// Output: ai_execution_requests (buildable fixes, not reports)
// ═══════════════════════════════════════════════════════

interface Finding {
  title: string;
  title_ar: string;
  description: string;
  description_ar: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_score: number;
  confidence_score: number;
  root_cause: string;
  fix: string;
  rollback_plan: string;
  rollback_plan_ar: string;
  affected_entities: string[];
  parameters: Record<string, any>;
  request_type: string;
}

// ─── DM Helper ─────────────────────────────────────
async function postToDM(sb: any, content: string, messageType = 'system') {
  const { data: convos } = await sb
    .from('conversations')
    .select('id')
    .or(`participant1_id.eq.${AI_SYSTEM_USER_ID},participant2_id.eq.${AI_SYSTEM_USER_ID}`)
    .limit(5);
  if (convos) {
    for (const c of convos) {
      await sb.from('direct_messages').insert({
        conversation_id: c.id,
        sender_id: AI_SYSTEM_USER_ID,
        content,
        message_type: messageType,
        is_read: false,
      });
    }
  }
}

async function streamPhase(sb: any, agentId: string, phase: string, phaseAr: string, emoji: string, detail?: string) {
  const content = `${emoji} **${phase}**\n🤖 Agent: P2P Security Scanner${detail ? `\n→ ${detail}` : ''}`;
  const contentAr = `${emoji} **${phaseAr}**\n🤖 الوكيل: ماسح أمان P2P${detail ? `\n→ ${detail}` : ''}`;
  await Promise.all([
    sb.from('ai_chat_room').insert({
      agent_id: agentId,
      content, content_ar: contentAr,
      message_type: 'thinking_stream',
      message_category: 'info',
      is_summary: false,
    }),
    postToDM(sb, contentAr, 'thinking_stream'),
  ]);
}

// ═══════════════════════════════════════════════════════
// SCAN MODULES — Each returns findings
// ═══════════════════════════════════════════════════════

// 1. Orders stuck in transitional states
async function scanStuckOrders(sb: any): Promise<Finding[]> {
  const findings: Finding[] = [];
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  const sixHoursAgo = new Date(Date.now() - 6 * 3600000).toISOString();

  // Matched but never moved to awaiting_payment
  const { data: stuckMatched } = await sb
    .from('p2p_orders')
    .select('id, creator_id, executor_id, nova_amount, matched_at, status')
    .eq('status', 'matched')
    .lt('matched_at', oneHourAgo);

  for (const order of stuckMatched || []) {
    findings.push({
      title: `Stuck matched order: ${order.id.substring(0, 8)}`,
      title_ar: `طلب مطابق عالق: ${order.id.substring(0, 8)}`,
      description: `Order matched ${order.matched_at} but never progressed. Buyer or system failed to transition to awaiting_payment. Nova may be locked indefinitely.`,
      description_ar: `طلب مطابق منذ ${order.matched_at} ولم يتقدم. قد تكون النوڤا محتجزة.`,
      risk_level: 'high',
      risk_score: 75,
      confidence_score: 90,
      root_cause: 'Missing state transition trigger after match. No timeout forces progression or cancellation.',
      fix: `Add a database trigger or cron check: if matched_at < NOW() - INTERVAL '1 hour' AND status = 'matched', auto-transition to 'cancelled' and release escrow via p2p_release_back_to_seller().`,
      rollback_plan: 'Re-set status to matched if incorrectly cancelled. Escrow amounts are tracked in wallet_ledger.',
      rollback_plan_ar: 'إعادة الحالة إلى matched إذا تم الإلغاء بالخطأ. مبالغ الضمان مسجلة في wallet_ledger.',
      affected_entities: [order.id],
      parameters: { order_id: order.id, stuck_since: order.matched_at, nova_amount: order.nova_amount },
      request_type: 'p2p_stuck_order_fix',
    });
  }

  // payment_sent for too long without release or dispute
  const { data: stuckPaid } = await sb
    .from('p2p_orders')
    .select('id, creator_id, executor_id, nova_amount, updated_at')
    .eq('status', 'payment_sent')
    .lt('updated_at', sixHoursAgo);

  for (const order of stuckPaid || []) {
    findings.push({
      title: `Payment sent but no release/dispute: ${order.id.substring(0, 8)}`,
      title_ar: `دفع مرسل بدون تحرير أو نزاع: ${order.id.substring(0, 8)}`,
      description: `Order in payment_sent for 6+ hours. Seller not releasing or disputing. Buyer funds at risk.`,
      description_ar: `طلب في حالة الدفع المرسل لأكثر من 6 ساعات. الأموال معرضة للخطر.`,
      risk_level: 'critical',
      risk_score: 90,
      confidence_score: 95,
      root_cause: 'No enforced SLA on seller response after payment_sent. System allows indefinite limbo.',
      fix: `Create edge function trigger: if payment_sent AND updated_at < NOW() - INTERVAL '6 hours', auto-escalate to 'disputed' with system_reason = 'seller_unresponsive'. Alert support team.`,
      rollback_plan: 'Revert status to payment_sent if dispute raised incorrectly. Ledger is untouched until release.',
      rollback_plan_ar: 'إعادة الحالة إلى payment_sent إذا تم النزاع بالخطأ.',
      affected_entities: [order.id],
      parameters: { order_id: order.id, last_update: order.updated_at, nova_amount: order.nova_amount },
      request_type: 'p2p_unresponsive_seller',
    });
  }

  return findings;
}

// 2. Chat ↔ Order integrity
async function scanChatOrderMapping(sb: any): Promise<Finding[]> {
  const findings: Finding[] = [];

  // Orders that are matched/awaiting_payment/payment_sent but have ZERO messages
  const { data: activeOrders } = await sb
    .from('p2p_orders')
    .select('id, status, matched_at')
    .in('status', ['matched', 'awaiting_payment', 'payment_sent']);

  for (const order of activeOrders || []) {
    const { count } = await sb
      .from('p2p_messages')
      .select('id', { count: 'exact' })
      .eq('order_id', order.id);

    if ((count || 0) === 0) {
      findings.push({
        title: `Active order with no chat: ${order.id.substring(0, 8)}`,
        title_ar: `طلب نشط بدون محادثة: ${order.id.substring(0, 8)}`,
        description: `Order in ${order.status} state has 0 messages. Chat may not have been created on match, or system messages failed. Support cannot verify anything.`,
        description_ar: `طلب في حالة ${order.status} بدون أي رسائل. لا يمكن للدعم التحقق.`,
        risk_level: 'high',
        risk_score: 70,
        confidence_score: 85,
        root_cause: 'Chat initialization on order match may have failed silently. No retry mechanism for system message insertion.',
        fix: `Add a post-match verification: after p2p_execute_order RPC, verify p2p_messages row exists with is_system_message=true. If missing, insert system welcome message. Add a periodic scan to detect orphan orders.`,
        rollback_plan: 'Messages are append-only. No rollback needed for inserted system messages.',
        rollback_plan_ar: 'الرسائل تُضاف فقط. لا حاجة للتراجع.',
        affected_entities: [order.id],
        parameters: { order_id: order.id, status: order.status },
        request_type: 'p2p_missing_chat',
      });
    }
  }

  return findings;
}

// 3. Timer / Expiry integrity
async function scanTimerIntegrity(sb: any): Promise<Finding[]> {
  const findings: Finding[] = [];
  const now = new Date().toISOString();

  // Orders past expires_at but still in active state
  const { data: expired } = await sb
    .from('p2p_orders')
    .select('id, status, expires_at, nova_amount')
    .in('status', ['awaiting_payment', 'matched'])
    .not('expires_at', 'is', null)
    .lt('expires_at', now);

  if ((expired || []).length > 0) {
    findings.push({
      title: `${expired!.length} orders past expiry but not expired`,
      title_ar: `${expired!.length} طلبات تجاوزت وقت الانتهاء`,
      description: `Orders have expires_at in the past but remain in active status. The p2p-auto-expire function may have failed or skipped them. Escrow remains locked.`,
      description_ar: `طلبات تجاوزت وقت الانتهاء لكن لا تزال نشطة. الضمان محتجز.`,
      risk_level: 'critical',
      risk_score: 85,
      confidence_score: 95,
      root_cause: 'p2p-auto-expire edge function may not be running, or it only handles status=open. Matched/awaiting_payment orders are not covered.',
      fix: `Extend p2p-auto-expire to also handle status IN ('matched', 'awaiting_payment') WHERE expires_at < NOW(). Release escrow back to seller via dedicated RPC. Log to wallet_ledger.`,
      rollback_plan: 'If order was legitimately in progress, re-match and re-lock escrow. Wallet_ledger provides full audit trail.',
      rollback_plan_ar: 'إعادة المطابقة وقفل الضمان مرة أخرى. سجل المحفظة يوفر مسار تدقيق.',
      affected_entities: expired!.map((o: any) => o.id),
      parameters: { count: expired!.length, order_ids: expired!.map((o: any) => o.id).slice(0, 10) },
      request_type: 'p2p_expiry_gap',
    });
  }

  return findings;
}

// 4. Release safety — orders completed without payment_sent
async function scanReleaseSafety(sb: any): Promise<Finding[]> {
  const findings: Finding[] = [];
  const oneDayAgo = new Date(Date.now() - 86400000).toISOString();

  // Recently completed orders — check for suspicious fast completion
  const { data: recent } = await sb
    .from('p2p_orders')
    .select('id, status, matched_at, completed_at, nova_amount, creator_id, executor_id')
    .eq('status', 'completed')
    .gte('completed_at', oneDayAgo);

  for (const order of recent || []) {
    if (order.matched_at && order.completed_at) {
      const matchMs = new Date(order.completed_at).getTime() - new Date(order.matched_at).getTime();
      // Completed in under 30 seconds — suspicious
      if (matchMs < 30000) {
        findings.push({
          title: `Suspiciously fast completion: ${order.id.substring(0, 8)}`,
          title_ar: `إتمام مريب بسرعة غير طبيعية: ${order.id.substring(0, 8)}`,
          description: `Order completed in ${Math.round(matchMs / 1000)}s. Normal P2P requires payment verification. This may indicate a colluding pair or a bypass of the release safety flow.`,
          description_ar: `تم إتمام الطلب في ${Math.round(matchMs / 1000)} ثانية. قد يشير لتواطؤ أو تجاوز.`,
          risk_level: 'high',
          risk_score: 80,
          confidence_score: 75,
          root_cause: 'Release safety flow may have been bypassed via direct RPC call, or colluding users are washing trades.',
          fix: `Add server-side minimum time enforcement in p2p_release_escrow RPC: IF completed_at - matched_at < INTERVAL '2 minutes', RAISE EXCEPTION 'release_too_fast'. Also flag the pair (creator_id, executor_id) for pattern analysis.`,
          rollback_plan: 'Completed transactions cannot be rolled back. Flag for manual review and freeze wallets if fraud confirmed.',
          rollback_plan_ar: 'المعاملات المكتملة لا يمكن التراجع عنها. تجميد المحافظ إذا تأكد الاحتيال.',
          affected_entities: [order.id, order.creator_id, order.executor_id],
          parameters: { order_id: order.id, completion_seconds: Math.round(matchMs / 1000), creator_id: order.creator_id, executor_id: order.executor_id },
          request_type: 'p2p_fast_completion_fraud',
        });
      }
    }
  }

  return findings;
}

// 5. Duplicate/repeat patterns — same pair trading repeatedly
async function scanWashTrading(sb: any): Promise<Finding[]> {
  const findings: Finding[] = [];
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();

  let pairs: any[] | null = null;
  try {
    const { data } = await sb.rpc('get_p2p_pair_frequency');
    pairs = data;
  } catch (_) {
    pairs = null;
  }
  if (!pairs) {
    const { data: completed } = await sb
      .from('p2p_orders')
      .select('creator_id, executor_id')
      .eq('status', 'completed')
      .gte('completed_at', sevenDaysAgo);

    const pairCounts: Record<string, number> = {};
    for (const o of completed || []) {
      if (!o.executor_id) continue;
      const key = [o.creator_id, o.executor_id].sort().join('|');
      pairCounts[key] = (pairCounts[key] || 0) + 1;
    }

    for (const [pair, count] of Object.entries(pairCounts)) {
      if (count >= 5) {
        const [u1, u2] = pair.split('|');
        findings.push({
          title: `Wash trading pattern: ${count} trades between same pair`,
          title_ar: `نمط تداول وهمي: ${count} صفقات بين نفس الزوج`,
          description: `Users ${u1.substring(0, 8)} and ${u2.substring(0, 8)} completed ${count} trades in 7 days. May indicate wash trading or point farming.`,
          description_ar: `مستخدمان أكملا ${count} صفقة في 7 أيام. قد يشير لتداول وهمي.`,
          risk_level: count >= 10 ? 'critical' : 'high',
          risk_score: Math.min(95, 50 + count * 5),
          confidence_score: 80,
          root_cause: 'No pair-frequency limit in P2P system. Users can trade with same counterparty unlimited times.',
          fix: `Add pair-frequency check in p2p_execute_order RPC: SELECT COUNT(*) FROM p2p_orders WHERE status = 'completed' AND ((creator_id = $1 AND executor_id = $2) OR (creator_id = $2 AND executor_id = $1)) AND completed_at > NOW() - INTERVAL '7 days'. IF count >= 5, RAISE EXCEPTION 'pair_frequency_exceeded'.`,
          rollback_plan: 'Remove pair-frequency check from RPC if legitimate high-frequency trading is identified.',
          rollback_plan_ar: 'إزالة فحص تكرار الأزواج إذا تبين أن التداول مشروع.',
          affected_entities: [u1, u2],
          parameters: { user_1: u1, user_2: u2, trade_count: count, period: '7d' },
          request_type: 'p2p_wash_trading',
        });
      }
    }
  }

  return findings;
}

// 6. Cancellation abuse — cancelled after payment_sent
async function scanCancellationAbuse(sb: any): Promise<Finding[]> {
  const findings: Finding[] = [];
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();

  const { data: cancelledPaid } = await sb
    .from('p2p_orders')
    .select('id, cancelled_by, cancellation_reason, nova_amount, creator_id, executor_id')
    .eq('status', 'cancelled')
    .gte('updated_at', threeDaysAgo);

  // Check if any were in payment_sent before cancel via messages
  for (const order of cancelledPaid || []) {
    const { data: paymentMsg } = await sb
      .from('p2p_messages')
      .select('id')
      .eq('order_id', order.id)
      .eq('message_type', 'payment_confirmed')
      .limit(1);

    if (paymentMsg && paymentMsg.length > 0) {
      findings.push({
        title: `Cancel after payment confirmation: ${order.id.substring(0, 8)}`,
        title_ar: `إلغاء بعد تأكيد الدفع: ${order.id.substring(0, 8)}`,
        description: `Order was cancelled after buyer confirmed payment. This is a potential scam vector — buyer claims payment, seller cancels to avoid release.`,
        description_ar: `تم إلغاء الطلب بعد تأكيد المشتري للدفع. هذا مسار احتيال محتمل.`,
        risk_level: 'critical',
        risk_score: 95,
        confidence_score: 90,
        root_cause: 'p2p_cancel_order RPC may not check if status was payment_sent before allowing cancellation. Or the guard exists but can be bypassed.',
        fix: `Harden p2p_cancel_order RPC: IF current_status = 'payment_sent', RAISE EXCEPTION 'cannot_cancel_after_payment'. Only allow dispute path. Add audit_log entry for every cancellation attempt on paid orders.`,
        rollback_plan: 'Re-open order to disputed status. Investigate fund movement in wallet_ledger.',
        rollback_plan_ar: 'إعادة فتح الطلب بحالة نزاع. التحقق من حركة الأموال.',
        affected_entities: [order.id, order.cancelled_by || ''],
        parameters: { order_id: order.id, cancelled_by: order.cancelled_by, nova_amount: order.nova_amount },
        request_type: 'p2p_cancel_after_payment',
      });
    }
  }

  return findings;
}

// 7. Missing receipts / ledger gaps
async function scanLedgerIntegrity(sb: any): Promise<Finding[]> {
  const findings: Finding[] = [];
  const oneDayAgo = new Date(Date.now() - 86400000).toISOString();

  // Completed orders should have wallet_ledger entries
  const { data: completed } = await sb
    .from('p2p_orders')
    .select('id, nova_amount, completed_at')
    .eq('status', 'completed')
    .gte('completed_at', oneDayAgo);

  for (const order of completed || []) {
    const { count } = await sb
      .from('wallet_ledger')
      .select('id', { count: 'exact' })
      .eq('reference_id', order.id);

    if ((count || 0) === 0) {
      findings.push({
        title: `Completed order missing ledger: ${order.id.substring(0, 8)}`,
        title_ar: `طلب مكتمل بدون سجل دفتري: ${order.id.substring(0, 8)}`,
        description: `Order completed but no wallet_ledger entries reference it. Funds may have moved without audit trail.`,
        description_ar: `طلب مكتمل بدون إدخالات في دفتر المحفظة. قد تكون الأموال تحركت بدون مسار تدقيق.`,
        risk_level: 'critical',
        risk_score: 95,
        confidence_score: 85,
        root_cause: 'p2p_release_escrow RPC may not be writing to wallet_ledger, or the trigger failed silently.',
        fix: `Verify p2p_release_escrow writes to wallet_ledger with reference_id = order_id. Add a CHECK trigger: after order status = completed, assert wallet_ledger entry exists within 5s or raise alert.`,
        rollback_plan: 'Reconstruct ledger entries from wallet balance snapshots. No fund movement needed.',
        rollback_plan_ar: 'إعادة بناء السجلات من لقطات أرصدة المحفظة.',
        affected_entities: [order.id],
        parameters: { order_id: order.id, nova_amount: order.nova_amount },
        request_type: 'p2p_missing_ledger',
      });
    }
  }

  return findings;
}

// 8. Dispute path integrity
async function scanDisputeIntegrity(sb: any): Promise<Finding[]> {
  const findings: Finding[] = [];

  const { data: disputes } = await sb
    .from('p2p_orders')
    .select('id, updated_at, nova_amount, creator_id, executor_id')
    .eq('status', 'disputed');

  const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();

  for (const d of disputes || []) {
    // Check for dispute files
    const { count: fileCount } = await sb
      .from('p2p_dispute_files')
      .select('id', { count: 'exact' })
      .eq('order_id', d.id);

    if (d.updated_at < twoDaysAgo) {
      findings.push({
        title: `Stale dispute: ${d.id.substring(0, 8)} (${Math.round((Date.now() - new Date(d.updated_at).getTime()) / 3600000)}h)`,
        title_ar: `نزاع راكد: ${d.id.substring(0, 8)}`,
        description: `Dispute open for 48+ hours with ${fileCount || 0} evidence files. No resolution path. Funds locked.`,
        description_ar: `نزاع مفتوح لأكثر من 48 ساعة. الأموال محتجزة.`,
        risk_level: 'high',
        risk_score: 70,
        confidence_score: 90,
        root_cause: 'No SLA enforcement on dispute resolution. Support team may not be alerted automatically.',
        fix: `Add dispute SLA: if disputed AND updated_at < NOW() - INTERVAL '24 hours', auto-escalate priority in support dashboard. Send notification to admin. If 72h passed, allow admin force-resolve.`,
        rollback_plan: 'SLA is an alert mechanism only. No state changes to roll back.',
        rollback_plan_ar: 'اتفاقية مستوى الخدمة آلية تنبيه فقط. لا تغييرات حالة للتراجع عنها.',
        affected_entities: [d.id],
        parameters: { order_id: d.id, hours_open: Math.round((Date.now() - new Date(d.updated_at).getTime()) / 3600000), evidence_files: fileCount || 0 },
        request_type: 'p2p_stale_dispute',
      });
    }
  }

  return findings;
}

// ═══════════════════════════════════════════════════════
// MAIN SCANNER
// ═══════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const t0 = Date.now();

  try {
    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Get agent ID for streaming
    const { data: agent } = await sb.from('ai_agents').select('id').eq('is_active', true).limit(1).single();
    const agentId = agent?.id || AI_SYSTEM_USER_ID;

    // ── Phase 1: Command received
    await streamPhase(sb, agentId, 'Command received', 'تم استلام الأمر', '📩', 'P2P Security Scan initiated');

    // ── Phase 2: Understanding
    await streamPhase(sb, agentId, 'Understanding', 'فهم الطلب', '🧠', 'Scanning 8 attack vectors across P2P system');

    // ── Phase 3: Planning
    await streamPhase(sb, agentId, 'Planning', 'تخطيط', '📋', 'Modules: stuck orders, chat mapping, timers, release safety, wash trading, cancel abuse, ledger gaps, disputes');

    // ── Phase 4: Collecting data
    await streamPhase(sb, agentId, 'Collecting data', 'جمع البيانات', '📡', 'Querying p2p_orders, p2p_messages, wallet_ledger, p2p_dispute_files...');

    // Run all scans in parallel
    const [
      stuckOrders,
      chatMapping,
      timerIssues,
      releaseSafety,
      washTrading,
      cancelAbuse,
      ledgerGaps,
      disputeIssues,
    ] = await Promise.all([
      scanStuckOrders(sb),
      scanChatOrderMapping(sb),
      scanTimerIntegrity(sb),
      scanReleaseSafety(sb),
      scanWashTrading(sb),
      scanCancellationAbuse(sb),
      scanLedgerIntegrity(sb),
      scanDisputeIntegrity(sb),
    ]);

    const allFindings: Finding[] = [
      ...stuckOrders,
      ...chatMapping,
      ...timerIssues,
      ...releaseSafety,
      ...washTrading,
      ...cancelAbuse,
      ...ledgerGaps,
      ...disputeIssues,
    ];

    // ── Phase 5: Analyzing
    await streamPhase(sb, agentId, 'Analyzing', 'تحليل', '🔬', `Found ${allFindings.length} issues across 8 modules`);

    // ── Phase 6: Building execution requests
    await streamPhase(sb, agentId, 'Building', 'بناء الحل', '🏗️', `Creating ${allFindings.length} execution requests...`);

    // Deduplicate: don't re-create requests for same order_id + type if pending
    let created = 0;
    let skipped = 0;

    for (const finding of allFindings) {
      // Check if similar request already exists
      const orderParam = finding.parameters.order_id;
      if (orderParam) {
        const { count } = await sb
          .from('ai_execution_requests')
          .select('id', { count: 'exact' })
          .eq('request_type', finding.request_type)
          .in('status', ['pending', 'approved', 'executing'])
          .contains('parameters', { order_id: orderParam });

        if ((count || 0) > 0) {
          skipped++;
          continue;
        }
      }

      await sb.from('ai_execution_requests').insert({
        title: finding.title,
        title_ar: finding.title_ar,
        description: finding.description,
        description_ar: finding.description_ar,
        request_type: finding.request_type,
        risk_level: finding.risk_level,
        risk_score: finding.risk_score,
        confidence_score: finding.confidence_score,
        parameters: {
          ...finding.parameters,
          root_cause: finding.root_cause,
          suggested_fix: finding.fix,
        },
        rollback_plan: finding.rollback_plan,
        rollback_plan_ar: finding.rollback_plan_ar,
        affected_entities: finding.affected_entities,
        status: 'pending',
        simulation_required: finding.risk_level === 'critical',
        estimated_impact: `Risk: ${finding.risk_level}, Score: ${finding.risk_score}/100`,
        estimated_impact_ar: `المخاطر: ${finding.risk_level}، النقاط: ${finding.risk_score}/100`,
      });

      created++;
    }

    // ── Phase 7: Validating
    await streamPhase(sb, agentId, 'Validating', 'التحقق', '✅', `Created: ${created}, Skipped (duplicate): ${skipped}`);

    const criticalCount = allFindings.filter(f => f.risk_level === 'critical').length;
    const highCount = allFindings.filter(f => f.risk_level === 'high').length;

    // ── Phase 8: Preparing result
    const durationMs = Date.now() - t0;

    const summary = `🔒 **P2P Security Scan Complete**

📊 **Results:**
• Total issues: ${allFindings.length}
• 🔴 Critical: ${criticalCount}
• 🟠 High: ${highCount}
• 🟡 Medium: ${allFindings.filter(f => f.risk_level === 'medium').length}
• 🟢 Low: ${allFindings.filter(f => f.risk_level === 'low').length}

📋 **Execution Requests:**
• Created: ${created}
• Skipped (already tracked): ${skipped}

⏱️ Duration: ${durationMs}ms

**Modules scanned:**
1. Stuck orders: ${stuckOrders.length}
2. Chat ↔ Order mapping: ${chatMapping.length}
3. Timer integrity: ${timerIssues.length}
4. Release safety: ${releaseSafety.length}
5. Wash trading: ${washTrading.length}
6. Cancellation abuse: ${cancelAbuse.length}
7. Ledger integrity: ${ledgerGaps.length}
8. Dispute integrity: ${disputeIssues.length}`;

    await streamPhase(sb, agentId, 'Preparing result', 'إعداد النتيجة', '📝', `${criticalCount} critical, ${highCount} high priority`);

    // Post summary to chat and DM
    await Promise.all([
      sb.from('ai_chat_room').insert({
        agent_id: agentId,
        content: summary,
        content_ar: summary,
        message_type: 'scan_result',
        message_category: criticalCount > 0 ? 'critical' : 'info',
        is_summary: true,
      }),
      postToDM(sb, summary, 'scan_result'),
    ]);

    // Log to knowledge memory
    await sb.from('knowledge_memory').insert({
      source: 'ai',
      event_type: 'p2p_security_scan',
      area: 'p2p',
      payload: {
        total_findings: allFindings.length,
        critical: criticalCount,
        high: highCount,
        created_requests: created,
        skipped: skipped,
        duration_ms: durationMs,
        modules: {
          stuck_orders: stuckOrders.length,
          chat_mapping: chatMapping.length,
          timer_integrity: timerIssues.length,
          release_safety: releaseSafety.length,
          wash_trading: washTrading.length,
          cancel_abuse: cancelAbuse.length,
          ledger_integrity: ledgerGaps.length,
          dispute_integrity: disputeIssues.length,
        },
      },
    });

    // Log to activity stream
    await sb.from('ai_activity_stream').insert({
      action_type: 'p2p_security_scan',
      entity_type: 'p2p_system',
      entity_id: 'p2p_scanner',
      success: true,
      duration_ms: durationMs,
      role: 'system',
      before_state: { scan_started: t0 },
      after_state: { findings: allFindings.length, critical: criticalCount, created: created },
    });

    // ── Phase 9: Completed
    await streamPhase(sb, agentId, 'Completed', 'مكتمل', '🏁', `${allFindings.length} findings → ${created} execution requests in ${durationMs}ms`);

    return new Response(JSON.stringify({
      success: true,
      findings: allFindings.length,
      critical: criticalCount,
      high: highCount,
      requests_created: created,
      requests_skipped: skipped,
      duration_ms: durationMs,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[P2P Scanner] Error:', error);
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
