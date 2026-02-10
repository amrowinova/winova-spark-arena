import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * ═══════════════════════════════════════════════════════════════
 * CEO DECISION LEARNER v2 — Permanent Intelligence Layer
 * ═══════════════════════════════════════════════════════════════
 *
 * Continuously learns from Amro's decisions to build a predictive model:
 * - Ingests approvals, rejections, delays, modifications, corrections
 * - Detects behavioral patterns (risk tolerance, urgency bias, type preferences)
 * - Updates persistent CEO behavioral model dimensions
 * - Generates approval probability scores for pending requests
 * - Tracks prediction accuracy to improve over time
 * - Updates communication preferences based on response patterns
 *
 * Goal: Reduce CEO interruptions by 80% while improving accuracy.
 * ═══════════════════════════════════════════════════════════════
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AI_SYSTEM_USER_ID = '00000000-0000-0000-0000-a10000000001';

// ═══════════════════════════════════════════════════════
// PATTERN DETECTION (expanded)
// ═══════════════════════════════════════════════════════

interface DecisionRecord {
  request_type: string;
  risk_level: string;
  decision: string;
  urgency: string;
  services_affected: string[];
  response_time_ms: number | null;
  emotional_signal: string | null;
  was_modified: boolean;
}

function detectPatterns(decisions: DecisionRecord[]) {
  const patterns: Array<{
    key: string;
    description: string;
    descriptionAr: string;
    type: string;
    conditions: Record<string, any>;
    confidence: number;
    sampleCount: number;
  }> = [];

  if (decisions.length < 3) return patterns;

  // Pattern 1: Risk-level approval rates
  const riskGroups: Record<string, { approved: number; rejected: number; total: number }> = {};
  for (const d of decisions) {
    if (!riskGroups[d.risk_level]) riskGroups[d.risk_level] = { approved: 0, rejected: 0, total: 0 };
    riskGroups[d.risk_level].total++;
    if (d.decision === 'approved') riskGroups[d.risk_level].approved++;
    if (d.decision === 'rejected') riskGroups[d.risk_level].rejected++;
  }
  for (const [risk, stats] of Object.entries(riskGroups)) {
    if (stats.total >= 3) {
      const rate = stats.approved / stats.total;
      patterns.push({
        key: `risk_${risk}_approval_rate`,
        description: `Approval rate for ${risk}-risk items: ${Math.round(rate * 100)}% (based on ${stats.total} decisions)`,
        descriptionAr: `معدل الموافقة على العناصر ذات المخاطر ${risk}: ${Math.round(rate * 100)}% (بناءً على ${stats.total} قرار)`,
        type: 'threshold',
        conditions: { risk_level: risk, approval_rate: rate, rejection_rate: stats.rejected / stats.total },
        confidence: Math.min(0.95, 0.5 + (stats.total * 0.05)),
        sampleCount: stats.total,
      });
    }
  }

  // Pattern 2: Request-type preferences
  const typeGroups: Record<string, { approved: number; total: number }> = {};
  for (const d of decisions) {
    if (!typeGroups[d.request_type]) typeGroups[d.request_type] = { approved: 0, total: 0 };
    typeGroups[d.request_type].total++;
    if (d.decision === 'approved') typeGroups[d.request_type].approved++;
  }
  for (const [type, stats] of Object.entries(typeGroups)) {
    if (stats.total >= 2) {
      const rate = stats.approved / stats.total;
      patterns.push({
        key: `type_${type}_preference`,
        description: `Preference for "${type}" requests: ${Math.round(rate * 100)}% approval (${stats.total} decisions)`,
        descriptionAr: `تفضيل لطلبات "${type}": ${Math.round(rate * 100)}% موافقة (${stats.total} قرار)`,
        type: 'preference',
        conditions: { request_type: type, approval_rate: rate },
        confidence: Math.min(0.9, 0.4 + (stats.total * 0.06)),
        sampleCount: stats.total,
      });
    }
  }

  // Pattern 3: Urgency bias
  const urgencyGroups: Record<string, { approved: number; total: number }> = {};
  for (const d of decisions) {
    if (!urgencyGroups[d.urgency]) urgencyGroups[d.urgency] = { approved: 0, total: 0 };
    urgencyGroups[d.urgency].total++;
    if (d.decision === 'approved') urgencyGroups[d.urgency].approved++;
  }
  for (const [urgency, stats] of Object.entries(urgencyGroups)) {
    if (stats.total >= 2) {
      const rate = stats.approved / stats.total;
      patterns.push({
        key: `urgency_${urgency}_bias`,
        description: `${urgency} urgency items: ${Math.round(rate * 100)}% approval (${stats.total} decisions)`,
        descriptionAr: `عناصر بأولوية ${urgency}: ${Math.round(rate * 100)}% موافقة (${stats.total} قرار)`,
        type: 'bias',
        conditions: { urgency, approval_rate: rate },
        confidence: Math.min(0.85, 0.4 + (stats.total * 0.05)),
        sampleCount: stats.total,
      });
    }
  }

  // Pattern 4: Response speed — fast approvals vs slow rejections
  const withTiming = decisions.filter(d => d.response_time_ms && d.response_time_ms > 0);
  if (withTiming.length >= 5) {
    const approvedTimes = withTiming.filter(d => d.decision === 'approved').map(d => d.response_time_ms!);
    const rejectedTimes = withTiming.filter(d => d.decision === 'rejected').map(d => d.response_time_ms!);
    if (approvedTimes.length >= 2 && rejectedTimes.length >= 2) {
      const avgApprove = approvedTimes.reduce((a, b) => a + b, 0) / approvedTimes.length;
      const avgReject = rejectedTimes.reduce((a, b) => a + b, 0) / rejectedTimes.length;
      patterns.push({
        key: 'response_speed_pattern',
        description: `Average approval response: ${Math.round(avgApprove / 60000)}min. Average rejection: ${Math.round(avgReject / 60000)}min.`,
        descriptionAr: `متوسط وقت الموافقة: ${Math.round(avgApprove / 60000)} دقيقة. متوسط وقت الرفض: ${Math.round(avgReject / 60000)} دقيقة.`,
        type: 'timing',
        conditions: { avg_approve_ms: avgApprove, avg_reject_ms: avgReject },
        confidence: Math.min(0.8, 0.3 + (withTiming.length * 0.04)),
        sampleCount: withTiming.length,
      });
    }
  }

  // Pattern 5: Modification tendency — does CEO modify before approving?
  const modified = decisions.filter(d => d.was_modified);
  if (decisions.length >= 5) {
    const modRate = modified.length / decisions.length;
    patterns.push({
      key: 'modification_tendency',
      description: `CEO modifies ${Math.round(modRate * 100)}% of approved items before finalizing`,
      descriptionAr: `الرئيس يعدل ${Math.round(modRate * 100)}% من العناصر المعتمدة قبل الإنهاء`,
      type: 'behavior',
      conditions: { modification_rate: modRate },
      confidence: Math.min(0.85, 0.4 + (decisions.length * 0.03)),
      sampleCount: decisions.length,
    });
  }

  return patterns;
}

