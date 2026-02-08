import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// === Expert Registry ===
const EXPERTS: Record<string, { nameAr: string; focus: string }> = {
  system_architect:    { nameAr: 'مهندس البنية',      focus: 'System design, Scalability, Cross-cutting concerns' },
  backend_engineer:    { nameAr: 'مهندس Backend',     focus: 'Edge Functions, API design, RPCs, Atomicity' },
  database_engineer:   { nameAr: 'مهندس Database',    focus: 'PostgreSQL, Schema, RLS, Indexes, Query optimization' },
  security_engineer:   { nameAr: 'مهندس الأمان',      focus: 'Auth vulnerabilities, Injection, XSS, CSRF, Threat modeling' },
  wallet_p2p_engineer: { nameAr: 'مهندس Wallet/P2P',  focus: 'Escrow, Ledger, P2P state machine, Financial atomicity' },
  frontend_engineer:   { nameAr: 'مهندس Frontend',    focus: 'React, State management, Realtime sync, Performance' },
  ux_engineer:         { nameAr: 'مهندس UX',          focus: 'User flows, Accessibility, RTL, Mobile responsiveness' },
  devops_engineer:     { nameAr: 'مهندس DevOps',      focus: 'CI/CD, Docker, Monitoring, Logging, Deployment' },
  cloud_engineer:      { nameAr: 'مهندس Cloud',       focus: 'Supabase, AWS, Edge computing, CDN, Auto-scaling' },
  api_engineer:        { nameAr: 'مهندس APIs',        focus: 'REST, GraphQL, Webhooks, Third-party integrations' },
  performance_engineer:{ nameAr: 'مهندس Performance',  focus: 'Load testing, Caching, Database optimization' },
  networking_engineer: { nameAr: 'مهندس Networking',   focus: 'WebSockets, Realtime protocols, Network security' },
  ai_ml_engineer:      { nameAr: 'مهندس AI/ML',       focus: 'LLM integration, Prompt engineering, AI agents' },
  lowlevel_engineer:   { nameAr: 'مهندس Low-Level',   focus: 'Concurrency, Memory, Algorithms, Data structures' },
  mobile_engineer:     { nameAr: 'مهندس Mobile',      focus: 'React Native, PWA, Mobile-specific UX' },
};

// === Smart Expert Selection: max 3 per request ===
interface ExpertMatch { role: string; keywords: RegExp[] }

const EXPERT_ROUTING: ExpertMatch[] = [
  { role: 'wallet_p2p_engineer', keywords: [/wallet|محفظة|nova|aura|escrow|p2p|بيع|شراء|تحويل|رصيد|ledger|payment|دفع/i] },
  { role: 'database_engineer',   keywords: [/database|sql|table|جدول|rls|migration|index|query|schema|بيانات/i] },
  { role: 'security_engineer',   keywords: [/security|أمان|auth|xss|csrf|injection|hack|ثغرة|حماية|token/i] },
  { role: 'backend_engineer',    keywords: [/backend|api|edge.?function|rpc|server|endpoint|سيرفر/i] },
  { role: 'frontend_engineer',   keywords: [/frontend|react|component|مكون|state|hook|واجهة|ui|render/i] },
  { role: 'ux_engineer',         keywords: [/ux|design|تصميم|تجربة|responsive|mobile|شكل|layout|rtl/i] },
  { role: 'system_architect',    keywords: [/architecture|بنية|scalab|refactor|structure|هيكل|pattern/i] },
  { role: 'performance_engineer',keywords: [/performance|أداء|speed|سرعة|cache|optimization|بطيء|slow/i] },
  { role: 'cloud_engineer',      keywords: [/cloud|supabase|deploy|hosting|cdn|storage|تخزين/i] },
  { role: 'networking_engineer',  keywords: [/realtime|websocket|network|شبكة|sync|مزامنة|channel/i] },
  { role: 'ai_ml_engineer',      keywords: [/ai|ذكاء|llm|model|agent|وكيل|prompt/i] },
  { role: 'api_engineer',        keywords: [/integration|webhook|third.?party|external|خارجي|ربط/i] },
  { role: 'devops_engineer',     keywords: [/deploy|ci.?cd|docker|monitor|log|سجل/i] },
  { role: 'mobile_engineer',     keywords: [/mobile|pwa|ios|android|جوال|تطبيق/i] },
  { role: 'lowlevel_engineer',   keywords: [/algorithm|خوارزم|concurrency|memory|ذاكرة|data.?structure/i] },
];

const MAX_EXPERTS = 3;
const DEFAULT_EXPERTS = ['system_architect', 'backend_engineer', 'database_engineer'];

