import { useState, useEffect } from 'react';
import { Check, Clock, X, Loader2, Shield, FlaskConical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useBanner } from '@/contexts/BannerContext';
import { useExecutionDecision } from '@/hooks/useExecutionDecision';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ExecutionDecisionButtonsProps {
  requestId: string;
  conversationId: string;
}

export function ExecutionDecisionButtons({
  requestId,
  conversationId,
}: ExecutionDecisionButtonsProps) {
  const { success: showSuccess, error: showError } = useBanner();
  const { makeExecDecision, isPending } = useExecutionDecision();
  const { user } = useAuth();
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [pendingAction, setPendingAction] = useState<'defer' | 'reject' | null>(null);
  const [reason, setReason] = useState('');
  const [existingStatus, setExistingStatus] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [riskLevel, setRiskLevel] = useState<string | null>(null);
  const pending = isPending(requestId);

  // Check current status and risk level
  useEffect(() => {
    if (!user || !requestId) return;
    supabase
      .from('ai_execution_requests')
      .select('status, risk_level, simulation_verdict')
      .eq('id', requestId)
      .single()
      .then(({ data }) => {
        if (data && data.status !== 'pending') {
          setExistingStatus(data.status);
        }
        if (data) {
          setRiskLevel(data.risk_level);
        }
      });
  }, [requestId, user]);

  // Already decided — show status badge
  if (existingStatus) {
    const badges: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      approved: { label: '✅ تمت الموافقة', variant: 'default' },
      completed: { label: '🎉 اكتمل التنفيذ', variant: 'default' },
      deferred: { label: '⏳ مؤجل', variant: 'secondary' },
      rejected: { label: '❌ مرفوض', variant: 'destructive' },
      failed: { label: '❌ فشل التنفيذ', variant: 'destructive' },
      rolled_back: { label: '🔄 تم التراجع', variant: 'outline' },
      expired: { label: '⏰ منتهي الصلاحية', variant: 'outline' },
      executing: { label: '⚡ جاري التنفيذ...', variant: 'secondary' },
    };
    const badge = badges[existingStatus] || { label: existingStatus, variant: 'outline' as const };
    return (
      <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-border/30">
        <Shield className="h-3 w-3 text-muted-foreground" />
        <Badge variant={badge.variant} className="text-xs">
          {badge.label}
        </Badge>
      </div>
    );
  }

  const requiresSimulation = ['medium', 'high', 'critical'].includes(riskLevel || '');

  const handleAction = async (action: 'approve' | 'defer' | 'reject') => {
    if (action === 'defer' || action === 'reject') {
      setPendingAction(action);
      setShowReasonInput(true);
      return;
    }
    // Approve — simulation will run automatically for medium/high/critical
    if (requiresSimulation) {
      setIsSimulating(true);
    }
    const result = await makeExecDecision(requestId, conversationId, 'approve');
    setIsSimulating(false);
    if (result.success) {
      setExistingStatus('approved');
      showSuccess('✅ تمت الموافقة — بدأ التنفيذ');
    } else {
      showError('فشل في تسجيل القرار');
    }
  };

  const handleSubmitReason = async () => {
    if (!pendingAction) return;
    const result = await makeExecDecision(requestId, conversationId, pendingAction, reason);
    if (result.success) {
      setExistingStatus(pendingAction === 'defer' ? 'deferred' : 'rejected');
      showSuccess(pendingAction === 'defer' ? '⏳ تم التأجيل' : '❌ تم الرفض');
      setShowReasonInput(false);
      setReason('');
      setPendingAction(null);
    } else {
      showError('فشل في تسجيل القرار');
    }
  };

  return (
    <div className="mt-3 pt-2 border-t border-border/30 space-y-2">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
        <Shield className="h-3 w-3" />
        <span>قرار التنفيذ</span>
        {requiresSimulation && (
          <Badge variant="outline" className="text-[9px] h-4 gap-0.5 ms-1">
            <FlaskConical className="h-2.5 w-2.5" />
            محاكاة مطلوبة
          </Badge>
        )}
      </div>

      {isSimulating && (
        <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-accent/20 border border-accent/30">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <div>
            <p className="text-xs font-medium">🏗️ عالم الظل — جاري المحاكاة...</p>
            <p className="text-[10px] text-muted-foreground">
              تشغيل 7 سيناريوهات أمان قبل التنفيذ
            </p>
          </div>
        </div>
      )}

      {!showReasonInput && !isSimulating && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="default"
            className="h-8 text-xs gap-1.5 flex-1"
            onClick={() => handleAction('approve')}
            disabled={pending}
          >
            {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            ✅ موافقة
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5 flex-1"
            onClick={() => handleAction('defer')}
            disabled={pending}
          >
            <Clock className="h-3 w-3" />
            ⏳ تأجيل
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="h-8 text-xs gap-1.5 flex-1"
            onClick={() => handleAction('reject')}
            disabled={pending}
          >
            <X className="h-3 w-3" />
            ❌ رفض
          </Button>
        </div>
      )}

      {showReasonInput && (
        <div className="space-y-2">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="سبب القرار (اختياري)..."
            className="min-h-[60px] text-xs"
            dir="rtl"
          />
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs" onClick={handleSubmitReason} disabled={pending}>
              {pending ? <Loader2 className="h-3 w-3 animate-spin me-1" /> : null}
              تأكيد
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => { setShowReasonInput(false); setPendingAction(null); setReason(''); }}
            >
              إلغاء
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
