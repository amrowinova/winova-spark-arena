import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AI_SYSTEM_USER_ID = '00000000-0000-0000-0000-a10000000001';

// ─── Quality Gate ────────────────────────────────────
// An EUL report is INVALID if any field is a raw operational log
const BANNED_PHRASES = [
  'scan completed',
  'agent executed',
  'rows affected',
  'query returned',
  'function invoked',
  'pipeline finished',
  'job ran successfully',
  'cron triggered',
  'SELECT ',
  'INSERT ',
  'UPDATE ',
  'duration_ms',
  'status: success',
  'status: failed',
];

function validateCognitiveQuality(report: {
  patterns_discovered: string;
  owner_model_changes: string;
  future_decision_impact: string;
  risk_delta: string;
  executive_summary: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const fields = [
    { name: 'patterns_discovered', value: report.patterns_discovered },
    { name: 'owner_model_changes', value: report.owner_model_changes },
    { name: 'future_decision_impact', value: report.future_decision_impact },
    { name: 'risk_delta', value: report.risk_delta },
    { name: 'executive_summary', value: report.executive_summary },
  ];

  for (const field of fields) {
    if (!field.value || field.value.length < 10) {
      errors.push(`${field.name}: too short or empty — must contain cognitive insight`);
    }
    const lower = field.value?.toLowerCase() || '';
    for (const phrase of BANNED_PHRASES) {
      if (lower.includes(phrase.toLowerCase())) {
        errors.push(`${field.name}: contains operational jargon "${phrase}" — rewrite in executive language`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

// ─── Generate EUL via LLM ────────────────────────────
async function generateEUL(
  agentFunction: string,
  runId: string,
  triggerType: string,
  rawOutput: any,
  ownerContext: any,
): Promise<any> {
  const AI_GATEWAY = Deno.env.get('AI_GATEWAY_URL') || `${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-gateway`;

  const systemPrompt = `You are the Executive Understanding Layer (EUL) for WINOVA.
Your job: translate raw agent outputs into cognitive insights for the CEO.

RULES:
- NEVER use database terms, table names, column names, SQL, or technical pipeline steps
- NEVER say "scan completed" or "agent executed" — these are banned
- Speak as if briefing a CEO who controls a fintech platform
- Every response must answer 4 questions:
  1. What NEW PATTERNS did we discover? (behavioral, financial, operational)
  2. What changed about the OWNER MODEL? (risk appetite, preferences, decision patterns)
  3. What DECISIONS will be different NEXT TIME because of this run?
  4. Were any RISKS reduced or increased?

OUTPUT FORMAT (JSON):
{
  "patterns_discovered": "...",
  "owner_model_changes": "...",
  "future_decision_impact": "...",
  "risk_delta": "...",
  "executive_summary": "One paragraph CEO briefing",
  "executive_summary_ar": "Arabic version",
  "confidence_score": 70
}

EXAMPLE of VALID output:
{
  "patterns_discovered": "Users who trade P2P more than 5 times per day have a 3x higher dispute rate. This pattern was not previously tracked.",
  "owner_model_changes": "You consistently reject proposals that touch financial balances without simulation. This preference is now weighted at 95%.",
  "future_decision_impact": "Next time a performance optimization is proposed, I will require a simulation first because you rejected 3 similar proposals without one.",
  "risk_delta": "Fraud risk decreased by 15% after flagging 2 suspicious orders. However, P2P dispute response time increased, creating moderate support risk.",
  "executive_summary": "This run identified a high-frequency trading pattern linked to disputes and reinforced your preference for simulation-first execution.",
  "executive_summary_ar": "هذا التشغيل اكتشف نمط تداول عالي التكرار مرتبط بالنزاعات وعزز تفضيلك للتنفيذ بعد المحاكاة.",
  "confidence_score": 82
}`;

  const userPrompt = `Agent: ${agentFunction}
Run ID: ${runId}
Trigger: ${triggerType}

Raw Output:
${JSON.stringify(rawOutput, null, 2).substring(0, 3000)}

Owner Context:
${JSON.stringify(ownerContext, null, 2).substring(0, 1000)}

Generate the Executive Understanding Report. JSON only.`;

  try {
    const res = await fetch(AI_GATEWAY, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content || data?.content || '';
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No JSON found in LLM response');
  } catch (err) {
    console.error('[EUL] LLM generation failed:', err);
    return null;
  }
}

// ─── Fallback: Deterministic EUL ─────────────────────
function generateFallbackEUL(agentFunction: string, rawOutput: any): any {
  const hasErrors = JSON.stringify(rawOutput).includes('error') || JSON.stringify(rawOutput).includes('failed');
  const hasSuccess = JSON.stringify(rawOutput).includes('success');

  return {
    patterns_discovered: hasErrors
      ? `The ${agentFunction} agent encountered issues during this run. This may indicate an emerging reliability pattern that needs monitoring.`
      : `The ${agentFunction} agent completed its cycle. No new behavioral patterns were detected in this run.`,
    owner_model_changes: 'No changes to the owner preference model were triggered by this run.',
    future_decision_impact: hasErrors
      ? 'If this failure pattern repeats, I will recommend reducing this agent\'s autonomy level and escalating for manual review.'
      : 'No decision changes are needed based on this run\'s outcomes.',
    risk_delta: hasErrors
      ? 'Operational risk slightly increased due to agent reliability concerns.'
      : 'Risk levels remain unchanged. System operating within normal parameters.',
    executive_summary: hasErrors
      ? `The ${agentFunction} agent had issues during its run. I\'m tracking this to see if it becomes a pattern. If it happens again, I\'ll recommend intervention.`
      : `The ${agentFunction} agent completed its work normally. Nothing requires your attention right now.`,
    executive_summary_ar: hasErrors
      ? `واجه وكيل ${agentFunction} مشاكل أثناء تشغيله. أتابع هذا لمعرفة ما إذا كان سيصبح نمطاً. إذا تكرر، سأوصي بالتدخل.`
      : `أكمل وكيل ${agentFunction} عمله بشكل طبيعي. لا يوجد ما يتطلب انتباهك الآن.`,
    confidence_score: hasErrors ? 55 : 65,
  };
}

// ─── Post EUL to DM ──────────────────────────────────
async function postEULToDM(sb: any, report: any, agentFunction: string) {
  const content = `🧠 **تقرير الفهم التنفيذي** | ${agentFunction}

📊 **أنماط جديدة:**
${report.patterns_discovered}

🎯 **تغييرات نموذج المالك:**
${report.owner_model_changes}

🔮 **تأثير على القرارات القادمة:**
${report.future_decision_impact}

⚖️ **تغير المخاطر:**
${report.risk_delta}

📝 **الملخص:**
${report.executive_summary_ar || report.executive_summary}

🎯 الثقة: ${report.confidence_score}%`;

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
        message_type: 'executive_understanding',
        is_read: false,
      });
    }
  }

  // Also post to AI Chat Room
  const { data: agent } = await sb.from('ai_agents').select('id').eq('is_active', true).limit(1).single();
  if (agent) {
    await sb.from('ai_chat_room').insert({
      agent_id: agent.id,
      content: `🧠 **Executive Understanding Report** | ${agentFunction}\n\n${report.executive_summary}`,
      content_ar: `🧠 **تقرير الفهم التنفيذي** | ${agentFunction}\n\n${report.executive_summary_ar || report.executive_summary}`,
      message_type: 'executive_understanding',
      message_category: report.confidence_score >= 75 ? 'info' : 'warning',
      is_summary: true,
    });
  }
}

// ─── Main Handler ────────────────────────────────────
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

    const body = await req.json().catch(() => ({}));
    const {
      agent_function,
      run_id,
      trigger_type = 'scheduled',
      raw_output = {},
    } = body;

    if (!agent_function || !run_id) {
      return new Response(JSON.stringify({
        error: 'Missing agent_function or run_id',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load owner context for LLM
    const [prefsResult, constitutionResult, correctionsResult] = await Promise.all([
      sb.from('owner_preferences').select('*').limit(10),
      sb.from('owner_constitution').select('rule_key, rule_en').eq('is_active', true),
      sb.from('owner_corrections').select('original_output, corrected_output, correction_type')
        .order('created_at', { ascending: false }).limit(5),
    ]);

    const ownerContext = {
      preferences: prefsResult.data || [],
      constitution_rules: (constitutionResult.data || []).map((r: any) => r.rule_key),
      recent_corrections: (correctionsResult.data || []).length,
    };

    // Try LLM generation first, fall back to deterministic
    let eulData = await generateEUL(agent_function, run_id, trigger_type, raw_output, ownerContext);

    if (!eulData) {
      console.log('[EUL] Using fallback generator');
      eulData = generateFallbackEUL(agent_function, raw_output);
    }

    // Quality gate
    const validation = validateCognitiveQuality(eulData);

    if (!validation.valid) {
      console.warn('[EUL] Quality gate failed, using fallback:', validation.errors);
      eulData = generateFallbackEUL(agent_function, raw_output);
      // Re-validate fallback (should always pass)
      const recheck = validateCognitiveQuality(eulData);
      if (!recheck.valid) {
        console.error('[EUL] Even fallback failed quality gate');
      }
    }

    const durationMs = Date.now() - t0;

    // Store the report
    const { data: report, error: insertErr } = await sb
      .from('executive_understanding_reports')
      .insert({
        run_id,
        agent_function,
        trigger_type,
        patterns_discovered: eulData.patterns_discovered,
        owner_model_changes: eulData.owner_model_changes,
        future_decision_impact: eulData.future_decision_impact,
        risk_delta: eulData.risk_delta,
        executive_summary: eulData.executive_summary,
        executive_summary_ar: eulData.executive_summary_ar,
        confidence_score: eulData.confidence_score || 70,
        is_valid: validation.valid,
        validation_errors: validation.valid ? null : validation.errors,
        duration_ms: durationMs,
      })
      .select('id')
      .single();

    if (insertErr) {
      console.error('[EUL] Insert failed:', insertErr);
      return new Response(JSON.stringify({ error: insertErr.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Post to DM (non-blocking)
    postEULToDM(sb, eulData, agent_function).catch(err =>
      console.error('[EUL] DM post failed:', err)
    );

    // Log to knowledge_memory
    await sb.from('knowledge_memory').insert({
      source: 'ai',
      event_type: 'eul_generated',
      area: 'governance',
      reference_id: run_id,
      payload: {
        agent_function,
        confidence: eulData.confidence_score,
        is_valid: validation.valid,
        report_id: report?.id,
      },
    });

    console.log(`[EUL] Report generated: agent=${agent_function}, valid=${validation.valid}, confidence=${eulData.confidence_score}, ${durationMs}ms`);

    return new Response(JSON.stringify({
      success: true,
      report_id: report?.id,
      is_valid: validation.valid,
      confidence_score: eulData.confidence_score,
      duration_ms: durationMs,
      executive_summary: eulData.executive_summary,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[EUL] Error:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: Date.now() - t0,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
