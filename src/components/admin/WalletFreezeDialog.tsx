import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { logWalletFreeze } from '@/lib/auditLogger';
import { logActivity, logKnowledge } from '@/lib/ai/logger';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { 
  Lock, 
  Unlock, 
  User, 
  AlertTriangle,
  Loader2
} from 'lucide-react';

interface WalletFreezeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    user_id: string;
    user_name: string;
    user_avatar: string | null;
    username: string;
    is_frozen?: boolean;
  } | null;
  onSuccess: () => void;
  canUnfreeze?: boolean; // Only Admin can unfreeze
}

const FREEZE_REASON_VALUES = ['fraud', 'scam', 'chargeback', 'manual_review', 'other'] as const;

export function WalletFreezeDialog({ 
  open, 
  onOpenChange, 
  user, 
  onSuccess,
  canUnfreeze = false 
}: WalletFreezeDialogProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user: adminUser } = useAuth();
  const isRTL = language === 'ar';
  
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isFrozen = user?.is_frozen ?? false;
  const canPerformUnfreeze = isFrozen && canUnfreeze;

  const handleFreeze = async () => {
    if (!user || !adminUser) return;
    
    const reason = selectedReason === 'other' ? customReason : selectedReason;
    if (!reason) {
      toast.error(t('admin.walletFreeze.selectReasonError'));
      return;
    }

    setIsLoading(true);

    try {
      // 1. Update wallet
      const { error: walletError } = await supabase
        .from('wallets')
        .update({ 
          is_frozen: true,
          frozen_by: adminUser.id,
          frozen_reason: reason,
          frozen_at: new Date().toISOString(),
        })
        .eq('user_id', user.user_id);

      if (walletError) throw walletError;

      // 2. Log to wallet_freeze_logs
      const { error: logError } = await supabase
        .from('wallet_freeze_logs')
        .insert({
          wallet_id: user.id,
          user_id: user.user_id,
          action: 'freeze',
          performed_by: adminUser.id,
          performed_by_role: 'admin', // Will be determined by actual role
          reason,
        });

      if (logError) console.error('Failed to log freeze action:', logError);

      // 3. Create audit log
      await logWalletFreeze({
        action: 'wallet_freeze',
        walletId: user.id,
        performedBy: adminUser.id,
        targetUserId: user.user_id,
        targetUsername: user.username,
        reason,
      });

      // AI observability: freeze event
      logActivity({ user_id: adminUser.id, role: 'admin', action_type: 'wallet_freeze', entity_type: 'wallet', entity_id: user.id, success: true, after_state: { target_user: user.username, reason } as any });
      logKnowledge({ source: 'admin', event_type: 'wallet_frozen', area: 'wallet', reference_id: user.id, payload: { target_user: user.user_id, reason } as any });

      toast.success(t('admin.walletFreeze.frozenSuccess'));

      setSelectedReason('');
      setCustomReason('');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error freezing wallet:', error);
      toast.error(t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnfreeze = async () => {
    if (!user || !adminUser || !canUnfreeze) return;

    setIsLoading(true);

    try {
      // 1. Update wallet
      const { error: walletError } = await supabase
        .from('wallets')
        .update({ 
          is_frozen: false,
          frozen_by: null,
          frozen_reason: null,
          frozen_at: null,
        })
        .eq('user_id', user.user_id);

      if (walletError) throw walletError;

      // 2. Log to wallet_freeze_logs
      const { error: logError } = await supabase
        .from('wallet_freeze_logs')
        .insert({
          wallet_id: user.id,
          user_id: user.user_id,
          action: 'unfreeze',
          performed_by: adminUser.id,
          performed_by_role: 'admin',
          reason: 'Manual unfreeze by admin',
        });

      if (logError) console.error('Failed to log unfreeze action:', logError);

      // 3. Create audit log
      await logWalletFreeze({
        action: 'wallet_unfreeze',
        walletId: user.id,
        performedBy: adminUser.id,
        targetUserId: user.user_id,
        targetUsername: user.username,
        reason: 'Manual unfreeze by admin',
      });

      // AI observability: unfreeze event
      logActivity({ user_id: adminUser.id, role: 'admin', action_type: 'wallet_unfreeze', entity_type: 'wallet', entity_id: user.id, success: true, after_state: { target_user: user.username } as any });
      logKnowledge({ source: 'admin', event_type: 'wallet_unfrozen', area: 'wallet', reference_id: user.id, payload: { target_user: user.user_id } as any });

      toast.success(t('admin.walletFreeze.unfrozenSuccess'));

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error unfreezing wallet:', error);
      toast.error(t('common.error'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isFrozen ? (
              <>
                <Unlock className="w-5 h-5 text-primary" />
                {t('admin.walletFreeze.unfreezeWallet')}
              </>
            ) : (
              <>
                <Lock className="w-5 h-5 text-destructive" />
                {t('admin.walletFreeze.freezeWallet')}
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isFrozen
              ? t('admin.walletFreeze.descUnfreeze')
              : t('admin.walletFreeze.descFreeze')
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Avatar className="w-12 h-12">
              <AvatarImage src={user.user_avatar || undefined} />
              <AvatarFallback><User className="w-6 h-6" /></AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">{user.user_name}</p>
              <p className="text-sm text-muted-foreground">@{user.username}</p>
            </div>
            {isFrozen && (
              <div className="px-2 py-1 bg-destructive/10 text-destructive text-xs font-medium rounded">
                {t('admin.walletFreeze.frozen')}
              </div>
            )}
          </div>

          {/* Freeze Form - Only show when not frozen */}
          {!isFrozen && (
            <>
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  {t('admin.walletFreeze.reasonLabel')}
                </Label>
                <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
                  {FREEZE_REASON_VALUES.map((value) => (
                    <div key={value} className="flex items-center space-x-2 rtl:space-x-reverse">
                      <RadioGroupItem value={value} id={value} />
                      <Label htmlFor={value} className="text-sm cursor-pointer">
                        {t(`admin.walletFreeze.reasons.${value}`)}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {selectedReason === 'other' && (
                <div className="space-y-2">
                  <Label>{t('admin.walletFreeze.customReasonLabel')}</Label>
                  <Textarea
                    placeholder={t('admin.walletFreeze.reasonPlaceholder')}
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    rows={2}
                  />
                </div>
              )}

              {/* Warning */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 text-destructive">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <p className="text-sm">
                  {t('admin.walletFreeze.warningText')}
                </p>
              </div>

              <Button
                onClick={handleFreeze}
                disabled={isLoading || !selectedReason || (selectedReason === 'other' && !customReason)}
                className="w-full"
                variant="destructive"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin me-2" />
                ) : (
                  <Lock className="w-4 h-4 me-2" />
                )}
                {t('admin.walletFreeze.freezeWallet')}
              </Button>
            </>
          )}

          {/* Unfreeze Button - Only for Admin */}
          {isFrozen && (
            <>
              {canPerformUnfreeze ? (
                <Button
                  onClick={handleUnfreeze}
                  disabled={isLoading}
                  className="w-full"
                  variant="default"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin me-2" />
                  ) : (
                    <Unlock className="w-4 h-4 me-2" />
                  )}
                  {t('admin.walletFreeze.unfreezeWallet')}
                </Button>
              ) : (
                <div className="p-3 rounded-lg bg-muted text-center">
                  <p className="text-sm text-muted-foreground">
                    {t('admin.walletFreeze.onlyAdminCanUnfreeze')}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
