import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Country {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  phone_code: string;
  currency: string;
}

export interface City {
  id: string;
  name_ar: string;
  name_en: string;
}

export interface DepositRequest {
  id: string;
  amount_nova: number;
  amount_local: number | null;
  payment_method: string;
  payment_reference: string;
  admin_notes: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  created_at: string;
  completed_at: string | null;
  // admin fields
  agent_id?: string;
  agent_shop_name?: string;
  agent_country?: string;
  agent_city?: string;
  agent_balance?: number;
}

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
  total_disputes?: number;
  total_cancellations?: number;
  avg_response_time_seconds?: number | null;
}

export function useAgents() {
  const { user: authUser } = useAuth();

  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myAgentProfile, setMyAgentProfile] = useState<MyAgentProfile | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);

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
    district?: string;
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
      p_district:   params.district  ?? '',
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

  // ── Countries & Cities ────────────────────────────────────────────────────
  const fetchCountries = useCallback(async () => {
    const { data } = await supabase.rpc('get_countries');
    setCountries((data as Country[]) ?? []);
  }, []);

  const fetchCities = useCallback(async (countryCode: string) => {
    if (!countryCode) { setCities([]); return; }
    const { data } = await supabase.rpc('get_cities_by_country', { p_country_code: countryCode });
    setCities((data as City[]) ?? []);
  }, []);

  // ── Agent Deposit ─────────────────────────────────────────────────────────
  const requestDeposit = useCallback(async (
    amountNova: number,
    paymentMethod: string,
    paymentReference: string
  ): Promise<{ success: boolean; error?: string }> => {
    const { data, error: rpcErr } = await supabase.rpc('agent_request_deposit', {
      p_amount_nova:       amountNova,
      p_payment_method:    paymentMethod,
      p_payment_reference: paymentReference,
    });
    if (rpcErr) return { success: false, error: rpcErr.message };
    return data as { success: boolean; error?: string };
  }, []);

  const fetchMyDepositRequests = useCallback(async (): Promise<DepositRequest[]> => {
    const { data } = await supabase.rpc('get_agent_deposit_requests');
    return (data as DepositRequest[]) ?? [];
  }, []);

  const adminGetDepositRequests = useCallback(async (
    status: string = 'pending'
  ): Promise<DepositRequest[]> => {
    const { data } = await supabase.rpc('admin_get_all_deposit_requests', { p_status: status });
    return (data as DepositRequest[]) ?? [];
  }, []);

  const adminApproveDeposit = useCallback(async (
    requestId: string,
    adminNotes?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const { data, error: rpcErr } = await supabase.rpc('admin_approve_deposit', {
      p_request_id: requestId,
      p_admin_notes: adminNotes ?? null,
    });
    if (rpcErr) return { success: false, error: rpcErr.message };
    return data as { success: boolean; error?: string };
  }, []);

  const adminRejectDeposit = useCallback(async (
    requestId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const { data, error: rpcErr } = await supabase.rpc('admin_reject_deposit', {
      p_request_id: requestId,
      p_reason: reason ?? null,
    });
    if (rpcErr) return { success: false, error: rpcErr.message };
    return data as { success: boolean; error?: string };
  }, []);

  return {
    agents, loading, error, myAgentProfile,
    countries, cities,
    searchAgents, getAgentDetail, applyAsAgent,
    fetchMyAgentProfile, adminManageAgent, getAllAgentsForAdmin,
    fetchCountries, fetchCities,
    requestDeposit, fetchMyDepositRequests,
    adminGetDepositRequests, adminApproveDeposit, adminRejectDeposit,
  };
}