// ═══════════════════════════════════════════════════════
// BEHAVIORAL MODEL UPDATER
// ═══════════════════════════════════════════════════════

async function updateBehavioralModel(sb: any, decisions: DecisionRecord[], patterns: any[]) {
  const now = new Date().toISOString();

  // Risk tolerance: based on high-risk approval rate
  const highRiskPattern = patterns.find((p: any) => p.key === 'risk_high_approval_rate' || p.key === 'risk_critical_approval_rate');
  if (highRiskPattern) {
    const riskTolerance = highRiskPattern.conditions.approval_rate;
    await sb.from('ceo_behavioral_model').update({
      current_value: Math.round(riskTolerance * 100) / 100,
      confidence: highRiskPattern.confidence,
      sample_count: highRiskPattern.sampleCount,
      last_updated_at: now,
    }).eq('dimension', 'risk_tolerance');
  }

  // Speed preference: based on response times
  const speedPattern = patterns.find((p: any) => p.key === 'response_speed_pattern');
  if (speedPattern) {
    // Fast responder = high speed preference (< 30min avg = 0.8+)
    const avgMs = speedPattern.conditions.avg_approve_ms;
    const speedValue = Math.max(0.1, Math.min(0.95, 1 - (avgMs / (2 * 3600000)))); // normalize to 2h scale
    await sb.from('ceo_behavioral_model').update({
      current_value: Math.round(speedValue * 100) / 100,
      confidence: speedPattern.confidence,
      sample_count: speedPattern.sampleCount,
      last_updated_at: now,
    }).eq('dimension', 'speed_preference');
  }

  // Delegation level: based on modification rate + overall approval rate
  const modPattern = patterns.find((p: any) => p.key === 'modification_tendency');
  if (modPattern) {
    // High modification = low delegation (wants control)
    const delegationValue = Math.max(0.1, 1 - modPattern.conditions.modification_rate);
    await sb.from('ceo_behavioral_model').update({
      current_value: Math.round(delegationValue * 100) / 100,
      confidence: modPattern.confidence,
      sample_count: modPattern.sampleCount,
      last_updated_at: now,
    }).eq('dimension', 'delegation_level');
  }

  // Financial caution: based on financial-type rejection rate
  const finPattern = patterns.find((p: any) => p.key === 'type_financial_preference' || p.key === 'type_finance_preference');
  if (finPattern) {
    const caution = 1 - finPattern.conditions.approval_rate; // higher rejection = higher caution
    await sb.from('ceo_behavioral_model').update({
      current_value: Math.max(0.5, Math.round(caution * 100) / 100), // never below 0.5 for safety
      confidence: finPattern.confidence,
      sample_count: finPattern.sampleCount,
      last_updated_at: now,
    }).eq('dimension', 'financial_caution');
  }
}

