import { Home, Trophy, MessageCircle, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthRequired } from '@/contexts/AuthRequiredContext';

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
              <Icon className={cn('h-5 w-5', isActive && 'scale-110')} />
              <span className="text-[10px] font-medium">{t(item.labelKey)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
