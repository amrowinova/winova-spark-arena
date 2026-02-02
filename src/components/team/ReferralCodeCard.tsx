import { useState } from 'react';
import { Copy, Share2, Check, Gift, Users, TrendingUp, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeamStats } from '@/hooks/useTeamStats';
import { toast } from '@/hooks/use-toast';

export function ReferralCodeCard() {
  const { language } = useLanguage();
  const { referralStats, loading } = useTeamStats();
  const [copied, setCopied] = useState(false);

  const referralCode = referralStats?.referral_code || '';
  const totalInvited = referralStats?.total_invited ?? 0;
  const activeInvited = referralStats?.active_invited ?? 0;
  const conversionRate = referralStats?.conversion_rate ?? 0;

  const handleCopy = async () => {
    if (!referralCode) return;
    
    try {
      await navigator.clipboard.writeText(referralCode);
      setCopied(true);
      toast({
        title: language === 'ar' ? 'تم النسخ!' : 'Copied!',
        description: language === 'ar' ? 'تم نسخ كود الإحالة' : 'Referral code copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل في النسخ' : 'Failed to copy',
        variant: 'destructive',
      });
    }
  };

  const handleShare = async () => {
    if (!referralCode) return;
    
    const shareText = language === 'ar' 
      ? `انضم إلى WINOVA باستخدام كود الإحالة الخاص بي: ${referralCode}`
      : `Join WINOVA using my referral code: ${referralCode}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'WINOVA Referral',
          text: shareText,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      handleCopy();
    }
  };

  if (loading) {
    return (
      <Card className="p-4 animate-pulse">
        <div className="h-24 bg-muted rounded" />
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-0 shadow-md">
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 bg-primary/10 rounded-full">
            <Gift className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-semibold text-sm">
            {language === 'ar' ? 'كود الإحالة الخاص بك' : 'Your Referral Code'}
          </h3>
        </div>

        {/* Code Display */}
        <div className="bg-background rounded-lg p-3 flex items-center justify-between gap-2">
          <code className="text-lg font-bold tracking-wider text-primary flex-1 text-center">
            {referralCode || '---'}
          </code>
          
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={handleCopy}
              disabled={!referralCode}
            >
              {copied ? (
                <Check className="h-4 w-4 text-success" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={handleShare}
              disabled={!referralCode}
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Stats - Real Data */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <div className="bg-background/50 rounded-lg p-2 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users className="h-3 w-3 text-primary" />
            </div>
            <p className="text-lg font-bold text-primary">{totalInvited}</p>
            <p className="text-[10px] text-muted-foreground">
              {language === 'ar' ? 'إجمالي الدعوات' : 'Total Invited'}
            </p>
          </div>
          
          <div className="bg-background/50 rounded-lg p-2 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Check className="h-3 w-3 text-success" />
            </div>
            <p className="text-lg font-bold text-success">{activeInvited}</p>
            <p className="text-[10px] text-muted-foreground">
              {language === 'ar' ? 'نشط' : 'Active'}
            </p>
          </div>
          
          <div className="bg-background/50 rounded-lg p-2 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-3 w-3 text-warning" />
            </div>
            <p className="text-lg font-bold text-warning">{conversionRate}%</p>
            <p className="text-[10px] text-muted-foreground">
              {language === 'ar' ? 'معدل التحويل' : 'Conversion'}
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-muted-foreground mt-3 text-center">
          {language === 'ar' 
            ? 'شارك هذا الكود لدعوة أصدقائك وبناء فريقك'
            : 'Share this code to invite friends and build your team'}
        </p>
      </div>
    </Card>
  );
}