// ═══════════════════════════════════════════════════════
// PREDICTION SCORING (enhanced)
// ═══════════════════════════════════════════════════════

function predictApproval(
  request: { request_type: string; risk_level: string; urgency: string; services_affected: string[] },
  patterns: Array<{ pattern_key: string; conditions: any; confidence: number }>,
  behavioralModel: Array<{ dimension: string; current_value: number; confidence: number }>,
): {
  probability: number;
  reasoning: string;
  reasoningAr: string;
  matchingPatterns: string[];
  predictedDecision: string;
  routingAction: 'auto_proceed' | 'recommend' | 'escalate';
  confidence: number;
} {
  let score = 0.5;
  const matchingPatterns: string[] = [];
  const reasons: string[] = [];
  const reasonsAr: string[] = [];
  let totalWeight = 0;

  // Apply risk pattern (weight: 0.35)
  const riskPattern = patterns.find(p => p.pattern_key === `risk_${request.risk_level}_approval_rate`);
  if (riskPattern) {
    const rate = riskPattern.conditions.approval_rate;
    score = score * 0.65 + rate * 0.35;
    totalWeight += 0.35;
    matchingPatterns.push(riskPattern.pattern_key);
    reasons.push(`${request.risk_level}-risk items have ${Math.round(rate * 100)}% historical approval`);
    reasonsAr.push(`العناصر ذات المخاطر ${request.risk_level} لديها ${Math.round(rate * 100)}% موافقة تاريخية`);
  }

  // Apply type pattern (weight: 0.3)
  const typePattern = patterns.find(p => p.pattern_key === `type_${request.request_type}_preference`);
  if (typePattern) {
    const rate = typePattern.conditions.approval_rate;
    score = score * 0.7 + rate * 0.3;
    totalWeight += 0.3;
    matchingPatterns.push(typePattern.pattern_key);
    reasons.push(`"${request.request_type}" type approved ${Math.round(rate * 100)}% of the time`);
    reasonsAr.push(`نوع "${request.request_type}" موافق عليه ${Math.round(rate * 100)}% من الوقت`);
  }

  // Apply urgency pattern (weight: 0.2)
  const urgencyPattern = patterns.find(p => p.pattern_key === `urgency_${request.urgency}_bias`);
  if (urgencyPattern) {
    const rate = urgencyPattern.conditions.approval_rate;
    score = score * 0.8 + rate * 0.2;
    totalWeight += 0.2;
    matchingPatterns.push(urgencyPattern.pattern_key);
  }

  // Apply behavioral model adjustments (weight: 0.15)
  const riskTolerance = behavioralModel.find(b => b.dimension === 'risk_tolerance');
  const financialCaution = behavioralModel.find(b => b.dimension === 'financial_caution');

  if (riskTolerance && request.risk_level === 'high') {
    score *= (0.5 + riskTolerance.current_value * 0.5);
    totalWeight += 0.1;
  }

  // Financial requests get extra caution from model
  const isFinancial = request.request_type?.includes('financ') || 
    request.services_affected?.some(s => s.includes('wallet') || s.includes('payment') || s.includes('balance'));
  if (isFinancial && financialCaution) {
    score *= (1 - financialCaution.current_value * 0.3); // reduce probability for high caution
    reasons.push('Financial operation — extra caution applied per your preference model');
    reasonsAr.push('عملية مالية — حذر إضافي مطبق حسب نموذج تفضيلاتك');
  }

  if (reasons.length === 0) {
    reasons.push('Insufficient decision history — using base probability');
    reasonsAr.push('سجل قرارات غير كافٍ — استخدام الاحتمال الأساسي');
  }

  const clampedScore = Math.max(0.05, Math.min(0.95, score));
  const predictedDecision = clampedScore >= 0.7 ? 'approve' : clampedScore <= 0.3 ? 'reject' : 'uncertain';

  // Determine routing action based on PREDICTION_ROUTING governance rule
  let routingAction: 'auto_proceed' | 'recommend' | 'escalate';
  if (clampedScore >= 0.85 && request.risk_level !== 'critical' && !isFinancial) {
    routingAction = 'auto_proceed';
  } else if (clampedScore >= 0.5) {
    routingAction = 'recommend';
  } else {
    routingAction = 'escalate';
  }

  // Overall confidence = pattern coverage + behavioral model confidence
  const overallConfidence = Math.min(0.95, totalWeight > 0 ? totalWeight + 0.2 : 0.3);

  return {
    probability: Math.round(clampedScore * 100) / 100,
    reasoning: reasons.join('. '),
    reasoningAr: reasonsAr.join('. '),
    matchingPatterns,
    predictedDecision,
    routingAction,
    confidence: Math.round(overallConfidence * 100) / 100,
  };
}

