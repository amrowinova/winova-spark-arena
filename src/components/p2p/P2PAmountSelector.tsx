import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface P2PAmountSelectorProps {
  value: number | null;
  onChange: (amount: number) => void;
  maxAmount?: number;
  disabled?: boolean;
}

const FIXED_AMOUNTS = [50, 100, 200, 500];

export function P2PAmountSelector({ 
  value, 
  onChange, 
  maxAmount,
  disabled 
}: P2PAmountSelectorProps) {
  const { language } = useLanguage();

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">
        {language === 'ar' ? 'اختر الكمية' : 'Select Amount'}
      </p>
      <div className="grid grid-cols-4 gap-2">
        {FIXED_AMOUNTS.map((amount) => {
          const isDisabled = disabled || (maxAmount !== undefined && amount > maxAmount);
          const isSelected = value === amount;
          
          return (
            <button
              key={amount}
              type="button"
              disabled={isDisabled}
              onClick={() => onChange(amount)}
              className={cn(
                "relative h-12 rounded-lg border-2 font-bold text-lg transition-all",
                isSelected 
                  ? "border-nova bg-nova/10 text-nova" 
                  : "border-border bg-card hover:border-primary/50",
                isDisabled && "opacity-40 cursor-not-allowed hover:border-border"
              )}
            >
              {amount}
              <span className="absolute -top-1 -end-1 text-[10px] text-nova">✦</span>
            </button>
          );
        })}
      </div>
      {maxAmount !== undefined && maxAmount < 500 && (
        <p className="text-xs text-muted-foreground">
          {language === 'ar' ? 'الحد الأقصى المتاح:' : 'Max available:'} {maxAmount} Nova
        </p>
      )}
    </div>
  );
}

export { FIXED_AMOUNTS };
