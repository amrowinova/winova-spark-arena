import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AI_SYSTEM_USER_ID = '00000000-0000-0000-0000-a10000000001';

// ─── Phase Definitions ────────────────────────────

const PHASES = ['clarification', 'architecture', 'stack', 'database', 'backend', 'frontend', 'infra', 'documentation', 'delivery'] as const;
type Phase = typeof PHASES[number];

const PHASE_LABELS: Record<Phase, string> = {
  clarification: '❓ مرحلة التوضيح',
  architecture: '🏗️ الهندسة المعمارية',
  stack: '⚙️ اختيار التقنيات',
  database: '🗄️ مخططات قاعدة البيانات',
  backend: '🔧 الخدمات الخلفية',
  frontend: '🎨 واجهات المستخدم',
  infra: '☁️ إعدادات البنية التحتية',
  documentation: '📋 التوثيق',
  delivery: '📦 حزمة التسليم',
};

// ─── AI Helpers ───────────────────────────────────

async function callAI(apiKey: string, systemPrompt: string, userPrompt: string, model = 'google/gemini-2.5-pro'): Promise<string> {
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 8000,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI call failed: ${response.status} — ${text}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

function parseJSON(text: string): any {
  let jsonStr = text;
  const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (match) jsonStr = match[1].trim();
  // Try to find JSON object/array
  const objMatch = jsonStr.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (objMatch) jsonStr = objMatch[1];
  return JSON.parse(jsonStr);
}

// ─── DM Helper ────────────────────────────────────

async function postDM(supabase: any, conversationId: string, content: string, messageType = 'build_progress') {
  await supabase.from('direct_messages').insert({
    conversation_id: conversationId,
    sender_id: AI_SYSTEM_USER_ID,
    content,
    message_type: messageType,
    is_read: false,
  });
}

async function logActivity(supabase: any, projectId: string, activityType: string, title: string, titleAr: string, description?: string, riskLevel = 'low') {
  await supabase.from('project_activity').insert({
    project_id: projectId,
    activity_type: activityType,
    title,
    title_ar: titleAr,
    description,
    risk_level: riskLevel,
  });
}

// ─── Phase Executors ──────────────────────────────

async function runClarification(apiKey: string, description: string): Promise<{ questions: string[]; title: string; title_ar: string }> {
  const systemPrompt = `أنت مهندس برمجيات خبير في WINOVA. مهمتك هي تحليل طلب البناء وإنتاج أسئلة توضيحية ذكية.
أجب بـ JSON فقط.`;

  const result = await callAI(apiKey, systemPrompt, `طلب البناء: "${description}"

أنتج:
1. عنوان مختصر للمشروع (title بالإنجليزية)
2. عنوان بالعربي (title_ar)
3. من 3-6 أسئلة توضيحية بالعربية لفهم المتطلبات بشكل أفضل

JSON format:
{
  "title": "...",
  "title_ar": "...",
  "questions": ["سؤال 1", "سؤال 2", ...]
}`);

  return parseJSON(result);
}

async function runArchitecture(apiKey: string, description: string, answers: string[]): Promise<any> {
  const systemPrompt = `أنت CTO في WINOVA. صمم هندسة معمارية كاملة للمشروع المطلوب.
أجب بـ JSON فقط.`;

  const context = answers.length > 0 ? `\n\nأجوبة التوضيح:\n${answers.map((a, i) => `${i + 1}. ${a}`).join('\n')}` : '';

  const result = await callAI(apiKey, systemPrompt, `المشروع: "${description}"${context}

صمم هندسة معمارية تتضمن:
- overview: ملخص عام
- components: قائمة المكونات الرئيسية مع الوصف
- data_flow: تدفق البيانات
- security_model: نموذج الأمان
- scalability: خطة التوسع
- risk_assessment: تقييم المخاطر (low/medium/high/critical)

JSON format:
{
  "overview": "...",
  "overview_ar": "...",
  "components": [{"name": "...", "description": "...", "type": "frontend|backend|database|service"}],
  "data_flow": "...",
  "security_model": "...",
  "scalability": "...",
  "risk_assessment": "medium",
  "risk_reason": "..."
}`);

  return parseJSON(result);
}

async function runStackSelection(apiKey: string, architecture: any): Promise<any> {
  const systemPrompt = `أنت خبير تقنيات في WINOVA. اختر أفضل التقنيات بناءً على الهندسة المعمارية.
البنية التحتية الحالية: React + Vite + Tailwind + TypeScript + Supabase (PostgreSQL + Edge Functions + Realtime + Auth + Storage)
أجب بـ JSON فقط.`;

  const result = await callAI(apiKey, systemPrompt, `الهندسة المعمارية:
${JSON.stringify(architecture, null, 2)}

اختر:
- frontend: التقنيات الأمامية
- backend: التقنيات الخلفية
- database: قاعدة البيانات
- auth: نظام المصادقة
- storage: التخزين
- realtime: الاتصال المباشر
- third_party: خدمات خارجية (إن وجدت)
- justification_ar: تبرير الاختيارات بالعربية

JSON format:
{
  "frontend": {"framework": "React", "ui": "shadcn/ui", "styling": "Tailwind CSS"},
  "backend": {"runtime": "Deno (Edge Functions)", "api": "REST"},
  "database": {"engine": "PostgreSQL (Supabase)", "orm": "Supabase Client"},
  "auth": "Supabase Auth",
  "storage": "Supabase Storage",
  "realtime": "Supabase Realtime",
  "third_party": [],
  "justification_ar": "..."
}`);

  return parseJSON(result);
}

async function runDatabaseDesign(apiKey: string, description: string, architecture: any, stack: any): Promise<any[]> {
  const systemPrompt = `أنت مهندس قواعد بيانات في WINOVA. صمم مخطط قاعدة البيانات.
استخدم صيغة SQL متوافقة مع Supabase/PostgreSQL.
أضف RLS policies وtriggers حيث يلزم.
أجب بـ JSON فقط.`;

  const result = await callAI(apiKey, systemPrompt, `المشروع: "${description}"
الهندسة: ${JSON.stringify(architecture.components || [])}

أنتج مخططات قاعدة البيانات:
[{
  "table_name": "...",
  "description": "...",
  "description_ar": "...",
  "sql": "CREATE TABLE public.xxx (...);",
  "rls_policies": "CREATE POLICY ...;",
  "indexes": "CREATE INDEX ...;"
}]`);

  return parseJSON(result);
}

async function runBackendDesign(apiKey: string, description: string, architecture: any, dbSchemas: any[]): Promise<any[]> {
  const systemPrompt = `أنت مهندس خلفي في WINOVA. صمم Edge Functions لـ Supabase.
كل function يجب أن تشمل: CORS, error handling, typed responses.
أجب بـ JSON فقط.`;

  const tables = dbSchemas.map(s => s.table_name).join(', ');

  const result = await callAI(apiKey, systemPrompt, `المشروع: "${description}"
الجداول: ${tables}

صمم الخدمات الخلفية:
[{
  "name": "function-name",
  "description": "...",
  "description_ar": "...",
  "method": "POST",
  "endpoint": "/functions/v1/function-name",
  "request_body": {},
  "response_body": {},
  "code_snippet": "// Main handler logic..."
}]`);

  return parseJSON(result);
}

async function runFrontendDesign(apiKey: string, description: string, architecture: any, backendServices: any[]): Promise<any[]> {
  const systemPrompt = `أنت مهندس واجهات في WINOVA. صمم مكونات React مع shadcn/ui + Tailwind.
استخدم design tokens (لا ألوان مباشرة). اجعلها responsive ومتوافقة مع RTL.
أجب بـ JSON فقط.`;

  const endpoints = backendServices.map(s => `${s.method} ${s.endpoint}`).join('\n');

  const result = await callAI(apiKey, systemPrompt, `المشروع: "${description}"
الخدمات: ${endpoints}

صمم مكونات الواجهة:
[{
  "component_name": "ComponentName",
  "file_path": "src/components/...",
  "description": "...",
  "description_ar": "...",
  "props": {},
  "hooks_used": [],
  "code_snippet": "// Component skeleton..."
}]`);

  return parseJSON(result);
}

async function runInfraConfig(apiKey: string, architecture: any, stack: any, backendServices: any[]): Promise<any> {
  const systemPrompt = `أنت مهندس بنية تحتية في WINOVA. جهز إعدادات النشر.
أجب بـ JSON فقط.`;

  const result = await callAI(apiKey, systemPrompt, `التقنيات: ${JSON.stringify(stack)}
الخدمات: ${backendServices.map(s => s.name).join(', ')}

أنتج:
{
  "config_toml_entries": "[functions.xxx]\\nverify_jwt = false",
  "env_variables": [{"name": "VAR_NAME", "description": "...", "required": true}],
  "storage_buckets": [{"name": "...", "public": false}],
  "realtime_tables": ["table_name"],
  "cron_jobs": [],
  "notes_ar": "ملاحظات إضافية..."
}`);

  return parseJSON(result);
}

async function runDocumentation(apiKey: string, projectTitle: string, architecture: any, dbSchemas: any[], backendServices: any[], frontendComponents: any[], infra: any): Promise<{ api_docs: any; run_instructions: string }> {
  const systemPrompt = `أنت كاتب توثيق تقني في WINOVA. أنتج توثيقاً شاملاً بالعربية.
أجب بـ JSON فقط.`;

  const result = await callAI(apiKey, systemPrompt, `المشروع: ${projectTitle}
الجداول: ${dbSchemas.length}
الخدمات: ${backendServices.length}
المكونات: ${frontendComponents.length}

أنتج:
{
  "api_docs": {
    "title": "...",
    "endpoints": [{"method": "POST", "path": "/functions/v1/xxx", "description": "...", "request": {}, "response": {}}]
  },
  "run_instructions": "خطوات التشغيل:\\n1. ...\\n2. ..."
}`);

  return parseJSON(result);
}

// ─── Build Report Generator ──────────────────────

function generateBuildReport(project: any): string {
  const phases = project.phase_progress || {};
  const dbCount = (project.db_schemas || []).length;
  const beCount = (project.backend_services || []).length;
  const feCount = (project.frontend_components || []).length;

  return `📦 **تقرير حزمة البناء — ${project.title_ar || project.title}**
━━━━━━━━━━━━━━━━━━━━━━

🏗️ **الهندسة المعمارية:**
${project.architecture?.overview_ar || project.architecture?.overview || '—'}

⚙️ **التقنيات المختارة:**
• Frontend: ${project.stack_choices?.frontend?.framework || 'React'} + ${project.stack_choices?.frontend?.ui || 'shadcn/ui'}
• Backend: ${project.stack_choices?.backend?.runtime || 'Edge Functions'}
• Database: ${project.stack_choices?.database?.engine || 'PostgreSQL'}

🗄️ **قاعدة البيانات:** ${dbCount} جدول
${(project.db_schemas || []).map((s: any) => `  • ${s.table_name}: ${s.description_ar || s.description}`).join('\n')}

🔧 **الخدمات الخلفية:** ${beCount} خدمة
${(project.backend_services || []).map((s: any) => `  • ${s.name}: ${s.description_ar || s.description}`).join('\n')}

🎨 **واجهات المستخدم:** ${feCount} مكون
${(project.frontend_components || []).map((c: any) => `  • ${c.component_name}: ${c.description_ar || c.description}`).join('\n')}

☁️ **البنية التحتية:**
${project.infra_config?.notes_ar || '—'}

📊 **تقييم المخاطر:** ${project.risk_level === 'low' ? '🟢 منخفض' : project.risk_level === 'medium' ? '🟡 متوسط' : project.risk_level === 'high' ? '🟠 مرتفع' : '🔴 حرج'}

🧠 **النموذج:** ${project.model_used}
⏱️ **المدة:** ${project.duration_ms ? (project.duration_ms / 1000).toFixed(1) + 's' : '—'}

━━━━━━━━━━━━━━━━━━━━━━
build_project_id: ${project.id}
status: review
━━━━━━━━━━━━━━━━━━━━━━

✅ الحزمة جاهزة للمراجعة.
هل تريد الموافقة على التنفيذ؟`;
}

// ─── Main Handler ─────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // ── Auth Gate: Service Role or Admin ──
  {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const svcKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    if (token !== svcKey) {
      const authClient = createClient(Deno.env.get('SUPABASE_URL')!, svcKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: { user } } = await authClient.auth.getUser(token);
      if (!user) {
        return new Response(JSON.stringify({ error: 'Invalid token' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const { data: roles } = await authClient.from('user_roles').select('role').eq('user_id', user.id);
      if (!roles?.some((r: any) => r.role === 'admin')) {
        return new Response(JSON.stringify({ error: 'Admin access required' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }
  }

  const t0 = Date.now();

  try {
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) throw new Error('LOVABLE_API_KEY not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { action, project_id, description, conversation_id, answers, requested_by } = body;

    // ─── Action: Start New Build ──────────────────
    if (action === 'start') {
      if (!description || !conversation_id) {
        throw new Error('Missing description or conversation_id');
      }

      // Phase 1: Clarification
      await postDM(supabase, conversation_id,
        `🏭 **مصنع WINOVA — بدء مشروع جديد**\n\n📝 الطلب: "${description}"\n\n${PHASE_LABELS.clarification}\nجاري تحليل المتطلبات...`
      );

      const clarification = await runClarification(apiKey, description);

      // Create project record
      const { data: project, error: projErr } = await supabase
        .from('ai_build_projects')
        .insert({
          requested_by: requested_by || AI_SYSTEM_USER_ID,
          title: clarification.title,
          title_ar: clarification.title_ar,
          description,
          description_ar: description,
          conversation_id,
          status: 'clarifying',
          current_phase: 'clarification',
          clarification_questions: clarification.questions,
          phase_progress: { clarification: 'completed' },
        })
        .select('id')
        .single();

      if (projErr) throw projErr;

      // Log activity
      await logActivity(supabase, project.id, 'project_created', 'Project created', 'تم إنشاء المشروع', clarification.title_ar);

      // Post questions to DM
      const questionsText = clarification.questions
        .map((q: string, i: number) => `${i + 1}. ${q}`)
        .join('\n');

      await postDM(supabase, conversation_id,
        `❓ **أسئلة توضيحية — ${clarification.title_ar}**\n\n${questionsText}\n\n━━━━━━━━━━━━━━━━━━━━━━\nbuild_project_id: ${project.id}\nphase: clarification\n━━━━━━━━━━━━━━━━━━━━━━\n\nيرجى الرد على الأسئلة أعلاه أو كتابة "تخطي" للمتابعة مباشرة.`,
        'build_clarification'
      );

      return new Response(JSON.stringify({
        success: true,
        project_id: project.id,
        phase: 'clarification',
        questions: clarification.questions,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ─── Action: Continue Build (after clarification) ──
    if (action === 'continue') {
      if (!project_id) throw new Error('Missing project_id');

      const { data: project, error: fetchErr } = await supabase
        .from('ai_build_projects')
        .select('*')
        .eq('id', project_id)
        .single();

      if (fetchErr || !project) throw new Error('Project not found');

      const convId = project.conversation_id;

      // Save answers if provided
      if (answers?.length > 0) {
        await supabase.from('ai_build_projects').update({
          clarification_answers: answers,
          status: 'planning',
        }).eq('id', project_id);
      }

      // ─── Phase 2: Architecture ───────────────────
      await postDM(supabase, convId,
        `${PHASE_LABELS.architecture}\nجاري تصميم الهندسة المعمارية...`
      );

      const architecture = await runArchitecture(apiKey, project.description, answers || []);

      await supabase.from('ai_build_projects').update({
        architecture,
        risk_level: architecture.risk_assessment || 'medium',
        current_phase: 'architecture',
        phase_progress: { ...project.phase_progress, architecture: 'completed' },
      }).eq('id', project_id);

      await logActivity(supabase, project_id, 'phase_complete', 'Architecture designed', 'تم تصميم الهندسة المعمارية', architecture.overview_ar, architecture.risk_assessment || 'medium');

      await postDM(supabase, convId,
        `✅ **الهندسة المعمارية**\n\n${architecture.overview_ar || architecture.overview}\n\n**المكونات:**\n${(architecture.components || []).map((c: any) => `• ${c.name} (${c.type}): ${c.description}`).join('\n')}\n\n**المخاطر:** ${architecture.risk_assessment} — ${architecture.risk_reason || ''}`
      );

      // ─── Phase 3: Stack Selection ────────────────
      await postDM(supabase, convId,
        `${PHASE_LABELS.stack}\nجاري اختيار أفضل التقنيات...`
      );

      const stack = await runStackSelection(apiKey, architecture);

      await supabase.from('ai_build_projects').update({
        stack_choices: stack,
        current_phase: 'stack',
        phase_progress: { ...project.phase_progress, architecture: 'completed', stack: 'completed' },
      }).eq('id', project_id);

      await logActivity(supabase, project_id, 'phase_complete', 'Stack selected', 'تم اختيار التقنيات');

      await postDM(supabase, convId,
        `✅ **التقنيات المختارة**\n\n• Frontend: ${stack.frontend?.framework} + ${stack.frontend?.ui}\n• Backend: ${stack.backend?.runtime}\n• Database: ${stack.database?.engine}\n• Auth: ${stack.auth}\n\n${stack.justification_ar || ''}`
      );

      // ─── Phase 4: Database ───────────────────────
      await postDM(supabase, convId,
        `${PHASE_LABELS.database}\nجاري تصميم قاعدة البيانات...`
      );

      const dbSchemas = await runDatabaseDesign(apiKey, project.description, architecture, stack);

      await supabase.from('ai_build_projects').update({
        db_schemas: dbSchemas,
        current_phase: 'database',
        phase_progress: { ...project.phase_progress, architecture: 'completed', stack: 'completed', database: 'completed' },
      }).eq('id', project_id);

      await logActivity(supabase, project_id, 'phase_complete', `Database designed (${dbSchemas.length} tables)`, `تم تصميم قاعدة البيانات (${dbSchemas.length} جدول)`);

      await postDM(supabase, convId,
        `✅ **قاعدة البيانات — ${dbSchemas.length} جدول**\n\n${dbSchemas.map((s: any) => `🗄️ **${s.table_name}**\n${s.description_ar || s.description}\n\`\`\`sql\n${(s.sql || '').slice(0, 300)}${(s.sql || '').length > 300 ? '...' : ''}\n\`\`\``).join('\n\n')}`
      );

      // ─── Phase 5: Backend ────────────────────────
      await postDM(supabase, convId,
        `${PHASE_LABELS.backend}\nجاري تصميم الخدمات الخلفية...`
      );

      const backendServices = await runBackendDesign(apiKey, project.description, architecture, dbSchemas);

      await supabase.from('ai_build_projects').update({
        backend_services: backendServices,
        current_phase: 'backend',
        phase_progress: { ...project.phase_progress, architecture: 'completed', stack: 'completed', database: 'completed', backend: 'completed' },
      }).eq('id', project_id);

      await logActivity(supabase, project_id, 'phase_complete', `Backend built (${backendServices.length} services)`, `تم بناء الخدمات (${backendServices.length} خدمة)`);

      await postDM(supabase, convId,
        `✅ **الخدمات الخلفية — ${backendServices.length} خدمة**\n\n${backendServices.map((s: any) => `🔧 **${s.name}** (${s.method})\n${s.description_ar || s.description}`).join('\n\n')}`
      );

      // ─── Phase 6: Frontend ───────────────────────
      await postDM(supabase, convId,
        `${PHASE_LABELS.frontend}\nجاري تصميم واجهات المستخدم...`
      );

      const frontendComponents = await runFrontendDesign(apiKey, project.description, architecture, backendServices);

      await supabase.from('ai_build_projects').update({
        frontend_components: frontendComponents,
        current_phase: 'frontend',
        phase_progress: { ...project.phase_progress, architecture: 'completed', stack: 'completed', database: 'completed', backend: 'completed', frontend: 'completed' },
      }).eq('id', project_id);

      await logActivity(supabase, project_id, 'phase_complete', `Frontend designed (${frontendComponents.length} components)`, `تم تصميم الواجهات (${frontendComponents.length} مكون)`);

      await postDM(supabase, convId,
        `✅ **واجهات المستخدم — ${frontendComponents.length} مكون**\n\n${frontendComponents.map((c: any) => `🎨 **${c.component_name}**\n📁 ${c.file_path}\n${c.description_ar || c.description}`).join('\n\n')}`
      );

      // ─── Phase 7: Infrastructure ─────────────────
      await postDM(supabase, convId,
        `${PHASE_LABELS.infra}\nجاري إعداد البنية التحتية...`
      );

      const infra = await runInfraConfig(apiKey, architecture, stack, backendServices);

      await supabase.from('ai_build_projects').update({
        infra_config: infra,
        env_variables: infra.env_variables || [],
        current_phase: 'infra',
        phase_progress: { ...project.phase_progress, architecture: 'completed', stack: 'completed', database: 'completed', backend: 'completed', frontend: 'completed', infra: 'completed' },
      }).eq('id', project_id);

      await logActivity(supabase, project_id, 'phase_complete', 'Infrastructure configured', 'تم إعداد البنية التحتية');

      await postDM(supabase, convId,
        `✅ **البنية التحتية**\n\n${infra.notes_ar || ''}\n\n${(infra.env_variables || []).length > 0 ? `🔑 متغيرات البيئة:\n${infra.env_variables.map((v: any) => `• ${v.name}: ${v.description}`).join('\n')}` : ''}`
      );

      // ─── Phase 8: Documentation ──────────────────
      await postDM(supabase, convId,
        `${PHASE_LABELS.documentation}\nجاري إنتاج التوثيق...`
      );

      const docs = await runDocumentation(apiKey, project.title, architecture, dbSchemas, backendServices, frontendComponents, infra);

      const updatedProject = {
        ...project,
        architecture,
        stack_choices: stack,
        db_schemas: dbSchemas,
        backend_services: backendServices,
        frontend_components: frontendComponents,
        infra_config: infra,
        api_docs: docs.api_docs,
        run_instructions: docs.run_instructions,
        duration_ms: Date.now() - t0,
      };

      await supabase.from('ai_build_projects').update({
        api_docs: docs.api_docs,
        run_instructions: docs.run_instructions,
        status: 'review',
        current_phase: 'delivery',
        duration_ms: Date.now() - t0,
        phase_progress: { clarification: 'completed', architecture: 'completed', stack: 'completed', database: 'completed', backend: 'completed', frontend: 'completed', infra: 'completed', documentation: 'completed', delivery: 'completed' },
      }).eq('id', project_id);

      // ─── Phase 9: Delivery Report ────────────────
      const report = generateBuildReport(updatedProject);
      await postDM(supabase, convId, report, 'build_delivery');
      await logActivity(supabase, project_id, 'project_delivered', 'Build package delivered', 'تم تسليم حزمة البناء', `Duration: ${((Date.now() - t0) / 1000).toFixed(1)}s`);

      return new Response(JSON.stringify({
        success: true,
        project_id,
        status: 'review',
        duration_ms: Date.now() - t0,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ─── Action: Get project status ───────────────
    if (action === 'status') {
      if (!project_id) throw new Error('Missing project_id');

      const { data: project } = await supabase
        .from('ai_build_projects')
        .select('*')
        .eq('id', project_id)
        .single();

      return new Response(JSON.stringify({
        success: true,
        project,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (err) {
    console.error('[Build Engine] Error:', err);

    // Try to post failure to DM
    try {
      const body = await req.clone().json().catch(() => ({}));
      if (body.conversation_id) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, serviceRoleKey);

        await postDM(supabase, body.conversation_id,
          `❌ **فشل في عملية البناء**\n\nالسبب: ${err instanceof Error ? err.message : 'خطأ غير معروف'}\n\n💡 اقتراح: حاول تبسيط الطلب أو تقسيمه إلى مراحل أصغر.`,
          'build_error'
        );
      }
    } catch { /* ignore */ }

    return new Response(JSON.stringify({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
