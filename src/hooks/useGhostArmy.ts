import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export type SimulationScenario = 'full' | 'wallet' | 'chat' | 'referral' | 'contest' | 'fraud' | 'social' | 'p2p';

export interface BehavioralMetrics {
  follows_created: number;
  follows_failed: number;
  p2p_orders_created: number;
  p2p_orders_accepted: number;
  p2p_orders_cancelled: number;
  p2p_orders_completed: number;
  p2p_disputes: number;
  ratings_submitted: number;
  ratings_positive: number;
  ratings_negative: number;
  profiles_viewed: number;
  chats_started: number;
  messages_sent: number;
  referrals_attempted: number;
  referrals_succeeded: number;
}

export interface GhostArmyStatus {
  provisioned: number;
  referralLinks: number;
  lastSimulation: {
    scenario?: SimulationScenario;
    safe_mode?: boolean;
    agents_tested?: number;
    total_tests: number;
    passed: number;
    failed: number;
    warnings: number;
    critical_issues: number;
    duration_ms: number;
    behavioral?: BehavioralMetrics;
    // Legacy fields
    avg_chat_latency_ms?: number;
    chat_delivered?: number;
    chat_attempted?: number;
    referral_links_tested?: number;
    fraud_tests_run?: number;
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
  const [isSocializing, setIsSocializing] = useState(false);
  const [isEconomyRunning, setIsEconomyRunning] = useState(false);
  const [isChaosRunning, setIsChaosRunning] = useState(false);
  const [economyMetrics, setEconomyMetrics] = useState<any>(null);
  const [chaosResults, setChaosResults] = useState<any>(null);
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
        description: `Created: ${data.summary.created}, Referral links: ${data.summary.referral_links}`,
      });
      await checkStatus();
      return data;
    } catch (err: any) {
      toast({ title: 'Provisioning Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsProvisioning(false);
    }
  };

  const simulate = async (scenario: SimulationScenario = 'full', safeMode = true, persist = false) => {
    setIsSimulating(true);
    try {
      const { data, error } = await supabase.functions.invoke('ghost-army-simulate', {
        body: { scenario, safe_mode: safeMode, persist },
      });
      if (error) throw error;
      setStatus(prev => ({
        ...prev,
        lastSimulation: data.summary ? { ...data.summary, results: data.results } : null,
      }));
      const emoji = data.summary.critical_issues > 0 ? '🔴' : data.summary.failed > 0 ? '🟡' : '🟢';
      const label = scenario.charAt(0).toUpperCase() + scenario.slice(1);
      const bm = data.summary.behavioral;
      const extra = bm ? ` | ${bm.p2p_orders_completed} trades, ${bm.follows_created} follows` : '';
      toast({
        title: `${emoji} ${label} Mission Complete`,
        description: `${data.summary.passed} passed, ${data.summary.failed} failed, ${data.summary.duration_ms}ms${extra}`,
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

  const socialSimulate = async (chatCount = 30, messagesPerChat = 4) => {
    setIsSocializing(true);
    try {
      const { data, error } = await supabase.functions.invoke('ghost-army-social', {
        body: { chat_count: chatCount, messages_per_chat: messagesPerChat },
      });
      if (error) throw error;
      const s = data.summary;
      toast({
        title: `🧠 Sentient Social Complete`,
        description: `${s.conversations_created} conversations, ${s.messages_sent} messages, ${s.duration_ms}ms`,
      });
      return data;
    } catch (err: any) {
      toast({ title: 'Social Simulation Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsSocializing(false);
    }
  };

  const economySimulate = async (tradeCount = 50, seedAmount = 10, cycles = 1, enableTips = true, enableHunger = true, tipCount = 20) => {
    setIsEconomyRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('ghost-army-economy', {
        body: { trade_count: tradeCount, seed_amount: seedAmount, cycles, enable_tips: enableTips, enable_hunger: enableHunger, tip_count: tipCount },
      });
      if (error) throw error;
      const s = data.summary;
      setEconomyMetrics(s);
      const emoji = s.escrows_released > 0 ? '🏙️' : '⚠️';
      toast({
        title: `${emoji} Autonomous Economy Complete`,
        description: `${s.escrows_released} trades, ${s.tips_sent} tips, ${s.contest_joined} contests | ${s.total_nova_traded + s.tips_nova_total}И moved`,
      });
      return data;
    } catch (err: any) {
      toast({ title: 'Economy Simulation Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsEconomyRunning(false);
    }
  };

  const chaosSimulate = async () => {
    setIsChaosRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('ghost-army-chaos');
      if (error) throw error;
      setChaosResults(data);
      const s = data.summary;
      const emoji = s.critical_breaches > 0 ? '🔴' : s.breaches > 0 ? '🟡' : '🟢';
      toast({
        title: `${emoji} Chaos Test: ${s.immune_score}% Immune`,
        description: `${s.defenses} defended, ${s.breaches} breached (${s.critical_breaches} critical)`,
        variant: s.critical_breaches > 0 ? 'destructive' : undefined,
      });
      return data;
    } catch (err: any) {
      toast({ title: 'Chaos Simulation Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsChaosRunning(false);
    }
  };

  return {
    status, isProvisioning, isSimulating, isCleaning, isAnalyzing, isSocializing, isEconomyRunning, isChaosRunning,
    economyMetrics, chaosResults,
    checkStatus, provision, simulate, analyze, cleanup, socialSimulate, economySimulate, chaosSimulate,
  };
}
