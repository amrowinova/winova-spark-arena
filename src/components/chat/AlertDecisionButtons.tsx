import { useState, useEffect } from 'react';
import { Check, Clock, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBanner } from '@/contexts/BannerContext';
import { useAlertDecision, DecisionType } from '@/hooks/useAlertDecision';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AlertDecisionButtonsProps {
  messageId: string;
  conversationId: string;
  messageContent: string;
}

export function AlertDecisionButtons({
  messageId,
  conversationId,
  messageContent,
}: AlertDecisionButtonsProps) {
  const { language } = useLanguage();
  const { success: showSuccess } = useBanner();
  const { makeDecision, isDecisionPending } = useAlertDecision();
  const { user } = useAuth();
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [pendingAction, setPendingAction] = useState<DecisionType | null>(null);
  const [reason, setReason] = useState('');
  const [existingDecision, setExistingDecision] = useState<string | null>(null);
  const isPending = isDecisionPending(messageId);

  // Check if decision already made for this message
  useEffect(() => {
    if (!user) return;
    supabase
      .from('decision_history')
      .select('decision')
      .eq('message_id', messageId)
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setExistingDecision(data.decision);
      });
  }, [messageId, user]);

  if (existingDecision) {
    const labels: Record<string, { en: string; ar: string; icon: React.ReactNode }> = {
      approve: { en: 'Approved', ar: 'تمت الموافقة', icon: <Check className="h-3 w-3" /> },
      defer: { en: 'Deferred', ar: 'تم التأجيل', icon: <Clock className="h-3 w-3" /> },
      reject: { en: 'Rejected', ar: 'تم الرفض', icon: <X className="h-3 w-3" /> },
    };
    const label = labels[existingDecision] || labels.approve;
    return (
      <div className="flex items-center gap-1.5 mt-2 px-1 text-xs text-muted-foreground">
        {label.icon}
        <span>{language === 'ar' ? label.ar : label.en}</span>
      </div>
    );
  }

  const handleAction = async (action: DecisionType) => {
    if (action === 'reject' || action === 'defer') {
      setPendingAction(action);
      setShowReasonInput(true);
      return;
    }
    await executeDecision(action);
  };

  const executeDecision = async (action: DecisionType, actionReason?: string) => {
    const result = await makeDecision(messageId, conversationId, messageContent, action, actionReason);
    if (result.success) {
      setExistingDecision(action);
      setShowReasonInput(false);
      setReason('');
      const msgs: Record<DecisionType, string> = {
        approve: language === 'ar' ? '✅ تمت الموافقة — تم إنشاء مهمة التنفيذ' : '✅ Approved — Execution task created',
        defer: language === 'ar' ? '⏳ تم التأجيل' : '⏳ Deferred',
        reject: language === 'ar' ? '❌ تم الرفض' : '❌ Rejected',
      };
      showSuccess(msgs[action]);
    }
  };

  const handleSubmitReason = () => {
    if (pendingAction) {
      executeDecision(pendingAction, reason);
    }
  };

  return (
    <div className="mt-2 space-y-2">
      {!showReasonInput && (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="default"
            className="h-7 text-xs gap-1"
            onClick={() => handleAction('approve')}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            {language === 'ar' ? 'موافقة' : 'Approve'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={() => handleAction('defer')}
            disabled={isPending}
          >
            <Clock className="h-3 w-3" />
            {language === 'ar' ? 'تأجيل' : 'Defer'}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="h-7 text-xs gap-1"
            onClick={() => handleAction('reject')}
            disabled={isPending}
          >
            <X className="h-3 w-3" />
            {language === 'ar' ? 'رفض' : 'Reject'}
          </Button>
        </div>
      )}

      {showReasonInput && (
        <div className="space-y-2">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={language === 'ar' ? 'سبب القرار (اختياري)...' : 'Reason for decision (optional)...'}
            className="min-h-[60px] text-xs"
          />
          <div className="flex gap-2">
            <Button size="sm" className="h-7 text-xs" onClick={handleSubmitReason} disabled={isPending}>
              {isPending ? <Loader2 className="h-3 w-3 animate-spin me-1" /> : null}
              {language === 'ar' ? 'تأكيد' : 'Confirm'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => { setShowReasonInput(false); setPendingAction(null); setReason(''); }}
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}