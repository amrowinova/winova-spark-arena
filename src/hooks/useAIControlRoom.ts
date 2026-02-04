import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Engineering Team Role Configuration - Professional Engineering Review Board
export const AGENT_ROLE_CONFIG: Record<string, { emoji: string; layer: string; layerAr: string; color: string }> = {
  // Architecture & Design
  system_architect: { emoji: '🏗️', layer: 'Architecture', layerAr: 'الهندسة المعمارية', color: 'text-purple-500' },
  
  // Backend & Core Systems
  backend_core_engineer: { emoji: '⚙️', layer: 'Backend', layerAr: 'النظام الخلفي', color: 'text-blue-500' },
  
  // Database & Data
  database_integrity_engineer: { emoji: '🗄️', layer: 'Database', layerAr: 'قاعدة البيانات', color: 'text-emerald-500' },
  
  // Security & Fraud
  security_fraud_engineer: { emoji: '🔒', layer: 'Security', layerAr: 'الأمان', color: 'text-red-500' },
  
  // Financial Systems
  wallet_p2p_engineer: { emoji: '💰', layer: 'Financial', layerAr: 'النظام المالي', color: 'text-yellow-500' },
  
  // Frontend Systems (not design)
  frontend_systems_engineer: { emoji: '🖥️', layer: 'Frontend', layerAr: 'أنظمة الواجهة', color: 'text-cyan-500' },
  
  // Admin & Control
  admin_panel_engineer: { emoji: '🎛️', layer: 'Admin', layerAr: 'لوحة التحكم', color: 'text-orange-500' },
  
  // Challenger (Devil's Advocate)
  challenger_ai: { emoji: '👹', layer: 'Governance', layerAr: 'المعارض', color: 'text-rose-500' },

  // ============ Screen-based AI Owners ============
  // Home Screen
  screen_home_owner: { emoji: '🏠', layer: 'Screen Owners', layerAr: 'مالكي الشاشات', color: 'text-indigo-500' },
  
  // Wallet Screen
  screen_wallet_owner: { emoji: '💳', layer: 'Screen Owners', layerAr: 'مالكي الشاشات', color: 'text-amber-500' },
  
  // P2P Screen
  screen_p2p_owner: { emoji: '🔄', layer: 'Screen Owners', layerAr: 'مالكي الشاشات', color: 'text-teal-500' },
  
  // P2P Chat Screen
  screen_p2p_chat_owner: { emoji: '💬', layer: 'Screen Owners', layerAr: 'مالكي الشاشات', color: 'text-sky-500' },
  
  // DM Chat Screen
  screen_dm_chat_owner: { emoji: '✉️', layer: 'Screen Owners', layerAr: 'مالكي الشاشات', color: 'text-violet-500' },
  
  // Contests Screen
  screen_contests_owner: { emoji: '🏆', layer: 'Screen Owners', layerAr: 'مالكي الشاشات', color: 'text-yellow-600' },
  
  // Profile Screen
  screen_profile_owner: { emoji: '👤', layer: 'Screen Owners', layerAr: 'مالكي الشاشات', color: 'text-pink-500' },
  
  // Team Screen
  screen_team_owner: { emoji: '👥', layer: 'Screen Owners', layerAr: 'مالكي الشاشات', color: 'text-lime-500' },
  
  // Admin Panel Screen
  screen_admin_owner: { emoji: '🔧', layer: 'Screen Owners', layerAr: 'مالكي الشاشات', color: 'text-slate-500' },
};

// Engineering Layers for grouping
export const AGENT_LAYERS = [
  { key: 'Architecture', ar: 'الهندسة المعمارية', icon: '🏗️' },
  { key: 'Backend', ar: 'النظام الخلفي', icon: '⚙️' },
  { key: 'Database', ar: 'قاعدة البيانات', icon: '🗄️' },
  { key: 'Security', ar: 'الأمان', icon: '🔒' },
  { key: 'Financial', ar: 'النظام المالي', icon: '💰' },
  { key: 'Frontend', ar: 'أنظمة الواجهة', icon: '🖥️' },
  { key: 'Admin', ar: 'لوحة التحكم', icon: '🎛️' },
  { key: 'Governance', ar: 'المعارض', icon: '👹' },
  { key: 'Screen Owners', ar: 'مالكي الشاشات', icon: '📱' },
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
