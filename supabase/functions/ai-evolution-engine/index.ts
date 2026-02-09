import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// =============================================
// WINOVA AI Evolution Engine
// Agent lifecycle: trust, evaluation, promotion, retirement, comparison
// =============================================

const RANK_HIERARCHY = ['trainee', 'operator', 'senior', 'expert', 'commander', 'architect'] as const;
type AgentRank = typeof RANK_HIERARCHY[number];

const RANK_THRESHOLDS: Record<AgentRank, { trust: number; success_rate: number; min_ops: number; auto_level: number }> = {
  trainee:    { trust: 0,  success_rate: 0,  min_ops: 0,   auto_level: 0 },
  operator:   { trust: 40, success_rate: 60, min_ops: 10,  auto_level: 1 },
  senior:     { trust: 55, success_rate: 70, min_ops: 30,  auto_level: 2 },
  expert:     { trust: 70, success_rate: 80, min_ops: 60,  auto_level: 3 },
  commander:  { trust: 85, success_rate: 88, min_ops: 100, auto_level: 4 },
  architect:  { trust: 95, success_rate: 95, min_ops: 200, auto_level: 5 },
};

// Trust deltas (normal)
const TRUST_DELTAS: Record<string, number> = {
  prediction_correct:   +3,
  simulation_aligned:   +2,
  human_approved:       +2,
  execution_success:    +4,
  no_rollback:          +1,
  rejected:             -3,
  rollback:             -5,
  high_risk_failure:    -8,
  human_override:       -2,
};

// Autonomous trust multipliers: freedom = responsibility
const AUTONOMOUS_MULTIPLIER = {
  success: 1.5,  // 1.5x reward for autonomous success
  failure: 2.0,  // 2x penalty for autonomous failure
};

const AI_SYSTEM_USER_ID = '00000000-0000-0000-0000-a10000000001';

async function postDM(sb: any, conversationId: string, content: string, messageType = 'system') {
  await sb.from('direct_messages').insert({
    conversation_id: conversationId,
    sender_id: AI_SYSTEM_USER_ID,
    content,
    message_type: messageType,
    is_read: false,
  });
}

async function findAdminConversation(sb: any): Promise<string | null> {
  // Find first admin conversation with AI system user
  const { data } = await sb
    .from('dm_conversations')
    .select('id')
    .or(`participant1_id.eq.${AI_SYSTEM_USER_ID},participant2_id.eq.${AI_SYSTEM_USER_ID}`)
    .limit(1);
  return data?.[0]?.id || null;
}

// ---- TRUST ECONOMY ----
async function updateTrust(
  sb: any, agentId: string, sourceType: string, sourceId: string,
  reasonAr: string, conversationId?: string, autonomous = false
) {
  const baseDelta = TRUST_DELTAS[sourceType] || 0;
  if (baseDelta === 0) return;

  // Apply autonomous multiplier
  let delta: number;
  if (autonomous) {
    const multiplier = baseDelta > 0 ? AUTONOMOUS_MULTIPLIER.success : AUTONOMOUS_MULTIPLIER.failure;
    delta = Math.round(baseDelta * multiplier);
  } else {
    delta = baseDelta;
  }

  const { data: agent } = await sb.from('ai_agents').select('trust_score, agent_name, agent_name_ar').eq('id', agentId).single();
  if (!agent) return;

  const prev = Number(agent.trust_score);
  const next = Math.max(0, Math.min(100, prev + delta));

  // Update agent
  await sb.from('ai_agents').update({ trust_score: next }).eq('id', agentId);

  // Log trust change
  await sb.from('ai_trust_changes').insert({
    agent_id: agentId,
    delta,
    previous_score: prev,
    new_score: next,
    reason: reasonAr,
    reason_ar: reasonAr,
    source_type: autonomous ? `autonomous_${sourceType}` : sourceType,
    source_id: sourceId,
  });

  // Post to DM if significant change
  if (Math.abs(delta) >= 3) {
    const convId = conversationId || await findAdminConversation(sb);
    if (convId) {
      const emoji = delta > 0 ? '📈' : '📉';
      const direction = delta > 0 ? 'ارتفاع' : 'انخفاض';
      const autoTag = autonomous ? ' (تلقائي — مُضاعف)' : '';
      await postDM(sb, convId,
        `${emoji} **تحديث الثقة${autoTag} — ${agent.agent_name_ar || agent.agent_name}**\n\n` +
        `الثقة: ${prev}% → ${next}% (${delta > 0 ? '+' : ''}${delta})\n` +
        `السبب: ${reasonAr}\n` +
        `الاتجاه: ${direction}`
      );
    }
  }

  return { prev, next, delta };
}

