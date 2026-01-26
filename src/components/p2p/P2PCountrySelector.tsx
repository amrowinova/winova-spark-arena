import { useState } from 'react';
import { ChevronDown, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
    code: 'SA',
    name: 'Saudi Arabia',
    nameAr: 'السعودية',
    flag: '🇸🇦',
    currency: 'SAR',
    currencySymbol: 'ر.س',
    novaRate: 3.75,
    paymentMethods: [
      { id: 'rajhi', name: 'Al Rajhi Bank', nameAr: 'بنك الراجحي', icon: '🏦' },
      { id: 'ncb', name: 'NCB', nameAr: 'البنك الأهلي', icon: '🏦' },
      { id: 'stcpay', name: 'STC Pay', nameAr: 'STC Pay', icon: '📱' },
    ],
  },
  {
    code: 'EG',
    name: 'Egypt',
    nameAr: 'مصر',
    flag: '🇪🇬',
    currency: 'EGP',
    currencySymbol: 'ج.م',
    novaRate: 31.50,
    paymentMethods: [
      { id: 'cib', name: 'CIB', nameAr: 'البنك التجاري الدولي', icon: '🏦' },
      { id: 'vodafone', name: 'Vodafone Cash', nameAr: 'فودافون كاش', icon: '📱' },
      { id: 'instapay', name: 'InstaPay', nameAr: 'إنستاباي', icon: '💳' },
    ],
  },
  {
    code: 'AE',
    name: 'UAE',
    nameAr: 'الإمارات',
    flag: '🇦🇪',
    currency: 'AED',
    currencySymbol: 'د.إ',
    novaRate: 3.67,
    paymentMethods: [
      { id: 'adcb', name: 'ADCB', nameAr: 'أبوظبي التجاري', icon: '🏦' },
      { id: 'enbd', name: 'Emirates NBD', nameAr: 'الإمارات دبي الوطني', icon: '🏦' },
    ],
  },
  {
    code: 'JO',
    name: 'Jordan',
    nameAr: 'الأردن',
    flag: '🇯🇴',
    currency: 'JOD',
    currencySymbol: 'د.أ',
    novaRate: 0.71,
    paymentMethods: [
      { id: 'abc', name: 'Arab Bank', nameAr: 'البنك العربي', icon: '🏦' },
      { id: 'cliq', name: 'CliQ', nameAr: 'كليك', icon: '💳' },
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
      <DropdownMenuContent align="start" className="w-56">
        {COUNTRIES.map((country) => (
          <DropdownMenuItem
            key={country.code}
            onClick={() => {
              onCountryChange(country);
              setOpen(false);
            }}
            className={cn(
              "gap-3 py-3 cursor-pointer",
              selectedCountry.code === country.code && "bg-primary/10"
            )}
          >
            <span className="text-2xl">{country.flag}</span>
            <div className="flex-1">
              <p className="font-medium">
                {language === 'ar' ? country.nameAr : country.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {country.currencySymbol} {country.currency} • 1 ✦ = {country.novaRate}
              </p>
            </div>
            {selectedCountry.code === country.code && (
              <div className="h-2 w-2 rounded-full bg-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function getDefaultCountry(): CountryConfig {
  return COUNTRIES[0]; // Saudi Arabia as default
}
