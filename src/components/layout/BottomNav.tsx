import { Home, Trophy, MessageCircle, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthRequired } from '@/contexts/AuthRequiredContext';
import { useDMUnreadCount } from '@/hooks/useDMUnreadCount';
import { useSupport } from '@/contexts/SupportContext';
import { useP2P } from '@/contexts/P2PContext';

const navItems = [
  { icon: Home, path: '/', labelKey: 'nav.home', protected: false },
  { icon: Trophy, path: '/contests', labelKey: 'nav.contests', protected: true },
  { icon: MessageCircle, path: '/chat', labelKey: 'nav.chat', protected: true },
  { icon: Users, path: '/team', labelKey: 'nav.team', protected: true },
];

export function BottomNav() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showAuthRequired } = useAuthRequired();
  
  // Unread counts for badge
  const { unreadCount: dmUnread } = useDMUnreadCount();
  const { totalUnread: supportUnread } = useSupport();
  const { chats: p2pChats } = useP2P();
  
  // Calculate total P2P unread
  const p2pUnread = p2pChats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
  
  // Total unread for chat badge = DM + Support + P2P
  const totalChatUnread = dmUnread + supportUnread + p2pUnread;

  const handleNavClick = (item: typeof navItems[0], e: React.MouseEvent) => {
    if (item.protected && !user) {
      e.preventDefault();
      showAuthRequired();
      return;
    }
    navigate(item.path);
  };

  return (
    <nav className="bottom-nav safe-bottom z-50">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          const showBadge = item.path === '/chat' && totalChatUnread > 0;
          
          return (
            <button
              key={item.path}
              onClick={(e) => handleNavClick(item, e)}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 px-4 py-2 transition-all duration-200',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute -top-0.5 h-1 w-8 rounded-full bg-primary"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <div className="relative">
                <Icon className={cn('h-5 w-5', isActive && 'scale-110')} />
                {showBadge && (
                  <span className="absolute -top-1.5 -end-2 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                    {totalChatUnread > 99 ? '99+' : totalChatUnread}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{t(item.labelKey)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
