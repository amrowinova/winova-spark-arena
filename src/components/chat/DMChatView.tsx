import { useState, useRef, useEffect, useCallback } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBanner } from '@/contexts/BannerContext';
import { DMMessageBubble, DMMessageData } from './DMMessageBubble';
import { ChatHeader } from './ChatHeader';
import { ReplyBar } from './ReplyBar';
import { ForwardDialog } from './ForwardDialog';
import { MessageInfoSheet } from './MessageInfoSheet';
import { TransferNovaDialog } from '@/components/wallet/TransferNovaDialog';
import { DMConversation, DMMessage } from '@/hooks/useDirectMessages';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useChatPresence } from '@/hooks/useChatPresence';
import { isAISystemUser } from '@/lib/aiSystemUser';

interface DMChatViewProps {
  conversation: DMConversation;
  messages: DMMessage[];
  onBack: () => void;
  onSendMessage: (conversationId: string, content: string, transferAmount?: number, transferRecipientId?: string) => Promise<void>;
  onForwardMessage?: (messageContent: string, recipientIds: string[]) => void;
}

export function DMChatView({ 
  conversation, 
  messages, 
  onBack, 
  onSendMessage,
  onForwardMessage,
}: DMChatViewProps) {
  const { language } = useLanguage();
  const { info: showInfo, success: showSuccess } = useBanner();
  const isSystemChat = isAISystemUser(conversation.participantId);
  
  const [message, setMessage] = useState('');
  const [replyTo, setReplyTo] = useState<DMMessageData | null>(null);
  const [forwardMessage, setForwardMessage] = useState<DMMessageData | null>(null);
  const [messageInfo, setMessageInfo] = useState<DMMessageData | null>(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const inputRef = useRef<HTMLInputElement>(null);

  // Real-time hooks - skip for system user
  const { otherUserTyping, handleTyping, stopTyping } = useTypingIndicator(conversation.id, conversation.participantName);
  const { isOnline, getLastSeenText } = useChatPresence(conversation.id, isSystemChat ? null : conversation.participantId);

  // Convert messages to DMMessageData format with pending state
  const formattedMessages: DMMessageData[] = messages.map(msg => ({
    id: msg.id,
    conversationId: msg.conversationId,
    senderId: msg.senderId,
    senderName: msg.senderName,
    content: msg.content,
    messageType: msg.messageType,
    isRead: msg.isRead,
    createdAt: msg.createdAt,
    isMine: msg.isMine,
    transferAmount: msg.transferAmount,
    replyTo: undefined,
    isPending: msg.isPending,
  }));

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    };
    
    // Small delay to ensure DOM is updated
    const timer = setTimeout(scrollToBottom, 50);
    return () => clearTimeout(timer);
  }, [messages.length]);

  // Handle keyboard appearance (mobile)
  useEffect(() => {
    const handleResize = () => {
      // Scroll to bottom when virtual keyboard appears
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    if (typeof visualViewport !== 'undefined') {
      visualViewport.addEventListener('resize', handleResize);
      return () => visualViewport.removeEventListener('resize', handleResize);
    }
  }, []);

  // Scroll to a specific message
  const scrollToMessage = useCallback((messageId: string) => {
    const element = messageRefs.current.get(messageId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Flash highlight effect
      element.classList.add('bg-primary/20');
      setTimeout(() => element.classList.remove('bg-primary/20'), 1500);
    }
  }, []);

  // Handle send - INSTANT with optimistic UI
  const handleSend = async () => {
    if (!message.trim() || isSending) return;
    
    const content = message.trim();
    setMessage('');
    setReplyTo(null);
    stopTyping();
    
    // Don't wait for completion - optimistic UI handles display
    onSendMessage(conversation.id, content);
  };

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle input change with typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    handleTyping();
  };

  // Message actions
  const handleReply = (msg: DMMessageData) => {
    setReplyTo(msg);
    inputRef.current?.focus();
  };

  const handleForward = (msg: DMMessageData) => {
    setForwardMessage(msg);
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    showInfo(language === 'ar' ? 'تم النسخ' : 'Copied');
  };

  const handleInfo = (msg: DMMessageData) => {
    setMessageInfo(msg);
  };

  const handleReact = (messageId: string, emoji: string) => {
    // TODO: Implement reactions with database support
    showInfo(`${emoji} ${language === 'ar' ? 'تفاعل' : 'reacted'}`);
  };

  const handleForwardSubmit = (recipientIds: string[]) => {
    if (forwardMessage && onForwardMessage) {
      onForwardMessage(forwardMessage.content, recipientIds);
    }
    showSuccess(
      language === 'ar'
        ? `تم إعادة التوجيه إلى ${recipientIds.length} جهة اتصال`
        : `Forwarded to ${recipientIds.length} contacts`
    );
    setForwardMessage(null);
  };

  const handleTransferComplete = (receipt: { amount: number }) => {
    onSendMessage(
      conversation.id,
      language === 'ar'
        ? `تم تحويل ${receipt.amount} Nova`
        : `Transferred ${receipt.amount} Nova`,
      receipt.amount,
      conversation.participantId
    );
    setTransferDialogOpen(false);
  };

  // Group consecutive messages from same sender
  const groupedMessages = formattedMessages.reduce<Array<{ messages: DMMessageData[]; senderId: string }>>((groups, msg) => {
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && lastGroup.senderId === msg.senderId) {
      lastGroup.messages.push(msg);
    } else {
      groups.push({ senderId: msg.senderId, messages: [msg] });
    }
    return groups;
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" style={{ height: '100dvh' }}>
      {/* Fixed Header - Always at top */}
      <div className="flex-shrink-0">
        <ChatHeader
          id={conversation.participantId}
          name={conversation.participantName}
          username={conversation.participantUsername}
          avatar={isSystemChat ? '🤖' : '👤'}
          isOnline={isSystemChat ? true : isOnline}
          lastSeen={isSystemChat ? (language === 'ar' ? 'نظام ذكي' : 'AI System') : (getLastSeenText(language as 'ar' | 'en') || undefined)}
          isTyping={isSystemChat ? false : !!otherUserTyping}
          onBack={onBack}
          onTransfer={isSystemChat ? undefined : () => setTransferDialogOpen(true)}
        />

      </div>

      {/* Messages */}
      {(
      /* Scrollable Messages Area - Takes remaining space */
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto overscroll-contain"
      >
        <div className="p-4 space-y-1 pb-2">
          {formattedMessages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{language === 'ar' ? 'ابدأ المحادثة' : 'Start the conversation'}</p>
            </div>
          ) : (
            groupedMessages.map((group, groupIndex) => (
              <div key={groupIndex} className="space-y-0.5">
                {group.messages.map((msg) => (
                  <div
                    key={msg.id}
                    ref={(el) => {
                      if (el) messageRefs.current.set(msg.id, el);
                    }}
                    className="transition-colors duration-500 rounded-lg"
                  >
                    <DMMessageBubble
                      message={msg}
                      showReadReceipts={true}
                      onReply={handleReply}
                      onForward={handleForward}
                      onCopy={handleCopy}
                      onInfo={handleInfo}
                      onReact={handleReact}
                      onScrollToMessage={scrollToMessage}
                    />
                  </div>
                ))}
              </div>
            ))
          )}
          <div ref={messagesEndRef} className="h-1" />
        </div>
      </div>
      )}

      {/* Fixed Bottom Input Area - Hidden for system chat */}
      {!isSystemChat && (
        <div 
          className="flex-shrink-0 bg-card border-t border-border"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          {/* Reply Preview */}
          {replyTo && (
            <ReplyBar
              replyTo={{ sender: replyTo.senderName, content: replyTo.content }}
              onCancel={() => setReplyTo(null)}
            />
          )}
          
          {/* Input Bar */}
          <div className="p-3 flex items-center gap-2">
            <Input
              ref={inputRef}
              value={message}
              onChange={handleInputChange}
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
      )}
      
      {/* Read-only label for system chat */}
      {isSystemChat && (
        <div 
          className="flex-shrink-0 bg-card border-t border-border"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="p-3 flex items-center gap-2">
            <Input
              value={buildInput}
              onChange={(e) => setBuildInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && buildInput.trim()) {
                  e.preventDefault();
                  startBuild(buildInput.trim(), conversation.id);
                  setBuildInput('');
                }
              }}
              placeholder={language === 'ar' ? '🏭 ابني لي... (مثال: ابني لي نظام تذاكر)' : '🏭 Build me... (e.g. Build me a ticket system)'}
              className="flex-1"
              autoComplete="off"
              disabled={isBuilding}
            />
            <Button 
              size="icon" 
              onClick={() => {
                if (buildInput.trim()) {
                  startBuild(buildInput.trim(), conversation.id);
                  setBuildInput('');
                }
              }}
              disabled={!buildInput.trim() || isBuilding}
              className="shrink-0 h-10 w-10"
            >
              {isBuilding ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center pb-2">
            {language === 'ar' ? '🏭 مصنع WINOVA — اكتب طلب البناء' : '🏭 WINOVA Factory — Type your build request'}
          </p>
        </div>
      )}

      {/* Transfer Dialog */}
      <TransferNovaDialog
        open={transferDialogOpen}
        onClose={() => setTransferDialogOpen(false)}
        recipientId={conversation.participantId}
        recipientName={conversation.participantName}
        recipientUsername={conversation.participantUsername}
        onTransferComplete={handleTransferComplete}
      />

      {/* Forward Dialog */}
      <ForwardDialog
        open={!!forwardMessage}
        onClose={() => setForwardMessage(null)}
        onForward={handleForwardSubmit}
        messagePreview={forwardMessage?.content || ''}
      />

      {/* Message Info Sheet */}
      <MessageInfoSheet
        open={!!messageInfo}
        onOpenChange={(open) => !open && setMessageInfo(null)}
        message={messageInfo}
      />
    </div>
  );
}