// ---- SELF EVALUATION ----
async function generateSelfEvaluation(sb: any, agentId: string, conversationId?: string) {
  const { data: agent } = await sb.from('ai_agents')
    .select('*')
    .eq('id', agentId)
    .single();
  if (!agent) return null;

  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days

  // Gather trust changes
  const { data: trustChanges } = await sb.from('ai_trust_changes')
    .select('*')
    .eq('agent_id', agentId)
    .gte('created_at', periodStart.toISOString())
    .order('created_at', { ascending: false });

  const changes = trustChanges || [];
  const positiveChanges = changes.filter((c: any) => c.delta > 0);
  const negativeChanges = changes.filter((c: any) => c.delta < 0);

  // Gather execution results
  const { data: execResults } = await sb.from('ai_execution_results')
    .select('execution_status, was_rolled_back')
    .gte('created_at', periodStart.toISOString())
    .limit(100);

  const results = execResults || [];
  const successes = results.filter((r: any) => r.execution_status === 'completed' && !r.was_rolled_back).length;
  const failures = results.filter((r: any) => r.execution_status === 'failed' || r.was_rolled_back).length;

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (positiveChanges.length > negativeChanges.length) strengths.push('High trust momentum');
  if (negativeChanges.length > positiveChanges.length) weaknesses.push('Declining trust trend');
  if (successes > failures * 3) strengths.push('Strong execution success rate');
  if (failures > successes) weaknesses.push('High failure rate requires attention');
  if (agent.trust_score >= 70) strengths.push('High trust level maintained');
  if (agent.trust_score < 40) weaknesses.push('Trust below operational threshold');

  let recommendedAction = 'continue';
  if (agent.trust_score >= RANK_THRESHOLDS[getNextRank(agent.rank) || 'architect'].trust &&
      agent.total_operations >= RANK_THRESHOLDS[getNextRank(agent.rank) || 'architect'].min_ops) {
    recommendedAction = 'promote';
  } else if (agent.trust_score < 25) {
    recommendedAction = 'retire';
  } else if (failures > successes * 2) {
    recommendedAction = 'retrain';
  }

  const evaluation = {
    agent_id: agentId,
    evaluation_period_start: periodStart.toISOString(),
    evaluation_period_end: periodEnd.toISOString(),
    operations_reviewed: changes.length + results.length,
    correct_predictions: positiveChanges.filter((c: any) => c.source_type === 'prediction_correct').length,
    incorrect_predictions: negativeChanges.filter((c: any) => c.source_type === 'rejected').length,
    human_agreements: positiveChanges.filter((c: any) => c.source_type === 'human_approved').length,
    human_overrides: negativeChanges.filter((c: any) => c.source_type === 'human_override').length,
    errors_analyzed: failures,
    improvement_hypotheses: weaknesses.length > 0
      ? [{ hypothesis: 'Reduce failure rate through tighter pre-checks', priority: 'high' }]
      : [],
    strengths,
    weaknesses,
    summary: `Agent ${agent.agent_name}: Trust ${agent.trust_score}%, ${successes} successes, ${failures} failures in 7-day period.`,
    summary_ar: `الوكيل ${agent.agent_name_ar || agent.agent_name}: الثقة ${agent.trust_score}%، ${successes} نجاح، ${failures} فشل خلال 7 أيام.`,
    trust_score_at_evaluation: agent.trust_score,
    recommended_action: recommendedAction,
  };

  const { data: evalRecord } = await sb.from('ai_self_evaluations').insert(evaluation).select().single();

  // Update agent last evaluation date
  await sb.from('ai_agents').update({ last_evaluation_date: periodEnd.toISOString() }).eq('id', agentId);

  // Post to DM
  if (conversationId) {
    await postDM(sb, conversationId,
      `📋 **تقرير التقييم الذاتي**\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🤖 الوكيل: ${agent.agent_name_ar || agent.agent_name}\n` +
      `📊 الرتبة: ${agent.rank}\n` +
      `🎯 الثقة: ${agent.trust_score}%\n\n` +
      `📈 العمليات المراجعة: ${evaluation.operations_reviewed}\n` +
      `✅ نجاحات: ${successes}\n` +
      `❌ إخفاقات: ${failures}\n` +
      `👤 موافقات بشرية: ${evaluation.human_agreements}\n` +
      `🔄 تجاوزات بشرية: ${evaluation.human_overrides}\n\n` +
      `💪 نقاط القوة: ${strengths.join('، ') || 'لا يوجد'}\n` +
      `⚠️ نقاط الضعف: ${weaknesses.join('، ') || 'لا يوجد'}\n\n` +
      `📌 التوصية: ${recommendedAction === 'promote' ? '🏅 ترقية' : recommendedAction === 'retire' ? '🔴 تقاعد' : recommendedAction === 'retrain' ? '📚 إعادة تدريب' : '✅ استمرار'}`,
      'evolution_evaluation'
    );
  }

  return evalRecord;
}

