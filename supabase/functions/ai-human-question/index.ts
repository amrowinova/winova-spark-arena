 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   'Access-Control-Allow-Origin': '*',
   'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
 };
 
 // Extended Background Team - 15 Specialists
 const BACKGROUND_TEAM: Record<string, { nameAr: string; focus: string; priority: number }> = {
   // Core Infrastructure (Priority 1)
   system_architect: {
     nameAr: 'مهندس البنية',
     focus: 'System design، Technical debt، Scalability patterns، Cross-cutting concerns',
     priority: 1
   },
   backend_engineer: {
     nameAr: 'مهندس Backend',
     focus: 'Node/Go/Rust، RPCs، Edge Functions، API design، Atomicity',
     priority: 1
   },
   database_engineer: {
     nameAr: 'مهندس Database',
     focus: 'PostgreSQL، Schema design، RLS، Indexes، Query optimization، Ledger systems',
     priority: 1
   },
   
   // Security & Finance (Priority 1)
   security_engineer: {
     nameAr: 'مهندس الأمان',
     focus: 'Pentesting، Threat modeling، Auth vulnerabilities، Injection، XSS، CSRF',
     priority: 1
   },
   wallet_p2p_engineer: {
     nameAr: 'مهندس Wallet/P2P',
     focus: 'Escrow، Ledger integrity، P2P state machine، Financial atomicity، Fraud prevention',
     priority: 1
   },
   
   // Frontend & Mobile (Priority 2)
   frontend_engineer: {
     nameAr: 'مهندس Frontend',
     focus: 'React، State management، Realtime sync، Performance، Bundle optimization',
     priority: 2
   },
   mobile_engineer: {
     nameAr: 'مهندس Mobile',
     focus: 'React Native، Flutter، iOS/Android، PWA، Mobile-specific UX',
     priority: 2
   },
   ux_engineer: {
     nameAr: 'مهندس UX',
     focus: 'User flows، Accessibility، RTL support، Mobile responsiveness، Design systems',
     priority: 2
   },
   
   // Infrastructure (Priority 2)
   devops_engineer: {
     nameAr: 'مهندس DevOps',
     focus: 'CI/CD، Docker، Monitoring، Logging، Deployment strategies',
     priority: 2
   },
   cloud_engineer: {
     nameAr: 'مهندس Cloud',
     focus: 'Supabase، AWS، Edge computing، CDN، Auto-scaling، Cost optimization',
     priority: 2
   },
   
   // Specialized (Priority 3)
   api_engineer: {
     nameAr: 'مهندس APIs',
     focus: 'REST، GraphQL، Webhooks، Third-party integrations، Rate limiting',
     priority: 3
   },
   performance_engineer: {
     nameAr: 'مهندس Performance',
     focus: 'Load testing، Caching strategies، Database optimization، Memory management',
     priority: 3
   },
   networking_engineer: {
     nameAr: 'مهندس Networking',
     focus: 'WebSockets، Realtime protocols، Network security، CDN، Edge locations',
     priority: 3
   },
   ai_ml_engineer: {
     nameAr: 'مهندس AI/ML',
     focus: 'LLM integration، Prompt engineering، AI agents، Model optimization',
     priority: 3
   },
   lowlevel_engineer: {
     nameAr: 'مهندس Low-Level',
     focus: 'Concurrency، Memory، Algorithms، Data structures، Performance tuning',
     priority: 3
   },
 };
 
// Critical Expert - Reviews ALL outputs before Leader  
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
 
// Detect if request needs code generation
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
    if (kw.pattern.test(question)) {
      return { needsCode: true, codeType: kw.type };
    }
  }
  return { needsCode: false, codeType: null };
}

