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
import { useUser } from '@/contexts/UserContext';
import { cn } from '@/lib/utils';

interface WalletCountry {
  name: string;
  nameAr: string;
  flag: string;
  currency: string;
  symbol: string;
  novaRate: number;
}

// All 19 supported countries
const WALLET_COUNTRIES: WalletCountry[] = [
  { name: 'Saudi Arabia', nameAr: 'السعودية', flag: '🇸🇦', currency: 'SAR', symbol: 'ر.س', novaRate: 3.75 },
  { name: 'UAE', nameAr: 'الإمارات', flag: '🇦🇪', currency: 'AED', symbol: 'د.إ', novaRate: 3.67 },
  { name: 'Kuwait', nameAr: 'الكويت', flag: '🇰🇼', currency: 'KWD', symbol: 'د.ك', novaRate: 0.31 },
  { name: 'Qatar', nameAr: 'قطر', flag: '🇶🇦', currency: 'QAR', symbol: 'ر.ق', novaRate: 3.64 },
  { name: 'Bahrain', nameAr: 'البحرين', flag: '🇧🇭', currency: 'BHD', symbol: 'د.ب', novaRate: 0.38 },
  { name: 'Oman', nameAr: 'عُمان', flag: '🇴🇲', currency: 'OMR', symbol: 'ر.ع', novaRate: 0.38 },
  { name: 'Egypt', nameAr: 'مصر', flag: '🇪🇬', currency: 'EGP', symbol: 'ج.م', novaRate: 30.90 },
  { name: 'Jordan', nameAr: 'الأردن', flag: '🇯🇴', currency: 'JOD', symbol: 'د.أ', novaRate: 0.71 },
  { name: 'Palestine', nameAr: 'فلسطين', flag: '🇵🇸', currency: 'ILS', symbol: '₪', novaRate: 3.65 },
  { name: 'Lebanon', nameAr: 'لبنان', flag: '🇱🇧', currency: 'LBP', symbol: 'ل.ل', novaRate: 89500 },
  { name: 'Syria', nameAr: 'سوريا', flag: '🇸🇾', currency: 'SYP', symbol: 'ل.س', novaRate: 13000 },
  { name: 'Yemen', nameAr: 'اليمن', flag: '🇾🇪', currency: 'YER', symbol: 'ر.ي', novaRate: 250 },
  { name: 'Morocco', nameAr: 'المغرب', flag: '🇲🇦', currency: 'MAD', symbol: 'د.م', novaRate: 10.05 },
  { name: 'Tunisia', nameAr: 'تونس', flag: '🇹🇳', currency: 'TND', symbol: 'د.ت', novaRate: 3.12 },
  { name: 'Algeria', nameAr: 'الجزائر', flag: '🇩🇿', currency: 'DZD', symbol: 'د.ج', novaRate: 134.50 },
  { name: 'Libya', nameAr: 'ليبيا', flag: '🇱🇾', currency: 'LYD', symbol: 'د.ل', novaRate: 4.85 },
  { name: 'Sudan', nameAr: 'السودان', flag: '🇸🇩', currency: 'SDG', symbol: 'ج.س', novaRate: 601 },
  { name: 'Turkey', nameAr: 'تركيا', flag: '🇹🇷', currency: 'TRY', symbol: '₺', novaRate: 32.15 },
  { name: 'Iraq', nameAr: 'العراق', flag: '🇮🇶', currency: 'IQD', symbol: 'د.ع', novaRate: 1310 },
];

export function WalletCountrySelector() {
  const { language } = useLanguage();
  const { user, updateUser } = useUser();
  const [open, setOpen] = useState(false);

  const selectedCountry = WALLET_COUNTRIES.find(c => c.name === user.walletCountry) || WALLET_COUNTRIES[0];

  const handleCountryChange = (country: WalletCountry) => {
    updateUser({ walletCountry: country.name });
    setOpen(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="gap-1.5 h-8 px-2 text-muted-foreground hover:text-foreground"
        >
          <span className="text-lg">{selectedCountry.flag}</span>
          <span className="text-xs font-medium">{selectedCountry.currency}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-0 bg-popover z-50">
        <div className="px-3 py-2 text-xs text-muted-foreground border-b bg-muted/30 sticky top-0">
          {language === 'ar' ? 'عملة العرض' : 'Display Currency'}
        </div>
        <ScrollArea className="h-[min(70vh,400px)]">
          <div className="p-1">
            {WALLET_COUNTRIES.map((country) => (
              <DropdownMenuItem
                key={country.name}
                onClick={() => handleCountryChange(country)}
                className={cn(
                  "gap-3 py-2.5 px-3 cursor-pointer rounded-md",
                  selectedCountry.name === country.name && "bg-primary/10"
                )}
              >
                <span className="text-xl">{country.flag}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {language === 'ar' ? country.nameAr : country.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {country.symbol} • И 1 = {country.novaRate.toLocaleString()}
                  </p>
                </div>
                {selectedCountry.name === country.name && (
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

export function getWalletCountryPricing(walletCountry: string) {
  const country = WALLET_COUNTRIES.find(c => c.name === walletCountry);
  if (!country) {
    return { currency: 'SAR', symbol: 'ر.س', novaRate: 3.75, auraRate: 1.875 };
  }
  return {
    currency: country.currency,
    symbol: country.symbol,
    novaRate: country.novaRate,
    auraRate: country.novaRate / 2,
  };
}
