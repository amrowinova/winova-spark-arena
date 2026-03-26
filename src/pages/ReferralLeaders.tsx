/**
 * ReferralLeaders — لوحة متصدري الإحالات
 * ترتيب عالمي + حسب كل دولة
 * جوائز: 1: 1000 Nova | 2-5: 500 | 6-10: 200
 * Uses server-side RPCs (get_referral_leaders / get_top_referral_countries)
 * instead of fetching all profiles in the frontend.
 */
import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Trophy, Globe, Flag, Loader2, Gift, ChevronDown } from 'lucide-react';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { supabase } from '@/integrations/supabase/client';

interface Leader {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  country: string | null;
  referral_count: number;
  rank: number;
}

const PRIZE_NOVA: Record<number, number> = {
  1: 1000, 2: 500, 3: 500, 4: 500, 5: 500,
  6: 200, 7: 200, 8: 200, 9: 200, 10: 200,
};
const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

async function fetchLeaders(country?: string): Promise<Leader[]> {
  const { data, error } = await supabase.rpc('get_referral_leaders', {
    p_country: country ?? null,
    p_limit: 50,
  });
  if (error || !data) return [];
  return (data as Leader[]).map((l) => ({
    ...l,
    referral_count: Number(l.referral_count),
    rank: Number(l.rank),
  }));
}

async function fetchTopCountries(): Promise<Array<{ country: string; count: number }>> {
  const { data, error } = await supabase.rpc('get_top_referral_countries', { p_limit: 20 });
  if (error || !data) return [];
  return (data as Array<{ country: string; ref_count: number }>).map((r) => ({
    country: r.country,
    count: Number(r.ref_count),
  }));
}

