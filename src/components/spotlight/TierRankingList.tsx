import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { TrendingUp, Medal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { getCountryFlag } from '@/lib/countryFlags';
import type { UserRank } from '@/contexts/UserContext';

interface RankingUser {
  id: string;
  name: string;
  avatar: string;
  points: number;
  position: number;
  isCurrentUser?: boolean;
  country?: string;
}

interface TierRankingListProps {
  userRank: UserRank;
  rankings: RankingUser[];
}

const rankLabels: Record<UserRank, { ar: string; en: string }> = {
  subscriber: { ar: 'المشتركين', en: 'Subscribers' },
  marketer: { ar: 'المسوّقين', en: 'Marketers' },
  leader: { ar: 'القادة', en: 'Leaders' },
  manager: { ar: 'المدراء', en: 'Managers' },
  president: { ar: 'الرؤساء', en: 'Presidents' },
};

export function TierRankingList({ userRank, rankings }: TierRankingListProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const isRTL = language === 'ar';

  const handleProfileClick = (userId: string, isCurrentUser?: boolean) => {
    if (!isCurrentUser) {
      navigate(`/user/${userId}`);
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-primary" />
        {isRTL ? `ترتيب ${rankLabels[userRank].ar}` : `${rankLabels[userRank].en} Ranking`}
      </h2>

      <div className="space-y-2">
        {rankings.map((user, index) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className={user.isCurrentUser ? 'border-primary glow-primary' : ''}>
              <CardContent className="p-3 flex items-center gap-3">
                {/* Position */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  user.position <= 3 
                    ? 'bg-gradient-nova text-nova-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {user.position}
                </div>

                {/* Avatar */}
                <div 
                  className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg ${
                    !user.isCurrentUser ? 'cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all' : ''
                  }`}
                  onClick={() => handleProfileClick(user.id, user.isCurrentUser)}
                >
                  {user.avatar}
                </div>

                {/* Name */}
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <p 
                      className={`font-medium ${
                        user.isCurrentUser 
                          ? 'text-primary' 
                          : 'cursor-pointer hover:text-primary transition-colors'
                      }`}
                      onClick={() => handleProfileClick(user.id, user.isCurrentUser)}
                    >
                      {user.isCurrentUser ? (isRTL ? 'أنت' : 'You') : user.name}
                    </p>
                    {user.country && getCountryFlag(user.country) && !user.isCurrentUser && (
                      <span className="text-sm shrink-0">{getCountryFlag(user.country)}</span>
                    )}
                  </div>
                </div>

                {/* Points */}
                <div className="text-end">
                  <p className="font-bold">{user.points.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? 'نقطة' : 'points'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
