import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Paperclip, Star, Headphones, ArrowLeft, MoreVertical, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSupport, SupportMessage } from '@/contexts/SupportContext';
import { SupportTicketBlock } from '@/components/chat/SupportTicketBlock';
import { useBanner } from '@/contexts/BannerContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SupportChatViewProps {
  onBack: () => void;
}

export function SupportChatView({ onBack }: SupportChatViewProps) {
  const { language } = useLanguage();
  const { 
    messages, 
    currentTicket, 
    hasActiveTicket, 
    sendMessage, 
    closeTicket,
    markAsRead 
  } = useSupport();
  const { success: showSuccess } = useBanner();
  
  const isRTL = language === 'ar';
  const [message, setMessage] = useState('');
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mark as read when viewing
  useEffect(() => {
    markAsRead();
  }, [markAsRead]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!message.trim()) return;
    sendMessage(message);
    setMessage('');
  };

  const handleCloseTicket = () => {
    closeTicket();
    setRatingDialogOpen(true);
  };

  const handleSubmitRating = () => {
    showSuccess(isRTL ? 'شكراً لتقييمك!' : 'Thank you for your feedback!');
    setRatingDialogOpen(false);
    setSelectedRating(0);
  };

  const getStatusBadge = () => {
    if (!currentTicket) {
      return (
        <Badge variant="outline" className="text-muted-foreground text-xs">
          {isRTL ? 'لا توجد تذكرة نشطة' : 'No active ticket'}
        </Badge>
      );
    }
    
    switch (currentTicket.status) {
      case 'open':
        return (
          <Badge variant="secondary" className="gap-1 text-xs">
            <Clock className="h-3 w-3" />
            {isRTL ? 'بانتظار الدعم' : 'Waiting'}
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge variant="default" className="bg-success text-success-foreground gap-1 text-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            {isRTL ? 'قيد المعالجة' : 'In Progress'}
          </Badge>
        );
      case 'resolved':
        return (
          <Badge variant="outline" className="text-muted-foreground text-xs">
            {isRTL ? 'تم الحل' : 'Resolved'}
          </Badge>
        );
      default:
        return null;
    }
  };

  const displayName = currentTicket?.assignedAgent 
    ? (isRTL ? currentTicket.assignedAgent.nameAr : currentTicket.assignedAgent.name)
    : (isRTL ? 'دعم Winova' : 'Winova Support');

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border bg-card flex items-center gap-2 shrink-0">
        <Button 
          variant="ghost" 
          size="icon"
          className="h-9 w-9"
          onClick={onBack}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* Avatar */}
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">
            {currentTicket?.assignedAgent 
              ? currentTicket.assignedAgent.avatar 
              : <Headphones className="w-5 h-5 text-primary" />
            }
          </div>
          {currentTicket?.status === 'in_progress' && (
            <span className="absolute bottom-0 end-0 w-3 h-3 bg-success rounded-full border-2 border-card" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium truncate">{displayName}</p>
            {getStatusBadge()}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {isRTL ? 'فريق دعم WINOVA' : 'WINOVA Support Team'}
          </p>
        </div>

        {/* More options */}
        {hasActiveTicket && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCloseTicket}>
                {isRTL ? 'إغلاق التذكرة' : 'Close Ticket'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Headphones className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm">
                {isRTL 
                  ? 'اختر قسم من مركز المساعدة لفتح تذكرة دعم'
                  : 'Choose a category from Help Center to open a support ticket'}
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id}>
                {msg.type === 'system' && msg.ticket && msg.systemType ? (
                  <SupportTicketBlock 
                    ticket={msg.ticket} 
                    type={msg.systemType === 'ticket_opened' ? 'opened' : msg.systemType} 
                  />
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'} mb-2`}
                  >
                    <div className={`max-w-[85%] px-3 py-2 rounded-2xl ${
                      msg.type === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-sm' 
                        : 'bg-muted rounded-bl-sm'
                    }`}>
                      {msg.type === 'agent' && msg.senderName && (
                        <p className="text-xs font-medium mb-1 opacity-70">{msg.senderName}</p>
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      <span className="text-[10px] opacity-60 block text-end mt-1">{msg.time}</span>
                    </div>
                  </motion.div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-border bg-card safe-bottom">
        {!hasActiveTicket && messages.length > 0 ? (
          <div className="text-center text-sm text-muted-foreground py-2">
            {isRTL ? 'لا توجد تذكرة نشطة' : 'No active ticket'}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="shrink-0">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={isRTL ? 'اكتب رسالتك...' : 'Type your message...'}
              className="flex-1"
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={!hasActiveTicket && messages.length > 0}
            />
            <Button 
              size="icon" 
              onClick={handleSend} 
              disabled={!message.trim() || (!hasActiveTicket && messages.length > 0)}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Rating Dialog */}
      <Dialog open={ratingDialogOpen} onOpenChange={setRatingDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-center">
              {isRTL ? 'قيّم تجربتك' : 'Rate Your Experience'}
            </DialogTitle>
            <DialogDescription className="text-center">
              {isRTL 
                ? 'كيف كانت تجربتك مع فريق الدعم؟'
                : 'How was your experience with our support team?'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-center gap-2 py-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setSelectedRating(star)}
                className="p-1 transition-transform hover:scale-110"
              >
                <Star 
                  className={`h-8 w-8 ${
                    star <= selectedRating 
                      ? 'fill-warning text-warning' 
                      : 'text-muted-foreground'
                  }`}
                />
              </button>
            ))}
          </div>
          
          <Button 
            onClick={handleSubmitRating}
            disabled={selectedRating === 0}
            className="w-full"
          >
            {isRTL ? 'إرسال التقييم' : 'Submit Rating'}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
