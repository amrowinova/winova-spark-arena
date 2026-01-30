// Location seed data for signup form
// Country → Cities → Districts/Areas

export interface District {
  code: string;
  name: string;
  nameAr: string;
}

export interface City {
  code: string;
  name: string;
  nameAr: string;
  districts: District[];
}

export interface Country {
  code: string;
  name: string;
  nameAr: string;
  flag: string;
  dial: string;
  cities: City[];
}

export const locationData: Country[] = [
  // 🇸🇦 Saudi Arabia
  {
    code: 'SA',
    name: 'Saudi Arabia',
    nameAr: 'السعودية',
    flag: '🇸🇦',
    dial: '+966',
    cities: [
      {
        code: 'RUH',
        name: 'Riyadh',
        nameAr: 'الرياض',
        districts: [
          { code: 'RUH_OLAYA', name: 'Al Olaya', nameAr: 'العليا' },
          { code: 'RUH_MALAZ', name: 'Al Malaz', nameAr: 'الملز' },
          { code: 'RUH_SULAI', name: 'Al Sulimaniyah', nameAr: 'السليمانية' },
          { code: 'RUH_NASEEM', name: 'Al Naseem', nameAr: 'النسيم' },
          { code: 'RUH_SHIFA', name: 'Al Shifa', nameAr: 'الشفا' },
        ],
      },
      {
        code: 'JED',
        name: 'Jeddah',
        nameAr: 'جدة',
        districts: [
          { code: 'JED_BALAD', name: 'Al Balad', nameAr: 'البلد' },
          { code: 'JED_RAWDA', name: 'Al Rawdah', nameAr: 'الروضة' },
          { code: 'JED_SALAMA', name: 'Al Salamah', nameAr: 'السلامة' },
          { code: 'JED_HAMRA', name: 'Al Hamra', nameAr: 'الحمراء' },
        ],
      },
      {
        code: 'DMM',
        name: 'Dammam',
        nameAr: 'الدمام',
        districts: [
          { code: 'DMM_FAISALIYA', name: 'Al Faisaliyah', nameAr: 'الفيصلية' },
          { code: 'DMM_RAKAH', name: 'Al Rakah', nameAr: 'الراكة' },
          { code: 'DMM_SHATIE', name: 'Al Shatie', nameAr: 'الشاطئ' },
        ],
      },
      {
        code: 'MKK',
        name: 'Makkah',
        nameAr: 'مكة المكرمة',
        districts: [
          { code: 'MKK_AZIZIYA', name: 'Al Aziziyah', nameAr: 'العزيزية' },
          { code: 'MKK_RUSAIFA', name: 'Al Rusaifa', nameAr: 'الرصيفة' },
          { code: 'MKK_AWALI', name: 'Al Awali', nameAr: 'العوالي' },
        ],
      },
      {
        code: 'MED',
        name: 'Madinah',
        nameAr: 'المدينة المنورة',
        districts: [
          { code: 'MED_HARAM', name: 'Al Haram', nameAr: 'الحرم' },
          { code: 'MED_QUBA', name: 'Quba', nameAr: 'قباء' },
          { code: 'MED_UHUD', name: 'Uhud', nameAr: 'أحد' },
        ],
      },
    ],
  },
  // 🇪🇬 Egypt
  {
    code: 'EG',
    name: 'Egypt',
    nameAr: 'مصر',
    flag: '🇪🇬',
    dial: '+20',
    cities: [
      {
        code: 'CAI',
        name: 'Cairo',
        nameAr: 'القاهرة',
        districts: [
          { code: 'CAI_MAADI', name: 'Maadi', nameAr: 'المعادي' },
          { code: 'CAI_NASR', name: 'Nasr City', nameAr: 'مدينة نصر' },
          { code: 'CAI_HELIOPOLIS', name: 'Heliopolis', nameAr: 'مصر الجديدة' },
          { code: 'CAI_ZAMALEK', name: 'Zamalek', nameAr: 'الزمالك' },
          { code: 'CAI_TAGAMOA', name: 'New Cairo', nameAr: 'التجمع الخامس' },
        ],
      },
      {
        code: 'ALX',
        name: 'Alexandria',
        nameAr: 'الإسكندرية',
        districts: [
          { code: 'ALX_SMOUHA', name: 'Smouha', nameAr: 'سموحة' },
          { code: 'ALX_MONTAZA', name: 'Montazah', nameAr: 'المنتزه' },
          { code: 'ALX_MIAMI', name: 'Miami', nameAr: 'ميامي' },
          { code: 'ALX_GLEEM', name: 'Gleem', nameAr: 'جليم' },
        ],
      },
      {
        code: 'GIZ',
        name: 'Giza',
        nameAr: 'الجيزة',
        districts: [
          { code: 'GIZ_DOKKI', name: 'Dokki', nameAr: 'الدقي' },
          { code: 'GIZ_MOHANDESSIN', name: 'Mohandessin', nameAr: 'المهندسين' },
          { code: 'GIZ_HARAM', name: 'Haram', nameAr: 'الهرم' },
          { code: 'GIZ_OCTOBER', name: '6th of October', nameAr: 'السادس من أكتوبر' },
        ],
      },
    ],
  },
  // 🇵🇸 Palestine
  {
    code: 'PS',
    name: 'Palestine',
    nameAr: 'فلسطين',
    flag: '🇵🇸',
    dial: '+970',
    cities: [
      {
        code: 'GAZ',
        name: 'Gaza',
        nameAr: 'غزة',
        districts: [
          { code: 'GAZ_RIMAL', name: 'Al Rimal', nameAr: 'الرمال' },
          { code: 'GAZ_SHUJA', name: 'Shujaiyya', nameAr: 'الشجاعية' },
          { code: 'GAZ_ZEITOUN', name: 'Al Zeitoun', nameAr: 'الزيتون' },
        ],
      },
      {
        code: 'RML',
        name: 'Ramallah',
        nameAr: 'رام الله',
        districts: [
          { code: 'RML_CENTER', name: 'City Center', nameAr: 'وسط المدينة' },
          { code: 'RML_BIREH', name: 'Al Bireh', nameAr: 'البيرة' },
          { code: 'RML_TIREH', name: 'Al Tireh', nameAr: 'الطيرة' },
        ],
      },
      {
        code: 'NBL',
        name: 'Nablus',
        nameAr: 'نابلس',
        districts: [
          { code: 'NBL_OLD', name: 'Old City', nameAr: 'البلدة القديمة' },
          { code: 'NBL_RAFIDIA', name: 'Rafidia', nameAr: 'رفيديا' },
        ],
      },
      {
        code: 'HBN',
        name: 'Hebron',
        nameAr: 'الخليل',
        districts: [
          { code: 'HBN_OLD', name: 'Old City', nameAr: 'البلدة القديمة' },
          { code: 'HBN_RAS', name: 'Ras Al Jora', nameAr: 'رأس الجورة' },
        ],
      },
    ],
  },
  // 🇯🇴 Jordan
  {
    code: 'JO',
    name: 'Jordan',
    nameAr: 'الأردن',
    flag: '🇯🇴',
    dial: '+962',
    cities: [
      {
        code: 'AMM',
        name: 'Amman',
        nameAr: 'عمّان',
        districts: [
          { code: 'AMM_ABDOUN', name: 'Abdoun', nameAr: 'عبدون' },
          { code: 'AMM_SWEIFIEH', name: 'Sweifieh', nameAr: 'الصويفية' },
          { code: 'AMM_JABAL', name: 'Jabal Amman', nameAr: 'جبل عمّان' },
          { code: 'AMM_SHMEISANI', name: 'Shmeisani', nameAr: 'الشميساني' },
          { code: 'AMM_TLAA', name: "Tlaa' Al Ali", nameAr: 'تلاع العلي' },
        ],
      },
      {
        code: 'IRB',
        name: 'Irbid',
        nameAr: 'إربد',
        districts: [
          { code: 'IRB_CENTER', name: 'City Center', nameAr: 'وسط المدينة' },
          { code: 'IRB_HUSN', name: 'Al Husn', nameAr: 'الحصن' },
        ],
      },
      {
        code: 'ZRQ',
        name: 'Zarqa',
        nameAr: 'الزرقاء',
        districts: [
          { code: 'ZRQ_NEW', name: 'New Zarqa', nameAr: 'الزرقاء الجديدة' },
          { code: 'ZRQ_RUSAIFA', name: 'Rusaifa', nameAr: 'الرصيفة' },
        ],
      },
    ],
  },
  // 🇦🇪 UAE
  {
    code: 'AE',
    name: 'UAE',
    nameAr: 'الإمارات',
    flag: '🇦🇪',
    dial: '+971',
    cities: [
      {
        code: 'DXB',
        name: 'Dubai',
        nameAr: 'دبي',
        districts: [
          { code: 'DXB_MARINA', name: 'Dubai Marina', nameAr: 'مرسى دبي' },
          { code: 'DXB_JBR', name: 'JBR', nameAr: 'جي بي آر' },
          { code: 'DXB_DEIRA', name: 'Deira', nameAr: 'ديرة' },
          { code: 'DXB_BUR', name: 'Bur Dubai', nameAr: 'بر دبي' },
          { code: 'DXB_JUMEIRAH', name: 'Jumeirah', nameAr: 'جميرا' },
        ],
      },
      {
        code: 'AUH',
        name: 'Abu Dhabi',
        nameAr: 'أبوظبي',
        districts: [
          { code: 'AUH_CORNICHE', name: 'Corniche', nameAr: 'الكورنيش' },
          { code: 'AUH_KHALIDIYA', name: 'Al Khalidiyah', nameAr: 'الخالدية' },
          { code: 'AUH_MUSHRIF', name: 'Al Mushrif', nameAr: 'المشرف' },
        ],
      },
      {
        code: 'SHJ',
        name: 'Sharjah',
        nameAr: 'الشارقة',
        districts: [
          { code: 'SHJ_MAJAZ', name: 'Al Majaz', nameAr: 'المجاز' },
          { code: 'SHJ_NAHDA', name: 'Al Nahda', nameAr: 'النهضة' },
        ],
      },
    ],
  },
  // 🇶🇦 Qatar
  {
    code: 'QA',
    name: 'Qatar',
    nameAr: 'قطر',
    flag: '🇶🇦',
    dial: '+974',
    cities: [
      {
        code: 'DOH',
        name: 'Doha',
        nameAr: 'الدوحة',
        districts: [
          { code: 'DOH_PEARL', name: 'The Pearl', nameAr: 'اللؤلؤة' },
          { code: 'DOH_WESTBAY', name: 'West Bay', nameAr: 'الخليج الغربي' },
          { code: 'DOH_CORNICHE', name: 'Corniche', nameAr: 'الكورنيش' },
          { code: 'DOH_SOUQ', name: 'Souq Waqif', nameAr: 'سوق واقف' },
        ],
      },
      {
        code: 'WAK',
        name: 'Al Wakrah',
        nameAr: 'الوكرة',
        districts: [
          { code: 'WAK_CENTER', name: 'City Center', nameAr: 'وسط المدينة' },
          { code: 'WAK_SOUTH', name: 'South Wakrah', nameAr: 'جنوب الوكرة' },
        ],
      },
    ],
  },
  // 🇰🇼 Kuwait
  {
    code: 'KW',
    name: 'Kuwait',
    nameAr: 'الكويت',
    flag: '🇰🇼',
    dial: '+965',
    cities: [
      {
        code: 'KWC',
        name: 'Kuwait City',
        nameAr: 'مدينة الكويت',
        districts: [
          { code: 'KWC_SHARQ', name: 'Sharq', nameAr: 'شرق' },
          { code: 'KWC_SALMIYA', name: 'Salmiya', nameAr: 'السالمية' },
          { code: 'KWC_HAWALLI', name: 'Hawalli', nameAr: 'حولي' },
          { code: 'KWC_FARWANIYA', name: 'Farwaniya', nameAr: 'الفروانية' },
        ],
      },
      {
        code: 'AHM',
        name: 'Ahmadi',
        nameAr: 'الأحمدي',
        districts: [
          { code: 'AHM_FAHAHEEL', name: 'Fahaheel', nameAr: 'الفحيحيل' },
          { code: 'AHM_MANGAF', name: 'Mangaf', nameAr: 'المنقف' },
        ],
      },
    ],
  },
  // 🇧🇭 Bahrain
  {
    code: 'BH',
    name: 'Bahrain',
    nameAr: 'البحرين',
    flag: '🇧🇭',
    dial: '+973',
    cities: [
      {
        code: 'MAN',
        name: 'Manama',
        nameAr: 'المنامة',
        districts: [
          { code: 'MAN_JUFFAIR', name: 'Juffair', nameAr: 'الجفير' },
          { code: 'MAN_SEEF', name: 'Seef', nameAr: 'السيف' },
          { code: 'MAN_ADLIYA', name: 'Adliya', nameAr: 'العدلية' },
        ],
      },
      {
        code: 'MUH',
        name: 'Muharraq',
        nameAr: 'المحرق',
        districts: [
          { code: 'MUH_ARAD', name: 'Arad', nameAr: 'عراد' },
          { code: 'MUH_HIDD', name: 'Hidd', nameAr: 'الحد' },
        ],
      },
    ],
  },
  // 🇴🇲 Oman
  {
    code: 'OM',
    name: 'Oman',
    nameAr: 'عُمان',
    flag: '🇴🇲',
    dial: '+968',
    cities: [
      {
        code: 'MCT',
        name: 'Muscat',
        nameAr: 'مسقط',
        districts: [
          { code: 'MCT_QURUM', name: 'Qurum', nameAr: 'القرم' },
          { code: 'MCT_RUWI', name: 'Ruwi', nameAr: 'روي' },
          { code: 'MCT_MUTRAH', name: 'Mutrah', nameAr: 'مطرح' },
          { code: 'MCT_SEEB', name: 'Al Seeb', nameAr: 'السيب' },
        ],
      },
      {
        code: 'SLL',
        name: 'Salalah',
        nameAr: 'صلالة',
        districts: [
          { code: 'SLL_CENTER', name: 'City Center', nameAr: 'وسط المدينة' },
          { code: 'SLL_HAFFA', name: 'Al Haffa', nameAr: 'الحافة' },
        ],
      },
    ],
  },
  // 🇲🇦 Morocco
  {
    code: 'MA',
    name: 'Morocco',
    nameAr: 'المغرب',
    flag: '🇲🇦',
    dial: '+212',
    cities: [
      {
        code: 'CAS',
        name: 'Casablanca',
        nameAr: 'الدار البيضاء',
        districts: [
          { code: 'CAS_MAARIF', name: 'Maarif', nameAr: 'المعاريف' },
          { code: 'CAS_ANFA', name: 'Anfa', nameAr: 'أنفا' },
          { code: 'CAS_BOURGOGNE', name: 'Bourgogne', nameAr: 'بورغون' },
        ],
      },
      {
        code: 'RBA',
        name: 'Rabat',
        nameAr: 'الرباط',
        districts: [
          { code: 'RBA_AGDAL', name: 'Agdal', nameAr: 'أكدال' },
          { code: 'RBA_HASSAN', name: 'Hassan', nameAr: 'حسان' },
          { code: 'RBA_SOUISSI', name: 'Souissi', nameAr: 'السويسي' },
        ],
      },
      {
        code: 'FES',
        name: 'Fes',
        nameAr: 'فاس',
        districts: [
          { code: 'FES_MEDINA', name: 'Fes El Bali', nameAr: 'فاس البالي' },
          { code: 'FES_NEW', name: 'Ville Nouvelle', nameAr: 'المدينة الجديدة' },
        ],
      },
      {
        code: 'MRK',
        name: 'Marrakech',
        nameAr: 'مراكش',
        districts: [
          { code: 'MRK_MEDINA', name: 'Medina', nameAr: 'المدينة القديمة' },
          { code: 'MRK_GUELIZ', name: 'Gueliz', nameAr: 'جليز' },
          { code: 'MRK_HIVERNAGE', name: 'Hivernage', nameAr: 'الحيفرناج' },
        ],
      },
    ],
  },
  // 🇹🇳 Tunisia
  {
    code: 'TN',
    name: 'Tunisia',
    nameAr: 'تونس',
    flag: '🇹🇳',
    dial: '+216',
    cities: [
      {
        code: 'TUN',
        name: 'Tunis',
        nameAr: 'تونس العاصمة',
        districts: [
          { code: 'TUN_MENZAH', name: 'El Menzah', nameAr: 'المنزه' },
          { code: 'TUN_MANAR', name: 'El Manar', nameAr: 'المنار' },
          { code: 'TUN_BARDO', name: 'Le Bardo', nameAr: 'باردو' },
          { code: 'TUN_MARSA', name: 'La Marsa', nameAr: 'المرسى' },
        ],
      },
      {
        code: 'SFX',
        name: 'Sfax',
        nameAr: 'صفاقس',
        districts: [
          { code: 'SFX_CENTER', name: 'City Center', nameAr: 'وسط المدينة' },
          { code: 'SFX_MEDINA', name: 'Medina', nameAr: 'المدينة العتيقة' },
        ],
      },
      {
        code: 'SUS',
        name: 'Sousse',
        nameAr: 'سوسة',
        districts: [
          { code: 'SUS_KHEZAMA', name: 'Khezama', nameAr: 'الخزامى' },
          { code: 'SUS_SAHLOUL', name: 'Sahloul', nameAr: 'سهلول' },
        ],
      },
    ],
  },
  // 🇹🇷 Turkey
  {
    code: 'TR',
    name: 'Turkey',
    nameAr: 'تركيا',
    flag: '🇹🇷',
    dial: '+90',
    cities: [
      {
        code: 'IST',
        name: 'Istanbul',
        nameAr: 'إسطنبول',
        districts: [
          { code: 'IST_FATIH', name: 'Fatih', nameAr: 'فاتح' },
          { code: 'IST_BEYOGLU', name: 'Beyoğlu', nameAr: 'بيوغلو' },
          { code: 'IST_KADIKOY', name: 'Kadıköy', nameAr: 'قاضي كوي' },
          { code: 'IST_BESIKTAS', name: 'Beşiktaş', nameAr: 'بشكتاش' },
          { code: 'IST_SISLI', name: 'Şişli', nameAr: 'شيشلي' },
        ],
      },
      {
        code: 'ANK',
        name: 'Ankara',
        nameAr: 'أنقرة',
        districts: [
          { code: 'ANK_CANKAYA', name: 'Çankaya', nameAr: 'تشانكايا' },
          { code: 'ANK_KIZILAY', name: 'Kızılay', nameAr: 'كيزيلاي' },
        ],
      },
      {
        code: 'IZM',
        name: 'Izmir',
        nameAr: 'إزمير',
        districts: [
          { code: 'IZM_KONAK', name: 'Konak', nameAr: 'كوناك' },
          { code: 'IZM_ALSANCAK', name: 'Alsancak', nameAr: 'ألسنجق' },
          { code: 'IZM_BORNOVA', name: 'Bornova', nameAr: 'بورنوفا' },
        ],
      },
    ],
  },
  // 🇸🇾 Syria
  {
    code: 'SY',
    name: 'Syria',
    nameAr: 'سوريا',
    flag: '🇸🇾',
    dial: '+963',
    cities: [
      {
        code: 'DAM',
        name: 'Damascus',
        nameAr: 'دمشق',
        districts: [
          { code: 'DAM_MAZZEH', name: 'Mazzeh', nameAr: 'المزة' },
          { code: 'DAM_MALKI', name: 'Malki', nameAr: 'المالكي' },
          { code: 'DAM_KAFAR', name: 'Kafar Souseh', nameAr: 'كفرسوسة' },
          { code: 'DAM_BARZEH', name: 'Barzeh', nameAr: 'برزة' },
        ],
      },
      {
        code: 'ALP',
        name: 'Aleppo',
        nameAr: 'حلب',
        districts: [
          { code: 'ALP_AZIZIYEH', name: 'Aziziyeh', nameAr: 'العزيزية' },
          { code: 'ALP_HAMDANIYEH', name: 'Hamdaniyeh', nameAr: 'الحمدانية' },
        ],
      },
      {
        code: 'HMS',
        name: 'Homs',
        nameAr: 'حمص',
        districts: [
          { code: 'HMS_INSHAAT', name: 'Inshaat', nameAr: 'الإنشاءات' },
          { code: 'HMS_HAMIDIYEH', name: 'Hamidiyeh', nameAr: 'الحميدية' },
        ],
      },
    ],
  },
  // 🇱🇧 Lebanon
  {
    code: 'LB',
    name: 'Lebanon',
    nameAr: 'لبنان',
    flag: '🇱🇧',
    dial: '+961',
    cities: [
      {
        code: 'BEY',
        name: 'Beirut',
        nameAr: 'بيروت',
        districts: [
          { code: 'BEY_HAMRA', name: 'Hamra', nameAr: 'الحمرا' },
          { code: 'BEY_ACHRAFIEH', name: 'Achrafieh', nameAr: 'الأشرفية' },
          { code: 'BEY_VERDUN', name: 'Verdun', nameAr: 'فردان' },
          { code: 'BEY_DOWNTOWN', name: 'Downtown', nameAr: 'وسط بيروت' },
        ],
      },
      {
        code: 'TRI',
        name: 'Tripoli',
        nameAr: 'طرابلس',
        districts: [
          { code: 'TRI_MINA', name: 'Al Mina', nameAr: 'الميناء' },
          { code: 'TRI_KOBBE', name: 'Kobbe', nameAr: 'القبة' },
        ],
      },
      {
        code: 'SID',
        name: 'Sidon',
        nameAr: 'صيدا',
        districts: [
          { code: 'SID_OLD', name: 'Old City', nameAr: 'المدينة القديمة' },
          { code: 'SID_EAST', name: 'East Sidon', nameAr: 'صيدا الشرقية' },
        ],
      },
    ],
  },
  // 🇾🇪 Yemen
  {
    code: 'YE',
    name: 'Yemen',
    nameAr: 'اليمن',
    flag: '🇾🇪',
    dial: '+967',
    cities: [
      {
        code: 'SAH',
        name: "Sana'a",
        nameAr: 'صنعاء',
        districts: [
          { code: 'SAH_HADDA', name: 'Hadda', nameAr: 'حدة' },
          { code: 'SAH_TAHRIR', name: 'Al Tahrir', nameAr: 'التحرير' },
          { code: 'SAH_OLD', name: 'Old City', nameAr: 'صنعاء القديمة' },
        ],
      },
      {
        code: 'ADE',
        name: 'Aden',
        nameAr: 'عدن',
        districts: [
          { code: 'ADE_CRATER', name: 'Crater', nameAr: 'كريتر' },
          { code: 'ADE_MUALLA', name: 'Al Mualla', nameAr: 'المعلا' },
          { code: 'ADE_TAWAHI', name: 'Al Tawahi', nameAr: 'التواهي' },
        ],
      },
      {
        code: 'TAZ',
        name: 'Taiz',
        nameAr: 'تعز',
        districts: [
          { code: 'TAZ_CENTER', name: 'City Center', nameAr: 'وسط المدينة' },
          { code: 'TAZ_HAWBAN', name: 'Al Hawban', nameAr: 'الحوبان' },
        ],
      },
    ],
  },
];

// Helper functions
export function getCountries(): Country[] {
  return locationData;
}

export function getCitiesByCountry(countryCode: string): City[] {
  const country = locationData.find(c => c.code === countryCode);
  return country?.cities || [];
}

export function getDistrictsByCity(countryCode: string, cityCode: string): District[] {
  const country = locationData.find(c => c.code === countryCode);
  const city = country?.cities.find(c => c.code === cityCode);
  return city?.districts || [];
}

export function getCountryByCode(code: string): Country | undefined {
  return locationData.find(c => c.code === code);
}
