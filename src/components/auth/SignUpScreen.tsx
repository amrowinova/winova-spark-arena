import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Mail, Lock, User, MapPin, Gift, Info, Phone } from 'lucide-react';

interface SignUpScreenProps {
  onBack: () => void;
  onLogin: () => void;
  onSuccess: () => void;
}

// Country codes for phone input
const countryCodes = [
  { code: 'SA', dial: '+966', flag: '🇸🇦', name: 'Saudi Arabia', nameAr: 'السعودية' },
  { code: 'EG', dial: '+20', flag: '🇪🇬', name: 'Egypt', nameAr: 'مصر' },
  { code: 'JO', dial: '+962', flag: '🇯🇴', name: 'Jordan', nameAr: 'الأردن' },
  { code: 'PS', dial: '+970', flag: '🇵🇸', name: 'Palestine', nameAr: 'فلسطين' },
  { code: 'AE', dial: '+971', flag: '🇦🇪', name: 'UAE', nameAr: 'الإمارات' },
  { code: 'OM', dial: '+968', flag: '🇴🇲', name: 'Oman', nameAr: 'عُمان' },
  { code: 'MA', dial: '+212', flag: '🇲🇦', name: 'Morocco', nameAr: 'المغرب' },
  { code: 'TN', dial: '+216', flag: '🇹🇳', name: 'Tunisia', nameAr: 'تونس' },
  { code: 'TR', dial: '+90', flag: '🇹🇷', name: 'Turkey', nameAr: 'تركيا' },
  { code: 'SY', dial: '+963', flag: '🇸🇾', name: 'Syria', nameAr: 'سوريا' },
  { code: 'LB', dial: '+961', flag: '🇱🇧', name: 'Lebanon', nameAr: 'لبنان' },
  { code: 'YE', dial: '+967', flag: '🇾🇪', name: 'Yemen', nameAr: 'اليمن' },
];

// Countries list for location
const countries = [
  { code: 'SA', name: 'Saudi Arabia', nameAr: 'السعودية' },
  { code: 'EG', name: 'Egypt', nameAr: 'مصر' },
  { code: 'JO', name: 'Jordan', nameAr: 'الأردن' },
  { code: 'PS', name: 'Palestine', nameAr: 'فلسطين' },
  { code: 'AE', name: 'UAE', nameAr: 'الإمارات' },
  { code: 'OM', name: 'Oman', nameAr: 'عُمان' },
  { code: 'MA', name: 'Morocco', nameAr: 'المغرب' },
  { code: 'TN', name: 'Tunisia', nameAr: 'تونس' },
  { code: 'TR', name: 'Turkey', nameAr: 'تركيا' },
  { code: 'SY', name: 'Syria', nameAr: 'سوريا' },
  { code: 'LB', name: 'Lebanon', nameAr: 'لبنان' },
  { code: 'YE', name: 'Yemen', nameAr: 'اليمن' },
];

