import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface GhostArmyStatus {
  provisioned: number;
  lastSimulation: {
    total_tests: number;
    passed: number;
    failed: number;
    warnings: number;
    critical_issues: number;
    duration_ms: number;
    results: any[];
  } | null;
}

export function useGhostArmy() {
  const { toast } = useToast();
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [status, setStatus] = useState<GhostArmyStatus>({ provisioned: 0, lastSimulation: null });

  const checkStatus = async () => {
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .like('username', 'ghost_agent_%');
    setStatus(prev => ({ ...prev, provisioned: count || 0 }));
  };

  const provision = async (count = 100) => {
    setIsProvisioning(true);
    try {
      const { data, error } = await supabase.functions.invoke('ghost-army-provision', {
        body: { count },
      });
      if (error) throw error;
      toast({
        title: 'Ghost Army Deployed',
        description: `Created: ${data.summary.created}, Skipped: ${data.summary.skipped}`,
      });
      await checkStatus();
      return data;
    } catch (err: any) {
      toast({ title: 'Provisioning Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsProvisioning(false);
    }
  };

  const simulate = async () => {
    setIsSimulating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ghost-army-simulate');
      if (error) throw error;
      setStatus(prev => ({ ...prev, lastSimulation: data.summary ? { ...data.summary, results: data.results } : null }));
      const emoji = data.summary.critical_issues > 0 ? '🔴' : data.summary.failed > 0 ? '🟡' : '🟢';
      toast({
        title: `${emoji} Stress Test Complete`,
        description: `${data.summary.passed} passed, ${data.summary.failed} failed, ${data.summary.critical_issues} critical`,
      });
      return data;
    } catch (err: any) {
      toast({ title: 'Simulation Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsSimulating(false);
    }
  };

  const cleanup = async () => {
    setIsCleaning(true);
    try {
      const { data, error } = await supabase.functions.invoke('ghost-army-cleanup');
      if (error) throw error;
      toast({
        title: 'Ghost Army Dissolved',
        description: `${data.deleted} agents removed. Database clean.`,
      });
      setStatus({ provisioned: 0, lastSimulation: null });
      return data;
    } catch (err: any) {
      toast({ title: 'Cleanup Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsCleaning(false);
    }
  };

  return {
    status,
    isProvisioning,
    isSimulating,
    isCleaning,
    checkStatus,
    provision,
    simulate,
    cleanup,
  };
}
