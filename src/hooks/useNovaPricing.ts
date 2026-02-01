/**
 * Nova Pricing Hook - Single Source of Truth
 * 
 * ALL Nova pricing must come from this hook which reads from app_settings.
 * 
 * ANCHOR PRICES (stored in DB - only source of truth):
 * - EGP: 1 Nova = 10 EGP
 * - SAR: 1 Nova = 0.75 SAR
 * - USD: 1 Nova = 0.20 USD
 * - EUR: 1 Nova = 0.18 EUR
 * 
 * All other currencies are DERIVED from these 4 anchors.
 * Aura = Nova / 2 (always)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Anchor prices structure (stored in app_settings)
export interface AnchorPrices {
  egp: number;
  sar: number;
  usd: number;
  eur: number;
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
  anchor: keyof AnchorPrices;
  conversionRate: number; // Rate to convert from anchor currency
}

// Currency metadata with anchor mappings
// conversionRate: how many units of this currency = 1 unit of anchor currency
const CURRENCY_CONFIG: Record<string, {
  symbol: string;
  symbolAr: string;
  name: string;
  nameAr: string;
  decimals: number;
  anchor: keyof AnchorPrices;
  conversionRate: number;
}> = {
  // === ANCHOR CURRENCIES (rate = 1) ===
  EGP: { symbol: 'EGP', symbolAr: 'ج.م', name: 'Egyptian Pound', nameAr: 'جنيه مصري', decimals: 2, anchor: 'egp', conversionRate: 1 },
  SAR: { symbol: 'SAR', symbolAr: 'ر.س', name: 'Saudi Riyal', nameAr: 'ريال سعودي', decimals: 2, anchor: 'sar', conversionRate: 1 },
  USD: { symbol: 'USD', symbolAr: '$', name: 'US Dollar', nameAr: 'دولار أمريكي', decimals: 2, anchor: 'usd', conversionRate: 1 },
  EUR: { symbol: 'EUR', symbolAr: '€', name: 'Euro', nameAr: 'يورو', decimals: 2, anchor: 'eur', conversionRate: 1 },
  
  // === DERIVED FROM SAR (Gulf countries) ===
  AED: { symbol: 'AED', symbolAr: 'د.إ', name: 'UAE Dirham', nameAr: 'درهم إماراتي', decimals: 2, anchor: 'sar', conversionRate: 0.98 }, // ~1 SAR = 0.98 AED
  KWD: { symbol: 'KWD', symbolAr: 'د.ك', name: 'Kuwaiti Dinar', nameAr: 'دينار كويتي', decimals: 3, anchor: 'sar', conversionRate: 0.082 }, // ~1 SAR = 0.082 KWD
  QAR: { symbol: 'QAR', symbolAr: 'ر.ق', name: 'Qatari Riyal', nameAr: 'ريال قطري', decimals: 2, anchor: 'sar', conversionRate: 0.97 }, // ~1 SAR = 0.97 QAR
  BHD: { symbol: 'BHD', symbolAr: 'د.ب', name: 'Bahraini Dinar', nameAr: 'دينار بحريني', decimals: 3, anchor: 'sar', conversionRate: 0.10 }, // ~1 SAR = 0.10 BHD
  OMR: { symbol: 'OMR', symbolAr: 'ر.ع', name: 'Omani Rial', nameAr: 'ريال عماني', decimals: 3, anchor: 'sar', conversionRate: 0.103 }, // ~1 SAR = 0.103 OMR
  YER: { symbol: 'YER', symbolAr: 'ر.ي', name: 'Yemeni Rial', nameAr: 'ريال يمني', decimals: 0, anchor: 'sar', conversionRate: 66.7 }, // ~1 SAR = 66.7 YER
  
  // === DERIVED FROM USD (Dollar-pegged regions) ===
  JOD: { symbol: 'JOD', symbolAr: 'د.أ', name: 'Jordanian Dinar', nameAr: 'دينار أردني', decimals: 3, anchor: 'usd', conversionRate: 0.709 }, // ~1 USD = 0.709 JOD
  ILS: { symbol: 'ILS', symbolAr: '₪', name: 'Israeli Shekel', nameAr: 'شيكل', decimals: 2, anchor: 'usd', conversionRate: 3.7 }, // ~1 USD = 3.7 ILS
  LBP: { symbol: 'LBP', symbolAr: 'ل.ل', name: 'Lebanese Pound', nameAr: 'ليرة لبنانية', decimals: 0, anchor: 'usd', conversionRate: 89500 }, // ~1 USD = 89500 LBP
  SYP: { symbol: 'SYP', symbolAr: 'ل.س', name: 'Syrian Pound', nameAr: 'ليرة سورية', decimals: 0, anchor: 'usd', conversionRate: 13000 }, // ~1 USD = 13000 SYP
  IQD: { symbol: 'IQD', symbolAr: 'د.ع', name: 'Iraqi Dinar', nameAr: 'دينار عراقي', decimals: 0, anchor: 'usd', conversionRate: 1310 }, // ~1 USD = 1310 IQD
  TRY: { symbol: 'TRY', symbolAr: '₺', name: 'Turkish Lira', nameAr: 'ليرة تركية', decimals: 2, anchor: 'usd', conversionRate: 32.5 }, // ~1 USD = 32.5 TRY
  PKR: { symbol: 'PKR', symbolAr: 'Rs', name: 'Pakistani Rupee', nameAr: 'روبية باكستانية', decimals: 2, anchor: 'usd', conversionRate: 280 }, // ~1 USD = 280 PKR
  SDG: { symbol: 'SDG', symbolAr: 'ج.س', name: 'Sudanese Pound', nameAr: 'جنيه سوداني', decimals: 2, anchor: 'usd', conversionRate: 600 }, // ~1 USD = 600 SDG
  
  // === DERIVED FROM EUR (North Africa) ===
  MAD: { symbol: 'MAD', symbolAr: 'د.م', name: 'Moroccan Dirham', nameAr: 'درهم مغربي', decimals: 2, anchor: 'eur', conversionRate: 10.8 }, // ~1 EUR = 10.8 MAD
  TND: { symbol: 'TND', symbolAr: 'د.ت', name: 'Tunisian Dinar', nameAr: 'دينار تونسي', decimals: 3, anchor: 'eur', conversionRate: 3.4 }, // ~1 EUR = 3.4 TND
  DZD: { symbol: 'DZD', symbolAr: 'د.ج', name: 'Algerian Dinar', nameAr: 'دينار جزائري', decimals: 2, anchor: 'eur', conversionRate: 145 }, // ~1 EUR = 145 DZD
  LYD: { symbol: 'LYD', symbolAr: 'د.ل', name: 'Libyan Dinar', nameAr: 'دينار ليبي', decimals: 3, anchor: 'eur', conversionRate: 5.3 }, // ~1 EUR = 5.3 LYD
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

// Default fallback anchor prices (used while loading from DB)
const DEFAULT_ANCHOR_PRICES: AnchorPrices = {
  egp: 10,
  sar: 0.75,
  usd: 0.20,
  eur: 0.18,
};

function assertAnchorPrices(value: unknown): AnchorPrices {
  if (!value || typeof value !== 'object') {
    throw new Error('Invalid nova_prices: expected an object');
  }

  const record = value as Record<string, unknown>;
  const requiredKeys: (keyof AnchorPrices)[] = ['egp', 'sar', 'usd', 'eur'];
  
  const out: Partial<AnchorPrices> = {};

  for (const key of requiredKeys) {
    const raw = record[key];
    if (typeof raw !== 'number' || !Number.isFinite(raw)) {
      throw new Error(`Invalid nova_prices: missing/invalid anchor key "${key}"`);
    }
    out[key] = raw;
  }

  return out as AnchorPrices;
}

/**
 * Fetch anchor Nova prices from app_settings
 */
