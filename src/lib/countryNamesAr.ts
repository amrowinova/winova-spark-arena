/**
 * Arabic country name map for localized display.
 * Used across P2P pages for error messages and UI labels.
 */
export const COUNTRY_NAMES_AR: Record<string, string> = {
  'Saudi Arabia': 'السعودية',
  'UAE': 'الإمارات',
  'Kuwait': 'الكويت',
  'Qatar': 'قطر',
  'Bahrain': 'البحرين',
  'Oman': 'عُمان',
  'Egypt': 'مصر',
  'Jordan': 'الأردن',
  'Palestine': 'فلسطين',
  'Lebanon': 'لبنان',
  'Syria': 'سوريا',
  'Yemen': 'اليمن',
  'Morocco': 'المغرب',
  'Tunisia': 'تونس',
  'Algeria': 'الجزائر',
  'Libya': 'ليبيا',
  'Sudan': 'السودان',
  'Turkey': 'تركيا',
  'Iraq': 'العراق',
};

export function getCountryNameAr(englishName: string): string {
  return COUNTRY_NAMES_AR[englishName] || englishName;
}
