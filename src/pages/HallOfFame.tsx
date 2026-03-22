import { useState, useEffect } from 'react';
import { PublicLeaderboard } from '@/components/home/PublicLeaderboard';
import { PlatformStatsBar } from '@/components/home/PlatformStatsBar';
import { motion } from 'framer-motion';
import { Trophy, MapPin, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import { getCountryFlag } from '@/lib/countryFlags';
import { supabase } from '@/integrations/supabase/client';
import { useCityCountryLeaderboard } from '@/hooks/useCityCountryLeaderboard';
import { toast } from 'sonner';

interface HallOfFameEntry {
  id: string;
  name: string;
  country: string;
  totalNovaWon: number;
  lastWinDate: string;
}

type Tab = 'allTime' | 'cities' | 'countries';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 },
};

const positionStyles = [
  'bg-gradient-to-r from-yellow-400 to-amber-500 text-white shadow-lg shadow-yellow-500/30',
  'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800',
  'bg-gradient-to-r from-amber-600 to-amber-700 text-white',
];

const medalEmoji = (pos: number) => {
  if (pos === 1) return '🥇';
  if (pos === 2) return '🥈';
  if (pos === 3) return '🥉';
  return pos.toString();
};

export default function HallOfFame() {
  const { language } = useLanguage();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const isRTL = language === 'ar' || language === 'ur';

  const [activeTab, setActiveTab] = useState<Tab>('allTime');
  const [winners, setWinners] = useState<HallOfFameEntry[]>([]);
  const [isLoadingWinners, setIsLoadingWinners] = useState(true);

  const { cities, countries, isLoading: isLoadingLeaderboards } = useCityCountryLeaderboard();

  useEffect(() => {
    async function fetchHallOfFame() {
      try {
        const { data: ledgerData, error: ledgerError } = await supabase
          .from('wallet_ledger')
          .select('user_id, amount, created_at')
          .eq('entry_type', 'contest_win')
          .gt('amount', 0);

        if (ledgerError) throw ledgerError;

        if (!ledgerData || ledgerData.length === 0) {
          setWinners([]);
          setIsLoadingWinners(false);
          return;
        }

        const userWins: Record<string, { total: number; lastDate: string }> = {};
        for (const entry of ledgerData) {
          const userId = entry.user_id;
          if (!userWins[userId]) userWins[userId] = { total: 0, lastDate: entry.created_at };
          userWins[userId].total += Number(entry.amount) || 0;
          if (entry.created_at > userWins[userId].lastDate) userWins[userId].lastDate = entry.created_at;
        }

        const userIds = Object.keys(userWins);
        if (userIds.length === 0) { setWinners([]); setIsLoadingWinners(false); return; }

        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, name, country')
          .in('user_id', userIds);

        if (profilesError) throw profilesError;

        const profileMap: Record<string, { name: string; country: string }> = {};
        for (const p of profilesData || []) profileMap[p.user_id] = { name: p.name, country: p.country };

        const sorted = Object.entries(userWins)
          .sort((a, b) => b[1].total - a[1].total)
          .slice(0, 20)
          .map(([userId, data]) => ({
            id: userId,
            name: profileMap[userId]?.name || 'User',
            country: profileMap[userId]?.country || '',
            totalNovaWon: data.total,
            lastWinDate: data.lastDate,
          }));

        setWinners(sorted);
      } catch (err) {
        console.error('Error fetching hall of fame:', err);
        setWinners([]);
        toast.error(t('hallOfFame.title'));
      } finally {
        setIsLoadingWinners(false);
      }
    }
    fetchHallOfFame();
  }, []);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'allTime',   label: t('hallOfFame.tabAllTime'),   icon: <Trophy className="h-3.5 w-3.5" /> },
    { key: 'cities',    label: t('hallOfFame.tabCities'),    icon: <MapPin className="h-3.5 w-3.5" /> },
    { key: 'countries', label: t('hallOfFame.tabCountries'), icon: <Globe className="h-3.5 w-3.5" /> },
  ];

  const tabDescription = {
    allTime: t('hallOfFame.description'),
    cities: t('hallOfFame.cityDescription'),
    countries: t('hallOfFame.countryDescription'),
  }[activeTab];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <InnerPageHeader title={t('hallOfFame.title')} />

      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 px-4 py-3 pb-20 space-y-4"
      >
        {/* Header card */}
        <motion.div variants={itemVariants}>
          <Card className="border-nova/20 bg-nova/5">
            <CardContent className="p-4">
              <div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="w-12 h-12 rounded-full bg-nova/20 flex items-center justify-center shrink-0">
                  <Trophy className="h-6 w-6 text-nova" />
                </div>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <h2 className="font-bold text-base">{t('hallOfFame.title')}</h2>
                  <p className="text-xs text-muted-foreground">{tabDescription}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tab switcher */}
        <motion.div variants={itemVariants}>
          <div className="flex gap-1.5 bg-muted/50 p-1 rounded-xl">
            {tabs.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                  activeTab === key
                    ? 'bg-background text-nova shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {icon}
                <span>{label}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── ALL-TIME ── */}
        {activeTab === 'allTime' && (
          <>
            <motion.div variants={itemVariants}><PlatformStatsBar /></motion.div>
            <motion.div variants={itemVariants}><PublicLeaderboard /></motion.div>

            {isLoadingWinners ? (
              <motion.div variants={itemVariants} className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-16 bg-muted/40 rounded-xl animate-pulse" />
                ))}
              </motion.div>
            ) : winners.length === 0 ? (
              <motion.div variants={itemVariants} className="text-center py-12">
                <Trophy className="h-14 w-14 mx-auto mb-3 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'لا يوجد فائزون بعد' : 'No winners yet'}
                </p>
              </motion.div>
            ) : (
              <motion.div variants={itemVariants} className="space-y-2">
                {winners.map((entry, index) => {
                  const position = index + 1;
                  const isTop3 = position <= 3;
                  const flag = getCountryFlag(entry.country);
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.04 }}
                      className={`flex items-center gap-3 p-3 rounded-xl ${
                        isTop3 ? 'bg-nova/5 border border-nova/20' : 'bg-muted/30 border border-transparent'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                        isTop3 ? positionStyles[position - 1] : 'bg-muted text-muted-foreground'
                      }`}>
                        {isTop3 ? medalEmoji(position) : position}
                      </div>
                      <div
                        className="w-11 h-11 rounded-full bg-muted flex items-center justify-center text-xl cursor-pointer hover:ring-2 hover:ring-nova/50 transition-all shrink-0"
                        onClick={() => navigate(`/user/${entry.id}`)}
                      >
                        👤
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <p
                            className="font-semibold text-sm truncate cursor-pointer hover:text-nova transition-colors"
                            onClick={() => navigate(`/user/${entry.id}`)}
                          >
                            {entry.name}
                          </p>
                          {flag && <span className="text-base">{flag}</span>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {isRTL ? 'آخر فوز:' : 'Last win:'}{' '}
                          {new Date(entry.lastWinDate).toLocaleDateString()}
                        </p>
                      </div>
                      <div className={isRTL ? 'text-start' : 'text-end'}>
                        <p className={`font-bold ${position === 1 ? 'text-nova text-lg' : 'text-foreground'}`}>
                          И {entry.totalNovaWon.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{t('hallOfFame.totalNova')}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </>
        )}

        {/* ── CITIES ── */}
        {activeTab === 'cities' && (
          isLoadingLeaderboards ? (
            <motion.div variants={itemVariants} className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-16 bg-muted/40 rounded-xl animate-pulse" />
              ))}
            </motion.div>
          ) : cities.length === 0 ? (
            <motion.div variants={itemVariants} className="text-center py-16">
              <MapPin className="h-14 w-14 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">{t('hallOfFame.noDataCities')}</p>
            </motion.div>
          ) : (
            <motion.div variants={itemVariants} className="space-y-2">
              {cities.map((entry, index) => {
                const position = index + 1;
                const isTop3 = position <= 3;
                const flag = getCountryFlag(entry.country);
                return (
                  <motion.div
                    key={`${entry.city}-${entry.country}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className={`flex items-center gap-3 p-3 rounded-xl ${
                      isTop3 ? 'bg-nova/5 border border-nova/20' : 'bg-muted/30 border border-transparent'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                      isTop3 ? positionStyles[position - 1] : 'bg-muted text-muted-foreground'
                    }`}>
                      {isTop3 ? medalEmoji(position) : position}
                    </div>
                    <div className="w-11 h-11 rounded-full bg-muted/60 flex items-center justify-center text-2xl shrink-0">
                      🏙️
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`flex items-center gap-1.5 ${isRTL ? 'flex-row-reverse' : ''}`}>
                        <p className="font-semibold text-sm truncate">{entry.city}</p>
                        {flag && <span className="text-base">{flag}</span>}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {entry.winner_count} {t('hallOfFame.winners')}
                      </p>
                    </div>
                    <div className={isRTL ? 'text-start' : 'text-end'}>
                      <p className={`font-bold ${position === 1 ? 'text-nova text-lg' : 'text-foreground'}`}>
                        И {entry.total_nova.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{t('hallOfFame.totalNova')}</p>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )
        )}

        {/* ── COUNTRIES ── */}
        {activeTab === 'countries' && (
          isLoadingLeaderboards ? (
            <motion.div variants={itemVariants} className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-16 bg-muted/40 rounded-xl animate-pulse" />
              ))}
            </motion.div>
          ) : countries.length === 0 ? (
            <motion.div variants={itemVariants} className="text-center py-16">
              <Globe className="h-14 w-14 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">{t('hallOfFame.noDataCountries')}</p>
            </motion.div>
          ) : (
            <motion.div variants={itemVariants} className="space-y-2">
              {countries.map((entry, index) => {
                const position = index + 1;
                const isTop3 = position <= 3;
                const flag = getCountryFlag(entry.country);
                return (
                  <motion.div
                    key={entry.country}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.04 }}
                    className={`flex items-center gap-3 p-3 rounded-xl ${
                      isTop3 ? 'bg-nova/5 border border-nova/20' : 'bg-muted/30 border border-transparent'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                      isTop3 ? positionStyles[position - 1] : 'bg-muted text-muted-foreground'
                    }`}>
                      {isTop3 ? medalEmoji(position) : position}
                    </div>
                    <div className="w-11 h-11 rounded-full bg-muted/60 flex items-center justify-center text-3xl shrink-0">
                      {flag || '🌍'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{entry.country}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.winner_count} {t('hallOfFame.winners')}
                      </p>
                    </div>
                    <div className={isRTL ? 'text-start' : 'text-end'}>
                      <p className={`font-bold ${position === 1 ? 'text-nova text-lg' : 'text-foreground'}`}>
                        И {entry.total_nova.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{t('hallOfFame.totalNova')}</p>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )
        )}

        {/* Footer note */}
        <motion.div variants={itemVariants}>
          <p className="text-xs text-muted-foreground text-center py-4">
            {t('hallOfFame.rankingNote')}
          </p>
        </motion.div>
      </motion.main>

      <BottomNav />
    </div>
  );
}
