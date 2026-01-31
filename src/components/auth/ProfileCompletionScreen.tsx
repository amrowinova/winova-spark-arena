import { useState, useEffect } from 'react';
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
import { ArrowLeft, ArrowRight, User, MapPin, Gift, Lock, Info, CheckCircle2 } from 'lucide-react';
import { locationData, getCitiesByCountry, getDistrictsByCity, type City, type District } from '@/lib/locationData';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ProfileCompletionScreenProps {
  email: string;
  onBack: () => void;
  onComplete: () => void;
}

// Mock referrer data for demo
const mockReferrers: Record<string, { name: string; avatar: string }> = {
  'WIN123': { name: 'أحمد محمد', avatar: '' },
  'WIN456': { name: 'سارة علي', avatar: '' },
  'DEMO': { name: 'فريق Winova', avatar: '' },
};

export function ProfileCompletionScreen({ email, onBack, onComplete }: ProfileCompletionScreenProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  
  // Form state
  const [fullName, setFullName] = useState('');
  
  // Location state
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [availableCities, setAvailableCities] = useState<City[]>([]);
  const [availableDistricts, setAvailableDistricts] = useState<District[]>([]);
  
  // Referral state
  const [referralCode, setReferralCode] = useState('');
  const [referrer, setReferrer] = useState<{ name: string; avatar: string } | null>(null);
  const [isCheckingReferral, setIsCheckingReferral] = useState(false);
  
  // Password state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Update cities when country changes
  useEffect(() => {
    if (country) {
      const cities = getCitiesByCountry(country);
      setAvailableCities(cities);
      setCity('');
      setArea('');
      setAvailableDistricts([]);
    } else {
      setAvailableCities([]);
      setCity('');
      setArea('');
      setAvailableDistricts([]);
    }
  }, [country]);

  // Update districts when city changes
  useEffect(() => {
    if (country && city) {
      const districts = getDistrictsByCity(country, city);
      setAvailableDistricts(districts);
      setArea('');
    } else {
      setAvailableDistricts([]);
      setArea('');
    }
  }, [country, city]);

  // Check referral code
  useEffect(() => {
    if (referralCode.length >= 3) {
      setIsCheckingReferral(true);
      const timer = setTimeout(() => {
        const found = mockReferrers[referralCode.toUpperCase()];
        setReferrer(found || null);
        setIsCheckingReferral(false);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setReferrer(null);
    }
  }, [referralCode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validation
    if (!fullName.trim()) {
      setError(isRTL ? 'يرجى إدخال الاسم الكامل' : 'Please enter your full name');
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
    
    // Mock account creation - simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsLoading(false);
    onComplete();
  };

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  // Check if location is required
  const locationRequired = !referralCode;

  return (
    <div className="min-h-full bg-background flex flex-col">
      {/* Header - Fixed */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-4 border-b border-border bg-background">
        <button 
          onClick={onBack}
          className="p-2 -m-2 hover:bg-muted rounded-full transition-colors"
        >
          <BackArrow className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-lg font-semibold text-foreground">
          {isRTL ? 'إكمال الملف الشخصي' : 'Complete Your Profile'}
        </h1>
      </div>

      {/* Form - Scrollable */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="flex-1 px-6 py-6 space-y-6 pb-safe overflow-y-auto"
        style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
      >
        {/* Email Display */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">
            {isRTL ? 'البريد الإلكتروني' : 'Email'}
          </p>
          <p className="text-sm font-medium text-foreground" dir="ltr">{email}</p>
        </div>

        {/* Section 1: Full Name */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <User className="w-4 h-4" />
            <span>{isRTL ? 'الاسم الكامل' : 'Full Name'}</span>
            <span className="text-destructive">*</span>
          </div>

          <div className="relative">
            <User className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={isRTL ? 'أدخل اسمك الكامل' : 'Enter your full name'}
              className="ps-10 h-12"
            />
          </div>
        </div>

        {/* Section 2: Referral Code (Optional) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Gift className="w-4 h-4" />
            <span>{isRTL ? 'كود الإحالة' : 'Referral Code'}</span>
            <span className="text-xs text-muted-foreground">
              ({isRTL ? 'اختياري' : 'Optional'})
            </span>
          </div>

          <Input
            type="text"
            value={referralCode}
            onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
            placeholder={isRTL ? 'أدخل كود الإحالة (إن وجد)' : 'Enter referral code (if any)'}
            className="h-12"
            dir="ltr"
          />

          {/* Referrer Display */}
          {isCheckingReferral && (
            <p className="text-xs text-muted-foreground">
              {isRTL ? 'جارٍ التحقق...' : 'Checking...'}
            </p>
          )}

          {referrer && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={referrer.avatar} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {referrer.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{referrer.name}</p>
                <p className="text-xs text-muted-foreground">
                  {isRTL ? 'سيكون مسؤولك المباشر' : 'Will be your direct manager'}
                </p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-primary" />
            </motion.div>
          )}

          {referralCode && !referrer && !isCheckingReferral && (
            <p className="text-xs text-destructive">
              {isRTL ? 'كود الإحالة غير صحيح' : 'Invalid referral code'}
            </p>
          )}
        </div>

        {/* Section 3: Location (Conditional) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <MapPin className="w-4 h-4" />
            <span>{isRTL ? 'الموقع' : 'Location'}</span>
            {locationRequired && <span className="text-destructive">*</span>}
            {!locationRequired && (
              <span className="text-xs text-muted-foreground">
                ({isRTL ? 'اختياري' : 'Optional'})
              </span>
            )}
          </div>

          {/* Country Dropdown */}
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger className="h-12">
              <SelectValue placeholder={isRTL ? 'اختر الدولة' : 'Select country'} />
            </SelectTrigger>
            <SelectContent>
              {locationData.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  <span className="flex items-center gap-2">
                    <span>{c.flag}</span>
                    <span>{isRTL ? c.nameAr : c.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* City Dropdown */}
          <Select 
            value={city} 
            onValueChange={setCity}
            disabled={!country || availableCities.length === 0}
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder={isRTL ? 'اختر المدينة' : 'Select city'} />
            </SelectTrigger>
            <SelectContent>
              {availableCities.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {isRTL ? c.nameAr : c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Area/District Dropdown */}
          <Select 
            value={area} 
            onValueChange={setArea}
            disabled={!city || availableDistricts.length === 0}
          >
            <SelectTrigger className="h-12">
              <SelectValue placeholder={isRTL ? 'اختر الحي أو المنطقة' : 'Select area or district'} />
            </SelectTrigger>
            <SelectContent>
              {availableDistricts.map((d) => (
                <SelectItem key={d.code} value={d.code}>
                  {isRTL ? d.nameAr : d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Location Note */}
          {locationRequired && (
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isRTL 
                  ? 'في حال عدم إدخال كود إحالة، سيتم ربطك تلقائيًا بأنشط مسؤول في منطقتك.'
                  : 'Without a referral code, you will be automatically linked to the most active manager in your area.'}
              </p>
            </div>
          )}
        </div>

        {/* Section 4: Password */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-primary">
            <Lock className="w-4 h-4" />
            <span>{isRTL ? 'كلمة المرور' : 'Password'}</span>
            <span className="text-destructive">*</span>
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
                placeholder={isRTL ? 'أدخل كلمة المرور (6 أحرف على الأقل)' : 'Enter password (min 6 characters)'}
                className="ps-10 h-12"
                dir="ltr"
              />
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
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={isRTL ? 'أعد إدخال كلمة المرور' : 'Re-enter your password'}
                className="ps-10 h-12"
                dir="ltr"
              />
            </div>
          </div>

          {/* Show Password Toggle */}
          <div className="flex items-center gap-2">
            <Checkbox 
              id="showPassword" 
              checked={showPassword}
              onCheckedChange={(checked) => setShowPassword(checked === true)}
            />
            <label htmlFor="showPassword" className="text-xs text-muted-foreground cursor-pointer">
              {isRTL ? 'إظهار كلمة المرور' : 'Show password'}
            </label>
          </div>
        </div>

        {/* Terms and Conditions */}
        <div className="flex items-start gap-3">
          <Checkbox 
            id="terms" 
            checked={agreedToTerms}
            onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
            className="mt-0.5"
          />
          <label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
            {isRTL 
              ? 'أوافق على شروط الاستخدام وسياسة الخصوصية'
              : 'I agree to the Terms of Service and Privacy Policy'}
          </label>
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
            ? (isRTL ? 'جارٍ إنشاء الحساب...' : 'Creating Account...') 
            : (isRTL ? 'إنشاء الحساب' : 'Create Account')}
        </Button>
      </motion.form>
    </div>
  );
}
