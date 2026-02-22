import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminDb = createClient(supabaseUrl, serviceKey);

    console.log("ai-memory-decay: starting importance decay cycle");

    // Decay importance by 5% for all non-strategy entries older than 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: decayTargets, error: fetchErr } = await adminDb
      .from("ai_memory")
      .select("id, importance")
      .neq("category", "strategy")
      .lt("last_used", sevenDaysAgo);

    if (fetchErr) {
      console.error("ai-memory-decay: fetch error:", fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let decayed = 0;
    if (decayTargets?.length) {
      for (const entry of decayTargets) {
        const newImportance = parseFloat((entry.importance * 0.95).toFixed(4));
        await adminDb.from("ai_memory").update({ importance: newImportance }).eq("id", entry.id);
        decayed++;
      }
    }

    // Prune if over 2000 rows
    const { count } = await adminDb.from("ai_memory").select("*", { count: "exact", head: true });
    let pruned = 0;
    if (count && count > 2000) {
      const excess = count - 2000;
      const { data: toDelete } = await adminDb
        .from("ai_memory")
        .select("id")
        .order("importance", { ascending: true })
        .limit(excess);
      if (toDelete?.length) {
        await adminDb.from("ai_memory").delete().in("id", toDelete.map(r => r.id));
        pruned = toDelete.length;
      }
    }

    console.log(`ai-memory-decay: decayed ${decayed} entries, pruned ${pruned} entries, total: ${count}`);

    return new Response(JSON.stringify({
      decayed,
      pruned,
      total: count,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("ai-memory-decay error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