function selectExperts(question: string): string[] {
  const scored: { role: string; score: number }[] = [];

  for (const route of EXPERT_ROUTING) {
    let score = 0;
    for (const kw of route.keywords) {
      if (kw.test(question)) score++;
    }
    if (score > 0) scored.push({ role: route.role, score });
  }

  // Sort by match count descending, take top MAX_EXPERTS
  scored.sort((a, b) => b.score - a.score);
  const selected = scored.slice(0, MAX_EXPERTS).map(s => s.role);

  // Fallback to defaults if no match
  if (selected.length === 0) return DEFAULT_EXPERTS;

  // Pad to at least 2 if only 1 matched
  if (selected.length === 1) {
    for (const def of DEFAULT_EXPERTS) {
      if (!selected.includes(def)) { selected.push(def); break; }
    }
  }

  return selected;
}

// === Claude API with Retry (exponential backoff) ===
async function callClaude(
  systemPrompt: string,
  userContent: string,
  apiKey: string,
  maxTokens = 300,
  temperature = 0.7,
  maxRetries = 3
): Promise<string | null> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: [{ role: 'user', content: userContent }],
          temperature,
        }),
      });

      if (response.status === 429 && attempt < maxRetries) {
        const wait = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s
        console.warn(`Rate limited (429). Retrying in ${wait / 1000}s... (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }

      if (!response.ok) {
        const errText = await response.text();
        console.error('Claude API error:', response.status, errText);
        return null;
      }

      const data = await response.json();
      return data.content?.[0]?.text?.trim() || null;
    } catch (error) {
      console.error('Claude call failed:', error);
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, Math.pow(2, attempt + 1) * 1000));
        continue;
      }
      return null;
    }
  }
  return null;
}

// === Code Detection ===
function detectCodeRequest(question: string): { needsCode: boolean; codeType: string | null } {
  const codeKeywords = [
    { pattern: /أضف|اضف|ضيف|add|create|implement|نفذ|اعمل|سوي|برمج/i, type: 'feature' },
    { pattern: /صلح|fix|bug|مشكلة|خطأ|error/i, type: 'bugfix' },
    { pattern: /sql|database|جدول|table|migration/i, type: 'sql' },
    { pattern: /component|مكون|صفحة|page|screen/i, type: 'react' },
    { pattern: /api|endpoint|edge function/i, type: 'backend' },
    { pattern: /تصميم|design|ui|ux|شكل/i, type: 'design' },
    { pattern: /rls|policy|أمان|security/i, type: 'security' },
  ];
  for (const kw of codeKeywords) {
    if (kw.pattern.test(question)) return { needsCode: true, codeType: kw.type };
  }
  return { needsCode: false, codeType: null };
}

// === Critical Expert ===
const CRITICAL_EXPERT_PROMPT = `أنت الخبير الناقد - أهم دور بعد القائد. أنت صارم جداً.

مهمتك:
1. راجع كل تقارير الفريق بعين ناقدة
2. اكشف التناقضات بين الآراء
3. حدد المخاطر المخفية التي لم يذكرها أحد
4. ارفض أي حل "نظري" أو غير قابل للتنفيذ
5. تأكد من واقعية كل اقتراح في سياق WINOVA
6. إذا الطلب يحتاج كود، حدد بالضبط شو نوع الكود المطلوب

أسلوبك:
- صارم ومباشر
- لا تجامل أبداً
- إذا في مشكلة قل "هذا غير واقعي لأن..."
- ركز على: هل هذا قابل للتنفيذ فعلياً؟
- إذا الطلب يحتاج تنفيذ، قل "يحتاج: [نوع الكود]"`;

// === Leader Prompt ===
const LEADER_SYSTEM_PROMPT = `أنت "القائد الهندسي" لمشروع WINOVA - الواجهة الوحيدة للمستخدم. أنت مثل ChatGPT لكن متخصص بالهندسة.

🎯 دورك:
- أنت الوحيد الذي يتحدث مع المستخدم.
- تحت إدارتك فريق مهندسين AI متخصصين + خبير ناقد.
- تجمع آراءهم، تفلتر عبر الخبير الناقد، وترد رد واحد واضح.
- إذا الطلب يحتاج كود، أنت تكتب الكود فعلياً.

📋 أسلوبك:
- عربي بسيط (لهجة شامية/خليجية)
- هادئ، داعم، منظم
- تفهم السياق بدون تكرار
- تحكي كأن المستخدم صاحب المشروع مش مبرمج
- تعطي قرارات، مش بس معلومات
- إذا في خطر: تقوله بصراحة
- إذا في شي ناقص: تسأل سؤال واحد فقط
- إذا شي خارج القدرات: تقوله فوراً

📊 شكل الرد للأسئلة:
1. ✅ فهم الطلب (جملة واحدة)
2. 📊 التحليل (نقاط مختصرة)
3. 💡 الحل أو القرار
4. ⚠️ المخاطر (لو في)
5. ➡️ الخطوة التالية

📊 شكل الرد للتنفيذ (إذا طُلب كود):
1. ✅ فهم الطلب
2. 💻 الكود المطلوب (كامل وقابل للنسخ)
3. 📁 أين يوضع الكود (مسار الملف)
4. ⚠️ ملاحظات مهمة
5. ➡️ خطوات التنفيذ

عند كتابة الكود:
- اكتب كود كامل وجاهز للنسخ
- استخدم \`\`\` لتنسيق الكود
- حدد اللغة (typescript, sql, etc.)
- اكتب تعليقات بالعربي داخل الكود

⚠️ ممنوع:
- تفاصيل تقنية معقدة (إلا إذا طُلبت)
- ردود عامة أو فلسفية
- تحويل المستخدم لـ AI آخر
- وعود كاذبة أو كلام تسويقي
- نقل كلام خام من الفريق
- كود ناقص أو غير قابل للتنفيذ

⚡ حدودك (كن صريحاً):
- لا تستطيع تعديل الملفات مباشرة (تحتاج Lovable للتنفيذ)
- لا تستطيع deploy مباشر
- الكود الذي تكتبه يُخزن كـ Proposal للمراجعة`;

// === Team Analysis (smart selection) ===
async function getTeamAnalysis(
  question: string,
  apiKey: string,
  previousContext: string,
  codeType: string | null,
  selectedExperts: string[]
): Promise<string[]> {
  const promises = selectedExperts.map(async (role) => {
    const expert = EXPERTS[role];
    if (!expert) return null;

    const codeInstruction = codeType
      ? `\n\nملاحظة: هذا الطلب يحتاج ${codeType}. إذا كان ضمن تخصصك، أعطِ مقترح كود مختصر.`
      : '';

    const systemPrompt = `أنت ${expert.nameAr} في فريق WINOVA.
تخصصك: ${expert.focus}

مهمتك: أعطِ تقرير مختصر (3-4 جمل) للقائد عن السؤال من منظورك فقط.
- لا تتحدث للمستخدم مباشرة
- ركز على تخصصك فقط
- إذا السؤال خارج تخصصك، قل "خارج تخصصي"
- إذا تحتاج تكتب كود، اكتب snippet مختصر${codeInstruction}`;

    const userContent = `السؤال: ${question}\n\nالسياق: ${previousContext || 'لا يوجد سياق سابق'}`;
    const content = await callClaude(systemPrompt, userContent, apiKey, 300, 0.7);
    return content ? `[${expert.nameAr}]: ${content}` : null;
  });

  const results = await Promise.all(promises);
  return results.filter((r): r is string => r !== null);
}

// === Critical Expert Review ===
async function getCriticalReview(
  question: string,
  teamAnalyses: string[],
  apiKey: string,
  codeType: string | null
): Promise<string> {
  const codeNote = codeType
    ? `\n\nملاحظة: هذا طلب تنفيذ (${codeType}). تأكد أن الحلول المقترحة قابلة للتنفيذ فعلياً.`
    : '';

  const userContent = `السؤال الأصلي: ${question}

تقارير الفريق:
${teamAnalyses.join('\n\n')}

---
راجع هذه التقارير وأعطني:
1. التناقضات (إن وجدت)
2. المخاطر المخفية
3. الحلول غير الواقعية
4. توصيتك النهائية${codeNote}`;

  const result = await callClaude(CRITICAL_EXPERT_PROMPT, userContent, apiKey, 400, 0.5);
  return result || 'لم أتمكن من المراجعة';
}

// === Save Proposal ===
async function saveProposal(
  supabaseClient: any,
  leaderContent: string,
  question: string,
  codeType: string | null,
  agentId: string
): Promise<string | null> {
  const codeBlockMatch = leaderContent.match(/```[\s\S]*?```/g);
  if (!codeBlockMatch || !codeType) return null;

  const codeSnippet = codeBlockMatch.join('\n\n');
  const { data: proposal, error } = await supabaseClient.from('ai_proposals').insert({
    title: `تنفيذ: ${question.substring(0, 50)}...`,
    title_ar: `تنفيذ: ${question.substring(0, 50)}...`,
    description: `طلب المستخدم: ${question}`,
    description_ar: `طلب المستخدم: ${question}`,
    proposal_type: codeType === 'sql' ? 'database' : codeType === 'security' ? 'security' : 'enhancement',
    priority: 'medium',
    status: 'pending',
    code_snippet: codeSnippet,
    proposed_by: agentId,
    affected_area: codeType,
    risk_level: codeType === 'security' || codeType === 'sql' ? 'high' : 'medium',
  }).select().single();

  if (error) {
    console.error('Failed to save proposal:', error);
    return null;
  }
  return proposal?.id || null;
}

// === Main Handler ===
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question } = await req.json();
    if (!question?.trim()) throw new Error('Question is required');

    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Get Leader AI agent
    const { data: leaderAgent } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('agent_role', 'engineering_lead')
      .single();

    if (!leaderAgent) throw new Error('Leader AI not configured');

    const { needsCode, codeType } = detectCodeRequest(question);

    // 1) Smart expert selection (max 3)
    const selectedExperts = selectExperts(question);
    console.log(`Selected ${selectedExperts.length} experts:`, selectedExperts);

    // 2) Save human question
    const { data: humanMessage, error: humanError } = await supabase.from('ai_chat_room').insert({
      agent_id: leaderAgent.id,
      content: question,
      content_ar: question,
      message_type: 'human_question',
      message_category: 'human',
      human_sender_id: userId,
    }).select().single();

    if (humanError) throw new Error('Failed to save question');

    // 3) Get previous context
    const { data: recentMessages } = await supabase
      .from('ai_chat_room')
      .select('content, message_type')
      .order('created_at', { ascending: false })
      .limit(10);

    const previousContext = recentMessages
      ?.filter(m => m.message_type !== 'human_question')
      .map(m => m.content)
      .slice(0, 3)
      .join('\n') || '';

    // 4) Team analysis (only selected experts, with retry)
    console.log('Getting analysis from selected specialists...');
    const teamAnalyses = await getTeamAnalysis(question, anthropicKey, previousContext, codeType, selectedExperts);
    console.log(`Got ${teamAnalyses.length} team reports`);

    // 5) Critical Expert review (with retry built into callClaude)
    console.log('Critical Expert reviewing...');
    const criticalReview = await getCriticalReview(question, teamAnalyses, anthropicKey, codeType);
    console.log('Critical review complete');

    // 6) Leader generates final response (with retry)
    console.log('Leader generating final response...');
    const codeInstruction = needsCode
      ? `\n\n⚡ ملاحظة مهمة: هذا طلب تنفيذ (${codeType}). اكتب الكود الكامل والجاهز للنسخ. استخدم \`\`\` لتنسيق الكود.`
      : '';

    const leaderUserContent = `📩 سؤال من عمرو:
${question}

📊 تقارير الفريق (${teamAnalyses.length} متخصص):
${teamAnalyses.length > 0 ? teamAnalyses.join('\n\n') : 'لم يصل تقارير من الفريق.'}

🔍 مراجعة الخبير الناقد:
${criticalReview}

📜 السياق السابق:
${previousContext || 'لا يوجد'}

---
الآن أعطِ ردك النهائي الواحد للمستخدم.${codeInstruction}
تذكر: رد واحد، واضح، مع قرار وخطوة تالية.
إذا كتبت كود، اكتبه كاملاً وجاهزاً للنسخ.`;

    const leaderContent = await callClaude(LEADER_SYSTEM_PROMPT, leaderUserContent, anthropicKey, 2000, 0.7);

    if (!leaderContent) throw new Error('Empty leader response');

    // 7) Save proposal if code was generated
    let proposalId: string | null = null;
    if (needsCode) {
      proposalId = await saveProposal(supabase, leaderContent, question, codeType, leaderAgent.id);
      if (proposalId) console.log('Proposal saved:', proposalId);
    }

    // 8) Save leader response
    const { error: insertError } = await supabase.from('ai_chat_room').insert({
      agent_id: leaderAgent.id,
      content: leaderContent,
      content_ar: leaderContent,
      message_type: 'response',
      message_category: 'leader_response',
      is_summary: false,
      is_proposal: !!proposalId,
      previous_context: question,
      metadata: {
        team_reports_count: teamAnalyses.length,
        selected_experts: selectedExperts,
        critical_review: criticalReview,
        background_analyses: teamAnalyses,
        code_type: codeType,
        proposal_id: proposalId,
        ai_provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
      }
    });

    if (insertError) throw new Error('Failed to save response');

    console.log('Leader response saved successfully');

    return new Response(JSON.stringify({
      success: true,
      humanMessageId: humanMessage.id,
      leaderAgentId: leaderAgent.id,
      selectedExperts,
      teamReportsCount: teamAnalyses.length,
      hasCriticalReview: true,
      codeGenerated: needsCode,
      codeType,
      proposalId,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
