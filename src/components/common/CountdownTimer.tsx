import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface CountdownTimerProps {
  targetDate: Date;
  onComplete?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  className?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function CountdownTimer({
  targetDate,
  onComplete,
  size = 'md',
  showLabels = true,
  className,
}: CountdownTimerProps) {
  const { t } = useTranslation();
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft());

  function calculateTimeLeft(): TimeLeft {
    const difference = targetDate.getTime() - new Date().getTime();
    
    if (difference <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }

    return {
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((difference / 1000 / 60) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  }

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);

      if (
        newTimeLeft.days === 0 &&
        newTimeLeft.hours === 0 &&
        newTimeLeft.minutes === 0 &&
        newTimeLeft.seconds === 0
      ) {
        clearInterval(timer);
        onComplete?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onComplete]);

  const sizeClasses = {
    sm: 'gap-1 text-xs',
    md: 'gap-2 text-sm',
    lg: 'gap-3 text-lg',
  };

  const boxSizes = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-12 h-12 text-lg',
    lg: 'w-16 h-16 text-2xl',
  };

  const timeUnits = [
    { value: timeLeft.days, label: t('common.days'), show: timeLeft.days > 0 },
    { value: timeLeft.hours, label: t('common.hours'), show: true },
    { value: timeLeft.minutes, label: t('common.minutes'), show: true },
    { value: timeLeft.seconds, label: t('common.seconds'), show: true },
  ];

  return (
    <div className={cn('flex items-center justify-center', sizeClasses[size], className)}>
      {timeUnits
        .filter((unit) => unit.show)
        .map((unit, index) => (
          <div key={unit.label} className="flex items-center">
            {index > 0 && <span className="mx-1 text-muted-foreground">:</span>}
            <div className="flex flex-col items-center">
              <motion.div
                key={unit.value}
                initial={{ scale: 1.1 }}
                animate={{ scale: 1 }}
                className={cn(
                  'flex items-center justify-center rounded-lg bg-secondary font-bold text-secondary-foreground',
                  boxSizes[size]
                )}
              >
                {String(unit.value).padStart(2, '0')}
              </motion.div>
              {showLabels && (
                <span className="mt-1 text-[10px] text-muted-foreground uppercase">
                  {unit.label}
                </span>
              )}
            </div>
          </div>
        ))}
    </div>
  );
}
