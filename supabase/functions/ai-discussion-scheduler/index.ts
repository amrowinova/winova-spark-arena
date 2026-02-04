import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Full monitoring topics - each triggers specific agents
const MONITORING_TOPICS = [
  {
    id: 'wallet_integrity',
    topic: 'تحقق من تطابق wallet_ledger مع balances في wallets',
    topicEn: 'Verify wallet_ledger matches wallet balances',
    agents: ['database_integrity_engineer', 'wallet_p2p_engineer', 'security_fraud_engineer', 'challenger_ai'],
  },
  {
    id: 'p2p_state_machine',
    topic: 'راجع P2P orders: أي طلبات stuck في awaiting_payment أكثر من ساعة؟',
    topicEn: 'Check P2P orders stuck in awaiting_payment for over an hour',
    agents: ['wallet_p2p_engineer', 'backend_core_engineer', 'challenger_ai'],
  },
  {
    id: 'rls_policies',
    topic: 'تحقق من RLS policies: هل هناك جداول بدون حماية كافية؟',
    topicEn: 'Audit RLS policies for insufficient protection',
    agents: ['security_fraud_engineer', 'database_integrity_engineer', 'challenger_ai'],
  },
  {
    id: 'realtime_sync',
    topic: 'راجع تزامن Realtime: هل الرسائل تصل بشكل صحيح؟',
    topicEn: 'Check realtime sync for message delivery',
    agents: ['frontend_systems_engineer', 'backend_core_engineer', 'challenger_ai'],
  },
  {
    id: 'escrow_consistency',
    topic: 'تحقق من Escrow: هل الأموال المحجوزة تتطابق مع الطلبات النشطة؟',
    topicEn: 'Verify escrow funds match active orders',
    agents: ['wallet_p2p_engineer', 'database_integrity_engineer', 'security_fraud_engineer', 'challenger_ai'],
  },
  {
    id: 'auth_flow',
    topic: 'راجع auth flow: أي مشاكل في تسجيل الدخول أو profiles؟',
    topicEn: 'Audit authentication flow and profile creation',
    agents: ['backend_core_engineer', 'security_fraud_engineer', 'challenger_ai'],
  },
  {
    id: 'contests_voting',
    topic: 'راجع نظام المسابقات: هل التصويت والجوائز تعمل بشكل صحيح؟',
    topicEn: 'Check contests voting and prize distribution',
    agents: ['backend_core_engineer', 'wallet_p2p_engineer', 'database_integrity_engineer', 'challenger_ai'],
  },
  {
    id: 'team_hierarchy',
    topic: 'تحقق من سلسلة الإحالات: هل team_members تعكس الهيكل الصحيح؟',
    topicEn: 'Verify referral chain and team hierarchy',
    agents: ['database_integrity_engineer', 'backend_core_engineer', 'challenger_ai'],
  },
];

const AGENT_CONFIGS: Record<string, { name: string; nameAr: string; prompt: string }> = {
  system_architect: {
    name: 'System Architect',
    nameAr: 'مهندس النظام',
    prompt: 'تحلل البنية العامة والـ dependencies. رد بـ 1-2 جمل محددة.'
  },
  backend_core_engineer: {
    name: 'Backend Engineer',
    nameAr: 'مهندس Backend',
    prompt: 'تحلل RPCs و Edge Functions. ابحث عن bugs و race conditions. رد بـ 1-2 جمل.'
  },
  database_integrity_engineer: {
    name: 'Database Engineer',
    nameAr: 'مهندس DB',
    prompt: 'تحلل Schema و Data consistency. ابحث عن anomalies. رد بـ 1-2 جمل.'
  },
  security_fraud_engineer: {
    name: 'Security Engineer',
    nameAr: 'مهندس الأمان',
    prompt: 'تحلل الثغرات الأمنية و RLS. ابحث عن vulnerabilities. رد بـ 1-2 جمل.'
  },
  wallet_p2p_engineer: {
    name: 'Wallet Engineer',
    nameAr: 'مهندس المحفظة',
    prompt: 'تحلل الأرصدة و P2P logic. ابحث عن balance mismatches. رد بـ 1-2 جمل.'
  },
  frontend_systems_engineer: {
    name: 'Frontend Engineer',
    nameAr: 'مهندس Frontend',
    prompt: 'تحلل State و Sync. ابحث عن UI/Backend mismatch. رد بـ 1-2 جمل.'
  },
  admin_panel_engineer: {
    name: 'Admin Engineer',
    nameAr: 'مهندس Admin',
    prompt: 'تحلل Admin workflows و Audit logs. رد بـ 1-2 جمل.'
  },
  challenger_ai: {
    name: 'Challenger',
    nameAr: 'الناقد',
    prompt: 'تحدّ كل شيء. اسأل سؤال نقدي واحد. ابحث عن ما قد يفشل.'
  },
};

