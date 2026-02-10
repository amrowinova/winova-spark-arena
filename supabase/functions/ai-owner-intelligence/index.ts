import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const AI_SYSTEM_USER_ID = '00000000-0000-0000-0000-a10000000001';

// ─── Owner Context Loader ────────────────────────────
async function loadOwnerContext(sb: any): Promise<{
  constitution: Array<{ rule_key: string; rule_en: string; rule_ar: string; category: string }>;
  preferences: Array<{ preference_key: string; category: string; value: any; confidence: number }>;
  recentDecisions: Array<{ request_type: string; risk_level: string; decision: string; request_title: string; created_at: string }>;
  patterns: Array<{ pattern_key: string; conditions: any; confidence: number }>;
  corrections: Array<{ correction: string; lesson_learned: string; created_at: string }>;
}> {
  const [constitution, preferences, decisions, patterns, corrections] = await Promise.all([
    sb.from('owner_constitution').select('rule_key, rule_en, rule_ar, category').eq('is_active', true),
    sb.from('owner_preferences').select('preference_key, category, value, confidence').eq('is_active', true),
    sb.from('ceo_decision_history').select('request_type, risk_level, decision, request_title, created_at').order('created_at', { ascending: false }).limit(50),
    sb.from('ceo_decision_patterns').select('pattern_key, conditions, confidence').eq('is_active', true),
    sb.from('owner_corrections').select('correction, lesson_learned, created_at').order('created_at', { ascending: false }).limit(20),
  ]);

  return {
    constitution: constitution.data || [],
    preferences: preferences.data || [],
    recentDecisions: decisions.data || [],
    patterns: patterns.data || [],
    corrections: corrections.data || [],
  };
}

// ─── Constitution Checker ────────────────────────────
function checkConstitution(
  proposal: { title: string; description?: string; risk_level?: string; services_affected?: string[] },
  constitution: Array<{ rule_key: string; rule_en: string; rule_ar: string; category: string }>,
): { violations: Array<{ rule_key: string; rule_en: string; rule_ar: string }>; isBlocked: boolean } {
  const violations: Array<{ rule_key: string; rule_en: string; rule_ar: string }> = [];
  const text = `${proposal.title} ${proposal.description || ''}`.toLowerCase();
  const services = proposal.services_affected || [];

  // Auto-merge detection
  if (text.includes('auto merge') || text.includes('auto-merge') || text.includes('automatic merge')) {
    const rule = constitution.find(r => r.rule_key === 'NO_AUTO_MERGE');
    if (rule) violations.push(rule);
  }

  // Auto-execution of high-risk
  if ((proposal.risk_level === 'critical' || proposal.risk_level === 'high') &&
      (text.includes('auto execut') || text.includes('auto-execut') || text.includes('automatic'))) {
    const rule = constitution.find(r => r.rule_key === 'NO_AUTO_EXECUTION');
    if (rule) violations.push(rule);
  }

  // Financial safety
  const financialTerms = ['wallet', 'balance', 'transfer', 'nova', 'aura', 'escrow', 'ledger', 'payment'];
  if (financialTerms.some(t => text.includes(t)) || services.some(s => s.includes('wallet') || s.includes('payment'))) {
    if (proposal.risk_level !== 'critical' && proposal.risk_level !== 'high') {
      // Warn but don't block — just flag the finance rule
    }
  }

  return { violations, isBlocked: violations.length > 0 };
}

// ─── Similarity Engine ───────────────────────────────
function findSimilarDecisions(
  proposal: { request_type?: string; risk_level?: string; title: string },
  history: Array<{ request_type: string; risk_level: string; decision: string; request_title: string; created_at: string }>,
): Array<{ title: string; decision: string; created_at: string; similarity: string }> {
  const matches: Array<{ title: string; decision: string; created_at: string; similarity: string }> = [];
  const proposalWords = proposal.title.toLowerCase().split(/\s+/);

  for (const h of history) {
    const reasons: string[] = [];
    
    if (proposal.request_type && h.request_type === proposal.request_type) {
      reasons.push('same type');
    }
    if (proposal.risk_level && h.risk_level === proposal.risk_level) {
      reasons.push('same risk');
    }
    
    // Word overlap
    const historyWords = h.request_title.toLowerCase().split(/\s+/);
    const overlap = proposalWords.filter(w => w.length > 3 && historyWords.includes(w));
    if (overlap.length >= 2) {
      reasons.push(`shared keywords: ${overlap.join(', ')}`);
    }

    if (reasons.length > 0) {
      matches.push({
        title: h.request_title,
        decision: h.decision,
        created_at: h.created_at,
        similarity: reasons.join(' + '),
      });
    }
  }

  return matches.slice(0, 5);
}

