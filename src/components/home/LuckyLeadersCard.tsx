import { Crown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate, Link } from 'react-router-dom';
import { getPlatformUserById } from '@/lib/platformUsers';

interface LeaderEntry {
  id: string;
  name: string;
  highestNovaWin: number;
  position: number;
}

interface LuckyLeadersCardProps {
  limit?: number;
}

// Mock data for top Nova winners globally
const topNovaWinners: LeaderEntry[] = [
  { id: '4', name: getPlatformUserById('4')?.nameAr || 'خالد محمد', highestNovaWin: 2450, position: 1 },
  { id: '2', name: getPlatformUserById('2')?.nameAr || 'سارة أحمد', highestNovaWin: 1850, position: 2 },
  { id: '5', name: getPlatformUserById('5')?.nameAr || 'فاطمة سعيد', highestNovaWin: 1520, position: 3 },
  { id: '11', name: getPlatformUserById('11')?.nameAr || 'أحمد حسن', highestNovaWin: 1340, position: 4 },
  { id: '6', name: getPlatformUserById('6')?.nameAr || 'عمر أحمد', highestNovaWin: 1180, position: 5 },
];

export function LuckyLeadersCard({ limit = 5 }: LuckyLeadersCardProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isRTL = language === 'ar';

  const displayedWinners = topNovaWinners.slice(0, limit);

  const handleProfileClick = (userId: string) => {
    navigate(`/user/${userId}`);
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
    <Card className="overflow-hidden border border-border bg-card">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Crown className="h-4 w-4 text-nova" />
            <span>
              {isRTL ? 'متصدري الفائزون' : 'Top Winners'}
            </span>
          </CardTitle>
          <Button 
            asChild 
            variant="ghost" 
            size="sm" 
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Link to="/hall-of-fame">
              {isRTL ? 'مشاهدة المزيد' : 'See More'}
              <ChevronRight className="h-3.5 w-3.5 ms-0.5" />
            </Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {isRTL ? 'أعلى الرابحين Nova على الإطلاق' : 'Top Nova winners of all time'}
        </p>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        {displayedWinners.map((entry) => (
          <div
            key={entry.id}
            className={`flex items-center gap-3 p-2.5 rounded-lg border ${
              entry.position === 1 
                ? 'bg-nova/5 border-nova/20' 
                : 'bg-muted/30 border-transparent'
            }`}
          >
            {/* Position */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${getPositionStyle(entry.position)}`}>
              {entry.position <= 3 ? getPositionIcon(entry.position) : entry.position}
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0">
              <p 
                className="font-medium text-sm truncate cursor-pointer hover:text-nova transition-colors"
                onClick={() => handleProfileClick(entry.id)}
              >
                {entry.name}
              </p>
            </div>

            {/* Nova Amount */}
            <div className="text-end">
              <p className={`font-bold text-sm ${entry.position === 1 ? 'text-nova' : 'text-foreground'}`}>
                И {entry.highestNovaWin.toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
