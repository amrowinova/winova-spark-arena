/**
 * FamilyRegister — Submit a new family registration request.
 * Fields: head_name, country, city, story, members_count, photos (URLs)
 * Backend: submit_family_request RPC → creates family_request with status=pending
 * Admin reviews in AdminFamilies page.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Heart, Users, MapPin, Image, Send, CheckCircle2, Loader2, Plus, X } from 'lucide-react';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBanner } from '@/contexts/BannerContext';
import { supabase } from '@/integrations/supabase/client';

export default function FamilyRegister() {
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { success: showSuccess, error: showError } = useBanner();
  const isRTL = language === 'ar' || language === 'ur';

  const [form, setForm] = useState({
    head_name: '',
    country: '',
    city: '',
    story: '',
    members_count: 1,
    contact_phone: '',
  });
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: keyof typeof form, v: string | number) =>
    setForm((p) => ({ ...p, [k]: v }));

  const addPhoto = () => {
    const url = newPhotoUrl.trim();
    if (!url) return;
    if (photoUrls.length >= 5) {
      showError(t('familyRegister.maxPhotos'));
      return;
    }
    setPhotoUrls((p) => [...p, url]);
    setNewPhotoUrl('');
  };

  const removePhoto = (i: number) =>
    setPhotoUrls((p) => p.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    if (!form.head_name.trim() || !form.country.trim() || !form.city.trim() || !form.story.trim()) {
      showError(t('familyRegister.fillRequired'));
      return;
    }
    if (form.story.trim().length < 50) {
      showError(t('familyRegister.storyTooShort'));
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('submit_family_request', {
        p_head_name:     form.head_name.trim(),
        p_country:       form.country.trim(),
        p_city:          form.city.trim(),
        p_story:         form.story.trim(),
        p_members_count: form.members_count,
        p_contact_phone: form.contact_phone.trim() || null,
        p_photo_urls:    photoUrls,
      });

      if (error) throw error;
      const result = data as { success: boolean; error?: string };
      if (!result.success) throw new Error(result.error);

      setDone(true);
      showSuccess(t('familyRegister.submitSuccess'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('common.error');
      showError(msg.includes('pending') ? t('familyRegister.alreadyPending') : msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-background pb-24" dir={isRTL ? 'rtl' : 'ltr'}>
        <InnerPageHeader title={t('familyRegister.title')} />
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center space-y-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }}>
            <CheckCircle2 className="h-20 w-20 text-green-500 mx-auto" />
          </motion.div>
          <h2 className="text-xl font-bold">{t('familyRegister.successTitle')}</h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
            {t('familyRegister.successDesc')}
          </p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24" dir={isRTL ? 'rtl' : 'ltr'}>
      <InnerPageHeader title={t('familyRegister.title')} />

      <main className="px-4 pt-4 pb-8 space-y-4">
        {/* Hero */}
        <div className="rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 p-5 text-white text-center">
          <Heart className="h-8 w-8 mx-auto mb-2 fill-white" />
          <p className="font-bold text-base">{t('familyRegister.heroTitle')}</p>
          <p className="text-white/80 text-sm mt-1">{t('familyRegister.heroDesc')}</p>
        </div>

        {/* Form */}
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Head name */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                {t('familyRegister.headName')} <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.head_name}
                onChange={(e) => set('head_name', e.target.value)}
                placeholder={t('familyRegister.headNamePlaceholder')}
                maxLength={100}
              />
            </div>

            {/* Country + City */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                  {t('familyRegister.country')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.country}
                  onChange={(e) => set('country', e.target.value)}
                  placeholder={t('familyRegister.countryPlaceholder')}
                  maxLength={60}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">{t('familyRegister.city')} <span className="text-destructive">*</span></Label>
                <Input
                  value={form.city}
                  onChange={(e) => set('city', e.target.value)}
                  placeholder={t('familyRegister.cityPlaceholder')}
                  maxLength={60}
                />
              </div>
            </div>

            {/* Members count */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t('familyRegister.membersCount')}</Label>
              <div className="flex items-center gap-3">
                <Button
                  type="button" variant="outline" size="icon" className="h-9 w-9"
                  onClick={() => set('members_count', Math.max(1, form.members_count - 1))}
                >−</Button>
                <span className="text-lg font-bold w-8 text-center">{form.members_count}</span>
                <Button
                  type="button" variant="outline" size="icon" className="h-9 w-9"
                  onClick={() => set('members_count', Math.min(20, form.members_count + 1))}
                >+</Button>
              </div>
            </div>

            {/* Story */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                {t('familyRegister.story')} <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={form.story}
                onChange={(e) => set('story', e.target.value)}
                placeholder={t('familyRegister.storyPlaceholder')}
                rows={5}
                maxLength={1000}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-end">{form.story.length}/1000</p>
            </div>

            {/* Contact phone (optional) */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t('familyRegister.contactPhone')}</Label>
              <Input
                value={form.contact_phone}
                onChange={(e) => set('contact_phone', e.target.value)}
                placeholder={t('familyRegister.contactPhonePlaceholder')}
                type="tel"
                maxLength={20}
              />
            </div>

            {/* Photo URLs */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Image className="h-3.5 w-3.5 text-muted-foreground" />
                {t('familyRegister.photos')}
                <span className="text-xs text-muted-foreground font-normal">({t('familyRegister.photosMax')})</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  value={newPhotoUrl}
                  onChange={(e) => setNewPhotoUrl(e.target.value)}
                  placeholder={t('familyRegister.photoUrlPlaceholder')}
                  className="flex-1"
                  onKeyDown={(e) => e.key === 'Enter' && addPhoto()}
                />
                <Button type="button" size="icon" variant="outline" onClick={addPhoto}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {photoUrls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {photoUrls.map((url, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={url}
                        alt=""
                        className="h-16 w-20 object-cover rounded-lg border border-border"
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80x64?text=?'; }}
                      />
                      <button
                        onClick={() => removePhoto(i)}
                        className="absolute -top-1 -end-1 h-5 w-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Button
          className="w-full h-12 gap-2 font-bold"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Send className="h-4 w-4" />
              {t('familyRegister.submit')}
            </>
          )}
        </Button>

        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          {t('familyRegister.disclaimer')}
        </p>
      </main>

      <BottomNav />
    </div>
  );
}
