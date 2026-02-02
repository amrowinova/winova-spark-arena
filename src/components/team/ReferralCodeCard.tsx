import { useState } from 'react';
import { Copy, Share2, Check, Gift } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProfile } from '@/hooks/useProfile';
import { toast } from '@/hooks/use-toast';

export function ReferralCodeCard() {
  const { language } = useLanguage();
  const { profile, isLoading } = useProfile();
  const [copied, setCopied] = useState(false);

  const referralCode = profile?.referral_code || '';

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
        // User cancelled or share failed
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    } else {
      // Fallback to copy
      handleCopy();
    }
  };

  if (isLoading) {
    return (
      <Card className="p-4 animate-pulse">
        <div className="h-16 bg-muted rounded" />
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

        {/* Description */}
        <p className="text-xs text-muted-foreground mt-2 text-center">
          {language === 'ar' 
            ? 'شارك هذا الكود لدعوة أصدقائك وبناء فريقك'
            : 'Share this code to invite friends and build your team'}
        </p>
      </div>
    </Card>
  );
}
