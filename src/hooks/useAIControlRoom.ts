import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Agent role display configuration - Full Engineering Organization
export const AGENT_ROLE_CONFIG: Record<string, { emoji: string; layer: string; layerAr: string; color: string }> = {
  // Core Infrastructure Layer
  system_sentinel: { emoji: '🛡️', layer: 'Core Infrastructure', layerAr: 'البنية التحتية', color: 'text-red-500' },
  backend_engineer: { emoji: '⚙️', layer: 'Core Infrastructure', layerAr: 'البنية التحتية', color: 'text-blue-500' },
  system_architect: { emoji: '🏗️', layer: 'Core Infrastructure', layerAr: 'البنية التحتية', color: 'text-purple-500' },
  
  // Quality & Testing Layer
  chaos_engineer: { emoji: '💥', layer: 'Quality & Testing', layerAr: 'الجودة والاختبار', color: 'text-orange-500' },
  qa_breaker: { emoji: '🧪', layer: 'Quality & Testing', layerAr: 'الجودة والاختبار', color: 'text-yellow-500' },
  
  // Implementation Layer
  implementation_engineer: { emoji: '🔧', layer: 'Implementation', layerAr: 'التنفيذ', color: 'text-emerald-500' },
  
  // Product & UX Layer
  product_owner: { emoji: '👤', layer: 'Product & UX', layerAr: 'المنتج والتجربة', color: 'text-pink-500' },
  user_tester: { emoji: '🎯', layer: 'Product & UX', layerAr: 'المنتج والتجربة', color: 'text-cyan-500' },
  
  // Platform Specialists
  android_engineer: { emoji: '🤖', layer: 'Platform Specialists', layerAr: 'متخصصو المنصات', color: 'text-green-500' },
  ios_engineer: { emoji: '🍎', layer: 'Platform Specialists', layerAr: 'متخصصو المنصات', color: 'text-gray-400' },
  web_engineer: { emoji: '🌐', layer: 'Platform Specialists', layerAr: 'متخصصو المنصات', color: 'text-blue-400' },
  
  // Domain Experts
  fintech_specialist: { emoji: '💰', layer: 'Domain Experts', layerAr: 'خبراء المجال', color: 'text-yellow-500' },
  integrations_specialist: { emoji: '🔌', layer: 'Domain Experts', layerAr: 'خبراء المجال', color: 'text-indigo-500' },
  security_specialist: { emoji: '🔒', layer: 'Domain Experts', layerAr: 'خبراء المجال', color: 'text-red-400' },
  fraud_analyst: { emoji: '🕵️', layer: 'Domain Experts', layerAr: 'خبراء المجال', color: 'text-amber-500' },
  
  // Growth & Business
  growth_analyst: { emoji: '📈', layer: 'Growth & Business', layerAr: 'النمو والأعمال', color: 'text-teal-500' },
  marketer_growth: { emoji: '🚀', layer: 'Growth & Business', layerAr: 'النمو والأعمال', color: 'text-violet-500' },
  
  // Operations
  p2p_moderator: { emoji: '⚖️', layer: 'Operations', layerAr: 'العمليات', color: 'text-slate-500' },
  support_agent: { emoji: '🎧', layer: 'Operations', layerAr: 'العمليات', color: 'text-lime-500' },
  leader_team: { emoji: '👑', layer: 'Operations', layerAr: 'العمليات', color: 'text-amber-400' },
  manager_stats: { emoji: '📊', layer: 'Operations', layerAr: 'العمليات', color: 'text-sky-500' },
  contest_judge: { emoji: '🏆', layer: 'Operations', layerAr: 'العمليات', color: 'text-yellow-400' },
  power_user: { emoji: '⚡', layer: 'Operations', layerAr: 'العمليات', color: 'text-orange-400' },
  
  // Governance
  challenger_ai: { emoji: '👹', layer: 'Governance', layerAr: 'الحوكمة', color: 'text-rose-500' },
};

// Get unique layers for grouping
export const AGENT_LAYERS = [
  { key: 'Core Infrastructure', ar: 'البنية التحتية', icon: '🏛️' },
  { key: 'Quality & Testing', ar: 'الجودة والاختبار', icon: '🧪' },
  { key: 'Implementation', ar: 'التنفيذ', icon: '🔧' },
  { key: 'Product & UX', ar: 'المنتج والتجربة', icon: '👤' },
  { key: 'Platform Specialists', ar: 'متخصصو المنصات', icon: '📱' },
  { key: 'Domain Experts', ar: 'خبراء المجال', icon: '🎓' },
  { key: 'Growth & Business', ar: 'النمو والأعمال', icon: '📈' },
  { key: 'Operations', ar: 'العمليات', icon: '⚙️' },
  { key: 'Governance', ar: 'الحوكمة', icon: '🛡️' },
];

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
  layer?: string;
  layerAr?: string;
}

// Get agent emoji based on role
export function getAgentEmoji(role: string): string {
  return AGENT_ROLE_CONFIG[role]?.emoji || '🤖';
}

// Get agent layer
export function getAgentLayer(role: string): { layer: string; layerAr: string } {
  const config = AGENT_ROLE_CONFIG[role];
  return {
    layer: config?.layer || 'Other',
    layerAr: config?.layerAr || 'أخرى',
  };
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
