import { Trophy, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { CountdownTimer } from '@/components/common/CountdownTimer';
import { useNovaPricing } from '@/hooks/useNovaPricing';

interface FinalStageHeaderProps {
  participants: number;
  prizePool: number;
  endsAt: Date;
  country: string;
}

export function FinalStageHeader({ participants, prizePool, endsAt, country }: FinalStageHeaderProps) {
  const { language } = useLanguage();
  const { getCurrencyInfo } = useNovaPricing();
  const pricing = getCurrencyInfo(country);
  const prizePoolLocal = prizePool * pricing.novaRate;
  
  return (
    <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
      {/* Stage Badge */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">
            {language === 'ar' ? 'المسابقة اليومية' : 'Daily Contest'}
          </span>
        </div>
        <span className="px-3 py-1 bg-primary/10 rounded-full text-xs font-bold text-primary">
          {language === 'ar' ? 'المرحلة النهائية' : 'Final Stage'}
        </span>
      </div>
      
      {/* Main Title */}
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold text-foreground mb-1">
          {language === 'ar' ? 'المرحلة النهائية' : 'Final Stage'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {language === 'ar' ? '(التنافس على Top 5)' : '(Compete for Top 5)'}
        </p>
      </div>
      
      {/* Subtitle */}
      <p className="text-center text-xs text-muted-foreground mb-4">
        {language === 'ar' 
          ? 'يتنافس أفضل 50 متسابق على المراكز الخمسة الأولى للفوز بالجوائز'
          : 'Top 50 contestants compete for the top 5 positions to win prizes'}
      </p>

      {/* Prize Pool */}
      <div className="bg-muted/50 rounded-lg p-3 mb-4 text-center">
        <p className="text-xs text-muted-foreground mb-1">
          {language === 'ar' ? '🏆 مجموع الجوائز' : '🏆 Prize Pool'}
        </p>
        <p className="text-2xl font-bold text-foreground">И {prizePool} Nova</p>
        <p className="text-xs text-muted-foreground">
          ≈ {pricing.symbol} {prizePoolLocal.toFixed(0)}
        </p>
      </div>
      
      {/* Stats Row */}
      <div className="flex items-center justify-center gap-6 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-bold text-foreground">{participants}</span>
          <span className="text-muted-foreground">{language === 'ar' ? 'متنافس' : 'competing'}</span>
        </div>
      </div>
      
      {/* Countdown */}
      <div className="bg-muted/50 rounded-lg p-3">
        <p className="text-xs text-center text-muted-foreground mb-2">
          {language === 'ar' ? 'تنتهي المرحلة النهائية بعد:' : 'Final Stage ends in:'}
        </p>
        <CountdownTimer targetDate={endsAt} size="sm" hideDays={true} />
      </div>
    </div>
  );
}
