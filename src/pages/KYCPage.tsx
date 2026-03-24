import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Shield, CheckCircle2, Clock, XCircle, Upload,
  AlertTriangle, FileImage, User, Calendar,
} from 'lucide-react';
import { useKYC, KYCStatus } from '@/hooks/useKYC';
import { toast } from 'sonner';

// ── Status display config ─────────────────────────────────────────────────────
const STATUS_CONFIG: Record<KYCStatus, {
  icon: React.ReactNode;
  labelAr: string;
  labelEn: string;
  color: string;
  bgColor: string;
}> = {
  unverified: {
    icon: <AlertTriangle className="w-5 h-5" />,
    labelAr: 'غير موثق',
    labelEn: 'Unverified',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50 border-orange-200',
  },
  pending: {
    icon: <Clock className="w-5 h-5" />,
    labelAr: 'قيد المراجعة',
    labelEn: 'Under Review',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 border-blue-200',
  },
  verified: {
    icon: <CheckCircle2 className="w-5 h-5" />,
    labelAr: 'موثق',
    labelEn: 'Verified',
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200',
  },
  rejected: {
    icon: <XCircle className="w-5 h-5" />,
    labelAr: 'مرفوض',
    labelEn: 'Rejected',
    color: 'text-destructive',
    bgColor: 'bg-red-50 border-red-200',
  },
};