function getNextRank(current: string): AgentRank | null {
  const idx = RANK_HIERARCHY.indexOf(current as AgentRank);
  if (idx < 0 || idx >= RANK_HIERARCHY.length - 1) return null;
  return RANK_HIERARCHY[idx + 1];
}

function getPrevRank(current: string): AgentRank | null {
  const idx = RANK_HIERARCHY.indexOf(current as AgentRank);
  if (idx <= 0) return null;
  return RANK_HIERARCHY[idx - 1];
}

// ---- PROMOTION CHECK ----
async function checkPromotionEligibility(sb: any, agentId: string, conversationId?: string) {
  const { data: agent } = await sb.from('ai_agents').select('*').eq('id', agentId).single();
  if (!agent) return;

  const nextRank = getNextRank(agent.rank);
  if (!nextRank) return; // Already architect

  const threshold = RANK_THRESHOLDS[nextRank];
  const eligible =
    agent.trust_score >= threshold.trust &&
    (agent.success_rate || 0) >= threshold.success_rate &&
    (agent.total_operations || 0) >= threshold.min_ops;

  if (!eligible) return;

  // Check no pending promotion
  const { data: pending } = await sb.from('ai_promotion_requests')
    .select('id')
    .eq('agent_id', agentId)
    .eq('status', 'pending')
    .limit(1);
  if (pending && pending.length > 0) return;

  // Create promotion request
  const { data: promoReq } = await sb.from('ai_promotion_requests').insert({
    agent_id: agentId,
    current_rank: agent.rank,
    requested_rank: nextRank,
    justification: `Agent meets all thresholds: trust=${agent.trust_score}% (req ${threshold.trust}%), success=${agent.success_rate}% (req ${threshold.success_rate}%), ops=${agent.total_operations} (req ${threshold.min_ops})`,
    justification_ar: `الوكيل حقق جميع المعايير: الثقة=${agent.trust_score}% (المطلوب ${threshold.trust}%)، النجاح=${agent.success_rate}% (المطلوب ${threshold.success_rate}%)، العمليات=${agent.total_operations} (المطلوب ${threshold.min_ops})`,
    impact_summary: `Promotion to ${nextRank} unlocks auto-execute level ${threshold.auto_level}`,
    impact_summary_ar: `الترقية إلى ${nextRank} تفتح مستوى التنفيذ التلقائي ${threshold.auto_level}`,
    trust_score_at_request: agent.trust_score,
    success_rate_at_request: agent.success_rate,
    total_ops_at_request: agent.total_operations,
    conversation_id: conversationId,
  }).select().single();

  if (conversationId && promoReq) {
    await postDM(sb, conversationId,
      `🏅 **طلب ترقية**\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🤖 الوكيل: ${agent.agent_name_ar || agent.agent_name}\n` +
      `📊 الرتبة الحالية: ${agent.rank}\n` +
      `🎯 الرتبة المطلوبة: ${nextRank}\n\n` +
      `📈 الثقة: ${agent.trust_score}%\n` +
      `✅ معدل النجاح: ${agent.success_rate}%\n` +
      `⚙️ العمليات: ${agent.total_operations}\n\n` +
      `💡 التبرير: الوكيل حقق جميع معايير الترقية\n` +
      `🔓 التأثير: فتح مستوى التنفيذ التلقائي ${threshold.auto_level}\n\n` +
      `promotion_request_id: ${promoReq.id}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Decision required`,
      'evolution_promotion'
    );
  }
}

