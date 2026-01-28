import { Trophy, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate, Link } from 'react-router-dom';
import { getPlatformUserById } from '@/lib/platformUsers';

interface WinnerEntry {
  id: string;
  name: string;
  totalNovaPrizes: number;
  position: number;
  country?: string;
}

interface TopWinnersCardProps {
  limit?: number;
}

// Mock data for top Nova prize winners (total prizes from contests)
const topPrizeWinners: WinnerEntry[] = [
  { id: '4', name: getPlatformUserById('4')?.nameAr || 'خالد محمد', totalNovaPrizes: 4850, position: 1, country: '🇸🇦' },
  { id: '2', name: getPlatformUserById('2')?.nameAr || 'سارة أحمد', totalNovaPrizes: 3720, position: 2, country: '🇪🇬' },
  { id: '5', name: getPlatformUserById('5')?.nameAr || 'فاطمة سعيد', totalNovaPrizes: 2980, position: 3, country: '🇦🇪' },
  { id: '11', name: getPlatformUserById('11')?.nameAr || 'أحمد حسن', totalNovaPrizes: 2540, position: 4, country: '🇯🇴' },
  { id: '6', name: getPlatformUserById('6')?.nameAr || 'عمر أحمد', totalNovaPrizes: 2180, position: 5, country: '🇸🇦' },
];

export function TopWinnersCard({ limit = 5 }: TopWinnersCardProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isRTL = language === 'ar';

  const displayedWinners = topPrizeWinners.slice(0, limit);

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
            <Trophy className="h-4 w-4 text-nova" />
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
          {isRTL ? 'أعلى الفائزين بجوائز Nova من المسابقات' : 'Top Nova prize winners from contests'}
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
              <div className="flex items-center gap-1.5">
                <p 
                  className="font-medium text-sm truncate cursor-pointer hover:text-nova transition-colors"
                  onClick={() => handleProfileClick(entry.id)}
                >
                  {entry.name}
                </p>
                {entry.country && <span className="text-xs">{entry.country}</span>}
              </div>
            </div>

            {/* Nova Amount */}
            <div className="text-end">
              <p className={`font-bold text-sm ${entry.position === 1 ? 'text-nova' : 'text-foreground'}`}>
                И {entry.totalNovaPrizes.toLocaleString()}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
