import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { logWalletFreeze } from '@/lib/auditLogger';
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

const FREEZE_REASONS = [
  { value: 'fraud', label: 'Fraud', labelAr: 'احتيال' },
  { value: 'scam', label: 'Scam', labelAr: 'نصب' },
  { value: 'chargeback', label: 'Chargeback', labelAr: 'استرداد مبالغ' },
  { value: 'manual_review', label: 'Manual Review', labelAr: 'مراجعة يدوية' },
  { value: 'other', label: 'Other', labelAr: 'أخرى' },
];

export function WalletFreezeDialog({ 
  open, 
  onOpenChange, 
  user, 
  onSuccess,
  canUnfreeze = false 
}: WalletFreezeDialogProps) {
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
      toast.error(isRTL ? 'يرجى اختيار سبب التجميد' : 'Please select a freeze reason');
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

      toast.success(isRTL ? 'تم تجميد المحفظة بنجاح' : 'Wallet frozen successfully');
      
      setSelectedReason('');
      setCustomReason('');
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error freezing wallet:', error);
      toast.error(isRTL ? 'حدث خطأ' : 'An error occurred');
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

      toast.success(isRTL ? 'تم فك تجميد المحفظة بنجاح' : 'Wallet unfrozen successfully');
      
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error unfreezing wallet:', error);
      toast.error(isRTL ? 'حدث خطأ' : 'An error occurred');
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
                {isRTL ? 'فك تجميد المحفظة' : 'Unfreeze Wallet'}
              </>
            ) : (
              <>
                <Lock className="w-5 h-5 text-destructive" />
                {isRTL ? 'تجميد المحفظة' : 'Freeze Wallet'}
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isFrozen 
              ? (isRTL ? 'فك تجميد محفظة المستخدم للسماح بالعمليات المالية' : 'Unfreeze wallet to allow financial operations')
              : (isRTL ? 'تجميد محفظة المستخدم يمنع جميع العمليات المالية' : 'Freezing wallet blocks all financial operations')
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
                {isRTL ? 'مجمّد' : 'Frozen'}
              </div>
            )}
          </div>

          {/* Freeze Form - Only show when not frozen */}
          {!isFrozen && (
            <>
              <div className="space-y-3">
                <Label className="text-sm font-medium">
                  {isRTL ? 'سبب التجميد *' : 'Freeze Reason *'}
                </Label>
                <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
                  {FREEZE_REASONS.map((reason) => (
                    <div key={reason.value} className="flex items-center space-x-2 rtl:space-x-reverse">
                      <RadioGroupItem value={reason.value} id={reason.value} />
                      <Label htmlFor={reason.value} className="text-sm cursor-pointer">
                        {isRTL ? reason.labelAr : reason.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {selectedReason === 'other' && (
                <div className="space-y-2">
                  <Label>{isRTL ? 'السبب' : 'Reason'}</Label>
                  <Textarea
                    placeholder={isRTL ? 'أدخل سبب التجميد...' : 'Enter freeze reason...'}
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
                  {isRTL 
                    ? 'تجميد المحفظة سيمنع المستخدم من: التحويل، التداول P2P، والسحب.'
                    : 'Freezing will block: transfers, P2P trading, and withdrawals.'}
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
                {isRTL ? 'تجميد المحفظة' : 'Freeze Wallet'}
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
                  {isRTL ? 'فك تجميد المحفظة' : 'Unfreeze Wallet'}
                </Button>
              ) : (
                <div className="p-3 rounded-lg bg-muted text-center">
                  <p className="text-sm text-muted-foreground">
                    {isRTL 
                      ? 'فقط المشرف يستطيع فك التجميد. تواصل مع المشرف.'
                      : 'Only Admin can unfreeze. Contact your administrator.'}
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
