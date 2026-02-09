import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AI_SYSTEM_USER_ID } from '@/lib/aiSystemUser';
import { useToast } from '@/hooks/use-toast';

interface EvolutionDecisionButtonsProps {
  entityId: string;
  entityType: 'promotion' | 'retirement';
  conversationId: string;
}

export function EvolutionDecisionButtons({ entityId, entityType, conversationId }: EvolutionDecisionButtonsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<'idle' | 'loading' | 'decided'>('idle');
  const [decision, setDecision] = useState<string | null>(null);

  const handleDecision = async (action: 'approve' | 'reject') => {
    if (!user || status !== 'idle') return;
    setStatus('loading');

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const body: any = {
        action: action === 'approve'
          ? (entityType === 'promotion' ? 'approve_promotion' : 'approve_retirement')
          : (entityType === 'promotion' ? 'reject_promotion' : 'reject_retirement'),
        user_id: user.id,
      };

      if (entityType === 'promotion') {
        body.promotion_id = entityId;
      } else {
        body.retirement_id = entityId;
      }

      const res = await fetch(`${supabaseUrl}/functions/v1/ai-evolution-engine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify(body),
      });

      const result = await res.json();

      if (result.success) {
        setDecision(action);
        setStatus('decided');
        toast({
          title: action === 'approve' ? '✅ تمت الموافقة' : '❌ تم الرفض',
        });
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      setStatus('idle');
      toast({
        title: 'خطأ',
        description: String(err),
        variant: 'destructive',
      });
    }
  };

  if (status === 'decided') {
    return (
      <div className="mt-2 pt-2 border-t border-border/30">
        <span className={`text-xs font-medium ${decision === 'approve' ? 'text-primary' : 'text-destructive'}`}>
          {decision === 'approve' ? '✅ تمت الموافقة' : '❌ تم الرفض'}
        </span>
      </div>
    );
  }

  return (
    <div className="mt-3 pt-2 border-t border-border/30 flex gap-2">
      <Button
        size="sm"
        variant="default"
        className="flex-1 text-xs h-8"
        onClick={() => handleDecision('approve')}
        disabled={status === 'loading'}
      >
        {status === 'loading' ? '⏳' : '✅'} موافقة
      </Button>
      <Button
        size="sm"
        variant="destructive"
        className="flex-1 text-xs h-8"
        onClick={() => handleDecision('reject')}
        disabled={status === 'loading'}
      >
        {status === 'loading' ? '⏳' : '❌'} رفض
      </Button>
    </div>
  );
}
