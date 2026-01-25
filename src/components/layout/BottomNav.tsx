import { Home, Trophy, Users, Wallet, MessageCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const navItems = [
  { icon: Home, path: '/', labelKey: 'nav.home' },
  { icon: Trophy, path: '/contests', labelKey: 'nav.contests' },
  { icon: Users, path: '/team', labelKey: 'nav.team' },
  { icon: Wallet, path: '/wallet', labelKey: 'nav.wallet' },
  { icon: MessageCircle, path: '/chat', labelKey: 'nav.chat' },
];

export function BottomNav() {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <nav className="bottom-nav safe-bottom z-50">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
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
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
