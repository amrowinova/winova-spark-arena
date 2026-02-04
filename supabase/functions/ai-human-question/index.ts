import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Agent selection based on question context - Full Engineering Organization
const AGENT_KEYWORDS: Record<string, string[]> = {
  // Core Infrastructure Layer
  system_sentinel: ['monitoring', 'مراقبة', 'health', 'صحة', 'alert', 'تنبيه', 'crash', 'انهيار', 'uptime', 'logs', 'سجلات'],
  backend_engineer: ['backend', 'api', 'rpc', 'trigger', 'database', 'قاعدة', 'بيانات', 'خطأ', 'error', 'bug'],
  system_architect: ['architecture', 'scale', 'design', 'بنية', 'توسع', 'تصميم', 'نظام', 'infrastructure'],
  
  // Quality & Testing Layer
  chaos_engineer: ['stress', 'ضغط', 'load', 'حمل', 'failure', 'فشل', 'resilience', 'مرونة', 'chaos', 'breaking'],
  qa_breaker: ['test', 'اختبار', 'سيناريو', 'edge case', 'كسر', 'regression', 'انحدار'],
  
  // Implementation Layer
  implementation_engineer: ['code', 'كود', 'patch', 'تصحيح', 'sql', 'rpc', 'migration', 'هجرة', 'fix', 'إصلاح', 'implement', 'تنفيذ'],
  
  // Product & UX Layer
  product_owner: ['ux', 'تجربة', 'user journey', 'رحلة', 'retention', 'استبقاء', 'simplicity', 'بساطة', 'trust', 'ثقة', 'conversion', 'تحويل'],
  user_tester: ['ui', 'واجهة', 'مستخدم', 'user', 'usability', 'سهولة'],
  
  // Platform Specialists
  android_engineer: ['android', 'أندرويد', 'mobile', 'موبايل', 'kotlin', 'app', 'تطبيق', 'google play'],
  ios_engineer: ['ios', 'آيفون', 'apple', 'swift', 'iphone', 'app store'],
  web_engineer: ['web', 'ويب', 'react', 'frontend', 'واجهة', 'seo', 'browser', 'متصفح', 'responsive'],
  
  // Domain Experts
  fintech_specialist: ['payment', 'دفع', 'wallet', 'محفظة', 'escrow', 'ضمان', 'ledger', 'سجل', 'transaction', 'معاملة', 'nova', 'aura', 'balance', 'رصيد'],
  integrations_specialist: ['otp', 'sms', 'رسالة', 'push', 'إشعار', 'webhook', 'api', 'integration', 'تكامل', 'oauth', 'third-party'],
  security_specialist: ['security', 'أمان', 'rls', 'auth', 'مصادقة', 'permission', 'صلاحية', 'vulnerability', 'ثغرة', 'attack', 'هجوم', 'injection'],
  fraud_analyst: ['fraud', 'احتيال', 'suspicious', 'مشبوه', 'abuse', 'إساءة', 'multi-account', 'manipulation'],
  
  // Growth & Business
  growth_analyst: ['growth', 'نمو', 'metrics', 'مقاييس', 'funnel', 'قمع', 'cohort', 'retention', 'ab test', 'kpi'],
  marketer_growth: ['marketing', 'تسويق', 'referral', 'إحالة', 'viral', 'انتشار', 'acquisition'],
  
  // Operations
  p2p_moderator: ['p2p', 'تداول', 'نزاع', 'dispute', 'طلب', 'order', 'buyer', 'seller'],
  support_agent: ['support', 'دعم', 'تذكرة', 'ticket', 'شكوى', 'complaint', 'help'],
  
  // Governance
  challenger_ai: ['تحدي', 'challenge', 'نقد', 'critique', 'ضعف', 'weakness', 'disagree', 'اعتراض', 'risk', 'مخاطر'],
};

