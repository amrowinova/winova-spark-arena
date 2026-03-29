import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { ArrowUpDown, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNovaPricing } from '@/hooks/useNovaPricing';

interface WalletConvertProps {
  novaBalance: number;
  auraBalance: number;
  onConvert: (from: 'nova' | 'aura', to: 'nova' | 'aura', amount: number) => void;
  isLoading?: boolean;
}

export function WalletConvert({
  novaBalance,
  auraBalance,
  onConvert,
  isLoading = false
}: WalletConvertProps) {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { getCurrencyInfo } = useNovaPricing();
  const isRTL = language === 'ar';

  const [fromCurrency, setFromCurrency] = useState<'nova' | 'aura'>('nova');
  const [toCurrency, setToCurrency] = useState<'nova' | 'aura'>('aura');
  const [amount, setAmount] = useState<number>(0);
  const [sliderValue, setSliderValue] = useState<number>(0);

  const currencyInfo = getCurrencyInfo('EGP');
  const exchangeRate = fromCurrency === 'nova' ? 2 : 0.5; // Nova = 2 * Aura
  const maxAmount = fromCurrency === 'nova' ? novaBalance : auraBalance;
  const convertedAmount = amount * exchangeRate;

  const handleSwapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setAmount(0);
    setSliderValue(0);
  };

  const handleSliderChange = (value: number[]) => {
    const newAmount = (value[0] / 100) * maxAmount;
    setAmount(newAmount);
    setSliderValue(value[0]);
  };

  const handleAmountChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    if (numValue <= maxAmount) {
      setAmount(numValue);
      setSliderValue((numValue / maxAmount) * 100);
    }
  };

  const handleConvert = () => {
    if (amount > 0 && amount <= maxAmount) {
      onConvert(fromCurrency, toCurrency, amount);
      setAmount(0);
      setSliderValue(0);
    }
  };

  const formatBalance = (value: number): string => {
    return value % 1 === 0 ? value.toFixed(0) : value.toFixed(2);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          {isRTL ? 'تحويل العملات' : 'Currency Converter'}
        </h2>
        <Button
          variant="outline"
          size="icon"
          onClick={handleSwapCurrencies}
          disabled={isLoading}
        >
          <ArrowUpDown className="h-4 w-4" />
        </Button>
      </div>

      {/* Exchange Rate Info */}
      <Alert className="bg-primary/10 border-primary/20">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          {isRTL 
            ? `معدل التحويل: 1 Nova = 2 Aura | 1 Aura = 0.5 Nova`
            : `Exchange Rate: 1 Nova = 2 Aura | 1 Aura = 0.5 Nova`
          }
        </AlertDescription>
      </Alert>

      {/* From Currency */}
      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              {isRTL ? 'من' : 'From'}
            </Label>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${fromCurrency === 'nova' ? 'text-nova' : 'text-aura'}`}>
                {fromCurrency === 'nova' ? 'И' : '✦'}
              </span>
              <span className="text-sm text-muted-foreground">
                {fromCurrency === 'nova' ? 'Nova' : 'Aura'}
              </span>
            </div>
          </div>
          
          <Input
            type="number"
            value={amount || ''}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="0"
            className="text-lg font-mono"
            disabled={isLoading}
          />
          
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{isRTL ? 'الرصيد المتاح:' : 'Available:'}</span>
            <span className="font-mono">
              {formatBalance(maxAmount)} {fromCurrency === 'nova' ? 'И' : '✦'}
            </span>
          </div>

          {/* Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{isRTL ? 'الكمية' : 'Amount'}</span>
              <span>{Math.round(sliderValue)}%</span>
            </div>
            <Slider
              value={[sliderValue]}
              onValueChange={handleSliderChange}
              max={100}
              step={1}
              disabled={isLoading}
              className="w-full"
            />
          </div>
        </div>
      </Card>

      {/* To Currency */}
      <Card className="p-4 bg-muted/30">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              {isRTL ? 'إلى' : 'To'}
            </Label>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${toCurrency === 'nova' ? 'text-nova' : 'text-aura'}`}>
                {toCurrency === 'nova' ? 'И' : '✦'}
              </span>
              <span className="text-sm text-muted-foreground">
                {toCurrency === 'nova' ? 'Nova' : 'Aura'}
              </span>
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground">
              {formatBalance(convertedAmount)}
            </div>
            <div className="text-sm text-muted-foreground">
              {toCurrency === 'nova' ? 'Nova' : 'Aura'}
            </div>
          </div>

          {/* Conversion Indicator */}
          <div className="flex items-center justify-center gap-2 text-sm">
            {fromCurrency === 'nova' ? (
              <TrendingDown className="h-4 w-4 text-warning" />
            ) : (
              <TrendingUp className="h-4 w-4 text-success" />
            )}
            <span className="text-muted-foreground">
              {isRTL 
                ? `سوف تحصل على ${formatBalance(convertedAmount)} ${toCurrency === 'nova' ? 'Nova' : 'Aura'}`
                : `You will receive ${formatBalance(convertedAmount)} ${toCurrency === 'nova' ? 'Nova' : 'Aura'}`
              }
            </span>
          </div>
        </div>
      </Card>

      {/* Convert Button */}
      <Button
        onClick={handleConvert}
        disabled={isLoading || amount <= 0 || amount > maxAmount}
        className="w-full"
        size="lg"
      >
        {isLoading && (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
        )}
        {isRTL ? 'تحويل الآن' : 'Convert Now'}
      </Button>

      {/* Fee Information */}
      <Alert className="bg-muted/50 border-border">
        <AlertDescription className="text-xs">
          {isRTL 
            ? '💡 التحويل بين Nova و Aura مجاني ولا يوجد أي رسوم.'
            : '💡 Converting between Nova and Aura is free with no fees.'
          }
        </AlertDescription>
      </Alert>
    </div>
  );
}
