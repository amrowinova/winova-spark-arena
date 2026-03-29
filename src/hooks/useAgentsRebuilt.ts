/**
 * useAgents - Completely rebuilt agent management hook
 * Simple, direct, and reliable
 */
import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Types
export interface AgentProfile {
  id: string;
  user_id: string;
  shop_name: string;
  whatsapp: string;
  country: string;
  city: string;
  latitude?: number;
  longitude?: number;
  commission_pct: number;
  bio?: string;
  avg_rating: number;
  trust_score: number;
  total_reviews: number;
  total_completed: number;
  total_cancellations: number;
  total_disputes: number;
  status: 'pending' | 'active' | 'suspended' | 'verified';
  balance: number;
  created_at: string;
  updated_at: string;
}

export interface DepositRequest {
  id: string;
  agent_id: string;
  amount_nova: number;
  payment_method: string;
  payment_reference: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  agent_shop_name: string;
  agent_city: string;
  agent_country: string;
  agent_balance?: number;
}

export interface MyAgentProfile {
  found: boolean;
  id?: string;
  shop_name?: string;
  whatsapp?: string;
  country?: string;
  city?: string;
  commission_pct?: number;
  bio?: string;
  status?: string;
  avg_rating?: number;
  trust_score?: number;
  total_reviews?: number;
  total_completed?: number;
  total_disputes?: number;
  balance?: number;
}

export interface Country {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
  dial_code: string;
}

export interface City {
  id: string;
  name_ar: string;
  name_en: string;
}

