import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const AI_SYSTEM_USER_ID = '00000000-0000-0000-0000-a10000000001';

interface DecisionRecord {
  request_type: string;
  risk_level: string;
  decision: string;
  urgency: string;
  services_affected: string[];
}

// ─── Pattern Detection ───────────────────────────────
function detectPatterns(decisions: DecisionRecord[]): Array<{
  key: string;
  description: string;
  descriptionAr: string;
  type: string;
  conditions: Record<string, any>;
  confidence: number;
  sampleCount: number;
}> {
  const patterns: ReturnType<typeof detectPatterns> = [];
  if (decisions.length < 3) return patterns;

  // Pattern 1: Risk-level approval rates
  const riskGroups: Record<string, { approved: number; total: number }> = {};
  for (const d of decisions) {
    if (!riskGroups[d.risk_level]) riskGroups[d.risk_level] = { approved: 0, total: 0 };
    riskGroups[d.risk_level].total++;
    if (d.decision === 'approved') riskGroups[d.risk_level].approved++;
  }
  for (const [risk, stats] of Object.entries(riskGroups)) {
    if (stats.total >= 3) {
      const rate = stats.approved / stats.total;
      patterns.push({
        key: `risk_${risk}_approval_rate`,
        description: `CEO approves ${Math.round(rate * 100)}% of ${risk}-risk requests (n=${stats.total})`,
        descriptionAr: `المدير يوافق على ${Math.round(rate * 100)}% من الطلبات ذات المخاطر ${risk} (ن=${stats.total})`,
        type: 'threshold',
        conditions: { risk_level: risk, approval_rate: rate },
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
        description: `CEO approval rate for "${type}": ${Math.round(rate * 100)}% (n=${stats.total})`,
        descriptionAr: `معدل موافقة المدير على "${type}": ${Math.round(rate * 100)}% (ن=${stats.total})`,
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
        description: `CEO approves ${Math.round(rate * 100)}% of ${urgency}-urgency items (n=${stats.total})`,
        descriptionAr: `المدير يوافق على ${Math.round(rate * 100)}% من العناصر ذات الأولوية ${urgency} (ن=${stats.total})`,
        type: 'bias',
        conditions: { urgency, approval_rate: rate },
        confidence: Math.min(0.85, 0.4 + (stats.total * 0.05)),
        sampleCount: stats.total,
      });
    }
  }

  return patterns;
}

// ─── Prediction Scoring ──────────────────────────────
function predictApproval(
  request: { request_type: string; risk_level: string; urgency: string; services_affected: string[] },
  patterns: Array<{ pattern_key: string; conditions: any; confidence: number }>,
  history: DecisionRecord[],
): { probability: number; reasoning: string; reasoningAr: string; matchingPatterns: string[]; predictedDecision: string; similarIds: string[] } {
  let score = 0.5; // base
  const matchingPatterns: string[] = [];
  const reasons: string[] = [];
  const reasonsAr: string[] = [];

  // Apply risk pattern
  const riskPattern = patterns.find(p => p.pattern_key === `risk_${request.risk_level}_approval_rate`);
  if (riskPattern) {
    const rate = riskPattern.conditions.approval_rate;
    score = score * 0.4 + rate * 0.6;
    matchingPatterns.push(riskPattern.pattern_key);
    reasons.push(`Risk "${request.risk_level}" has ${Math.round(rate * 100)}% historical approval`);
    reasonsAr.push(`المخاطر "${request.risk_level}" لديها ${Math.round(rate * 100)}% موافقة تاريخية`);
  }

  // Apply type pattern
  const typePattern = patterns.find(p => p.pattern_key === `type_${request.request_type}_preference`);
  if (typePattern) {
    const rate = typePattern.conditions.approval_rate;
    score = score * 0.5 + rate * 0.5;
    matchingPatterns.push(typePattern.pattern_key);
    reasons.push(`Type "${request.request_type}" approved ${Math.round(rate * 100)}% historically`);
    reasonsAr.push(`النوع "${request.request_type}" موافق عليه ${Math.round(rate * 100)}% تاريخياً`);
  }

  // Apply urgency pattern
  const urgencyPattern = patterns.find(p => p.pattern_key === `urgency_${request.urgency}_bias`);
  if (urgencyPattern) {
    const rate = urgencyPattern.conditions.approval_rate;
    score = score * 0.7 + rate * 0.3;
    matchingPatterns.push(urgencyPattern.pattern_key);
  }

  // Find similar past decisions
  const similar = history.filter(h =>
    h.request_type === request.request_type || h.risk_level === request.risk_level
  ).slice(0, 5);

  if (reasons.length === 0) {
    reasons.push('Insufficient decision history — using base probability');
    reasonsAr.push('سجل قرارات غير كافٍ — استخدام الاحتمال الأساسي');
  }

  const clampedScore = Math.max(0.05, Math.min(0.95, score));
  const predictedDecision = clampedScore >= 0.7 ? 'approve' : clampedScore <= 0.3 ? 'reject' : 'uncertain';

  return {
    probability: Math.round(clampedScore * 100) / 100,
    reasoning: reasons.join('. '),
    reasoningAr: reasonsAr.join('. '),
    matchingPatterns,
    predictedDecision,
    similarIds: [], // filled from DB ids
  };
}

