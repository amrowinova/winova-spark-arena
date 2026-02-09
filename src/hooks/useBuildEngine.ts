import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface BuildResult {
  success: boolean;
  project_id?: string;
  error?: string;
}

/**
 * Hook to trigger the WINOVA Software Factory build engine from the DM chat.
 */
export function useBuildEngine() {
  const { user } = useAuth();
  const [isBuilding, setIsBuilding] = useState(false);

  const startBuild = useCallback(async (
    description: string,
    conversationId: string
  ): Promise<BuildResult> => {
    if (!user) return { success: false, error: 'Not authenticated' };

    setIsBuilding(true);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const res = await fetch(`${supabaseUrl}/functions/v1/ai-build-engine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          action: 'start',
          description,
          conversation_id: conversationId,
          requested_by: user.id,
        }),
      });

      const result = await res.json();
      return result;
    } catch (err) {
      return { success: false, error: String(err) };
    } finally {
      setIsBuilding(false);
    }
  }, [user]);

  /**
   * Detect if a message content is a build request.
   * Patterns: "Build me X", "ابني لي X", "أنشئ X", etc.
   */
  const isBuildRequest = useCallback((content: string): boolean => {
    const patterns = [
      /^build\s+(me\s+)?/i,
      /^create\s+(me\s+)?/i,
      /^ابني?\s+(لي\s+)?/,
      /^أنشئ\s+(لي\s+)?/,
      /^صمم\s+(لي\s+)?/,
      /^طور\s+(لي\s+)?/,
      /^اصنع\s+(لي\s+)?/,
    ];
    return patterns.some(p => p.test(content.trim()));
  }, []);

  return { startBuild, isBuilding, isBuildRequest };
}
