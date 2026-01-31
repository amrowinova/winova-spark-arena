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
import { cn } from '@/lib/utils';

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

export interface PaymentMethod {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
}

export const COUNTRIES: CountryConfig[] = [
  {
    code: 'SA', name: 'Saudi Arabia', nameAr: 'السعودية', flag: '🇸🇦',
    currency: 'SAR', currencySymbol: 'ر.س', novaRate: 3.75,
    paymentMethods: [
      { id: 'rajhi', name: 'Al Rajhi Bank', nameAr: 'بنك الراجحي', icon: '🏦' },
      { id: 'ncb', name: 'NCB', nameAr: 'البنك الأهلي', icon: '🏦' },
      { id: 'stcpay', name: 'STC Pay', nameAr: 'STC Pay', icon: '📱' },
    ],
  },
  {
    code: 'AE', name: 'UAE', nameAr: 'الإمارات', flag: '🇦🇪',
    currency: 'AED', currencySymbol: 'د.إ', novaRate: 3.67,
    paymentMethods: [
      { id: 'adcb', name: 'ADCB', nameAr: 'أبوظبي التجاري', icon: '🏦' },
      { id: 'enbd', name: 'Emirates NBD', nameAr: 'الإمارات دبي الوطني', icon: '🏦' },
    ],
  },
  {
    code: 'KW', name: 'Kuwait', nameAr: 'الكويت', flag: '🇰🇼',
    currency: 'KWD', currencySymbol: 'د.ك', novaRate: 0.31,
    paymentMethods: [
      { id: 'nbk', name: 'NBK', nameAr: 'بنك الكويت الوطني', icon: '🏦' },
      { id: 'knet', name: 'KNET', nameAr: 'كي نت', icon: '💳' },
    ],
  },
  {
    code: 'QA', name: 'Qatar', nameAr: 'قطر', flag: '🇶🇦',
    currency: 'QAR', currencySymbol: 'ر.ق', novaRate: 3.64,
    paymentMethods: [
      { id: 'qnb', name: 'QNB', nameAr: 'بنك قطر الوطني', icon: '🏦' },
    ],
  },
  {
    code: 'BH', name: 'Bahrain', nameAr: 'البحرين', flag: '🇧🇭',
    currency: 'BHD', currencySymbol: 'د.ب', novaRate: 0.38,
    paymentMethods: [
      { id: 'benefit', name: 'BenefitPay', nameAr: 'بنفت باي', icon: '📱' },
    ],
  },
  {
    code: 'OM', name: 'Oman', nameAr: 'عُمان', flag: '🇴🇲',
    currency: 'OMR', currencySymbol: 'ر.ع', novaRate: 0.38,
    paymentMethods: [
      { id: 'bankmuscat', name: 'Bank Muscat', nameAr: 'بنك مسقط', icon: '🏦' },
    ],
  },
  {
    code: 'EG', name: 'Egypt', nameAr: 'مصر', flag: '🇪🇬',
    currency: 'EGP', currencySymbol: 'ج.م', novaRate: 30.90,
    paymentMethods: [
      { id: 'cib', name: 'CIB', nameAr: 'البنك التجاري الدولي', icon: '🏦' },
      { id: 'vodafone', name: 'Vodafone Cash', nameAr: 'فودافون كاش', icon: '📱' },
      { id: 'instapay', name: 'InstaPay', nameAr: 'إنستاباي', icon: '💳' },
    ],
  },
  {
    code: 'JO', name: 'Jordan', nameAr: 'الأردن', flag: '🇯🇴',
    currency: 'JOD', currencySymbol: 'د.أ', novaRate: 0.71,
    paymentMethods: [
      { id: 'abc', name: 'Arab Bank', nameAr: 'البنك العربي', icon: '🏦' },
      { id: 'cliq', name: 'CliQ', nameAr: 'كليك', icon: '💳' },
    ],
  },
  {
    code: 'PS', name: 'Palestine', nameAr: 'فلسطين', flag: '🇵🇸',
    currency: 'ILS', currencySymbol: '₪', novaRate: 3.65,
    paymentMethods: [
      { id: 'bop', name: 'Bank of Palestine', nameAr: 'بنك فلسطين', icon: '🏦' },
      { id: 'jawwal', name: 'Jawwal Pay', nameAr: 'جوال باي', icon: '📱' },
    ],
  },
  {
    code: 'LB', name: 'Lebanon', nameAr: 'لبنان', flag: '🇱🇧',
    currency: 'LBP', currencySymbol: 'ل.ل', novaRate: 89500,
    paymentMethods: [
      { id: 'whish', name: 'Whish Money', nameAr: 'ويش موني', icon: '📱' },
    ],
  },
  {
    code: 'SY', name: 'Syria', nameAr: 'سوريا', flag: '🇸🇾',
    currency: 'SYP', currencySymbol: 'ل.س', novaRate: 13000,
    paymentMethods: [
      { id: 'syriatel', name: 'Syriatel Cash', nameAr: 'سيرياتيل كاش', icon: '📱' },
    ],
  },
  {
    code: 'YE', name: 'Yemen', nameAr: 'اليمن', flag: '🇾🇪',
    currency: 'YER', currencySymbol: 'ر.ي', novaRate: 250,
    paymentMethods: [
      { id: 'floosak', name: 'Floosak', nameAr: 'فلوسك', icon: '📱' },
    ],
  },
  {
    code: 'MA', name: 'Morocco', nameAr: 'المغرب', flag: '🇲🇦',
    currency: 'MAD', currencySymbol: 'د.م', novaRate: 10.05,
    paymentMethods: [
      { id: 'cih', name: 'CIH Bank', nameAr: 'بنك CIH', icon: '🏦' },
      { id: 'cashplus', name: 'Cash Plus', nameAr: 'كاش بلس', icon: '📱' },
    ],
  },
  {
    code: 'TN', name: 'Tunisia', nameAr: 'تونس', flag: '🇹🇳',
    currency: 'TND', currencySymbol: 'د.ت', novaRate: 3.12,
    paymentMethods: [
      { id: 'biat', name: 'BIAT', nameAr: 'البنك العربي الدولي', icon: '🏦' },
    ],
  },
  {
    code: 'DZ', name: 'Algeria', nameAr: 'الجزائر', flag: '🇩🇿',
    currency: 'DZD', currencySymbol: 'د.ج', novaRate: 134.50,
    paymentMethods: [
      { id: 'ccp', name: 'CCP', nameAr: 'بريد الجزائر', icon: '🏦' },
      { id: 'baridimob', name: 'BaridiMob', nameAr: 'بريدي موب', icon: '📱' },
    ],
  },
  {
    code: 'LY', name: 'Libya', nameAr: 'ليبيا', flag: '🇱🇾',
    currency: 'LYD', currencySymbol: 'د.ل', novaRate: 4.85,
    paymentMethods: [
      { id: 'sadad', name: 'Sadad', nameAr: 'سداد', icon: '📱' },
    ],
  },
  {
    code: 'SD', name: 'Sudan', nameAr: 'السودان', flag: '🇸🇩',
    currency: 'SDG', currencySymbol: 'ج.س', novaRate: 601,
    paymentMethods: [
      { id: 'bankak', name: 'Bankak', nameAr: 'بنكك', icon: '📱' },
    ],
  },
  {
    code: 'TR', name: 'Turkey', nameAr: 'تركيا', flag: '🇹🇷',
    currency: 'TRY', currencySymbol: '₺', novaRate: 32.15,
    paymentMethods: [
      { id: 'papara', name: 'Papara', nameAr: 'بابارا', icon: '📱' },
      { id: 'ziraat', name: 'Ziraat Bank', nameAr: 'زراعات بنك', icon: '🏦' },
    ],
  },
  {
    code: 'IQ', name: 'Iraq', nameAr: 'العراق', flag: '🇮🇶',
    currency: 'IQD', currencySymbol: 'د.ع', novaRate: 1310,
    paymentMethods: [
      { id: 'zain', name: 'Zain Cash', nameAr: 'زين كاش', icon: '📱' },
      { id: 'fastpay', name: 'FastPay', nameAr: 'فاست باي', icon: '📱' },
    ],
  },
];

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
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className={cn("gap-2 h-12 px-4", className)}
        >
          <span className="text-2xl">{selectedCountry.flag}</span>
          <div className="text-start">
            <p className="text-sm font-medium">
              {language === 'ar' ? selectedCountry.nameAr : selectedCountry.name}
            </p>
            <p className="text-xs text-muted-foreground">
              {selectedCountry.currencySymbol} {selectedCountry.currency}
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
            {COUNTRIES.map((country) => (
              <DropdownMenuItem
                key={country.code}
                onClick={() => {
                  onCountryChange(country);
                  setOpen(false);
                }}
                className={cn(
                  "gap-3 py-2.5 px-3 cursor-pointer rounded-md",
                  selectedCountry.code === country.code && "bg-primary/10"
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
                {selectedCountry.code === country.code && (
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

export function getDefaultCountry(): CountryConfig {
  return COUNTRIES[0]; // Saudi Arabia as default
}