export function SignUpScreen({ onBack, onLogin, onSuccess }: SignUpScreenProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  
  // Form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneCountry, setPhoneCountry] = useState('SA');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const selectedCountryCode = countryCodes.find(c => c.code === phoneCountry);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Basic validation
    if (!fullName) {
      setError(isRTL ? 'يرجى إدخال الاسم الكامل' : 'Please enter your full name');
      return;
    }

    if (!email && !phone) {
      setError(isRTL ? 'يرجى إدخال البريد الإلكتروني أو رقم الهاتف' : 'Please enter email or phone');
      return;
    }

    // Location is required if no referral code
    if (!referralCode && (!country || !city || !area)) {
      setError(isRTL ? 'يرجى إدخال الموقع أو كود الإحالة' : 'Please enter location or referral code');
      return;
    }

    if (!password || !confirmPassword) {
      setError(isRTL ? 'يرجى إدخال كلمة المرور' : 'Please enter password');
      return;
    }

    if (password !== confirmPassword) {
      setError(isRTL ? 'كلمات المرور غير متطابقة' : 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError(isRTL ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters');
      return;
    }

    if (!agreedToTerms) {
      setError(isRTL ? 'يجب الموافقة على الشروط والسياسات' : 'You must agree to the terms and policies');
      return;
    }

    setIsLoading(true);
    
    // Mock signup - simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsLoading(false);
    onSuccess();
  };

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border">
        <button 
          onClick={onBack}
          className="p-2 -m-2 hover:bg-muted rounded-full transition-colors"
        >
          <BackArrow className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">
          {isRTL ? 'إنشاء حساب في Winova' : 'Create Account in Winova'}
        </h1>
      </div>

      {/* Form */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="flex-1 px-6 py-6 space-y-6 overflow-y-auto pb-32"
      >
        {/* Section 1: Basic Information */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <User className="w-4 h-4" />
            <span>{isRTL ? 'المعلومات الأساسية' : 'Basic Information'}</span>
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-sm font-medium">
              {isRTL ? 'الاسم الكامل' : 'Full Name'}
            </Label>
            <div className="relative">
              <User className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={isRTL ? 'أدخل اسمك الكامل' : 'Enter your full name'}
                className="ps-10 h-12"
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              {isRTL ? 'البريد الإلكتروني' : 'Email'}
            </Label>
            <div className="relative">
              <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                className="ps-10 h-12"
                dir="ltr"
              />
            </div>
          </div>

          {/* Phone with Country Selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {isRTL ? 'أو رقم الهاتف' : 'Or Phone Number'}
            </Label>
            <div className="flex gap-2">
              <Select value={phoneCountry} onValueChange={setPhoneCountry}>
                <SelectTrigger className="w-28 h-12">
                  <SelectValue>
                    {selectedCountryCode && (
                      <span className="flex items-center gap-1">
                        <span>{selectedCountryCode.flag}</span>
                        <span className="text-xs">{selectedCountryCode.dial}</span>
                      </span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {countryCodes.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      <span className="flex items-center gap-2">
                        <span>{c.flag}</span>
                        <span>{c.dial}</span>
                        <span className="text-muted-foreground text-xs">
                          {isRTL ? c.nameAr : c.name}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative flex-1">
                <Phone className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={isRTL ? 'أدخل رقم الهاتف' : 'Enter phone number'}
                  className="ps-10 h-12"
                  dir="ltr"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Location */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <MapPin className="w-4 h-4" />
            <span>{isRTL ? 'الموقع' : 'Location'}</span>
            <span className="text-xs text-muted-foreground">
              ({isRTL ? 'إجباري في حال عدم وجود كود إحالة' : 'Required if no referral code'})
            </span>
          </div>

          {/* Country */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {isRTL ? 'الدولة' : 'Country'}
            </Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder={isRTL ? 'اختر الدولة' : 'Select country'} />
              </SelectTrigger>
              <SelectContent>
                {countries.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {isRTL ? c.nameAr : c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* City */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {isRTL ? 'المدينة' : 'City'}
            </Label>
            <Input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder={isRTL ? 'اختر المدينة' : 'Select city'}
              className="h-12"
            />
          </div>

          {/* Area */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              {isRTL ? 'المنطقة / الحي' : 'Area / District'}
            </Label>
            <Input
              type="text"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder={isRTL ? 'اختر الحي أو المنطقة' : 'Select area or district'}
              className="h-12"
            />
          </div>

          {/* Location Note */}
          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
            <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isRTL 
                ? 'في حال عدم إدخال كود إحالة، سيتم ربطك تلقائيًا بأقرب مسؤول نشط في منطقتك.'
                : 'If no referral code is entered, you will be automatically linked to the nearest active manager in your area.'}
            </p>
          </div>
        </div>

        {/* Section 3: Referral Code */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Gift className="w-4 h-4" />
            <span>{isRTL ? 'كود الإحالة' : 'Referral Code'}</span>
            <span className="text-xs text-muted-foreground">
              ({isRTL ? 'اختياري' : 'Optional'})
            </span>
          </div>

          <div className="space-y-2">
            <Input
              type="text"
              value={referralCode}
              onChange={(e) => setReferralCode(e.target.value)}
              placeholder={isRTL ? 'أدخل كود الإحالة (إن وجد)' : 'Enter referral code (if any)'}
              className="h-12"
              dir="ltr"
            />
          </div>

          {/* Referral Note */}
          <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg border border-primary/10">
            <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isRTL 
                ? 'إذا لم يكن لديك كود إحالة، لا تقلق — سيقوم النظام تلقائيًا بربطك بأنشط مسؤول في منطقتك.'
                : "If you don't have a referral code, don't worry — the system will automatically link you to the most active manager in your area."}
            </p>
          </div>
        </div>

        {/* Section 4: Password */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Lock className="w-4 h-4" />
            <span>{isRTL ? 'كلمة المرور' : 'Password'}</span>
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              {isRTL ? 'كلمة المرور' : 'Password'}
            </Label>
            <div className="relative">
              <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isRTL ? 'أدخل كلمة المرور' : 'Enter your password'}
                className="ps-10 pe-10 h-12"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute end-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">
              {isRTL ? 'تأكيد كلمة المرور' : 'Confirm Password'}
            </Label>
            <div className="relative">
              <Lock className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={isRTL ? 'أعد إدخال كلمة المرور' : 'Re-enter your password'}
                className="ps-10 pe-10 h-12"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute end-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Section 5: Terms Agreement */}
        <div className="space-y-4">
          <div className="flex items-start gap-3 py-2">
            <Checkbox
              id="terms"
              checked={agreedToTerms}
              onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
              className="mt-0.5"
            />
            <label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
              {isRTL 
                ? <>أوافق على <span className="text-primary hover:underline">الشروط والأحكام</span> و <span className="text-primary hover:underline">سياسة الخصوصية</span></>
                : <>I agree to the <span className="text-primary hover:underline">Terms of Service</span> and <span className="text-primary hover:underline">Privacy Policy</span></>}
            </label>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-destructive text-center"
          >
            {error}
          </motion.p>
        )}

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 text-base font-semibold"
        >
          {isLoading 
            ? (isRTL ? 'جارٍ إنشاء الحساب...' : 'Creating account...') 
            : (isRTL ? 'إنشاء حساب' : 'Create Account')}
        </Button>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              {isRTL ? 'أو' : 'OR'}
            </span>
          </div>
        </div>

        {/* Social Signup Buttons */}
        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 text-base font-medium gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {isRTL ? 'إنشاء حساب باستخدام Google' : 'Sign up with Google'}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 text-base font-medium gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            {isRTL ? 'إنشاء حساب باستخدام Apple' : 'Sign up with Apple'}
          </Button>
        </div>

        {/* Login Link */}
        <p className="text-center text-sm text-muted-foreground pb-8">
          {isRTL ? 'لديك حساب بالفعل؟ ' : 'Already have an account? '}
          <button
            type="button"
            onClick={onLogin}
            className="text-primary font-medium hover:underline"
          >
            {isRTL ? 'تسجيل الدخول' : 'Sign In'}
          </button>
        </p>
      </motion.form>
    </div>
  );
}
