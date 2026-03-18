import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Users, Megaphone, Reply, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { TeamChatHeader } from './TeamChatHeader';
import { TeamInfoSheet, TeamChatMember } from './TeamInfoSheet';
import { MessageReactions } from './MessageReactions';
import { TeamConversation, TeamMessage } from '@/hooks/useTeamChat';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRank } from '@/contexts/UserContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const QUICK_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🔥'];

interface TeamChatViewProps {
  conversation: TeamConversation;
  messages: TeamMessage[];
  members: TeamChatMember[];
  onBack: () => void;
  onSendMessage: (
    conversationId: string,
    content: string,
    type?: 'text' | 'announcement',
    replyToId?: string,
    replyToContent?: string,
    replyToSender?: string,
  ) => Promise<void>;
  onToggleReaction?: (conversationId: string, messageId: string, emoji: string) => void;
}

export function TeamChatView({
  conversation,
  messages,
  members,
  onBack,
  onSendMessage,
  onToggleReaction,
}: TeamChatViewProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const isRTL = language === 'ar';
  const [message, setMessage] = useState('');
  const [teamInfoOpen, setTeamInfoOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [replyTo, setReplyTo] = useState<TeamMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const isLeader = conversation.userRole === 'leader';
  const activeCount = members.filter(m => m.active).length;

  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
    return () => clearTimeout(timer);
  }, [messages.length]);

  const scrollToMessage = useCallback((messageId: string) => {
    const el = messageRefs.current.get(messageId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add('bg-primary/20');
      setTimeout(() => el.classList.remove('bg-primary/20'), 1500);
    }
  }, []);

  const handleSend = async () => {
    if (!message.trim()) return;
    const content = message.trim();
    const reply = replyTo;
    setMessage('');
    setReplyTo(null);
    await onSendMessage(conversation.id, content, 'text', reply?.id, reply?.content, reply?.senderName);
  };

  const handleAnnounce = async () => {
    if (!message.trim() || !isLeader) return;
    const content = message.trim();
    setMessage('');
    setReplyTo(null);
    await onSendMessage(conversation.id, content, 'announcement');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReply = (msg: TeamMessage) => {
    setReplyTo(msg);
    inputRef.current?.focus();
  };

  const handleReact = (messageId: string, emoji: string) => {
    onToggleReaction?.(conversation.id, messageId, emoji);
  };

  const teamName = conversation.userRole === 'leader'
    ? (isRTL ? 'فريقي' : 'My Team')
    : (isRTL ? `فريق ${conversation.leaderName}` : `${conversation.leaderName}'s Team`);

  const manager = {
    id: conversation.leaderId,
    name: conversation.leaderName,
    nameAr: conversation.leaderName,
    avatar: '👤',
    rank: 'leader' as UserRank,
    active: true,
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="flex-shrink-0">
        <TeamChatHeader
          teamName={teamName}
          teamNameAr={teamName}
          memberCount={conversation.memberCount}
          activeCount={activeCount}
          isMuted={isMuted}
          onBack={onBack}
          onOpenInfo={() => setTeamInfoOpen(true)}
          onToggleMute={() => setIsMuted(!isMuted)}
          onRemindInactive={() => {}}
        />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="p-4 space-y-1 pb-2">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>{isRTL ? 'ابدأ المحادثة مع فريقك' : 'Start chatting with your team'}</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                ref={(el) => { if (el) messageRefs.current.set(msg.id, el); }}
                className="transition-colors duration-500 rounded-lg"
              >
                <TeamMessageBubble
                  message={msg}
                  language={language}
                  onReply={handleReply}
                  onReact={handleReact}
                  onScrollToReply={scrollToMessage}
                />
              </div>
            ))
          )}
          <div ref={messagesEndRef} className="h-1" />
        </div>
      </div>

      {/* Input */}
      <div
        className="flex-shrink-0 bg-card border-t border-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Reply Preview */}
        {replyTo && (
          <div className="px-3 pt-2 pb-1 flex items-center gap-2 bg-muted/50 border-b border-border">
            <Reply className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium text-primary">{replyTo.senderName}</span>
              <p className="text-xs text-muted-foreground truncate">{replyTo.content}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => setReplyTo(null)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        <div className="p-3 flex items-center gap-2">
          {isLeader && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-10 w-10"
              onClick={handleAnnounce}
              disabled={!message.trim()}
              title={isRTL ? 'إعلان' : 'Announce'}
            >
              <Megaphone className="h-4 w-4 text-warning" />
            </Button>
          )}
          <Input
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isRTL ? 'اكتب رسالة...' : 'Type a message...'}
            className="flex-1"
            autoComplete="off"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!message.trim()}
            className="shrink-0 h-10 w-10"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <TeamInfoSheet
        open={teamInfoOpen}
        onClose={() => setTeamInfoOpen(false)}
        teamName={teamName}
        teamNameAr={teamName}
        manager={manager}
        members={members}
      />
    </div>
  );
}

