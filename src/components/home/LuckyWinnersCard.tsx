import { motion } from 'framer-motion';
import { Sparkles, Star, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { getPricing } from '@/contexts/TransactionContext';
import { Link } from 'react-router-dom';

interface LuckyWinner {
  id: number;
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
  const pricing = getPricing(country);

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
          {language === 'ar' ? 'الفائزون المحظوظون' : 'Lucky Winners'}
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
                <div className="w-8 h-8 rounded-full bg-gradient-nova flex items-center justify-center text-sm">
                  {winner.avatar}
                </div>
                <p className="font-medium text-xs truncate flex-1">{winner.name}</p>
              </div>
              
              <div className="text-center">
                <span className="text-sm font-bold text-nova">
                  {winner.prize >= 1 ? Math.floor(winner.prize) : winner.prize.toFixed(1)} ✦
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
