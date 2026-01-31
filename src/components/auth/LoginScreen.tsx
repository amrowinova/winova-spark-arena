import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, Mail, Lock, Eye, EyeOff } from 'lucide-react';

interface LoginScreenProps {
  onBack: () => void;
  onSignUp: () => void;
  onSendOTP: (email: string) => void;
}

type LoginMethod = 'otp' | 'password';

export function LoginScreen({ onBack, onSignUp, onSendOTP }: LoginScreenProps) {
  const { language } = useLanguage();
  const { signIn, signInWithOtp, signInWithGoogle, signInWithApple } = useAuth();
  const isRTL = language === 'ar';
  
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

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
    
    if (loginMethod === 'password') {
      if (!password) {
        setError(isRTL ? 'يرجى إدخال كلمة المرور' : 'Please enter your password');
        setIsLoading(false);
        return;
      }
      
      const { error: authError } = await signIn(email, password);
      setIsLoading(false);
      
      if (authError) {
        setError(isRTL ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : 'Invalid email or password');
        return;
      }
      // Success - auth state change will handle navigation
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

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
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
          {isRTL ? 'تسجيل الدخول' : 'Sign In'}
        </h1>
      </div>

      {/* Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 px-6 py-6 overflow-y-auto"
      >
        {/* Social Login Buttons */}
        <div className="space-y-3 mb-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSocialLogin('google')}
            disabled={isLoading}
            className="w-full h-12 text-base font-medium gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {isRTL ? 'تسجيل الدخول باستخدام Google' : 'Continue with Google'}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            onClick={() => handleSocialLogin('apple')}
            disabled={isLoading}
            className="w-full h-12 text-base font-medium gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            {isRTL ? 'تسجيل الدخول باستخدام Apple' : 'Continue with Apple'}
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

        {/* Login Method Toggle */}
        <div className="flex gap-2 mb-6">
          <Button
            type="button"
            variant={loginMethod === 'password' ? 'default' : 'outline'}
            onClick={() => setLoginMethod('password')}
            className="flex-1 h-10"
          >
            <Lock className="w-4 h-4 me-2" />
            {isRTL ? 'كلمة المرور' : 'Password'}
          </Button>
          <Button
            type="button"
            variant={loginMethod === 'otp' ? 'default' : 'outline'}
            onClick={() => setLoginMethod('otp')}
            className="flex-1 h-10"
          >
            <Mail className="w-4 h-4 me-2" />
            {isRTL ? 'رمز OTP' : 'OTP Code'}
          </Button>
        </div>

        {/* Email Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
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

          {/* Password Field - Only show for password method */}
          {loginMethod === 'password' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
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
                  placeholder={isRTL ? 'أدخل كلمة المرور' : 'Enter your password'}
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

          {/* Info Note */}
          <p className="text-xs text-muted-foreground text-center">
            {loginMethod === 'password' 
              ? (isRTL ? 'ستُدخل بريدك وكلمة المرور للدخول' : 'Enter your email and password to sign in')
              : (isRTL ? 'سنرسل لك رمز تحقق مكون من 6 أرقام' : "We'll send you a 6-digit verification code")}
          </p>

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
              : loginMethod === 'password'
                ? (isRTL ? 'تسجيل الدخول' : 'Sign In')
                : (isRTL ? 'إرسال رمز التحقق' : 'Send Verification Code')}
          </Button>
        </form>

        {/* Sign Up Link */}
        <p className="text-center text-sm text-muted-foreground pt-8">
          {isRTL ? 'ليس لديك حساب؟ ' : "Don't have an account? "}
          <button
            type="button"
            onClick={onSignUp}
            className="text-primary font-medium hover:underline"
          >
            {isRTL ? 'إنشاء حساب جديد' : 'Create Account'}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