// ─── Preference-Based Scoring ────────────────────────
function scoreWithPreferences(
  proposal: { risk_level?: string; request_type?: string },
  preferences: Array<{ preference_key: string; value: any; confidence: number }>,
  patterns: Array<{ pattern_key: string; conditions: any; confidence: number }>,
): { score: number; reasoning: string[]; reasoningAr: string[] } {
  let score = 0.5;
  const reasoning: string[] = [];
  const reasoningAr: string[] = [];

  // Risk appetite
  const riskPref = preferences.find(p => p.preference_key === 'risk_appetite');
  if (riskPref && proposal.risk_level) {
    const level = riskPref.value?.level || 'moderate';
    if (level === 'conservative' && (proposal.risk_level === 'high' || proposal.risk_level === 'critical')) {
      score -= 0.2;
      reasoning.push('Owner has conservative risk appetite — high-risk proposals scored lower');
      reasoningAr.push('المالك لديه شهية محافظة للمخاطر — المقترحات عالية المخاطر تحصل على درجة أقل');
    } else if (level === 'aggressive' && proposal.risk_level === 'low') {
      score += 0.1;
    }
  }

  // Historical pattern matching
  const riskPattern = patterns.find(p => p.pattern_key === `risk_${proposal.risk_level}_approval_rate`);
  if (riskPattern) {
    const rate = riskPattern.conditions.approval_rate;
    score = score * 0.4 + rate * 0.6;
    reasoning.push(`Historical ${proposal.risk_level}-risk approval rate: ${Math.round(rate * 100)}%`);
    reasoningAr.push(`معدل الموافقة التاريخي للمخاطر ${proposal.risk_level}: ${Math.round(rate * 100)}%`);
  }

  const typePattern = patterns.find(p => p.pattern_key === `type_${proposal.request_type}_preference`);
  if (typePattern) {
    const rate = typePattern.conditions.approval_rate;
    score = score * 0.5 + rate * 0.5;
    reasoning.push(`Type "${proposal.request_type}" has ${Math.round(rate * 100)}% approval history`);
    reasoningAr.push(`النوع "${proposal.request_type}" لديه ${Math.round(rate * 100)}% تاريخ موافقة`);
  }

  if (reasoning.length === 0) {
    reasoning.push('Insufficient historical data — using baseline scoring');
    reasoningAr.push('بيانات تاريخية غير كافية — استخدام التقييم الأساسي');
  }

  return { score: Math.max(0.05, Math.min(0.95, score)), reasoning, reasoningAr };
}