// ---- RETIREMENT CHECK ----
async function checkRetirement(sb: any, agentId: string, conversationId?: string) {
  const { data: agent } = await sb.from('ai_agents').select('*').eq('id', agentId).single();
  if (!agent || !agent.is_active) return;

  const shouldRetire = agent.trust_score < 20 && (agent.total_operations || 0) > 15;
  const shouldRetrain = agent.trust_score < 35 && (agent.failure_rate || 0) > 40;

  if (!shouldRetire && !shouldRetrain) return;

  // Check no pending retirement
  const { data: pending } = await sb.from('ai_retirement_proposals')
    .select('id').eq('agent_id', agentId).eq('status', 'pending').limit(1);
  if (pending && pending.length > 0) return;

  const recommendation = shouldRetire ? 'retire' : 'retrain';

  const { data: retireReq } = await sb.from('ai_retirement_proposals').insert({
    agent_id: agentId,
    reason: shouldRetire
      ? `Trust score critically low (${agent.trust_score}%) after ${agent.total_operations} operations`
      : `High failure rate (${agent.failure_rate}%) with low trust (${agent.trust_score}%)`,
    reason_ar: shouldRetire
      ? `الثقة منخفضة بشكل حرج (${agent.trust_score}%) بعد ${agent.total_operations} عملية`
      : `معدل فشل مرتفع (${agent.failure_rate}%) مع ثقة منخفضة (${agent.trust_score}%)`,
    performance_summary: {
      trust_score: agent.trust_score,
      success_rate: agent.success_rate,
      failure_rate: agent.failure_rate,
      total_operations: agent.total_operations,
      rank: agent.rank,
    },
    recommendation,
    recommendation_ar: recommendation === 'retire' ? 'تقاعد' : 'إعادة تدريب',
    conversation_id: conversationId,
  }).select().single();

  if (conversationId && retireReq) {
    const emoji = recommendation === 'retire' ? '🔴' : '📚';
    await postDM(sb, conversationId,
      `${emoji} **${recommendation === 'retire' ? 'اقتراح تقاعد' : 'اقتراح إعادة تدريب'}**\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🤖 الوكيل: ${agent.agent_name_ar || agent.agent_name}\n` +
      `📊 الرتبة: ${agent.rank}\n` +
      `🎯 الثقة: ${agent.trust_score}%\n` +
      `✅ النجاح: ${agent.success_rate}%\n` +
      `❌ الفشل: ${agent.failure_rate}%\n\n` +
      `📌 التوصية: ${recommendation === 'retire' ? 'إيقاف الوكيل نهائياً' : 'إعادة تدريب وتصفير العمليات'}\n\n` +
      `retirement_proposal_id: ${retireReq.id}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `Decision required`,
      'evolution_retirement'
    );
  }
}

// ---- AGENT COMPARISON ----
async function compareAgents(sb: any, specialty: string, conversationId?: string) {
  const { data: agents } = await sb.from('ai_agents')
    .select('id, agent_name, agent_name_ar, rank, trust_score, success_rate, failure_rate, total_operations')
    .eq('specialty', specialty)
    .eq('is_active', true)
    .order('trust_score', { ascending: false });

  if (!agents || agents.length < 2) return;

  const winner = agents[0];
  const weakest = agents[agents.length - 1];

  let recommendation = 'retain_all';
  let recommendationAr = 'الإبقاء على الجميع';

  if (weakest.trust_score < 25 && winner.trust_score > 70) {
    recommendation = 'replace_weakest';
    recommendationAr = 'استبدال الأضعف';
  } else if (weakest.trust_score < 40) {
    recommendation = 'retrain';
    recommendationAr = 'إعادة تدريب الأضعف';
  }

  const comparison = {
    specialty,
    agents_compared: agents.map((a: any) => ({
      agent_id: a.id,
      name: a.agent_name_ar || a.agent_name,
      trust_score: a.trust_score,
      success_rate: a.success_rate,
      total_ops: a.total_operations,
    })),
    winner_agent_id: winner.id,
    recommendation,
    recommendation_ar: recommendationAr,
    details: `${agents.length} agents compared in ${specialty}. Winner: ${winner.agent_name} (trust: ${winner.trust_score}%)`,
    details_ar: `تمت مقارنة ${agents.length} وكلاء في ${specialty}. الأفضل: ${winner.agent_name_ar || winner.agent_name} (الثقة: ${winner.trust_score}%)`,
    conversation_id: conversationId,
  };

  await sb.from('ai_agent_comparisons').insert(comparison);

  if (conversationId && recommendation !== 'retain_all') {
    const ranking = agents.map((a: any, i: number) =>
      `${i + 1}. ${a.agent_name_ar || a.agent_name} — ثقة: ${a.trust_score}%، نجاح: ${a.success_rate}%`
    ).join('\n');

    await postDM(sb, conversationId,
      `🏆 **مقارنة أداء الوكلاء**\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `📂 التخصص: ${specialty}\n\n` +
      `${ranking}\n\n` +
      `📌 التوصية: ${recommendationAr}\n` +
      `🥇 الأفضل: ${winner.agent_name_ar || winner.agent_name}`,
      'evolution_comparison'
    );
  }
}

