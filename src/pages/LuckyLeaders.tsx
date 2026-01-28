import { motion } from 'framer-motion';
import { Crown, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { getPlatformUserById } from '@/lib/platformUsers';
import { getCountryFlag } from '@/lib/countryFlags';

interface LuckyLeaderEntry {
  id: string;
  name: string;
  novaWon: number;
  winDate: Date;
  position: number;
}

// Mock data for Lucky Leaders - sorted by highest Nova won
const luckyLeadersData: LuckyLeaderEntry[] = [
  { id: '4', name: getPlatformUserById('4')?.nameAr || 'خالد محمد', novaWon: 2450, winDate: new Date('2026-01-15'), position: 1 },
  { id: '2', name: getPlatformUserById('2')?.nameAr || 'سارة أحمد', novaWon: 1850, winDate: new Date('2026-01-22'), position: 2 },
  { id: '5', name: getPlatformUserById('5')?.nameAr || 'فاطمة سعيد', novaWon: 1520, winDate: new Date('2026-01-10'), position: 3 },
  { id: '11', name: getPlatformUserById('11')?.nameAr || 'أحمد حسن', novaWon: 1340, winDate: new Date('2026-01-18'), position: 4 },
  { id: '6', name: getPlatformUserById('6')?.nameAr || 'عمر أحمد', novaWon: 1180, winDate: new Date('2026-01-25'), position: 5 },
  { id: '7', name: getPlatformUserById('7')?.nameAr || 'ليلى حسن', novaWon: 980, winDate: new Date('2026-01-08'), position: 6 },
  { id: '8', name: getPlatformUserById('8')?.nameAr || 'أحمد كريم', novaWon: 850, winDate: new Date('2026-01-20'), position: 7 },
  { id: '9', name: getPlatformUserById('9')?.nameAr || 'نورة علي', novaWon: 720, winDate: new Date('2026-01-12'), position: 8 },
  { id: '10', name: getPlatformUserById('10')?.nameAr || 'محمد سالم', novaWon: 650, winDate: new Date('2026-01-05'), position: 9 },
  { id: '3', name: getPlatformUserById('3')?.nameAr || 'منى الخالد', novaWon: 520, winDate: new Date('2026-01-27'), position: 10 },
];

export default function LuckyLeadersPage() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isRTL = language === 'ar';

  const handleProfileClick = (userId: string) => {
    navigate(`/user/${userId}`);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getPositionStyle = (position: number) => {
    switch (position) {
      case 1:
        return 'bg-nova/20 text-nova border-nova/30';
      case 2:
        return 'bg-muted text-foreground border-border';
      case 3:
        return 'bg-muted text-foreground border-border';
      default:
        return 'bg-muted/50 text-muted-foreground border-border/50';
    }
  };

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return position.toString();
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <InnerPageHeader title={isRTL ? 'متصدّري المحظوظين' : 'Lucky Leaders'} />
      
      <main className="flex-1 px-4 py-4 pb-20">
        {/* Header Info */}
        <div className="mb-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Crown className="h-5 w-5 text-nova" />
            <h2 className="text-lg font-bold">
              {isRTL ? 'أعلى الرابحين في المحظوظين' : 'Top Lucky Draw Winners'}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {isRTL 
              ? 'مرتبين حسب أعلى Nova فازوا بها في سحوبات المحظوظين اليومية'
              : 'Ranked by highest Nova won in daily lucky draws'
            }
          </p>
        </div>

        {/* Leaders List */}
        <Card className="border border-border bg-card">
          <CardContent className="p-3 space-y-2">
            {luckyLeadersData.map((entry, index) => (
              <motion.div
                key={`${entry.id}-${entry.position}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center gap-3 p-3 rounded-lg border ${
                  entry.position === 1 
                    ? 'bg-nova/5 border-nova/20' 
                    : 'bg-muted/30 border-transparent'
                }`}
              >
                {/* Position */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border ${getPositionStyle(entry.position)}`}>
                  {entry.position <= 3 ? getPositionIcon(entry.position) : entry.position}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p 
                      className="font-medium text-sm truncate cursor-pointer hover:text-nova transition-colors"
                      onClick={() => handleProfileClick(entry.id)}
                    >
                      {entry.name}
                    </p>
                    {(() => {
                      const user = getPlatformUserById(entry.id);
                      const flag = user ? getCountryFlag(user.country) : '';
                      return flag ? <span className="text-sm shrink-0">{flag}</span> : null;
                    })()}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(entry.winDate)}</span>
                  </div>
                </div>

                {/* Nova Amount */}
                <div className="text-end">
                  <p className={`font-bold text-sm ${entry.position === 1 ? 'text-nova' : 'text-foreground'}`}>
                    И {entry.novaWon.toLocaleString()}
                  </p>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </main>
      
      <BottomNav />
    </div>
  );
}
