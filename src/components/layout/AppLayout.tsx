import { ReactNode } from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { motion } from 'framer-motion';

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
  showHeader?: boolean;
  showNav?: boolean;
}

export function AppLayout({ 
  children, 
  title, 
  showHeader = true, 
  showNav = true 
}: AppLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {showHeader && <Header title={title} />}
      
      <motion.main 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={`flex-1 ${showNav ? 'pb-20' : ''}`}
      >
        {children}
      </motion.main>
      
      {showNav && <BottomNav />}
    </div>
  );
}
