import { useState, useEffect } from 'react';
import { PublicLeaderboard } from '@/components/home/PublicLeaderboard';
import { PlatformStatsBar } from '@/components/home/PlatformStatsBar';
import { motion } from 'framer-motion';
import { Trophy, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { getCountryFlag } from '@/lib/countryFlags';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface HallOfFameEntry {
  id: string;
  name: string;
  country: string;
  totalNovaWon: number;
  lastWinDate: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 },
};

const positionStyles = [
  'bg-gradient-to-r from-yellow-400 to-amber-500 text-white shadow-lg shadow-yellow-500/30', // 1st
  'bg-gradient-to-r from-gray-300 to-gray-400 text-gray-800', // 2nd
  'bg-gradient-to-r from-amber-600 to-amber-700 text-white', // 3rd
];

export default function HallOfFame() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isRTL = language === 'ar';
  const [winners, setWinners] = useState<HallOfFameEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchHallOfFame() {
      try {
        // Step 1: Fetch ledger entries for contest_win (no join)
        const { data: ledgerData, error: ledgerError } = await supabase
          .from('wallet_ledger')
          .select('user_id, amount, created_at')
          .eq('entry_type', 'contest_win')
          .gt('amount', 0);

        if (ledgerError) throw ledgerError;

        if (!ledgerData || ledgerData.length === 0) {
          setWinners([]);
          setIsLoading(false);
          return;
        }

        // Step 2: Aggregate by user
        const userWins: Record<string, { total: number; lastDate: string }> = {};
        for (const entry of ledgerData) {
          const userId = entry.user_id;
          if (!userWins[userId]) {
            userWins[userId] = { total: 0, lastDate: entry.created_at };
          }
          userWins[userId].total += Number(entry.amount) || 0;
          if (entry.created_at > userWins[userId].lastDate) {
            userWins[userId].lastDate = entry.created_at;
          }
        }

        // Get unique user IDs
        const userIds = Object.keys(userWins);
        if (userIds.length === 0) {
          setWinners([]);
          setIsLoading(false);
          return;
        }

        // Step 3: Fetch profiles separately
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, name, country')
          .in('user_id', userIds);

        if (profilesError) throw profilesError;

        // Create profile map
        const profileMap: Record<string, { name: string; country: string }> = {};
        for (const p of profilesData || []) {
          profileMap[p.user_id] = { name: p.name, country: p.country };
        }

        // Step 4: Build sorted list
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
        toast.error(isRTL ? 'فشل تحميل قاعة المشاهير' : 'Failed to load Hall of Fame');
      } finally {
        setIsLoading(false);
      }
    }

    fetchHallOfFame();
  }, []);

  const handleProfileClick = (userId: string) => {
    navigate(`/user/${userId}`);
  };

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return position.toString();
    }
  };

  // Empty state
  if (!isLoading && winners.length === 0) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <InnerPageHeader title={isRTL ? 'متصدري الفائزون' : 'Top Winners'} />
        
        <main className="flex-1 px-4 py-3 pb-20 flex items-center justify-center">
          <div className="text-center">
            <Trophy className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <h2 className="text-lg font-bold mb-2">
              {isRTL ? 'لا يوجد فائزين بعد' : 'No Winners Yet'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isRTL 
                ? 'شارك في المسابقات لتكون أول الفائزين!'
                : 'Join contests to be the first winner!'}
            </p>
          </div>
        </main>

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <InnerPageHeader title={isRTL ? 'متصدري الفائزون' : 'Top Winners'} />
      
      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="flex-1 px-4 py-3 pb-20 space-y-4"
      >
        {/* Header Description */}
        <motion.div variants={itemVariants}>
          <Card className="border-nova/20 bg-nova/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-nova/20 flex items-center justify-center">
                  <Trophy className="h-6 w-6 text-nova" />
                </div>
                <div>
                  <h2 className="font-bold text-base">
                    {isRTL ? 'قاعة المشاهير' : 'Hall of Fame'}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {isRTL 
                      ? 'أعلى الرابحين Nova على الإطلاق منذ انطلاق التطبيق'
                      : 'All-time top Nova earners since app launch'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Live Platform Stats */}
        <motion.div variants={itemVariants}>
          <PlatformStatsBar />
        </motion.div>

        {/* Public Leaderboard — visible to all visitors */}
        <motion.div variants={itemVariants}>
          <PublicLeaderboard />
        </motion.div>

        {/* All-time Winners List (existing) */}
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
                transition={{ delay: index * 0.05 }}
                className={`flex items-center gap-3 p-3 rounded-xl ${
                  isTop3 
                    ? 'bg-nova/5 border border-nova/20' 
                    : 'bg-muted/30 border border-transparent'
                }`}
              >
                {/* Position Badge */}
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                    isTop3 ? positionStyles[position - 1] : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {isTop3 ? getPositionIcon(position) : position}
                </div>

                {/* Avatar - Clickable */}
                <div 
                  className="w-11 h-11 rounded-full bg-muted flex items-center justify-center text-xl cursor-pointer hover:ring-2 hover:ring-nova/50 transition-all"
                  onClick={() => handleProfileClick(entry.id)}
                >
                  👤
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p 
                      className="font-semibold text-sm truncate cursor-pointer hover:text-nova transition-colors"
                      onClick={() => handleProfileClick(entry.id)}
                    >
                      {entry.name}
                    </p>
                    {flag && <span className="text-base">{flag}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? 'آخر فوز:' : 'Last win:'} {new Date(entry.lastWinDate).toLocaleDateString()}
                  </p>
                </div>

                {/* Total Nova Won */}
                <div className="text-end">
                  <p className={`font-bold ${position === 1 ? 'text-nova text-lg' : 'text-foreground'}`}>
                    И {entry.totalNovaWon.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {isRTL ? 'مجموع الفوز' : 'Total Won'}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Footer Note */}
        <motion.div variants={itemVariants}>
          <p className="text-xs text-muted-foreground text-center py-4">
            {isRTL 
              ? 'الترتيب يعتمد على مجموع Nova المكتسبة منذ الانضمام'
              : 'Ranking based on total Nova earned since joining'}
          </p>
        </motion.div>
      </motion.main>

      <BottomNav />
    </div>
  );
}
