import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { countryPricing } from '@/contexts/TransactionContext';
import { cn } from '@/lib/utils';

interface WalletCountry {
  name: string;
  nameAr: string;
  flag: string;
  currency: string;
  symbol: string;
  novaRate: number;
}

// Wallet-specific countries derived from countryPricing
const WALLET_COUNTRIES: WalletCountry[] = [
  { name: 'Saudi Arabia', nameAr: 'السعودية', flag: '🇸🇦', currency: 'SAR', symbol: 'ر.س', novaRate: 3.75 },
  { name: 'Egypt', nameAr: 'مصر', flag: '🇪🇬', currency: 'EGP', symbol: 'ج.م', novaRate: 30.90 },
  { name: 'Palestine', nameAr: 'فلسطين', flag: '🇵🇸', currency: 'ILS', symbol: '₪', novaRate: 3.65 },
  { name: 'Syria', nameAr: 'سوريا', flag: '🇸🇾', currency: 'SYP', symbol: 'ل.س', novaRate: 13000 },
  { name: 'UAE', nameAr: 'الإمارات', flag: '🇦🇪', currency: 'AED', symbol: 'د.إ', novaRate: 3.67 },
  { name: 'Jordan', nameAr: 'الأردن', flag: '🇯🇴', currency: 'JOD', symbol: 'د.أ', novaRate: 0.71 },
  { name: 'Kuwait', nameAr: 'الكويت', flag: '🇰🇼', currency: 'KWD', symbol: 'د.ك', novaRate: 0.31 },
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
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5 text-xs text-muted-foreground border-b mb-1">
          {language === 'ar' ? 'عملة العرض' : 'Display Currency'}
        </div>
        {WALLET_COUNTRIES.map((country) => (
          <DropdownMenuItem
            key={country.name}
            onClick={() => handleCountryChange(country)}
            className={cn(
              "gap-3 py-2.5 cursor-pointer",
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
