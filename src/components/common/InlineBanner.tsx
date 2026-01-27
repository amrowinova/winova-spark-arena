import { useEffect } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBanner, setBannerContext } from '@/contexts/BannerContext';
import { cn } from '@/lib/utils';

export function InlineBanner() {
  const bannerContext = useBanner();
  const { banners, removeBanner } = bannerContext;

  // Set the context reference for standalone usage
  useEffect(() => {
    setBannerContext(bannerContext);
  }, [bannerContext]);

  const getIcon = (type: 'success' | 'error' | 'info') => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5" />;
      case 'error':
        return <XCircle className="h-5 w-5" />;
      case 'info':
        return <Info className="h-5 w-5" />;
    }
  };

  const getStyles = (type: 'success' | 'error' | 'info') => {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white';
      case 'error':
        return 'bg-destructive text-destructive-foreground';
      case 'info':
        return 'bg-primary text-primary-foreground';
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] pointer-events-none">
      <AnimatePresence mode="sync">
        {banners.map((banner, index) => (
          <motion.div
            key={banner.id}
            initial={{ opacity: 0, y: -50, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -20, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{ marginTop: index > 0 ? 4 : 0 }}
            className="pointer-events-auto"
          >
            <div
              className={cn(
                'w-full px-4 py-3 flex items-center justify-between gap-3 shadow-lg',
                getStyles(banner.type)
              )}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {getIcon(banner.type)}
                <span className="text-sm font-medium truncate">{banner.message}</span>
              </div>
              <button
                onClick={() => removeBanner(banner.id)}
                className="shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
