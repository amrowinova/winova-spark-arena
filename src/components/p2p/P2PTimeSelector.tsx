import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { Clock } from 'lucide-react';

interface P2PTimeSelectorProps {
  value: number | null;
  onChange: (minutes: number) => void;
  disabled?: boolean;
}

const FIXED_TIMES = [
  { value: 15, labelEn: '15 min', labelAr: '15 دقيقة' },
  { value: 30, labelEn: '30 min', labelAr: '30 دقيقة' },
  { value: 60, labelEn: '60 min', labelAr: '60 دقيقة' },
];

export function P2PTimeSelector({ value, onChange, disabled }: P2PTimeSelectorProps) {
  const { language } = useLanguage();

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        {language === 'ar' ? 'وقت التنفيذ' : 'Execution Time'}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {FIXED_TIMES.map((time) => {
          const isSelected = value === time.value;
          
          return (
            <button
              key={time.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(time.value)}
              className={cn(
                "h-10 rounded-lg border-2 font-medium text-sm transition-all",
                isSelected 
                  ? "border-primary bg-primary/10 text-primary" 
                  : "border-border bg-card hover:border-primary/50",
                disabled && "opacity-40 cursor-not-allowed"
              )}
            >
              {language === 'ar' ? time.labelAr : time.labelEn}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export { FIXED_TIMES };
