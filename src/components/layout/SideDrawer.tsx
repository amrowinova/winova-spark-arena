import { Trophy, Wallet, Star, Users, MessageCircle, Home, Sparkles } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface SideDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const menuItems = [
  { icon: Home, path: '/', labelEn: 'Home', labelAr: 'الرئيسية' },
  { icon: Trophy, path: '/contests', labelEn: 'Contests', labelAr: 'المسابقات' },
  { icon: Sparkles, path: '/hall-of-fame', labelEn: 'Top Winners', labelAr: 'متصدري الفائزون', highlight: true },
  { icon: Star, path: '/spotlight', labelEn: 'Spotlight', labelAr: 'نقاط المحظوظين' },
  { icon: Wallet, path: '/wallet', labelEn: 'Wallet', labelAr: 'المحفظة' },
  { icon: MessageCircle, path: '/chat', labelEn: 'Chat', labelAr: 'الدردشة' },
  { icon: Users, path: '/team', labelEn: 'Team', labelAr: 'الفريق' },
];

export function SideDrawer({ open, onOpenChange }: SideDrawerProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const isRTL = language === 'ar';

  const handleNavigation = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={isRTL ? 'right' : 'left'} className="w-72 p-0">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="text-start">
            {isRTL ? 'القائمة' : 'Menu'}
          </SheetTitle>
        </SheetHeader>
        
        <nav className="p-2">
          {menuItems.map((item) => {
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
                    : item.highlight
                      ? 'bg-nova/10 text-nova hover:bg-nova/20'
                      : 'hover:bg-muted text-foreground'
                )}
              >
                <Icon className={cn(
                  'h-5 w-5',
                  item.highlight && !isActive && 'text-nova'
                )} />
                <span className="font-medium text-sm">
                  {isRTL ? item.labelAr : item.labelEn}
                </span>
                {item.highlight && (
                  <span className="ms-auto text-base">🏆</span>
                )}
              </button>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
