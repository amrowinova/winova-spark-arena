import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Reply,
  Forward,
  Copy,
  Info,
  Check,
  CheckCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { MessageReactions, ReactionPicker } from './MessageReactions';

export interface DMMessageData {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  messageType: string;
  isRead: boolean;
  createdAt: string;
  isMine: boolean;
  transferAmount?: number | null;
  replyTo?: {
    id: string;
    sender: string;
    content: string;
  };
  reactions?: Array<{
    emoji: string;
    count: number;
    userReacted: boolean;
  }>;
}

interface DMMessageBubbleProps {
  message: DMMessageData;
  onReply?: (message: DMMessageData) => void;
  onForward?: (message: DMMessageData) => void;
  onCopy?: (content: string) => void;
  onInfo?: (message: DMMessageData) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onScrollToMessage?: (messageId: string) => void;
  // Status indicators
  showReadReceipts?: boolean;
  isDelivered?: boolean;
}

export function DMMessageBubble({
  message,
  onReply,
  onForward,
  onCopy,
  onInfo,
  onReact,
  onScrollToMessage,
  showReadReceipts = true,
  isDelivered = true,
}: DMMessageBubbleProps) {
  const { language } = useLanguage();
  const [showActions, setShowActions] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Long press detection
  const handleTouchStart = () => {
    longPressTimer.current = setTimeout(() => {
      setShowActions(true);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowActions(true);
  };

  // Close actions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bubbleRef.current && !bubbleRef.current.contains(e.target as Node)) {
        setShowActions(false);
        setShowReactionPicker(false);
      }
    };

    if (showActions || showReactionPicker) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showActions, showReactionPicker]);

  const handleReplyClick = () => {
    if (message.replyTo?.id && onScrollToMessage) {
      onScrollToMessage(message.replyTo.id);
    }
  };

  const handleReact = (emoji: string) => {
    onReact?.(message.id, emoji);
    setShowReactionPicker(false);
    setShowActions(false);
  };

  // Get read status indicator
  const getStatusIndicator = () => {
    if (!message.isMine || !showReadReceipts) return null;

    if (message.isRead) {
      // Read - blue double check
      return <CheckCheck className="h-3.5 w-3.5 text-info" />;
    } else if (isDelivered) {
      // Delivered - gray double check
      return <CheckCheck className="h-3.5 w-3.5 text-muted-foreground/60" />;
    } else {
      // Sent - single check
      return <Check className="h-3.5 w-3.5 text-muted-foreground/60" />;
    }
  };

  return (
    <motion.div
      ref={bubbleRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative flex ${message.isMine ? 'justify-end' : 'justify-start'} mb-2`}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onContextMenu={handleContextMenu}
    >
      <div className="max-w-[85%]">
        {/* Reply preview */}
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

        {/* Message bubble */}
        <div
          className={`relative px-3 py-2 rounded-2xl ${
            message.isMine
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-muted rounded-bl-sm'
          }`}
        >
          {!message.isMine && (
            <p className="text-xs font-medium mb-1 opacity-70">{message.senderName}</p>
          )}

          {/* Transfer indicator */}
          {message.messageType === 'transfer' && message.transferAmount ? (
            <div className="bg-success/20 rounded-lg p-2 mb-1">
              <p className="text-sm font-medium">
                💸 {language === 'ar' ? 'تحويل Nova' : 'Nova Transfer'}
              </p>
              <p className="text-lg font-bold">{message.transferAmount} И</p>
            </div>
          ) : null}

          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>

          {/* Time and status */}
          <div className={`flex items-center gap-1 mt-1 ${message.isMine ? 'justify-end' : ''}`}>
            <span className="text-[10px] opacity-60">
              {new Date(message.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            {getStatusIndicator()}
          </div>
        </div>

        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <MessageReactions
            reactions={message.reactions}
            onReact={(emoji) => onReact?.(message.id, emoji)}
            isMine={message.isMine}
          />
        )}

        {/* Long-press action menu */}
        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              className={`absolute z-50 ${
                message.isMine ? 'end-0' : 'start-0'
              } -top-14 flex items-center gap-1 bg-card border border-border rounded-xl p-1 shadow-lg`}
            >
              {/* Quick reaction picker */}
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-lg"
                onClick={() => setShowReactionPicker(!showReactionPicker)}
              >
                😊
              </Button>

              <div className="w-px h-6 bg-border" />

              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => {
                  onReply?.(message);
                  setShowActions(false);
                }}
              >
                <Reply className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => {
                  onForward?.(message);
                  setShowActions(false);
                }}
              >
                <Forward className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => {
                  onCopy?.(message.content);
                  setShowActions(false);
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => {
                  onInfo?.(message);
                  setShowActions(false);
                }}
              >
                <Info className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reaction picker */}
        <AnimatePresence>
          {showReactionPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`absolute z-50 ${message.isMine ? 'end-0' : 'start-0'} -top-24`}
            >
              <ReactionPicker onSelect={handleReact} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
