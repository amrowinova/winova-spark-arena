import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Reply, 
  Forward, 
  Copy, 
  Trash2, 
  Pin, 
  MoreVertical,
  Check,
  CheckCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MessageReactions, ReactionPicker } from './MessageReactions';
import { TransactionCard } from './TransactionCard';
import { useLanguage } from '@/contexts/LanguageContext';
import { Receipt } from '@/contexts/TransactionContext';

interface Reaction {
  emoji: string;
  count: number;
  userReacted: boolean;
}

export interface ChatMessage {
  id: string;
  sender: string;
  senderId: string;
  content: string;
  time: string;
  isMine: boolean;
  pinned?: boolean;
  forwarded?: boolean;
  replyTo?: {
    id: string;
    sender: string;
    content: string;
  };
  reactions?: Reaction[];
  read?: boolean;
  // Transaction data
  transaction?: {
    type: 'vote' | 'transfer' | 'win' | 'aura';
    amount: number;
    description: string;
    receipt?: Receipt;
  };
}

interface MessageBubbleProps {
  message: ChatMessage;
  onReply: (message: ChatMessage) => void;
  onForward: (message: ChatMessage) => void;
  onCopy: (content: string) => void;
  onDelete: (messageId: string) => void;
  onPin: (message: ChatMessage) => void;
  onReact: (messageId: string, emoji: string) => void;
  onTransactionClick?: (receipt: Receipt) => void;
  onScrollToMessage?: (messageId: string) => void;
}

export function MessageBubble({
  message,
  onReply,
  onForward,
  onCopy,
  onDelete,
  onPin,
  onReact,
  onTransactionClick,
  onScrollToMessage,
}: MessageBubbleProps) {
  const { language } = useLanguage();
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const handleReplyClick = () => {
    if (message.replyTo?.id && onScrollToMessage) {
      onScrollToMessage(message.replyTo.id);
    }
  };

  const handleReact = (emoji: string) => {
    onReact(message.id, emoji);
    setShowReactionPicker(false);
  };

  // Transaction message
  if (message.transaction) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex ${message.isMine ? 'justify-end' : 'justify-start'} mb-3`}
      >
        <div className="max-w-[85%]">
          <TransactionCard
            type={message.transaction.type}
            amount={message.transaction.amount}
            description={message.transaction.description}
            time={message.time}
            receipt={message.transaction.receipt}
            onClick={() => {
              if (message.transaction?.receipt && onTransactionClick) {
                onTransactionClick(message.transaction.receipt);
              }
            }}
          />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group flex ${message.isMine ? 'justify-end' : 'justify-start'} mb-3`}
    >
      <div className={`max-w-[85%] ${message.isMine ? 'order-2' : ''}`}>
        {/* Pinned indicator */}
        {message.pinned && (
          <div className="flex items-center gap-1 text-xs text-primary mb-1">
            <Pin className="h-3 w-3" />
            {language === 'ar' ? 'مثبت' : 'Pinned'}
          </div>
        )}

        {/* Forwarded label */}
        {message.forwarded && (
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
            <Forward className="h-3 w-3" />
            {language === 'ar' ? 'مُعاد توجيهها' : 'Forwarded'}
          </div>
        )}

        {/* Reply preview - clickable to scroll */}
        {message.replyTo && (
          <div 
            onClick={handleReplyClick}
            className={`mb-1 px-3 py-1.5 rounded-lg text-xs border-s-2 cursor-pointer hover:opacity-80 transition-opacity ${
              message.isMine 
                ? 'bg-primary/20 border-primary-foreground/50' 
                : 'bg-muted border-primary'
            }`}
          >
            <p className="font-medium text-[10px] opacity-70">{message.replyTo.sender}</p>
            <p className="truncate">{message.replyTo.content}</p>
          </div>
        )}

        <div className="relative">
          {/* Message bubble */}
          <div 
            className={`px-3 py-2 rounded-2xl ${
              message.isMine 
                ? 'bg-primary text-primary-foreground rounded-br-sm' 
                : 'bg-muted rounded-bl-sm'
            }`}
          >
            {!message.isMine && (
              <p className="text-xs font-medium mb-1 opacity-70">{message.sender}</p>
            )}
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
            
            {/* Time and read status */}
            <div className={`flex items-center gap-1 mt-1 ${message.isMine ? 'justify-end' : ''}`}>
              <span className="text-[10px] opacity-60">{message.time}</span>
              {message.isMine && (
                message.read 
                  ? <CheckCheck className="h-3 w-3 text-info" />
                  : <Check className="h-3 w-3 opacity-60" />
              )}
            </div>
          </div>

          {/* Context menu */}
          <div className={`absolute top-0 ${message.isMine ? '-start-8' : '-end-8'} opacity-0 group-hover:opacity-100 transition-opacity`}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={message.isMine ? 'start' : 'end'}>
                <DropdownMenuItem onClick={() => onReply(message)}>
                  <Reply className="h-4 w-4 me-2" />
                  {language === 'ar' ? 'رد' : 'Reply'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onForward(message)}>
                  <Forward className="h-4 w-4 me-2" />
                  {language === 'ar' ? 'إعادة توجيه' : 'Forward'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onCopy(message.content)}>
                  <Copy className="h-4 w-4 me-2" />
                  {language === 'ar' ? 'نسخ' : 'Copy'}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onPin(message)}>
                  <Pin className="h-4 w-4 me-2" />
                  {message.pinned 
                    ? (language === 'ar' ? 'إلغاء التثبيت' : 'Unpin')
                    : (language === 'ar' ? 'تثبيت' : 'Pin')
                  }
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onDelete(message.id)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 me-2" />
                  {language === 'ar' ? 'حذف' : 'Delete'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Quick reaction on double tap (mobile) */}
          {showReactionPicker && (
            <div className={`absolute -top-12 ${message.isMine ? 'end-0' : 'start-0'} z-10`}>
              <ReactionPicker onSelect={handleReact} />
            </div>
          )}
        </div>

        {/* Reactions */}
        <MessageReactions
          reactions={message.reactions || []}
          onReact={(emoji) => onReact(message.id, emoji)}
          isMine={message.isMine}
        />
      </div>
    </motion.div>
  );
}
