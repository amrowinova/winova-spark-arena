import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

interface TypingIndicatorProps {
  userName?: string;
}

export function TypingIndicator({ userName }: TypingIndicatorProps) {
  const { language } = useLanguage();
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 5 }}
      className="flex items-center gap-2 px-4 py-1"
    >
      {/* Typing dots animation */}
      <div className="flex items-center gap-1 bg-muted rounded-full px-3 py-2">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="w-2 h-2 bg-muted-foreground/60 rounded-full"
              animate={{
                y: [0, -4, 0],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
          ))}
        </div>
      </div>
      
      <span className="text-xs text-muted-foreground">
        {language === 'ar' ? 'يكتب الآن...' : 'typing...'}
      </span>
    </motion.div>
  );
}
