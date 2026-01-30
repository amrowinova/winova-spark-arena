import { useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, Eye, EyeOff, Mail, Lock } from 'lucide-react';

interface LoginScreenProps {
  onBack: () => void;
  onSignUp: () => void;
  onSuccess: () => void;
}

export function LoginScreen({ onBack, onSignUp, onSuccess }: LoginScreenProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError(isRTL ? 'يرجى ملء جميع الحقول' : 'Please fill all fields');
      return;
    }

    setIsLoading(true);
    
    // Mock login - simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsLoading(false);
    onSuccess();
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

      {/* Form */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        className="flex-1 px-6 py-6 space-y-5"
      >
        {/* Email/Phone Field */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            {isRTL ? 'البريد الإلكتروني أو رقم الهاتف' : 'Email or Phone'}
          </Label>
          <div className="relative">
            <Mail className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="email"
              type="text"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={isRTL ? 'أدخل بريدك الإلكتروني أو رقم الهاتف' : 'Enter your email or phone'}
              className="ps-10 h-12"
              dir="ltr"
            />
          </div>
        </div>

        {/* Password Field */}
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
              placeholder={isRTL ? 'أدخل كلمة المرور' : 'Enter your password'}
              className="ps-10 pe-10 h-12"
              dir="ltr"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute end-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Forgot Password */}
        <div className="text-end">
          <button
            type="button"
            className="text-sm text-primary hover:underline"
          >
            {isRTL ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
          </button>
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
            ? (isRTL ? 'جارٍ تسجيل الدخول...' : 'Signing in...') 
            : (isRTL ? 'تسجيل الدخول' : 'Sign In')}
        </Button>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              {isRTL ? 'أو' : 'OR'}
            </span>
          </div>
        </div>

        {/* Sign Up Link */}
        <p className="text-center text-sm text-muted-foreground">
          {isRTL ? 'ليس لديك حساب؟ ' : "Don't have an account? "}
          <button
            type="button"
            onClick={onSignUp}
            className="text-primary font-medium hover:underline"
          >
            {isRTL ? 'إنشاء حساب' : 'Create Account'}
          </button>
        </p>
      </motion.form>
    </div>
  );
}
