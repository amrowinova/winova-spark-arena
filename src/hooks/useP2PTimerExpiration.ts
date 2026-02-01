import { useEffect, useRef, useCallback } from 'react';
import { P2POrder } from '@/contexts/P2PContext';

interface UseP2PTimerExpirationProps {
  order: P2POrder | null;
  onExpired: (orderId: string) => void;
  enabled?: boolean;
}

/**
 * Hook to handle automatic order expiration when timer runs out
 * 
 * Rules:
 * - Only active for matched orders (not open/created)
 * - Only active during waiting_payment or paid status
 * - Triggers onExpired callback when timer reaches zero
 * - Does NOT trigger for already completed/cancelled/disputed orders
 */
export function useP2PTimerExpiration({
  order,
  onExpired,
  enabled = true,
}: UseP2PTimerExpirationProps) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasExpiredRef = useRef<string | null>(null);

  const cleanup = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Cleanup on unmount
    return cleanup;
  }, [cleanup]);

  useEffect(() => {
    if (!enabled || !order) {
      cleanup();
      return;
    }

    // Only track timer for matched orders in active states
    const isMatched = order.status !== 'created';
    const isActiveState = ['waiting_payment', 'paid'].includes(order.status);
    
    if (!isMatched || !isActiveState) {
      cleanup();
      return;
    }

    // Skip if we already triggered expiration for this order
    if (hasExpiredRef.current === order.id) {
      return;
    }

    const now = new Date().getTime();
    const expiresAt = order.expiresAt.getTime();
    const timeRemaining = expiresAt - now;

    // Already expired
    if (timeRemaining <= 0) {
      hasExpiredRef.current = order.id;
      onExpired(order.id);
      return;
    }

    // Set timeout for expiration
    cleanup();
    timeoutRef.current = setTimeout(() => {
      hasExpiredRef.current = order.id;
      onExpired(order.id);
    }, timeRemaining);

    return cleanup;
  }, [order, enabled, onExpired, cleanup]);

  // Reset the expired tracking when order changes
  useEffect(() => {
    if (order && hasExpiredRef.current !== order.id) {
      // New order, reset tracking
      hasExpiredRef.current = null;
    }
  }, [order?.id]);
}

/**
 * Formats remaining time for display
 */
export function formatTimeRemaining(expiresAt: Date): {
  isExpired: boolean;
  minutes: number;
  seconds: number;
  formatted: string;
} {
  const now = new Date().getTime();
  const remaining = expiresAt.getTime() - now;
  
  if (remaining <= 0) {
    return {
      isExpired: true,
      minutes: 0,
      seconds: 0,
      formatted: '00:00',
    };
  }
  
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  
  return {
    isExpired: false,
    minutes,
    seconds,
    formatted: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
  };
}
