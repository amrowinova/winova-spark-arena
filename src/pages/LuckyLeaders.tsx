import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Crown, Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { getCountryFlag } from '@/lib/countryFlags';
import { supabase } from '@/integrations/supabase/client';

interface LuckyLeaderEntry {
  id: string;
  name: string;
  country: string;
  novaWon: number;
  winDate: Date;
  position: number;
}

export default function LuckyLeadersPage() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isRTL = language === 'ar';
  const [leaders, setLeaders] = useState<LuckyLeaderEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLuckyLeaders() {
      try {
        const { data, error } = await supabase
          .from('wallet_ledger')
          .select(`
            user_id,
            amount,
            created_at,
            profiles!inner(name, country)
          `)
          .in('entry_type', ['referral_bonus', 'contest_win'])
          .gt('amount', 0);

        if (error) throw error;

        const userWins: Record<string, { name: string; country: string; total: number; lastDate: string }> = {};
        
        for (const entry of data || []) {
          const userId = entry.user_id;
          const profile = entry.profiles as any;
          
          if (!userWins[userId]) {
            userWins[userId] = {
              name: profile?.name || 'User',
              country: profile?.country || '',
              total: 0,
              lastDate: entry.created_at,
            };
          }
          userWins[userId].total += Number(entry.amount) || 0;
          if (entry.created_at > userWins[userId].lastDate) {
            userWins[userId].lastDate = entry.created_at;
          }
        }

        const sorted = Object.entries(userWins)
          .sort((a, b) => b[1].total - a[1].total)
          .slice(0, 20)
          .map(([id, data], index) => ({
            id,
            name: data.name,
            country: data.country,
            novaWon: data.total,
            winDate: new Date(data.lastDate),
            position: index + 1,
          }));

        setLeaders(sorted);
      } catch (err) {
        console.error('Error fetching lucky leaders:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLuckyLeaders();
  }, []);

  const handleProfileClick = (userId: string) => {
    navigate(`/user/${userId}`);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(isRTL ? 'ar-EG-u-ca-gregory' : 'en-US', {
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

  // Empty state
  if (!isLoading && leaders.length === 0) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <InnerPageHeader title={isRTL ? 'متصدّري المحظوظين' : 'Lucky Leaders'} />
        
        <main className="flex-1 px-4 py-4 pb-20 flex items-center justify-center">
          <div className="text-center">
            <Crown className="h-16 w-16 mx-auto mb-4 text-muted-foreground/30" />
            <h2 className="text-lg font-bold mb-2">
              {isRTL ? 'لا يوجد محظوظين بعد' : 'No Lucky Winners Yet'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isRTL 
                ? 'كن أول المحظوظين!'
                : 'Be the first lucky winner!'}
            </p>
          </div>
        </main>
        
        <BottomNav />
      </div>
    );
  }

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
            {leaders.map((entry, index) => (
              <motion.div
                key={entry.id}
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
                    {getCountryFlag(entry.country) && (
                      <span className="text-sm shrink-0">{getCountryFlag(entry.country)}</span>
                    )}
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