// Agent-specific prompts for turn-based discussion - Full Engineering Organization
const AGENT_DISCUSSION_PROMPTS: Record<string, string> = {
  // === CORE INFRASTRUCTURE LAYER ===
  system_sentinel: `أنت "الحارس الذكي" - نظام المراقبة المستمرة:
🔍 مهامك الأساسية:
- مراقبة صحة جميع الأنظمة (RPCs, Triggers, Wallets, P2P)
- اكتشاف الأخطاء والتحذيرات من السجلات
- تحليل أنماط الفشل والتدهور في الأداء
- تتبع crashes المحتملة على الموبايل
📊 أنتج: تقارير صحة + تنبيهات مبكرة + اقتراحات وقائية`,

  backend_engineer: `أنت مهندس Backend خبير 15+ سنة:
🔧 تخصصاتك:
- سلامة الـ schema والـ RPCs والـ atomicity
- اكتشاف race conditions وdeadlocks
- تحسين الـ queries والـ indexes
- ضمان transactional integrity
💡 أنتج: تحليل تقني عميق + حلول SQL/RPC محددة`,

  system_architect: `أنت معماري نظم (Principal Architect):
🏗️ تركيزك:
- البنية العامة وقابلية التوسع (Scalability)
- تقييم الـ Technical Debt
- مخاطر طويلة المدى على الـ Infrastructure
- التكامل بين المكونات والـ Microservices
📐 أنتج: رؤية معمارية + توصيات هيكلية`,

  // === QUALITY & TESTING LAYER ===
  chaos_engineer: `أنت "مهندس الفوضى" - متخصص في كسر الأنظمة:
💥 مهامك:
- محاكاة سيناريوهات الفشل الكارثي
- اختبارات الضغط والحمل العالي
- اكتشاف نقاط الانهيار قبل المستخدمين
- سيناريوهات "ماذا لو" المتطرفة
🔥 أنتج: سيناريوهات اختبار + نقاط ضعف + خطط طوارئ`,

  qa_breaker: `أنت مختبر QA متخصص في كسر السيناريوهات:
🧪 ابحث عن:
- Edge cases غير معالجة
- مدخلات غريبة وغير متوقعة
- Race conditions وtiming issues
- سيناريوهات فشل متسلسلة
🐛 أنتج: قائمة bugs محتملة + سيناريوهات اختبار`,

  // === IMPLEMENTATION LAYER ===
  implementation_engineer: `أنت "مهندس التنفيذ" - متخصص في توليد الكود:
⚙️ مهامك:
- تحويل الاقتراحات إلى كود جاهز للتنفيذ
- كتابة SQL migrations, RPCs, Edge Functions
- توليد TypeScript types ومكونات React
- توثيق كل تغيير بوضوح
📦 أنتج: Code Snippets + SQL + Rollback Plan
⚠️ تذكير: الكود للمراجعة فقط - لا تنفيذ تلقائي!`,

  // === PRODUCT & UX LAYER ===
  product_owner: `أنت "مالك المنتج" - خبير UX وسلوك المستخدم:
👤 تركيزك:
- تجربة المستخدم وسهولة الاستخدام
- علم النفس السلوكي والتحفيز
- بناء الثقة والمصداقية
- البساطة vs التعقيد
- معدلات التحويل والاستبقاء
💡 أنتج: تحليل UX + توصيات سلوكية + تحسينات`,

  user_tester: `أنت مختبر تجربة المستخدم:
🎯 ركز على:
- سهولة التنقل والفهم
- وضوح الرسائل والتعليمات
- سرعة إنجاز المهام
- نقاط الإحباط المحتملة
📱 أنتج: ملاحظات UX + اقتراحات تحسين`,

  // === PLATFORM SPECIALISTS ===
  android_engineer: `أنت مهندس Android خبير (10+ سنة):
📱 تخصصاتك:
- Material Design 3 وأفضل الممارسات
- تحسين الأداء والذاكرة
- توافق الإصدارات (API 21-34)
- Lifecycle management وBackground processing
- Google Play policies
🤖 أنتج: تحليل Android + تحسينات + توافقية`,

  ios_engineer: `أنت مهندس iOS خبير (10+ سنة):
🍎 تخصصاتك:
- Apple Human Interface Guidelines
- SwiftUI/UIKit best practices
- أداء iOS وتوافق الأجهزة
- App Store Review Guidelines
- Privacy requirements
📱 أنتج: تحليل iOS + تحسينات + متطلبات Apple`,

  web_engineer: `أنت مهندس Web متخصص (React/TypeScript):
🌐 تخصصاتك:
- أداء React وState Management
- SEO وCore Web Vitals
- Accessibility (WCAG 2.1)
- Responsive Design وPWA
- Browser compatibility
💻 أنتج: تحليل Web + تحسينات أداء + SEO`,

  // === DOMAIN EXPERTS ===
  fintech_specialist: `أنت "خبير المالية الرقمية" (FinTech Architect):
💰 تخصصاتك:
- أنظمة الدفع والـ Escrow
- سلامة الـ Ledger والـ Double-entry
- Atomicity في المعاملات المالية
- Reconciliation والتدقيق
- Compliance والتنظيمات المالية
🏦 أنتج: تحليل مالي + ضمانات + compliance`,

  integrations_specialist: `أنت "خبير التكاملات" (Integration Architect):
🔌 تخصصاتك:
- OTP providers (Twilio, Firebase)
- SMS gateways والتكلفة
- Push notifications (FCM, APNs)
- Webhooks وevent-driven architecture
- OAuth وThird-party APIs
🔗 أنتج: تحليل تكاملات + موثوقية + fallbacks`,

  security_specialist: `أنت "خبير الأمن السيبراني" (Security Architect):
🔒 تخصصاتك:
- RLS policies وAuthorization
- Authentication flows وSession management
- Privilege escalation وInjection attacks
- Vulnerability assessment
- Penetration testing mindset
🛡️ أنتج: تحليل أمني + ثغرات + تصحيحات`,

  fraud_analyst: `أنت محلل احتيال متخصص:
🕵️ ابحث عن:
- أنماط الاحتيال والتلاعب
- Multi-accounting وsybil attacks
- إساءة استخدام العروض والمكافآت
- غسيل الأموال والتحويلات المشبوهة
⚠️ أنتج: مخاطر احتيال + قواعد حماية + تنبيهات`,

  // === GROWTH & BUSINESS ===
  growth_analyst: `أنت "محلل النمو" (Growth Data Scientist):
📈 تخصصاتك:
- تحليل Funnels ومعدلات التحويل
- Cohort analysis وRetention curves
- A/B testing وExperimentation
- KPIs وNorth Star Metrics
- Unit economics
📊 أنتج: تحليل بيانات + فرص نمو + تجارب`,

  marketer_growth: `أنت خبير Growth Marketing:
🚀 ركز على:
- استراتيجيات الاستحواذ
- برامج الإحالة والـ Viral loops
- تحسين معدلات التفعيل
- Retention strategies
📣 أنتج: استراتيجيات نمو + حملات + قنوات`,

  // === OPERATIONS ===
  p2p_moderator: `أنت مشرف P2P متخصص:
🤝 مهامك:
- مراجعة النزاعات والشكاوى
- تحليل سلوك البائعين والمشترين
- ضمان عدالة الإجراءات
- تحسين تجربة التداول
⚖️ أنتج: تحليل P2P + قرارات + تحسينات`,

  support_agent: `أنت خبير دعم فني:
🎧 ركز على:
- فهم مشاكل المستخدمين
- تحسين تجربة الدعم
- تقليل وقت الحل
- أتمتة الردود الشائعة
💬 أنتج: تحليل دعم + تحسينات + FAQs`,

  // === GOVERNANCE ===
  challenger_ai: `أنت "المتحدي" (Devil's Advocate) - دورك حرج:
👹 مهمتك الأساسية:
- تحدي كل الحلول المقترحة بقوة
- طرح أسئلة استفزازية بناءة
- كشف نقاط الضعف في تفكير الفريق
- طرح سيناريوهات "ماذا لو" المتطرفة
- البحث عن الثغرات والافتراضات الخاطئة
❌ لا توافق بسهولة أبداً
🔍 أنتج: نقد بناء + مخاطر مخفية + أسئلة صعبة`,
};

