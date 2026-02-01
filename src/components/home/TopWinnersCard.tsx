import { Trophy, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate, Link } from 'react-router-dom';
import { getCountryFlag } from '@/lib/countryFlags';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface WinnerEntry {
  id: string;
  name: string;
  totalNovaPrizes: number;
  position: number;
  country: string;
}

interface TopWinnersCardProps {
  limit?: number;
}

export function TopWinnersCard({ limit = 5 }: TopWinnersCardProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isRTL = language === 'ar';
  const [winners, setWinners] = useState<WinnerEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTopWinners() {
      try {
        // Step 1: Fetch contest entries with prizes (no join)
        const { data: entriesData, error: entriesError } = await supabase
          .from('contest_entries')
          .select('user_id, prize_won')
          .not('prize_won', 'is', null)
          .gt('prize_won', 0);

        if (entriesError) throw entriesError;

        if (!entriesData || entriesData.length === 0) {
          setWinners([]);
          setIsLoading(false);
          return;
        }

        // Step 2: Aggregate prizes by user_id
        const userPrizeMap: Record<string, number> = {};
        for (const entry of entriesData) {
          const userId = entry.user_id;
          userPrizeMap[userId] = (userPrizeMap[userId] || 0) + Number(entry.prize_won);
        }

        // Get unique user IDs
        const userIds = Object.keys(userPrizeMap);
        if (userIds.length === 0) {
          setWinners([]);
          setIsLoading(false);
          return;
        }

        // Step 3: Fetch profiles for these users
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, name, country')
          .in('user_id', userIds);

        if (profilesError) throw profilesError;

        // Create profile map
        const profileMap: Record<string, { name: string; country: string }> = {};
        for (const profile of profilesData || []) {
          profileMap[profile.user_id] = {
            name: profile.name,
            country: profile.country,
          };
        }

        // Step 4: Build sorted winner list
        const sorted = Object.entries(userPrizeMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, limit)
          .map(([userId, total], index) => ({
            id: userId,
            name: profileMap[userId]?.name || 'User',
            totalNovaPrizes: total,
            position: index + 1,
            country: getCountryFlag(profileMap[userId]?.country || '') || '',
          }));

        setWinners(sorted);
      } catch (err) {
        console.error('Error fetching top winners:', err);
        setWinners([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTopWinners();
  }, [limit]);

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

  // Empty state
  if (!isLoading && winners.length === 0) {
    return (
      <Card className="overflow-hidden border border-border bg-card">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Trophy className="h-4 w-4 text-nova" />
            <span>{isRTL ? 'متصدري الفائزون' : 'Top Winners'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="text-center py-6 text-muted-foreground">
            <Trophy className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">
              {isRTL ? 'لا يوجد فائزين بعد' : 'No winners yet'}
            </p>
            <p className="text-xs mt-1">
              {isRTL ? 'شارك في المسابقات لتكون أول الفائزين!' : 'Join contests to be the first winner!'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

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
        {winners.map((entry) => (
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
