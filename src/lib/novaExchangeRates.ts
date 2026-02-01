/**
 * Nova Exchange Rates System
 * 
 * FIXED ADMINISTRATIVE RATES (not live exchange rates)
 * Nova is an internal fixed currency.
 * 
 * Base rates:
 * 1 Nova = 10 EGP
 * 1 Nova = 0.20 USD
 * 1 Nova = 0.18 EUR
 * 1 Nova = 0.75 SAR
 * 
 * All rates are fixed and can ONLY be modified by Admin.
 * Nova can ONLY be added/deducted by Admins through the Admin Dashboard.
 */

export interface CurrencyConfig {
  code: string;
  symbol: string;
  symbolAr: string;
  name: string;
  nameAr: string;
  novaRate: number; // How much of this currency equals 1 Nova
  decimals: number;
}

/**
 * FIXED ADMINISTRATIVE RATES
 * These rates are set manually by admin and do not reflect live exchange rates.
 * 
 * Reference rates:
 * 1 Nova = 10 EGP
 * 1 Nova = 0.20 USD
 * 1 Nova = 0.18 EUR
 * 1 Nova = 0.75 SAR
 */

// Full currency configurations with FIXED RATES
export const currencyConfigs: Record<string, CurrencyConfig> = {
  // Base currencies (explicitly defined)
  EGP: { code: 'EGP', symbol: 'EGP', symbolAr: 'ج.م', name: 'Egyptian Pound', nameAr: 'جنيه مصري', novaRate: 10, decimals: 2 },
  USD: { code: 'USD', symbol: 'USD', symbolAr: '$', name: 'US Dollar', nameAr: 'دولار أمريكي', novaRate: 0.20, decimals: 2 },
  EUR: { code: 'EUR', symbol: 'EUR', symbolAr: '€', name: 'Euro', nameAr: 'يورو', novaRate: 0.18, decimals: 2 },
  SAR: { code: 'SAR', symbol: 'SAR', symbolAr: 'ر.س', name: 'Saudi Riyal', nameAr: 'ريال سعودي', novaRate: 0.75, decimals: 2 },
  
  // Gulf countries (based on SAR peg ~0.75)
  AED: { code: 'AED', symbol: 'AED', symbolAr: 'د.إ', name: 'UAE Dirham', nameAr: 'درهم إماراتي', novaRate: 0.73, decimals: 2 },
  QAR: { code: 'QAR', symbol: 'QAR', symbolAr: 'ر.ق', name: 'Qatari Riyal', nameAr: 'ريال قطري', novaRate: 0.73, decimals: 2 },
  KWD: { code: 'KWD', symbol: 'KWD', symbolAr: 'د.ك', name: 'Kuwaiti Dinar', nameAr: 'دينار كويتي', novaRate: 0.06, decimals: 3 },
  BHD: { code: 'BHD', symbol: 'BHD', symbolAr: 'د.ب', name: 'Bahraini Dinar', nameAr: 'دينار بحريني', novaRate: 0.075, decimals: 3 },
  OMR: { code: 'OMR', symbol: 'OMR', symbolAr: 'ر.ع', name: 'Omani Rial', nameAr: 'ريال عماني', novaRate: 0.077, decimals: 3 },
  
  // Levant
  JOD: { code: 'JOD', symbol: 'JOD', symbolAr: 'د.أ', name: 'Jordanian Dinar', nameAr: 'دينار أردني', novaRate: 0.14, decimals: 3 },
  ILS: { code: 'ILS', symbol: 'ILS', symbolAr: '₪', name: 'Israeli Shekel', nameAr: 'شيكل', novaRate: 0.75, decimals: 2 },
  LBP: { code: 'LBP', symbol: 'LBP', symbolAr: 'ل.ل', name: 'Lebanese Pound', nameAr: 'ليرة لبنانية', novaRate: 17900, decimals: 0 },
  SYP: { code: 'SYP', symbol: 'SYP', symbolAr: 'ل.س', name: 'Syrian Pound', nameAr: 'ليرة سورية', novaRate: 2600, decimals: 0 },
  
  // Other Arab countries
  YER: { code: 'YER', symbol: 'YER', symbolAr: 'ر.ي', name: 'Yemeni Rial', nameAr: 'ريال يمني', novaRate: 50, decimals: 0 },
  IQD: { code: 'IQD', symbol: 'IQD', symbolAr: 'د.ع', name: 'Iraqi Dinar', nameAr: 'دينار عراقي', novaRate: 260, decimals: 0 },
  SDG: { code: 'SDG', symbol: 'SDG', symbolAr: 'ج.س', name: 'Sudanese Pound', nameAr: 'جنيه سوداني', novaRate: 120, decimals: 2 },
  
  // North Africa
  MAD: { code: 'MAD', symbol: 'MAD', symbolAr: 'د.م', name: 'Moroccan Dirham', nameAr: 'درهم مغربي', novaRate: 2, decimals: 2 },
  TND: { code: 'TND', symbol: 'TND', symbolAr: 'د.ت', name: 'Tunisian Dinar', nameAr: 'دينار تونسي', novaRate: 0.62, decimals: 3 },
  DZD: { code: 'DZD', symbol: 'DZD', symbolAr: 'د.ج', name: 'Algerian Dinar', nameAr: 'دينار جزائري', novaRate: 27, decimals: 2 },
  LYD: { code: 'LYD', symbol: 'LYD', symbolAr: 'د.ل', name: 'Libyan Dinar', nameAr: 'دينار ليبي', novaRate: 0.97, decimals: 3 },
  
  // Turkey
  TRY: { code: 'TRY', symbol: 'TRY', symbolAr: '₺', name: 'Turkish Lira', nameAr: 'ليرة تركية', novaRate: 6.9, decimals: 2 },
};

