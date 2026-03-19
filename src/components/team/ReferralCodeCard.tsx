import { useState } from 'react';
import { Copy, Share2, Check, Gift, Users, TrendingUp } from 'lucide-react';
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

  const getShareText = () =>
    language === 'ar'
      ? `انضم إلى WINOVA باستخدام كود الإحالة الخاص بي: ${referralCode}`
      : `Join WINOVA using my referral code: ${referralCode}`;

  const handleShareWhatsApp = () => {
    if (!referralCode) return;
    const text = encodeURIComponent(getShareText());
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const handleShareInstagram = () => {
    if (!referralCode) return;
    // Instagram doesn't support direct share links; copy to clipboard then open Instagram
    navigator.clipboard.writeText(getShareText()).then(() => {
      toast({
        title: language === 'ar' ? 'تم نسخ الكود' : 'Code copied',
        description: language === 'ar'
          ? 'الصق الكود في قصتك على Instagram'
          : 'Paste the code in your Instagram story',
      });
    }).catch(() => {
      toast({
        title: language === 'ar' ? 'فشل النسخ' : 'Copy failed',
        description: language === 'ar'
          ? 'انسخ الكود يدوياً ثم افتح Instagram'
          : 'Copy the code manually then open Instagram',
        variant: 'destructive',
      });
    });
    window.open('https://www.instagram.com/', '_blank');
  };

  const handleShare = async () => {
    if (!referralCode) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'WINOVA Referral', text: getShareText() });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') handleCopy();
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

        {/* Share via WhatsApp & Instagram */}
        <div className="flex gap-2 mt-3">
          <Button
            variant="outline"
            className="flex-1 gap-2 text-xs h-9 border-green-500/40 text-green-600 hover:bg-green-500/10"
            onClick={handleShareWhatsApp}
            disabled={!referralCode}
          >
            {/* WhatsApp icon */}
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            WhatsApp
          </Button>
          <Button
            variant="outline"
            className="flex-1 gap-2 text-xs h-9 border-pink-500/40 text-pink-600 hover:bg-pink-500/10"
            onClick={handleShareInstagram}
            disabled={!referralCode}
          >
            {/* Instagram icon */}
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
            Instagram
          </Button>
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
