/**
 * Nova Pricing Hook - Single Source of Truth
 * 
 * ALL Nova pricing must come from this hook which reads from app_settings.
 * No hardcoded rates and NO fallback rates anywhere else in the codebase.
 * 
 * Base rates from app_settings:
 * 1 Nova = 10 EGP (base)
 * 1 Nova = 0.20 USD
 * 1 Nova = 0.18 EUR
 * 1 Nova = 0.75 SAR
 * 
 * Aura = Nova / 2 (always)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface NovaPrices {
  egp: number;
  usd: number;
  eur: number;
  sar: number;
  aed: number;
  kwd: number;
  qar: number;
  bhd: number;
  omr: number;
  jod: number;
  ils: number;
  lbp: number;
  syp: number;
  yer: number;
  mad: number;
  tnd: number;
  dzd: number;
  lyd: number;
  sdg: number;
  try: number;
  iqd: number;
  pkr: number;
}

export interface CurrencyInfo {
  code: string;
  symbol: string;
  symbolAr: string;
  name: string;
  nameAr: string;
  novaRate: number;
  auraRate: number;
  decimals: number;
}

// Currency metadata (symbols, names) - rates come from DB
const CURRENCY_META: Record<string, Omit<CurrencyInfo, 'novaRate' | 'auraRate'>> = {
  EGP: { code: 'EGP', symbol: 'EGP', symbolAr: 'ج.م', name: 'Egyptian Pound', nameAr: 'جنيه مصري', decimals: 2 },
  USD: { code: 'USD', symbol: 'USD', symbolAr: '$', name: 'US Dollar', nameAr: 'دولار أمريكي', decimals: 2 },
  EUR: { code: 'EUR', symbol: 'EUR', symbolAr: '€', name: 'Euro', nameAr: 'يورو', decimals: 2 },
  SAR: { code: 'SAR', symbol: 'SAR', symbolAr: 'ر.س', name: 'Saudi Riyal', nameAr: 'ريال سعودي', decimals: 2 },
  AED: { code: 'AED', symbol: 'AED', symbolAr: 'د.إ', name: 'UAE Dirham', nameAr: 'درهم إماراتي', decimals: 2 },
  KWD: { code: 'KWD', symbol: 'KWD', symbolAr: 'د.ك', name: 'Kuwaiti Dinar', nameAr: 'دينار كويتي', decimals: 3 },
  QAR: { code: 'QAR', symbol: 'QAR', symbolAr: 'ر.ق', name: 'Qatari Riyal', nameAr: 'ريال قطري', decimals: 2 },
  BHD: { code: 'BHD', symbol: 'BHD', symbolAr: 'د.ب', name: 'Bahraini Dinar', nameAr: 'دينار بحريني', decimals: 3 },
  OMR: { code: 'OMR', symbol: 'OMR', symbolAr: 'ر.ع', name: 'Omani Rial', nameAr: 'ريال عماني', decimals: 3 },
  JOD: { code: 'JOD', symbol: 'JOD', symbolAr: 'د.أ', name: 'Jordanian Dinar', nameAr: 'دينار أردني', decimals: 3 },
  ILS: { code: 'ILS', symbol: 'ILS', symbolAr: '₪', name: 'Israeli Shekel', nameAr: 'شيكل', decimals: 2 },
  LBP: { code: 'LBP', symbol: 'LBP', symbolAr: 'ل.ل', name: 'Lebanese Pound', nameAr: 'ليرة لبنانية', decimals: 0 },
  SYP: { code: 'SYP', symbol: 'SYP', symbolAr: 'ل.س', name: 'Syrian Pound', nameAr: 'ليرة سورية', decimals: 0 },
  YER: { code: 'YER', symbol: 'YER', symbolAr: 'ر.ي', name: 'Yemeni Rial', nameAr: 'ريال يمني', decimals: 0 },
  MAD: { code: 'MAD', symbol: 'MAD', symbolAr: 'د.م', name: 'Moroccan Dirham', nameAr: 'درهم مغربي', decimals: 2 },
  TND: { code: 'TND', symbol: 'TND', symbolAr: 'د.ت', name: 'Tunisian Dinar', nameAr: 'دينار تونسي', decimals: 3 },
  DZD: { code: 'DZD', symbol: 'DZD', symbolAr: 'د.ج', name: 'Algerian Dinar', nameAr: 'دينار جزائري', decimals: 2 },
  LYD: { code: 'LYD', symbol: 'LYD', symbolAr: 'د.ل', name: 'Libyan Dinar', nameAr: 'دينار ليبي', decimals: 3 },
  SDG: { code: 'SDG', symbol: 'SDG', symbolAr: 'ج.س', name: 'Sudanese Pound', nameAr: 'جنيه سوداني', decimals: 2 },
  TRY: { code: 'TRY', symbol: 'TRY', symbolAr: '₺', name: 'Turkish Lira', nameAr: 'ليرة تركية', decimals: 2 },
  IQD: { code: 'IQD', symbol: 'IQD', symbolAr: 'د.ع', name: 'Iraqi Dinar', nameAr: 'دينار عراقي', decimals: 0 },
  PKR: { code: 'PKR', symbol: 'PKR', symbolAr: 'Rs', name: 'Pakistani Rupee', nameAr: 'روبية باكستانية', decimals: 2 },
};

// Country to currency code mapping
const COUNTRY_TO_CURRENCY: Record<string, string> = {
  'Saudi Arabia': 'SAR',
  'السعودية': 'SAR',
  'UAE': 'AED',
  'الإمارات': 'AED',
  'Qatar': 'QAR',
  'قطر': 'QAR',
  'Kuwait': 'KWD',
  'الكويت': 'KWD',
  'Bahrain': 'BHD',
  'البحرين': 'BHD',
  'Oman': 'OMR',
  'عُمان': 'OMR',
  'Egypt': 'EGP',
  'مصر': 'EGP',
  'Jordan': 'JOD',
  'الأردن': 'JOD',
  'Palestine': 'ILS',
  'فلسطين': 'ILS',
  'Lebanon': 'LBP',
  'لبنان': 'LBP',
  'Syria': 'SYP',
  'سوريا': 'SYP',
  'Yemen': 'YER',
  'اليمن': 'YER',
  'Morocco': 'MAD',
  'المغرب': 'MAD',
  'Tunisia': 'TND',
  'تونس': 'TND',
  'Algeria': 'DZD',
  'الجزائر': 'DZD',
  'Libya': 'LYD',
  'ليبيا': 'LYD',
  'Sudan': 'SDG',
  'السودان': 'SDG',
  'Turkey': 'TRY',
  'تركيا': 'TRY',
  'Iraq': 'IQD',
  'العراق': 'IQD',
  'Pakistan': 'PKR',
  'باكستان': 'PKR',
};

const NOVA_PRICE_KEYS: Array<keyof NovaPrices> = [
  'egp',
  'usd',
  'eur',
  'sar',
  'aed',
  'kwd',
  'qar',
  'bhd',
  'omr',
  'jod',
  'ils',
  'lbp',
  'syp',
  'yer',
  'mad',
  'tnd',
  'dzd',
  'lyd',
  'sdg',
  'try',
  'iqd',
  'pkr',
];

function assertNovaPrices(value: unknown): NovaPrices {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid nova_prices: expected an object');
  }

  const record = value as Record<string, unknown>;
  const out: Partial<NovaPrices> = {};

  for (const key of NOVA_PRICE_KEYS) {
    const raw = record[key];
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      throw new Error(`Invalid nova_prices: missing/invalid key "${key}"`);
    }
    out[key] = raw;
  }

  return out as NovaPrices;
}

/**
 * Fetch Nova prices from app_settings
 */
