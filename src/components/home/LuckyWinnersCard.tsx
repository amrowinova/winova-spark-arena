import { motion } from 'framer-motion';
import { Sparkles, Star, Gift } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
    <Card className="overflow-hidden border-nova/30 bg-gradient-to-br from-nova/5 to-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <motion.div
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Sparkles className="h-5 w-5 text-nova" />
          </motion.div>
          {language === 'ar' ? 'الفائزون المحظوظون' : 'Lucky Winners'}
        </CardTitle>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Gift className="h-3 w-3" />
          {language === 'ar' 
            ? 'بدون فريق أو أصوات – مجرد حظ!' 
            : 'No team or votes needed – just luck!'}
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="grid grid-cols-2 gap-3">
          {winners.map((winner, index) => (
            <motion.div
              key={winner.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.15 }}
              whileHover={{ scale: 1.02 }}
              className="relative p-3 rounded-xl bg-gradient-nova/10 border border-nova/20"
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
                <Star className="h-4 w-4 text-nova fill-nova" />
              </motion.div>

              <div className="flex items-center gap-2 mb-2">
                <div className="w-10 h-10 rounded-full bg-gradient-nova flex items-center justify-center text-lg">
                  {winner.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{winner.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {language === 'ar' 
                      ? (index === 0 ? '65% من الجائزة' : '35% من الجائزة')
                      : (index === 0 ? '65% of pool' : '35% of pool')
                    }
                  </p>
                </div>
              </div>
              
              <div className="text-center">
                <span className="text-lg font-bold text-nova">
                  {winner.prize.toFixed(2)} ✦
                </span>
                <p className="text-[10px] text-muted-foreground">
                  ≈ {pricing.symbol} {(winner.prize * pricing.novaRate).toFixed(2)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
        
        <Link 
          to="/spotlight"
          className="mt-3 flex items-center justify-center text-xs text-nova hover:underline"
        >
          {language === 'ar' ? 'شاهد المزيد من الفائزين ←' : 'See more winners →'}
        </Link>
      </CardContent>
    </Card>
  );
}
