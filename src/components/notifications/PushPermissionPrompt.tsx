/**
 * PushPermissionPrompt
 *
 * A one-time bottom sheet that asks the user to enable push notifications.
 * - Shows only once per device (tracked via localStorage)
 * - Shown only to authenticated users who haven't been asked yet
 * - Auto-dismisses if the user ignores it (not blocking)
 */
import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DISMISSED_KEY = 'push_prompt_dismissed';

export function PushPermissionPrompt() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const { user } = useAuth();
  const { supported, isGranted, isDenied, hasAsked, requestPermission } = usePushNotifications();

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!supported) return;
    if (isGranted || isDenied) return;
    if (hasAsked) return;
    if (localStorage.getItem(DISMISSED_KEY) === 'yes') return;

    // Delay slightly so it doesn't appear on first render
    const t = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(t);
  }, [user, supported, isGranted, isDenied, hasAsked]);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, 'yes');
    setVisible(false);
  };

  const handleEnable = async () => {
    setVisible(false);
    await requestPermission();
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0,   opacity: 1 }}
          exit={{    y: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-20 inset-x-4 z-50 max-w-sm mx-auto"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <div className="bg-card border rounded-2xl shadow-xl p-4 flex items-start gap-3">
            {/* Icon */}
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-primary" />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-snug">
                {isRTL ? 'فعّل الإشعارات' : 'Enable Notifications'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {isRTL
                  ? 'احصل على إشعار فوري عند الفوز، التصويت، التحويلات، وطلبات P2P.'
                  : 'Get instant alerts for wins, votes, transfers, and P2P orders.'}
              </p>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  className="h-8 text-xs flex-1"
                  onClick={handleEnable}
                >
                  <Bell className="w-3.5 h-3.5 mr-1" />
                  {isRTL ? 'فعّل الآن' : 'Enable'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs text-muted-foreground"
                  onClick={dismiss}
                >
                  <BellOff className="w-3.5 h-3.5 mr-1" />
                  {isRTL ? 'لاحقاً' : 'Later'}
                </Button>
              </div>
            </div>

            {/* Close */}
            <button
              onClick={dismiss}
              className="text-muted-foreground hover:text-foreground shrink-0 -mt-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