// ---- Internal Message Bubble with reply + reactions ----

interface TeamMessageBubbleProps {
  message: TeamMessage;
  language: string;
  onReply?: (msg: TeamMessage) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onScrollToReply?: (messageId: string) => void;
}

function TeamMessageBubble({ message, language, onReply, onReact, onScrollToReply }: TeamMessageBubbleProps) {
  const [showEmojis, setShowEmojis] = useState(false);
  const isRTL = language === 'ar';

  if (message.messageType === 'system') {
    return (
      <div className="flex justify-center my-2">
        <div className="px-3 py-1.5 bg-muted/50 rounded-full text-xs text-muted-foreground">
          {message.content}
        </div>
      </div>
    );
  }

  if (message.messageType === 'announcement') {
    return (
      <div className="my-2 mx-2 p-3 bg-warning/10 border border-warning/30 rounded-xl">
        <div className="flex items-center gap-1.5 text-xs text-warning mb-1">
          <Megaphone className="h-3 w-3" />
          {isRTL ? 'إعلان' : 'Announcement'}
        </div>
        <p className="text-sm">{message.content}</p>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-muted-foreground">{message.senderName}</span>
          <span className="text-[10px] text-muted-foreground">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative flex ${message.isMine ? 'justify-end' : 'justify-start'} mb-1`}
    >
      <div className="max-w-[85%]">
        {/* Reply reference */}
        {message.replyToId && (
          <div
            onClick={() => message.replyToId && onScrollToReply?.(message.replyToId)}
            className={`mb-1 px-3 py-1.5 rounded-lg text-xs border-s-2 cursor-pointer hover:opacity-80 transition-opacity ${
              message.isMine
                ? 'bg-primary/20 border-primary-foreground/50'
                : 'bg-muted border-primary'
            }`}
          >
            <p className="font-medium text-[10px] opacity-70">{message.replyToSender}</p>
            <p className="truncate">{message.replyToContent}</p>
          </div>
        )}

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
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>

          {/* Time + quick actions row */}
          <div className={`flex items-center gap-1 mt-1 ${message.isMine ? 'justify-end' : ''}`}>
            <span className="text-[10px] opacity-60 block">
              {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Reactions display */}
        {message.reactions && message.reactions.length > 0 && (
          <MessageReactions
            reactions={message.reactions}
            onReact={(emoji) => onReact?.(message.id, emoji)}
            isMine={message.isMine}
          />
        )}

        {/* Hover actions: emoji + reply */}
        <AnimatePresence>
          <div className={`flex items-center gap-1 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${message.isMine ? 'justify-end' : 'justify-start'}`}>
            {QUICK_EMOJIS.map(emoji => (
              <button
                key={emoji}
                className="text-base hover:scale-125 transition-transform"
                onClick={() => onReact?.(message.id, emoji)}
              >
                {emoji}
              </button>
            ))}
            <button
              className="p-1 rounded hover:bg-muted transition-colors"
              onClick={() => onReply?.(message)}
            >
              <Reply className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
