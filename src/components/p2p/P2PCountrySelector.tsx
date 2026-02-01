/**
 * P2P Country Selector
 * 
 * Uses useNovaPricing as the SINGLE SOURCE OF TRUTH for all rates.
 * No hardcoded prices - all rates come from app_settings via the hook.
 */

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNovaPricing } from '@/hooks/useNovaPricing';
import { cn } from '@/lib/utils';

export interface PaymentMethod {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
}

// Country metadata - NO RATES (rates come from useNovaPricing)
interface CountryMeta {
  code: string;
  name: string;
  nameAr: string;
  flag: string;
  currencyCode: string;
  paymentMethods: PaymentMethod[];
}

// Country metadata with payment methods only
const COUNTRY_META: CountryMeta[] = [
  {
    code: 'SA', name: 'Saudi Arabia', nameAr: 'السعودية', flag: '🇸🇦',
    currencyCode: 'SAR',
    paymentMethods: [
      { id: 'rajhi', name: 'Al Rajhi Bank', nameAr: 'بنك الراجحي', icon: '🏦' },
      { id: 'ncb', name: 'NCB', nameAr: 'البنك الأهلي', icon: '🏦' },
      { id: 'stcpay', name: 'STC Pay', nameAr: 'STC Pay', icon: '📱' },
    ],
  },
  {
    code: 'AE', name: 'UAE', nameAr: 'الإمارات', flag: '🇦🇪',
    currencyCode: 'AED',
    paymentMethods: [
      { id: 'adcb', name: 'ADCB', nameAr: 'أبوظبي التجاري', icon: '🏦' },
      { id: 'enbd', name: 'Emirates NBD', nameAr: 'الإمارات دبي الوطني', icon: '🏦' },
    ],
  },
  {
    code: 'KW', name: 'Kuwait', nameAr: 'الكويت', flag: '🇰🇼',
    currencyCode: 'KWD',
    paymentMethods: [
      { id: 'nbk', name: 'NBK', nameAr: 'بنك الكويت الوطني', icon: '🏦' },
      { id: 'knet', name: 'KNET', nameAr: 'كي نت', icon: '💳' },
    ],
  },
  {
    code: 'QA', name: 'Qatar', nameAr: 'قطر', flag: '🇶🇦',
    currencyCode: 'QAR',
    paymentMethods: [
      { id: 'qnb', name: 'QNB', nameAr: 'بنك قطر الوطني', icon: '🏦' },
    ],
  },
  {
    code: 'BH', name: 'Bahrain', nameAr: 'البحرين', flag: '🇧🇭',
    currencyCode: 'BHD',
    paymentMethods: [
      { id: 'benefit', name: 'BenefitPay', nameAr: 'بنفت باي', icon: '📱' },
    ],
  },
  {
    code: 'OM', name: 'Oman', nameAr: 'عُمان', flag: '🇴🇲',
    currencyCode: 'OMR',
    paymentMethods: [
      { id: 'bankmuscat', name: 'Bank Muscat', nameAr: 'بنك مسقط', icon: '🏦' },
    ],
  },
  {
    code: 'EG', name: 'Egypt', nameAr: 'مصر', flag: '🇪🇬',
    currencyCode: 'EGP',
    paymentMethods: [
      { id: 'cib', name: 'CIB', nameAr: 'البنك التجاري الدولي', icon: '🏦' },
      { id: 'vodafone', name: 'Vodafone Cash', nameAr: 'فودافون كاش', icon: '📱' },
      { id: 'instapay', name: 'InstaPay', nameAr: 'إنستاباي', icon: '💳' },
    ],
  },
  {
    code: 'JO', name: 'Jordan', nameAr: 'الأردن', flag: '🇯🇴',
    currencyCode: 'JOD',
    paymentMethods: [
      { id: 'abc', name: 'Arab Bank', nameAr: 'البنك العربي', icon: '🏦' },
      { id: 'cliq', name: 'CliQ', nameAr: 'كليك', icon: '💳' },
    ],
  },
  {
    code: 'PS', name: 'Palestine', nameAr: 'فلسطين', flag: '🇵🇸',
    currencyCode: 'ILS',
    paymentMethods: [
      { id: 'bop', name: 'Bank of Palestine', nameAr: 'بنك فلسطين', icon: '🏦' },
      { id: 'jawwal', name: 'Jawwal Pay', nameAr: 'جوال باي', icon: '📱' },
    ],
  },
  {
    code: 'LB', name: 'Lebanon', nameAr: 'لبنان', flag: '🇱🇧',
    currencyCode: 'LBP',
    paymentMethods: [
      { id: 'whish', name: 'Whish Money', nameAr: 'ويش موني', icon: '📱' },
    ],
  },
  {
    code: 'SY', name: 'Syria', nameAr: 'سوريا', flag: '🇸🇾',
    currencyCode: 'SYP',
    paymentMethods: [
      { id: 'syriatel', name: 'Syriatel Cash', nameAr: 'سيرياتيل كاش', icon: '📱' },
    ],
  },
  {
    code: 'YE', name: 'Yemen', nameAr: 'اليمن', flag: '🇾🇪',
    currencyCode: 'YER',
    paymentMethods: [
      { id: 'floosak', name: 'Floosak', nameAr: 'فلوسك', icon: '📱' },
    ],
  },
  {
    code: 'MA', name: 'Morocco', nameAr: 'المغرب', flag: '🇲🇦',
    currencyCode: 'MAD',
    paymentMethods: [
      { id: 'cih', name: 'CIH Bank', nameAr: 'بنك CIH', icon: '🏦' },
      { id: 'cashplus', name: 'Cash Plus', nameAr: 'كاش بلس', icon: '📱' },
    ],
  },
  {
    code: 'TN', name: 'Tunisia', nameAr: 'تونس', flag: '🇹🇳',
    currencyCode: 'TND',
    paymentMethods: [
      { id: 'biat', name: 'BIAT', nameAr: 'البنك العربي الدولي', icon: '🏦' },
    ],
  },
  {
    code: 'DZ', name: 'Algeria', nameAr: 'الجزائر', flag: '🇩🇿',
    currencyCode: 'DZD',
    paymentMethods: [
      { id: 'ccp', name: 'CCP', nameAr: 'بريد الجزائر', icon: '🏦' },
      { id: 'baridimob', name: 'BaridiMob', nameAr: 'بريدي موب', icon: '📱' },
    ],
  },
  {
    code: 'LY', name: 'Libya', nameAr: 'ليبيا', flag: '🇱🇾',
    currencyCode: 'LYD',
    paymentMethods: [
      { id: 'sadad', name: 'Sadad', nameAr: 'سداد', icon: '📱' },
    ],
  },
  {
    code: 'SD', name: 'Sudan', nameAr: 'السودان', flag: '🇸🇩',
    currencyCode: 'SDG',
    paymentMethods: [
      { id: 'bankak', name: 'Bankak', nameAr: 'بنكك', icon: '📱' },
    ],
  },
  {
    code: 'TR', name: 'Turkey', nameAr: 'تركيا', flag: '🇹🇷',
    currencyCode: 'TRY',
    paymentMethods: [
      { id: 'papara', name: 'Papara', nameAr: 'بابارا', icon: '📱' },
      { id: 'ziraat', name: 'Ziraat Bank', nameAr: 'زراعات بنك', icon: '🏦' },
    ],
  },
  {
    code: 'IQ', name: 'Iraq', nameAr: 'العراق', flag: '🇮🇶',
    currencyCode: 'IQD',
    paymentMethods: [
      { id: 'zain', name: 'Zain Cash', nameAr: 'زين كاش', icon: '📱' },
      { id: 'fastpay', name: 'FastPay', nameAr: 'فاست باي', icon: '📱' },
    ],
  },
];