// ═══════════════════════════════════════════════════════
// ACCURACY TRACKER — validates past predictions
// ═══════════════════════════════════════════════════════

async function validatePastPredictions(sb: any): Promise<{ validated: number; accuracy: number }> {
  // Find decided requests that have predictions
  const { data: decided } = await sb
    .from('ai_execution_requests')
    .select('id, status')
    .in('status', ['approved', 'rejected'])
    .order('created_at', { ascending: false })
    .limit(50);

  if (!decided?.length) return { validated: 0, accuracy: 0 };

  let validated = 0;
  let correct = 0;

  for (const req of decided) {
    const { data: prediction } = await sb
      .from('ceo_prediction_scores')
      .select('id, predicted_decision, approval_probability')
      .eq('request_id', req.id)
      .limit(1);

    if (!prediction?.length) continue;

    const pred = prediction[0];
    const actualApproved = req.status === 'approved';
    const predictedApprove = pred.predicted_decision === 'approve' || pred.approval_probability >= 0.5;
    const wasCorrect = actualApproved === predictedApprove;

    // Update decision history with prediction accuracy
    await sb.from('ceo_decision_history')
      .update({
        prediction_was_correct: wasCorrect,
        predicted_probability: pred.approval_probability,
      })
      .eq('request_id', req.id);

    if (wasCorrect) correct++;
    validated++;
  }

  return {
    validated,
    accuracy: validated > 0 ? Math.round((correct / validated) * 100) : 0,
  };
}

// ═══════════════════════════════════════════════════════
// DM HELPER (CEO language)
// ═══════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════
// MAIN RUN
// ═══════════════════════════════════════════════════════

