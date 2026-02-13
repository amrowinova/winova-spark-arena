import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Users, Megaphone } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { TeamChatHeader } from './TeamChatHeader';
import { TeamInfoSheet, TeamChatMember } from './TeamInfoSheet';
import { TeamConversation, TeamMessage } from '@/hooks/useTeamChat';
import { useAuth } from '@/contexts/AuthContext';
import type { UserRank } from '@/contexts/UserContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface TeamChatViewProps {
  conversation: TeamConversation;
  messages: TeamMessage[];
  members: TeamChatMember[];
  onBack: () => void;
  onSendMessage: (conversationId: string, content: string, type?: 'text' | 'announcement') => Promise<void>;
}

export function TeamChatView({
  conversation,
  messages,
  members,
  onBack,
  onSendMessage,
}: TeamChatViewProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [teamInfoOpen, setTeamInfoOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isLeader = conversation.userRole === 'leader';
  const activeCount = members.filter(m => m.active).length;

  // Auto-scroll on new messages
  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
    return () => clearTimeout(timer);
  }, [messages.length]);

  const handleSend = async () => {
    if (!message.trim()) return;
    const content = message.trim();
    setMessage('');
    await onSendMessage(conversation.id, content, 'text');
  };

  const handleAnnounce = async () => {
    if (!message.trim() || !isLeader) return;
    const content = message.trim();
    setMessage('');
    await onSendMessage(conversation.id, content, 'announcement');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const teamName = conversation.userRole === 'leader'
    ? (language === 'ar' ? 'فريقي' : 'My Team')
    : (language === 'ar' ? `فريق ${conversation.leaderName}` : `${conversation.leaderName}'s Team`);

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
              <p>{language === 'ar' ? 'ابدأ المحادثة مع فريقك' : 'Start chatting with your team'}</p>
            </div>
          ) : (
            messages.map((msg) => (
              <TeamMessageBubble key={msg.id} message={msg} language={language} />
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
        <div className="p-3 flex items-center gap-2">
          {isLeader && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-10 w-10"
              onClick={handleAnnounce}
              disabled={!message.trim()}
              title={language === 'ar' ? 'إعلان' : 'Announce'}
            >
              <Megaphone className="h-4 w-4 text-warning" />
            </Button>
          )}
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={language === 'ar' ? 'اكتب رسالة...' : 'Type a message...'}
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

      {/* Team Info Sheet */}
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

// ---- Internal Message Bubble ----

function TeamMessageBubble({ message, language }: { message: TeamMessage; language: string }) {
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
          {language === 'ar' ? 'إعلان' : 'Announcement'}
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
          <span className="text-[10px] opacity-60 block text-end mt-1">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
