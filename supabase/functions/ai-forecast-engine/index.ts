import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ─── Constants ────────────────────────────────────

const AI_SYSTEM_USER_ID = "00000000-0000-0000-0000-a10000000001";
const ALERT_THRESHOLD = 80;
const LOOKBACK_HOURS = 6;
const TREND_LOOKBACK_HOURS = 24;

// ─── Data Collectors ─────────────────────────────

async function collectFailures(sb: any, since: string, trendSince: string) {
  const [recent, trend] = await Promise.all([
    sb.from("ai_failures").select("id, rpc_name, error_message, created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(200),
    sb.from("ai_failures").select("id, created_at").gte("created_at", trendSince).limit(500),
  ]);
  return { recent: recent.data || [], trend: trend.data || [] };
}

async function collectMoneyFlow(sb: any, since: string, trendSince: string) {
  const [recent, trend] = await Promise.all([
    sb.from("ai_money_flow").select("id, operation, amount, currency, created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(200),
    sb.from("ai_money_flow").select("id, operation, amount, created_at").gte("created_at", trendSince).limit(500),
  ]);
  return { recent: recent.data || [], trend: trend.data || [] };
}

async function collectP2POrders(sb: any, since: string, trendSince: string) {
  const [recent, trend] = await Promise.all([
    sb.from("p2p_orders").select("id, status, order_type, amount, created_at, matched_at, completed_at, expired_at, timer_minutes").gte("created_at", since).order("created_at", { ascending: false }).limit(200),
    sb.from("p2p_orders").select("id, status, created_at, matched_at, completed_at, expired_at").gte("created_at", trendSince).limit(500),
  ]);
  return { recent: recent.data || [], trend: trend.data || [] };
}

async function collectContestActivity(sb: any, since: string) {
  const [contests, entries] = await Promise.all([
    sb.from("contests").select("id, status, current_participants, max_participants, start_time, end_time").order("created_at", { ascending: false }).limit(10),
    sb.from("contest_entries").select("id, contest_id, votes_received, created_at").gte("created_at", since).limit(300),
  ]);
  return { contests: contests.data || [], entries: entries.data || [] };
}

async function collectAgentPerformance(sb: any) {
  const [agents, evaluations, proposals] = await Promise.all([
    sb.from("ai_agents").select("id, agent_name, rank, status, confidence, is_active").eq("is_active", true).limit(50),
    sb.from("ai_evaluations").select("agent_id, overall_score, accuracy_score, findings_accepted, findings_rejected, created_at").order("created_at", { ascending: false }).limit(100),
    sb.from("ai_proposals").select("id, status, confidence_score, priority, created_at").order("created_at", { ascending: false }).limit(100),
  ]);
  return { agents: agents.data || [], evaluations: evaluations.data || [], proposals: proposals.data || [] };
}

async function collectActivityStream(sb: any, since: string) {
  const { data } = await sb
    .from("ai_activity_stream")
    .select("action_type, entity_type, success, error_code, duration_ms, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(300);
  return data || [];
}

async function collectExistingForecasts(sb: any) {
  const { data } = await sb
    .from("ai_forecasts")
    .select("forecast_type, title, probability, status, created_at")
    .in("status", ["new", "reviewed"])
    .gte("created_at", new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: false })
    .limit(20);
  return data || [];
}

// ─── AI Analysis ──────────────────────────────────

interface Forecast {
  forecast_type: "risk" | "load" | "fraud" | "growth" | "infra";
  title: string;
  title_ar: string;
  description: string;
  description_ar: string;
  probability: number;
  impact_range: string;
  impact_range_ar: string;
  time_window: string;
  recommended_action: string;
  recommended_action_ar: string;
  confidence_score: number;
}

async function analyzeWithAI(apiKey: string, data: Record<string, any>): Promise<Forecast[]> {
  const prompt = `You are WINOVA's Predictive Intelligence Engine — you see the future.

## Your Data Sources (last ${LOOKBACK_HOURS}h recent + ${TREND_LOOKBACK_HOURS}h trend)

### RPC Failures (recent: ${data.failures.recent.length}, trend: ${data.failures.trend.length})
${JSON.stringify(data.failures.recent.slice(0, 50), null, 1)}
Trend data points: ${data.failures.trend.length} in ${TREND_LOOKBACK_HOURS}h

### Money Flow (recent: ${data.moneyFlow.recent.length}, trend: ${data.moneyFlow.trend.length})
${JSON.stringify(data.moneyFlow.recent.slice(0, 30), null, 1)}

### P2P Orders (recent: ${data.p2p.recent.length}, trend: ${data.p2p.trend.length})
${JSON.stringify(data.p2p.recent.slice(0, 40), null, 1)}

### Contest & Vote Activity
${JSON.stringify(data.contests, null, 1)}

### Agent Performance
${JSON.stringify(data.agents, null, 1)}

### Activity Stream (${data.activity.length} events)
${JSON.stringify(data.activity.slice(0, 40), null, 1)}

### Already Active Forecasts (avoid duplicating these!)
${JSON.stringify(data.existingForecasts, null, 1)}

## Your Mission
Detect TRAJECTORIES. Predict what will happen in the next hours/days.

Look for:
1. **Rising RPC failures** → outage risk
2. **P2P congestion** (high pending, slow matching) → liquidity bottleneck
3. **Escrow delays** (long time between matched_at and completed_at) → trust/fraud risk
4. **Fraud signals** (suspicious patterns in money flow, clustered failures) → abuse probability
5. **User growth/decline** (activity trends up/down) → engagement forecast
6. **Server saturation** (rising error rates, slow durations) → infrastructure stress
7. **Vote participation changes** → contest engagement forecast
8. **Agent performance decline** (low accuracy, high rejection) → AI quality risk

## Rules
- Max 5 forecasts per run
- Only generate forecasts backed by REAL data signals
- Do NOT duplicate existing active forecasts
- Probability 0-100: be honest, don't inflate
- If no strong signals → return []
- Each forecast needs a clear time_window (e.g. "next 6 hours", "next 2 days")
- No execution instructions — only predictions and recommendations

## Response Format (JSON array)
[{
  "forecast_type": "risk|load|fraud|growth|infra",
  "title": "Short title",
  "title_ar": "عنوان قصير",
  "description": "What the data shows and what will likely happen",
  "description_ar": "الوصف بالعربي",
  "probability": 75,
  "impact_range": "What could happen if unaddressed",
  "impact_range_ar": "نطاق التأثير",
  "time_window": "next 12 hours",
  "recommended_action": "What leadership should consider",
  "recommended_action_ar": "الإجراء الموصى به",
  "confidence_score": 70
}]

If no strong predictive signals exist, respond with: []`;

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are a predictive intelligence engine analyzing system telemetry. Respond only with valid JSON. Be precise and data-driven." },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[Forecast Engine] AI failed:", response.status, text);
    throw new Error(`AI analysis failed: ${response.status}`);
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content?.trim() || "[]";

  let jsonStr = content;
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();

  try {
    const forecasts = JSON.parse(jsonStr);
    return Array.isArray(forecasts) ? forecasts.slice(0, 5) : [];
  } catch (e) {
    console.error("[Forecast Engine] JSON parse failed:", e, content);
    return [];
  }
}

// ─── DM Alert Sender ──────────────────────────────

async function sendHighProbabilityAlert(sb: any, forecast: Forecast & { id: string }) {
  // Find admin users to alert
  const { data: admins } = await sb
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin")
    .limit(10);

  if (!admins?.length) {
    console.log("[Forecast Engine] No admins to alert");
    return;
  }

  const severityIcon = forecast.probability >= 90 ? "🔴" : "🟠";
  const typeEmoji: Record<string, string> = {
    risk: "⚠️", load: "📈", fraud: "🛡️", growth: "📊", infra: "🖥️"
  };

  const alertContent = `${severityIcon} **PREDICTIVE ALERT** ${typeEmoji[forecast.forecast_type] || "🔮"}

**${forecast.title}**

📊 Probability: **${forecast.probability}%**
🎯 Confidence: ${forecast.confidence_score}%
⏱️ Window: ${forecast.time_window}

${forecast.description}

💥 **Impact:** ${forecast.impact_range}

✅ **Recommended:** ${forecast.recommended_action}

_This is a predictive forecast. No automatic action will be taken._`;

  for (const admin of admins) {
    try {
      // Get or create conversation with AI system user
      const { data: existing } = await sb
        .from("conversations")
        .select("id")
        .or(`and(participant1_id.eq.${AI_SYSTEM_USER_ID},participant2_id.eq.${admin.user_id}),and(participant1_id.eq.${admin.user_id},participant2_id.eq.${AI_SYSTEM_USER_ID})`)
        .limit(1)
        .maybeSingle();

      let conversationId = existing?.id;

      if (!conversationId) {
        const { data: newConv } = await sb
          .from("conversations")
          .insert({ participant1_id: AI_SYSTEM_USER_ID, participant2_id: admin.user_id })
          .select("id")
          .single();
        conversationId = newConv?.id;
      }

      if (conversationId) {
        await sb.from("direct_messages").insert({
          conversation_id: conversationId,
          sender_id: AI_SYSTEM_USER_ID,
          content: alertContent,
          message_type: "ai_forecast_alert",
        });

        await sb.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);
      }
    } catch (e) {
      console.error(`[Forecast Engine] Alert to admin ${admin.user_id} failed:`, e);
    }
  }
}