// ---- APPROVE PROMOTION ----
async function approvePromotion(sb: any, promotionId: string, userId: string) {
  const { data: promo } = await sb.from('ai_promotion_requests')
    .select('*').eq('id', promotionId).single();
  if (!promo || promo.status !== 'pending') return { error: 'Invalid or already decided' };

  const nextRank = promo.requested_rank;
  const threshold = RANK_THRESHOLDS[nextRank as AgentRank];

  await sb.from('ai_promotion_requests').update({
    status: 'approved', decided_by: userId, decided_at: new Date().toISOString(),
  }).eq('id', promotionId);

  await sb.from('ai_agents').update({
    rank: nextRank,
    auto_execute_level: threshold?.auto_level || 0,
  }).eq('id', promo.agent_id);

  // Log lifecycle event
  await sb.from('ai_agent_lifecycle').insert({
    agent_id: promo.agent_id,
    event_type: 'promotion',
    from_state: { rank: promo.current_rank },
    to_state: { rank: nextRank },
    reason: 'Admin approved promotion',
    reason_ar: 'تمت الموافقة على الترقية',
    approved_by: userId,
  });

  // Log to ai_promotions
  await sb.from('ai_promotions').insert({
    agent_id: promo.agent_id,
    from_rank: promo.current_rank,
    to_rank: nextRank,
    reason: `Promotion approved: trust ${promo.trust_score_at_request}%, ops ${promo.total_ops_at_request}`,
    approved_by: userId,
  });

  if (promo.conversation_id) {
    const { data: agent } = await sb.from('ai_agents').select('agent_name_ar, agent_name').eq('id', promo.agent_id).single();
    await postDM(sb, promo.conversation_id,
      `🎉 **تمت الترقية!**\n\n` +
      `🤖 ${agent?.agent_name_ar || agent?.agent_name}\n` +
      `${promo.current_rank} → ${nextRank}\n` +
      `🔓 مستوى التنفيذ: ${threshold?.auto_level || 0}`
    );
  }

  return { success: true };
}

// ---- REJECT PROMOTION ----
async function rejectPromotion(sb: any, promotionId: string, userId: string, reason?: string) {
  const { data: promo } = await sb.from('ai_promotion_requests')
    .select('*').eq('id', promotionId).single();
  if (!promo || promo.status !== 'pending') return { error: 'Invalid' };

  await sb.from('ai_promotion_requests').update({
    status: 'rejected', decided_by: userId, decided_at: new Date().toISOString(),
    decision_reason: reason || 'Rejected by admin',
  }).eq('id', promotionId);

  // Trust penalty for rejected promotion
  if (promo.conversation_id) {
    await updateTrust(sb, promo.agent_id, 'rejected', promotionId,
      'تم رفض طلب الترقية', promo.conversation_id);

    const { data: agent } = await sb.from('ai_agents').select('agent_name_ar, agent_name').eq('id', promo.agent_id).single();
    await postDM(sb, promo.conversation_id,
      `❌ **تم رفض طلب الترقية**\n\n` +
      `🤖 ${agent?.agent_name_ar || agent?.agent_name}\n` +
      `${reason ? `السبب: ${reason}` : 'تم الرفض بواسطة الإدارة'}`
    );
  }

  return { success: true };
}

