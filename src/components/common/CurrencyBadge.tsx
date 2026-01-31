import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface CurrencyBadgeProps {
  type: 'nova' | 'aura';
  amount: number;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export function CurrencyBadge({ 
  type, 
  amount, 
  size = 'md', 
  showIcon = true,
  className 
}: CurrencyBadgeProps) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold',
        type === 'nova' ? 'nova-badge' : 'aura-badge',
        sizeClasses[size],
        className
      )}
    >
      {showIcon && (
        <span className={cn(iconSizes[size])}>
          {type === 'nova' ? 'Ꞥ' : '✨'}
        </span>
      )}
      <span>{amount.toLocaleString()}</span>
    </motion.div>
  );
}
