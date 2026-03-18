import { useState, useRef, useEffect, forwardRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  CheckCheck,
  CornerDownRight,
  Copy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { MessageReactions } from './MessageReactions';
import { MessageActionMenu } from './MessageActionMenu';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { isFeatureEnabled } from '@/lib/featureFlags';


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
  imageUrl?: string | null;
  deletedAt?: string | null;
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
  isForwarded?: boolean;
  isPending?: boolean;
  deliveredAt?: string | null;
}

interface DMMessageBubbleProps {
  message: DMMessageData;
  onReply?: (message: DMMessageData) => void;
  onForward?: (message: DMMessageData) => void;
  onCopy?: (content: string) => void;
  onInfo?: (message: DMMessageData) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onScrollToMessage?: (messageId: string) => void;
  onStar?: (message: DMMessageData) => void;
  onReport?: (message: DMMessageData) => void;
  onDelete?: (messageId: string) => void;
  showReadReceipts?: boolean;
}

// Max chars before showing "Show more" button
const MAX_MESSAGE_LENGTH = 300;

export const DMMessageBubble = forwardRef<HTMLDivElement, DMMessageBubbleProps>(
  function DMMessageBubble(
    {
      message,
      onReply,
      onForward,
      onCopy,
      onInfo,
      onReact,
      onScrollToMessage,
      onStar,
      onReport,
      onDelete,
      showReadReceipts = true,
    },
    ref
  ) {
    const { language } = useLanguage();
    const { toast } = useToast();
    const [showActions, setShowActions] = useState(false);
    const [showReactionPicker, setShowReactionPicker] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const [copied, setCopied] = useState(false);
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);
    const bubbleRef = useRef<HTMLDivElement>(null);
    
    // Feature flag check
    const chatReliabilityEnabled = isFeatureEnabled('chat_reliability_v1');
    
    const isDeleted = !!message.deletedAt;

    // Check if message is long
    const isLongMessage = !isDeleted && message.content.length > MAX_MESSAGE_LENGTH;
    const displayContent = isLongMessage && !isExpanded
      ? message.content.slice(0, MAX_MESSAGE_LENGTH) + '...'
      : message.content;
    
    // Quick copy handler
    const handleQuickCopy = async () => {
      try {
        await navigator.clipboard.writeText(message.content);
        setCopied(true);
        toast({
          title: language === 'ar' ? 'تم النسخ' : 'Copied',
          description: language === 'ar' ? 'تم نسخ الرسالة' : 'Message copied',
        });
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast({
          title: language === 'ar' ? 'خطأ' : 'Error',
          description: language === 'ar' ? 'فشل النسخ' : 'Failed to copy',
          variant: 'destructive',
        });
      }
    };

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
      const handleClickOutside = (e: MouseEvent | TouchEvent) => {
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

    const closeActions = () => {
      setShowActions(false);
      setShowReactionPicker(false);
    };

    // Get read status indicator - Now with delivered support
    const getStatusIndicator = () => {
      if (!message.isMine || !showReadReceipts) return null;

      // Pending message
      if (message.isPending) {
        return <Check className="h-3.5 w-3.5 text-muted-foreground/40 animate-pulse" />;
      }

      if (message.isRead) {
        // Read - blue double check
        return <CheckCheck className="h-3.5 w-3.5 text-info" />;
      } else if (message.deliveredAt) {
        // Delivered - gray double check
        return <CheckCheck className="h-3.5 w-3.5 text-muted-foreground/60" />;
      } else {
        // Sent - single check
        return <Check className="h-3.5 w-3.5 text-muted-foreground/60" />;
      }
    };

    return (
      <motion.div
        ref={ref || bubbleRef}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`group relative flex ${message.isMine ? 'justify-end' : 'justify-start'} mb-1`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onContextMenu={handleContextMenu}
      >
        <div className="max-w-[85%]" ref={bubbleRef}>
          {/* Forwarded Label */}
          {message.isForwarded && (
            <div className={`flex items-center gap-1 text-xs text-muted-foreground mb-1 ${message.isMine ? 'justify-end' : ''}`}>
              <CornerDownRight className="h-3 w-3" />
              <span>{language === 'ar' ? 'تمت إعادة التوجيه' : 'Forwarded'}</span>
            </div>
          )}

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
            className={`relative px-3 py-2 rounded-2xl transition-opacity ${
              message.isPending ? 'opacity-70' : ''
            } ${
              message.isMine
                ? 'bg-primary text-primary-foreground rounded-br-sm'
                : 'bg-muted rounded-bl-sm'
            }`}
          >
            {!message.isMine && (
              <p className="text-xs font-medium mb-1 opacity-70">
                {message.senderName}
              </p>
            )}

            {/* Deleted message */}
            {isDeleted ? (
              <p className="text-sm italic opacity-50">
                🚫 {language === 'ar' ? 'تم حذف هذه الرسالة' : 'This message was deleted'}
              </p>
            ) : (
              <>
                {/* Transfer indicator */}
                {message.messageType === 'transfer' && message.transferAmount ? (
                  <div className="bg-success/20 rounded-lg p-2 mb-1">
                    <p className="text-sm font-medium">
                      💸 {language === 'ar' ? 'تحويل Nova' : 'Nova Transfer'}
                    </p>
                    <p className="text-lg font-bold">{message.transferAmount} И</p>
                  </div>
                ) : null}

                {/* Image */}
                {message.imageUrl && (
                  <a href={message.imageUrl} target="_blank" rel="noopener noreferrer" className="block mb-1">
                    <img
                      src={message.imageUrl}
                      alt="image"
                      className="max-w-full rounded-lg max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      loading="lazy"
                    />
                  </a>
                )}

                {/* Message text (skip if image-only) */}
                {(message.content && message.messageType !== 'image') || (message.imageUrl && message.content && message.content !== '📷 Image' && message.content !== '📷 صورة') ? (
                  <p className="text-sm whitespace-pre-wrap break-words">{displayContent}</p>
                ) : !message.imageUrl ? (
                  <p className="text-sm whitespace-pre-wrap break-words">{displayContent}</p>
                ) : null}
              </>
            )}
            
            {/* Show more/less button for long messages */}
            {!isDeleted && chatReliabilityEnabled && isLongMessage && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs px-2 mt-1 opacity-80 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-3 w-3 me-1" />
                    {language === 'ar' ? 'عرض أقل' : 'Show less'}
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 me-1" />
                    {language === 'ar' ? 'عرض المزيد' : 'Show more'}
                  </>
                )}
              </Button>
            )}

            {/* Time, status, and quick copy */}
            <div className={`flex items-center gap-1 mt-1 ${message.isMine ? 'justify-end' : ''}`}>
              {/* Quick copy button - visible on hover/tap */}
              {chatReliabilityEnabled && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickCopy();
                  }}
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-success" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </Button>
              )}
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
              <MessageActionMenu
                isMine={message.isMine}
                showReactionPicker={showReactionPicker}
                onToggleReactionPicker={() => setShowReactionPicker(!showReactionPicker)}
                onReact={handleReact}
                onReply={() => {
                  onReply?.(message);
                  closeActions();
                }}
                onForward={() => {
                  onForward?.(message);
                  closeActions();
                }}
                onCopy={() => {
                  onCopy?.(message.content);
                  closeActions();
                }}
                onInfo={() => {
                  onInfo?.(message);
                  closeActions();
                }}
                onStar={onStar ? () => {
                  onStar(message);
                  closeActions();
                } : undefined}
                onReport={!message.isMine && onReport ? () => {
                  onReport(message);
                  closeActions();
                } : undefined}
                onDelete={message.isMine && onDelete ? () => {
                  onDelete(message.id);
                  closeActions();
                } : undefined}
              />
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  }
);