function getCategory(content: string): string {
  const c = content.toLowerCase();
  if (c.includes('خطير') || c.includes('critical') || c.includes('ثغرة')) return 'critical';
  if (c.includes('تحذير') || c.includes('warning') || c.includes('مشكلة')) return 'warning';
  if (c.includes('اقتراح') || c.includes('يمكن') || c.includes('?')) return 'info';
  if (c.includes('سليم') || c.includes('✅')) return 'success';
  return 'discussion';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('LOVABLE_API_KEY') || Deno.env.get('AI_GATEWAY_API_KEY');
    if (!apiKey) throw new Error('AI API key not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get all active agents
    const { data: agents } = await supabase.from('ai_agents').select('*').eq('is_active', true);
    if (!agents?.length) {
      return new Response(JSON.stringify({ success: true, message: 'No active agents' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const agentMap: Record<string, any> = {};
    agents.forEach(a => { agentMap[a.agent_role] = a; });

    // Pick random topic
    const topic = MONITORING_TOPICS[Math.floor(Math.random() * MONITORING_TOPICS.length)];
    
    console.log(`Starting monitoring cycle: ${topic.id}`);

    // Get previous context
    const { data: recentMessages } = await supabase
      .from('ai_chat_room')
      .select('content')
      .order('created_at', { ascending: false })
      .limit(3);
    
    const previousContext = recentMessages?.map(m => m.content).join('\n') || '';

    // Generate responses from topic's agents (including Challenger)
    const responses: { agentRole: string; content: string }[] = [];
    
    for (const role of topic.agents) {
      const agent = agentMap[role];
      if (!agent) continue;

      const config = AGENT_CONFIGS[role];
      if (!config) continue;

      // Build context from previous responses in this cycle
      const previousResponses = responses.map(r => 
        `${AGENT_CONFIGS[r.agentRole]?.nameAr}: ${r.content}`
      ).join('\n');

      try {
        console.log(`Generating from ${role}...`);

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
                content: `أنت ${config.nameAr} في فريق WINOVA الهندسي.
${config.prompt}

سياق سابق:
${previousContext}

${previousResponses ? `ردود زملائك:\n${previousResponses}` : ''}

⚠️ قاعدة صارمة: رد بـ 1-2 جمل فقط. كن تقنياً ومحدداً.`
              },
              {
                role: 'user',
                content: `موضوع المراقبة: ${topic.topic}\n\nحلل هذا الموضوع من منظورك كـ ${config.nameAr}.`
              },
            ],
            max_tokens: 150,
            temperature: role === 'challenger_ai' ? 0.9 : 0.7,
          }),
        });

        if (!response.ok) {
          console.error(`API error for ${role}:`, response.status);
          continue;
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        
        if (!content) continue;

        // Save to database
        await supabase.from('ai_chat_room').insert({
          agent_id: agent.id,
          content,
          content_ar: content,
          message_type: 'monitoring',
          message_category: getCategory(content),
          is_summary: false,
        });

        responses.push({ agentRole: role, content });
        console.log(`Response saved from ${role}`);

        // Delay 10 seconds between agents for natural flow
        if (role !== topic.agents[topic.agents.length - 1]) {
          await new Promise(r => setTimeout(r, 10000));
        }

      } catch (err) {
        console.error(`Error for ${role}:`, err);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      topic: topic.id,
      agents: responses.map(r => r.agentRole),
      count: responses.length,
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
