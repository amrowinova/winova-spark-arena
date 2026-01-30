import { motion } from 'framer-motion';
import { Bell, CheckCircle, RefreshCw, Lock, UserCheck, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';

export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'reopened';

export interface SupportTicket {
  id: string;
  ticketNumber: number;
  category: string;
  categoryTitle: string;
  categoryTitleAr: string;
  status: SupportTicketStatus;
  createdAt: string;
  assignedAgent?: {
    id: string;
    name: string;
    nameAr: string;
    avatar: string;
  };
  resolvedAt?: string;
  closedAt?: string;
}

interface SupportTicketBlockProps {
  ticket: SupportTicket;
  type: 'opened' | 'agent_assigned' | 'resolved' | 'closed' | 'reopened';
}

export function SupportTicketBlock({ ticket, type }: SupportTicketBlockProps) {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const getContent = () => {
    const categoryName = isRTL ? ticket.categoryTitleAr : ticket.categoryTitle;
    
    switch (type) {
      case 'opened':
        return {
          icon: Bell,
          color: 'text-info bg-info/10 border-info/20',
          title: isRTL 
            ? `🔔 تم فتح طلب دعم جديد (#${ticket.ticketNumber})`
            : `🔔 New Support Ticket Opened (#${ticket.ticketNumber})`,
          lines: [
            { label: isRTL ? '📂 القسم' : '📂 Category', value: categoryName },
            { label: isRTL ? '🕐 الوقت' : '🕐 Time', value: ticket.createdAt },
            { label: isRTL ? '⏳ الحالة' : '⏳ Status', value: isRTL ? 'بانتظار موظف الدعم' : 'Waiting for agent' },
          ],
        };

      case 'agent_assigned':
        const agentName = ticket.assignedAgent 
          ? (isRTL ? ticket.assignedAgent.nameAr : ticket.assignedAgent.name)
          : '';
        return {
          icon: UserCheck,
          color: 'text-success bg-success/10 border-success/20',
          title: isRTL 
            ? `👋 مرحباً! أنا ${agentName} من فريق دعم WINOVA`
            : `👋 Hi! I'm ${agentName} from WINOVA Support`,
          lines: [
            { 
              label: '', 
              value: isRTL 
                ? `سأساعدك بخصوص مشكلة ${categoryName} 😊` 
                : `I'll help you with your ${categoryName} issue 😊`
            },
          ],
        };

      case 'resolved':
        return {
          icon: CheckCircle,
          color: 'text-success bg-success/10 border-success/20',
          title: isRTL ? '✅ تم حل المشكلة' : '✅ Issue Resolved',
          lines: [
            { label: '', value: isRTL ? 'شكراً لتواصلك معنا!' : 'Thank you for contacting us!' },
            { label: '', value: isRTL ? 'هل ترغب بتقييم الخدمة؟ ⭐' : 'Would you like to rate our service? ⭐' },
          ],
        };

      case 'closed':
        return {
          icon: Lock,
          color: 'text-muted-foreground bg-muted/50 border-border',
          title: isRTL ? '🔒 تم إغلاق الطلب' : '🔒 Ticket Closed',
          lines: [
            { 
              label: isRTL ? 'رقم التذكرة' : 'Ticket #', 
              value: `#${ticket.ticketNumber}` 
            },
          ],
        };

      case 'reopened':
        return {
          icon: RefreshCw,
          color: 'text-warning bg-warning/10 border-warning/20',
          title: isRTL 
            ? `🔁 تم إعادة فتح طلب دعم (#${ticket.ticketNumber})`
            : `🔁 Support Ticket Reopened (#${ticket.ticketNumber})`,
          lines: [
            { label: isRTL ? '📂 القسم' : '📂 Category', value: categoryName },
            { label: isRTL ? '🕐 الوقت' : '🕐 Time', value: ticket.createdAt },
          ],
        };

      default:
        return { icon: Bell, color: '', title: '', lines: [] };
    }
  };

  const content = getContent();
  const Icon = content.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="flex justify-center my-4"
    >
      <div className={`w-full max-w-sm px-4 py-3 rounded-xl border text-sm ${content.color}`}>
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <p className="font-semibold text-sm">{content.title}</p>
            {content.lines.map((line, idx) => (
              <p key={idx} className="text-xs opacity-80">
                {line.label ? `${line.label}: ${line.value}` : line.value}
              </p>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
