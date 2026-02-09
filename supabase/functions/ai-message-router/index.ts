import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AI_SYSTEM_USER_ID = '00000000-0000-0000-0000-a10000000001';

// ─── Intent Classification ───────────────────────────
// Pattern-based intent detection with confidence scoring
interface IntentResult {
  intent: string;
  agent: string;
  confidence: number;
  params: Record<string, any>;
}

const INTENT_PATTERNS: Array<{
  patterns: RegExp[];
  intent: string;
  agent: string;
  baseConfidence: number;
}> = [
  {
    patterns: [/perform/i, /أداء/i, /slow/i, /بطيء/i, /optimi[zs]/i, /query/i, /index/i, /database/i, /قاعدة/i, /scan perf/i, /فحص.*أداء/i],
    intent: 'performance_scan',
    agent: 'ai-performance-analyst',
    baseConfidence: 0.8,
  },
  {
    patterns: [/fraud/i, /احتيال/i, /suspicious/i, /مشبوه/i, /flag/i, /تحذير/i, /scam/i],
    intent: 'fraud_scan',
    agent: 'ai-execution-worker',
    baseConfidence: 0.8,
  },
  {
    patterns: [/evolv/i, /تطور/i, /upgrade/i, /ترقية/i, /capabilit/i, /قدرات/i, /improv/i, /تحسين/i],
    intent: 'evolution_scan',
    agent: 'ai-evolution-engine',
    baseConfidence: 0.75,
  },
  {
    patterns: [/build/i, /بناء/i, /create project/i, /مشروع/i, /develop/i, /تطوير/i],
    intent: 'build_project',
    agent: 'ai-build-engine',
    baseConfidence: 0.7,
  },
  {
    patterns: [/forecast/i, /توقع/i, /predict/i, /تنبؤ/i, /trend/i, /اتجاه/i],
    intent: 'forecast',
    agent: 'ai-forecast-engine',
    baseConfidence: 0.75,
  },
  {
    patterns: [/insight/i, /رؤية/i, /strateg/i, /استراتيج/i, /analys/i, /تحليل/i],
    intent: 'strategic_analysis',
    agent: 'ai-executive-brain',
    baseConfidence: 0.7,
  },
  {
    patterns: [/simulat/i, /محاكاة/i, /shadow/i, /test.*sandbox/i, /اختبار/i],
    intent: 'simulation',
    agent: 'ai-shadow-simulator',
    baseConfidence: 0.75,
  },
  {
    patterns: [/health/i, /صحة/i, /status/i, /حالة/i, /alive/i, /heartbeat/i, /نبض/i],
    intent: 'health_check',
    agent: 'ai-health-monitor',
    baseConfidence: 0.8,
  },
  {
    patterns: [/rule/i, /قاعدة/i, /discover/i, /اكتشف/i, /pattern/i, /نمط/i],
    intent: 'rule_discovery',
    agent: 'ai-rule-generator',
    baseConfidence: 0.7,
  },
];

function classifyIntent(text: string): IntentResult | null {
  let bestMatch: IntentResult | null = null;
  let bestScore = 0;

  for (const pattern of INTENT_PATTERNS) {
    let matchCount = 0;
    for (const regex of pattern.patterns) {
      if (regex.test(text)) matchCount++;
    }
    if (matchCount === 0) continue;

    const confidence = Math.min(0.99, pattern.baseConfidence + (matchCount - 1) * 0.05);
    if (confidence > bestScore) {
      bestScore = confidence;
      bestMatch = {
        intent: pattern.intent,
        agent: pattern.agent,
        confidence,
        params: {},
      };
    }
  }

  return bestMatch;
}

// ─── Main Handler ────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body = await req.json().catch(() => ({}));
    const { command_id, text } = body;

    // If called with a specific command_id, process that one
    if (command_id) {
      const { data: cmd } = await sb.from('agent_command_queue').select('*').eq('id', command_id).single();
      if (!cmd) {
        return new Response(JSON.stringify({ error: 'Command not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const intent = classifyIntent(cmd.raw_text);
      return new Response(JSON.stringify({
        command_id: cmd.id,
        raw_text: cmd.raw_text,
        intent: intent?.intent || 'unknown',
        agent: intent?.agent || null,
        confidence: intent?.confidence || 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If called with raw text, classify only
    if (text) {
      const intent = classifyIntent(text);
      return new Response(JSON.stringify({
        text,
        intent: intent?.intent || 'unknown',
        agent: intent?.agent || null,
        confidence: intent?.confidence || 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Batch mode: process all pending commands
    const { data: pending } = await sb
      .from('agent_command_queue')
      .select('*')
      .eq('dispatch_status', 'pending')
      .order('created_at', { ascending: true })
      .limit(20);

    const results = [];
    for (const cmd of pending || []) {
      const intent = classifyIntent(cmd.raw_text);
      await sb.from('agent_command_queue').update({
        detected_intent: intent?.intent || 'unknown',
        target_agent: intent?.agent || null,
        dispatch_status: intent ? 'classified' : 'ignored',
      }).eq('id', cmd.id);

      results.push({
        command_id: cmd.id,
        intent: intent?.intent || 'unknown',
        agent: intent?.agent || null,
        confidence: intent?.confidence || 0,
      });
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
    }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
