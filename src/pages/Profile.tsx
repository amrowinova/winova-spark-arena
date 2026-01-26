import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { 
  Menu, 
  Users, 
  ArrowLeftRight, 
  Settings, 
  HelpCircle, 
  FileText, 
  LogOut,
  Trophy,
  Target,
  Vote,
  Clover,
  MapPin
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { useUser } from '@/contexts/UserContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

// Mock stats data
const mockStats = {
  contests: 24,
  wins: 3,
  votesGiven: 156,
  votesReceived: 89,
  luckyWins: 2,
  followers: 234,
  following: 156,
};

export default function Profile() {
  const { t, i18n } = useTranslation();
  const { user } = useUser();
  const isRTL = i18n.language === 'ar';
  const [menuOpen, setMenuOpen] = useState(false);

  const menuItems = [
    { icon: Users, labelKey: 'nav.team', path: '/team' },
    { icon: ArrowLeftRight, labelKey: 'nav.p2p', path: '/p2p' },
    { icon: Settings, labelKey: 'settings.title', path: '/settings' },
    { icon: HelpCircle, labelKey: 'settings.help', path: '/support' },
    { icon: FileText, labelKey: 'profile.policies', path: '/policies' },
  ];

  const statsCards = [
    {
      icon: Target,
      labelKey: 'profile.stats.contests',
      value: mockStats.contests,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      icon: Trophy,
      labelKey: 'profile.stats.wins',
      value: mockStats.wins,
      color: 'text-nova',
      bgColor: 'bg-nova/10',
    },
    {
      icon: Vote,
      labelKey: 'profile.stats.votes',
      value: null,
      subValues: [
        { labelKey: 'profile.stats.voted', value: mockStats.votesGiven },
        { labelKey: 'profile.stats.received', value: mockStats.votesReceived },
      ],
      color: 'text-aura',
      bgColor: 'bg-aura/10',
    },
    {
      icon: Clover,
      labelKey: 'profile.stats.lucky',
      value: mockStats.luckyWins,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
  ];

  return (
    <AppLayout showHeader={false}>
      <div className="min-h-screen bg-background">
        {/* Custom Header with Menu */}
        <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-lg border-b border-border safe-top">
          <div className="flex items-center justify-between px-4 py-3">
            <h1 className="text-lg font-bold text-foreground">
              {t('profile.title')}
            </h1>
            
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side={isRTL ? 'left' : 'right'} className="w-72">
                <SheetHeader>
                  <SheetTitle>{t('profile.menu')}</SheetTitle>
                </SheetHeader>
                <nav className="mt-6 flex flex-col gap-2">
                  {menuItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted transition-colors"
                    >
                      <item.icon className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{t(item.labelKey)}</span>
                    </Link>
                  ))}
                  
                  <div className="border-t border-border my-2" />
                  
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      // Handle logout
                    }}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="font-medium">{t('settings.logout')}</span>
                  </button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        <div className="px-4 py-6 space-y-6">
          {/* Profile Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center text-center"
          >
            <Avatar className="h-24 w-24 border-4 border-primary/20">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                {user.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Username + Rank */}
            <div className="mt-4 flex items-center gap-2">
              <span className="text-lg font-semibold text-foreground">
                @{user.username}
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-lg font-medium text-primary">
                {t(`ranks.${user.rank}`)}
              </span>
            </div>

            {/* Country + City */}
            <div className="mt-2 flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">
                {user.country} · {user.city}
              </span>
            </div>

            {/* Activity Status */}
            <Badge 
              className={cn(
                "mt-3 px-3 py-1",
                user.weeklyActive 
                  ? "bg-success/15 text-success border-success/30 hover:bg-success/20" 
                  : "bg-warning/15 text-warning border-warning/30 hover:bg-warning/20"
              )}
              variant="outline"
            >
              <span className={cn(
                "h-2 w-2 rounded-full mr-2",
                user.weeklyActive ? "bg-success" : "bg-warning"
              )} />
              {user.weeklyActive ? t('profile.active') : t('profile.inactive')}
            </Badge>
          </motion.div>

          {/* Stats Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-lg font-semibold mb-4">{t('profile.myStats')}</h2>
            
            <div className="grid grid-cols-2 gap-3">
              {statsCards.map((stat, index) => (
                <Card key={index} className="border-border/50">
                  <CardContent className="p-4">
                    <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center mb-3", stat.bgColor)}>
                      <stat.icon className={cn("h-5 w-5", stat.color)} />
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {t(stat.labelKey)}
                    </p>
                    {stat.value !== null ? (
                      <p className="text-2xl font-bold text-foreground">
                        {stat.value}
                      </p>
                    ) : (
                      <div className="flex items-center gap-3">
                        {stat.subValues?.map((sub, i) => (
                          <div key={i} className="text-center">
                            <p className="text-lg font-bold text-foreground">
                              {sub.value}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {t(sub.labelKey)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.section>

          {/* Social Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-lg font-semibold mb-4">{t('profile.network')}</h2>
            
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-around">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">
                      {mockStats.followers}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('profile.followers')}
                    </p>
                  </div>
                  
                  <div className="h-10 w-px bg-border" />
                  
                  <div className="text-center">
                    <p className="text-2xl font-bold text-foreground">
                      {mockStats.following}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {t('profile.following')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.section>
        </div>
      </div>
    </AppLayout>
  );
}