async function run(sb: any): Promise<{
  decisionsIngested: number;
  patternsUpdated: number;
  predictionsGenerated: number;
  modelDimensionsUpdated: number;
  predictionAccuracy: number;
  autoProceeded: number;
}> {
  const result = {
    decisionsIngested: 0, patternsUpdated: 0, predictionsGenerated: 0,
    modelDimensionsUpdated: 0, predictionAccuracy: 0, autoProceeded: 0,
  };

  // STEP 1: Ingest new decisions
  const { data: recentRequests } = await sb
    .from('ai_execution_requests')
    .select('id, title, title_ar, request_type, risk_level, status, parameters, approved_at, rejected_at, approved_by, created_at')
    .in('status', ['approved', 'rejected'])
    .order('created_at', { ascending: false })
    .limit(100);

  if (recentRequests?.length) {
    for (const req of recentRequests) {
      const { data: existing } = await sb
        .from('ceo_decision_history')
        .select('id')
        .eq('request_id', req.id)
        .limit(1);
      if (existing?.length) continue;

      const decision = req.status === 'approved' ? 'approved' : 'rejected';
      const decisionTime = req.approved_at || req.rejected_at;
      const responseTime = decisionTime
        ? new Date(decisionTime).getTime() - new Date(req.created_at).getTime()
        : null;

      // Detect emotional signals from response speed + modifications
      let emotionalSignal: string | null = null;
      if (responseTime) {
        if (responseTime < 60000) emotionalSignal = 'immediate'; // < 1min = strong opinion
        else if (responseTime < 300000) emotionalSignal = 'confident'; // < 5min
        else if (responseTime > 86400000) emotionalSignal = 'hesitant'; // > 24h = reluctant
      }

      await sb.from('ceo_decision_history').insert({
        request_id: req.id,
        request_type: req.request_type || 'general',
        request_title: req.title,
        request_title_ar: req.title_ar,
        risk_level: req.risk_level || 'medium',
        urgency: req.parameters?.urgency || 'normal',
        services_affected: req.parameters?.affected_services || [],
        suggested_fix: req.parameters?.suggested_fix,
        decision,
        response_time_ms: responseTime,
        emotional_signal: emotionalSignal,
        was_modified: req.parameters?.was_modified || false,
        context_snapshot: { source: 'ai_execution_requests', parameters: req.parameters },
      });
      result.decisionsIngested++;
    }
  }

  // STEP 2: Detect patterns from full history
  const { data: allHistory } = await sb
    .from('ceo_decision_history')
    .select('request_type, risk_level, decision, urgency, services_affected, response_time_ms, emotional_signal, was_modified')
    .order('created_at', { ascending: false })
    .limit(500);

  if (allHistory?.length) {
    const patterns = detectPatterns(allHistory);
    for (const p of patterns) {
      await sb.from('ceo_decision_patterns').upsert({
        pattern_key: p.key,
        pattern_description: p.description,
        pattern_description_ar: p.descriptionAr,
        pattern_type: p.type,
        conditions: p.conditions,
        confidence: p.confidence,
        sample_count: p.sampleCount,
        last_validated_at: new Date().toISOString(),
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'pattern_key' });
      result.patternsUpdated++;
    }

    // STEP 3: Update behavioral model
    await updateBehavioralModel(sb, allHistory, patterns);
    result.modelDimensionsUpdated = patterns.length;
  }

  // STEP 4: Validate past predictions (accuracy tracking)
  const accuracy = await validatePastPredictions(sb);
  result.predictionAccuracy = accuracy.accuracy;

  // STEP 5: Score pending requests with routing
  const { data: pendingRequests } = await sb
    .from('ai_execution_requests')
    .select('id, title, title_ar, request_type, risk_level, parameters')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(20);

  if (pendingRequests?.length) {
    const [{ data: activePatterns }, { data: behavioralModel }] = await Promise.all([
      sb.from('ceo_decision_patterns').select('pattern_key, conditions, confidence').eq('is_active', true),
      sb.from('ceo_behavioral_model').select('dimension, current_value, confidence'),
    ]);

    for (const req of pendingRequests) {
      const { data: existingScore } = await sb
        .from('ceo_prediction_scores')
        .select('id')
        .eq('request_id', req.id)
        .limit(1);
      if (existingScore?.length) continue;

      const prediction = predictApproval(
        {
          request_type: req.request_type || 'general',
          risk_level: req.risk_level || 'medium',
          urgency: req.parameters?.urgency || 'normal',
          services_affected: req.parameters?.affected_services || [],
        },
        activePatterns || [],
        behavioralModel || [],
      );

      await sb.from('ceo_prediction_scores').insert({
        request_id: req.id,
        predicted_decision: prediction.predictedDecision,
        approval_probability: prediction.probability,
        reasoning: prediction.reasoning,
        reasoning_ar: prediction.reasoningAr,
        matching_patterns: prediction.matchingPatterns,
        fast_track_eligible: prediction.routingAction === 'auto_proceed',
      });
      result.predictionsGenerated++;

      // Route based on prediction
      if (prediction.routingAction === 'auto_proceed') {
        // Auto-approve with notification (non-financial, non-critical, high confidence)
        await sb.from('ai_execution_requests')
          .update({ status: 'approved', approved_at: new Date().toISOString() })
          .eq('id', req.id);

        const msg = `✅ **تمت الموافقة التلقائية**\n📌 ${req.title_ar || req.title}\n📊 الثقة: ${Math.round(prediction.probability * 100)}%\n🔍 ${prediction.reasoningAr}\n\n_تمت الموافقة تلقائياً بناءً على نموذج تفضيلاتك. يمكنك التراجع في أي وقت._`;
        await postToDM(sb, msg, 'auto_approval');
        result.autoProceeded++;
      } else if (prediction.routingAction === 'escalate') {
        // Escalate — needs CEO attention
        const msg = `🔴 **يحتاج قرارك**\n📌 ${req.title_ar || req.title}\n📊 احتمال الموافقة: ${Math.round(prediction.probability * 100)}% (منخفض)\n🔍 ${prediction.reasoningAr}\n⚡ المخاطر: ${req.risk_level}\n\n_هذا الطلب لا يتطابق مع أنماط قراراتك السابقة. يحتاج مراجعتك._`;
        await postToDM(sb, msg, 'escalation');
      }
      // 'recommend' items are shown in the next Commander briefing naturally
    }
  }

  // STEP 6: CEO-language summary (only if meaningful changes)
  if (result.decisionsIngested > 0 || result.autoProceeded > 0 || result.predictionsGenerated > 0) {
    const summaryParts: string[] = [`🧠 **تحديث نموذج القرارات**`];
    if (result.decisionsIngested > 0) summaryParts.push(`📥 تم تسجيل ${result.decisionsIngested} قرار جديد في نموذج تفضيلاتك`);
    if (result.patternsUpdated > 0) summaryParts.push(`📐 تم تحديث ${result.patternsUpdated} نمط سلوكي`);
    if (result.autoProceeded > 0) summaryParts.push(`✅ تمت الموافقة التلقائية على ${result.autoProceeded} طلب منخفض المخاطر`);
    if (accuracy.validated > 0) summaryParts.push(`🎯 دقة التوقعات: ${result.predictionAccuracy}% (${accuracy.validated} توقع تم التحقق منه)`);

    // Only notify CEO if there were auto-approvals (they should know)
    if (result.autoProceeded > 0) {
      await postToDM(sb, summaryParts.join('\n'), 'learning_report');
    }
  }

  // ═══ INTELLIGENCE METRICS ═══
  await computeAndStoreIntelligenceMetrics(sb, result);

  // ═══ CAPTURE LEARNING SIGNALS ═══
  await captureLearningSignals(sb);

  // Memory
  await sb.from('agent_memory').insert({
    agent_function: 'ai-decision-learner',
    memory_type: 'decision',
    content: `Learning cycle: decisions=${result.decisionsIngested}, patterns=${result.patternsUpdated}, predictions=${result.predictionsGenerated}, auto_approved=${result.autoProceeded}, accuracy=${result.predictionAccuracy}%`,
    importance: result.autoProceeded > 0 ? 8 : 5,
    tags: ['decision_learning', 'ceo_alignment', 'prediction'],
  });

  return result;
}

