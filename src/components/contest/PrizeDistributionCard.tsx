import { Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import { getPricing } from '@/contexts/TransactionContext';

interface PrizeDistributionCardProps {
  prizePool: number;
  country: string;
}

const prizeDistribution = [
  { place: '1st', percentage: 50, arLabel: 'الأول' },
  { place: '2nd', percentage: 20, arLabel: 'الثاني' },
  { place: '3rd', percentage: 15, arLabel: 'الثالث' },
  { place: '4th', percentage: 10, arLabel: 'الرابع' },
  { place: '5th', percentage: 5, arLabel: 'الخامس' },
];

export function PrizeDistributionCard({ prizePool, country }: PrizeDistributionCardProps) {
  const { language } = useLanguage();
  const pricing = getPricing(country);
  
  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-bold text-primary flex items-center gap-2 mb-4">
          <Trophy className="h-4 w-4" />
          {language === 'ar' ? '🏆 جوائز المرحلة النهائية' : '🏆 Final Stage Prizes'}
        </h3>
        
        <div className="space-y-4">
          {prizeDistribution.map((prize, index) => {
            const prizeAmount = prizePool * prize.percentage / 100;
            const prizeLocal = prizeAmount * pricing.novaRate;
            
            return (
              <div key={prize.place} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                      index < 3 
                        ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' 
                        : 'bg-primary/10 text-primary'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="text-sm font-medium">
                      {language === 'ar' ? prize.arLabel : prize.place}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {prize.percentage}%
                  </span>
                </div>
                
                <Progress value={prize.percentage} className="h-2" />
                
                <div className="flex items-center justify-between">
                  <p className="font-bold text-nova">
                    И {prizeAmount % 1 === 0 ? prizeAmount.toFixed(0) : prizeAmount.toFixed(1)} Nova
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ≈ {pricing.symbol} {prizeLocal.toFixed(0)}
                  </p>
                </div>
                
                {index < prizeDistribution.length - 1 && (
                  <div className="border-b border-border/50 pt-2" />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