// ---- APPROVE RETIREMENT ----
async function approveRetirement(sb: any, retirementId: string, userId: string) {
  const { data: retire } = await sb.from('ai_retirement_proposals')
    .select('*').eq('id', retirementId).single();
  if (!retire || retire.status !== 'pending') return { error: 'Invalid' };

  await sb.from('ai_retirement_proposals').update({
    status: 'approved', decided_by: userId, decided_at: new Date().toISOString(),
  }).eq('id', retirementId);

  if (retire.recommendation === 'retire') {
    await sb.from('ai_agents').update({
      is_active: false, status: 'retired',
    }).eq('id', retire.agent_id);

    await sb.from('ai_agent_lifecycle').insert({
      agent_id: retire.agent_id,
      event_type: 'retirement',
      reason: retire.reason,
      reason_ar: retire.reason_ar,
      approved_by: userId,
    });
  } else {
    // Retrain — reset stats, demote
    const { data: agent } = await sb.from('ai_agents').select('rank, demotions').eq('id', retire.agent_id).single();
    const prevRank = getPrevRank(agent?.rank || 'operator');

    await sb.from('ai_agents').update({
      trust_score: 40,
      success_rate: 0,
      failure_rate: 0,
      total_operations: 0,
      rank: prevRank || 'trainee',
      demotions: (agent?.demotions || 0) + 1,
      status: 'training',
    }).eq('id', retire.agent_id);

    await sb.from('ai_agent_lifecycle').insert({
      agent_id: retire.agent_id,
      event_type: 'retrain',
      from_state: { rank: agent?.rank },
      to_state: { rank: prevRank || 'trainee' },
      reason: retire.reason,
      reason_ar: retire.reason_ar,
      approved_by: userId,
    });
  }

  if (retire.conversation_id) {
    const { data: agent } = await sb.from('ai_agents').select('agent_name_ar, agent_name').eq('id', retire.agent_id).single();
    const action = retire.recommendation === 'retire' ? 'تقاعد ✅' : 'إعادة تدريب 📚';
    await postDM(sb, retire.conversation_id,
      `${retire.recommendation === 'retire' ? '🔴' : '📚'} **تم تنفيذ ${action}**\n\n` +
      `🤖 ${agent?.agent_name_ar || agent?.agent_name}\n` +
      `الإجراء: ${action}`
    );
  }

  return { success: true };
}