// ═══════════════════════════════════════════════════════
// INTELLIGENCE METRICS COMPUTATION
// ═══════════════════════════════════════════════════════

async function computeAndStoreIntelligenceMetrics(sb: any, cycleResult: any) {
  const today = new Date().toISOString().split('T')[0];

  // Gather all verified predictions
  const { data: verifiedPredictions } = await sb
    .from('ceo_decision_history')
    .select('prediction_was_correct, predicted_probability')
    .not('prediction_was_correct', 'is', null)
    .limit(500);

  const verified = verifiedPredictions || [];
  const correctPredictions = verified.filter((v: any) => v.prediction_was_correct).length;
  const totalPredictions = verified.length;
  const predictionAccuracy = totalPredictions > 0 ? Math.round((correctPredictions / totalPredictions) * 100) : 0;

  // Confidence vs correctness: avg confidence of wrong predictions (lower = better calibration)
  const wrongPredictions = verified.filter((v: any) => !v.prediction_was_correct && v.predicted_probability);
  const avgWrongConfidence = wrongPredictions.length > 0
    ? wrongPredictions.reduce((sum: number, v: any) => sum + (v.predicted_probability || 0.5), 0) / wrongPredictions.length
    : 0;
  const confidenceVsCorrectness = wrongPredictions.length > 0 ? Math.round((1 - avgWrongConfidence) * 100) : 100;

  // Reversal rate: auto-approved items that were later overridden
  const { data: autoApproved } = await sb
    .from('ai_execution_requests')
    .select('id, status')
    .eq('auto_approved', true)
    .limit(200);
  const totalAuto = (autoApproved || []).length;
  const reversedAuto = (autoApproved || []).filter((a: any) => a.status === 'rejected' || a.status === 'reversed').length;
  const reversalRate = totalAuto > 0 ? Math.round((reversedAuto / totalAuto) * 100) : 0;

  // Auto-approval success rate
  const successfulAuto = totalAuto - reversedAuto;
  const autoSuccessRate = totalAuto > 0 ? Math.round((successfulAuto / totalAuto) * 100) : 100;

  // Count escalations and ignored items
  const { count: escalationCount } = await sb
    .from('learning_signals')
    .select('id', { count: 'exact', head: true })
    .eq('signal_type', 'override');
  const { count: ignoredCount } = await sb
    .from('learning_signals')
    .select('id', { count: 'exact', head: true })
    .eq('signal_type', 'ignored');

  // Top mistakes: patterns where predictions were consistently wrong
  const { data: patterns } = await sb
    .from('ceo_decision_patterns')
    .select('pattern_key, conditions, confidence')
    .eq('is_active', true)
    .order('confidence', { ascending: true })
    .limit(5);

  const topMistakes = (patterns || [])
    .filter((p: any) => p.confidence < 0.5)
    .map((p: any) => ({ pattern: p.pattern_key, confidence: p.confidence }));

  // Misunderstood areas: behavioral model dimensions with low confidence
  const { data: behavModel } = await sb
    .from('ceo_behavioral_model')
    .select('dimension, current_value, confidence')
    .order('confidence', { ascending: true })
    .limit(5);

  const misunderstoodAreas = (behavModel || [])
    .filter((b: any) => b.confidence < 0.5)
    .map((b: any) => ({ area: b.dimension, confidence: b.confidence, value: b.current_value }));

  // Upsert daily metrics
  await sb.from('intelligence_metrics').upsert({
    metric_date: today,
    prediction_accuracy: predictionAccuracy,
    confidence_vs_correctness: confidenceVsCorrectness,
    reversal_rate: reversalRate,
    auto_approval_success_rate: autoSuccessRate,
    total_predictions: totalPredictions,
    correct_predictions: correctPredictions,
    total_auto_actions: totalAuto,
    successful_auto_actions: successfulAuto,
    total_reversals: reversedAuto,
    total_escalations: escalationCount || 0,
    total_ignored: ignoredCount || 0,
    top_mistakes: topMistakes,
    misunderstood_areas: misunderstoodAreas,
  }, { onConflict: 'metric_date' });
}

