import { motion } from 'framer-motion';
import { 
  Bell, 
  UserCheck, 
  CheckCircle,
  Clock,
  Headphones,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from 'react-i18next';

export type SupportMessageType = 
  | 'ticket_opened'
  | 'agent_assigned'
  | 'ticket_resolved'
  | 'waiting_queue';

export interface SupportSystemMessageData {
  id: string;
  type: SupportMessageType;
  time: string;
  categoryTitle?: string;
  agentName?: string;
  agentNameAr?: string;
  userName?: string;
  queuePosition?: number;
}

interface SupportSystemMessageProps {
  message: SupportSystemMessageData;
}

const typeIcons: Record<SupportMessageType, React.ElementType> = {
  ticket_opened: Bell,
  agent_assigned: UserCheck,
  ticket_resolved: CheckCircle,
  waiting_queue: Clock,
};

const typeColors: Record<SupportMessageType, string> = {
  ticket_opened: 'text-info bg-info/10 border-info/20',
  agent_assigned: 'text-success bg-success/10 border-success/20',
  ticket_resolved: 'text-muted-foreground bg-muted/50 border-border',
  waiting_queue: 'text-warning bg-warning/10 border-warning/20',
};

export function SupportSystemMessage({ message }: SupportSystemMessageProps) {
  const { language } = useLanguage();
  const { t } = useTranslation();
  const isRTL = language === 'ar';
  const Icon = typeIcons[message.type];
  const colorClasses = typeColors[message.type];

  const getMessageContent = () => {
    switch (message.type) {
      case 'ticket_opened':
        return {
          title: t('chat.support.ticketOpenedTitle'),
          subtitle: t('chat.support.categoryLabel', { category: message.categoryTitle }),
          extra: t('chat.support.waitingStatus'),
        };

      case 'agent_assigned': {
        const agentName = isRTL ? message.agentNameAr : message.agentName;
        return {
          title: t('chat.support.agentGreeting', { name: message.userName || '' }),
          subtitle: t('chat.support.agentSubtitle', { agentName }),
          extra: t('chat.support.agentHelp', { category: message.categoryTitle }),
        };
      }

      case 'ticket_resolved':
        return {
          title: t('chat.support.ticketResolvedTitle'),
          subtitle: t('chat.support.thankYou'),
          extra: t('chat.support.rateService'),
        };

      case 'waiting_queue':
        return {
          title: t('chat.support.inQueueTitle'),
          subtitle: t('chat.support.queuePosition', { position: message.queuePosition }),
          extra: t('chat.support.contactSoon'),
        };

      default:
        return { title: '', subtitle: '', extra: '' };
    }
  };

  const content = getMessageContent();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="flex justify-center my-4"
    >
      <div className={`w-full max-w-sm px-4 py-3 rounded-xl border text-sm ${colorClasses}`}>
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            <Headphones className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <p className="font-semibold">{content.title}</p>
            <p className="text-xs opacity-80">{content.subtitle}</p>
            {content.extra && (
              <p className="text-xs opacity-70">{content.extra}</p>
            )}
          </div>
          <span className="text-[10px] opacity-60 shrink-0">{message.time}</span>
        </div>
      </div>
    </motion.div>
  );
}