// Leader AI prompt - Enhanced for code generation
const LEADER_SYSTEM_PROMPT = `أنت "القائد الهندسي" لمشروع WINOVA - الواجهة الوحيدة للمستخدم. أنت مثل ChatGPT لكن متخصص بالهندسة.
 
 🎯 دورك:
 - أنت الوحيد الذي يتحدث مع المستخدم.
 - تحت إدارتك 15 مهندس AI متخصص + خبير ناقد.
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
 
 🏢 فريقك (15 متخصص):
 البنية | Backend | Database | الأمان | Wallet/P2P | Frontend | Mobile | UX | DevOps | Cloud | APIs | Performance | Networking | AI/ML | Low-Level
 
 +1 خبير ناقد (يراجع كل المخرجات قبلك)
 
استخدم تقاريرهم + نقد الخبير لتكوين رأيك النهائي.

🔧 قدراتك:
- تحليل المشاكل وإيجاد الحلول
- كتابة كود React/TypeScript
- كتابة SQL migrations و RLS policies  
- كتابة Edge Functions
- تصميم واجهات ومكونات
- مراجعة وتحسين الكود الموجود

⚡ حدودك (كن صريحاً):
- لا تستطيع تعديل الملفات مباشرة (تحتاج Lovable للتنفيذ)
- لا تستطيع deploy مباشر
- الكود الذي تكتبه يُخزن كـ Proposal للمراجعة`;
 
 async function getBackgroundTeamAnalysis(
   question: string,
   apiKey: string,
  previousContext: string,
  codeType: string | null
 ): Promise<string[]> {
   const teamEntries = Object.entries(BACKGROUND_TEAM);
   
   // Parallel analysis from all team members
   const promises = teamEntries.map(async ([role, config]) => {
     try {
      const codeInstruction = codeType 
        ? `\n\nملاحظة: هذا الطلب يحتاج ${codeType}. إذا كان ضمن تخصصك، أعطِ مقترح كود مختصر.`
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
               content: `أنت ${config.nameAr} في فريق WINOVA.
 تخصصك: ${config.focus}
 
مهمتك: أعطِ تقرير مختصر (3-4 جمل) للقائد عن السؤال من منظورك فقط.
 - لا تتحدث للمستخدم مباشرة
 - ركز على تخصصك فقط
- إذا السؤال خارج تخصصك، قل "خارج تخصصي"
- إذا تحتاج تكتب كود، اكتب snippet مختصر${codeInstruction}`
             },
             { 
               role: 'user', 
               content: `السؤال: ${question}\n\nالسياق: ${previousContext || 'لا يوجد سياق سابق'}`
             },
           ],
          max_tokens: 300,
           temperature: 0.7,
         }),
       });
 
       if (response.ok) {
         const data = await response.json();
         const content = data.choices?.[0]?.message?.content?.trim();
         if (content) {
           return `[${config.nameAr}]: ${content}`;
         }
       }
       return null;
     } catch (error) {
       console.error(`Background team error (${role}):`, error);
       return null;
     }
   });
   
   const results = await Promise.all(promises);
   return results.filter((r): r is string => r !== null);
 }
 
 async function getCriticalExpertReview(
   question: string,
   teamAnalyses: string[],
  apiKey: string,
  codeType: string | null
 ): Promise<string> {
   try {
    const codeNote = codeType 
      ? `\n\nملاحظة: هذا طلب تنفيذ (${codeType}). تأكد أن الحلول المقترحة قابلة للتنفيذ فعلياً.`
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
             content: CRITICAL_EXPERT_PROMPT
           },
           { 
             role: 'user', 
             content: `السؤال الأصلي: ${question}
 
 تقارير الفريق:
 ${teamAnalyses.join('\n\n')}
 
 ---
 راجع هذه التقارير وأعطني:
 1. التناقضات (إن وجدت)
 2. المخاطر المخفية
 3. الحلول غير الواقعية
4. توصيتك النهائية${codeNote}`
           },
         ],
        max_tokens: 400,
         temperature: 0.5,
       }),
     });
 
     if (response.ok) {
       const data = await response.json();
       return data.choices?.[0]?.message?.content?.trim() || 'لا يوجد ملاحظات';
     }
   } catch (error) {
     console.error('Critical Expert error:', error);
   }
   return 'لم أتمكن من المراجعة';
 }
 
