import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ExtendTimeResult {
  success: boolean;
  error?: string;
  new_expires_at?: string;
  extension_count?: number;
}

export function useP2PExtendTime() {
  const [isExtending, setIsExtending] = useState(false);

  // Extend time for an order (only seller can do this, only once)
  const extendTime = useCallback(async (
    orderId: string,
    minutes: number = 10
  ): Promise<ExtendTimeResult> => {
    setIsExtending(true);

    try {
      const { data, error } = await supabase.rpc('p2p_extend_time', {
        p_order_id: orderId,
        p_minutes: minutes,
      });

      if (error) throw error;

      const result = data as unknown as ExtendTimeResult;
      return result;
    } catch (err) {
      console.error('Error extending time:', err);
      return { success: false, error: 'Failed to extend time' };
    } finally {
      setIsExtending(false);
    }
  }, []);

  return {
    isExtending,
    extendTime,
  };
}
