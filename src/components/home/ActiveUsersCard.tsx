import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRealActiveUsers } from '@/hooks/useRealActiveUsers';

interface ActiveUsersCardProps {
  className?: string;
}

export function ActiveUsersCard({ className }: ActiveUsersCardProps) {
  const { language } = useLanguage();
  
  // Use real presence-based count
  const activeCount = useRealActiveUsers();

  // Don't show if no users (still loading)
  if (activeCount === 0) return null;

  const formattedCount = activeCount.toLocaleString();

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-success/10 border border-success/20 rounded-full ${className}`}
    >
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
        className="w-2 h-2 rounded-full bg-success"
      />
      <span className="text-xs font-medium text-foreground">
        {language === 'ar' ? 'نشط الآن' : 'Active now'}
      </span>
      <span className="text-xs font-bold text-success">
        {formattedCount}
      </span>
    </motion.div>
  );
}
