import { Trophy, Crown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { getCountryFlag } from '@/lib/countryFlags';

interface LeaderboardEntry {
  id: string;
  name: string;
  avatar?: string;
  highestNovaWin: number;
  position: number;
  country?: string;
}

interface NovaLeaderboardProps {
  entries: LeaderboardEntry[];
}

export function NovaLeaderboard({ entries }: NovaLeaderboardProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isRTL = language === 'ar';

  const handleProfileClick = (userId: string) => {
    navigate(`/user/${userId}`);
  };

  const getPositionStyle = (position: number) => {
    switch (position) {
      case 1:
        return 'bg-gradient-nova text-nova-foreground';
      case 2:
        return 'bg-muted text-foreground';
      case 3:
        return 'bg-muted text-foreground';
      default:
        return 'bg-muted/50 text-muted-foreground';
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
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Crown className="h-5 w-5 text-nova" />
          <span>
            {isRTL 
              ? 'لوحة المتصدرين – أعلى الرابحين Nova' 
              : 'Leaderboard – Top Nova Winners'}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className={`flex items-center gap-3 p-3 rounded-xl ${
              entry.position <= 3 
                ? 'bg-nova/5 border border-nova/20' 
                : 'bg-muted/30'
            }`}
          >
            {/* Position */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${getPositionStyle(entry.position)}`}>
              {entry.position <= 3 ? getPositionIcon(entry.position) : entry.position}
            </div>

            {/* User Info */}
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <p 
                  className="font-medium cursor-pointer hover:text-nova transition-colors"
                  onClick={() => handleProfileClick(entry.id)}
                >
                  {entry.name}
                </p>
                {entry.country && getCountryFlag(entry.country) && (
                  <span className="text-sm shrink-0">{getCountryFlag(entry.country)}</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {isRTL ? 'أعلى فوز' : 'Highest Win'}
              </p>
            </div>

            {/* Nova Amount */}
            <div className="text-end">
              <p className={`font-bold ${entry.position === 1 ? 'text-nova text-lg' : ''}`}>
                И {entry.highestNovaWin.toFixed(0)}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