// CountryConfig interface for external use - includes rates from useNovaPricing
export interface CountryConfig {
  code: string;
  name: string;
  nameAr: string;
  flag: string;
  currency: string;
  currencySymbol: string;
  novaRate: number;
  paymentMethods: PaymentMethod[];
}

// Hook to get country configs with live rates from app_settings
export function useP2PCountries() {
  const { getCurrencyInfo } = useNovaPricing();
  
  const countries: CountryConfig[] = COUNTRY_META.map(meta => {
    const currencyInfo = getCurrencyInfo(meta.name);
    return {
      code: meta.code,
      name: meta.name,
      nameAr: meta.nameAr,
      flag: meta.flag,
      currency: meta.currencyCode,
      currencySymbol: currencyInfo.symbol,
      novaRate: currencyInfo.novaRate,
      paymentMethods: meta.paymentMethods,
    };
  });
  
  return countries;
}

interface P2PCountrySelectorProps {
  selectedCountry: CountryConfig;
  onCountryChange: (country: CountryConfig) => void;
  className?: string;
}

export function P2PCountrySelector({ 
  selectedCountry, 
  onCountryChange,
  className 
}: P2PCountrySelectorProps) {
  const { language } = useLanguage();
  const countries = useP2PCountries();
  const [open, setOpen] = useState(false);

  // Get the full country config with live rates
  const currentCountry = countries.find(c => c.code === selectedCountry.code) || countries[0];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className={cn("gap-2 h-12 px-4", className)}
        >
          <span className="text-2xl">{currentCountry.flag}</span>
          <div className="text-start">
            <p className="text-sm font-medium">
              {language === 'ar' ? currentCountry.nameAr : currentCountry.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {currentCountry.currencySymbol} {currentCountry.currency}
            </p>
          </div>
          <ChevronDown className="h-4 w-4 ms-auto text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 p-0 bg-popover z-50">
        <div className="px-3 py-2 text-xs text-muted-foreground border-b bg-muted/30 sticky top-0">
          {language === 'ar' ? 'اختر الدولة' : 'Select Country'}
        </div>
        <ScrollArea className="h-[min(70vh,400px)]">
          <div className="p-1">
            {countries.map((country) => (
              <DropdownMenuItem
                key={country.code}
                onClick={() => {
                  onCountryChange(country);
                  setOpen(false);
                }}
                className={cn(
                  "gap-3 py-2.5 px-3 cursor-pointer rounded-md",
                  currentCountry.code === country.code && "bg-primary/10"
                )}
              >
                <span className="text-xl">{country.flag}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {language === 'ar' ? country.nameAr : country.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {country.currencySymbol} • И 1 = {country.novaRate.toLocaleString()}
                  </p>
                </div>
                {currentCountry.code === country.code && (
                  <div className="h-2 w-2 rounded-full bg-primary" />
                )}
              </DropdownMenuItem>
            ))}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Hook to get default country with live rates
export function useDefaultCountry(): CountryConfig {
  const countries = useP2PCountries();
  return countries[0]; // Saudi Arabia
}
