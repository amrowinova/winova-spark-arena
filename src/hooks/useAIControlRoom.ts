import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AIControlRoomMessage {
  id: string;
  agentId: string;
  agentName: string;
  agentNameAr: string;
  agentRole: string;
  profileId: string | null;
  content: string;
  contentAr: string | null;
  messageType: string;
  isSummary: boolean;
  sessionId: string | null;
  createdAt: string;
  messageCategory: 'warning' | 'info' | 'critical' | 'success' | 'discussion' | 'human';
  humanSenderId: string | null;
}

export interface AIControlRoomFinding {
  id: string;
  agentId: string;
  agentName: string;
  agentNameAr: string;
  agentRole: string;
  profileId: string | null;
  title: string;
  titleAr: string | null;
  description: string;
  descriptionAr: string | null;
  severity: string;
  affectedArea: string | null;
  suggestedFix: string | null;
  technicalReason: string | null;
  status: string;
  createdAt: string;
  messageCategory: 'warning' | 'info' | 'critical' | 'discussion';
}

export interface AIAgent {
  id: string;
  agentName: string;
  agentNameAr: string;
  agentRole: string;
  focusAreas: string[];
  isActive: boolean;
  behaviorDescription: string | null;
}

// Get agent emoji based on role
export function getAgentEmoji(role: string): string {
  const emojiMap: Record<string, string> = {
    user_tester: '🧪',
    marketer_growth: '📈',
    leader_team: '👥',
    manager_stats: '📊',
    backend_engineer: '⚙️',
    system_architect: '🏗️',
    qa_breaker: '💥',
    fraud_analyst: '🔍',
    support_agent: '🎧',
    power_user: '⚡',
    contest_judge: '⚖️',
    p2p_moderator: '🤝',
    android_engineer: '🤖',
    ios_engineer: '🍎',
    web_engineer: '🌐',
    challenger_ai: '😈',
  };
  return emojiMap[role] || '🤖';
}

// Get category color class
export function getCategoryColor(category: string): string {
  switch (category) {
    case 'critical':
      return 'bg-destructive/10 text-destructive border-destructive/30';
    case 'warning':
      return 'bg-warning/10 text-warning border-warning/30';
    case 'info':
      return 'bg-info/10 text-info border-info/30';
    case 'success':
      return 'bg-success/10 text-success border-success/30';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

// Get category badge
export function getCategoryBadge(category: string, language: 'ar' | 'en'): { emoji: string; label: string } {
  switch (category) {
    case 'critical':
      return { emoji: '🔴', label: language === 'ar' ? 'خطر' : 'Critical' };
    case 'warning':
      return { emoji: '🟡', label: language === 'ar' ? 'تحذير' : 'Warning' };
    case 'info':
      return { emoji: '🔵', label: language === 'ar' ? 'توصية' : 'Info' };
    case 'success':
      return { emoji: '🟢', label: language === 'ar' ? 'ملخص' : 'Summary' };
    case 'human':
      return { emoji: '👤', label: language === 'ar' ? 'سؤال' : 'Question' };
    default:
      return { emoji: '⚪', label: language === 'ar' ? 'نقاش' : 'Discussion' };
  }
}

export function useCanAccessAIControlRoom() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['can-access-ai-control-room', user?.id],
    queryFn: async () => {
      if (!user) return false;
      
      const { data, error } = await supabase.rpc('can_access_ai_control_room', {
        p_user_id: user.id
      });
      
      if (error) {
        console.error('Error checking AI control room access:', error);
        return false;
      }
      
      return data === true;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useAIControlRoomMessages(limit = 100) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['ai-control-room-messages', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_control_room_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(limit);
      
      if (error) throw error;
      
      return (data || []).map(msg => ({
        id: msg.id,
        agentId: msg.agent_id,
        agentName: msg.agent_name,
        agentNameAr: msg.agent_name_ar,
        agentRole: msg.agent_role,
        profileId: msg.profile_id,
        content: msg.content,
        contentAr: msg.content_ar,
        messageType: msg.message_type,
        isSummary: msg.is_summary,
        sessionId: msg.session_id,
        createdAt: msg.created_at,
        messageCategory: msg.message_category as AIControlRoomMessage['messageCategory'],
        humanSenderId: msg.human_sender_id,
      })) as AIControlRoomMessage[];
    },
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useAIControlRoomFindings(limit = 50) {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ['ai-control-room-findings', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_control_room_findings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      
      return (data || []).map(finding => ({
        id: finding.id,
        agentId: finding.agent_id,
        agentName: finding.agent_name,
        agentNameAr: finding.agent_name_ar,
        agentRole: finding.agent_role,
        profileId: finding.profile_id,
        title: finding.title,
        titleAr: finding.title_ar,
        description: finding.description,
        descriptionAr: finding.description_ar,
        severity: finding.severity,
        affectedArea: finding.affected_area,
        suggestedFix: finding.suggested_fix,
        technicalReason: finding.technical_reason,
        status: finding.status,
        createdAt: finding.created_at,
        messageCategory: finding.message_category as AIControlRoomFinding['messageCategory'],
      })) as AIControlRoomFinding[];
    },
    enabled: !!user,
    refetchInterval: 60000, // Refresh every minute
  });
}

export function useAIAgents() {
  return useQuery({
    queryKey: ['ai-agents-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('is_active', true)
        .order('agent_role');
      
      if (error) throw error;
      
      return (data || []).map(agent => ({
        id: agent.id,
        agentName: agent.agent_name,
        agentNameAr: agent.agent_name_ar,
        agentRole: agent.agent_role,
        focusAreas: agent.focus_areas || [],
        isActive: agent.is_active,
        behaviorDescription: agent.behavior_description,
      })) as AIAgent[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Combined messages and findings for unified chat view
export function useAIControlRoomCombined(limit = 100) {
  const { data: messages, isLoading: messagesLoading } = useAIControlRoomMessages(limit);
  const { data: findings, isLoading: findingsLoading } = useAIControlRoomFindings(limit);
  
  // Combine and sort by date
  const combined = [
    ...(messages || []).map(m => ({ ...m, type: 'message' as const })),
    ...(findings || []).map(f => ({ 
      ...f, 
      type: 'finding' as const,
      content: f.description,
      contentAr: f.descriptionAr,
    })),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  
  return {
    data: combined,
    isLoading: messagesLoading || findingsLoading,
  };
}
