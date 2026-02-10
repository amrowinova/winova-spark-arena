import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type SimulationScenario = 'full' | 'wallet' | 'chat' | 'referral' | 'contest' | 'fraud';

export interface GhostArmyStatus {
  provisioned: number;
  referralLinks: number;
  lastSimulation: {
    scenario?: SimulationScenario;
    safe_mode?: boolean;
    total_tests: number;
    passed: number;
    failed: number;
    warnings: number;
    critical_issues: number;
    duration_ms: number;
    avg_chat_latency_ms: number;
    chat_delivered?: number;
    chat_attempted?: number;
    referral_links_tested: number;
    fraud_tests_run: number;
    results: any[];
  } | null;
  lastAnalysis: {
    overall_health: string;
    critical_findings: string[];
    recommendations: string[];
    hierarchy_depth: number;
    financial_overview: { total_nova: number; total_aura: number; avg_balance: number };
  } | null;
}

export function useGhostArmy() {
  const { toast } = useToast();
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [status, setStatus] = useState<GhostArmyStatus>({
    provisioned: 0, referralLinks: 0, lastSimulation: null, lastAnalysis: null,
  });

  const checkStatus = async () => {
    const { count } = await supabase
      .from('profiles').select('id', { count: 'exact', head: true }).like('username', 'ghost_agent_%');
    
    const { count: refLinks } = await supabase
      .from('team_members').select('id', { count: 'exact', head: true });

    setStatus(prev => ({ ...prev, provisioned: count || 0, referralLinks: refLinks || 0 }));
  };

  const provision = async (count = 200) => {
    setIsProvisioning(true);
    try {
      const { data, error } = await supabase.functions.invoke('ghost-army-provision', {
        body: { count, build_referral_tree: true },
      });
      if (error) throw error;
      toast({
        title: '🌲 Digital Forest Deployed',
        description: `Created: ${data.summary.created}, Referral links: ${data.summary.referral_links}, Circular blocked: ${data.summary.circular_blocked}`,
      });
      await checkStatus();
      return data;
    } catch (err: any) {
      toast({ title: 'Provisioning Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsProvisioning(false);
    }
  };

  const simulate = async (scenario: SimulationScenario = 'full', safeMode = true) => {
    setIsSimulating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ghost-army-simulate', {
        body: { scenario, safe_mode: safeMode },
      });
      if (error) throw error;
      setStatus(prev => ({
        ...prev,
        lastSimulation: data.summary ? { ...data.summary, results: data.results } : null,
      }));
      const emoji = data.summary.critical_issues > 0 ? '🔴' : data.summary.failed > 0 ? '🟡' : '🟢';
      const scenarioLabel = scenario === 'full' ? 'Full' : scenario.charAt(0).toUpperCase() + scenario.slice(1);
      toast({
        title: `${emoji} ${scenarioLabel} Mission Complete`,
        description: `${data.summary.passed} passed, ${data.summary.failed} failed, ${data.summary.duration_ms}ms`,
      });
      return data;
    } catch (err: any) {
      toast({ title: 'Simulation Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsSimulating(false);
    }
  };

  const analyze = async () => {
    setIsAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ghost-army-analyze');
      if (error) throw error;
      setStatus(prev => ({ ...prev, lastAnalysis: data.summary }));
      toast({
        title: `🕵️ Spy Agent Report: ${data.summary.overall_health}`,
        description: `${data.summary.critical_findings.length} findings, ${data.summary.recommendations.length} recommendations`,
      });
      return data;
    } catch (err: any) {
      toast({ title: 'Analysis Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const cleanup = async () => {
    setIsCleaning(true);
    try {
      const { data, error } = await supabase.functions.invoke('ghost-army-cleanup');
      if (error) throw error;
      toast({
        title: '🌲 Digital Forest Dissolved',
        description: `${data.deleted} agents removed. Database clean.`,
      });
      setStatus({ provisioned: 0, referralLinks: 0, lastSimulation: null, lastAnalysis: null });
      return data;
    } catch (err: any) {
      toast({ title: 'Cleanup Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsCleaning(false);
    }
  };

  return {
    status, isProvisioning, isSimulating, isCleaning, isAnalyzing,
    checkStatus, provision, simulate, analyze, cleanup,
  };
}
