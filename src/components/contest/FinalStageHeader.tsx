import { Trophy, Users, Crown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { CountdownTimer } from '@/components/common/CountdownTimer';
import { getPricing } from '@/contexts/TransactionContext';

interface FinalStageHeaderProps {
  participants: number;
  prizePool: number;
  endsAt: Date;
  country: string;
}

export function FinalStageHeader({ participants, prizePool, endsAt, country }: FinalStageHeaderProps) {
  const { language } = useLanguage();
  const pricing = getPricing(country);
  const prizePoolLocal = prizePool * pricing.novaRate;
  
  return (
    <div className="bg-gradient-to-br from-amber-500 via-yellow-500 to-orange-500 rounded-xl p-5 text-white shadow-lg">
      {/* Stage Badge */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          <span className="text-sm font-medium opacity-90">
            {language === 'ar' ? 'المسابقة اليومية' : 'Daily Contest'}
          </span>
        </div>
        <span className="px-3 py-1 bg-white/20 backdrop-blur rounded-full text-xs font-bold flex items-center gap-1">
          <Crown className="h-3 w-3" />
          {language === 'ar' ? 'المرحلة النهائية' : 'Final Stage'}
        </span>
      </div>
      
      {/* Main Title */}
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold mb-1">
          {language === 'ar' ? 'المرحلة النهائية' : 'Final Stage'}
        </h1>
        <p className="text-sm opacity-90">
          {language === 'ar' ? '(التنافس على Top 5)' : '(Compete for Top 5)'}
        </p>
      </div>
      
      {/* Subtitle */}
      <p className="text-center text-xs opacity-80 mb-4">
        {language === 'ar' 
          ? 'يتنافس أفضل 50 متسابق على المراكز الخمسة الأولى للفوز بالجوائز'
          : 'Top 50 contestants compete for the top 5 positions to win prizes'}
      </p>

      {/* Prize Pool */}
      <div className="bg-white/10 backdrop-blur rounded-lg p-3 mb-4 text-center">
        <p className="text-xs opacity-80 mb-1">
          {language === 'ar' ? '🏆 مجموع الجوائز' : '🏆 Prize Pool'}
        </p>
        <p className="text-2xl font-bold">И {prizePool} Nova</p>
        <p className="text-xs opacity-70">
          ≈ {pricing.symbol} {prizePoolLocal.toFixed(0)}
        </p>
      </div>
      
      {/* Stats Row */}
      <div className="flex items-center justify-center gap-6 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 opacity-70" />
          <span className="font-bold">{participants}</span>
          <span className="opacity-70">{language === 'ar' ? 'متنافس' : 'competing'}</span>
        </div>
      </div>
      
      {/* Countdown */}
      <div className="bg-white/10 backdrop-blur rounded-lg p-3">
        <p className="text-xs text-center opacity-80 mb-2">
          {language === 'ar' ? 'تنتهي المرحلة النهائية بعد:' : 'Final Stage ends in:'}
        </p>
        <CountdownTimer targetDate={endsAt} size="sm" hideDays={true} />
      </div>
    </div>
  );
}
