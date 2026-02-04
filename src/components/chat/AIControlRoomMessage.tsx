import { motion } from 'framer-motion';
import { Bot, AlertTriangle, Info, CheckCircle, MessageCircle } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  AIControlRoomMessage as AIMessage, 
  AIControlRoomFinding,
  getAgentEmoji, 
  getCategoryBadge,
  getCategoryColor 
} from '@/hooks/useAIControlRoom';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface AIControlRoomMessageProps {
  message: (AIMessage & { type: 'message' }) | (AIControlRoomFinding & { type: 'finding'; content: string; contentAr: string | null });
}

export function AIControlRoomMessageBubble({ message }: AIControlRoomMessageProps) {
  const { language } = useLanguage();
  
  const agentName = language === 'ar' ? message.agentNameAr : message.agentName;
  const content = language === 'ar' ? (message.contentAr || message.content) : message.content;
  const emoji = getAgentEmoji(message.agentRole);
  const categoryBadge = getCategoryBadge(message.messageCategory, language as 'ar' | 'en');
  const categoryColorClass = getCategoryColor(message.messageCategory);
  
  const formattedTime = format(
    new Date(message.createdAt), 
    'HH:mm', 
    { locale: language === 'ar' ? ar : enUS }
  );
  
  const formattedDate = format(
    new Date(message.createdAt), 
    'dd MMM', 
    { locale: language === 'ar' ? ar : enUS }
  );

  // Get icon based on category
  const getCategoryIcon = () => {
    switch (message.messageCategory) {
      case 'critical':
        return <AlertTriangle className="h-3 w-3" />;
      case 'warning':
        return <AlertTriangle className="h-3 w-3" />;
      case 'info':
        return <Info className="h-3 w-3" />;
      case 'success':
        return <CheckCircle className="h-3 w-3" />;
      default:
        return <MessageCircle className="h-3 w-3" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 py-2"
    >
      {/* AI Agent Avatar */}
      <Avatar className="h-9 w-9 shrink-0 border-2 border-primary/20">
        <AvatarFallback className="bg-primary/10 text-lg">
          {emoji}
        </AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        {/* Header: Agent Name + Time */}
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-semibold text-sm text-foreground">
            {emoji} {agentName}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {formattedTime} · {formattedDate}
          </span>
          
          {/* Category Badge */}
          <Badge 
            variant="outline" 
            className={`text-[10px] px-1.5 py-0 h-5 ${categoryColorClass}`}
          >
            <span className="me-1">{categoryBadge.emoji}</span>
            {categoryBadge.label}
          </Badge>
        </div>

        {/* Finding Title (if it's a finding) */}
        {message.type === 'finding' && (
          <div className="font-medium text-sm mb-1 text-foreground">
            {language === 'ar' ? message.titleAr || message.title : message.title}
          </div>
        )}

        {/* Message Body */}
        <div className={`rounded-xl p-3 border ${categoryColorClass} bg-opacity-50`}>
          <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
            {content}
          </p>
          
          {/* Technical Details for Findings */}
          {message.type === 'finding' && message.technicalReason && (
            <div className="mt-2 pt-2 border-t border-current/10">
              <p className="text-xs opacity-80">
                <span className="font-medium">
                  {language === 'ar' ? '💡 السبب التقني:' : '💡 Technical Reason:'}
                </span>{' '}
                {message.technicalReason}
              </p>
            </div>
          )}
          
          {/* Suggested Fix for Findings */}
          {message.type === 'finding' && message.suggestedFix && (
            <div className="mt-2 pt-2 border-t border-current/10">
              <p className="text-xs opacity-80">
                <span className="font-medium">
                  {language === 'ar' ? '🛠️ الحل المقترح:' : '🛠️ Suggested Fix:'}
                </span>{' '}
                {message.suggestedFix}
              </p>
            </div>
          )}
          
          {/* Affected Area */}
          {message.type === 'finding' && message.affectedArea && (
            <div className="mt-2">
              <Badge variant="secondary" className="text-[10px]">
                📍 {message.affectedArea}
              </Badge>
            </div>
          )}
        </div>

        {/* Summary indicator */}
        {message.type === 'message' && message.isSummary && (
          <Badge variant="secondary" className="mt-1 text-[10px]">
            📋 {language === 'ar' ? 'ملخص الجلسة' : 'Session Summary'}
          </Badge>
        )}
      </div>
    </motion.div>
  );
}
