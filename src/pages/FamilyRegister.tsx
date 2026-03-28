/**
 * FamilyRegister — Submit a new family registration request.
 * Fields: head_name, country, city, story, members_count, photos (URLs)
 * Backend: submit_family_request RPC → creates family_request with status=pending
 * Admin reviews in AdminFamilies page.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Heart, Users, MapPin, Image, Send, CheckCircle2, Loader2, Plus, X, Upload, Camera } from 'lucide-react';
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
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [uploading, setUploading] = useState(false);

  const set = (k: keyof typeof form, v: string | number) =>
    setForm((p) => ({ ...p, [k]: v }));

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    
    // Check total photos limit
    if (photoUrls.length + files.length > 3) {
      showError(isRTL ? 'الحد الأقصى 3 صور' : 'Maximum 3 photos allowed');
      return;
    }

    setUploading(true);
    
    try {
      const uploadPromises = files.map(async (file) => {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          throw new Error(isRTL ? 'يرجى اختيار ملفات صور فقط' : 'Please select image files only');
        }
        
        // Validate file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error(isRTL ? 'حجم الصورة يجب أن يكون أقل من 5 ميجابايت' : 'Image size must be less than 5MB');
        }

        // Generate unique filename
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `family-photos/${fileName}`;

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('family-media')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('family-media')
          .getPublicUrl(filePath);

        return urlData.publicUrl;
      });

      const urls = await Promise.all(uploadPromises);
      setPhotoUrls(prev => [...prev, ...urls]);
      setUploadedFiles(prev => [...prev, ...files]);
      showSuccess(isRTL ? 'تم رفع الصور بنجاح' : 'Photos uploaded successfully');
      
    } catch (error) {
      console.error('Upload error:', error);
      showError(error instanceof Error ? error.message : (isRTL ? 'فشل رفع الصور' : 'Failed to upload photos'));
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setPhotoUrls(prev => prev.filter((_, i) => i !== index));
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const addPhoto = () => {
    const url = newPhotoUrl.trim();
    if (!url) return;
    if (photoUrls.length >= 3) {
      showError(isRTL ? 'الحد الأقصى 3 صور' : 'Maximum 3 photos allowed');
      return;
    }
    setPhotoUrls((p) => [...p, url]);
    setNewPhotoUrl('');
  };

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
      // Insert directly into family_requests table for now
      const { data, error } = await supabase
        .from('family_requests')
        .insert({
          head_name: form.head_name.trim(),
          country: form.country.trim(),
          city: form.city.trim(),
          story: form.story.trim(),
          members_count: form.members_count,
          contact_phone: form.contact_phone.trim() || null,
          photo_urls: photoUrls,
          status: 'pending',
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;

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
                <span className="text-xs text-muted-foreground font-normal">({isRTL ? 'الحد الأقصى 3 صور' : 'Max 3 photos'})</span>
              </Label>
              
              {/* File Upload Button */}
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4">
                <input
                  type="file"
                  id="photo-upload"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading || photoUrls.length >= 3}
                />
                <label
                  htmlFor="photo-upload"
                  className={`flex flex-col items-center justify-center cursor-pointer ${
                    uploading || photoUrls.length >= 3 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-muted/50'
                  } transition-colors`}
                >
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">
                    {uploading ? (isRTL ? 'جاري الرفع...' : 'Uploading...') : 
                     photoUrls.length >= 3 ? (isRTL ? 'تم الوصول للحد الأقصى' : 'Maximum reached') :
                     (isRTL ? 'انقر لرفع الصور' : 'Click to upload photos')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isRTL ? 'JPG, PNG, GIF (حتى 5MB)' : 'JPG, PNG, GIF (up to 5MB)'}
                  </p>
                </label>
              </div>

              {/* Manual URL Input (fallback) */}
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
