import { useState, useEffect, useCallback } from 'react';
import { Copy, Share2, Users, Gift, Check, ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppLayout } from '@/components/layout/AppLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface ReferralStats {
  referredCount: number;
  novaEarned: number;
}

export default function Referral() {
  const { language } = useLanguage();
  const { user } = useUser();
  const navigate = useNavigate();
  const isRTL = language === 'ar';

  const [stats, setStats] = useState<ReferralStats>({ referredCount: 0, novaEarned: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  // Prefer nova_id as the referral code (backwards-compatible: old codes still work)
  const activeCode = user?.novaId || user?.referralCode || '';
  const referralLink = `${window.location.origin}/ref/${activeCode}`;

  const fetchStats = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const [countResult, novaResult] = await Promise.all([
        // Count users referred by current user
        supabase
          .from('profiles')
          .select('user_id', { count: 'exact', head: true })
          .eq('referred_by', user.id),
        // Sum Nova earned from referral bonuses
        supabase
          .from('wallet_ledger')
          .select('amount')
          .eq('user_id', user.id)
          .eq('entry_type', 'referral_bonus'),
      ]);

      const referredCount = countResult.count ?? 0;
      const novaEarned = (novaResult.data ?? []).reduce((sum, r) => sum + Math.abs(Number(r.amount)), 0);

      setStats({ referredCount, novaEarned });
    } catch (err) {
      console.error('Error fetching referral stats:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea');
      el.value = referralLink;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    const text = isRTL
      ? `انضم إلى Winova واربح! استخدم Nova ID الخاص بي: ${activeCode} أو ادخل من الرابط:`
      : `Join Winova and win! Use my Nova ID: ${activeCode} or click the link:`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Winova', text, url: referralLink });
      } catch {
        // User cancelled or share failed — fall back to copy
        handleCopy();
      }
    } else {
      handleCopy();
    }
  };

  const BackIcon = isRTL ? ChevronRight : ChevronLeft;

  return (
    <AppLayout>
      <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-border bg-card">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -m-2 hover:bg-muted rounded-full transition-colors"
          >
            <BackIcon className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold">
            {isRTL ? 'ادعُ صديقاً' : 'Invite a Friend'}
          </h1>
        </div>

        <div className="p-4 space-y-4 max-w-md mx-auto">
          {/* Hero banner */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-gradient-to-br from-primary/80 to-primary p-6 text-primary-foreground text-center space-y-2"
          >
            <div className="text-4xl">🎁</div>
            <h2 className="text-xl font-bold">
              {isRTL ? 'ادعُ صديقاً = 5 Nova فوراً!' : 'Invite a Friend = 5 Nova Instantly!'}
            </h2>
            <p className="text-sm opacity-90">
              {isRTL
                ? 'لكل صديق يسجّل باستخدام كودك، تحصل على 5 Nova مباشرةً في محفظتك.'
                : 'For every friend who signs up with your code, you get 5 Nova directly in your wallet.'}
            </p>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 text-center space-y-1">
              <Users className="h-5 w-5 mx-auto text-primary" />
              <p className="text-2xl font-bold">
                {isLoading ? '…' : stats.referredCount}
              </p>
              <p className="text-xs text-muted-foreground">
                {isRTL ? 'أصدقاء مدعوّون' : 'Friends Invited'}
              </p>
            </Card>
            <Card className="p-4 text-center space-y-1">
              <Gift className="h-5 w-5 mx-auto text-nova" />
              <p className="text-2xl font-bold text-nova">
                {isLoading ? '…' : `И ${stats.novaEarned.toFixed(0)}`}
              </p>
              <p className="text-xs text-muted-foreground">
                {isRTL ? 'Nova مكتسبة' : 'Nova Earned'}
              </p>
            </Card>
          </div>

          {/* Nova ID + Referral code */}
          <Card className="p-4 space-y-3">
            {/* Nova ID — primary identifier */}
            {user?.novaId && (
              <>
                <p className="text-sm font-medium text-muted-foreground">
                  {isRTL ? 'Nova ID الخاص بك' : 'Your Nova ID'}
                </p>
                <div className="flex items-center justify-between gap-2 p-3 bg-primary/10 rounded-xl border border-primary/20">
                  <span className="font-mono text-2xl font-bold tracking-widest text-primary">
                    {user.novaId}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors shrink-0"
                    title={isRTL ? 'نسخ' : 'Copy'}
                  >
                    {copied
                      ? <Check className="h-4 w-4 text-green-500" />
                      : <Copy className="h-4 w-4 text-primary/60" />
                    }
                  </button>
                </div>
              </>
            )}

            {/* Referral link */}
            <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-xl border border-border">
              <span className="text-xs text-muted-foreground flex-1 truncate font-mono">
                {referralLink}
              </span>
              <button
                onClick={handleCopy}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors shrink-0"
                title={isRTL ? 'نسخ الرابط' : 'Copy link'}
              >
                {copied
                  ? <Check className="h-4 w-4 text-green-500" />
                  : <Copy className="h-4 w-4 text-muted-foreground" />
                }
              </button>
            </div>
          </Card>

          {/* Share button */}
          <Button
            onClick={handleShare}
            className="w-full h-12 text-base font-semibold gap-2"
          >
            <Share2 className="h-5 w-5" />
            {isRTL ? 'شارك رابط الدعوة' : 'Share Invite Link'}
          </Button>

          {/* Leaders button */}
          <Button
            variant="outline"
            onClick={() => navigate('/referral-leaders')}
            className="w-full h-11 gap-2"
          >
            <Trophy className="h-4 w-4 text-yellow-500" />
            {isRTL ? '🏆 لوحة المتصدرين' : '🏆 Referral Leaders'}
          </Button>

          {/* How it works */}
          <Card className="p-4 space-y-3">
            <p className="text-sm font-semibold">
              {isRTL ? 'كيف يعمل؟' : 'How it works'}
            </p>
            <ol className="space-y-2 text-sm text-muted-foreground list-none">
              {[
                { ar: 'شارك رابطك أو كودك مع أصدقائك', en: 'Share your link or code with friends' },
                { ar: 'يسجّل صديقك ويكمل ملفه الشخصي', en: 'Your friend signs up and completes their profile' },
                { ar: 'تحصل على 5 Nova فوراً في محفظتك!', en: 'You get 5 Nova instantly in your wallet!' },
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold mt-0.5">
                    {i + 1}
                  </span>
                  <span>{isRTL ? step.ar : step.en}</span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
