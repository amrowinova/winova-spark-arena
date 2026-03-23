import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AgentProfile {
  id: string;
  user_id: string;
  shop_name: string;
  whatsapp: string;
  country: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  commission_pct: number;
  bio: string | null;
  avg_rating: number;
  trust_score: number;
  total_reviews: number;
  total_completed: number;
  total_cancellations?: number;
  total_disputes?: number;
  avg_response_time_seconds?: number | null;
  distance_km?: number | null;
  status?: string;
}

export interface AgentDetail extends AgentProfile {
  user_name: string;
  avatar_url: string | null;
  recent_reviews: Array<{
    rating: number;
    comment: string;
    has_issue: boolean;
    created_at: string;
  }>;
}

export interface MyAgentProfile {
  found: boolean;
  id?: string;
  shop_name?: string;
  whatsapp?: string;
  country?: string;
  city?: string;
  commission_pct?: number;
  bio?: string | null;
  status?: string;
  avg_rating?: number;
  trust_score?: number;
  total_reviews?: number;
  total_completed?: number;
}

export function useAgents() {
  const { user: authUser } = useAuth();

  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myAgentProfile, setMyAgentProfile] = useState<MyAgentProfile | null>(null);

  const searchAgents = useCallback(async (params: {
    country?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  }) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcErr } = await supabase.rpc('get_nearby_agents', {
        p_country:   params.country   ?? null,
        p_city:      params.city      ?? null,
        p_latitude:  params.latitude  ?? null,
        p_longitude: params.longitude ?? null,
        p_limit:     30,
      });
      if (rpcErr) throw rpcErr;
      setAgents((data as AgentProfile[]) ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const getAgentDetail = useCallback(async (agentId: string): Promise<AgentDetail | null> => {
    const { data, error: rpcErr } = await supabase.rpc('get_agent_detail', { p_agent_id: agentId });
    if (rpcErr || !data) return null;
    const d = data as AgentDetail & { found: boolean };
    if (!d.found) return null;
    return d;
  }, []);

  const applyAsAgent = useCallback(async (params: {
    shop_name: string;
    whatsapp: string;
    country: string;
    city: string;
    latitude?: number;
    longitude?: number;
    bio?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!authUser) return { success: false, error: 'Not authenticated' };
    const { data, error: rpcErr } = await supabase.rpc('apply_as_agent', {
      p_shop_name:  params.shop_name,
      p_whatsapp:   params.whatsapp,
      p_country:    params.country,
      p_city:       params.city,
      p_latitude:   params.latitude  ?? null,
      p_longitude:  params.longitude ?? null,
      p_bio:        params.bio       ?? null,
    });
    if (rpcErr) return { success: false, error: rpcErr.message };
    return data as { success: boolean; error?: string };
  }, [authUser]);

  const fetchMyAgentProfile = useCallback(async () => {
    if (!authUser) return;
    const { data } = await supabase.rpc('get_my_agent_profile');
    setMyAgentProfile((data as MyAgentProfile) ?? { found: false });
  }, [authUser]);

  const adminManageAgent = useCallback(async (
    agentId: string,
    action: 'approve' | 'suspend',
    reason?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const { data, error: rpcErr } = await supabase.rpc('admin_manage_agent', {
      p_agent_id: agentId,
      p_action:   action,
      p_reason:   reason ?? null,
    });
    if (rpcErr) return { success: false, error: rpcErr.message };
    return data as { success: boolean; error?: string };
  }, []);

  const getAllAgentsForAdmin = useCallback(async (): Promise<AgentProfile[]> => {
    const { data, error: err } = await supabase
      .from('agents')
      .select('*')
      .order('created_at', { ascending: false });
    if (err) return [];
    return (data ?? []) as AgentProfile[];
  }, []);

  return {
    agents, loading, error, myAgentProfile,
    searchAgents, getAgentDetail, applyAsAgent,
    fetchMyAgentProfile, adminManageAgent, getAllAgentsForAdmin,
  };
}
