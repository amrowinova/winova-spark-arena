import { useState, useEffect, useRef } from 'react';
import { QrCode, Download } from 'lucide-react';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUser } from '@/contexts/UserContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface PaymentQRDialogProps {
  open: boolean;
  onClose: () => void;
}

export function PaymentQRDialog({ open, onClose }: PaymentQRDialogProps) {
  const { user } = useUser();
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string>('');

  const paymentLink = `${window.location.origin}/pay/${user.username}`;

  useEffect(() => {
    if (!open || !canvasRef.current) return;

    QRCode.toCanvas(canvasRef.current, paymentLink, {
      width: 256,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    }).then(() => {
      setDataUrl(canvasRef.current?.toDataURL('image/png') || '');
    });
  }, [open, paymentLink]);

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `winova-${user.username}-qr.png`;
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 justify-center">
            <QrCode className="h-5 w-5 text-nova" />
            {isRTL ? 'رمز QR الخاص بي' : 'My QR Code'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center space-y-4">
          <div className="bg-white rounded-xl p-3">
            <canvas ref={canvasRef} />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            {isRTL ? 'امسح الرمز لإرسال Nova إليّ' : 'Scan to send me Nova'}
          </p>
          <p className="text-xs text-muted-foreground font-mono truncate max-w-full">
            @{user.username}
          </p>
          <Button variant="outline" className="w-full gap-2" onClick={handleDownload}>
            <Download className="h-4 w-4" />
            {isRTL ? 'تحميل الصورة' : 'Download Image'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