// ─── Generate Executive Brief ────────────────────────
function generateBrief(
  proposal: { title: string; title_ar?: string; description?: string; risk_level?: string; request_type?: string },
  constitution: { violations: Array<{ rule_key: string; rule_en: string; rule_ar: string }>; isBlocked: boolean },
  similar: Array<{ title: string; decision: string; similarity: string }>,
  scoring: { score: number; reasoning: string[]; reasoningAr: string[] },
): { briefEn: string; briefAr: string } {
  const lines: string[] = [];
  const linesAr: string[] = [];

  // Header
  lines.push(`🧠 **Owner Intelligence Brief**`);
  linesAr.push(`🧠 **تقرير ذكاء المالك**`);

  lines.push(`📌 ${proposal.title}`);
  linesAr.push(`📌 ${proposal.title_ar || proposal.title}`);

  // Constitution check
  if (constitution.isBlocked) {
    lines.push(`\n🚫 **BLOCKED BY CONSTITUTION**`);
    linesAr.push(`\n🚫 **محظور بموجب الدستور**`);
    for (const v of constitution.violations) {
      lines.push(`  ❌ ${v.rule_key}: ${v.rule_en}`);
      linesAr.push(`  ❌ ${v.rule_key}: ${v.rule_ar}`);
    }
  } else {
    lines.push(`\n✅ Constitution: No violations`);
    linesAr.push(`\n✅ الدستور: لا مخالفات`);
  }

  // Prediction
  const pct = Math.round(scoring.score * 100);
  const emoji = pct >= 70 ? '🟢' : pct >= 40 ? '🟡' : '🔴';
  lines.push(`\n${emoji} **Predicted Approval: ${pct}%**`);
  linesAr.push(`\n${emoji} **احتمال الموافقة: ${pct}%**`);
  for (const r of scoring.reasoning) lines.push(`  → ${r}`);
  for (const r of scoring.reasoningAr) linesAr.push(`  → ${r}`);

  // Similar decisions
  if (similar.length > 0) {
    lines.push(`\n📊 **Similar Past Decisions:**`);
    linesAr.push(`\n📊 **قرارات سابقة مشابهة:**`);
    for (const s of similar.slice(0, 3)) {
      const icon = s.decision === 'approved' ? '✅' : '❌';
      lines.push(`  ${icon} "${s.title}" → ${s.decision} (${s.similarity})`);
      linesAr.push(`  ${icon} "${s.title}" → ${s.decision} (${s.similarity})`);
    }
  } else {
    lines.push(`\n📊 No similar past decisions found`);
    linesAr.push(`\n📊 لم يتم العثور على قرارات سابقة مشابهة`);
  }

  // Recommendation
  lines.push(`\n💡 **Recommendation:** ${pct >= 70 ? 'Likely to approve — consider fast-tracking' : pct >= 40 ? 'Uncertain — requires owner review' : 'Likely to reject — review carefully'}`);
  linesAr.push(`\n💡 **التوصية:** ${pct >= 70 ? 'من المرجح الموافقة — يمكن تسريع' : pct >= 40 ? 'غير مؤكد — يتطلب مراجعة المالك' : 'من المرجح الرفض — مراجعة بعناية'}`);

  return { briefEn: lines.join('\n'), briefAr: linesAr.join('\n') };
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

// ─── Process Pending Requests ────────────────────────
async function processPendingRequests(sb: any, ownerCtx: Awaited<ReturnType<typeof loadOwnerContext>>): Promise<number> {
  const { data: pending } = await sb
    .from('ai_execution_requests')
    .select('id, title, title_ar, description, request_type, risk_level, parameters, status')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(15);

  if (!pending?.length) return 0;

  let processed = 0;
  for (const req of pending) {
    // Check if already briefed
    const { data: existingScore } = await sb
      .from('ceo_prediction_scores')
      .select('id')
      .eq('request_id', req.id)
      .limit(1);

    // Constitution check
    const constCheck = checkConstitution(
      { title: req.title, description: req.description, risk_level: req.risk_level, services_affected: req.parameters?.affected_services },
      ownerCtx.constitution,
    );

    // Auto-block if constitution violated
    if (constCheck.isBlocked) {
      await sb.from('ai_execution_requests').update({
        status: 'rejected',
        rejected_at: new Date().toISOString(),
        parameters: {
          ...req.parameters,
          auto_rejected_reason: 'Constitution violation',
          violated_rules: constCheck.violations.map(v => v.rule_key),
        },
      }).eq('id', req.id);

      const brief = generateBrief(req, constCheck, [], { score: 0, reasoning: ['Blocked by constitution'], reasoningAr: ['محظور بموجب الدستور'] });
      await postToDM(sb, brief.briefAr, 'constitution_block');

      // Log to decision history
      await sb.from('ceo_decision_history').insert({
        request_id: req.id,
        request_type: req.request_type || 'general',
        request_title: req.title,
        request_title_ar: req.title_ar,
        risk_level: req.risk_level || 'medium',
        decision: 'auto_rejected',
        decision_reason: `Constitution violation: ${constCheck.violations.map(v => v.rule_key).join(', ')}`,
        context_snapshot: { source: 'oil_constitution_check' },
      });

      processed++;
      continue;
    }

    // Similarity + scoring
    const similar = findSimilarDecisions(req, ownerCtx.recentDecisions);
    const scoring = scoreWithPreferences(req, ownerCtx.preferences, ownerCtx.patterns);
    const brief = generateBrief(req, constCheck, similar, scoring);

    // Store prediction if not exists
    if (!existingScore?.length) {
      await sb.from('ceo_prediction_scores').insert({
        request_id: req.id,
        predicted_decision: scoring.score >= 0.7 ? 'approve' : scoring.score <= 0.3 ? 'reject' : 'uncertain',
        approval_probability: scoring.score,
        reasoning: scoring.reasoning.join('. '),
        reasoning_ar: scoring.reasoningAr.join('. '),
        matching_patterns: ownerCtx.patterns.filter(p =>
          p.pattern_key.includes(req.risk_level) || p.pattern_key.includes(req.request_type)
        ).map(p => p.pattern_key),
        fast_track_eligible: scoring.score >= 0.85 && req.risk_level !== 'critical',
      });
    }

    // Post intelligence brief
    await postToDM(sb, brief.briefAr, 'intelligence_brief');
    processed++;
  }

  return processed;
}

// ─── Learning Loop: Process Corrections ──────────────
async function processCorrections(sb: any): Promise<number> {
  // Look for recently approved/rejected requests that changed from predictions
  const { data: recentDecisions } = await sb
    .from('ceo_decision_history')
    .select('request_id, request_type, risk_level, decision, created_at')
    .order('created_at', { ascending: false })
    .limit(20);

  if (!recentDecisions?.length) return 0;

  let updates = 0;
  for (const d of recentDecisions) {
    if (!d.request_id) continue;

    const { data: prediction } = await sb
      .from('ceo_prediction_scores')
      .select('id, predicted_decision, approval_probability')
      .eq('request_id', d.request_id)
      .limit(1)
      .maybeSingle();

    if (!prediction) continue;

    const actualApproved = d.decision === 'approved';
    const predictedApprove = prediction.predicted_decision === 'approve';

    // If prediction was wrong, learn from it
    if (actualApproved !== predictedApprove) {
      const direction = actualApproved ? 'more_permissive' : 'more_restrictive';
      
      // Update risk appetite preference
      const { data: riskPref } = await sb
        .from('owner_preferences')
        .select('id, value, sample_count')
        .eq('preference_key', 'risk_appetite')
        .maybeSingle();

      if (riskPref) {
        const newCount = (riskPref.sample_count || 0) + 1;
        await sb.from('owner_preferences').update({
          sample_count: newCount,
          confidence: Math.min(0.95, 0.5 + (newCount * 0.02)),
          updated_at: new Date().toISOString(),
        }).eq('id', riskPref.id);
      }

      updates++;
    }
  }

  return updates;
}

// ─── Main ────────────────────────────────────────────
async function run(sb: any): Promise<{ briefsGenerated: number; blocked: number; correctionsProcessed: number }> {
  const ownerCtx = await loadOwnerContext(sb);
  const briefsGenerated = await processPendingRequests(sb, ownerCtx);
  const correctionsProcessed = await processCorrections(sb);

  // Memory
  await sb.from('agent_memory').insert({
    agent_function: 'ai-owner-intelligence',
    memory_type: 'decision',
    content: `OIL cycle: ${briefsGenerated} briefs, ${correctionsProcessed} corrections processed. Constitution: ${ownerCtx.constitution.length} rules active. Patterns: ${ownerCtx.patterns.length}.`,
    importance: 5,
    tags: ['oil', 'owner_intelligence', 'alignment'],
  });

  return { briefsGenerated, blocked: 0, correctionsProcessed };
}

// ─── HTTP Handler ────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const t0 = Date.now();
  try {
    const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

    let body: any = {};
    try { body = await req.json(); } catch { /* empty */ }

    // Mode: context_load — returns raw owner context for other agents
    if (body.mode === 'context_load') {
      const ctx = await loadOwnerContext(sb);
      return new Response(JSON.stringify({ success: true, context: ctx }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Mode: check_proposal — validate a single proposal
    if (body.mode === 'check_proposal' && body.proposal) {
      const ctx = await loadOwnerContext(sb);
      const constCheck = checkConstitution(body.proposal, ctx.constitution);
      const similar = findSimilarDecisions(body.proposal, ctx.recentDecisions);
      const scoring = scoreWithPreferences(body.proposal, ctx.preferences, ctx.patterns);
      const brief = generateBrief(body.proposal, constCheck, similar, scoring);

      return new Response(JSON.stringify({
        success: true,
        blocked: constCheck.isBlocked,
        violations: constCheck.violations,
        similar,
        score: scoring.score,
        reasoning: scoring.reasoning,
        brief: brief.briefEn,
        brief_ar: brief.briefAr,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Default: full cycle
    const result = await run(sb);

    return new Response(JSON.stringify({
      success: true,
      ...result,
      duration_ms: Date.now() - t0,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[OIL] Error:', error);
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
