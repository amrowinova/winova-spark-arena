import { Trophy, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { CountdownTimer } from '@/components/common/CountdownTimer';
import { ContestCountdownBadge } from '@/components/common/ContestCountdownBadge';

interface ContestStageHeaderProps {
  stage: 'stage1' | 'final';
  participants: number;
  endsAt: Date;
}

export function ContestStageHeader({ stage, participants, endsAt }: ContestStageHeaderProps) {
  const { language } = useLanguage();
  
  const isStage1 = stage === 'stage1';
  
  return (
    <div className="bg-card rounded-xl p-5 border border-border shadow-sm">
      {/* Countdown badge — updates every minute, KSA time */}
      <div className="flex justify-center mb-3">
        <ContestCountdownBadge />
      </div>

      {/* Stage Badge */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">
            {language === 'ar' ? 'المسابقة اليومية' : 'Daily Contest'}
          </span>
        </div>
        <span className="px-3 py-1 bg-primary/10 rounded-full text-xs font-bold text-primary">
          {isStage1 
            ? (language === 'ar' ? 'المرحلة الأولى' : 'Stage 1')
            : (language === 'ar' ? 'المرحلة النهائية' : 'Final Stage')
          }
        </span>
      </div>
      
      {/* Main Title */}
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold text-foreground mb-1">
          {isStage1
            ? (language === 'ar' ? 'المرحلة الأولى' : 'Stage 1')
            : (language === 'ar' ? 'المرحلة النهائية' : 'Final Stage')
          }
        </h1>
        <p className="text-sm text-muted-foreground">
          {isStage1
            ? (language === 'ar' ? '(التأهل إلى Top 50)' : '(Qualify for Top 50)')
            : (language === 'ar' ? '(التنافس على الجوائز)' : '(Compete for Prizes)')
          }
        </p>
      </div>
      
      {/* Subtitle */}
      <p className="text-center text-xs text-muted-foreground mb-4">
        {isStage1
          ? (language === 'ar' ? 'يتأهل أعلى 50 متسابق إلى المرحلة النهائية' : 'Top 50 contestants qualify for the Final Stage')
          : (language === 'ar' ? 'أفضل 5 متسابقين يفوزون بالجوائز' : 'Top 5 contestants win the prizes')
        }
      </p>
      
      {/* Stats Row */}
      <div className="flex items-center justify-center gap-6 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="font-bold text-foreground">{participants}</span>
          <span className="text-muted-foreground">{language === 'ar' ? 'مشترك' : 'participants'}</span>
        </div>
      </div>
      
      {/* Countdown */}
      <div className="bg-muted/50 rounded-lg p-3">
        <p className="text-xs text-center text-muted-foreground mb-2">
          {isStage1
            ? (language === 'ar' ? 'تنتهي المرحلة الأولى بعد:' : 'Stage 1 ends in:')
            : (language === 'ar' ? 'تنتهي المرحلة النهائية بعد:' : 'Final Stage ends in:')
          }
        </p>
        <CountdownTimer targetDate={endsAt} size="sm" hideDays={true} />
      </div>
    </div>
  );
}
