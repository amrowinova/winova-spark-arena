import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useExecutionPermissions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['ai-execution-permissions'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ai_execution_permissions')
        .select('*')
        .order('category');
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });
}

export function useExecutionRequests(statusFilter?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['ai-execution-requests', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('ai_execution_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      const { data } = await query;
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 15000,
  });
}

export function useExecutionResults(requestId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['ai-execution-results', requestId],
    queryFn: async () => {
      let query = supabase
        .from('ai_execution_results')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      if (requestId) query = query.eq('request_id', requestId);
      const { data } = await query;
      return data || [];
    },
    enabled: !!user,
  });
}

export function useTogglePermission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('ai_execution_permissions')
        .update({ is_enabled: enabled, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai-execution-permissions'] }),
  });
}

export function useUpdatePermissionAutonomy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, requiredLevel }: { id: string; requiredLevel: number }) => {
      const { error } = await supabase
        .from('ai_execution_permissions')
        .update({ 
          required_auto_execute_level: requiredLevel, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai-execution-permissions'] }),
  });
}

export function useApproveRequest() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('ai_execution_requests')
        .update({
          status: 'approved',
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai-execution-requests'] }),
  });
}

export function useRejectRequest() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ requestId, reason }: { requestId: string; reason: string }) => {
      const { error } = await supabase
        .from('ai_execution_requests')
        .update({
          status: 'rejected',
          rejected_by: user?.id,
          rejected_at: new Date().toISOString(),
          rejection_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai-execution-requests'] }),
  });
}
