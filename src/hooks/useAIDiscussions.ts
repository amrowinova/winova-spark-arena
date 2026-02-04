import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AIAgent {
  id: string;
  agent_name: string;
  agent_name_ar: string;
  agent_role: string;
  behavior_description: string | null;
  focus_areas: string[];
  is_active: boolean;
  last_analysis_at: string | null;
}

export interface AIChatMessage {
  id: string;
  agent_id: string;
  content: string;
  content_ar: string | null;
  message_type: string;
  session_id: string | null;
  is_summary: boolean | null;
  created_at: string;
  agent?: AIAgent;
}

export interface AIDiscussionSession {
  id: string;
  started_at: string;
  completed_at: string | null;
  trigger_type: string;
  participants_count: number | null;
  messages_count: number | null;
  summary_ar: string | null;
  action_items: any[];
  status: string;
}

export interface AIAnalysisLog {
  id: string;
  agent_id: string;
  analysis_type: string;
  title: string;
  title_ar: string | null;
  description: string;
  description_ar: string | null;
  severity: string;
  affected_area: string | null;
  suggested_fix: string | null;
  technical_reason: string | null;
  status: string;
  created_at: string;
  agent?: AIAgent;
}

export function useAIAgents() {
  return useQuery({
    queryKey: ['ai-agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_agents')
        .select('*')
        .order('agent_role');
      
      if (error) throw error;
      return data as AIAgent[];
    },
  });
}

export function useAIDiscussionSessions(limit = 10) {
  return useQuery({
    queryKey: ['ai-discussion-sessions', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_discussion_sessions')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return data as AIDiscussionSession[];
    },
  });
}

export function useAIChatMessages(sessionId?: string) {
  return useQuery({
    queryKey: ['ai-chat-messages', sessionId],
    queryFn: async () => {
      let query = supabase
        .from('ai_chat_room')
        .select(`
          *,
          agent:ai_agents(*)
        `)
        .order('created_at', { ascending: true });
      
      if (sessionId) {
        query = query.eq('session_id', sessionId);
      }
      
      const { data, error } = await query.limit(100);
      
      if (error) throw error;
      return data as (AIChatMessage & { agent: AIAgent })[];
    },
    enabled: !!sessionId,
  });
}

export function useAIAnalysisLogs(status?: string, limit = 20) {
  return useQuery({
    queryKey: ['ai-analysis-logs', status, limit],
    queryFn: async () => {
      let query = supabase
        .from('ai_analysis_logs')
        .select(`
          *,
          agent:ai_agents(*)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (status) {
        query = query.eq('status', status);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as (AIAnalysisLog & { agent: AIAgent })[];
    },
  });
}
