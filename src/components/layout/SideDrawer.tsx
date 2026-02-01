import { useState, useEffect } from 'react';
import { Trophy, Sparkles, Wallet, MessageCircle, Users, ArrowLeftRight, Settings, Globe, HelpCircle, FileText, LogOut, ChevronDown, Shield, Crown } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage, SUPPORTED_LANGUAGES, Language } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface SideDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Main navigation sections
const mainItems = [
  { icon: Sparkles, path: '/spotlight', labelEn: 'Lucky Points', labelAr: 'نقاط المحظوظين', emoji: '⭐' },
  { icon: Wallet, path: '/wallet', labelEn: 'Wallet', labelAr: 'المحفظة', emoji: '💼' },
  { icon: MessageCircle, path: '/chat', labelEn: 'Chat', labelAr: 'الدردشة', emoji: '💬' },
  { icon: Users, path: '/team', labelEn: 'Team', labelAr: 'الفريق', emoji: '👥' },
  { icon: Trophy, path: '/winners', labelEn: 'Contest History', labelAr: 'سجل المسابقات والفائزين', emoji: '🏆' },
  { icon: ArrowLeftRight, path: '/p2p', labelEn: 'P2P', labelAr: 'P2P', emoji: '🔁' },
];

// Secondary menu items
const secondaryItems = [
  { icon: Settings, path: '/settings', labelEn: 'Settings', labelAr: 'الإعدادات', emoji: '⚙️' },
  { icon: HelpCircle, path: '/help', labelEn: 'Help', labelAr: 'المساعدة', emoji: '❓' },
  { icon: FileText, path: '/terms', labelEn: 'Policies', labelAr: 'السياسات', emoji: '📄' },
];

const logoutItem = { icon: LogOut, path: '/logout', labelEn: 'Logout', labelAr: 'تسجيل الخروج', emoji: '🚪' };

export function SideDrawer({ open, onOpenChange }: SideDrawerProps) {
  const { language, setLanguage, currentLanguage } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isRTL = currentLanguage.direction === 'rtl';
  
  const [authOpen, setAuthOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [isStaff, setIsStaff] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check user roles
  useEffect(() => {
    const checkRoles = async () => {
      if (!user) {
        setIsStaff(false);
        setIsAdmin(false);
        return;
      }

      // Check support staff
      const { data: staffData } = await supabase
        .rpc('is_support_staff', { _user_id: user.id });
      setIsStaff(staffData || false);

      // Check admin
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();
      setIsAdmin(!!roleData);
    };

    checkRoles();
  }, [user]);

  const handleNavigation = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  const handleLanguageSelect = (langCode: Language) => {
    setLanguage(langCode);
    setLangOpen(false);
  };

  const handleLogout = async () => {
    onOpenChange(false);
    await supabase.auth.signOut();
    toast({
      title: isRTL ? 'تم تسجيل الخروج' : 'Signed Out',
      description: isRTL ? 'تم تسجيل خروجك بنجاح' : 'You have been signed out successfully',
    });
    navigate('/');
  };

  const handleLoginClick = () => {
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
              
              {/* Staff/Admin Section */}
              {(isStaff || isAdmin) && (
                <>
                  <Separator className="my-3" />
                  <p className="px-4 py-1 text-xs text-muted-foreground font-medium">
                    {isRTL ? 'الإدارة' : 'Management'}
                  </p>
                  
                  {isStaff && (
                    <button
                      onClick={() => handleNavigation('/support')}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all mb-1',
                        location.pathname.startsWith('/support')
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-muted text-foreground'
                      )}
                    >
                      <span className="text-base">🛡️</span>
                      <Shield className="h-5 w-5" />
                      <span className="font-medium text-sm">
                        {isRTL ? 'لوحة الدعم' : 'Support Panel'}
                      </span>
                    </button>
                  )}
                  
                  {isAdmin && (
                    <button
                      onClick={() => handleNavigation('/admin')}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all mb-1',
                        location.pathname.startsWith('/admin')
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-muted text-foreground'
                      )}
                    >
                      <span className="text-base">👑</span>
                      <Crown className="h-5 w-5" />
                      <span className="font-medium text-sm">
                        {isRTL ? 'لوحة الإدارة' : 'Admin Dashboard'}
                      </span>
                    </button>
                  )}
                </>
              )}

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
              
              {/* Language Selector */}
              <Collapsible open={langOpen} onOpenChange={setLangOpen}>
                <CollapsibleTrigger asChild>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all mb-1 hover:bg-muted text-foreground"
                  >
                    <span className="text-base">{currentLanguage.flag}</span>
                    <Globe className="h-5 w-5" />
                    <span className="font-medium text-sm flex-1 text-start">
                      {currentLanguage.nameNative}
                    </span>
                    <ChevronDown className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      langOpen && "rotate-180"
                    )} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="ps-4">
                  <div className="space-y-1 py-1">
                    {SUPPORTED_LANGUAGES.map((lang) => {
                      const isSelected = language === lang.code;
                      return (
                        <button
                          key={lang.code}
                          onClick={() => handleLanguageSelect(lang.code)}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm',
                            isSelected 
                              ? 'bg-primary/10 text-primary font-medium' 
                              : 'hover:bg-muted text-foreground'
                          )}
                        >
                          <span className="text-base">{lang.flag}</span>
                          <span>{lang.nameNative}</span>
                          {isSelected && <span className="ms-auto">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>
            
            <div className="p-2 border-t border-border space-y-1">
              {/* Try Login Button - Always visible */}
              <button
                onClick={handleLoginClick}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-primary hover:bg-primary/10"
              >
                <span className="text-base">🔑</span>
                <LogOut className="h-5 w-5 rotate-180" />
                <span className="font-medium text-sm">
                  {isRTL ? 'تجربة دخول' : 'Try Login'}
                </span>
              </button>
              
              {/* Logout Button - Only for authenticated users */}
              {user && (
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-destructive hover:bg-destructive/10"
                >
                  <span className="text-base">🚪</span>
                  <LogOut className="h-5 w-5" />
                  <span className="font-medium text-sm">
                    {isRTL ? 'تسجيل الخروج' : 'Logout'}
                  </span>
                </button>
              )}
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
