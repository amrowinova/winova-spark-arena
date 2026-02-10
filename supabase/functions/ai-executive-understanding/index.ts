import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AI_SYSTEM_USER_ID = '00000000-0000-0000-0000-a10000000001';

// ─── CEO-Level Quality Gate ────────────────────────────
// Extended banned vocabulary — covers both operational AND technical terms
const BANNED_PHRASES = [
  // Operational logs
  'scan completed', 'agent executed', 'rows affected', 'query returned',
  'function invoked', 'pipeline finished', 'job ran successfully',
  'cron triggered', 'status: success', 'status: failed',
  // SQL / technical
  'SELECT ', 'INSERT ', 'UPDATE ', 'DELETE ', 'duration_ms',
  // System vocabulary banned from CEO view
  'signals', 'pipeline', 'scan', 'execution', 'database', 'table',
  'rpc', 'function', 'orchestration', 'agent', 'subsystem', 'cron',
  'webhook', 'trigger', 'query', 'endpoint', 'schema', 'migration',
  'payload', 'thinking stream', 'phase ', 'step ',
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
        errors.push(`${field.name}: contains banned vocabulary "${phrase}" — rewrite in CEO business language`);
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

  const systemPrompt = `You are the Executive Understanding Layer for WINOVA, a fintech company.
You translate operational outputs into CEO-level cognitive insights.

## ABSOLUTE RULES (PERMANENT)

1. NEVER use these words: signals, pipeline, scan, execution, database, table, RPC, function,
   orchestration, agent, subsystem, cron, webhook, trigger, query, endpoint, schema, migration, payload.

2. NEVER say "scan completed", "agent executed", "job ran" — these are BANNED.

3. Speak as if briefing the CEO of a fintech company, NOT a developer.

4. Translate ALL technology into BUSINESS IMPACT:
   - Instead of "3 agents failed" → "3 key processes are underperforming, which could slow down user growth"
   - Instead of "query returned 0 rows" → "no new patterns were detected in this review cycle"

5. Every response must answer 4 questions:
   - What NEW PATTERNS did we discover? (behavioral, financial, operational)
   - What changed about how we understand the OWNER'S preferences?
   - What DECISIONS will be different NEXT TIME because of this?
   - Were any RISKS reduced or increased?

6. If nothing meaningful was found, say exactly:
   "No new patterns detected. Your preferences remain unchanged. Risk levels are stable."

7. If data is insufficient, say so. NEVER hallucinate.

8. Priority = CLARITY OVER COMPLEXITY.

OUTPUT FORMAT (JSON):
{
  "patterns_discovered": "Business-language description of new patterns",
  "owner_model_changes": "How owner preferences were updated",
  "future_decision_impact": "What will change in future recommendations",
  "risk_delta": "How risk levels changed",
  "executive_summary": "One paragraph CEO briefing",
  "executive_summary_ar": "Arabic version",
  "confidence_score": 70
}

EXAMPLE of VALID output:
{
  "patterns_discovered": "Users who trade more than 5 times daily have a 3x higher dispute rate. This pattern was not previously tracked and could impact our support costs.",
  "owner_model_changes": "You consistently reject proposals that touch financial balances without testing first. This preference is now weighted at 95% in our recommendation model.",
  "future_decision_impact": "Next time a performance improvement is proposed, I will require testing first because you rejected 3 similar proposals without it.",
  "risk_delta": "Fraud risk decreased by 15% after flagging 2 suspicious orders. However, dispute response time increased, creating moderate support cost risk.",
  "executive_summary": "This review identified a high-frequency trading pattern linked to disputes and reinforced your preference for test-first improvements.",
  "executive_summary_ar": "هذه المراجعة اكتشفت نمط تداول عالي التكرار مرتبط بالنزاعات وعززت تفضيلك للتحسينات بعد الاختبار.",
  "confidence_score": 82
}`;

  const userPrompt = `Component: ${agentFunction}
Run: ${runId}
Type: ${triggerType}

Raw Output:
${JSON.stringify(rawOutput, null, 2).substring(0, 3000)}

Owner Context:
${JSON.stringify(ownerContext, null, 2).substring(0, 1000)}

Generate the Executive Understanding Report. JSON only. CEO language only.`;

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
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No JSON found in response');
  } catch (err) {
    console.error('[EUL] Generation failed:', err);
    return null;
  }
}

// ─── Fallback: Deterministic EUL (CEO language) ──────
function generateFallbackEUL(agentFunction: string, rawOutput: any): any {
  const hasErrors = JSON.stringify(rawOutput).includes('error') || JSON.stringify(rawOutput).includes('failed');

  return {
    patterns_discovered: hasErrors
      ? `The ${agentFunction} process encountered issues during this cycle. This may indicate an emerging reliability concern that needs monitoring.`
      : `No new patterns were detected in this review cycle.`,
    owner_model_changes: 'No changes to your preference model were identified.',
    future_decision_impact: hasErrors
      ? 'If this issue repeats, I will recommend reducing its autonomy and escalating for your review.'
      : 'No changes to future recommendations are needed based on this cycle.',
    risk_delta: hasErrors
      ? 'Operational reliability risk slightly increased. Monitoring closely.'
      : 'Risk levels remain stable.',
    executive_summary: hasErrors
      ? `The ${agentFunction} process had issues. I\'m tracking this — if it happens again, I\'ll recommend intervention.`
      : 'All systems are stable. Nothing requires your decision.',
    executive_summary_ar: hasErrors
      ? `واجهت عملية ${agentFunction} مشاكل. أتابع الأمر — إذا تكرر سأوصي بالتدخل.`
      : 'جميع الأنظمة مستقرة. لا شيء يتطلب قرارك.',
    confidence_score: hasErrors ? 55 : 65,
  };
}

// ─── Post EUL to DM (CEO language only) ──────────────
async function postEULToDM(sb: any, report: any, agentFunction: string) {
  const content = `🧠 **تقرير الفهم التنفيذي**

📊 **أنماط جديدة:**
${report.patterns_discovered}

🎯 **تحديثات التفضيلات:**
${report.owner_model_changes}

🔮 **تأثير على التوصيات القادمة:**
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

  // Internal log only
  const { data: agentRecord } = await sb.from('ai_agents').select('id').eq('is_active', true).limit(1).single();
  if (agentRecord) {
    await sb.from('ai_chat_room').insert({
      agent_id: agentRecord.id,
      content: `🧠 Executive Understanding Report\n\n${report.executive_summary}`,
      content_ar: `🧠 تقرير الفهم التنفيذي\n\n${report.executive_summary_ar || report.executive_summary}`,
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
        error: 'Missing required parameters',
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Load owner context
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
      console.warn('[EUL] Quality gate failed, sanitizing:', validation.errors);
      eulData = generateFallbackEUL(agent_function, raw_output);
      const recheck = validateCognitiveQuality(eulData);
      if (!recheck.valid) {
        console.error('[EUL] Fallback also failed quality gate');
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

    // Log to knowledge memory
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
