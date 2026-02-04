import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { AIMessage, getAgentEmoji, getCategoryStyle } from '@/hooks/useAIControlRoomRealtime';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

interface AIRoomMessageProps {
  message: AIMessage;
}

export function AIRoomMessage({ message }: AIRoomMessageProps) {
  const { language } = useLanguage();
  const [copied, setCopied] = useState(false);
  
  const isHuman = message.isHuman || message.messageCategory === 'human';
  const isLeader = message.agentRole === 'engineering_lead' || message.messageCategory === 'leader_response';
  
  // Leader gets special treatment
  const emoji = isHuman 
    ? '👤' 
    : isLeader 
      ? '🧠' 
      : getAgentEmoji(message.agentRole);
  
  const name = isHuman 
    ? (language === 'ar' ? 'عمرو' : 'Amro')
    : isLeader
      ? (language === 'ar' ? 'القائد الهندسي' : 'Engineering Lead')
      : (language === 'ar' ? message.agentNameAr : message.agentName);
  
  const content = language === 'ar' ? (message.contentAr || message.content) : message.content;
  const style = isLeader 
    ? { bg: 'bg-primary/10', border: 'border-primary/30', text: 'text-primary' }
    : getCategoryStyle(message.messageCategory);
  
  const time = format(new Date(message.createdAt), 'HH:mm', { 
    locale: language === 'ar' ? ar : enUS 
  });

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Category badge text
  const categoryLabel = {
    critical: language === 'ar' ? 'خطر' : 'Critical',
    warning: language === 'ar' ? 'تحذير' : 'Warning',
    info: language === 'ar' ? 'معلومة' : 'Info',
    success: language === 'ar' ? 'نجاح' : 'Success',
    leader_response: language === 'ar' ? 'رد القائد' : 'Leader',
    human: language === 'ar' ? 'سؤال' : 'Question',
    discussion: language === 'ar' ? 'نقاش' : 'Discussion',
  }[message.messageCategory] || (isLeader ? (language === 'ar' ? 'رد القائد' : 'Leader') : 'Discussion');

  return (
    <div className="flex gap-2 py-1.5 group">
      {/* Small Avatar */}
      <Avatar className={`h-7 w-7 shrink-0 ${isHuman ? 'ring-1 ring-primary/50' : isLeader ? 'ring-2 ring-primary' : ''}`}>
        <AvatarFallback className={`text-sm ${isLeader ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
          {emoji}
        </AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="font-medium text-xs text-foreground">
            {name}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {time}
          </span>
          <Badge 
            variant="outline" 
            className={`text-[9px] px-1 py-0 h-4 ${style.bg} ${style.border} ${style.text}`}
          >
            {categoryLabel}
          </Badge>
          
          {/* Copy - visible on hover */}
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity ms-auto"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="h-3 w-3 text-success" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>

        {/* Content - Short and direct */}
        <div className={`rounded-lg px-2.5 py-1.5 text-sm ${style.bg} ${style.border} border`}>
          <p className="whitespace-pre-wrap break-words leading-relaxed">
            {content}
          </p>
        </div>
      </div>
    </div>
  );
}
