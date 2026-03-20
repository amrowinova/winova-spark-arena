import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  DEFAULT_CONTEST_CONFIG,
  enrichDistribution,
  type ContestConfig,
} from '@/lib/contestModel';

function parseContestConfig(raw: unknown): ContestConfig {
  if (!raw || typeof raw !== 'object') return DEFAULT_CONTEST_CONFIG;
  const obj = raw as Record<string, unknown>;

  const entryFee =
    typeof obj.entryFee === 'number' && obj.entryFee > 0
      ? obj.entryFee
      : DEFAULT_CONTEST_CONFIG.entryFee;

  const prizePoolRate =
    typeof obj.prizePoolRate === 'number' && obj.prizePoolRate > 0
      ? obj.prizePoolRate
      : DEFAULT_CONTEST_CONFIG.prizePoolRate;

  const rawDist = Array.isArray(obj.distribution) ? obj.distribution : null;
  const distribution =
    rawDist && rawDist.length > 0
      ? enrichDistribution(
          rawDist
            .filter(
              (d) =>
                d &&
                typeof d === 'object' &&
                typeof (d as Record<string, unknown>).place === 'number' &&
                typeof (d as Record<string, unknown>).pct === 'number'
            )
            .map((d) => ({
              place: (d as Record<string, unknown>).place as number,
              pct: (d as Record<string, unknown>).pct as number,
            }))
        )
      : DEFAULT_CONTEST_CONFIG.distribution;

  return { entryFee, prizePoolRate, distribution };
}

async function fetchContestConfig(): Promise<ContestConfig> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'contest_config')
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch contest_config: ${error.message}`);
  if (!data) return DEFAULT_CONTEST_CONFIG;
  return parseContestConfig(data.value);
}

export function useContestConfig() {
  const { data, isLoading } = useQuery({
    queryKey: ['contest_config'],
    queryFn: fetchContestConfig,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  return {
    config: data ?? DEFAULT_CONTEST_CONFIG,
    isLoading,
  };
}

export async function saveContestConfig(
  config: ContestConfig
): Promise<void> {
  const payload = {
    entryFee: config.entryFee,
    prizePoolRate: config.prizePoolRate,
    distribution: config.distribution.map(({ place, pct }) => ({ place, pct })),
  };

  const { error } = await supabase
    .from('app_settings')
    .upsert({ key: 'contest_config', value: payload }, { onConflict: 'key' });

  if (error) throw new Error(`Failed to save contest_config: ${error.message}`);
}
