import { useState, useEffect, useRef } from 'react';
import { Download, Share2 } from 'lucide-react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { getCountryFlag } from '@/lib/countryFlags';
import { useBanner } from '@/contexts/BannerContext';

interface PaymentQRDialogProps {
  open: boolean;
  onClose: () => void;
}

export function PaymentQRDialog({ open, onClose }: PaymentQRDialogProps) {
  const { user } = useUser();
  const { language } = useLanguage();
  const { success: showSuccess } = useBanner();
  const isRTL = language === 'ar';
  const cardRef = useRef<HTMLDivElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  const paymentLink = `${window.location.origin}/pay/${user.username}`;

  useEffect(() => {
    if (!open) return;

    QRCode.toDataURL(paymentLink, {
      width: 220,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }).then(setQrDataUrl).catch(console.error);
  }, [open, paymentLink]);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      const { default: html2canvas } = await import('html2canvas');
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 3,
        useCORS: true,
      });
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `winova-${user.username}-qr.png`;
      a.click();
    } catch {
      // Fallback: download just the QR
      if (!qrDataUrl) return;
      const a = document.createElement('a');
      a.href = qrDataUrl;
      a.download = `winova-${user.username}-qr.png`;
      a.click();
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: isRTL ? `ادفع لـ ${user.name}` : `Pay ${user.name}`,
          text: isRTL ? `أرسل Nova إلى @${user.username}` : `Send Nova to @${user.username}`,
          url: paymentLink,
        });
      } catch {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(paymentLink);
      showSuccess(isRTL ? 'تم نسخ الرابط!' : 'Link copied!');
    }
  };

  const countryFlag = getCountryFlag(user.country);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-0 overflow-hidden border-0 bg-transparent shadow-none">
        {/* Premium Payment Card */}
        <div
          ref={cardRef}
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, hsl(var(--card)) 0%, hsl(var(--muted)) 100%)',
          }}
        >
          {/* Top accent bar */}
          <div className="h-1.5 bg-gradient-to-r from-nova via-primary to-aura" />

          <div className="px-6 pt-6 pb-5 flex flex-col items-center space-y-4">
            {/* Avatar */}
            <Avatar className="h-20 w-20 border-3 border-nova/30 shadow-lg">
              {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
              <AvatarFallback className="bg-nova/10 text-nova text-2xl font-bold">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Name & Username */}
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold text-foreground">{user.name}</h2>
              <p className="text-sm text-muted-foreground font-mono">@{user.username}</p>
            </div>

            {/* Country */}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <span className="text-lg">{countryFlag}</span>
              <span>{user.country}</span>
            </div>

            {/* QR Code */}
            <div className="bg-white rounded-xl p-3 shadow-sm">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="Payment QR Code"
                  className="w-[220px] h-[220px]"
                />
              ) : (
                <div className="w-[220px] h-[220px] flex items-center justify-center text-muted-foreground">
                  Loading...
                </div>
              )}
            </div>

            {/* Scan instruction */}
            <p className="text-xs text-muted-foreground text-center">
              {isRTL ? 'امسح الرمز لإرسال Nova' : 'Scan to send Nova'}
            </p>

            {/* WINOVA branding */}
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-nova font-bold text-sm">И</span>
              <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                WINOVA
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons below the card */}
        <div className="flex gap-3 mt-3 px-1">
          <Button
            variant="outline"
            className="flex-1 h-11 gap-2 bg-card border-border"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4" />
            {isRTL ? 'تحميل الكارد' : 'Download Card'}
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-11 gap-2 bg-card border-border"
            onClick={handleShare}
          >
            <Share2 className="h-4 w-4" />
            {isRTL ? 'مشاركة الرابط' : 'Share Link'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
