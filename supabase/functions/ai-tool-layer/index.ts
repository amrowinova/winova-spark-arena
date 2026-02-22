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

    const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").single();
    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { action } = body;

    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminDb = createClient(supabaseUrl, serviceKey);

    switch (action) {
      // ===== PROJECT CRUD =====
      case "project_create": {
        const { name, description, stack } = body;
        if (!name) return new Response(JSON.stringify({ error: "name is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const { data, error } = await adminDb.from("ai_projects").insert({ name, description: description || null, stack: stack || null, created_by: userId }).select().single();
        if (error) throw error;
        return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "project_list": {
        const { data, error } = await adminDb.from("ai_projects").select("*").order("created_at", { ascending: false }).limit(100);
        if (error) throw error;
        return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "project_delete": {
        const { project_id } = body;
        const { error } = await adminDb.from("ai_projects").delete().eq("id", project_id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ===== FILE CRUD =====
      case "file_write": {
        const { project_id, path, content, language } = body;
        if (!project_id || !path) return new Response(JSON.stringify({ error: "project_id and path required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

        // Upsert: check if file exists
        const { data: existing } = await adminDb.from("ai_files").select("id").eq("project_id", project_id).eq("path", path).single();
        let data;
        if (existing) {
          const { data: updated, error } = await adminDb.from("ai_files").update({ content, language: language || null, last_modified: new Date().toISOString() }).eq("id", existing.id).select().single();
          if (error) throw error;
          data = updated;
        } else {
          const { data: created, error } = await adminDb.from("ai_files").insert({ project_id, path, content, language: language || null }).select().single();
          if (error) throw error;
          data = created;
        }
        return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "file_read": {
        const { project_id: pid, path: fpath } = body;
        const { data, error } = await adminDb.from("ai_files").select("*").eq("project_id", pid).eq("path", fpath).single();
        if (error) throw error;
        return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "file_list": {
        const { project_id: pid2 } = body;
        const { data, error } = await adminDb.from("ai_files").select("id, path, language, last_modified, created_at").eq("project_id", pid2).order("last_modified", { ascending: false });
        if (error) throw error;
        return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "file_delete": {
        const { file_id } = body;
        const { error } = await adminDb.from("ai_files").delete().eq("id", file_id);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ===== EXECUTION SANDBOX =====
      case "execute_request": {
        const { project_id: execPid, code, language: execLang } = body;
        if (!code) return new Response(JSON.stringify({ error: "code is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const { data, error } = await adminDb.from("ai_project_executions").insert({
          project_id: execPid || null,
          code,
          language: execLang || "typescript",
          status: "pending",
          requested_by: userId,
        }).select().single();
        if (error) throw error;
        return new Response(JSON.stringify({ data, message: "Execution pending admin approval" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "execute_approve": {
        const { execution_id } = body;
        const { data: exec, error: fetchErr } = await adminDb.from("ai_project_executions").select("*").eq("id", execution_id).single();
        if (fetchErr || !exec) return new Response(JSON.stringify({ error: "Execution not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

        if (exec.status !== "pending") {
          return new Response(JSON.stringify({ error: `Cannot approve execution with status: ${exec.status}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        // Simulated sandbox execution (safe eval placeholder)
        const start = Date.now();
        try {
          // In production, this would call an isolated sandbox service
          const SANDBOX_URL = Deno.env.get("AI_CORE_SANDBOX_URL");
          const SANDBOX_KEY = Deno.env.get("AI_CORE_SANDBOX_KEY");
          let output = "Sandbox not configured. Code logged for review.";

          if (SANDBOX_URL && SANDBOX_KEY) {
            const sandboxRes = await fetch(`${SANDBOX_URL}/execute`, {
              method: "POST",
              headers: { Authorization: `Bearer ${SANDBOX_KEY}`, "Content-Type": "application/json" },
              body: JSON.stringify({ code: exec.code, language: exec.language, timeout_ms: 10000, max_memory_mb: 128 }),
            });
            const result = await sandboxRes.json();
            output = JSON.stringify(result);
          }

          await adminDb.from("ai_project_executions").update({
            status: "completed",
            output,
            approved_by: userId,
            approved_at: new Date().toISOString(),
            duration_ms: Date.now() - start,
          }).eq("id", execution_id);

          return new Response(JSON.stringify({ output, duration_ms: Date.now() - start }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        } catch (e) {
          await adminDb.from("ai_project_executions").update({
            status: "failed",
            error_message: e instanceof Error ? e.message : "Unknown error",
            approved_by: userId,
            approved_at: new Date().toISOString(),
            duration_ms: Date.now() - start,
          }).eq("id", execution_id);
          throw e;
        }
      }

      case "execute_reject": {
        const { execution_id: rejId } = body;
        await adminDb.from("ai_project_executions").update({ status: "rejected", approved_by: userId, approved_at: new Date().toISOString() }).eq("id", rejId);
        return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      case "execute_list": {
        const { project_id: execListPid } = body;
        let query = adminDb.from("ai_project_executions").select("*").order("created_at", { ascending: false }).limit(50);
        if (execListPid) query = query.eq("project_id", execListPid);
        const { data, error } = await query;
        if (error) throw error;
        return new Response(JSON.stringify({ data }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ===== PROJECT CONTEXT (for injection) =====
      case "project_context": {
        const { project_id: ctxPid } = body;
        if (!ctxPid) return new Response(JSON.stringify({ error: "project_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

        // Get all file paths
        const { data: allFiles } = await adminDb.from("ai_files").select("path, language").eq("project_id", ctxPid).order("last_modified", { ascending: false });

        // Get top 20 most recent files with content (truncated)
        const { data: recentFiles } = await adminDb.from("ai_files").select("path, content, language").eq("project_id", ctxPid).order("last_modified", { ascending: false }).limit(20);

        const MAX_CONTENT_LENGTH = 2000;
        const contextFiles = (recentFiles || []).map(f => ({
          path: f.path,
          language: f.language,
          content: f.content ? f.content.slice(0, MAX_CONTENT_LENGTH) + (f.content.length > MAX_CONTENT_LENGTH ? "\n// ... truncated" : "") : "",
        }));

        return new Response(JSON.stringify({ files: allFiles || [], context: contextFiles }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ===== DEPLOYMENT PLANNER =====
      case "generate_deployment": {
        const { project_id: deployPid } = body;
        if (!deployPid) return new Response(JSON.stringify({ error: "project_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

        const { data: project } = await adminDb.from("ai_projects").select("*").eq("id", deployPid).single();
        const { data: files } = await adminDb.from("ai_files").select("path, language").eq("project_id", deployPid);

        if (!project) return new Response(JSON.stringify({ error: "Project not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

        const fileList = (files || []).map(f => f.path).join("\n");
        const stack = project.stack || "React + TypeScript + Supabase";

        const dockerfile = `FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]`;

        const envExample = `# ${project.name} - Environment Variables
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
# Add any additional API keys below`;

        const readme = `# ${project.name}

${project.description || ""}

## Stack
${stack}

## Files
\`\`\`
${fileList}
\`\`\`

## Getting Started

\`\`\`bash
npm install
npm run dev
\`\`\`

## Deployment

### Supabase
1. Create project at supabase.com
2. Copy project URL and anon key to \`.env\`
3. Run migrations: \`supabase db push\`
4. Deploy edge functions: \`supabase functions deploy\`

### Vercel
1. Connect GitHub repo to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push

### Railway
1. Create new project on Railway
2. Connect GitHub repo
3. Add environment variables
4. Deploy

### Render
1. Create new Web Service on Render
2. Connect GitHub repo
3. Set build command: \`npm run build\`
4. Set start command: \`npx serve dist\`
5. Add environment variables

### Docker
\`\`\`bash
docker build -t ${project.name.toLowerCase().replace(/\s+/g, "-")} .
docker run -p 80:80 ${project.name.toLowerCase().replace(/\s+/g, "-")}
\`\`\`
`;

        // Store deployment artifacts as files
        const deployFiles = [
          { path: "Dockerfile", content: dockerfile, language: "dockerfile" },
          { path: ".env.example", content: envExample, language: "env" },
          { path: "README.md", content: readme, language: "markdown" },
        ];

        for (const df of deployFiles) {
          const { data: existing } = await adminDb.from("ai_files").select("id").eq("project_id", deployPid).eq("path", df.path).single();
          if (existing) {
            await adminDb.from("ai_files").update({ content: df.content, language: df.language, last_modified: new Date().toISOString() }).eq("id", existing.id);
          } else {
            await adminDb.from("ai_files").insert({ project_id: deployPid, path: df.path, content: df.content, language: df.language });
          }
        }

        return new Response(JSON.stringify({
          success: true,
          artifacts: deployFiles.map(f => f.path),
          message: "Deployment artifacts generated: Dockerfile, .env.example, README.md",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      default:
        return new Response(JSON.stringify({ error: "Unknown action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  } catch (e) {
    console.error("ai-tool-layer error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