// ─── Main Handler ─────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const t0 = Date.now();

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();
    const trendSince = new Date(Date.now() - TREND_LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();
    console.log(`[Forecast Engine] Analyzing since ${since}, trends since ${trendSince}`);

    // ─── Parallel Data Collection ──────────────────
    const [failures, moneyFlow, p2p, contests, agents, activity, existingForecasts] = await Promise.all([
      collectFailures(sb, since, trendSince),
      collectMoneyFlow(sb, since, trendSince),
      collectP2POrders(sb, since, trendSince),
      collectContestActivity(sb, since),
      collectAgentPerformance(sb),
      collectActivityStream(sb, since),
      collectExistingForecasts(sb),
    ]);

    const totalSignals =
      failures.recent.length + moneyFlow.recent.length + p2p.recent.length +
      contests.entries.length + agents.agents.length + activity.length;

    console.log(`[Forecast Engine] Signals: ${failures.recent.length} failures, ${moneyFlow.recent.length} flows, ${p2p.recent.length} p2p, ${contests.entries.length} votes, ${agents.agents.length} agents, ${activity.length} activities = ${totalSignals} total`);

    // Skip if nearly no data
    if (totalSignals < 3) {
      console.log("[Forecast Engine] Insufficient data — skipping.");
      return new Response(JSON.stringify({
        success: true,
        forecasts: 0,
        message: "Insufficient data for predictions",
        duration_ms: Date.now() - t0,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── AI Prediction ─────────────────────────────
    const forecasts = await analyzeWithAI(apiKey, {
      failures, moneyFlow, p2p, contests, agents, activity, existingForecasts,
    });

    console.log(`[Forecast Engine] Generated ${forecasts.length} forecasts`);

    // ─── Insert Forecasts + Alert if High ──────────
    let alertCount = 0;

    for (const f of forecasts) {
      const { data: inserted, error } = await sb.from("ai_forecasts").insert({
        forecast_type: f.forecast_type,
        title: f.title,
        title_ar: f.title_ar,
        description: f.description,
        description_ar: f.description_ar,
        probability: Math.min(100, Math.max(0, f.probability)),
        impact_range: f.impact_range,
        impact_range_ar: f.impact_range_ar,
        time_window: f.time_window,
        recommended_action: f.recommended_action,
        recommended_action_ar: f.recommended_action_ar,
        confidence_score: Math.min(100, Math.max(0, f.confidence_score)),
        status: "new",
      }).select("id").single();

      if (error) {
        console.error("[Forecast Engine] Insert error:", error.message);
        continue;
      }

      // Alert if probability > threshold
      if (f.probability >= ALERT_THRESHOLD && inserted) {
        await sendHighProbabilityAlert(sb, { ...f, id: inserted.id });
        alertCount++;
        console.log(`[Forecast Engine] 🚨 Alert sent: "${f.title}" (${f.probability}%)`);
      }
    }

    // ─── Post to AI Chat Room ──────────────────────
    if (forecasts.length > 0) {
      const { data: agent } = await sb
        .from("ai_agents")
        .select("id")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (agent) {
        const summary = `🔮 **Forecast Engine generated ${forecasts.length} predictions.** ${alertCount} high-probability alerts sent.

${forecasts.map((f, i) => `${i + 1}. **${f.title}** [${f.forecast_type}] — ${f.probability}% probability, ${f.confidence_score}% confidence`).join("\n")}`;

        const summaryAr = `🔮 **محرك التنبؤ أنتج ${forecasts.length} توقعات.** تم إرسال ${alertCount} تنبيهات عالية الاحتمالية.

${forecasts.map((f, i) => `${i + 1}. **${f.title_ar || f.title}** [${f.forecast_type}] — احتمالية ${f.probability}%، ثقة ${f.confidence_score}%`).join("\n")}`;

        await sb.from("ai_chat_room").insert({
          agent_id: agent.id,
          content: summary,
          content_ar: summaryAr,
          message_type: "forecast_report",
          message_category: alertCount > 0 ? "warning" : "info",
          is_summary: true,
        });
      }
    }

    // ─── Log to knowledge_memory ───────────────────
    if (forecasts.length > 0) {
      await sb.from("knowledge_memory").insert({
        source: "ai",
        event_type: "forecast_generated",
        area: "predictive",
        payload: {
          count: forecasts.length,
          alerts: alertCount,
          types: forecasts.map(f => f.forecast_type),
          avg_probability: Math.round(forecasts.reduce((s, f) => s + f.probability, 0) / forecasts.length),
        },
      }).then((r: any) => { if (r.error) console.warn("[Forecast Engine] Knowledge log failed:", r.error.message); });
    }

    return new Response(JSON.stringify({
      success: true,
      forecasts: forecasts.length,
      alerts_sent: alertCount,
      signals_analyzed: totalSignals,
      duration_ms: Date.now() - t0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: unknown) {
    console.error("[Forecast Engine] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
