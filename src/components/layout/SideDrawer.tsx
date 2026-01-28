import { Trophy, Users, ArrowLeftRight, Sparkles, Settings, HelpCircle, FileText, LogOut } from 'lucide-react';
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

interface SideDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const menuItems = [
  { icon: Trophy, path: '/winners', labelEn: 'Winners Record', labelAr: 'سجل الفائزون', emoji: '🏆' },
  { icon: ArrowLeftRight, path: '/p2p', labelEn: 'P2P', labelAr: 'P2P', emoji: '🔁' },
];

const secondaryItems = [
  { icon: Settings, path: '/settings', labelEn: 'Settings', labelAr: 'الإعدادات', emoji: '⚙️' },
  { icon: HelpCircle, path: '/help', labelEn: 'Help', labelAr: 'المساعدة', emoji: '❓' },
  { icon: FileText, path: '/policies', labelEn: 'Policies', labelAr: 'السياسات', emoji: '📄' },
];

const logoutItem = { icon: LogOut, path: '/logout', labelEn: 'Logout', labelAr: 'تسجيل الخروج', emoji: '🚪' };

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
        
        <nav className="flex flex-col h-[calc(100%-65px)]">
          <div className="p-2 flex-1">
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
          </div>
          
          <div className="p-2 border-t border-border">
            <button
              onClick={() => handleNavigation(logoutItem.path)}
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
  );
}