// Country to Currency mapping
const countryToCurrency: Record<string, string> = {
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
};

/**
 * Get currency code from country name
 */
export function getCurrencyFromCountry(country: string): string {
  return countryToCurrency[country] || 'EGP';
}

/**
 * Get full currency config from country name
 */
export function getCurrencyConfigFromCountry(country: string): CurrencyConfig {
  const currencyCode = getCurrencyFromCountry(country);
  return currencyConfigs[currencyCode] || currencyConfigs.EGP;
}

/**
 * Convert Nova amount to local currency
 */
export function novaToLocal(novaAmount: number, country: string): number {
  const config = getCurrencyConfigFromCountry(country);
  return novaAmount * config.novaRate;
}

/**
 * Convert local currency to Nova
 */
export function localToNova(localAmount: number, country: string): number {
  const config = getCurrencyConfigFromCountry(country);
  return localAmount / config.novaRate;
}

/**
 * Format Nova amount with local currency equivalent
 */
export function formatNovaWithLocal(
  novaAmount: number, 
  country: string, 
  isRTL: boolean = false
): { nova: string; local: string; rate: string } {
  const config = getCurrencyConfigFromCountry(country);
  const localAmount = novaToLocal(novaAmount, country);
  
  const formatter = new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
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
    local: `${formatter.format(localAmount)} ${isRTL ? config.symbolAr : config.symbol}`,
    rate: `И 1 = ${rateFormatter.format(config.novaRate)} ${isRTL ? config.symbolAr : config.symbol}`,
  };
}

/**
 * Get exchange rate display string
 */
export function getExchangeRateDisplay(country: string, isRTL: boolean = false): string {
  const config = getCurrencyConfigFromCountry(country);
  const rateFormatter = new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
  return `И 1 = ${rateFormatter.format(config.novaRate)} ${isRTL ? config.symbolAr : config.symbol}`;
}

/**
 * Get all available currencies for admin settings
 */
export function getAllCurrencies(): CurrencyConfig[] {
  return Object.values(currencyConfigs);
}
