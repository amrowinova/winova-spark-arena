import { Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNovaPricing } from '@/hooks/useNovaPricing';
import { useContestConfig } from '@/hooks/useContestConfig';

interface PrizeDistributionCardProps {
  prizePool: number;
  country: string;
}

export function PrizeDistributionCard({ prizePool, country }: PrizeDistributionCardProps) {
  const { language } = useLanguage();
  const { getCurrencyInfo } = useNovaPricing();
  const { config } = useContestConfig();
  const pricing = getCurrencyInfo(country);

  return (
    <Card>
      <CardContent className="p-4">
        <h3 className="font-bold text-primary flex items-center gap-2 mb-4">
          <Trophy className="h-4 w-4" />
          {language === 'ar' ? '🏆 جوائز المرحلة النهائية' : '🏆 Final Stage Prizes'}
        </h3>

        <div className="space-y-4">
          {config.distribution.map((prize, index) => {
            const prizeAmount = prizePool * prize.pct / 100;
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
                      {prize.place}
                    </div>
                    <span className="text-sm font-medium">
                      {language === 'ar' ? prize.arLabel : prize.label}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {prize.pct}%
                  </span>
                </div>

                <Progress value={prize.pct} className="h-2" />

                <div className="flex items-center justify-between">
                  <p className="font-bold text-nova">
                    И {prizeAmount % 1 === 0 ? prizeAmount.toFixed(0) : prizeAmount.toFixed(1)} Nova
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ≈ {pricing.symbol} {prizeLocal.toFixed(0)}
                  </p>
                </div>

                {index < config.distribution.length - 1 && (
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
