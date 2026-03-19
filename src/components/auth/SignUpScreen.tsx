import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Mail, Lock, Eye, EyeOff, User, MapPin, Users, AlertCircle, Globe } from 'lucide-react';
import { locationData } from '@/lib/locationData';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface SignUpScreenProps {
  onBack: () => void;
  onLogin: () => void;
  onSendOTP: (email: string) => void;
  onSignupSuccess?: (name: string, isPioneer: boolean) => void;
}

export function SignUpScreen({ onBack, onLogin, onSendOTP, onSignupSuccess }: SignUpScreenProps) {
  const { language } = useLanguage();
  const { signUp, signInWithOtp, signInWithGoogle, signInWithApple } = useAuth();
  const isRTL = language === 'ar';
  
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [usePassword, setUsePassword] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailAlreadyExists, setEmailAlreadyExists] = useState(false);
  
  // Location fields
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  
  // Referral code
  const [referralCode, setReferralCode] = useState('');
  const [referralVerified, setReferralVerified] = useState<{ name: string; avatar: string | null; country: string } | null>(null);
  const [verifyingReferral, setVerifyingReferral] = useState(false);
  const [referralCountryMismatch, setReferralCountryMismatch] = useState(false);
  const [suggestedReferrers, setSuggestedReferrers] = useState<Array<{
    name: string;
    avatar_url: string | null;
    referral_code: string;
    city: string | null;
    district: string | null;
  }>>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Auto-generate username from name
  const generateUsername = (inputName: string): string => {
    return inputName
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 20);
  };

  // Handle name change and auto-suggest username
  const handleNameChange = (value: string) => {
    setName(value);
    if (!username || username === generateUsername(name)) {
      setUsername(generateUsername(value));
      checkUsernameAvailability(generateUsername(value));
    }
  };

  // Handle username change with validation
  const handleUsernameChange = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
    setUsername(cleaned);
    if (cleaned.length >= 3) {
      checkUsernameAvailability(cleaned);
    } else {
      setUsernameAvailable(null);
    }
  };

  // Check username availability in database
  const checkUsernameAvailability = async (uname: string) => {
    if (uname.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    
    setCheckingUsername(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', uname)
        .maybeSingle();
      
      if (error) {
        setUsernameAvailable(null);
      } else {
        setUsernameAvailable(!data); // Available if no user found
      }
    } catch {
      setUsernameAvailable(null);
    } finally {
      setCheckingUsername(false);
    }
  };

  // Get cities based on selected country
  const cities = useMemo(() => {
    const country = locationData.find(c => c.code === selectedCountry);
    return country?.cities || [];
  }, [selectedCountry]);

  // Get districts based on selected city
  const districts = useMemo(() => {
    const country = locationData.find(c => c.code === selectedCountry);
    const city = country?.cities.find(c => c.code === selectedCity);
    return city?.districts || [];
  }, [selectedCountry, selectedCity]);

  // Handle country change - reset city and district; re-check referral mismatch
  const handleCountryChange = (value: string) => {
    setSelectedCountry(value);
    setSelectedCity('');
    setSelectedDistrict('');

    const countryData = locationData.find(c => c.code === value);
    const userCountryName = countryData?.name || value;

    if (referralVerified) {
      // Re-check mismatch against the already-verified referral code
      const mismatch = referralVerified.country !== userCountryName;
      setReferralCountryMismatch(mismatch);
      if (mismatch) {
        fetchSuggestedReferrers(userCountryName, value);
      } else {
        setSuggestedReferrers([]);
      }
    } else if (!referralCode.trim()) {
      // No referral code yet — auto-show top referrers from this country
      if (userCountryName) {
        fetchSuggestedReferrers(userCountryName, value);
      }
    }
  };

  // Handle city change - reset district
  const handleCityChange = (value: string) => {
    setSelectedCity(value);
    setSelectedDistrict('');
  };

  // Fetch top 5 suggested referrers from user's country
  // countryCode is passed explicitly to avoid stale closure on selectedCountry
  const fetchSuggestedReferrers = async (userCountryName: string, countryCode: string) => {
    setLoadingSuggestions(true);
    try {
      const countryData = locationData.find(c => c.code === countryCode);
      const cityData = countryData?.cities.find(c => c.code === selectedCity);
      const districtData = cityData?.districts.find(d => d.code === selectedDistrict);

      let data: Array<{ name: string; avatar_url: string | null; referral_code: string; city: string | null; district: string | null }> = [];

      // Try district first (no weekly_active filter — show all registered members)
      if (districtData?.name) {
        const r = await supabase
          .from('profiles')
          .select('name, avatar_url, referral_code, city, district, spotlight_points')
          .eq('country', userCountryName)
          .eq('district', districtData.name)
          .not('referral_code', 'is', null)
          .order('spotlight_points', { ascending: false })
          .limit(5);
        data = r.data || [];
      }

      // Fallback to city
      if (data.length < 3 && cityData?.name) {
        const r = await supabase
          .from('profiles')
          .select('name, avatar_url, referral_code, city, district, spotlight_points')
          .eq('country', userCountryName)
          .eq('city', cityData.name)
          .not('referral_code', 'is', null)
          .order('spotlight_points', { ascending: false })
          .limit(5);
        if ((r.data || []).length > data.length) data = r.data || [];
      }

      // Fallback to full country
      if (data.length === 0) {
        const r = await supabase
          .from('profiles')
          .select('name, avatar_url, referral_code, city, district, spotlight_points')
          .eq('country', userCountryName)
          .not('referral_code', 'is', null)
          .order('spotlight_points', { ascending: false })
          .limit(5);
        data = r.data || [];
      }

      setSuggestedReferrers(data);
    } catch {
      setSuggestedReferrers([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Verify referral code
  const verifyReferralCode = async (code: string) => {
    if (!code || code.length < 6) {
      setReferralVerified(null);
      setReferralCountryMismatch(false);
      setSuggestedReferrers([]);
      return;
    }

    setVerifyingReferral(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, avatar_url, country')
        .eq('referral_code', code.toUpperCase())
        .single();

      if (data && !error) {
        const referrerCountry = data.country || '';
        setReferralVerified({ name: data.name, avatar: data.avatar_url, country: referrerCountry });

        // Check country mismatch if user already selected their country
        if (selectedCountry) {
          const countryData = locationData.find(c => c.code === selectedCountry);
          const userCountryName = countryData?.name || selectedCountry;
          const mismatch = referrerCountry !== userCountryName;
          setReferralCountryMismatch(mismatch);
          if (mismatch) {
            fetchSuggestedReferrers(userCountryName, selectedCountry);
          } else {
            setSuggestedReferrers([]);
          }
        }
      } else {
        setReferralVerified(null);
        setReferralCountryMismatch(false);
        setSuggestedReferrers([]);
      }
    } catch {
      setReferralVerified(null);
      setReferralCountryMismatch(false);
    } finally {
      setVerifyingReferral(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email) {
      setError(isRTL ? 'يرجى إدخال البريد الإلكتروني' : 'Please enter your email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(isRTL ? 'يرجى إدخال بريد إلكتروني صحيح' : 'Please enter a valid email');
      return;
    }

    setIsLoading(true);
    
    if (usePassword) {
      if (!name) {
        setError(isRTL ? 'يرجى إدخال الاسم' : 'Please enter your name');
        setIsLoading(false);
        return;
      }
      if (!username || username.length < 3) {
        setError(isRTL ? 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل' : 'Username must be at least 3 characters');
        setIsLoading(false);
        return;
      }
      if (!/^[a-z0-9_]+$/.test(username)) {
        setError(isRTL ? 'اسم المستخدم يقبل فقط أحرف وأرقام و _' : 'Username can only contain letters, numbers, and _');
        setIsLoading(false);
        return;
      }
      if (usernameAvailable === false) {
        setError(isRTL ? 'اسم المستخدم مستخدم بالفعل' : 'Username already taken');
        setIsLoading(false);
        return;
      }
      if (!password || password.length < 6) {
        setError(isRTL ? 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' : 'Password must be at least 6 characters');
        setIsLoading(false);
        return;
      }
      if (!selectedCountry) {
        setError(isRTL ? 'يرجى اختيار الدولة' : 'Please select your country');
        setIsLoading(false);
        return;
      }
      if (!selectedCity) {
        setError(isRTL ? 'يرجى اختيار المدينة' : 'Please select your city');
        setIsLoading(false);
        return;
      }
      if (!selectedDistrict) {
        setError(isRTL ? 'يرجى اختيار الحي' : 'Please select your district');
        setIsLoading(false);
        return;
      }

      if (referralCode.trim() && referralCountryMismatch) {
        setError(isRTL ? 'كود الإحالة من دولة مختلفة. يرجى اختيار أحد الاقتراحات أدناه أو تركه فارغاً.' : 'Referral code is from a different country. Please select a suggestion below or leave it empty.');
        setIsLoading(false);
        return;
      }

      // Get country/city names for storage
      const countryData = locationData.find(c => c.code === selectedCountry);
      const cityData = countryData?.cities.find(c => c.code === selectedCity);
      const districtData = cityData?.districts.find(d => d.code === selectedDistrict);
      
      const { data: signUpData, error: authError } = await signUp(email, password, { 
        name,
        username,
        country: countryData?.name || selectedCountry,
        city: cityData?.name || selectedCity,
        district: districtData?.name || selectedDistrict,
        district_code: selectedDistrict,
        referral_code: referralCode.toUpperCase() || null,
      });
      
      if (authError) {
        setIsLoading(false);
        if (authError.message?.includes('already registered')) {
          setEmailAlreadyExists(true);
          setError('');
        } else {
          setEmailAlreadyExists(false);
          setError(isRTL ? 'حدث خطأ أثناء التسجيل' : 'An error occurred during signup');
        }
        return;
      }
      setEmailAlreadyExists(false);
      
      // Process referral code if provided and verified
      const newUserId = signUpData?.user?.id;
      if (newUserId && referralCode.trim() && referralVerified) {
        try {
          await supabase.rpc('process_referral_signup', {
            p_new_user_id: newUserId,
            p_referral_code: referralCode.toUpperCase(),
          });
        } catch (e) {
          console.error('Referral processing failed:', e);
        }
      }
      
      // Success! Trigger the success callback
      const isPioneer = !referralCode.trim() && suggestedReferrers.length === 0 && !loadingSuggestions;
      setIsLoading(false);
      onSignupSuccess?.(name, isPioneer);
    } else {
      const { error: authError } = await signInWithOtp(email);
      setIsLoading(false);
      
      if (authError) {
        setError(isRTL ? 'حدث خطأ أثناء الإرسال. حاول مرة أخرى.' : 'An error occurred. Please try again.');
        return;
      }
      onSendOTP(email);
    }
  };

  const handleSocialSignUp = async (provider: 'google' | 'apple') => {
    setIsLoading(true);
    if (provider === 'google') {
      await signInWithGoogle();
    } else {
      await signInWithApple();
    }
    setIsLoading(false);
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
          {isRTL ? 'إنشاء حساب جديد' : 'Create Account'}
        </h1>
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 px-6 py-6 overflow-y-auto"
      >
        {/* Social Sign Up Buttons */}
        <div className="space-y-3 mb-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSocialSignUp('google')}
            disabled={isLoading}
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
            onClick={() => handleSocialSignUp('apple')}
            disabled={isLoading}
            className="w-full h-12 text-base font-medium gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            {isRTL ? 'إنشاء حساب باستخدام Apple' : 'Sign up with Apple'}
          </Button>
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              {isRTL ? 'أو باستخدام البريد الإلكتروني' : 'or with email'}
            </span>
          </div>
        </div>

        {/* Method Toggle */}
        <div className="flex gap-2 mb-6">
          <Button
            type="button"
            variant={usePassword ? 'default' : 'outline'}
            onClick={() => setUsePassword(true)}
            className="flex-1 h-10"
          >
            <Lock className="w-4 h-4 me-2" />
            {isRTL ? 'كلمة المرور' : 'Password'}
          </Button>
          <Button
            type="button"
            variant={!usePassword ? 'default' : 'outline'}
            onClick={() => setUsePassword(false)}
            className="flex-1 h-10"
          >
            <Mail className="w-4 h-4 me-2" />
            {isRTL ? 'رمز OTP' : 'OTP Code'}
          </Button>
        </div>

        {/* Sign Up Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field - Only for password signup */}
          {usePassword && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-2"
            >
              <Label htmlFor="name" className="text-sm font-medium">
                {isRTL ? 'الاسم الكامل' : 'Full Name'}
              </Label>
              <div className="relative">
                <User className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder={isRTL ? 'أدخل اسمك الكامل' : 'Enter your full name'}
                  className="ps-10 h-12"
                />
              </div>
            </motion.div>
          )}

          {/* Username Field - Only for password signup */}
          {usePassword && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-2"
            >
              <Label htmlFor="username" className="text-sm font-medium">
                {isRTL ? 'اسم المستخدم' : 'Username'}
              </Label>
              <div className="relative">
                <span className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">@</span>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder={isRTL ? 'مثال: ahmed_sa' : 'e.g., ahmed_sa'}
                  className="ps-10 pe-10 h-12"
                  dir="ltr"
                />
                {checkingUsername && (
                  <div className="absolute end-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                )}
                {!checkingUsername && usernameAvailable === true && username.length >= 3 && (
                  <div className="absolute end-3 top-1/2 -translate-y-1/2 text-success">✓</div>
                )}
                {!checkingUsername && usernameAvailable === false && username.length >= 3 && (
                  <div className="absolute end-3 top-1/2 -translate-y-1/2 text-destructive">✗</div>
                )}
              </div>
              {username.length > 0 && username.length < 3 && (
                <p className="text-xs text-muted-foreground">
                  {isRTL ? '3 أحرف على الأقل' : 'At least 3 characters'}
                </p>
              )}
              {usernameAvailable === false && (
                <p className="text-xs text-destructive">
                  {isRTL ? 'اسم المستخدم مستخدم بالفعل' : 'Username already taken'}
                </p>
              )}
              {usernameAvailable === true && username.length >= 3 && (
                <p className="text-xs text-success">
                  {isRTL ? 'اسم المستخدم متاح ✓' : 'Username available ✓'}
                </p>
              )}
            </motion.div>
          )}

          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              {isRTL ? 'البريد الإلكتروني' : 'Email Address'}
            </Label>
            <div className="relative">
              <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={isRTL ? 'أدخل بريدك الإلكتروني' : 'Enter your email'}
                className="ps-10 h-12"
                dir="ltr"
              />
            </div>
          </div>

          {/* Password Field - Only for password signup */}
          {usePassword && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-2"
            >
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
                  placeholder={isRTL ? 'أنشئ كلمة مرور (6 أحرف على الأقل)' : 'Create a password (min 6 chars)'}
                  className="ps-10 pe-10 h-12"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </motion.div>
          )}

          {/* Location Fields - Only for password signup */}
          {usePassword && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4"
            >
              {/* Country */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {isRTL ? 'الدولة' : 'Country'}
                </Label>
                <Select value={selectedCountry} onValueChange={handleCountryChange}>
                  <SelectTrigger className="h-12">
                    <MapPin className="w-4 h-4 me-2 text-muted-foreground" />
                    <SelectValue placeholder={isRTL ? 'اختر الدولة' : 'Select country'} />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {locationData.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        <span className="flex items-center gap-2">
                          <span>{country.flag}</span>
                          <span>{isRTL ? country.nameAr : country.name}</span>
                        </span>
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
                <Select value={selectedCity} onValueChange={handleCityChange} disabled={!selectedCountry}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder={isRTL ? 'اختر المدينة' : 'Select city'} />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {cities.map((city) => (
                      <SelectItem key={city.code} value={city.code}>
                        {isRTL ? city.nameAr : city.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* District */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {isRTL ? 'الحي' : 'District'}
                </Label>
                <Select value={selectedDistrict} onValueChange={setSelectedDistrict} disabled={!selectedCity}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder={isRTL ? 'اختر الحي' : 'Select district'} />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {districts.map((district) => (
                      <SelectItem key={district.code} value={district.code}>
                        {isRTL ? district.nameAr : district.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Referral Code */}
              <div className="space-y-2">
                <Label htmlFor="referral" className="text-sm font-medium">
                  {isRTL ? 'كود الإحالة (اختياري)' : 'Referral Code (optional)'}
                </Label>
                <div className="relative">
                  <Users className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="referral"
                    type="text"
                    value={referralCode}
                    onChange={(e) => {
                      setReferralCode(e.target.value);
                      verifyReferralCode(e.target.value);
                    }}
                    placeholder={isRTL ? 'مثال: WINOVA-ABC123' : 'e.g., WINOVA-ABC123'}
                    className="ps-10 h-12"
                    dir="ltr"
                  />
                </div>
                {verifyingReferral && (
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? 'جارٍ التحقق...' : 'Verifying...'}
                  </p>
                )}

                {/* Pioneer message - no active referrers in this area */}
                {!referralCode.trim() && !referralVerified && selectedCountry && !loadingSuggestions && suggestedReferrers.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border border-primary/20 bg-primary/5 p-3"
                  >
                    <p className="text-sm font-medium text-primary mb-1">
                      {isRTL ? '🌟 ستكون رائداً!' : '🌟 You\'ll be a pioneer!'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isRTL
                        ? selectedDistrict
                          ? `لا يوجد أعضاء نشطون في حيّك حتى الآن — ستكون أول شخص!`
                          : selectedCity
                            ? `لا يوجد أعضاء نشطون في ${districts.length > 0 ? locationData.find(c => c.code === selectedCountry)?.cities.find(ci => ci.code === selectedCity)?.nameAr || 'مدينتك' : 'مدينتك'} حتى الآن — ستكون أول شخص!`
                            : `لا يوجد أعضاء نشطون في ${locationData.find(c => c.code === selectedCountry)?.nameAr || 'بلدك'} حتى الآن — ستكون أول شخص!`
                        : selectedDistrict
                          ? `No active members in your district yet — you'll be the first!`
                          : selectedCity
                            ? `No active members in your city yet — you'll be the first!`
                            : `No active members in ${locationData.find(c => c.code === selectedCountry)?.name || 'your country'} yet — you'll be the first!`
                      }
                    </p>
                  </motion.div>
                )}

                {/* Auto-suggestions when no code entered but country selected */}
                {!referralCode.trim() && !referralVerified && selectedCountry && suggestedReferrers.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border border-border bg-muted/30 p-3 space-y-2"
                  >
                    <p className="text-xs font-medium text-foreground">
                      {isRTL ? 'أنشط الأشخاص في بلدك — اختر مسؤولك:' : 'Top active people in your country — choose your referrer:'}
                    </p>
                    {suggestedReferrers.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setReferralCode(s.referral_code);
                          setReferralCountryMismatch(false);
                          setSuggestedReferrers([]);
                          setReferralVerified({ name: s.name, avatar: s.avatar_url, country: locationData.find(c => c.code === selectedCountry)?.name || selectedCountry });
                        }}
                        className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted/60 transition-colors text-start"
                      >
                        {s.avatar_url ? (
                          <img src={s.avatar_url} alt={s.name} className="w-7 h-7 rounded-full flex-shrink-0" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <User className="w-3 h-3 text-primary" />
                          </div>
                        )}
                        <div className="flex flex-col min-w-0 flex-1">
                          <span className="text-sm font-medium text-foreground truncate">{s.name}</span>
                          {(s.city || s.district) && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {[s.district, s.city].filter(Boolean).join('، ')}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-primary font-mono flex-shrink-0">
                          {isRTL ? 'اختر' : 'Select'}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}

                {/* Referrer found - show info */}
                {referralVerified && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-center gap-2 p-2 rounded-lg border ${
                      referralCountryMismatch
                        ? 'bg-destructive/10 border-destructive/30'
                        : 'bg-primary/10 border-primary/20'
                    }`}
                  >
                    {referralVerified.avatar ? (
                      <img src={referralVerified.avatar} alt={referralVerified.name} className="w-8 h-8 rounded-full flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-foreground">{referralVerified.name}</span>
                      {referralVerified.country && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          {referralVerified.country}
                        </span>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Country mismatch warning */}
                {referralVerified && referralCountryMismatch && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-3"
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-destructive">
                        {isRTL
                          ? `هذا الشخص من ${referralVerified.country}، وأنت من ${locationData.find(c => c.code === selectedCountry)?.name || selectedCountry}. يجب اختيار مسؤول من نفس بلدك — الإحالة بين دول مختلفة غير مسموحة.`
                          : `This person is from ${referralVerified.country}, but you are from ${locationData.find(c => c.code === selectedCountry)?.name || selectedCountry}. Cross-country referrals are not allowed — you must choose a referrer from your country.`}
                      </p>
                    </div>

                    {/* Suggested referrers */}
                    {loadingSuggestions ? (
                      <p className="text-xs text-muted-foreground ps-6">
                        {isRTL ? 'جارٍ البحث عن اقتراحات...' : 'Finding suggestions...'}
                      </p>
                    ) : suggestedReferrers.length > 0 && (
                      <div className="space-y-2 ps-1">
                        <p className="text-xs font-medium text-foreground">
                          {isRTL ? 'أفضل 5 حسابات في بلدك:' : 'Top 5 accounts in your country:'}
                        </p>
                        {suggestedReferrers.map((s, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              setReferralCode(s.referral_code);
                              setReferralCountryMismatch(false);
                              setSuggestedReferrers([]);
                              setReferralVerified({ name: s.name, avatar: s.avatar_url, country: locationData.find(c => c.code === selectedCountry)?.name || selectedCountry });
                            }}
                            className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted/60 transition-colors text-start"
                          >
                            {s.avatar_url ? (
                              <img src={s.avatar_url} alt={s.name} className="w-7 h-7 rounded-full flex-shrink-0" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                                <User className="w-3 h-3 text-primary" />
                              </div>
                            )}
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-sm font-medium text-foreground truncate">{s.name}</span>
                              {(s.city || s.district) && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {[s.district, s.city].filter(Boolean).join('، ')}
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-primary font-mono flex-shrink-0">
                              {isRTL ? 'اختر' : 'Select'}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* Info Note - OTP only */}
          {!usePassword && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              {isRTL ? 'سنرسل لك رمز تحقق مكون من 6 أرقام للتحقق من بريدك' : "We'll send you a 6-digit code to verify your email"}
            </p>
          )}

          {/* Email already exists - offer direct login */}
          {emailAlreadyExists && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-center space-y-2"
            >
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                {isRTL ? 'هذا البريد الإلكتروني مسجّل مسبقاً' : 'This email is already registered'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isRTL ? 'هل تريد تسجيل الدخول بدلاً من ذلك؟' : 'Would you like to sign in instead?'}
              </p>
              <button
                type="button"
                onClick={onLogin}
                className="text-sm font-semibold text-primary hover:underline"
              >
                {isRTL ? 'تسجيل الدخول ←' : '→ Sign In'}
              </button>
            </motion.div>
          )}

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
              ? (isRTL ? 'جارٍ التحميل...' : 'Loading...') 
              : usePassword
                ? (isRTL ? 'إنشاء الحساب' : 'Create Account')
                : (isRTL ? 'إرسال رمز التحقق' : 'Send Verification Code')}
          </Button>
        </form>

        {/* Login Link */}
        <p className="text-center text-sm text-muted-foreground pt-8 pb-6">
          {isRTL ? 'لديك حساب بالفعل؟ ' : 'Already have an account? '}
          <button
            type="button"
            onClick={onLogin}
            className="text-primary font-medium hover:underline"
          >
            {isRTL ? 'تسجيل الدخول' : 'Sign In'}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
