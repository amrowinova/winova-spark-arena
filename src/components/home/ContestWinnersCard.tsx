import { motion } from 'framer-motion';
import { Trophy, Crown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { getPricing } from '@/contexts/TransactionContext';
import { Link, useNavigate } from 'react-router-dom';

interface Winner {
  id: number;
  name: string;
  avatar: string;
  rank: string;
  prize: number;
  position: number;
}

interface ContestWinnersCardProps {
  winners: Winner[];
  prizePool: number;
  country: string;
  limit?: number;
}

export function ContestWinnersCard({ winners, prizePool, country, limit = 3 }: ContestWinnersCardProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const pricing = getPricing(country);

  const handleProfileClick = (userId: number) => {
    navigate(`/user/${userId}`);
  };

  const positionColors = [
    'bg-gradient-to-r from-yellow-400 to-amber-500', // 1st
    'bg-gradient-to-r from-gray-300 to-gray-400',    // 2nd
    'bg-gradient-to-r from-amber-600 to-amber-700', // 3rd
  ];

  // Show only limited winners
  const displayedWinners = winners.slice(0, limit);

  return (
    <Card className="overflow-hidden border-0 shadow-md">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Trophy className="h-4 w-4 text-primary" />
          {language === 'ar' ? '🏆 الفائزون' : '🏆 Winners'}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="space-y-2">
          {displayedWinners.map((winner, index) => (
            <motion.div
              key={winner.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-center gap-3 p-2 rounded-lg ${
                index === 0 ? 'bg-yellow-500/10' : 'bg-muted/30'
              }`}
            >
              {/* Position Badge */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-xs ${positionColors[index] || 'bg-muted'}`}>
                {index === 0 ? <Crown className="h-3.5 w-3.5" /> : winner.position}
              </div>

              {/* Avatar - Clickable */}
              <div 
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                onClick={() => handleProfileClick(winner.id)}
              >
                {winner.avatar}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p 
                  className="font-medium text-sm truncate cursor-pointer hover:text-primary transition-colors"
                  onClick={() => handleProfileClick(winner.id)}
                >
                  {winner.name}
                </p>
              </div>

              {/* Prize */}
              <div className="text-end">
                <p className="font-bold text-nova text-sm">
                  И {winner.prize >= 1 ? Math.floor(winner.prize) : winner.prize.toFixed(1)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* See More Button - Navigate to Winners */}
        <Button asChild variant="ghost" size="sm" className="w-full mt-3 text-primary">
          <Link to="/winners" className="flex items-center justify-center gap-1">
            {language === 'ar' ? 'شاهد المزيد' : 'See More'}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
