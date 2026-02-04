import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Agent prompts for proposal discussion - short and focused
const DISCUSSION_PROMPTS: Record<string, string> = {
  system_architect: `أنت مهندس النظام. حلل الاقتراح من منظور البنية العامة.
⚠️ رد بجملة أو جملتين فقط: هل هذا يتوافق مع بنية النظام؟`,

  backend_core_engineer: `أنت مهندس Backend. حلل الاقتراح من منظور الـ RPCs والـ Edge Functions.
⚠️ رد بجملة أو جملتين فقط: هل التنفيذ ممكن تقنياً؟`,

  database_integrity_engineer: `أنت مهندس قاعدة البيانات. حلل الاقتراح من منظور Schema وRLS.
⚠️ رد بجملة أو جملتين فقط: هل يؤثر على سلامة البيانات؟`,

  security_fraud_engineer: `أنت مهندس الأمان. حلل الاقتراح من منظور الثغرات.
⚠️ رد بجملة أو جملتين فقط: هل هناك مخاطر أمنية؟`,

  wallet_p2p_engineer: `أنت مهندس المحفظة. حلل الاقتراح من منظور الأرصدة والـ Ledger.
⚠️ رد بجملة أو جملتين فقط: هل يؤثر على الأموال؟`,

  challenger_ai: `أنت الناقد الرسمي. يجب أن تعارض الاقتراح وتجد ثغرات فيه.
⚠️ رد بسؤال واحد تحدي أو نقد مباشر. ممنوع الموافقة.`,
};

// Get relevant agents for proposal type
function getRelevantAgents(proposalType: string, affectedArea: string): string[] {
  const baseAgents = ['system_architect'];
  
  if (affectedArea?.toLowerCase().includes('wallet') || affectedArea?.toLowerCase().includes('ledger')) {
    baseAgents.push('wallet_p2p_engineer');
  }
  if (affectedArea?.toLowerCase().includes('db') || affectedArea?.toLowerCase().includes('rls')) {
    baseAgents.push('database_integrity_engineer');
  }
  if (affectedArea?.toLowerCase().includes('security') || affectedArea?.toLowerCase().includes('auth')) {
    baseAgents.push('security_fraud_engineer');
  }
  if (affectedArea?.toLowerCase().includes('rpc') || affectedArea?.toLowerCase().includes('edge')) {
    baseAgents.push('backend_core_engineer');
  }
  
  // Always add challenger at the end
  baseAgents.push('challenger_ai');
  
  return baseAgents.slice(0, 4); // Max 4 agents
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { proposalId } = await req.json();
    if (!proposalId) throw new Error('proposalId is required');

    const apiKey = Deno.env.get('LOVABLE_API_KEY') || Deno.env.get('AI_GATEWAY_API_KEY');
    if (!apiKey) throw new Error('LOVABLE_API_KEY not configured');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get the proposal
    const { data: proposal, error: propError } = await supabase
      .from('ai_proposals')
      .select('*')
      .eq('id', proposalId)
      .single();

    if (propError || !proposal) {
      throw new Error('Proposal not found');
    }

    // Get relevant agents
    const agentRoles = getRelevantAgents(proposal.proposal_type, proposal.affected_area || '');
    
    const { data: agents } = await supabase
      .from('ai_agents')
      .select('*')
      .in('agent_role', agentRoles)
      .eq('is_active', true);

    if (!agents || agents.length === 0) {
      throw new Error('No agents available');
    }

    // Sort agents to match order (challenger last)
    const sortedAgents = agentRoles
      .map(role => agents.find(a => a.agent_role === role))
      .filter(Boolean);

    // Build proposal context
    const proposalContext = `
عنوان الاقتراح: ${proposal.title_ar || proposal.title}
الوصف: ${proposal.description_ar || proposal.description}
الأولوية: ${proposal.priority}
المنطقة المتأثرة: ${proposal.affected_area || 'غير محدد'}
مستوى المخاطر: ${proposal.risk_level || 'غير محدد'}
    `.trim();

    // Previous messages context
    let previousMessages = '';

    // Generate responses sequentially with delays
    for (const agent of sortedAgents) {
      if (!agent) continue;
      
      // 3 second delay between agents
      await new Promise(r => setTimeout(r, 3000));
      
      const prompt = DISCUSSION_PROMPTS[agent.agent_role] || 'أنت مهندس WINOVA. حلل الاقتراح بإيجاز.';
      
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
            { 
              role: 'user', 
              content: `${proposalContext}${previousMessages ? `\n\nالردود السابقة:\n${previousMessages}` : ''}\n\nأعط رأيك المختصر.`
            },
          ],
          max_tokens: 150,
          temperature: agent.agent_role === 'challenger_ai' ? 0.9 : 0.7,
        }),
      });

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || 'لا تعليق.';
      
      // Determine category
      let category = 'discussion';
      const lower = content.toLowerCase();
      if (lower.includes('خطر') || lower.includes('ثغرة') || lower.includes('مشكلة كبير')) {
        category = 'critical';
      } else if (lower.includes('تحذير') || lower.includes('لكن') || lower.includes('انتبه')) {
        category = 'warning';
      } else if (lower.includes('موافق') || lower.includes('جيد') || lower.includes('✅')) {
        category = 'success';
      } else if (agent.agent_role === 'challenger_ai') {
        category = 'critical';
      }
      
      // Insert message
      await supabase.from('ai_chat_room').insert({
        agent_id: agent.id,
        session_id: proposalId, // Link to proposal
        content: content,
        content_ar: content,
        message_type: 'proposal_discussion',
        message_category: category,
        is_summary: false,
        metadata: { proposalId, agentRole: agent.agent_role },
      });

      // Add to previous messages context
      previousMessages += `\n${agent.agent_name_ar}: ${content}`;
    }

    return new Response(JSON.stringify({ 
      success: true, 
      proposalId,
      agentsResponded: sortedAgents.length,
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
