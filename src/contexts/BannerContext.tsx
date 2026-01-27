import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type BannerType = 'success' | 'error' | 'info';

export interface Banner {
  id: string;
  type: BannerType;
  message: string;
  duration?: number;
}

interface BannerContextType {
  banners: Banner[];
  showBanner: (type: BannerType, message: string, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  removeBanner: (id: string) => void;
}

const BannerContext = createContext<BannerContextType | undefined>(undefined);

let bannerId = 0;

export function BannerProvider({ children }: { children: ReactNode }) {
  const [banners, setBanners] = useState<Banner[]>([]);

  const removeBanner = useCallback((id: string) => {
    setBanners(prev => prev.filter(b => b.id !== id));
  }, []);

  const showBanner = useCallback((type: BannerType, message: string, duration = 3000) => {
    const id = `banner-${++bannerId}`;
    const newBanner: Banner = { id, type, message, duration };
    
    setBanners(prev => [...prev, newBanner]);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeBanner(id);
      }, duration);
    }

    return id;
  }, [removeBanner]);

  const success = useCallback((message: string, duration?: number) => {
    return showBanner('success', message, duration);
  }, [showBanner]);

  const error = useCallback((message: string, duration?: number) => {
    return showBanner('error', message, duration);
  }, [showBanner]);

  const info = useCallback((message: string, duration?: number) => {
    return showBanner('info', message, duration);
  }, [showBanner]);

  return (
    <BannerContext.Provider value={{
      banners,
      showBanner,
      success,
      error,
      info,
      removeBanner,
    }}>
      {children}
    </BannerContext.Provider>
  );
}

export function useBanner() {
  const context = useContext(BannerContext);
  if (!context) {
    throw new Error('useBanner must be used within BannerProvider');
  }
  return context;
}

// Standalone banner function for use outside React components
let bannerContextRef: BannerContextType | null = null;

export function setBannerContext(context: BannerContextType) {
  bannerContextRef = context;
}

export const banner = {
  success: (message: string, duration?: number) => {
    bannerContextRef?.success(message, duration);
  },
  error: (message: string, duration?: number) => {
    bannerContextRef?.error(message, duration);
  },
  info: (message: string, duration?: number) => {
    bannerContextRef?.info(message, duration);
  },
};
