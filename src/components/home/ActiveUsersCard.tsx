import { motion } from 'framer-motion';
import { Users, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ActiveUsersCardProps {
  count: number;
  type: 'global' | 'contest';
  className?: string;
}

export function ActiveUsersCard({ count, type, className }: ActiveUsersCardProps) {
  const { language } = useLanguage();

  const formattedCount = count.toLocaleString();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex items-center justify-center gap-2 px-4 py-2 bg-success/10 border border-success/20 rounded-full ${className}`}
    >
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
      >
        {type === 'global' ? (
          <Users className="h-4 w-4 text-success" />
        ) : (
          <Zap className="h-4 w-4 text-warning" />
        )}
      </motion.div>
      <span className="text-sm font-bold text-success">
        {formattedCount}+
      </span>
      <span className="text-xs text-muted-foreground">
        {type === 'global' 
          ? (language === 'ar' ? 'نشط الآن' : 'active now')
          : (language === 'ar' ? 'في المسابقة' : 'in contest')
        }
      </span>
    </motion.div>
  );
}