async function fetchAnchorPrices(): Promise<AnchorPrices> {
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

  return assertAnchorPrices(data.value);
}

/**
 * Calculate Nova rate for any currency from anchor prices
 */
function calculateNovaRate(currencyCode: string, anchorPrices: AnchorPrices): number {
  const config = CURRENCY_CONFIG[currencyCode];
  if (!config) {
    // Fallback to EGP if unknown currency
    return anchorPrices.egp;
  }
  
  // Get the anchor price (e.g., 1 Nova = 0.75 SAR)
  const anchorNovaPrice = anchorPrices[config.anchor];
  
  // Calculate derived price
  // If 1 Nova = 0.75 SAR and 1 SAR = 0.98 AED, then 1 Nova = 0.75 * 0.98 AED
  return anchorNovaPrice * config.conversionRate;
}

/**
 * Main hook for Nova pricing - use this everywhere!
 */
export function useNovaPricing() {
  const { data: anchorPrices, isLoading, error } = useQuery({
    queryKey: ['nova_prices'],
    queryFn: fetchAnchorPrices,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    gcTime: 30 * 60 * 1000, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false,
  });

  // Use fetched prices or fall back to defaults while loading
  const effectiveAnchorPrices = anchorPrices ?? DEFAULT_ANCHOR_PRICES;

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
    return calculateNovaRate(currencyCode, effectiveAnchorPrices);
  };

  /**
   * Get full currency info from country name
   */
  const getCurrencyInfo = (country: string): CurrencyInfo => {
    const currencyCode = getCurrencyCode(country);
    const config = CURRENCY_CONFIG[currencyCode] || CURRENCY_CONFIG.EGP;
    const novaRate = getNovaRate(currencyCode);
    
    return {
      code: currencyCode,
      symbol: config.symbol,
      symbolAr: config.symbolAr,
      name: config.name,
      nameAr: config.nameAr,
      novaRate,
      auraRate: novaRate / 2,
      decimals: config.decimals,
      anchor: config.anchor,
      conversionRate: config.conversionRate,
    };
  };

  /**
   * Convert Nova to local currency
   */
  const novaToLocal = (novaAmount: number, country: string): number => {
    const info = getCurrencyInfo(country);
    return novaAmount * info.novaRate;
  };

  /**
   * Convert local currency to Nova
   */
  const localToNova = (localAmount: number, country: string): number => {
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
    const info = getCurrencyInfo(country);
    const rateFormatter = new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
    return `И 1 = ${rateFormatter.format(info.novaRate)} ${isRTL ? info.symbolAr : info.symbol}`;
  };

  /**
   * Get anchor prices (for admin dashboard)
   */
  const getAnchorPrices = (): AnchorPrices => {
    return effectiveAnchorPrices;
  };

  return {
    anchorPrices: effectiveAnchorPrices,
    isLoading,
    error,
    getCurrencyCode,
    getNovaRate,
    getCurrencyInfo,
    novaToLocal,
    localToNova,
    formatWithLocal,
    getExchangeRateDisplay,
    getAnchorPrices,
    // Expose metadata for components that need it
    CURRENCY_CONFIG,
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
    anchor: info.anchor,
  };
}
