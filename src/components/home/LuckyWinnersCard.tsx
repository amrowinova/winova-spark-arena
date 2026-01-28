import { motion } from 'framer-motion';
import { Sparkles, Star, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { getPricing } from '@/contexts/TransactionContext';
import { Link, useNavigate } from 'react-router-dom';
import { getCountryFlag } from '@/lib/countryFlags';
import { getPlatformUserById } from '@/lib/platformUsers';

interface LuckyWinner {
  id: string;
  name: string;
  avatar: string;
  prize: number;
}

interface LuckyWinnersCardProps {
  winners: LuckyWinner[];
  country: string;
}

export function LuckyWinnersCard({ winners, country }: LuckyWinnersCardProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const pricing = getPricing(country);

  const handleProfileClick = (userId: string) => {
    navigate(`/user/${userId}`);
  };

  return (
    <Card className="overflow-hidden border-nova/20 shadow-md">
      <CardHeader className="pb-2 pt-4 px-4">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Sparkles className="h-4 w-4 text-nova" />
          </motion.div>
          {language === 'ar' ? 'المحظوظون' : 'Lucky Winners'}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <div className="flex gap-3">
          {winners.map((winner, index) => (
            <motion.div
              key={winner.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="flex-1 relative p-3 rounded-xl bg-gradient-nova/5 border border-nova/20"
            >
              {/* Star decoration */}
              <motion.div
                animate={{ 
                  opacity: [0.5, 1, 0.5],
                  scale: [1, 1.2, 1]
                }}
                transition={{ repeat: Infinity, duration: 1.5, delay: index * 0.3 }}
                className="absolute -top-1 -right-1"
              >
                <Star className="h-3 w-3 text-nova fill-nova" />
              </motion.div>

              <div className="flex items-center gap-2 mb-2">
                {/* Avatar - Clickable */}
                <div 
                  className="w-8 h-8 rounded-full bg-gradient-nova flex items-center justify-center text-sm cursor-pointer hover:ring-2 hover:ring-nova/50 transition-all"
                  onClick={() => handleProfileClick(winner.id)}
                >
                  {winner.avatar}
                </div>
                {/* Name - Clickable */}
                <p 
                  className="font-medium text-xs truncate flex-1 cursor-pointer hover:text-nova transition-colors"
                  onClick={() => handleProfileClick(winner.id)}
                >
                  {winner.name}
                </p>
                {(() => {
                  const user = getPlatformUserById(winner.id);
                  const flag = user ? getCountryFlag(user.country) : '';
                  return flag ? <span className="text-xs shrink-0">{flag}</span> : null;
                })()}
              </div>
              
              <div className="text-center">
                <span className="text-sm font-bold text-nova">
                  И {winner.prize >= 1 ? Math.floor(winner.prize) : winner.prize.toFixed(1)}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
        
        <Button asChild variant="ghost" size="sm" className="w-full mt-3 text-nova">
          <Link to="/spotlight" className="flex items-center justify-center gap-1">
            {language === 'ar' ? 'شاهد المزيد' : 'See More'}
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
