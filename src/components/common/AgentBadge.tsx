import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AgentBadgeProps {
  userId: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function AgentBadge({ userId, showText = true, size = 'sm' }: AgentBadgeProps) {
  const [isAgent, setIsAgent] = useState(false);
  const [loading, setLoading] = useState(true);

  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  useEffect(() => {
    const checkAgentStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('agents')
          .select('id')
          .eq('user_id', userId)
          .eq('status', 'active')
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Error checking agent status:', error);
        }

        setIsAgent(!!data);
      } catch (error) {
        console.error('Error checking agent status:', error);
        setIsAgent(false);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      checkAgentStatus();
    }
  }, [userId]);

  if (loading || !isAgent) {
    return null;
  }

  return (
    <span className={`inline-flex items-center gap-1 bg-green-100 text-green-800 rounded-full ${sizeClasses[size]}`}>
      <span className="text-green-600">🏪</span>
      {showText && <span className="font-medium">وكيل موثق</span>}
    </span>
  );
}
