import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Info, CheckCircle, MessageCircle, User, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { useToast } from '@/hooks/use-toast';

interface AIControlRoomMessageProps {
  message: (AIMessage & { type: 'message' }) | (AIControlRoomFinding & { type: 'finding'; content: string; contentAr: string | null });
}

const MAX_COLLAPSED_LENGTH = 300;

export function AIControlRoomMessageBubble({ message }: AIControlRoomMessageProps) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  
  const isHumanQuestion = message.messageCategory === 'human' || 
    (message.type === 'message' && message.messageType === 'human_question');
  
  const agentName = isHumanQuestion 
    ? (language === 'ar' ? '👤 المدير' : '👤 Manager')
    : (language === 'ar' ? message.agentNameAr : message.agentName);
  const content = language === 'ar' ? (message.contentAr || message.content) : message.content;
  const emoji = isHumanQuestion ? '👤' : getAgentEmoji(message.agentRole);
  const categoryBadge = getCategoryBadge(message.messageCategory, language as 'ar' | 'en');
  const categoryColorClass = isHumanQuestion 
    ? 'bg-primary/10 text-primary border-primary/30'
    : getCategoryColor(message.messageCategory);
  
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

  // Check if content is long enough to need expansion
  const needsExpansion = content.length > MAX_COLLAPSED_LENGTH;
  const displayContent = needsExpansion && !expanded 
    ? content.slice(0, MAX_COLLAPSED_LENGTH) + '...' 
    : content;

  // Copy handler
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast({
        title: language === 'ar' ? 'تم النسخ' : 'Copied',
        description: language === 'ar' ? 'تم نسخ النص' : 'Text copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل في النسخ' : 'Failed to copy',
        variant: 'destructive',
      });
    }
  };

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
      case 'human':
        return <User className="h-3 w-3" />;
      default:
        return <MessageCircle className="h-3 w-3" />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 py-2 group"
    >
      {/* Avatar */}
      <Avatar className={`h-9 w-9 shrink-0 border-2 ${isHumanQuestion ? 'border-primary/40' : 'border-primary/20'}`}>
        <AvatarFallback className={`${isHumanQuestion ? 'bg-primary/20' : 'bg-primary/10'} text-lg`}>
          {emoji}
        </AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        {/* Header: Agent Name + Time + Copy Button */}
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

          {/* Copy Button - Always visible on mobile, hover on desktop */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity ms-auto"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-success" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
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
            {displayContent}
          </p>
          
          {/* Expand/Collapse Button */}
          {needsExpansion && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-7 text-xs px-2"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <>
                  <ChevronUp className="h-3 w-3 me-1" />
                  {language === 'ar' ? 'عرض أقل' : 'Show less'}
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 me-1" />
                  {language === 'ar' ? 'عرض كامل الرد' : 'Show full response'}
                </>
              )}
            </Button>
          )}
          
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
