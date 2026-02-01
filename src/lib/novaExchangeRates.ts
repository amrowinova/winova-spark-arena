/**
 * Nova Exchange Rates System
 * 
 * Fixed pricing: 1 Nova = 10 EGP (base rate)
 * All other currencies are calculated based on approximate real exchange rates to EGP
 * 
 * Nova can ONLY be added/deducted by Admins through the Admin Dashboard.
 * Users cannot directly modify their Nova balance.
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

// Base rate: 1 Nova = 10 EGP
const BASE_NOVA_EGP = 10;

// Approximate exchange rates to EGP (for display purposes only)
// These represent: 1 unit of foreign currency = X EGP
const currencyToEGP: Record<string, number> = {
  EGP: 1,
  SAR: 13.3,   // 1 SAR ≈ 13.3 EGP
  AED: 13.6,   // 1 AED ≈ 13.6 EGP
  QAR: 13.7,   // 1 QAR ≈ 13.7 EGP
  KWD: 163,    // 1 KWD ≈ 163 EGP
  BHD: 132,    // 1 BHD ≈ 132 EGP
  OMR: 130,    // 1 OMR ≈ 130 EGP
  JOD: 70,     // 1 JOD ≈ 70 EGP
  ILS: 13.5,   // 1 ILS ≈ 13.5 EGP
  LBP: 0.00056, // 1 LBP ≈ 0.00056 EGP (very devalued)
  SYP: 0.002,  // 1 SYP ≈ 0.002 EGP
  YER: 0.02,   // 1 YER ≈ 0.02 EGP
  MAD: 5,      // 1 MAD ≈ 5 EGP
  TND: 16,     // 1 TND ≈ 16 EGP
  DZD: 0.37,   // 1 DZD ≈ 0.37 EGP
  LYD: 10.3,   // 1 LYD ≈ 10.3 EGP
  SDG: 0.083,  // 1 SDG ≈ 0.083 EGP
  TRY: 1.45,   // 1 TRY ≈ 1.45 EGP
  IQD: 0.038,  // 1 IQD ≈ 0.038 EGP
  USD: 50,     // 1 USD ≈ 50 EGP (fallback)
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

// Full currency configurations
export const currencyConfigs: Record<string, CurrencyConfig> = {
  EGP: { code: 'EGP', symbol: 'EGP', symbolAr: 'ج.م', name: 'Egyptian Pound', nameAr: 'جنيه مصري', novaRate: 10, decimals: 2 },
  SAR: { code: 'SAR', symbol: 'SAR', symbolAr: 'ر.س', name: 'Saudi Riyal', nameAr: 'ريال سعودي', novaRate: BASE_NOVA_EGP / currencyToEGP.SAR, decimals: 2 },
  AED: { code: 'AED', symbol: 'AED', symbolAr: 'د.إ', name: 'UAE Dirham', nameAr: 'درهم إماراتي', novaRate: BASE_NOVA_EGP / currencyToEGP.AED, decimals: 2 },
  QAR: { code: 'QAR', symbol: 'QAR', symbolAr: 'ر.ق', name: 'Qatari Riyal', nameAr: 'ريال قطري', novaRate: BASE_NOVA_EGP / currencyToEGP.QAR, decimals: 2 },
  KWD: { code: 'KWD', symbol: 'KWD', symbolAr: 'د.ك', name: 'Kuwaiti Dinar', nameAr: 'دينار كويتي', novaRate: BASE_NOVA_EGP / currencyToEGP.KWD, decimals: 3 },
  BHD: { code: 'BHD', symbol: 'BHD', symbolAr: 'د.ب', name: 'Bahraini Dinar', nameAr: 'دينار بحريني', novaRate: BASE_NOVA_EGP / currencyToEGP.BHD, decimals: 3 },
  OMR: { code: 'OMR', symbol: 'OMR', symbolAr: 'ر.ع', name: 'Omani Rial', nameAr: 'ريال عماني', novaRate: BASE_NOVA_EGP / currencyToEGP.OMR, decimals: 3 },
  JOD: { code: 'JOD', symbol: 'JOD', symbolAr: 'د.أ', name: 'Jordanian Dinar', nameAr: 'دينار أردني', novaRate: BASE_NOVA_EGP / currencyToEGP.JOD, decimals: 3 },
  ILS: { code: 'ILS', symbol: 'ILS', symbolAr: '₪', name: 'Israeli Shekel', nameAr: 'شيكل', novaRate: BASE_NOVA_EGP / currencyToEGP.ILS, decimals: 2 },
  LBP: { code: 'LBP', symbol: 'LBP', symbolAr: 'ل.ل', name: 'Lebanese Pound', nameAr: 'ليرة لبنانية', novaRate: BASE_NOVA_EGP / currencyToEGP.LBP, decimals: 0 },
  SYP: { code: 'SYP', symbol: 'SYP', symbolAr: 'ل.س', name: 'Syrian Pound', nameAr: 'ليرة سورية', novaRate: BASE_NOVA_EGP / currencyToEGP.SYP, decimals: 0 },
  YER: { code: 'YER', symbol: 'YER', symbolAr: 'ر.ي', name: 'Yemeni Rial', nameAr: 'ريال يمني', novaRate: BASE_NOVA_EGP / currencyToEGP.YER, decimals: 0 },
  MAD: { code: 'MAD', symbol: 'MAD', symbolAr: 'د.م', name: 'Moroccan Dirham', nameAr: 'درهم مغربي', novaRate: BASE_NOVA_EGP / currencyToEGP.MAD, decimals: 2 },
  TND: { code: 'TND', symbol: 'TND', symbolAr: 'د.ت', name: 'Tunisian Dinar', nameAr: 'دينار تونسي', novaRate: BASE_NOVA_EGP / currencyToEGP.TND, decimals: 3 },
  DZD: { code: 'DZD', symbol: 'DZD', symbolAr: 'د.ج', name: 'Algerian Dinar', nameAr: 'دينار جزائري', novaRate: BASE_NOVA_EGP / currencyToEGP.DZD, decimals: 2 },
  LYD: { code: 'LYD', symbol: 'LYD', symbolAr: 'د.ل', name: 'Libyan Dinar', nameAr: 'دينار ليبي', novaRate: BASE_NOVA_EGP / currencyToEGP.LYD, decimals: 3 },
  SDG: { code: 'SDG', symbol: 'SDG', symbolAr: 'ج.س', name: 'Sudanese Pound', nameAr: 'جنيه سوداني', novaRate: BASE_NOVA_EGP / currencyToEGP.SDG, decimals: 2 },
  TRY: { code: 'TRY', symbol: 'TRY', symbolAr: '₺', name: 'Turkish Lira', nameAr: 'ليرة تركية', novaRate: BASE_NOVA_EGP / currencyToEGP.TRY, decimals: 2 },
  IQD: { code: 'IQD', symbol: 'IQD', symbolAr: 'د.ع', name: 'Iraqi Dinar', nameAr: 'دينار عراقي', novaRate: BASE_NOVA_EGP / currencyToEGP.IQD, decimals: 0 },
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
    rate: `1 И = ${rateFormatter.format(config.novaRate)} ${isRTL ? config.symbolAr : config.symbol}`,
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