export function useAgents() {
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myAgentProfile, setMyAgentProfile] = useState<MyAgentProfile>({ found: false });
  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);

  // ── 1. Get Active Agents (for public) ─────────────────────────────────────
  const getActiveAgents = useCallback(async () => {
    console.log('🔍 getActiveAgents: Fetching active agents...');
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await (supabase as any).rpc('get_active_agents');
      
      if (error) {
        console.error('❌ getActiveAgents: RPC Error:', error);
        setError(error.message);
        return;
      }
      
      console.log('✅ getActiveAgents: Success, agents:', data?.length || 0);
      setAgents((data as AgentProfile[]) ?? []);
      
    } catch (e) {
      console.error('❌ getActiveAgents: Exception:', e);
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── 2. Get All Agents (for admin) ────────────────────────────────────────
  const getAllAgentsForAdmin = useCallback(async (): Promise<AgentProfile[]> => {
    console.log('🔍 getAllAgentsForAdmin: Fetching all agents...');
    
    try {
      const { data, error } = await (supabase as any).rpc('admin_get_all_agents');
      
      if (error) {
        console.error('❌ getAllAgentsForAdmin: RPC Error:', error);
        return [];
      }
      
      const result = data as { success: boolean; data?: AgentProfile[]; error?: string };
      
      if (!result.success) {
        console.error('❌ getAllAgentsForAdmin: Business Error:', result.error);
        return [];
      }
      
      console.log('✅ getAllAgentsForAdmin: Success, agents:', result.data?.length || 0);
      return result.data ?? [];
      
    } catch (e) {
      console.error('❌ getAllAgentsForAdmin: Exception:', e);
      return [];
    }
  }, []);

  // ── 3. Apply as Agent ─────────────────────────────────────────────────────
  const applyAsAgent = useCallback(async (params: {
    shop_name: string;
    whatsapp: string;
    country: string;
    city: string;
    latitude?: number;
    longitude?: number;
    bio?: string;
  }): Promise<{ success: boolean; error?: string }> => {
    console.log('📝 applyAsAgent: Submitting application...', params);
    
    try {
      const { data, error } = await (supabase as any).rpc('apply_as_agent', {
        p_shop_name: params.shop_name,
        p_whatsapp: params.whatsapp,
        p_country: params.country,
        p_city: params.city,
        p_latitude: params.latitude ?? null,
        p_longitude: params.longitude ?? null,
        p_bio: params.bio ?? null,
      });
      
      if (error) {
        console.error('❌ applyAsAgent: RPC Error:', error);
        return { success: false, error: error.message };
      }
      
      const result = data as { success: boolean; message?: string; error?: string };
      
      if (result.success) {
        console.log('✅ applyAsAgent: Success:', result.message);
      } else {
        console.error('❌ applyAsAgent: Business Error:', result.error);
      }
      
      return { success: result.success, error: result.error };
      
    } catch (e) {
      console.error('❌ applyAsAgent: Exception:', e);
      return { success: false, error: (e as Error).message };
    }
  }, []);

  // ── 4. Request Deposit ─────────────────────────────────────────────────────
  const requestDeposit = useCallback(async (
    amountNova: number,
    paymentMethod: string,
    paymentReference: string
  ): Promise<{ success: boolean; error?: string }> => {
    console.log('💰 requestDeposit: Submitting deposit request...', { amountNova, paymentMethod, paymentReference });
    
    try {
      const { data, error } = await (supabase as any).rpc('agent_request_deposit', {
        p_amount_nova: amountNova,
        p_payment_method: paymentMethod,
        p_payment_reference: paymentReference,
      });
      
      if (error) {
        console.error('❌ requestDeposit: RPC Error:', error);
        return { success: false, error: error.message };
      }
      
      const result = data as { success: boolean; message?: string; error?: string };
      
      if (result.success) {
        console.log('✅ requestDeposit: Success:', result.message);
      } else {
        console.error('❌ requestDeposit: Business Error:', result.error);
      }
      
      return { success: result.success, error: result.error };
      
    } catch (e) {
      console.error('❌ requestDeposit: Exception:', e);
      return { success: false, error: (e as Error).message };
    }
  }, []);

  // ── 5. Get Deposit Requests (for admin) ─────────────────────────────────────
  const getDepositRequests = useCallback(async (status: string = 'pending'): Promise<DepositRequest[]> => {
    console.log('💰 getDepositRequests: Fetching deposit requests...', status);
    
    try {
      const { data, error } = await (supabase as any).rpc('admin_get_deposit_requests', {
        p_status: status,
      });
      
      if (error) {
        console.error('❌ getDepositRequests: RPC Error:', error);
        return [];
      }
      
      const result = data as { success: boolean; data?: DepositRequest[]; error?: string };
      
      if (!result.success) {
        console.error('❌ getDepositRequests: Business Error:', result.error);
        return [];
      }
      
      console.log('✅ getDepositRequests: Success, requests:', result.data?.length || 0);
      return result.data ?? [];
      
    } catch (e) {
      console.error('❌ getDepositRequests: Exception:', e);
      return [];
    }
  }, []);

  // ── 6. Approve Deposit (for admin) ─────────────────────────────────────────
  const approveDeposit = useCallback(async (
    requestId: string,
    adminNotes?: string
  ): Promise<{ success: boolean; error?: string }> => {
    console.log('✅ approveDeposit: Approving deposit request...', { requestId, adminNotes });
    
    try {
      const { data, error } = await (supabase as any).rpc('admin_approve_deposit', {
        p_request_id: requestId,
        p_admin_notes: adminNotes ?? null,
      });
      
      if (error) {
        console.error('❌ approveDeposit: RPC Error:', error);
        return { success: false, error: error.message };
      }
      
      const result = data as { success: boolean; message?: string; error?: string; new_balance?: number };
      
      if (result.success) {
        console.log('✅ approveDeposit: Success:', result.message, 'New balance:', result.new_balance);
      } else {
        console.error('❌ approveDeposit: Business Error:', result.error);
      }
      
      return { success: result.success, error: result.error };
      
    } catch (e) {
      console.error('❌ approveDeposit: Exception:', e);
      return { success: false, error: (e as Error).message };
    }
  }, []);

  // ── 7. Manage Agent (for admin) ───────────────────────────────────────────────
  const manageAgent = useCallback(async (
    agentId: string,
    action: 'approve' | 'suspend'
  ): Promise<{ success: boolean; error?: string }> => {
    console.log('⚙️ manageAgent: Managing agent...', { agentId, action });
    
    try {
      const { data, error } = await (supabase as any).rpc('admin_manage_agent', {
        p_agent_id: agentId,
        p_action: action,
      });
      
      if (error) {
        console.error('❌ manageAgent: RPC Error:', error);
        return { success: false, error: error.message };
      }
      
      const result = data as { success: boolean; message?: string; error?: string; new_status?: string };
      
      if (result.success) {
        console.log('✅ manageAgent: Success:', result.message, 'New status:', result.new_status);
      } else {
        console.error('❌ manageAgent: Business Error:', result.error);
      }
      
      return { success: result.success, error: result.error };
      
    } catch (e) {
      console.error('❌ manageAgent: Exception:', e);
      return { success: false, error: (e as Error).message };
    }
  }, []);

  // ── 8. Get My Agent Profile ────────────────────────────────────────────────
  const getMyAgentProfile = useCallback(async () => {
    console.log('👤 getMyAgentProfile: Fetching my agent profile...');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('ℹ️ getMyAgentProfile: No authenticated user');
        setMyAgentProfile({ found: false });
        return;
      }
      
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.error('❌ getMyAgentProfile: Error:', error);
        setMyAgentProfile({ found: false });
        return;
      }
      
      if (data) {
        console.log('✅ getMyAgentProfile: Found profile:', data);
        setMyAgentProfile({ found: true, ...data });
      } else {
        console.log('ℹ️ getMyAgentProfile: No profile found');
        setMyAgentProfile({ found: false });
      }
      
    } catch (e) {
      console.error('❌ getMyAgentProfile: Exception:', e);
      setMyAgentProfile({ found: false });
    }
  }, []);

  // ── 9. Get Countries ───────────────────────────────────────────────────────
  const getCountries = useCallback(async () => {
    console.log('🌍 getCountries: Fetching countries...');
    
    try {
      const { data, error } = await (supabase as any).rpc('get_countries');
      
      if (error) {
        console.error('❌ getCountries: Error:', error);
        return;
      }
      
      console.log('✅ getCountries: Success, countries:', data?.length || 0);
      setCountries((data as Country[]) ?? []);
      
    } catch (e) {
      console.error('❌ getCountries: Exception:', e);
    }
  }, []);

  // ── 10. Get Cities ──────────────────────────────────────────────────────────
  const getCities = useCallback(async (countryCode: string) => {
    console.log('🏙️ getCities: Fetching cities for:', countryCode);
    
    try {
      const { data, error } = await (supabase as any).rpc('get_cities_by_country', {
        p_country_code: countryCode,
      });
      
      if (error) {
        console.error('❌ getCities: Error:', error);
        setCities([]);
        return;
      }
      
      console.log('✅ getCities: Success, cities:', data?.length || 0);
      setCities((data as City[]) ?? []);
      
    } catch (e) {
      console.error('❌ getCities: Exception:', e);
      setCities([]);
    }
  }, []);

  return {
    // State
    agents,
    loading,
    error,
    myAgentProfile,
    countries,
    cities,
    depositRequests,
    
    // Functions
    getActiveAgents,
    getAllAgentsForAdmin,
    applyAsAgent,
    requestDeposit,
    getDepositRequests,
    approveDeposit,
    manageAgent,
    getMyAgentProfile,
    getCountries,
    getCities,
  };
}
