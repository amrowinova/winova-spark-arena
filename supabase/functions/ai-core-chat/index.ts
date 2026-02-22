import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify admin
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub;

    // Check admin role
    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").single();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { action } = body;

    // Use service role for DB operations
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminDb = createClient(supabaseUrl, serviceKey);

    switch (action) {
      case "chat": {
        const { conversation_id, message, system_prompt, project_id } = body;

        const AI_SERVER_URL = Deno.env.get("AI_CORE_SERVER_URL");
        const AI_SERVER_KEY = Deno.env.get("AI_CORE_SERVER_KEY");

        if (!AI_SERVER_URL || !AI_SERVER_KEY) {
          return new Response(JSON.stringify({ error: "AI Core server not configured. Add AI_CORE_SERVER_URL and AI_CORE_SERVER_KEY secrets." }), {
            status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Get or create conversation
        let convId = conversation_id;
        if (!convId) {
          const { data: conv, error: convErr } = await adminDb.from("ai_core_conversations").insert({ admin_id: userId, system_prompt: system_prompt || null }).select("id").single();
          if (convErr) throw convErr;
          convId = conv.id;
        }

        // Store user message
        await adminDb.from("ai_core_messages").insert({ conversation_id: convId, role: "user", content: message });

        // Fetch conversation history
        const { data: history } = await adminDb.from("ai_core_messages").select("role, content").eq("conversation_id", convId).order("created_at", { ascending: true }).limit(50);

        // Fetch relevant memory from ai_memory (non-blocking safe)
        let aiMemoryContext = "";
        try {
          const { data: aiMemories } = await adminDb
            .from("ai_memory")
            .select("category, content")
            .order("importance", { ascending: false })
            .limit(10);
          if (aiMemories?.length) {
            aiMemoryContext = `\n\nRelevant long-term memory:\n${aiMemories.map(m => `[${m.category}] ${m.content}`).join("\n")}`;
            const memIds = aiMemories.map((m: any) => m.id).filter(Boolean);
            if (memIds.length) {
              adminDb.from("ai_memory").update({ last_used: new Date().toISOString() }).in("id", memIds).then(() => {});
            }
          }
        } catch (e) {
          console.warn("Memory retrieval failed (non-blocking):", e);
        }

        // Fetch legacy ai_core_memory too
        const { data: legacyMemories } = await adminDb.from("ai_core_memory").select("key, content, category").order("importance", { ascending: false }).limit(10);
        const legacyMemoryContext = legacyMemories?.length
          ? `\n\n[LEGACY MEMORY]\n${legacyMemories.map(m => `[${m.category}] ${m.key}: ${m.content}`).join("\n")}`
          : "";

        // PHASE 2: Project context injection (optional, scoped per project)
        let projectContext = "";
        if (project_id) {
          try {
            const { data: projFiles } = await adminDb
              .from("ai_files")
              .select("path, content, language")
              .eq("project_id", project_id)
              .order("last_modified", { ascending: false })
              .limit(20);
            if (projFiles?.length) {
              const truncated = projFiles.map(f => {
                const c = f.content ? f.content.slice(0, 1500) + (f.content.length > 1500 ? "\n// ... truncated" : "") : "";
                return `File: ${f.path}\n\`\`\`${f.language || ""}\n${c}\n\`\`\``;
              });
              projectContext = `\n\n[PROJECT CONTEXT]\n${truncated.join("\n\n")}`;
            }
          } catch (e) {
            console.warn("Project context retrieval failed (non-blocking):", e);
          }
        }

        // PHASE 3: Task decomposition detection
        const buildKeywords = ["build project", "create app", "create application", "build app", "generate project", "create project"];
        const isBuildRequest = buildKeywords.some(kw => message.toLowerCase().includes(kw));
        const taskDecompSuffix = isBuildRequest
          ? `\n\nIMPORTANT: The user wants to build a project. Before generating any code, you MUST first return a structured plan as a JSON code block:\n\`\`\`json\n{\n  "project_name": "",\n  "stack": "",\n  "files": [{ "path": "", "purpose": "" }],\n  "steps": ["step 1", "step 2"]\n}\n\`\`\`\nReturn this plan FIRST. Wait for approval before generating files.`
          : "";

        const systemMsg = (system_prompt || "You are a private AI assistant for the platform owner. You can generate applications, websites, backend code, and deployment scripts. Always provide complete, production-ready code.") + aiMemoryContext + legacyMemoryContext + projectContext + taskDecompSuffix;

        const messages_payload = [
          { role: "system", content: systemMsg },
          ...(history || []).map(m => ({ role: m.role, content: m.content })),
        ];

        const requestBody = {
          model: "llama-3.3-70b-versatile",
          messages: messages_payload,
          temperature: 0.7,
        };

        let aiResponse: Response;
        try {
          aiResponse = await fetch(AI_SERVER_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${AI_SERVER_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          });
        } catch (fetchErr) {
          console.error("Groq fetch failed:", fetchErr);
          return new Response(JSON.stringify({ error: "Failed to reach Groq", details: String(fetchErr), conversation_id: convId }), {
            status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const rawBody = await aiResponse.text();

        if (!aiResponse.ok) {
          await adminDb.from("ai_core_executions").insert({
            conversation_id: convId, action_type: "chat", input: { message }, output: { error: rawBody },
            status: "failed", error_message: `Groq returned ${aiResponse.status}: ${rawBody}`, requires_approval: false,
          });
          return new Response(JSON.stringify({ error: "Groq API error", status: aiResponse.status, details: rawBody, conversation_id: convId }), {
            status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        let aiData: any;
        try {
          aiData = JSON.parse(rawBody);
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON from Groq", details: rawBody, conversation_id: convId }), {
            status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const assistantContent = aiData.choices?.[0]?.message?.content || "No response generated.";
        const tokensUsed = aiData.usage?.total_tokens || null;

        // Store assistant message
        const { data: assistantMsg } = await adminDb.from("ai_core_messages").insert({
          conversation_id: convId, role: "assistant", content: assistantContent, tokens_used: tokensUsed,
        }).select("id").single();

        // Log execution
        await adminDb.from("ai_core_executions").insert({
          conversation_id: convId, action_type: "chat", input: { message }, output: { tokens: tokensUsed },
          status: "completed", requires_approval: false,
        });

        // Fire-and-forget: call ai-evaluator
        const evalUrl = `${supabaseUrl}/functions/v1/ai-evaluator`;
        try {
          fetch(evalUrl, {
            method: "POST",
            headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              userMessage: message, aiResponse: assistantContent,
              conversationId: convId, messageId: assistantMsg?.id || null,
            }),
          }).catch(e => console.warn("Evaluator fire-and-forget failed:", e));
        } catch (e) {
          console.warn("Evaluator call setup failed:", e);
        }

        return new Response(JSON.stringify({
          conversation_id: convId, message: assistantContent, tokens_used: tokensUsed,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "memory_list": {
        const { data, error } = await adminDb.from("ai_core_memory").select("*").order("updated_at", { ascending: false }).limit(100);
        if (error) throw error;
        return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "memory_add": {
        const { key, content, category, tags, importance } = body;
        const { data, error } = await adminDb.from("ai_core_memory").insert({
          key, content, category: category || "general", tags: tags || [], importance: importance || 5,
        }).select().single();
        if (error) throw error;

        // Optionally push to external vector DB
        const VECTOR_DB_URL = Deno.env.get("AI_CORE_VECTOR_DB_URL");
        const VECTOR_DB_KEY = Deno.env.get("AI_CORE_VECTOR_DB_KEY");
        if (VECTOR_DB_URL && VECTOR_DB_KEY) {
          try {
            await fetch(`${VECTOR_DB_URL}/upsert`, {
              method: "POST",
              headers: { Authorization: `Bearer ${VECTOR_DB_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({ id: data.id, text: `${key}: ${content}`, metadata: { category, tags } }),
            });
          } catch (e) { console.warn("Vector DB upsert failed:", e); }
        }

        return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "memory_delete": {
        const { id } = body;
        const { error } = await adminDb.from("ai_core_memory").delete().eq("id", id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "conversations_list": {
        const { data, error } = await adminDb.from("ai_core_conversations").select("id, title, status, model, created_at, updated_at").eq("admin_id", userId).order("updated_at", { ascending: false }).limit(50);
        if (error) throw error;
        return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "conversation_messages": {
        const { conversation_id: cid } = body;
        const { data, error } = await adminDb.from("ai_core_messages").select("*").eq("conversation_id", cid).order("created_at", { ascending: true });
        if (error) throw error;
        return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "conversation_delete": {
        const { conversation_id: cid } = body;
        const { error } = await adminDb.from("ai_core_conversations").delete().eq("id", cid);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "execution_logs": {
        const { data, error } = await adminDb.from("ai_core_executions").select("*").order("created_at", { ascending: false }).limit(100);
        if (error) throw error;
        return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "execute_code": {
        const { code, language, conversation_id: cid } = body;
        const SANDBOX_URL = Deno.env.get("AI_CORE_SANDBOX_URL");
        const SANDBOX_KEY = Deno.env.get("AI_CORE_SANDBOX_KEY");

        if (!SANDBOX_URL || !SANDBOX_KEY) {
          return new Response(JSON.stringify({ error: "Code execution sandbox not configured. Add AI_CORE_SANDBOX_URL and AI_CORE_SANDBOX_KEY secrets." }), {
            status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Log pending execution
        const { data: exec } = await adminDb.from("ai_core_executions").insert({
          conversation_id: cid || null,
          action_type: "code_execution",
          input: { code, language },
          status: "pending",
          requires_approval: true,
        }).select("id").single();

        return new Response(JSON.stringify({
          execution_id: exec?.id,
          status: "pending_approval",
          message: "Code execution requires admin approval before running.",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "approve_execution": {
        const { execution_id } = body;
        const { data: exec } = await adminDb.from("ai_core_executions").select("*").eq("id", execution_id).single();
        if (!exec) return new Response(JSON.stringify({ error: "Execution not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

        const SANDBOX_URL = Deno.env.get("AI_CORE_SANDBOX_URL");
        const SANDBOX_KEY = Deno.env.get("AI_CORE_SANDBOX_KEY");
        if (!SANDBOX_URL || !SANDBOX_KEY) {
          return new Response(JSON.stringify({ error: "Sandbox not configured" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        const start = Date.now();
        try {
          const sandboxRes = await fetch(`${SANDBOX_URL}/execute`, {
            method: "POST",
            headers: { Authorization: `Bearer ${SANDBOX_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ code: (exec.input as any).code, language: (exec.input as any).language }),
          });
          const result = await sandboxRes.json();
          const duration = Date.now() - start;

          await adminDb.from("ai_core_executions").update({
            status: sandboxRes.ok ? "completed" : "failed",
            output: result,
            error_message: sandboxRes.ok ? null : JSON.stringify(result),
            approved_by: userId,
            approved_at: new Date().toISOString(),
            duration_ms: duration,
          }).eq("id", execution_id);

          return new Response(JSON.stringify({ result, duration_ms: duration }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        } catch (e) {
          await adminDb.from("ai_core_executions").update({
            status: "failed",
            error_message: e instanceof Error ? e.message : "Unknown error",
            approved_by: userId,
            approved_at: new Date().toISOString(),
            duration_ms: Date.now() - start,
          }).eq("id", execution_id);
          throw e;
        }
      }

      case "update_title": {
        const { conversation_id: cid, title } = body;
        await adminDb.from("ai_core_conversations").update({ title }).eq("id", cid);
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // === AI Memory Layer actions ===
      case "ai_memory_list": {
        const { data, error } = await adminDb.from("ai_memory").select("*").order("importance", { ascending: false }).limit(200);
        if (error) throw error;
        return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "ai_memory_delete": {
        const { id: memId } = body;
        const { error } = await adminDb.from("ai_memory").delete().eq("id", memId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "ai_memory_boost": {
        const { id: boostId, importance: newImp } = body;
        const { error } = await adminDb.from("ai_memory").update({ importance: Math.min(1, Math.max(0, newImp)) }).eq("id", boostId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (e) {
    console.error("ai-core-chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
