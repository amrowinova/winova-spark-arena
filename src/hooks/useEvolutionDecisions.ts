import { useCallback, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to trigger evolution engine actions from the frontend.
 */
export function useEvolutionDecisions() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const callEvolution = useCallback(async (body: Record<string, any>) => {
    if (!user) return { success: false, error: 'Not authenticated' };
    setLoading(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(`${supabaseUrl}/functions/v1/ai-evolution-engine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify(body),
      });

      return await res.json();
    } catch (err) {
      return { success: false, error: String(err) };
    } finally {
      setLoading(false);
    }
  }, [user]);

  const triggerCycle = useCallback(() => callEvolution({ action: 'run_cycle' }), [callEvolution]);

  return { callEvolution, triggerCycle, loading };
}