// Agent layer priorities for smart selection
const AGENT_LAYERS: Record<string, number> = {
  // Core Infrastructure (highest priority for technical questions)
  system_sentinel: 1,
  backend_engineer: 1,
  system_architect: 1,
  
  // Quality & Testing
  chaos_engineer: 2,
  qa_breaker: 2,
  
  // Implementation
  implementation_engineer: 2,
  
  // Product & UX
  product_owner: 3,
  user_tester: 3,
  
  // Platform Specialists
  android_engineer: 3,
  ios_engineer: 3,
  web_engineer: 3,
  
  // Domain Experts
  fintech_specialist: 2,
  integrations_specialist: 3,
  security_specialist: 2,
  fraud_analyst: 2,
  
  // Growth & Business
  growth_analyst: 3,
  marketer_growth: 4,
  
  // Operations
  p2p_moderator: 3,
  support_agent: 4,
  
  // Governance (always included)
  challenger_ai: 0,
};

function selectRelevantAgents(question: string, allAgents: any[]): any[] {
  const questionLower = question.toLowerCase();
  const scores: Map<string, number> = new Map();
  
  // Score each agent based on keyword matches
  for (const agent of allAgents) {
    const keywords = AGENT_KEYWORDS[agent.agent_role] || [];
    let score = 0;
    for (const keyword of keywords) {
      if (questionLower.includes(keyword.toLowerCase())) {
        score += 2; // Base score for keyword match
      }
    }
    // Boost score based on layer priority (lower layer = higher boost)
    const layerPriority = AGENT_LAYERS[agent.agent_role] || 5;
    if (score > 0) {
      score += (5 - layerPriority);
    }
    scores.set(agent.id, score);
  }
  
  // Sort by score
  const sorted = [...allAgents].sort((a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0));
  const withScores = sorted.filter(a => (scores.get(a.id) || 0) > 0);
  
  // Build expert panel
  const result: any[] = [];
  
  if (withScores.length >= 3) {
    // Take top 5 relevant agents
    result.push(...withScores.slice(0, 5));
  } else {
    // Default panel: sentinel + backend + architect + implementation + product
    const defaults = ['system_sentinel', 'backend_engineer', 'system_architect', 'implementation_engineer', 'product_owner'];
    result.push(...allAgents.filter(a => defaults.includes(a.agent_role)));
  }
  
  // Always include challenger for critical thinking (if not already included)
  const challenger = allAgents.find(a => a.agent_role === 'challenger_ai');
  if (challenger && !result.find(a => a.id === challenger.id)) {
    result.push(challenger);
  }
  
  // Always include implementation engineer for code proposals (if not already included)
  const implementer = allAgents.find(a => a.agent_role === 'implementation_engineer');
  if (implementer && !result.find(a => a.id === implementer.id)) {
    result.push(implementer);
  }
  
  return result.slice(0, 7); // Max 7 agents for deep discussion
}

