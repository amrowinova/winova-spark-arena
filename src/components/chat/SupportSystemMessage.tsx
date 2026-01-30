import { motion } from 'framer-motion';
import { 
  Bell, 
  UserCheck, 
  CheckCircle,
  Clock,
  Headphones,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

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
  const isRTL = language === 'ar';
  const Icon = typeIcons[message.type];
  const colorClasses = typeColors[message.type];

  const getMessageContent = () => {
    switch (message.type) {
      case 'ticket_opened':
        return {
          title: isRTL ? '🛎️ تم فتح طلب دعم' : '🛎️ Support Ticket Opened',
          subtitle: isRTL 
            ? `📂 القسم: ${message.categoryTitle}`
            : `📂 Category: ${message.categoryTitle}`,
          extra: isRTL 
            ? '⏳ حالتك: بانتظار موظف الدعم'
            : '⏳ Status: Waiting for support agent',
        };
      
      case 'agent_assigned':
        const agentName = isRTL ? message.agentNameAr : message.agentName;
        return {
          title: isRTL 
            ? `👋 أهلاً ${message.userName || ''}`
            : `👋 Hi ${message.userName || ''}`,
          subtitle: isRTL
            ? `أنا ${agentName} من فريق دعم WINOVA`
            : `I'm ${agentName} from WINOVA Support`,
          extra: isRTL
            ? `رح أساعدك بخصوص مشكلة ${message.categoryTitle} 😊`
            : `I'll help you with your ${message.categoryTitle} issue 😊`,
        };
      
      case 'ticket_resolved':
        return {
          title: isRTL ? '✅ تم حل التذكرة' : '✅ Ticket Resolved',
          subtitle: isRTL 
            ? 'شكراً لتواصلك معنا'
            : 'Thank you for contacting us',
          extra: isRTL
            ? 'هل ترغب بتقييم الخدمة؟ ⭐'
            : 'Would you like to rate our service? ⭐',
        };
      
      case 'waiting_queue':
        return {
          title: isRTL 
            ? '⏳ أنت في قائمة الانتظار'
            : '⏳ You are in queue',
          subtitle: isRTL
            ? `ترتيبك: ${message.queuePosition}`
            : `Position: ${message.queuePosition}`,
          extra: isRTL
            ? 'سيتم التواصل معك قريباً'
            : 'We will contact you soon',
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