// ---- NEW SKILL ACQUIRED ----
async function reportNewSkill(sb: any, agentId: string, skillName: string, skillNameAr: string, skillCategory: string, conversationId?: string) {
  // Upsert skill
  const { data: existing } = await sb.from('ai_agent_skills')
    .select('id, proficiency_level, usage_count')
    .eq('agent_id', agentId)
    .eq('skill_name', skillName)
    .limit(1);

  let isNew = true;
  let proficiency = 10;

  if (existing && existing.length > 0) {
    isNew = false;
    proficiency = Math.min(100, existing[0].proficiency_level + 5);
    await sb.from('ai_agent_skills').update({
      proficiency_level: proficiency,
      usage_count: existing[0].usage_count + 1,
      last_used_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', existing[0].id);
  } else {
    await sb.from('ai_agent_skills').insert({
      agent_id: agentId,
      skill_name: skillName,
      skill_name_ar: skillNameAr,
      skill_category: skillCategory,
      proficiency_level: proficiency,
      usage_count: 1,
    });
  }

  const convId = conversationId || await findAdminConversation(sb);
  if (convId) {
    const { data: agent } = await sb.from('ai_agents').select('agent_name_ar, agent_name').eq('id', agentId).single();
    const emoji = isNew ? '🧠' : '📈';
    const label = isNew ? 'مهارة جديدة' : 'تحسين مهارة';
    await postDM(sb, convId,
      `${emoji} **${label}**\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🤖 الوكيل: ${agent?.agent_name_ar || agent?.agent_name}\n` +
      `🎯 المهارة: ${skillNameAr || skillName}\n` +
      `📂 التصنيف: ${skillCategory}\n` +
      `📊 الإتقان: ${proficiency}%\n` +
      `${isNew ? '✨ تم اكتساب مهارة جديدة!' : `⬆️ ارتفع الإتقان إلى ${proficiency}%`}`,
      'evolution_skill'
    );
  }

  return { isNew, proficiency };
}

// ---- LEARNING DISCOVERY ----
async function reportLearning(sb: any, agentId: string, discovery: string, discoveryAr: string, source: string, conversationId?: string) {
  // Log to knowledge_memory
  await sb.from('knowledge_memory').insert({
    source,
    event_type: 'ai_learning',
    summary: discovery,
    metadata: { agent_id: agentId, discovery_ar: discoveryAr },
  });

  const convId = conversationId || await findAdminConversation(sb);
  if (convId) {
    const { data: agent } = await sb.from('ai_agents').select('agent_name_ar, agent_name').eq('id', agentId).single();
    await postDM(sb, convId,
      `💡 **اكتشاف تعلّمي**\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🤖 الوكيل: ${agent?.agent_name_ar || agent?.agent_name}\n` +
      `📖 الاكتشاف: ${discoveryAr || discovery}\n` +
      `📂 المصدر: ${source}\n` +
      `⏰ ${new Date().toLocaleString('ar-SA')}`,
      'evolution_learning'
    );
  }

  return { logged: true };
}

// ---- SELF-EVOLUTION PROPOSAL ----
async function submitEvolutionProposal(
  sb: any, agentId: string,
  proposalType: string, title: string, titleAr: string,
  description: string, descriptionAr: string,
  proposedChange: string, proposedChangeAr: string,
  riskAssessment: string, riskDetails: string, riskDetailsAr: string,
  expectedImpact: string, expectedImpactAr: string,
  conversationId?: string
) {
  const { data: proposal } = await sb.from('ai_self_evolution_proposals').insert({
    proposing_agent_id: agentId,
    proposal_type: proposalType,
    title, title_ar: titleAr,
    description, description_ar: descriptionAr,
    proposed_change: proposedChange, proposed_change_ar: proposedChangeAr,
    risk_assessment: riskAssessment,
    risk_details: riskDetails, risk_details_ar: riskDetailsAr,
    expected_impact: expectedImpact, expected_impact_ar: expectedImpactAr,
    lifecycle_status: 'draft',
  }).select().single();

  const convId = conversationId || await findAdminConversation(sb);
  if (convId && proposal) {
    const { data: agent } = await sb.from('ai_agents').select('agent_name_ar, agent_name, rank').eq('id', agentId).single();
    const typeLabels: Record<string, string> = {
      weakness_fix: '🔧 إصلاح ضعف',
      upgrade: '⬆️ ترقية',
      new_tool: '🛠️ أداة جديدة',
      new_agent: '🤖 وكيل جديد',
      workflow: '🔄 تحسين سير العمل',
      architecture: '🏗️ تحسين معماري',
    };
    const riskEmoji: Record<string, string> = { low: '🟢', medium: '🟡', high: '🟠', critical: '🔴' };

    await postDM(sb, convId,
      `🧬 **مقترح تطور ذاتي**\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `${typeLabels[proposalType] || '📋 مقترح'}\n\n` +
      `🤖 المقترح من: ${agent?.agent_name_ar || agent?.agent_name} (${agent?.rank})\n` +
      `📌 العنوان: ${titleAr || title}\n` +
      `📖 الوصف: ${descriptionAr || description}\n\n` +
      `🔄 التغيير المقترح: ${proposedChangeAr || proposedChange}\n` +
      `${riskEmoji[riskAssessment] || '🟡'} المخاطر: ${riskDetailsAr || riskDetails}\n` +
      `📈 الأثر المتوقع: ${expectedImpactAr || expectedImpact}\n\n` +
      `📊 الحالة: مسودة — بانتظار المحاكاة\n\n` +
      `evolution_proposal_id: ${proposal.id}\n` +
      `━━━━━━━━━━━━━━━━━━━━━━\n` +
      `⏳ يجب المحاكاة أولاً ثم الموافقة`,
      'evolution_proposal'
    );
  }

  return proposal;
}

// ---- APPROVE/REJECT EVOLUTION PROPOSAL ----
async function decideEvolutionProposal(sb: any, proposalId: string, decision: 'approved' | 'rejected', userId: string, reason?: string) {
  const { data: proposal } = await sb.from('ai_self_evolution_proposals')
    .select('*').eq('id', proposalId).single();
  if (!proposal) return { error: 'Not found' };

  await sb.from('ai_self_evolution_proposals').update({
    lifecycle_status: decision,
    decided_at: new Date().toISOString(),
    decided_by: userId,
    decision_reason: reason || (decision === 'approved' ? 'Approved by admin' : 'Rejected by admin'),
    decision_reason_ar: reason,
    updated_at: new Date().toISOString(),
  }).eq('id', proposalId);

  const convId = proposal.conversation_id || await findAdminConversation(sb);
  if (convId) {
    const emoji = decision === 'approved' ? '✅' : '❌';
    const label = decision === 'approved' ? 'تمت الموافقة' : 'تم الرفض';
    await postDM(sb, convId,
      `${emoji} **${label} — مقترح التطور**\n\n` +
      `📌 ${proposal.title_ar || proposal.title}\n` +
      `${reason ? `السبب: ${reason}` : ''}`,
    );
  }

  return { success: true };
}

// ---- FULL EVOLUTION CYCLE ----
async function runEvolutionCycle(sb: any) {
  const conversationId = await findAdminConversation(sb);

  // Get all active agents
  const { data: agents } = await sb.from('ai_agents')
    .select('id, specialty')
    .eq('is_active', true);

  if (!agents || agents.length === 0) return { evaluated: 0 };

  let evaluated = 0;
  const specialties = new Set<string>();

  for (const agent of agents) {
    // Self evaluation
    await generateSelfEvaluation(sb, agent.id, conversationId || undefined);
    // Check promotion eligibility
    await checkPromotionEligibility(sb, agent.id, conversationId || undefined);
    // Check retirement
    await checkRetirement(sb, agent.id, conversationId || undefined);
    evaluated++;

    if (agent.specialty) specialties.add(agent.specialty);
  }

  // Run comparisons per specialty
  for (const spec of specialties) {
    await compareAgents(sb, spec, conversationId || undefined);
  }

  // Post cycle summary
  if (conversationId) {
    await postDM(sb, conversationId,
      `🔄 **دورة التطور — اكتملت**\n\n` +
      `🤖 وكلاء تم تقييمهم: ${evaluated}\n` +
      `📂 تخصصات تمت مقارنتها: ${specialties.size}\n` +
      `⏰ ${new Date().toISOString()}`,
      'evolution_cycle'
    );
  }

  return { evaluated, specialties: specialties.size };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const sbUrl = Deno.env.get('SUPABASE_URL')!;
    const sbKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sb = createClient(sbUrl, sbKey);

    const body = await req.json().catch(() => ({}));
    const { action, agent_id, source_type, source_id, reason_ar, conversation_id,
            promotion_id, retirement_id, user_id, reason } = body;

    let result: any;

    switch (action) {
      case 'update_trust':
        result = await updateTrust(sb, agent_id, source_type, source_id, reason_ar, conversation_id, false);
        break;

      case 'update_trust_autonomous':
        result = await updateTrust(sb, agent_id, source_type, source_id, reason_ar, conversation_id, true);
        break;

      case 'self_evaluate':
        result = await generateSelfEvaluation(sb, agent_id, conversation_id);
        break;

      case 'check_promotion':
        await checkPromotionEligibility(sb, agent_id, conversation_id);
        result = { checked: true };
        break;

      case 'check_retirement':
        await checkRetirement(sb, agent_id, conversation_id);
        result = { checked: true };
        break;

      case 'approve_promotion':
        result = await approvePromotion(sb, body.promotion_id, body.user_id);
        break;

      case 'reject_promotion':
        result = await rejectPromotion(sb, body.promotion_id, body.user_id, body.reason);
        break;

      case 'approve_retirement':
        result = await approveRetirement(sb, body.retirement_id, body.user_id);
        break;

      case 'reject_retirement':
        await sb.from('ai_retirement_proposals').update({
          status: 'rejected', decided_by: body.user_id, decided_at: new Date().toISOString(),
        }).eq('id', body.retirement_id);
        result = { success: true };
        break;

      case 'compare':
        await compareAgents(sb, body.specialty, conversation_id);
        result = { compared: true };
        break;

      case 'report_skill':
        result = await reportNewSkill(sb, agent_id, body.skill_name, body.skill_name_ar, body.skill_category, conversation_id);
        break;

      case 'report_learning':
        result = await reportLearning(sb, agent_id, body.discovery, body.discovery_ar, body.source, conversation_id);
        break;

      case 'submit_evolution_proposal':
        result = await submitEvolutionProposal(
          sb, agent_id,
          body.proposal_type, body.title, body.title_ar,
          body.description, body.description_ar,
          body.proposed_change, body.proposed_change_ar,
          body.risk_assessment, body.risk_details, body.risk_details_ar,
          body.expected_impact, body.expected_impact_ar,
          conversation_id
        );
        break;

      case 'approve_evolution_proposal':
        result = await decideEvolutionProposal(sb, body.proposal_id, 'approved', body.user_id, body.reason);
        break;

      case 'reject_evolution_proposal':
        result = await decideEvolutionProposal(sb, body.proposal_id, 'rejected', body.user_id, body.reason);
        break;

      case 'run_cycle':
        result = await runEvolutionCycle(sb);
        break;

      default:
        result = await runEvolutionCycle(sb);
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
