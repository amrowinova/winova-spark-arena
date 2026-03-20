import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Shield, Clock, XCircle } from 'lucide-react';
import { useKYC } from '@/hooks/useKYC';

interface KYCStatusBannerProps {
  /** If true, renders a full blocking overlay instead of a banner */
  blocking?: boolean;
}

/**
 * Shows a banner when the user is not KYC-verified.
 * Place it at the top of pages that require verification (Wallet transfers, P2P).
 */
export function KYCStatusBanner({ blocking = false }: KYCStatusBannerProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const navigate = useNavigate();
  const { kycStatus, isLoading, isVerified } = useKYC();

  if (isLoading || isVerified) return null;

  const isPending  = kycStatus === 'pending';
  const isRejected = kycStatus === 'rejected';

  const icon = isPending
    ? <Clock className="w-5 h-5 text-blue-500 shrink-0" />
    : isRejected
    ? <XCircle className="w-5 h-5 text-destructive shrink-0" />
    : <Shield className="w-5 h-5 text-orange-500 shrink-0" />;

  const title = isPending
    ? (isRTL ? 'طلب التحقق قيد المراجعة' : 'Verification Under Review')
    : isRejected
    ? (isRTL ? 'تم رفض طلب التحقق' : 'Verification Rejected')
    : (isRTL ? 'حسابك غير موثق' : 'Account Not Verified');

  const description = isPending
    ? (isRTL
        ? 'سيتم مراجعة هويتك خلال 24-48 ساعة.'
        : 'Your ID is being reviewed. Usually within 24-48 hours.')
    : isRejected
    ? (isRTL
        ? 'يرجى إعادة تقديم طلب التحقق.'
        : 'Please resubmit your verification request.')
    : (isRTL
        ? 'التحقق مطلوب لإجراء العمليات المالية.'
        : 'Verification required for financial operations.');

  const bgClass = isPending
    ? 'bg-blue-50 border-blue-200'
    : isRejected
    ? 'bg-red-50 border-red-200'
    : 'bg-orange-50 border-orange-200';

  if (blocking) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 gap-4 text-center">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
          isPending ? 'bg-blue-100' : isRejected ? 'bg-red-100' : 'bg-orange-100'
        }`}>
          <span className="scale-150">{icon}</span>
        </div>
        <div>
          <p className="font-bold text-base">{title}</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs">{description}</p>
        </div>
        {!isPending && (
          <Button size="sm" onClick={() => navigate('/kyc')}>
            {isRTL ? 'توثيق الحساب' : 'Verify Account'}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border mb-4 ${bgClass}`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-tight">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      {!isPending && (
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 h-7 text-xs"
          onClick={() => navigate('/kyc')}
        >
          {isRTL ? 'توثيق' : 'Verify'}
        </Button>
      )}
    </div>
  );
}
