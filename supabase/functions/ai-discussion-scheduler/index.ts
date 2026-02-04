import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple agent prompts - Short, focused analysis
const AGENT_PROMPTS: Record<string, string> = {
  system_architect: `أنت مهندس النظام. تحلل البنية العامة والـ Technical Debt. 
⚠️ ردك: جملة أو جملتين فقط. مشكلة محددة + سبب + حل مقترح.`,

  backend_core_engineer: `أنت مهندس Backend. تحلل RPCs وEdge Functions والـ Atomicity.
⚠️ ردك: جملة أو جملتين فقط. مشكلة محددة + كود مختصر إن لزم.`,

  database_integrity_engineer: `أنت مهندس قاعدة البيانات. تحلل Schema وRLS وData Integrity.
⚠️ ردك: جملة أو جملتين فقط. مشكلة محددة في الجدول أو السياسة.`,

  security_fraud_engineer: `أنت مهندس الأمان. تحلل الثغرات والـ RLS والـ Auth flows.
⚠️ ردك: جملة أو جملتين فقط. ثغرة محددة + خطورتها.`,

  wallet_p2p_engineer: `أنت مهندس المحفظة وP2P. تحلل الأرصدة والـ Escrow والـ Ledger.
⚠️ ردك: جملة أو جملتين فقط. مشكلة مالية محددة.`,

  frontend_systems_engineer: `أنت مهندس أنظمة الواجهة. تحلل State وSync والـ Cache.
⚠️ ردك: جملة أو جملتين فقط. مشكلة تزامن محددة.`,

  admin_panel_engineer: `أنت مهندس لوحة التحكم. تحلل Audit logs وAdmin workflows.
⚠️ ردك: جملة أو جملتين فقط. مشكلة في العمليات الإدارية.`,

  challenger_ai: `أنت الناقد. تتحدى كل اقتراح وتبحث عن الثغرات.
⚠️ ردك: جملة واحدة فقط. سؤال أو نقد مباشر.`,

  // Screen Owners - Focus on their screen
  screen_home_owner: `أنت مالك شاشة الرئيسية. تراقب ActiveUsers والRankings والCards.
⚠️ ردك: جملة أو جملتين. مشكلة في الشاشة + علاقتها بالBackend.`,

  screen_wallet_owner: `أنت مالك شاشة المحفظة. تراقب الأرصدة والTransactions.
⚠️ ردك: جملة أو جملتين. مشكلة في عرض البيانات المالية.`,

  screen_p2p_owner: `أنت مالك شاشة P2P. تراقب الطلبات والفلترة والأسعار.
⚠️ ردك: جملة أو جملتين. مشكلة في الماركت.`,

  screen_p2p_chat_owner: `أنت مالك شاشة P2P Chat. تراقب Steps والTimer والDisputes.
⚠️ ردك: جملة أو جملتين. مشكلة في flow الصفقة.`,

  screen_dm_chat_owner: `أنت مالك شاشة المحادثات. تراقب Messages والDelivery والTyping.
⚠️ ردك: جملة أو جملتين. مشكلة في الرسائل.`,

  screen_contests_owner: `أنت مالك شاشة المسابقات. تراقب Entry والVoting والPrizes.
⚠️ ردك: جملة أو جملتين. مشكلة في المسابقات.`,

  screen_profile_owner: `أنت مالك شاشة البروفايل. تراقب Stats والFollowers والReputation.
⚠️ ردك: جملة أو جملتين. مشكلة في بيانات المستخدم.`,

  screen_team_owner: `أنت مالك شاشة الفريق. تراقب Hierarchy والReferrals والActivity.
⚠️ ردك: جملة أو جملتين. مشكلة في بنية الفريق.`,

  screen_admin_owner: `أنت مالك لوحة التحكم. تراقب Admin actions والAudit.
⚠️ ردك: جملة أو جملتين. مشكلة في الإدارة.`,
};

// Topics for 24/7 analysis
const ANALYSIS_TOPICS = [
  { id: 'db', agents: ['database_integrity_engineer', 'security_fraud_engineer'], prompt: 'راجع schema وRLS policies' },
  { id: 'wallet', agents: ['wallet_p2p_engineer', 'database_integrity_engineer'], prompt: 'راجع تطابق wallet_ledger مع balances' },
  { id: 'p2p', agents: ['wallet_p2p_engineer', 'screen_p2p_owner'], prompt: 'راجع state machine وescrow' },
  { id: 'security', agents: ['security_fraud_engineer', 'backend_core_engineer'], prompt: 'ابحث عن ثغرات أمنية' },
  { id: 'frontend', agents: ['frontend_systems_engineer', 'screen_wallet_owner'], prompt: 'راجع تزامن الواجهة مع Backend' },
  { id: 'chat', agents: ['screen_dm_chat_owner', 'backend_core_engineer'], prompt: 'راجع realtime وdelivery' },
  { id: 'contests', agents: ['screen_contests_owner', 'wallet_p2p_engineer'], prompt: 'راجع voting وprize distribution' },
  { id: 'team', agents: ['screen_team_owner', 'database_integrity_engineer'], prompt: 'راجع referral chain وhierarchy' },
];

async function generateShortResponse(apiKey: string, agentRole: string, topic: string): Promise<string> {
  const prompt = AGENT_PROMPTS[agentRole] || 'أنت مهندس WINOVA. ردك: جملة واحدة فقط.';
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: `موضوع التحليل: ${topic}\n\nحلل واكتب رسالة قصيرة جداً (جملة أو جملتين كحد أقصى).` },
      ],
      max_tokens: 150,
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'لم أجد مشكلة حالياً.';
}

function getMessageCategory(content: string): string {
  const lower = content.toLowerCase();
  if (lower.includes('خطير') || lower.includes('critical') || lower.includes('ثغرة')) return 'critical';
  if (lower.includes('تحذير') || lower.includes('warning') || lower.includes('مشكلة')) return 'warning';
  if (lower.includes('اقتراح') || lower.includes('يمكن') || lower.includes('suggest')) return 'info';
  if (lower.includes('✅') || lower.includes('سليم') || lower.includes('صحيح')) return 'success';
  return 'discussion';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('AI_GATEWAY_API_KEY');
    if (!apiKey) throw new Error('AI_GATEWAY_API_KEY not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get active agents
    const { data: agents } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('is_active', true);

    if (!agents || agents.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No active agents' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Pick random topic for this cycle
    const topic = ANALYSIS_TOPICS[Math.floor(Math.random() * ANALYSIS_TOPICS.length)];
    
    // Get agents for this topic
    const relevantAgents = agents.filter(a => topic.agents.includes(a.agent_role));
    
    // Add challenger if not already included
    const challenger = agents.find(a => a.agent_role === 'challenger_ai');
    if (challenger && !relevantAgents.find(a => a.id === challenger.id)) {
      relevantAgents.push(challenger);
    }

    // Generate and save messages (one per agent, short)
    for (const agent of relevantAgents.slice(0, 3)) {
      // Small delay between agents
      await new Promise(r => setTimeout(r, 3000));
      
      const content = await generateShortResponse(apiKey, agent.agent_role, topic.prompt);
      const category = getMessageCategory(content);
      
      // Insert message directly into chat room
      await supabase.from('ai_chat_room').insert({
        agent_id: agent.id,
        content: content,
        content_ar: content,
        message_type: 'analysis',
        message_category: category,
        is_summary: false,
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      topic: topic.id,
      agents: relevantAgents.slice(0, 3).map(a => a.agent_role),
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
