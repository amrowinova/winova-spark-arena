import { Crown, ChevronRight, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate, Link } from 'react-router-dom';
import { getCountryFlag } from '@/lib/countryFlags';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface LeaderEntry {
  id: string;
  name: string;
  novaWon: number;
  winDate: Date;
  position: number;
  country: string;
}

interface LuckyLeadersCardProps {
  limit?: number;
}

export function LuckyLeadersCard({ limit = 5 }: LuckyLeadersCardProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isRTL = language === 'ar';
  const [leaders, setLeaders] = useState<LeaderEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLuckyLeaders() {
      try {
        // Step 1: Fetch ledger entries for referral_bonus or contest_win (no join)
        const { data: ledgerData, error: ledgerError } = await supabase
          .from('wallet_ledger')
          .select('user_id, amount, created_at')
          .in('entry_type', ['referral_bonus', 'contest_win'])
          .gt('amount', 0)
          .order('amount', { ascending: false })
          .limit(100);

        if (ledgerError) throw ledgerError;

        if (!ledgerData || ledgerData.length === 0) {
          setLeaders([]);
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
          setLeaders([]);
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

        // Step 4: Build sorted list
        const sorted = Object.entries(userWins)
          .sort((a, b) => b[1].total - a[1].total)
          .slice(0, limit)
          .map(([userId, data], index) => ({
            id: userId,
            name: profileMap[userId]?.name || 'User',
            novaWon: data.total,
            winDate: new Date(data.lastDate),
            position: index + 1,
            country: getCountryFlag(profileMap[userId]?.country || '') || '',
          }));

        setLeaders(sorted);
      } catch (err) {
        console.error('Error fetching lucky leaders:', err);
        setLeaders([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLuckyLeaders();
  }, [limit]);

  const handleProfileClick = (userId: string) => {
    navigate(`/user/${userId}`);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(isRTL ? 'ar-EG-u-ca-gregory' : 'en-US', {
      day: 'numeric',
      month: 'short',
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

  // Empty state
  if (!isLoading && leaders.length === 0) {
    return (
      <Card className="overflow-hidden border border-border bg-card">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Crown className="h-4 w-4 text-nova" />
            <span>{isRTL ? 'متصدّري المحظوظين' : 'Lucky Leaders'}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div className="text-center py-6 text-muted-foreground">
            <Crown className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">
              {isRTL ? 'لا يوجد محظوظين بعد' : 'No lucky winners yet'}
            </p>
            <p className="text-xs mt-1">
              {isRTL ? 'كن أول المحظوظين!' : 'Be the first lucky winner!'}
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
            <Crown className="h-4 w-4 text-nova" />
            <span>
              {isRTL ? 'متصدّري المحظوظين' : 'Lucky Leaders'}
            </span>
          </CardTitle>
          <Button 
            asChild 
            variant="ghost" 
            size="sm" 
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Link to="/lucky-leaders">
              {isRTL ? 'مشاهدة المزيد' : 'See More'}
              <ChevronRight className="h-3.5 w-3.5 ms-0.5" />
            </Link>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {isRTL ? 'أعلى الرابحين في سحوبات المحظوظين' : 'Top winners from lucky draws'}
        </p>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-2">
        {leaders.map((entry) => (
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
                {entry.country && <span className="text-sm shrink-0">{entry.country}</span>}
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
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
