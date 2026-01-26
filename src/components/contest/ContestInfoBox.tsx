import { AlertCircle, Info, Gift } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useLanguage } from '@/contexts/LanguageContext';

interface ContestInfoBoxProps {
  variant: 'qualification-rules' | 'free-vote' | 'stage-info';
  stage?: 'stage1' | 'final';
}

export function ContestInfoBox({ variant, stage = 'stage1' }: ContestInfoBoxProps) {
  const { language } = useLanguage();
  
  if (variant === 'qualification-rules') {
    return (
      <Alert className="bg-primary/5 border-primary/20">
        <Info className="h-4 w-4 text-primary" />
        <AlertTitle className="text-sm font-bold text-primary">
          {language === 'ar' ? '🔔 معلومة' : '🔔 Info'}
        </AlertTitle>
        <AlertDescription className="text-xs text-muted-foreground leading-relaxed">
          {language === 'ar' 
            ? 'أفضل 50 متسابق في هذه المرحلة يتأهلون تلقائيًا إلى المرحلة النهائية للتنافس على الجوائز. لا يتم توزيع أي جوائز في المرحلة الأولى.'
            : 'Top 50 contestants in this stage automatically qualify for the Final Stage to compete for prizes. No prizes are distributed in Stage 1.'
          }
        </AlertDescription>
      </Alert>
    );
  }
  
  if (variant === 'free-vote' && stage === 'stage1') {
    return (
      <Alert className="bg-aura/5 border-aura/30">
        <Gift className="h-4 w-4 text-aura" />
        <AlertDescription className="text-xs text-aura font-medium">
          {language === 'ar' 
            ? '🎁 صوت مجاني واحد يظهر عشوائيًا خلال المرحلة الأولى'
            : '🎁 One free vote appears randomly during Stage 1'
          }
        </AlertDescription>
      </Alert>
    );
  }
  
  if (variant === 'stage-info') {
    return (
      <Alert className="bg-muted/50 border-border">
        <AlertCircle className="h-4 w-4 text-muted-foreground" />
        <AlertDescription className="text-xs text-muted-foreground">
          {stage === 'stage1' 
            ? (language === 'ar' 
                ? 'المتسابق يحصل على 10% من قيمة الأصوات المدفوعة المستلمة كمكافأة Aura'
                : 'Contestants earn 10% of paid votes received as Aura rewards')
            : (language === 'ar'
                ? 'توزع الجوائز تلقائيًا عند انتهاء المرحلة النهائية'
                : 'Prizes are automatically distributed when the Final Stage ends')
          }
        </AlertDescription>
      </Alert>
    );
  }
  
  return null;
}
