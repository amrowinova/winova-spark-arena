/**
 * Wallet Country Selector
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
import { useUser } from '@/contexts/UserContext';
import { useNovaPricing } from '@/hooks/useNovaPricing';
import { cn } from '@/lib/utils';

// Country metadata only - NO RATES here (rates come from useNovaPricing)
interface WalletCountryMeta {
  name: string;
  nameAr: string;
  flag: string;
  currencyCode: string;
}

// All 19 supported countries - metadata only
const WALLET_COUNTRIES: WalletCountryMeta[] = [
  { name: 'Saudi Arabia', nameAr: 'السعودية', flag: '🇸🇦', currencyCode: 'SAR' },
  { name: 'UAE', nameAr: 'الإمارات', flag: '🇦🇪', currencyCode: 'AED' },
  { name: 'Kuwait', nameAr: 'الكويت', flag: '🇰🇼', currencyCode: 'KWD' },
  { name: 'Qatar', nameAr: 'قطر', flag: '🇶🇦', currencyCode: 'QAR' },
  { name: 'Bahrain', nameAr: 'البحرين', flag: '🇧🇭', currencyCode: 'BHD' },
  { name: 'Oman', nameAr: 'عُمان', flag: '🇴🇲', currencyCode: 'OMR' },
  { name: 'Egypt', nameAr: 'مصر', flag: '🇪🇬', currencyCode: 'EGP' },
  { name: 'Jordan', nameAr: 'الأردن', flag: '🇯🇴', currencyCode: 'JOD' },
  { name: 'Palestine', nameAr: 'فلسطين', flag: '🇵🇸', currencyCode: 'ILS' },
  { name: 'Lebanon', nameAr: 'لبنان', flag: '🇱🇧', currencyCode: 'LBP' },
  { name: 'Syria', nameAr: 'سوريا', flag: '🇸🇾', currencyCode: 'SYP' },
  { name: 'Yemen', nameAr: 'اليمن', flag: '🇾🇪', currencyCode: 'YER' },
  { name: 'Morocco', nameAr: 'المغرب', flag: '🇲🇦', currencyCode: 'MAD' },
  { name: 'Tunisia', nameAr: 'تونس', flag: '🇹🇳', currencyCode: 'TND' },
  { name: 'Algeria', nameAr: 'الجزائر', flag: '🇩🇿', currencyCode: 'DZD' },
  { name: 'Libya', nameAr: 'ليبيا', flag: '🇱🇾', currencyCode: 'LYD' },
  { name: 'Sudan', nameAr: 'السودان', flag: '🇸🇩', currencyCode: 'SDG' },
  { name: 'Turkey', nameAr: 'تركيا', flag: '🇹🇷', currencyCode: 'TRY' },
  { name: 'Iraq', nameAr: 'العراق', flag: '🇮🇶', currencyCode: 'IQD' },
];

export function WalletCountrySelector() {
  const { language } = useLanguage();
  const { user, updateUser } = useUser();
  const { getCurrencyInfo } = useNovaPricing();
  const [open, setOpen] = useState(false);

  const selectedCountryMeta = WALLET_COUNTRIES.find(c => c.name === user.walletCountry) || WALLET_COUNTRIES[0];
  const selectedCurrencyInfo = getCurrencyInfo(user.walletCountry);

  const handleCountryChange = (country: WalletCountryMeta) => {
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
          <span className="text-lg">{selectedCountryMeta.flag}</span>
          <span className="text-xs font-medium">{selectedCurrencyInfo.code}</span>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-0 bg-popover z-50">
        <div className="px-3 py-2 text-xs text-muted-foreground border-b bg-muted/30 sticky top-0">
          {language === 'ar' ? 'عملة العرض' : 'Display Currency'}
        </div>
        <ScrollArea className="h-[min(70vh,400px)]">
          <div className="p-1">
            {WALLET_COUNTRIES.map((country) => {
              const currencyInfo = getCurrencyInfo(country.name);
              return (
                <DropdownMenuItem
                  key={country.name}
                  onClick={() => handleCountryChange(country)}
                  className={cn(
                    "gap-3 py-2.5 px-3 cursor-pointer rounded-md",
                    selectedCountryMeta.name === country.name && "bg-primary/10"
                  )}
                >
                  <span className="text-xl">{country.flag}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {language === 'ar' ? country.nameAr : country.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {language === 'ar' ? currencyInfo.symbolAr : currencyInfo.symbol} • И 1 = {currencyInfo.novaRate.toLocaleString()}
                    </p>
                  </div>
                  {selectedCountryMeta.name === country.name && (
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  )}
                </DropdownMenuItem>
              );
            })}
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Get wallet pricing from useNovaPricing
 * This is a hook-based function that uses the single source of truth
 */
export function useWalletCountryPricing(walletCountry: string) {
  const { getCurrencyInfo } = useNovaPricing();
  const info = getCurrencyInfo(walletCountry);
  
  return {
    currency: info.code,
    symbol: info.symbol,
    symbolAr: info.symbolAr,
    novaRate: info.novaRate,
    auraRate: info.auraRate,
    decimals: info.decimals,
  };
}