// ── LeaderRow ──────────────────────────────────────────────────────────────
function LeaderRow({ l, isMe }: { l: Leader; isMe: boolean }) {
  const { t } = useTranslation();
  const prize = PRIZE_NOVA[l.rank];
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-3 px-4 py-2.5 ${isMe ? 'bg-nova/5' : ''} border-b border-border/30 last:border-0`}
    >
      {/* Rank */}
      <div className="w-7 text-center shrink-0">
        {MEDAL[l.rank]
          ? <span className="text-base">{MEDAL[l.rank]}</span>
          : <span className="text-xs font-bold text-muted-foreground">{l.rank}</span>}
      </div>

      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex items-center justify-center shrink-0">
        {l.avatar_url
          ? <img src={l.avatar_url} alt="" className="w-full h-full object-cover" />
          : <span className="text-xs font-bold">{(l.display_name ?? '?')[0]}</span>}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold truncate ${isMe ? 'text-nova' : ''}`}>
          {l.display_name} {isMe ? `(${t('common.you')})` : ''}
        </p>
        {l.country && <p className="text-[10px] text-muted-foreground">{l.country}</p>}
      </div>

      {/* Count + Prize */}
      <div className="text-right shrink-0">
        <p className="text-xs font-bold">
          {l.referral_count} {t('referral.refs')}
        </p>
        {prize && (
          <p className="text-[10px] text-nova font-medium">И {prize}</p>
        )}
      </div>
    </motion.div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function ReferralLeaders() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { user } = useUser();
  const isRTL = language === 'ar';

  const [globalLeaders, setGlobalLeaders] = useState<Leader[]>([]);
  const [countryLeaders, setCountryLeaders] = useState<Leader[]>([]);
  const [topCountries, setTopCountries] = useState<Array<{ country: string; count: number }>>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [countryLoading, setCountryLoading] = useState(false);
  const [showCountries, setShowCountries] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [global, countries] = await Promise.all([
      fetchLeaders(),
      fetchTopCountries(),
    ]);
    setGlobalLeaders(global);
    setTopCountries(countries);
    // Default to user country
    const userCountry = user.country;
    if (userCountry) {
      setSelectedCountry(userCountry);
      const local = await fetchLeaders(userCountry);
      setCountryLeaders(local);
    }
    setLoading(false);
  }, [user.country]);

  useEffect(() => { void load(); }, [load]);

  const handleSelectCountry = async (country: string) => {
    setSelectedCountry(country);
    setShowCountries(false);
    setCountryLoading(true);
    const data = await fetchLeaders(country);
    setCountryLeaders(data);
    setCountryLoading(false);
  };

  return (
    <div className="min-h-screen bg-background pb-24" dir={isRTL ? 'rtl' : 'ltr'}>
      <InnerPageHeader title={t('referral.leaders.title')} />

      <main className="px-4 pt-4 pb-20 space-y-4">
        {/* Prize info banner */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-br from-yellow-500/20 to-nova/20 border border-yellow-500/30 p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-yellow-500" />
            <p className="font-bold text-sm">{t('referral.leaders.monthlyPrizes')}</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-yellow-500/10 rounded-lg p-2">
              <p className="text-base">🥇</p>
              <p className="font-bold">И 1000</p>
              <p className="text-muted-foreground text-[10px]">{t('referral.leaders.rank1st')}</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-2">
              <p className="text-base">🥈🥉</p>
              <p className="font-bold">И 500</p>
              <p className="text-muted-foreground text-[10px]">{t('referral.leaders.rank2to5')}</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-2">
              <p className="text-base">🏅</p>
              <p className="font-bold">И 200</p>
              <p className="text-muted-foreground text-[10px]">{t('referral.leaders.rank6to10')}</p>
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs defaultValue="global">
            <TabsList className="w-full grid grid-cols-2 mb-4">
              <TabsTrigger value="global" className="text-xs gap-1">
                <Globe className="w-3.5 h-3.5" />
                {t('referral.leaders.global')}
              </TabsTrigger>
              <TabsTrigger value="country" className="text-xs gap-1">
                <Flag className="w-3.5 h-3.5" />
                {t('referral.leaders.byCountry')}
              </TabsTrigger>
            </TabsList>

            {/* Global */}
            <TabsContent value="global">
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="px-4 py-3 bg-gradient-to-r from-yellow-500/10 to-background border-b border-border/50 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <p className="font-bold text-sm">{t('referral.leaders.globalRankings')}</p>
                  </div>
                  {globalLeaders.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground text-sm">
                      {t('common.noData')}
                    </div>
                  ) : (
                    globalLeaders.slice(0, 20).map((l) => (
                      <LeaderRow key={l.user_id} l={l} isMe={l.user_id === user.id} />
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* By Country */}
            <TabsContent value="country" className="space-y-3">
              {/* Country selector */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-between h-10"
                  onClick={() => setShowCountries(!showCountries)}
                >
                  <span className="text-sm">
                    {selectedCountry || t('referral.leaders.selectCountry')}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showCountries ? 'rotate-180' : ''}`} />
                </Button>

                {showCountries && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="grid grid-cols-2 gap-1.5 bg-card border border-border rounded-xl p-2 max-h-48 overflow-y-auto"
                  >
                    {topCountries.map(c => (
                      <button
                        key={c.country}
                        onClick={() => handleSelectCountry(c.country)}
                        className={`text-xs px-2 py-1.5 rounded-lg text-left border transition-colors ${
                          selectedCountry === c.country
                            ? 'bg-nova/15 border-nova/40 text-nova font-medium'
                            : 'border-border hover:bg-muted/50'
                        }`}
                      >
                        {c.country}
                        <span className="text-muted-foreground ms-1">({c.count})</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>

              {countryLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="px-4 py-3 bg-gradient-to-r from-blue-500/10 to-background border-b border-border/50 flex items-center gap-2">
                      <Flag className="w-4 h-4 text-blue-500" />
                      <p className="font-bold text-sm">
                        {selectedCountry || t('referral.leaders.selectCountry')}
                      </p>
                    </div>
                    {countryLeaders.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground text-sm">
                        {t('referral.leaders.selectCountryHint')}
                      </div>
                    ) : (
                      countryLeaders.slice(0, 10).map((l) => (
                        <LeaderRow key={l.user_id} l={l} isMe={l.user_id === user.id} />
                      ))
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