export default function KYCPage() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const navigate = useNavigate();

  const { kycStatus, latestRequest, isLoading, isVerified, isPending, submitKYC } = useKYC();

  const [fullName, setFullName]       = useState('');
  const [birthDate, setBirthDate]     = useState('');
  const [imageFile, setImageFile]     = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError]     = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setFormError(isRTL ? 'حجم الصورة يجب أن يكون أقل من 5 ميغابايت' : 'Image must be under 5 MB');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setFormError(null);
  }, [isRTL]);

  const validate = useCallback((): string | null => {
    if (!fullName.trim() || fullName.trim().length < 3)
      return isRTL ? 'يرجى إدخال الاسم الكامل (3 أحرف على الأقل)' : 'Please enter your full name (min 3 characters)';
    if (!birthDate)
      return isRTL ? 'يرجى إدخال تاريخ الميلاد' : 'Please enter your date of birth';
    const age = (Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (age < 18)
      return isRTL ? 'يجب أن يكون عمرك 18 سنة أو أكثر' : 'You must be at least 18 years old';
    if (!imageFile)
      return isRTL ? 'يرجى رفع صورة الهوية' : 'Please upload your ID photo';
    return null;
  }, [fullName, birthDate, imageFile, isRTL]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setFormError(err); return; }

    setIsSubmitting(true);
    setFormError(null);
    const { error } = await submitKYC({
      fullName: fullName.trim(),
      birthDate,
      idImageFile: imageFile!,
    });
    setIsSubmitting(false);

    if (error) {
      setFormError(error);
    } else {
      toast.success(isRTL ? 'تم إرسال طلب التحقق بنجاح' : 'Verification request submitted');
    }
  }, [validate, submitKYC, fullName, birthDate, imageFile, isRTL]);

  const config = STATUS_CONFIG[kycStatus];

  // ── Verified state ────────────────────────────────────────────────────────
  if (!isLoading && isVerified) {
    return (
      <div className="min-h-screen bg-background">
        <InnerPageHeader title={isRTL ? 'التحقق من الهوية' : 'Identity Verification'} />
        <div className="p-4 pb-24 flex flex-col items-center justify-center gap-4 mt-8">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-green-600">
            {isRTL ? 'حسابك موثق ✓' : 'Account Verified ✓'}
          </h2>
          <p className="text-muted-foreground text-sm text-center max-w-xs">
            {isRTL
              ? 'تم التحقق من هويتك بنجاح. يمكنك الآن استخدام جميع خدمات المنصة.'
              : 'Your identity has been verified. You can now use all platform services.'}
          </p>
          <Button onClick={() => navigate('/wallet')} className="mt-2">
            {isRTL ? 'الذهاب للمحفظة' : 'Go to Wallet'}
          </Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  // ── Pending state ─────────────────────────────────────────────────────────
  if (!isLoading && isPending) {
    return (
      <div className="min-h-screen bg-background">
        <InnerPageHeader title={isRTL ? 'التحقق من الهوية' : 'Identity Verification'} />
        <div className="p-4 pb-24 flex flex-col items-center justify-center gap-4 mt-8">
          <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center">
            <Clock className="w-10 h-10 text-blue-500" />
          </div>
          <h2 className="text-xl font-bold text-blue-600">
            {isRTL ? 'طلبك قيد المراجعة' : 'Under Review'}
          </h2>
          <p className="text-muted-foreground text-sm text-center max-w-xs">
            {isRTL
              ? 'تم استلام طلبك وسيتم مراجعته خلال 24-48 ساعة. سنُرسل لك إشعاراً عند الانتهاء.'
              : 'Your request has been received and will be reviewed within 24-48 hours. You will be notified.'}
          </p>
          {latestRequest && (
            <Card className="w-full max-w-sm p-4 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{isRTL ? 'الاسم:' : 'Name:'}</span>
                <span className="font-medium">{latestRequest.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{isRTL ? 'تاريخ الإرسال:' : 'Submitted:'}</span>
                <span>{new Date(latestRequest.submitted_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}</span>
              </div>
            </Card>
          )}
        </div>
        <BottomNav />
      </div>
    );
  }

  // ── Form (unverified / rejected) ──────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <InnerPageHeader title={isRTL ? 'التحقق من الهوية' : 'Identity Verification'} />

      <div className="p-4 pb-28 space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>

        {/* Status badge */}
        <div className={`flex items-center gap-2 p-3 rounded-lg border ${config.bgColor}`}>
          <span className={config.color}>{config.icon}</span>
          <div>
            <p className={`font-semibold text-sm ${config.color}`}>
              {isRTL ? config.labelAr : config.labelEn}
            </p>
             {kycStatus === 'rejected' && (latestRequest as any)?.admin_notes && (
              <p className="text-xs text-muted-foreground mt-0.5">
                {isRTL ? 'سبب الرفض: ' : 'Reason: '}{(latestRequest as any).admin_notes}
              </p>
            )}
          </div>
        </div>

        {/* Info card */}
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2 font-semibold">
            <Shield className="w-4 h-4 text-primary" />
            {isRTL ? 'لماذا نطلب التحقق؟' : 'Why do we need verification?'}
          </div>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>{isRTL ? 'حماية حسابك من الاحتيال' : 'Protect your account from fraud'}</li>
            <li>{isRTL ? 'الامتثال للمتطلبات القانونية' : 'Legal compliance requirements'}</li>
            <li>{isRTL ? 'تفعيل تحويل Nova والتداول P2P' : 'Enable Nova transfers and P2P trading'}</li>
          </ul>
        </Card>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full name */}
          <div className="space-y-1.5">
            <Label htmlFor="kyc-name" className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" />
              {isRTL ? 'الاسم الكامل كما في الهوية' : 'Full name as on ID'}
            </Label>
            <Input
              id="kyc-name"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder={isRTL ? 'مثال: محمد أحمد الزهراني' : 'e.g. Mohammed Al-Zahrani'}
              disabled={isSubmitting}
            />
          </div>

          {/* Date of birth */}
          <div className="space-y-1.5">
            <Label htmlFor="kyc-dob" className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {isRTL ? 'تاريخ الميلاد (يجب 18+ سنة)' : 'Date of birth (must be 18+)'}
            </Label>
            <Input
              id="kyc-dob"
              type="date"
              value={birthDate}
              onChange={e => setBirthDate(e.target.value)}
              max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
              disabled={isSubmitting}
            />
          </div>

          {/* ID image upload */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <FileImage className="w-3.5 h-3.5" />
              {isRTL ? 'صورة الهوية الوطنية أو جواز السفر' : 'National ID or passport photo'}
            </Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageChange}
              className="hidden"
            />
            {imagePreview ? (
              <div className="relative rounded-lg overflow-hidden border">
                <img
                  src={imagePreview}
                  alt="ID preview"
                  className="w-full h-40 object-cover"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="absolute bottom-2 right-2 bg-background"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                >
                  {isRTL ? 'تغيير الصورة' : 'Change photo'}
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting}
                className="w-full h-32 rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
              >
                <Upload className="w-8 h-8" />
                <span className="text-sm">{isRTL ? 'اضغط لرفع صورة الهوية' : 'Tap to upload ID photo'}</span>
                <span className="text-xs">{isRTL ? 'JPEG، PNG — حتى 5MB' : 'JPEG, PNG — up to 5 MB'}</span>
              </button>
            )}
          </div>

          {/* Error */}
          {formError && (
            <Alert variant="destructive" className="py-2">
              <AlertTriangle className="w-4 h-4" />
              <AlertDescription className="text-sm">{formError}</AlertDescription>
            </Alert>
          )}

          {/* Privacy note */}
          <p className="text-xs text-muted-foreground text-center">
            {isRTL
              ? 'بياناتك محمية ومشفرة. يطّلع عليها فريق التحقق فقط.'
              : 'Your data is encrypted and only seen by our verification team.'}
          </p>

          {/* Submit */}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
            size="lg"
          >
            {isSubmitting
              ? (isRTL ? 'جارٍ الإرسال...' : 'Submitting...')
              : (isRTL ? 'إرسال طلب التحقق' : 'Submit Verification Request')}
          </Button>
        </form>
      </div>

      <BottomNav />
    </div>
  );
}