// ═══════════════════════════════════════════════════════
// LEARNING SIGNAL CAPTURE (all 7 types)
// ═══════════════════════════════════════════════════════

async function captureLearningSignals(sb: any) {
  const since = new Date(Date.now() - 6 * 3600000).toISOString(); // last 6h

  // 1. Approvals
  const { data: approvals } = await sb
    .from('ai_execution_requests')
    .select('id, title, risk_level, approved_at')
    .eq('status', 'approved')
    .gte('approved_at', since)
    .limit(50);
  for (const a of (approvals || [])) {
    await sb.from('learning_signals').upsert({
      signal_type: 'approval', source_entity: 'ai_execution_requests', source_id: a.id,
      context: { title: a.title, risk_level: a.risk_level }, weight: 1.0,
    }, { onConflict: 'signal_type,source_id', ignoreDuplicates: true }).catch(() => {});
  }

  // 2. Rejections
  const { data: rejections } = await sb
    .from('ai_execution_requests')
    .select('id, title, risk_level, rejected_at')
    .eq('status', 'rejected')
    .gte('rejected_at', since)
    .limit(50);
  for (const r of (rejections || [])) {
    await sb.from('learning_signals').upsert({
      signal_type: 'rejection', source_entity: 'ai_execution_requests', source_id: r.id,
      context: { title: r.title, risk_level: r.risk_level }, weight: 1.5,
    }, { onConflict: 'signal_type,source_id', ignoreDuplicates: true }).catch(() => {});
  }

  // 3. Edits (proposals that were modified)
  const { data: edited } = await sb
    .from('ai_proposals')
    .select('id, title')
    .eq('status', 'approved')
    .gte('updated_at', since)
    .limit(50);
  // Note: edits have higher learning weight — CEO corrected the proposal
  for (const e of (edited || [])) {
    await sb.from('learning_signals').insert({
      signal_type: 'edit', source_entity: 'ai_proposals', source_id: e.id,
      context: { title: e.title }, weight: 2.0,
    }).catch(() => {});
  }

  // 4. Delays (pending for >24h = signal of hesitation)
  const dayAgo = new Date(Date.now() - 86400000).toISOString();
  const { data: delayed } = await sb
    .from('ai_execution_requests')
    .select('id, title')
    .eq('status', 'pending')
    .lte('created_at', dayAgo)
    .limit(20);
  for (const d of (delayed || [])) {
    await sb.from('learning_signals').insert({
      signal_type: 'delay', source_entity: 'ai_execution_requests', source_id: d.id,
      context: { title: d.title }, weight: 0.8,
    }).catch(() => {});
  }

  // 5-7: Overrides, reversals, ignored — tracked via knowledge_decisions
  const { data: decisions } = await sb
    .from('knowledge_decisions')
    .select('id, decision_type, context')
    .gte('created_at', since)
    .limit(50);
  for (const dec of (decisions || [])) {
    let signalType: string | null = null;
    if (dec.decision_type === 'override') signalType = 'override';
    else if (dec.decision_type === 'reversal') signalType = 'reversal';
    else if (dec.decision_type === 'ignored') signalType = 'ignored';
    if (signalType) {
      await sb.from('learning_signals').insert({
        signal_type: signalType, source_entity: 'knowledge_decisions', source_id: dec.id,
        context: dec.context || {}, weight: signalType === 'reversal' ? 2.5 : 1.0,
      }).catch(() => {});
    }
  }
}

// ═══════════════════════════════════════════════════════
// HTTP HANDLER
// ═══════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const t0 = Date.now();
  try {
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const result = await run(sb);

    return new Response(JSON.stringify({
      success: true,
      ...result,
      duration_ms: Date.now() - t0,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Decision Learner v2] Error:', error);
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