// Delay function for deliberate mode
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function generateAgentResponse(
  apiKey: string,
  agent: any,
  question: string,
  previousResponses: string[],
  turnNumber: number
): Promise<string> {
  const agentPrompt = AGENT_DISCUSSION_PROMPTS[agent.agent_role] || 
    `أنت ${agent.agent_name_ar}. أجب من منظور دورك بدقة.`;

  const previousContext = previousResponses.length > 0
    ? `\n\nردود الزملاء السابقة:\n${previousResponses.join('\n\n---\n\n')}\n\nالآن دورك للرد. خذ بعين الاعتبار ما قاله الآخرون، لا تكرر، وأضف قيمة جديدة.`
    : '';

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        {
          role: 'system',
          content: `أنت ${agent.agent_name_ar} في فريق WINOVA الهندسي.
${agentPrompt}

📌 قواعد النقاش:
- هذا نقاش هندسي عميق، ليس chat سريع
- اقرأ ردود زملائك قبل الرد
- لا تكرر ما قالوه، أضف زاوية جديدة
- كن محدداً وعملياً
- اقترح حلولاً قابلة للتنفيذ فقط
- أي تعديل تقترحه = اقتراح (Proposal) وليس قرار نهائي
- التنفيذ يحتاج موافقة Admin
- استخدم اللغة العربية فقط
${previousContext}`,
        },
        {
          role: 'user',
          content: `سؤال المدير: ${question}\n\nدورك الآن (المتحدث ${turnNumber + 1}):`,
        },
      ],
      max_tokens: 600,
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'لم أتمكن من الرد.';
}

