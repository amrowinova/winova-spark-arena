import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Mail, RefreshCw } from 'lucide-react';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';

interface OTPVerificationScreenProps {
  email: string;
  onBack: () => void;
  onVerify: () => void;
  onResend: () => void;
}

export function OTPVerificationScreen({ 
  email, 
  onBack, 
  onVerify,
  onResend 
}: OTPVerificationScreenProps) {
  const { language } = useLanguage();
  const { verifyOtp, signInWithOtp } = useAuth();
  const isRTL = language === 'ar';
  
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Countdown timer for resend
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError(isRTL ? 'يرجى إدخال الرمز المكون من 6 أرقام' : 'Please enter the 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');
    
    // Verify OTP via Supabase Auth
    const { error: authError } = await verifyOtp(email, otp);
    
    setIsLoading(false);
    
    if (authError) {
      setError(isRTL ? 'رمز التحقق غير صحيح. حاول مرة أخرى.' : 'Invalid verification code. Please try again.');
      return;
    }
    
    onVerify();
  };

  const handleResend = async () => {
    if (!canResend) return;
    
    setCanResend(false);
    setResendTimer(60);
    setError('');
    
    // Resend OTP via Supabase Auth
    const { error: authError } = await signInWithOtp(email);
    
    if (authError) {
      setError(isRTL ? 'حدث خطأ أثناء إعادة الإرسال' : 'Failed to resend code');
      setCanResend(true);
      return;
    }
    
    onResend();
  };

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  // Mask email for display
  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, '$1***$3');

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
          {isRTL ? 'التحقق من البريد الإلكتروني' : 'Verify Your Email'}
        </h1>
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col items-center justify-center px-6 py-8"
      >
        {/* Email Icon */}
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Mail className="w-10 h-10 text-primary" />
        </div>

        {/* Title & Description */}
        <h2 className="text-xl font-bold text-foreground mb-2 text-center">
          {isRTL ? 'أدخل رمز التحقق' : 'Enter Verification Code'}
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-8 max-w-xs">
          {isRTL 
            ? `تم إرسال رمز مكون من 6 أرقام إلى ${maskedEmail}`
            : `A 6-digit code was sent to ${maskedEmail}`}
        </p>

        {/* OTP Input */}
        <div className="mb-6" dir="ltr">
          <InputOTP
            maxLength={6}
            value={otp}
            onChange={(value) => {
              setOtp(value);
              setError('');
            }}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} className="w-12 h-14 text-xl" />
              <InputOTPSlot index={1} className="w-12 h-14 text-xl" />
              <InputOTPSlot index={2} className="w-12 h-14 text-xl" />
              <InputOTPSlot index={3} className="w-12 h-14 text-xl" />
              <InputOTPSlot index={4} className="w-12 h-14 text-xl" />
              <InputOTPSlot index={5} className="w-12 h-14 text-xl" />
            </InputOTPGroup>
          </InputOTP>
        </div>

        {/* Error Message */}
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-destructive text-center mb-4"
          >
            {error}
          </motion.p>
        )}

        {/* Verify Button */}
        <Button
          onClick={handleVerify}
          disabled={isLoading || otp.length !== 6}
          className="w-full max-w-xs h-12 text-base font-semibold mb-4"
        >
          {isLoading 
            ? (isRTL ? 'جارٍ التحقق...' : 'Verifying...') 
            : (isRTL ? 'تأكيد' : 'Verify')}
        </Button>

        {/* Resend Code */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            {isRTL ? 'لم تستلم الرمز؟' : "Didn't receive the code?"}
          </span>
          <button
            onClick={handleResend}
            disabled={!canResend}
            className={`flex items-center gap-1 font-medium ${
              canResend 
                ? 'text-primary hover:underline' 
                : 'text-muted-foreground cursor-not-allowed'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            {canResend 
              ? (isRTL ? 'إعادة إرسال' : 'Resend')
              : (isRTL ? `${resendTimer} ثانية` : `${resendTimer}s`)}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
