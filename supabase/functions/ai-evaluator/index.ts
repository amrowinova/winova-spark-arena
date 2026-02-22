import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userMessage, aiResponse, conversationId, messageId } = await req.json();

    if (!userMessage || !aiResponse) {
      return new Response(JSON.stringify({ error: "userMessage and aiResponse are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const AI_SERVER_URL = Deno.env.get("AI_CORE_SERVER_URL");
    const AI_SERVER_KEY = Deno.env.get("AI_CORE_SERVER_KEY");

    if (!AI_SERVER_URL || !AI_SERVER_KEY) {
      return new Response(JSON.stringify({ error: "AI server not configured" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const evaluatorPrompt = `Evaluate the assistant response strictly.

User message:
${userMessage}

Assistant response:
${aiResponse}

Return ONLY valid JSON:
{
  "relevance": number between 0 and 1,
  "clarity": number between 0 and 1,
  "technical_depth": number between 0 and 1,
  "hallucination_risk": number between 0 and 1,
  "improvement_note": "short explanation"
}`;

    const requestBody = {
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are a strict AI response evaluator. Return ONLY valid JSON, no markdown, no explanation, no code fences." },
        { role: "user", content: evaluatorPrompt },
      ],
      temperature: 0.2,
    };

    console.log("ai-evaluator: calling Groq for evaluation");

    let groqRes: Response;
    try {
      groqRes = await fetch(AI_SERVER_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AI_SERVER_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
    } catch (fetchErr) {
      console.error("ai-evaluator: Groq fetch failed:", fetchErr);
      return new Response(JSON.stringify({ error: "Failed to reach evaluator", details: String(fetchErr) }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBody = await groqRes.text();
    console.log("ai-evaluator: Groq status:", groqRes.status);

    if (!groqRes.ok) {
      console.error("ai-evaluator: Groq error:", rawBody);
      return new Response(JSON.stringify({ error: "Evaluator API error", status: groqRes.status, details: rawBody }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let groqData: any;
    try {
      groqData = JSON.parse(rawBody);
    } catch {
      console.error("ai-evaluator: invalid JSON from Groq:", rawBody);
      return new Response(JSON.stringify({ error: "Invalid JSON from evaluator" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const evalContent = groqData.choices?.[0]?.message?.content || "";
    console.log("ai-evaluator: raw eval content:", evalContent);

    // Parse the evaluation JSON safely - strip code fences if present
    let evaluation: any;
    try {
      const cleaned = evalContent.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      evaluation = JSON.parse(cleaned);
    } catch {
      console.error("ai-evaluator: failed to parse evaluation JSON:", evalContent);
      return new Response(JSON.stringify({ error: "Failed to parse evaluation", raw: evalContent }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clamp values
    const clamp = (v: any) => Math.max(0, Math.min(1, Number(v) || 0));
    const relevance = clamp(evaluation.relevance);
    const clarity = clamp(evaluation.clarity);
    const technical_depth = clamp(evaluation.technical_depth);
    const hallucination_risk = clamp(evaluation.hallucination_risk);
    const improvement_note = String(evaluation.improvement_note || "").slice(0, 500);

    // Compute composite score
    const composite_score = parseFloat(
      ((0.3 * relevance) + (0.3 * clarity) + (0.3 * technical_depth) - (0.2 * hallucination_risk)).toFixed(4)
    );

    // Insert into database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminDb = createClient(supabaseUrl, serviceKey);

    const { data, error } = await adminDb.from("ai_core_evaluations").insert({
      conversation_id: conversationId || null,
      message_id: messageId || null,
      relevance,
      clarity,
      technical_depth,
      hallucination_risk,
      composite_score,
      improvement_note,
    }).select().single();

    if (error) {
      console.error("ai-evaluator: DB insert error:", error);
      return new Response(JSON.stringify({ error: "Failed to store evaluation", details: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("ai-evaluator: evaluation stored, composite_score:", composite_score);

    return new Response(JSON.stringify({
      evaluation: {
        relevance,
        clarity,
        technical_depth,
        hallucination_risk,
        composite_score,
        improvement_note,
      },
      id: data.id,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("ai-evaluator error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
