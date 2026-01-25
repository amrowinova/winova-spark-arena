import { motion } from 'framer-motion';
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Unlock, 
  Shield, 
  FileQuestion,
  XCircle,
  CreditCard
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { P2PSystemMessage as P2PSystemMessageType } from '@/contexts/P2PContext';

interface P2PSystemMessageProps {
  message: P2PSystemMessageType;
}

const typeConfig: Record<P2PSystemMessageType['type'], {
  icon: React.ElementType;
  colorClass: string;
}> = {
  status_change: {
    icon: Clock,
    colorClass: 'text-primary bg-primary/10 border-primary/20',
  },
  payment_confirmed: {
    icon: CreditCard,
    colorClass: 'text-info bg-info/10 border-info/20',
  },
  released: {
    icon: Unlock,
    colorClass: 'text-success bg-success/10 border-success/20',
  },
  dispute_opened: {
    icon: AlertTriangle,
    colorClass: 'text-destructive bg-destructive/10 border-destructive/20',
  },
  support_joined: {
    icon: Shield,
    colorClass: 'text-warning bg-warning/10 border-warning/20',
  },
  support_message: {
    icon: FileQuestion,
    colorClass: 'text-warning bg-warning/10 border-warning/20',
  },
  dispute_resolved: {
    icon: CheckCircle,
    colorClass: 'text-success bg-success/10 border-success/20',
  },
};

export function P2PSystemMessage({ message }: P2PSystemMessageProps) {
  const { language } = useLanguage();
  const config = typeConfig[message.type];
  const Icon = config.icon;

  const content = language === 'ar' ? message.contentAr : message.content;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex justify-center my-3"
    >
      <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm ${config.colorClass}`}>
        <Icon className="h-4 w-4 shrink-0" />
        <span className="text-center font-medium">{content}</span>
        <span className="text-[10px] opacity-60 shrink-0">{message.time}</span>
      </div>
    </motion.div>
  );
}

// Compact version for message list
export function P2PSystemMessageCompact({ message }: P2PSystemMessageProps) {
  const { language } = useLanguage();
  const config = typeConfig[message.type];
  const Icon = config.icon;

  const content = language === 'ar' ? message.contentAr : message.content;

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${config.colorClass}`}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1">{content}</span>
      <span className="text-[10px] opacity-60">{message.time}</span>
    </div>
  );
}
