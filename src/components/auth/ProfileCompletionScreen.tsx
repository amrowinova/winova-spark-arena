import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
import { ArrowLeft, ArrowRight, User, MapPin, Gift, Lock, Info, CheckCircle2, AlertCircle, Globe } from 'lucide-react';
import { locationData, getCitiesByCountry, getDistrictsByCity, type City, type District } from '@/lib/locationData';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AssignedLeaderDialog } from './AssignedLeaderDialog';

interface ProfileCompletionScreenProps {
  email: string;
  onBack: () => void;
  onComplete: () => void;
}

interface Referrer {
  name: string;
  avatar_url: string | null;
  id: string;
}

interface AssignedLeader {
  name: string;
  username: string;
  rank: string;
  avatar_url?: string | null;
  reason: string;
}

export function ProfileCompletionScreen({ email, onBack, onComplete }: ProfileCompletionScreenProps) {
  const { language } = useLanguage();
  const { user, signUp } = useAuth();
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
  const [referrer, setReferrer] = useState<Referrer | null>(null);
  const [referrerCountry, setReferrerCountry] = useState('');
  const [referralCountryMismatch, setReferralCountryMismatch] = useState(false);
  const [isCheckingReferral, setIsCheckingReferral] = useState(false);
  const [suggestedReferrers, setSuggestedReferrers] = useState<Array<{
    name: string;
    avatar_url: string | null;
    referral_code: string;
    city: string | null;
    district: string | null;
  }>>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  
  // Password state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Leader assignment state
  const [assignedLeader, setAssignedLeader] = useState<AssignedLeader | null>(null);
  const [showLeaderDialog, setShowLeaderDialog] = useState(false);

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

  // Fetch top suggested referrers from user's country/city/district
  const fetchSuggestedReferrers = async (countryName: string) => {
    if (!countryName) return;
    setLoadingSuggestions(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('name, avatar_url, referral_code, city, district')
        .eq('country', countryName)
        .not('referral_code', 'is', null)
        .eq('weekly_active', true)
        .order('spotlight_points', { ascending: false })
        .limit(5);
      setSuggestedReferrers(data || []);
    } catch {
      setSuggestedReferrers([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Re-check mismatch when country changes
  useEffect(() => {
    if (!country) return;
    const countryData = locationData.find(c => c.code === country);
    const userCountryName = countryData?.name || country;

    if (referrer && referrerCountry) {
      const mismatch = referrerCountry !== userCountryName;
      setReferralCountryMismatch(mismatch);
      if (mismatch) {
        fetchSuggestedReferrers(userCountryName);
      } else {
        setSuggestedReferrers([]);
      }
    } else if (!referralCode.trim()) {
      fetchSuggestedReferrers(userCountryName);
    }
  }, [country]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check referral code against database (with country)
  useEffect(() => {
    if (referralCode.length >= 6) {
      setIsCheckingReferral(true);
      const timer = setTimeout(async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('id, name, avatar_url, country')
            .eq('referral_code', referralCode.toUpperCase())
            .maybeSingle();

          if (data && !error) {
            setReferrer({ id: data.id, name: data.name, avatar_url: data.avatar_url });
            setReferrerCountry(data.country || '');

            // Check mismatch against selected country
            if (country) {
              const countryData = locationData.find(c => c.code === country);
              const userCountryName = countryData?.name || country;
              const mismatch = (data.country || '') !== userCountryName;
              setReferralCountryMismatch(mismatch);
              if (mismatch) {
                fetchSuggestedReferrers(userCountryName);
              } else {
                setSuggestedReferrers([]);
              }
            }
          } else {
            setReferrer(null);
            setReferrerCountry('');
            setReferralCountryMismatch(false);
          }
        } catch {
          setReferrer(null);
          setReferrerCountry('');
          setReferralCountryMismatch(false);
        }
        setIsCheckingReferral(false);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setReferrer(null);
      setReferrerCountry('');
      setReferralCountryMismatch(false);
    }
  }, [referralCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validation
    if (!fullName.trim()) {
      setError(isRTL ? 'يرجى إدخال الاسم الكامل' : 'Please enter your full name');
      return;
    }

    if (fullName.trim().length > 60) {
      setError(isRTL ? 'الاسم طويل جداً (60 حرفاً كحد أقصى)' : 'Name is too long (max 60 characters)');
      return;
    }

    // Location is always required
    if (!country || !city || !area) {
      setError(isRTL ? 'يرجى اختيار الدولة والمدينة والحي' : 'Please select your country, city, and district');
      return;
    }

    // Block cross-country referral codes
    if (referralCode.trim() && referralCountryMismatch) {
      setError(isRTL
        ? 'كود الإحالة من دولة مختلفة. اختر أحد الاقتراحات أدناه أو اتركه فارغاً.'
        : 'Referral code is from a different country. Choose a suggestion below or leave it empty.');
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
    
    try {
      // Generate username from name (clean, no random suffix)
      const baseUsername = fullName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
      const username = baseUsername || 'user' + Date.now().toString(36);
      
      // Get country/city/district names
      const countryData = locationData.find(c => c.code === country);
      const cityData = availableCities.find(c => c.code === city);
      const districtData = availableDistricts.find(d => d.code === area);
      
      const countryName = countryData?.name || country || 'Saudi Arabia';
      const cityName = cityData?.name || city || '';
      const districtName = districtData?.name || area || '';
      
      // Sign up the user with password - include location + referral in metadata
      const { data: signUpData, error: signUpError } = await signUp(email, password, {
        name: fullName,
        username,
        country: countryName,
        city: cityName,
        district: districtName,
        referral_code: referralCode || null,
      });

      if (signUpError) {
        setError(isRTL ? 'حدث خطأ أثناء إنشاء الحساب' : 'An error occurred while creating account');
        setIsLoading(false);
        return;
      }

      // If signup succeeded, we need to call assign_upline_auto to ensure proper team linking
      // The trigger should do this, but we call it explicitly to get the leader info for display
      const newUserId = signUpData?.user?.id;
      
      if (newUserId) {
        // Call assign_upline_auto to get leader info (also ensures team link is created)
        const { data: assignResult } = await supabase.rpc('assign_upline_auto', {
          p_new_user_id: newUserId,
          p_country: countryName,
          p_city: cityName,
          p_district: districtName,
          p_referral_code: referralCode || null
        });

        // If we got a leader back (either from referral or auto-assignment), show the dialog
        if (assignResult && (assignResult as any).success) {
          const leaderInfo = assignResult as any;
          setAssignedLeader({
            name: leaderInfo.upline_name || 'Leader',
            username: leaderInfo.upline_username || 'leader',
            rank: leaderInfo.upline_rank || 'subscriber',
            avatar_url: leaderInfo.upline_avatar_url,
            reason: leaderInfo.reason || 'fallback_any_user'
          });
          setShowLeaderDialog(true);
          setIsLoading(false);
          return; // Don't call onComplete yet - wait for dialog
        }
      }

      onComplete();
    } catch (err) {
      console.error('Signup error:', err);
      setError(isRTL ? 'حدث خطأ غير متوقع' : 'An unexpected error occurred');
    }
    
    setIsLoading(false);
  };
  
  const handleLeaderDialogClose = () => {
    setShowLeaderDialog(false);
    onComplete();
  };

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  // Location is always required
  const locationRequired = true;

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

          {/* Pioneer message - no one in this area yet */}
          {!referralCode.trim() && !referrer && country && !loadingSuggestions && suggestedReferrers.length === 0 && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-primary/20 bg-primary/5 p-3">
              <p className="text-sm font-medium text-primary mb-1">
                {isRTL ? '🌟 ستكون رائداً!' : '🌟 You\'ll be a pioneer!'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isRTL
                  ? area
                    ? `لا يوجد أعضاء نشطون في ${locationData.find(c => c.code === country)?.cities.find(ci => ci.code === city)?.districts.find(d => d.code === area)?.nameAr || 'حيّك'} حتى الآن — ستكون أول شخص!`
                    : city
                      ? `لا يوجد أعضاء نشطون في ${availableCities.find(c => c.code === city)?.nameAr || 'مدينتك'} حتى الآن — ستكون أول شخص!`
                      : `لا يوجد أعضاء نشطون في ${locationData.find(c => c.code === country)?.nameAr || 'بلدك'} حتى الآن — ستكون أول شخص!`
                  : area
                    ? `No active members in your district yet — you'll be the first!`
                    : city
                      ? `No active members in ${availableCities.find(c => c.code === city)?.name || 'your city'} yet — you'll be the first!`
                      : `No active members in ${locationData.find(c => c.code === country)?.name || 'your country'} yet — you'll be the first!`
                }
              </p>
            </motion.div>
          )}

          {/* Auto suggestions when country selected and no code entered */}
          {!referralCode.trim() && !referrer && country && suggestedReferrers.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <p className="text-xs font-medium text-foreground">
                {isRTL ? 'أنشط الأشخاص في بلدك — اختر مسؤولك:' : 'Top active people in your country:'}
              </p>
              {suggestedReferrers.map((s, i) => (
                <button key={i} type="button"
                  onClick={() => {
                    setReferralCode(s.referral_code);
                    setReferralCountryMismatch(false);
                    setSuggestedReferrers([]);
                    const countryData = locationData.find(c => c.code === country);
                    setReferrer({ id: '', name: s.name, avatar_url: s.avatar_url });
                    setReferrerCountry(countryData?.name || country);
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted/60 transition-colors text-start">
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    <AvatarImage src={s.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">{s.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-sm font-medium truncate">{s.name}</span>
                    {(s.city || s.district) && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />{[s.district, s.city].filter(Boolean).join('، ')}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-primary flex-shrink-0">{isRTL ? 'اختر' : 'Select'}</span>
                </button>
              ))}
            </motion.div>
          )}

          {/* Referrer found - valid */}
          {referrer && !referralCountryMismatch && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
              <Avatar className="h-10 w-10">
                <AvatarImage src={referrer.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">{referrer.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{referrer.name}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Globe className="w-3 h-3" />{referrerCountry}
                </p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-primary" />
            </motion.div>
          )}

          {/* Country mismatch warning */}
          {referrer && referralCountryMismatch && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                <p className="text-sm text-destructive">
                  {isRTL
                    ? `هذا الشخص من ${referrerCountry}، وأنت من ${locationData.find(c => c.code === country)?.nameAr || country}. الإحالة بين دول مختلفة غير مسموحة.`
                    : `This person is from ${referrerCountry}, but you are from ${locationData.find(c => c.code === country)?.name || country}. Cross-country referrals are not allowed.`}
                </p>
              </div>
              {loadingSuggestions && (
                <p className="text-xs text-muted-foreground ps-6">{isRTL ? 'جارٍ البحث...' : 'Searching...'}</p>
              )}
              {!loadingSuggestions && suggestedReferrers.length > 0 && (
                <div className="space-y-2 ps-1">
                  <p className="text-xs font-medium">{isRTL ? 'أفضل 5 حسابات في بلدك:' : 'Top 5 in your country:'}</p>
                  {suggestedReferrers.map((s, i) => (
                    <button key={i} type="button"
                      onClick={() => {
                        setReferralCode(s.referral_code);
                        setReferralCountryMismatch(false);
                        setSuggestedReferrers([]);
                        const countryData = locationData.find(c => c.code === country);
                        setReferrer({ id: '', name: s.name, avatar_url: s.avatar_url });
                        setReferrerCountry(countryData?.name || country);
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted/60 transition-colors text-start">
                      <Avatar className="h-7 w-7 flex-shrink-0">
                        <AvatarImage src={s.avatar_url || undefined} />
                        <AvatarFallback className="text-xs">{s.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-sm font-medium truncate">{s.name}</span>
                        {(s.city || s.district) && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{[s.district, s.city].filter(Boolean).join('، ')}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-primary flex-shrink-0">{isRTL ? 'اختر' : 'Select'}</span>
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {referralCode.length >= 6 && !referrer && !isCheckingReferral && (
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
            <span className="text-destructive">*</span>
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
      
      {/* Assigned Leader Dialog */}
      <AssignedLeaderDialog 
        open={showLeaderDialog}
        onClose={handleLeaderDialogClose}
        leader={assignedLeader}
      />
    </div>
  );
}
