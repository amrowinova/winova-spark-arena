// Country name to flag emoji mapping
const COUNTRY_FLAGS: Record<string, string> = {
  // Middle East
  'Saudi Arabia': '🇸🇦',
  'السعودية': '🇸🇦',
  'United Arab Emirates': '🇦🇪',
  'الإمارات': '🇦🇪',
  'UAE': '🇦🇪',
  'Kuwait': '🇰🇼',
  'الكويت': '🇰🇼',
  'Qatar': '🇶🇦',
  'قطر': '🇶🇦',
  'Bahrain': '🇧🇭',
  'البحرين': '🇧🇭',
  'Oman': '🇴🇲',
  'عمان': '🇴🇲',
  'Jordan': '🇯🇴',
  'الأردن': '🇯🇴',
  'Lebanon': '🇱🇧',
  'لبنان': '🇱🇧',
  'Syria': '🇸🇾',
  'سوريا': '🇸🇾',
  'Iraq': '🇮🇶',
  'العراق': '🇮🇶',
  'Palestine': '🇵🇸',
  'فلسطين': '🇵🇸',
  'Yemen': '🇾🇪',
  'اليمن': '🇾🇪',
  
  // North Africa
  'Egypt': '🇪🇬',
  'مصر': '🇪🇬',
  'Morocco': '🇲🇦',
  'المغرب': '🇲🇦',
  'Algeria': '🇩🇿',
  'الجزائر': '🇩🇿',
  'Tunisia': '🇹🇳',
  'تونس': '🇹🇳',
  'Libya': '🇱🇾',
  'ليبيا': '🇱🇾',
  'Sudan': '🇸🇩',
  'السودان': '🇸🇩',
  
  // Asia
  'Turkey': '🇹🇷',
  'تركيا': '🇹🇷',
  'Iran': '🇮🇷',
  'إيران': '🇮🇷',
  'Pakistan': '🇵🇰',
  'باكستان': '🇵🇰',
  'India': '🇮🇳',
  'الهند': '🇮🇳',
  'Indonesia': '🇮🇩',
  'إندونيسيا': '🇮🇩',
  'Malaysia': '🇲🇾',
  'ماليزيا': '🇲🇾',
  'China': '🇨🇳',
  'الصين': '🇨🇳',
  'Japan': '🇯🇵',
  'اليابان': '🇯🇵',
  'South Korea': '🇰🇷',
  'كوريا الجنوبية': '🇰🇷',
  
  // Europe
  'United Kingdom': '🇬🇧',
  'UK': '🇬🇧',
  'بريطانيا': '🇬🇧',
  'Germany': '🇩🇪',
  'ألمانيا': '🇩🇪',
  'France': '🇫🇷',
  'فرنسا': '🇫🇷',
  'Italy': '🇮🇹',
  'إيطاليا': '🇮🇹',
  'Spain': '🇪🇸',
  'إسبانيا': '🇪🇸',
  'Netherlands': '🇳🇱',
  'هولندا': '🇳🇱',
  'Belgium': '🇧🇪',
  'بلجيكا': '🇧🇪',
  'Sweden': '🇸🇪',
  'السويد': '🇸🇪',
  'Norway': '🇳🇴',
  'النرويج': '🇳🇴',
  'Denmark': '🇩🇰',
  'الدنمارك': '🇩🇰',
  
  // Americas
  'United States': '🇺🇸',
  'USA': '🇺🇸',
  'أمريكا': '🇺🇸',
  'Canada': '🇨🇦',
  'كندا': '🇨🇦',
  'Brazil': '🇧🇷',
  'البرازيل': '🇧🇷',
  'Mexico': '🇲🇽',
  'المكسيك': '🇲🇽',
  'Argentina': '🇦🇷',
  'الأرجنتين': '🇦🇷',
  
  // Africa
  'Nigeria': '🇳🇬',
  'نيجيريا': '🇳🇬',
  'South Africa': '🇿🇦',
  'جنوب أفريقيا': '🇿🇦',
  'Kenya': '🇰🇪',
  'كينيا': '🇰🇪',
  
  // Oceania
  'Australia': '🇦🇺',
  'أستراليا': '🇦🇺',
  'New Zealand': '🇳🇿',
  'نيوزيلندا': '🇳🇿',
};

/**
 * Get flag emoji for a country name
 * @param country - Country name in English or Arabic
 * @returns Flag emoji or empty string if not found
 */
export function getCountryFlag(country: string | undefined | null): string {
  if (!country) return '';
  return COUNTRY_FLAGS[country] || '';
}
