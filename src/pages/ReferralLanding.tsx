import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trophy, Users, Star, ArrowRight, Loader2, AlertCircle, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getCountryFlag } from '@/lib/countryFlags';

interface ReferrerProfile {
  id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  country: string;
  rank: string;
  active_weeks: number;
  team_size: number;
  referral_code: string;
  nova_id?: string;
}

const RANK_LABEL: Record<string, { ar: string; en: string; color: string }> = {
  subscriber: { ar: 'مشترك',  en: 'Subscriber', color: 'bg-slate-100 text-slate-700' },
  marketer:   { ar: 'مسوّق',  en: 'Marketer',   color: 'bg-blue-100 text-blue-700' },
  leader:     { ar: 'قائد',   en: 'Leader',      color: 'bg-purple-100 text-purple-700' },
  manager:    { ar: 'مدير',   en: 'Manager',     color: 'bg-amber-100 text-amber-700' },
  president:  { ar: 'رئيس',   en: 'President',   color: 'bg-yellow-100 text-yellow-700' },
};

export default function ReferralLanding() {
  const { code } = useParams<{ code: string }>();
  const { language } = useLanguage();
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const isRTL = language === 'ar';

  const [referrer, setReferrer] = useState<ReferrerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!code) { setNotFound(true); setLoading(false); return; }

    const fetch = async () => {
      // Accepts both old referral_code and nova_id (EG-000001 format)
      const { data: rows } = await supabase
        .rpc('find_referrer_by_code', { p_code: code.toUpperCase() });

      const data = rows?.[0] ?? null;

      if (!data) { setNotFound(true); }
      else {
        // Fetch team size separately
        const { count } = await supabase
          .from('team_members')
          .select('id', { count: 'exact', head: true })
          .eq('leader_id', data.id);

        setReferrer({
          id: data.id,
          name: data.name,
          username: data.username,
          avatar_url: data.avatar_url,
          country: data.country,
          rank: data.rank,
          active_weeks: data.active_weeks,
          referral_code: data.referral_code,
          nova_id: data.nova_id,
          team_size: count ?? 0,
        });
      }
      setLoading(false);
    };

    fetch();
  }, [code]);

  // If already logged in, redirect to home with code pre-filled via query param
  const handleJoin = () => {
    if (authUser) {
      navigate('/');
    } else {
      navigate(`/?ref=${code}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notFound || !referrer) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 bg-background">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <p className="text-lg font-medium text-muted-foreground">
          {isRTL ? 'كود الإحالة غير صحيح' : 'Invalid referral code'}
        </p>
        <Button onClick={() => navigate('/')}>
          {isRTL ? 'الصفحة الرئيسية' : 'Go Home'}
        </Button>
      </div>
    );
  }

  const rank = RANK_LABEL[referrer.rank] ?? RANK_LABEL.subscriber;
  const flag = getCountryFlag(referrer.country);

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 flex flex-col items-center justify-center p-4"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-5"
      >
        {/* App Brand */}
        <div className="text-center">
          <p className="text-3xl font-bold tracking-tight">WINOVA</p>
          <p className="text-sm text-muted-foreground mt-1">
            {isRTL ? 'منصة المسابقات والمكافآت اليومية' : 'Daily contests & rewards platform'}
          </p>
        </div>

        {/* Referrer Card */}
        <Card className="p-5 shadow-lg border-primary/20">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 ring-2 ring-primary/30">
              <AvatarImage src={referrer.avatar_url ?? undefined} />
              <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                {referrer.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg truncate">{referrer.name}</p>
              <p className="text-sm text-muted-foreground">@{referrer.username}</p>
              {referrer.nova_id && (
                <p className="text-xs font-mono font-bold text-primary tracking-wider mt-0.5">
                  {referrer.nova_id}
                </p>
              )}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-sm">{flag} {referrer.country}</span>
                <Badge className={`text-xs ${rank.color} border-0`}>
                  {isRTL ? rank.ar : rank.en}
                </Badge>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-amber-500 mb-1">
                <Star className="h-4 w-4" />
                <span className="text-lg font-bold">{referrer.active_weeks}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {isRTL ? 'أسابيع نشطة' : 'Active weeks'}
              </p>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-primary mb-1">
                <Users className="h-4 w-4" />
                <span className="text-lg font-bold">{referrer.team_size}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {isRTL ? 'عضو في الفريق' : 'Team members'}
              </p>
            </div>
          </div>
        </Card>

        {/* Invite Message */}
        <Card className="p-4 bg-primary/5 border-primary/20">
          <p className="text-center font-medium text-sm">
            {isRTL
              ? `${referrer.name} يدعوك للانضمام إلى WINOVA`
              : `${referrer.name} invited you to join WINOVA`}
          </p>
        </Card>

        {/* Value Props */}
        <div className="space-y-2">
          {[
            {
              icon: Trophy,
              ar: 'شارك في مسابقات يومية واربح Nova',
              en: 'Join daily contests and win Nova',
            },
            {
              icon: TrendingUp,
              ar: 'ابنِ فريقك وكسب عمولات متكررة',
              en: 'Build your team and earn recurring commissions',
            },
            {
              icon: Users,
              ar: 'شبكة من 30+ دولة حول العالم',
              en: 'Network across 30+ countries worldwide',
            },
          ].map(({ icon: Icon, ar, en }, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: isRTL ? 10 : -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * i + 0.2 }}
              className="flex items-center gap-3 text-sm"
            >
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <span>{isRTL ? ar : en}</span>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <Button onClick={handleJoin} size="lg" className="w-full gap-2 text-base font-bold">
          {isRTL ? 'انضم الآن مجاناً' : 'Join for Free Now'}
          <ArrowRight className={`h-5 w-5 ${isRTL ? 'rotate-180' : ''}`} />
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          {isRTL
            ? `سيتم تسجيلك تحت إحالة ${referrer.name} (${referrer.nova_id || referrer.referral_code})`
            : `You'll be registered under ${referrer.name}'s referral (${referrer.nova_id || referrer.referral_code})`}
        </p>
      </motion.div>
    </div>
  );
}
