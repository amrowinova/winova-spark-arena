import { X, Reply } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';

interface ReplyBarProps {
  replyTo: {
    sender: string;
    content: string;
  };
  onCancel: () => void;
}

export function ReplyBar({ replyTo, onCancel }: ReplyBarProps) {
  const { language } = useLanguage();

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-muted/50 border-t border-border animate-in slide-in-from-bottom-2 duration-200">
      <Reply className="h-4 w-4 text-primary shrink-0" />
      <div className="flex-1 min-w-0 border-s-2 border-primary ps-2">
        <p className="text-xs text-primary font-medium truncate">
          {language === 'ar' ? 'الرد على' : 'Replying to'} {replyTo.sender}
        </p>
        <p className="text-xs text-muted-foreground truncate">{replyTo.content}</p>
      </div>
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-7 w-7 shrink-0 hover:bg-destructive/10 hover:text-destructive" 
        onClick={onCancel}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
