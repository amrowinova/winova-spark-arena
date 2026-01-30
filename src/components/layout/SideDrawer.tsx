import { useState } from 'react';
import { Home, Trophy, Star, Crown, Sparkles, Wallet, MessageCircle, Users, ArrowLeftRight, Settings, Globe, HelpCircle, FileText, LogOut } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { AuthFlow } from '@/components/auth';
import { toast } from '@/hooks/use-toast';

interface SideDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Main navigation sections
const mainItems = [
  { icon: Home, path: '/', labelEn: 'Home', labelAr: 'الرئيسية', emoji: '🏠' },
  { icon: Trophy, path: '/contests', labelEn: 'Contests', labelAr: 'المسابقات', emoji: '🏆' },
  { icon: Star, path: '/hall-of-fame', labelEn: 'Top Winners', labelAr: 'متصدري الفائزون', emoji: '⭐' },
  { icon: Crown, path: '/lucky-leaders', labelEn: 'Lucky Leaders', labelAr: 'متصدّري المحظوظين', emoji: '🍀' },
  { icon: Sparkles, path: '/spotlight', labelEn: 'Lucky Points', labelAr: 'نقاط المحظوظين', emoji: '✨' },
  { icon: Wallet, path: '/wallet', labelEn: 'Wallet', labelAr: 'المحفظة', emoji: '💰' },
  { icon: MessageCircle, path: '/chat', labelEn: 'Chat', labelAr: 'الدردشة', emoji: '💬' },
  { icon: Users, path: '/team', labelEn: 'Team', labelAr: 'الفريق', emoji: '👥' },
];

// Secondary menu items
const secondaryItems = [
  { icon: Trophy, path: '/winners', labelEn: 'Contest History', labelAr: 'سجل المسابقات والفائزين', emoji: '📜' },
  { icon: ArrowLeftRight, path: '/p2p', labelEn: 'P2P', labelAr: 'P2P', emoji: '🔁' },
  { icon: Settings, path: '/settings', labelEn: 'Settings', labelAr: 'الإعدادات', emoji: '⚙️' },
  { icon: HelpCircle, path: '/help', labelEn: 'Help', labelAr: 'المساعدة', emoji: '❓' },
  { icon: FileText, path: '/policies', labelEn: 'Policies', labelAr: 'السياسات', emoji: '📄' },
];

const logoutItem = { icon: LogOut, path: '/logout', labelEn: 'Logout', labelAr: 'تسجيل الخروج', emoji: '🚪' };

export function SideDrawer({ open, onOpenChange }: SideDrawerProps) {
  const { language, toggleLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const isRTL = language === 'ar';
  
  const [authOpen, setAuthOpen] = useState(false);

  const handleNavigation = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  const handleLanguageToggle = () => {
    toggleLanguage();
  };

  const handleLogoutClick = () => {
    // TEMPORARY: Open Auth flow instead of logging out
    onOpenChange(false);
    setTimeout(() => setAuthOpen(true), 300);
  };

  const handleAuthSuccess = () => {
    toast({
      title: isRTL ? 'تم بنجاح!' : 'Success!',
      description: isRTL ? 'تم تسجيل الدخول بنجاح' : 'You have been logged in successfully',
    });
    navigate('/');
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side={isRTL ? 'right' : 'left'} className="w-72 p-0">
          <SheetHeader className="p-4 border-b border-border">
            <SheetTitle className="text-start">
              {isRTL ? 'القائمة' : 'Menu'}
            </SheetTitle>
          </SheetHeader>
          
          <nav className="flex flex-col h-[calc(100%-65px)] overflow-y-auto">
            <div className="p-2 flex-1">
              {/* Main Navigation */}
              {mainItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all mb-1',
                      isActive 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-muted text-foreground'
                    )}
                  >
                    <span className="text-base">{item.emoji}</span>
                    <Icon className="h-5 w-5" />
                    <span className="font-medium text-sm">
                      {isRTL ? item.labelAr : item.labelEn}
                    </span>
                  </button>
                );
              })}
              
              <Separator className="my-3" />
              
              {/* Secondary Items */}
              {secondaryItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all mb-1',
                      isActive 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-muted text-foreground'
                    )}
                  >
                    <span className="text-base">{item.emoji}</span>
                    <Icon className="h-5 w-5" />
                    <span className="font-medium text-sm">
                      {isRTL ? item.labelAr : item.labelEn}
                    </span>
                  </button>
                );
              })}
              
              {/* Language Toggle */}
              <button
                onClick={handleLanguageToggle}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all mb-1 hover:bg-muted text-foreground"
              >
                <span className="text-base">🌐</span>
                <Globe className="h-5 w-5" />
                <span className="font-medium text-sm">
                  {isRTL ? 'English' : 'العربية'}
                </span>
              </button>
            </div>
            
            <div className="p-2 border-t border-border">
              <button
                onClick={handleLogoutClick}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-destructive hover:bg-destructive/10"
              >
                <span className="text-base">{logoutItem.emoji}</span>
                <logoutItem.icon className="h-5 w-5" />
                <span className="font-medium text-sm">
                  {isRTL ? logoutItem.labelAr : logoutItem.labelEn}
                </span>
              </button>
            </div>
          </nav>
        </SheetContent>
      </Sheet>

      {/* Auth Flow Sheet */}
      <AuthFlow 
        open={authOpen} 
        onOpenChange={setAuthOpen}
        onAuthSuccess={handleAuthSuccess}
      />
    </>
  );
}
