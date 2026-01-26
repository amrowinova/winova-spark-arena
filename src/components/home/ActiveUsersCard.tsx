import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface ActiveUsersCardProps {
  count: number;
  className?: string;
}

export function ActiveUsersCard({ count, className }: ActiveUsersCardProps) {
  const { language } = useLanguage();

  const formattedCount = count.toLocaleString();

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`inline-flex items-center gap-1.5 px-3 py-1 bg-success/10 border border-success/20 rounded-full ${className}`}
    >
      <motion.div
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      >
        <Users className="h-3 w-3 text-success" />
      </motion.div>
      <span className="text-xs font-semibold text-success">
        {formattedCount}+
      </span>
      <span className="text-[10px] text-muted-foreground">
        {language === 'ar' ? 'نشط الآن' : 'active now'}
      </span>
    </motion.div>
  );
}