// ─── DM Helper ───────────────────────────────────────
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

// ─── Main Logic ──────────────────────────────────────
async function run(sb: any): Promise<{ patternsUpdated: number; predictionsGenerated: number; decisionsIngested: number }> {
  const result = { patternsUpdated: 0, predictionsGenerated: 0, decisionsIngested: 0 };

  // STEP 1: Ingest recent decisions from execution requests
  const { data: recentRequests } = await sb
    .from('ai_execution_requests')
    .select('id, title, title_ar, request_type, risk_level, status, parameters, approved_at, rejected_at, approved_by, created_at')
    .in('status', ['approved', 'rejected'])
    .order('created_at', { ascending: false })
    .limit(100);

  if (recentRequests?.length) {
    for (const req of recentRequests) {
      // Check if already ingested
      const { data: existing } = await sb
        .from('ceo_decision_history')
        .select('id')
        .eq('request_id', req.id)
        .limit(1);

      if (existing?.length) continue;

      const decision = req.status === 'approved' ? 'approved' : 'rejected';
      const responseTime = req.approved_at || req.rejected_at
        ? new Date(req.approved_at || req.rejected_at).getTime() - new Date(req.created_at).getTime()
        : null;

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
        context_snapshot: { source: 'ai_execution_requests', parameters: req.parameters },
      });
      result.decisionsIngested++;
    }
  }

  // STEP 2: Detect patterns from all history
  const { data: allHistory } = await sb
    .from('ceo_decision_history')
    .select('request_type, risk_level, decision, urgency, services_affected')
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
  }

  // STEP 3: Score pending requests
  const { data: pendingRequests } = await sb
    .from('ai_execution_requests')
    .select('id, title, title_ar, request_type, risk_level, parameters')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(20);

  if (pendingRequests?.length) {
    const { data: activePatterns } = await sb
      .from('ceo_decision_patterns')
      .select('pattern_key, conditions, confidence')
      .eq('is_active', true);

    for (const req of pendingRequests) {
      // Skip if already scored
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
        allHistory || [],
      );

      await sb.from('ceo_prediction_scores').insert({
        request_id: req.id,
        predicted_decision: prediction.predictedDecision,
        approval_probability: prediction.probability,
        reasoning: prediction.reasoning,
        reasoning_ar: prediction.reasoningAr,
        matching_patterns: prediction.matchingPatterns,
        fast_track_eligible: prediction.probability >= 0.85 && req.risk_level !== 'critical',
      });

      result.predictionsGenerated++;

      // Post to DM for fast-track candidates
      if (prediction.probability >= 0.85 && req.risk_level !== 'critical') {
        const msg = [
          `🎯 **طلب مرشح للموافقة السريعة**`,
          `📌 ${req.title_ar || req.title}`,
          `📊 احتمال الموافقة: ${Math.round(prediction.probability * 100)}%`,
          `🔍 ${prediction.reasoningAr}`,
          `⚡ المخاطر: ${req.risk_level}`,
          `✅ مؤهل للمسار السريع`,
        ].join('\n');
        await postToDM(sb, msg, 'prediction');
      }
    }
  }

  // STEP 4: Post summary
  if (result.decisionsIngested > 0 || result.predictionsGenerated > 0) {
    const summary = [
      `🧠 **محرك تعلم القرارات**`,
      `📥 قرارات جديدة مسجلة: ${result.decisionsIngested}`,
      `🔮 توقعات ولّدت: ${result.predictionsGenerated}`,
      `📐 أنماط محدّثة: ${result.patternsUpdated}`,
      `📊 إجمالي السجل: ${allHistory?.length || 0} قرار`,
    ].join('\n');
    await postToDM(sb, summary, 'learning_report');
  }

  // Memory
  await sb.from('agent_memory').insert({
    agent_function: 'ai-decision-learner',
    memory_type: 'decision',
    content: `Decision learner cycle: ingested=${result.decisionsIngested}, patterns=${result.patternsUpdated}, predictions=${result.predictionsGenerated}`,
    importance: 5,
    tags: ['decision_learning', 'ceo_alignment'],
  });

  return result;
}

// ─── HTTP Handler ────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const t0 = Date.now();
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY);
    const result = await run(sb);

    return new Response(JSON.stringify({
      success: true,
      ...result,
      duration_ms: Date.now() - t0,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Decision Learner] Error:', error);
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
