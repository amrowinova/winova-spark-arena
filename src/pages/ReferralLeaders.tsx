/**
 * ReferralLeaders — لوحة متصدري الإحالات
 * ترتيب عالمي + حسب كل دولة
 * جوائز: 1: 1000 Nova | 2-5: 500 | 6-10: 200
 */
import { useEffect, useState, useCallback } from 'react';
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
  let q = supabase
    .from('profiles')
    .select('user_id, display_name, avatar_url, country, referred_by');

  if (country) q = q.eq('country', country);

  const { data } = await q;
  if (!data) return [];

  // Count referrals per user
  const countMap = new Map<string, number>();
  for (const row of data) {
    if (row.referred_by) {
      countMap.set(row.referred_by, (countMap.get(row.referred_by) ?? 0) + 1);
    }
  }

  // Build profile map
  const profileMap = new Map<string, { display_name: string; avatar_url: string | null; country: string | null }>();
  for (const row of data) {
    if (!profileMap.has(row.user_id)) {
      profileMap.set(row.user_id, { display_name: row.display_name ?? '?', avatar_url: row.avatar_url, country: row.country });
    }
  }

  return [...countMap.entries()]
    .map(([uid, cnt]) => {
      const p = profileMap.get(uid);
      return {
        user_id: uid,
        display_name: p?.display_name ?? '?',
        avatar_url: p?.avatar_url ?? null,
        country: p?.country ?? null,
        referral_count: cnt,
        rank: 0,
      };
    })
    .sort((a, b) => b.referral_count - a.referral_count)
    .slice(0, 50)
    .map((l, i) => ({ ...l, rank: i + 1 }));
}

async function fetchTopCountries(): Promise<Array<{ country: string; count: number }>> {
  const { data } = await supabase
    .from('profiles')
    .select('country')
    .not('referred_by', 'is', null)
    .not('country', 'is', null);
  if (!data) return [];
  const map = new Map<string, number>();
  for (const row of data) {
    if (row.country) map.set(row.country, (map.get(row.country) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);
}

// ── LeaderRow ──────────────────────────────────────────────────────────────
function LeaderRow({ l, isRTL, isMe }: { l: Leader; isRTL: boolean; isMe: boolean }) {
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
          {l.display_name} {isMe ? (isRTL ? '(أنت)' : '(you)') : ''}
        </p>
        {l.country && <p className="text-[10px] text-muted-foreground">{l.country}</p>}
      </div>

      {/* Count + Prize */}
      <div className="text-right shrink-0">
        <p className="text-xs font-bold">
          {l.referral_count} {isRTL ? 'إحالة' : 'refs'}
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
      <InnerPageHeader title={isRTL ? '🏆 متصدرو الإحالات' : '🏆 Referral Leaders'} />

      <main className="px-4 pt-4 pb-20 space-y-4">
        {/* Prize info banner */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-gradient-to-br from-yellow-500/20 to-nova/20 border border-yellow-500/30 p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-yellow-500" />
            <p className="font-bold text-sm">
              {isRTL ? 'جوائز شهرية للمتصدرين' : 'Monthly Prizes for Leaders'}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-yellow-500/10 rounded-lg p-2">
              <p className="text-base">🥇</p>
              <p className="font-bold">И 1000</p>
              <p className="text-muted-foreground text-[10px]">{isRTL ? 'الأول' : '1st'}</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-2">
              <p className="text-base">🥈🥉</p>
              <p className="font-bold">И 500</p>
              <p className="text-muted-foreground text-[10px]">{isRTL ? '2-5' : '2nd-5th'}</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-2">
              <p className="text-base">🏅</p>
              <p className="font-bold">И 200</p>
              <p className="text-muted-foreground text-[10px]">{isRTL ? '6-10' : '6th-10th'}</p>
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
                {isRTL ? 'عالمي' : 'Global'}
              </TabsTrigger>
              <TabsTrigger value="country" className="text-xs gap-1">
                <Flag className="w-3.5 h-3.5" />
                {isRTL ? 'حسب الدولة' : 'By Country'}
              </TabsTrigger>
            </TabsList>

            {/* Global */}
            <TabsContent value="global">
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="px-4 py-3 bg-gradient-to-r from-yellow-500/10 to-background border-b border-border/50 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <p className="font-bold text-sm">
                      {isRTL ? 'الترتيب العالمي' : 'Global Rankings'}
                    </p>
                  </div>
                  {globalLeaders.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground text-sm">
                      {isRTL ? 'لا توجد بيانات بعد' : 'No data yet'}
                    </div>
                  ) : (
                    globalLeaders.slice(0, 20).map((l) => (
                      <LeaderRow key={l.user_id} l={l} isRTL={isRTL} isMe={l.user_id === user.id} />
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
                    {selectedCountry || (isRTL ? 'اختر دولة' : 'Select country')}
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
                        {selectedCountry || (isRTL ? 'اختر دولة' : 'Select a country')}
                      </p>
                    </div>
                    {countryLeaders.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground text-sm">
                        {isRTL ? 'اختر دولة لعرض الترتيب' : 'Select a country to view rankings'}
                      </div>
                    ) : (
                      countryLeaders.slice(0, 10).map((l) => (
                        <LeaderRow key={l.user_id} l={l} isRTL={isRTL} isMe={l.user_id === user.id} />
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