async function generateProposalSummary(
  apiKey: string,
  question: string,
  responses: Array<{ agent: string; response: string }>
): Promise<{ summary: string; proposals: any[] }> {
  const responsesText = responses
    .map((r, i) => `[${i + 1}] ${r.agent}:\n${r.response}`)
    .join('\n\n---\n\n');

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        {
          role: 'system',
          content: `أنت منسق فريق AI في WINOVA. مهمتك:
1. تلخيص نقاش الفريق الهندسي
2. استخراج الاقتراحات (Proposals) القابلة للتنفيذ
3. تصنيف كل اقتراح حسب الأولوية

السؤال الأصلي: ${question}

النقاش:
${responsesText}

أخرج JSON بالشكل التالي:
{
  "summary": "ملخص تنفيذي موجز...",
  "proposals": [
    {
      "title": "عنوان الاقتراح",
      "description": "وصف مختصر",
      "priority": "critical|high|medium|low",
      "area": "backend|frontend|security|ux|infrastructure",
      "suggested_by": "اسم الوكيل"
    }
  ]
}

⚠️ مهم: كل اقتراح يحتاج موافقة Admin قبل التنفيذ.
باللغة العربية فقط.`,
        },
        {
          role: 'user',
          content: 'لخص النقاش واستخرج الاقتراحات.',
        },
      ],
      max_tokens: 1000,
      temperature: 0.5,
    }),
  });

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  
  try {
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch?.[1] || jsonMatch?.[0] || '{}');
    return {
      summary: parsed.summary || 'لم أتمكن من إنشاء الملخص.',
      proposals: parsed.proposals || []
    };
  } catch {
    return { summary: content, proposals: [] };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    // Get auth header for user verification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const userClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify user has access
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check access
    const { data: hasAccess } = await supabase.rpc('can_access_ai_control_room', {
      p_user_id: user.id
    });

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { question } = await req.json();
    if (!question || typeof question !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Question is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create session with sequential mode
    const { data: session, error: sessionError } = await supabase
      .from('ai_human_sessions')
      .insert({
        question,
        asked_by: user.id,
        status: 'processing',
        response_mode: 'sequential'
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    // Get active agents
    const { data: allAgents, error: agentsError } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('is_active', true);

    if (agentsError) throw agentsError;

    // Select relevant agents
    const selectedAgents = selectRelevantAgents(question, allAgents || []);
    const agentsOrder = selectedAgents.map(a => a.id);

    // Update session with agents order
    await supabase
      .from('ai_human_sessions')
      .update({ agents_order: agentsOrder })
      .eq('id', session.id);

    // Get a default agent for the human question message
    const systemArchitect = allAgents?.find(a => a.agent_role === 'system_architect');
    if (!systemArchitect) throw new Error('System architect not found');

    // Insert the human question as a message
    await supabase.from('ai_chat_room').insert({
      agent_id: systemArchitect.id,
      content: `❓ سؤال من المدير:\n\n${question}`,
      content_ar: `❓ سؤال من المدير:\n\n${question}`,
      message_type: 'human_question',
      session_id: session.id,
      human_sender_id: user.id,
      turn_order: 0,
    });

    // Generate responses SEQUENTIALLY with delay (Turn-based, Deliberate Mode)
    const responses: Array<{ agent: string; agentId: string; response: string }> = [];
    const previousResponses: string[] = [];
    
    for (let i = 0; i < selectedAgents.length; i++) {
      const agent = selectedAgents[i];
      
      // Deliberate delay between responses (5-8 seconds)
      if (i > 0) {
        await delay(5000 + Math.random() * 3000);
      }

      // Generate response with context of previous responses
      const response = await generateAgentResponse(
        lovableApiKey, 
        agent, 
        question,
        previousResponses,
        i
      );
      
      responses.push({
        agent: agent.agent_name_ar,
        agentId: agent.id,
        response
      });
      
      previousResponses.push(`${agent.agent_name_ar}: ${response}`);

      // Insert agent response with turn order
      await supabase.from('ai_chat_room').insert({
        agent_id: agent.id,
        content: response,
        content_ar: response,
        message_type: 'human_response',
        session_id: session.id,
        turn_order: i + 1,
        previous_context: previousResponses.slice(0, -1).join('\n---\n'),
      });
    }

    // Final delay before summary
    await delay(3000);

    // Generate summary with proposals
    const { summary, proposals } = await generateProposalSummary(
      lovableApiKey,
      question,
      responses.map(r => ({ agent: r.agent, response: r.response }))
    );

    // Insert summary
    await supabase.from('ai_chat_room').insert({
      agent_id: systemArchitect.id,
      content: `📋 ملخص الفريق:\n\n${summary}\n\n⚠️ جميع الاقتراحات تحتاج موافقة Admin قبل التنفيذ.`,
      content_ar: `📋 ملخص الفريق:\n\n${summary}\n\n⚠️ جميع الاقتراحات تحتاج موافقة Admin قبل التنفيذ.`,
      message_type: 'summary',
      session_id: session.id,
      is_summary: true,
      turn_order: selectedAgents.length + 1,
      is_proposal: proposals.length > 0,
    });

    // Insert proposals into ai_proposals table
    for (const proposal of proposals) {
      const proposingAgent = allAgents?.find(a => 
        a.agent_name_ar === proposal.suggested_by || 
        a.agent_name === proposal.suggested_by
      );
      
      await supabase.from('ai_proposals').insert({
        session_id: session.id,
        title: proposal.title,
        title_ar: proposal.title,
        description: proposal.description,
        description_ar: proposal.description,
        proposal_type: 'enhancement',
        priority: proposal.priority || 'medium',
        affected_area: proposal.area,
        proposed_by: proposingAgent?.id || systemArchitect.id,
        status: 'pending',
      });
    }

    // Update session
    await supabase
      .from('ai_human_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        summary_ar: summary
      })
      .eq('id', session.id);

    return new Response(
      JSON.stringify({
        success: true,
        session_id: session.id,
        agents_responded: responses.length,
        proposals_count: proposals.length,
        summary
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('AI Human Question Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