// Save proposal if code was generated
async function saveProposalIfNeeded(
  supabase: any,
  leaderContent: string,
  question: string,
  codeType: string | null,
  agentId: string
): Promise<string | null> {
  // Check if response contains code blocks
  const codeBlockMatch = leaderContent.match(/```[\s\S]*?```/g);
  if (!codeBlockMatch || !codeType) return null;
  
  const codeSnippet = codeBlockMatch.join('\n\n');
  
  // Create a proposal
  const { data: proposal, error } = await supabase.from('ai_proposals').insert({
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

 Deno.serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response(null, { headers: corsHeaders });
   }
 
   try {
     const { question } = await req.json();
     if (!question?.trim()) throw new Error('Question is required');
 
     const apiKey = Deno.env.get('LOVABLE_API_KEY') || Deno.env.get('AI_GATEWAY_API_KEY');
     if (!apiKey) throw new Error('AI API key not configured');
 
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
     
     if (!leaderAgent) {
       throw new Error('Leader AI not configured');
     }
 
    // Detect if this needs code generation
    const { needsCode, codeType } = detectCodeRequest(question);
    console.log(`Code detection: needsCode=${needsCode}, type=${codeType}`);

     // 1) Save human question
     const { data: humanMessage, error: humanError } = await supabase.from('ai_chat_room').insert({
       agent_id: leaderAgent.id,
       content: question,
       content_ar: question,
       message_type: 'human_question',
       message_category: 'human',
       human_sender_id: userId,
     }).select().single();
 
     if (humanError) {
       console.error('Failed to save human message:', humanError);
       throw new Error('Failed to save question');
     }
 
     console.log('Human message saved:', humanMessage.id);
 
     // 2) Get previous context
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
 
     // 3) Get background team analysis (parallel from 15 specialists)
     console.log('Getting analysis from 15 specialists...');
    const teamAnalyses = await getBackgroundTeamAnalysis(question, apiKey, previousContext, codeType);
     console.log(`Got ${teamAnalyses.length} team reports`);
 
     // 4) Critical Expert reviews all outputs
     console.log('Critical Expert reviewing...');
    const criticalReview = await getCriticalExpertReview(question, teamAnalyses, apiKey, codeType);
     console.log('Critical review complete');
 
     // 5) Leader generates final response with all inputs
     console.log('Leader generating final response...');
    
    const codeInstruction = needsCode 
      ? `\n\n⚡ ملاحظة مهمة: هذا طلب تنفيذ (${codeType}). اكتب الكود الكامل والجاهز للنسخ. استخدم \`\`\` لتنسيق الكود.`
      : '';
    
     const leaderResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
             content: LEADER_SYSTEM_PROMPT
           },
           { 
             role: 'user', 
             content: `📩 سؤال من عمرو:
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
إذا كتبت كود، اكتبه كاملاً وجاهزاً للنسخ.`
           },
         ],
        max_tokens: 2000,
         temperature: 0.7,
       }),
     });
 
     if (!leaderResponse.ok) {
       const errorText = await leaderResponse.text();
       console.error('Leader API error:', leaderResponse.status, errorText);
       throw new Error('Failed to get leader response');
     }
 
     const leaderData = await leaderResponse.json();
     const leaderContent = leaderData.choices?.[0]?.message?.content?.trim();
 
     if (!leaderContent) {
       throw new Error('Empty leader response');
     }
 
    // 5.5) Save proposal if code was generated
    let proposalId: string | null = null;
    if (needsCode) {
      proposalId = await saveProposalIfNeeded(supabase, leaderContent, question, codeType, leaderAgent.id);
      if (proposalId) {
        console.log('Proposal saved:', proposalId);
      }
    }

     // 6) Save leader response (the ONLY visible response)
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
         critical_review: criticalReview,
        background_analyses: teamAnalyses,
        code_type: codeType,
        proposal_id: proposalId,
       }
     });
 
     if (insertError) {
       console.error('Failed to save leader response:', insertError);
       throw new Error('Failed to save response');
     }
 
     console.log('Leader response saved successfully');
 
     return new Response(JSON.stringify({ 
       success: true, 
       humanMessageId: humanMessage.id,
       leaderAgentId: leaderAgent.id,
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