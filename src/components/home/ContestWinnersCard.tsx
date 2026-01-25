import { motion } from 'framer-motion';
import { Trophy, Crown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { getPricing } from '@/contexts/TransactionContext';

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
}

export function ContestWinnersCard({ winners, prizePool, country }: ContestWinnersCardProps) {
  const { language } = useLanguage();
  const pricing = getPricing(country);

  const positionColors = [
    'bg-gradient-to-r from-yellow-400 to-amber-500', // 1st
    'bg-gradient-to-r from-gray-300 to-gray-400',    // 2nd
    'bg-gradient-to-r from-amber-600 to-amber-700', // 3rd
    'bg-gradient-to-r from-primary/80 to-primary',  // 4th
    'bg-gradient-to-r from-primary/60 to-primary/80', // 5th
  ];

  return (
    <Card className="overflow-hidden border-0 shadow-lg">
      <CardHeader className="bg-gradient-primary pb-3 pt-4">
        <CardTitle className="text-primary-foreground flex items-center gap-2 text-base">
          <Trophy className="h-5 w-5" />
          {language === 'ar' ? 'الفائزون اليوم' : "Today's Winners"}
        </CardTitle>
        <p className="text-primary-foreground/70 text-xs">
          {language === 'ar' ? 'مجموع الجوائز:' : 'Prize Pool:'} {prizePool} ✦ ({pricing.symbol} {(prizePool * pricing.novaRate).toFixed(0)})
        </p>
      </CardHeader>
      <CardContent className="p-3">
        <div className="space-y-2">
          {winners.map((winner, index) => (
            <motion.div
              key={winner.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex items-center gap-3 p-2 rounded-lg ${
                index === 0 ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-muted/50'
              }`}
            >
              {/* Position Badge */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${positionColors[index]}`}>
                {index === 0 ? <Crown className="h-4 w-4" /> : winner.position}
              </div>

              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">
                {winner.avatar}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{winner.name}</p>
                <p className="text-xs text-muted-foreground">{winner.rank}</p>
              </div>

              {/* Prize */}
              <div className="text-end">
                <p className="font-bold text-nova text-sm">
                  {winner.prize.toFixed(1)} ✦
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {pricing.symbol} {(winner.prize * pricing.novaRate).toFixed(0)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
