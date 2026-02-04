import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Simple Agent Config - Engineering Focus
export const AGENT_CONFIG: Record<string, { emoji: string; layer: string; color: string }> = {
  // Core Engineers
  system_architect: { emoji: '🏗️', layer: 'Core', color: 'text-purple-500' },
  backend_core_engineer: { emoji: '⚙️', layer: 'Core', color: 'text-blue-500' },
  database_integrity_engineer: { emoji: '🗄️', layer: 'Core', color: 'text-emerald-500' },
  security_fraud_engineer: { emoji: '🔒', layer: 'Core', color: 'text-red-500' },
  wallet_p2p_engineer: { emoji: '💰', layer: 'Core', color: 'text-yellow-500' },
  frontend_systems_engineer: { emoji: '🖥️', layer: 'Core', color: 'text-cyan-500' },
  admin_panel_engineer: { emoji: '🎛️', layer: 'Core', color: 'text-orange-500' },
  challenger_ai: { emoji: '👹', layer: 'Core', color: 'text-rose-500' },
  
  // Screen Owners
  screen_home_owner: { emoji: '🏠', layer: 'Screen', color: 'text-indigo-500' },
  screen_wallet_owner: { emoji: '💳', layer: 'Screen', color: 'text-amber-500' },
  screen_p2p_owner: { emoji: '🔄', layer: 'Screen', color: 'text-teal-500' },
  screen_p2p_chat_owner: { emoji: '💬', layer: 'Screen', color: 'text-sky-500' },
  screen_dm_chat_owner: { emoji: '✉️', layer: 'Screen', color: 'text-violet-500' },
  screen_contests_owner: { emoji: '🏆', layer: 'Screen', color: 'text-yellow-600' },
  screen_profile_owner: { emoji: '👤', layer: 'Screen', color: 'text-pink-500' },
  screen_team_owner: { emoji: '👥', layer: 'Screen', color: 'text-lime-500' },
  screen_admin_owner: { emoji: '🔧', layer: 'Screen', color: 'text-slate-500' },
};

export interface AIMessage {
  id: string;
  agentId: string;
  agentName: string;
  agentNameAr: string;
  agentRole: string;
  content: string;
  contentAr: string | null;
  messageCategory: 'warning' | 'info' | 'critical' | 'success' | 'discussion' | 'human';
  createdAt: string;
  isHuman: boolean;
}

export function getAgentEmoji(role: string): string {
  return AGENT_CONFIG[role]?.emoji || '🤖';
}

export function getCategoryStyle(category: string): { bg: string; border: string; text: string } {
  switch (category) {
    case 'critical':
      return { bg: 'bg-destructive/10', border: 'border-destructive/30', text: 'text-destructive' };
    case 'warning':
      return { bg: 'bg-warning/10', border: 'border-warning/30', text: 'text-warning' };
    case 'info':
      return { bg: 'bg-info/10', border: 'border-info/30', text: 'text-info' };
    case 'success':
      return { bg: 'bg-success/10', border: 'border-success/30', text: 'text-success' };
    case 'human':
      return { bg: 'bg-primary/10', border: 'border-primary/30', text: 'text-primary' };
    default:
      return { bg: 'bg-muted', border: 'border-border', text: 'text-muted-foreground' };
  }
}

// Hook to check access
export function useCanAccessAIRoom() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['ai-room-access', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase.rpc('can_access_ai_control_room', { p_user_id: user.id });
      return data === true;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

// Main hook - Realtime messages with auto-scroll support
export function useAIRoomMessages(limit = 50) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);

  // Fetch messages - ordered DESC, then reversed for display
  const query = useQuery({
    queryKey: ['ai-room-messages', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_control_room_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      // Reverse to show oldest first (for chat display)
      const reversed = (data || []).reverse();
      
      return reversed.map(msg => ({
        id: msg.id,
        agentId: msg.agent_id,
        agentName: msg.agent_name,
        agentNameAr: msg.agent_name_ar,
        agentRole: msg.agent_role,
        content: msg.content,
        contentAr: msg.content_ar,
        messageCategory: (msg.message_category || 'discussion') as AIMessage['messageCategory'],
        createdAt: msg.created_at,
        isHuman: msg.human_sender_id !== null,
      })) as AIMessage[];
    },
    enabled: !!user,
    staleTime: 10000,
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('ai-room-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_chat_room',
        },
        (payload) => {
          // Add new message to cache
          const newMsg = payload.new as any;
          queryClient.setQueryData(['ai-room-messages', limit], (old: AIMessage[] | undefined) => {
            if (!old) return old;
            
            const mapped: AIMessage = {
              id: newMsg.id,
              agentId: newMsg.agent_id,
              agentName: newMsg.agent_name || 'AI Agent',
              agentNameAr: newMsg.agent_name_ar || 'وكيل AI',
              agentRole: newMsg.agent_role || 'system_architect',
              content: newMsg.content,
              contentAr: newMsg.content_ar,
              messageCategory: (newMsg.message_category || 'discussion') as AIMessage['messageCategory'],
              createdAt: newMsg.created_at,
              isHuman: newMsg.human_sender_id !== null,
            };
            
            return [...old, mapped];
          });
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, limit]);

  return {
    messages: query.data || [],
    isLoading: query.isLoading,
    isConnected,
    refetch: query.refetch,
  };
}

// Hook to send human question
export function useSendQuestion() {
  const [isSending, setIsSending] = useState(false);
  const queryClient = useQueryClient();

  const sendQuestion = useCallback(async (question: string) => {
    if (!question.trim()) return;
    
    setIsSending(true);
    try {
      const { error } = await supabase.functions.invoke('ai-human-question', {
        body: { question }
      });
      
      if (error) throw error;
      
      // Refetch messages
      queryClient.invalidateQueries({ queryKey: ['ai-room-messages'] });
    } finally {
      setIsSending(false);
    }
  }, [queryClient]);

  return { sendQuestion, isSending };
}
