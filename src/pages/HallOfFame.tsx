import { motion } from 'framer-motion';
import { Trophy, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { getPlatformUserById, PLATFORM_USERS } from '@/lib/platformUsers';
import { getCountryFlag } from '@/lib/countryFlags';

// Mock data for all-time top Nova winners (Hall of Fame)
// Sorted by total Nova won (highest first)
const hallOfFameData = [
  { id: '4', totalNovaWon: 2450, lastWinDate: '2026-01-25' },
  { id: '2', totalNovaWon: 1850, lastWinDate: '2026-01-24' },
  { id: '5', totalNovaWon: 1520, lastWinDate: '2026-01-25' },
  { id: '11', totalNovaWon: 1340, lastWinDate: '2026-01-23' },
  { id: '6', totalNovaWon: 1180, lastWinDate: '2026-01-25' },
  { id: '8', totalNovaWon: 980, lastWinDate: '2026-01-23' },
  { id: '1', totalNovaWon: 756, lastWinDate: '2026-01-22' },
  { id: '3', totalNovaWon: 645, lastWinDate: '2026-01-24' },
  { id: '9', totalNovaWon: 520, lastWinDate: '2026-01-24' },
  { id: '7', totalNovaWon: 385, lastWinDate: '2026-01-20' },
];

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

        {/* Winners List */}
        <motion.div variants={itemVariants} className="space-y-2">
          {hallOfFameData.map((entry, index) => {
            const position = index + 1;
            const user = getPlatformUserById(entry.id);
            if (!user) return null;

            const isTop3 = position <= 3;
            const userName = isRTL ? user.nameAr : user.name;
            const countryName = isRTL ? user.countryAr : user.country;
            const flag = getCountryFlag(user.country);

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
                  {user.avatar}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p 
                      className="font-semibold text-sm truncate cursor-pointer hover:text-nova transition-colors"
                      onClick={() => handleProfileClick(entry.id)}
                    >
                      {userName}
                    </p>
                    <span className="text-base">{flag}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? 'آخر فوز:' : 'Last win:'} {entry.lastWinDate}
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
