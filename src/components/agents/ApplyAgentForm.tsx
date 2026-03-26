/**
 * ApplyAgentForm — Form to apply as a WeNova agent.
 * Country is read-only (from profile). City/District auto-fill from profile.
 * WhatsApp has a dial-code selector + number input.
 */
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { LocateFixed, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { useBanner } from '@/contexts/BannerContext';
import { useAgents } from '@/hooks/useAgents';
import {
  locationData,
  getCitiesByCountry,
  getDistrictsByCity,
  type City as LocationCity,
  type District,
} from '@/lib/locationData';

interface ApplyAgentFormProps {
  onSuccess: () => void;
}

export function ApplyAgentForm({ onSuccess }: ApplyAgentFormProps) {
  const { language } = useLanguage();
  const { user } = useUser();
  const { success: showSuccess, error: showError } = useBanner();
  const { applyAsAgent, countries: dbCountries, fetchCountries } = useAgents();
  const isRTL = language === 'ar';

  // ── Resolve user's country from locationData ──
  const userCountryData = useMemo(
    () => locationData.find(c => c.name === user.country || c.nameAr === user.country),
    [user.country],
  );

  // ── Cities & districts from locationData ──
  const availableCities = useMemo(
    () => (userCountryData ? getCitiesByCountry(userCountryData.code) : []),
    [userCountryData],
  );

  // ── Auto-fill city from profile ──
  const profileCityCode = useMemo(() => {
    if (!user.city) return '';
    const found = availableCities.find(
      c => c.name === user.city || c.nameAr === user.city,
    );
    return found?.code || '';
  }, [user.city, availableCities]);

  const [selectedCity, setSelectedCity] = useState(profileCityCode);

  // ── Districts ──
  const availableDistricts = useMemo(
    () => (userCountryData && selectedCity ? getDistrictsByCity(userCountryData.code, selectedCity) : []),
    [userCountryData, selectedCity],
  );

  // Auto-fill district from profile
  const profileDistrictCode = useMemo(() => {
    if (!user.district) return '';
    const found = availableDistricts.find(
      d => d.name === user.district || d.nameAr === user.district,
    );
    return found?.code || '';
  }, [user.district, availableDistricts]);

  const [selectedDistrict, setSelectedDistrict] = useState(profileDistrictCode);

  // Sync when profile data loads
  useEffect(() => { setSelectedCity(profileCityCode); }, [profileCityCode]);
  useEffect(() => { setSelectedDistrict(profileDistrictCode); }, [profileDistrictCode]);

  // Reset district when city changes
  useEffect(() => {
    if (selectedCity !== profileCityCode) {
      setSelectedDistrict('');
    }
  }, [selectedCity, profileCityCode]);

  // ── WhatsApp ──
  const dialCodes = useMemo(
    () => locationData.map(c => ({ code: c.code, dial: c.dial, flag: c.flag, name: c.name, nameAr: c.nameAr })),
    [],
  );

  const defaultDial = userCountryData?.dial || '+966';
  const [whatsappDial, setWhatsappDial] = useState(defaultDial);
  const [whatsappNumber, setWhatsappNumber] = useState('');

  // ── Other fields ──
  const [shopName, setShopName] = useState('');
  const [bio, setBio] = useState('');
  const [applyLat, setApplyLat] = useState<number | null>(null);
  const [applyLng, setApplyLng] = useState<number | null>(null);
  const [applying, setApplying] = useState(false);

  // ── GPS ──
  const handleCaptureLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setApplyLat(pos.coords.latitude);
        setApplyLng(pos.coords.longitude);
      },
      () => showError(isRTL ? 'تعذّر الحصول على موقعك' : 'Could not get your location'),
      { timeout: 8000 },
    );
  };

  // ── Submit ──
  const handleApply = async () => {
    if (!shopName.trim()) {
      showError(isRTL ? 'أدخل اسم المحل' : 'Enter shop name');
      return;
    }
    if (!whatsappNumber.trim()) {
      showError(isRTL ? 'أدخل رقم الواتساب' : 'Enter WhatsApp number');
      return;
    }
    if (!selectedCity) {
      showError(isRTL ? 'اختر المدينة' : 'Select a city');
      return;
    }

    setApplying(true);

    const cityData = availableCities.find(c => c.code === selectedCity);
    const districtData = availableDistricts.find(d => d.code === selectedDistrict);
    const fullWhatsapp = whatsappDial + whatsappNumber.replace(/^0+/, '');

    const result = await applyAsAgent({
      shop_name: shopName,
      whatsapp: fullWhatsapp,
      country: user.country || userCountryData?.name || '',
      city: cityData?.name || selectedCity,
      district: districtData?.name || selectedDistrict,
      bio: bio || undefined,
      latitude: applyLat ?? undefined,
      longitude: applyLng ?? undefined,
    });

    setApplying(false);

    if (!result.success) {
      showError(result.error ?? (isRTL ? 'فشل التقديم' : 'Application failed'));
      return;
    }

    showSuccess(isRTL ? '✅ تم إرسال طلبك — سيراجعه الفريق' : '✅ Application submitted for review');
    onSuccess();
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="text-center">
        <p className="text-2xl mb-1">🏪</p>
        <p className="font-bold text-foreground">
          {isRTL ? 'أصبح وكيلاً في WeNova' : 'Become a WeNova Agent'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {isRTL
            ? 'ساعد المستخدمين في شحن وسحب Nova واكسب عمولة على كل عملية'
            : 'Help users deposit/withdraw Nova and earn commission on every operation'}
        </p>
      </div>

      <div className="space-y-2.5">
        {/* Shop name */}
        <Input
          placeholder={isRTL ? 'اسم المحل *' : 'Shop name *'}
          value={shopName}
          onChange={(e) => setShopName(e.target.value)}
          className="h-10"
        />

        {/* Country — read-only */}
        <div className="relative">
          <Input
            value={
              userCountryData
                ? `${userCountryData.flag} ${isRTL ? userCountryData.nameAr : userCountryData.name}`
                : user.country || (isRTL ? 'غير محدد' : 'Not set')
            }
            readOnly
            disabled
            className="h-10 bg-muted/50 cursor-not-allowed"
          />
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {isRTL ? 'البلد محدد من حسابك' : 'Country from your profile'}
          </p>
        </div>

        {/* City dropdown */}
        <Select value={selectedCity} onValueChange={setSelectedCity}>
          <SelectTrigger className="h-10">
            <SelectValue placeholder={isRTL ? 'اختر المدينة *' : 'Select city *'} />
          </SelectTrigger>
          <SelectContent>
            {availableCities.map(c => (
              <SelectItem key={c.code} value={c.code}>
                {isRTL ? c.nameAr : c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* District dropdown */}
        {availableDistricts.length > 0 && (
          <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
            <SelectTrigger className="h-10">
              <SelectValue placeholder={isRTL ? 'اختر الحي' : 'Select district'} />
            </SelectTrigger>
            <SelectContent>
              {availableDistricts.map(d => (
                <SelectItem key={d.code} value={d.code}>
                  {isRTL ? d.nameAr : d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* WhatsApp — dial code + number */}
        <div className="flex gap-2">
          <Select value={whatsappDial} onValueChange={setWhatsappDial}>
            <SelectTrigger className="h-10 w-[120px] shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dialCodes.map(dc => (
                <SelectItem key={dc.code} value={dc.dial}>
                  {dc.flag} {dc.dial}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Phone className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={isRTL ? 'رقم الواتساب *' : 'WhatsApp number *'}
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, ''))}
              className="h-10 ps-9"
              dir="ltr"
              inputMode="tel"
            />
          </div>
        </div>

        {/* Bio */}
        <Input
          placeholder={isRTL ? 'نبذة عنك (اختياري)' : 'Bio (optional)'}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="h-10"
        />

        {/* GPS location */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={`w-full h-9 text-xs gap-1.5 ${applyLat ? 'border-green-500 text-green-600' : ''}`}
          onClick={handleCaptureLocation}
        >
          <LocateFixed className="h-3.5 w-3.5" />
          {applyLat
            ? (isRTL
              ? `✓ تم تحديد موقع المحل (${applyLat.toFixed(3)}, ${applyLng?.toFixed(3)})`
              : `✓ Location set (${applyLat.toFixed(3)}, ${applyLng?.toFixed(3)})`)
            : (isRTL ? 'تحديد موقع المحل 📍 (اختياري)' : 'Pin shop location 📍 (optional)')}
        </Button>
      </div>

      <Button
        className="w-full h-11 font-bold"
        onClick={handleApply}
        disabled={applying}
      >
        {applying
          ? <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
          : (isRTL ? 'قدّم طلبك الآن' : 'Submit Application')}
      </Button>
    </Card>
  );
}