async function fetchNovaPrices(): Promise<NovaPrices> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'nova_prices')
    .single();

  if (error) {
    throw new Error(`Failed to fetch nova_prices: ${error.message}`);
  }

  if (!data) {
    throw new Error('Failed to fetch nova_prices: no data returned');
  }

  return assertNovaPrices(data.value);
}

/**
 * Main hook for Nova pricing - use this everywhere!
 */
export function useNovaPricing() {
  const { data: prices, isLoading, error } = useQuery({
    queryKey: ['nova_prices'],
    queryFn: fetchNovaPrices,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false,
  });

  const requirePrices = (): NovaPrices => {
    if (!prices) throw new Error('Nova prices are not loaded yet');
    return prices;
  };

  /**
   * Get currency code from country name
   */
  const getCurrencyCode = (country: string): string => {
    return COUNTRY_TO_CURRENCY[country] || 'EGP';
  };

  /**
   * Get Nova rate for a currency code
   */
  const getNovaRate = (currencyCode: string): number => {
    const p = requirePrices();
    const key = currencyCode.toLowerCase() as keyof NovaPrices;
    const value = p[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(`Missing nova rate for currency: ${currencyCode}`);
    }
    return value;
  };

  /**
   * Get full currency info from country name
   */
  const getCurrencyInfo = (country: string): CurrencyInfo => {
    requirePrices();
    const currencyCode = getCurrencyCode(country);
    const meta = CURRENCY_META[currencyCode] || CURRENCY_META.EGP;
    const novaRate = getNovaRate(currencyCode);
    
    return {
      ...meta,
      novaRate,
      auraRate: novaRate / 2,
    };
  };

  /**
   * Convert Nova to local currency
   */
  const novaToLocal = (novaAmount: number, country: string): number => {
    requirePrices();
    const info = getCurrencyInfo(country);
    return novaAmount * info.novaRate;
  };

  /**
   * Convert local currency to Nova
   */
  const localToNova = (localAmount: number, country: string): number => {
    requirePrices();
    const info = getCurrencyInfo(country);
    return localAmount / info.novaRate;
  };

  /**
   * Format Nova amount with local currency equivalent
   */
  const formatWithLocal = (
    novaAmount: number,
    country: string,
    isRTL: boolean = false
  ): { nova: string; local: string; rate: string } => {
    requirePrices();
    const info = getCurrencyInfo(country);
    const localAmount = novaAmount * info.novaRate;

    const formatter = new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
      minimumFractionDigits: info.decimals,
      maximumFractionDigits: info.decimals,
    });

    const novaFormatter = new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const rateFormatter = new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });

    return {
      nova: `${novaFormatter.format(novaAmount)} И`,
      local: `${formatter.format(localAmount)} ${isRTL ? info.symbolAr : info.symbol}`,
      rate: `И 1 = ${rateFormatter.format(info.novaRate)} ${isRTL ? info.symbolAr : info.symbol}`,
    };
  };

  /**
   * Get exchange rate display string
   */
  const getExchangeRateDisplay = (country: string, isRTL: boolean = false): string => {
    requirePrices();
    const info = getCurrencyInfo(country);
    const rateFormatter = new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
    return `И 1 = ${rateFormatter.format(info.novaRate)} ${isRTL ? info.symbolAr : info.symbol}`;
  };

  /**
   * Get all prices (for admin dashboard)
   */
  const getAllPrices = (): NovaPrices => {
    return requirePrices();
  };

  return {
    prices: (prices ?? ({} as NovaPrices)),
    isLoading,
    error,
    getCurrencyCode,
    getNovaRate,
    getCurrencyInfo,
    novaToLocal,
    localToNova,
    formatWithLocal,
    getExchangeRateDisplay,
    getAllPrices,
    // Expose metadata for components that need it
    CURRENCY_META,
    COUNTRY_TO_CURRENCY,
  };
}

/**
 * Get wallet pricing for a country (for WalletCountrySelector)
 * This is a utility that uses the hook internally
 */
export function useWalletPricing(walletCountry: string) {
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
