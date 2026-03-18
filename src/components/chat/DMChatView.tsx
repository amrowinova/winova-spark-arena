import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Image, X, Zap, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBanner } from '@/contexts/BannerContext';
import { DMMessageBubble, DMMessageData } from './DMMessageBubble';
import { ChatHeader } from './ChatHeader';
import { ReplyBar } from './ReplyBar';
import { ForwardDialog } from './ForwardDialog';
import { MessageInfoSheet } from './MessageInfoSheet';
import { DMConversation, DMMessage } from '@/hooks/useDirectMessages';
import { useDMMediaUpload } from '@/hooks/useDMMediaUpload';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useChatPresence } from '@/hooks/useChatPresence';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';
import { useWallet } from '@/hooks/useWallet';
import { executeTransfer } from '@/lib/walletService';

const AI_SYSTEM_USER_ID = '00000000-0000-0000-0000-a10000000001';

interface DMChatViewProps {
  conversation: DMConversation;
  messages: DMMessage[];
  onBack: () => void;
  onSendMessage: (
    conversationId: string,
    content: string,
    transferAmount?: number,
    transferRecipientId?: string,
    imageUrl?: string,
    replyToId?: string,
    replyToContent?: string,
    replyToSender?: string,
  ) => Promise<void>;
  onForwardMessage?: (messageContent: string, recipientIds: string[]) => void;
  onDeleteMessage?: (conversationId: string, messageId: string) => void;
  onToggleReaction?: (conversationId: string, messageId: string, emoji: string) => void;
}

export function DMChatView({
  conversation,
  messages,
  onBack,
  onSendMessage,
  onForwardMessage,
  onDeleteMessage,
  onToggleReaction,
}: DMChatViewProps) {
  const { language } = useLanguage();
  const { info: showInfo, success: showSuccess, error: showError } = useBanner();
  const { user: authUser } = useAuth();
  const { user } = useUser();
  const { refetch: refetchWallet } = useWallet();
  const isRTL = language === 'ar';
  const isSystemChat = conversation.participantId === AI_SYSTEM_USER_ID;

  const [message, setMessage] = useState('');
  const [replyTo, setReplyTo] = useState<DMMessageData | null>(null);
  const [forwardMessage, setForwardMessage] = useState<DMMessageData | null>(null);
  const [messageInfo, setMessageInfo] = useState<DMMessageData | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Quick Transfer state
  const [showQuickTransfer, setShowQuickTransfer] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  const QUICK_AMOUNTS = [50, 100, 200];

  // Image upload state
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadImage, isUploading } = useDMMediaUpload();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const inputRef = useRef<HTMLInputElement>(null);

  const { otherUserTyping, handleTyping, stopTyping } = useTypingIndicator(conversation.id, conversation.participantName);
  const { isOnline, getLastSeenText } = useChatPresence(conversation.id, isSystemChat ? null : conversation.participantId);

  // Build DMMessageData from DMMessage
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
    imageUrl: msg.imageUrl,
    deletedAt: msg.deletedAt,
    reactions: msg.reactions,
    replyTo: msg.replyToId
      ? { id: msg.replyToId, sender: msg.replyToSender || '', content: msg.replyToContent || '' }
      : undefined,
    isPending: msg.isPending,
  }));

  // Auto-scroll on new messages
  useEffect(() => {
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
    return () => clearTimeout(timer);
  }, [messages.length]);

  // Mobile keyboard scroll
  useEffect(() => {
    const handleResize = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (typeof visualViewport !== 'undefined') {
      visualViewport.addEventListener('resize', handleResize);
      return () => visualViewport.removeEventListener('resize', handleResize);
    }
  }, []);

  // Image selection
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedImage(file);
    setImagePreviewUrl(URL.createObjectURL(file));
    // Reset file input so same file can be re-selected
    e.target.value = '';
  };

  const clearSelectedImage = () => {
    setSelectedImage(null);
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImagePreviewUrl(null);
  };

  const scrollToMessage = useCallback((messageId: string) => {
    const element = messageRefs.current.get(messageId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('bg-primary/20');
      setTimeout(() => element.classList.remove('bg-primary/20'), 1500);
    }
  }, []);

  const handleSend = async () => {
    const content = message.trim();
    if ((!content && !selectedImage) || isSending || isUploading) return;

    setIsSending(true);
    setMessage('');
    const replyInfo = replyTo;
    setReplyTo(null);
    stopTyping();

    let uploadedUrl: string | undefined;

    if (selectedImage) {
      clearSelectedImage();
      const result = await uploadImage(selectedImage, conversation.id);
      if (!result) {
        showError(isRTL ? 'فشل رفع الصورة' : 'Image upload failed');
        setIsSending(false);
        return;
      }
      uploadedUrl = result.url;
    }

    await onSendMessage(
      conversation.id,
      content || (uploadedUrl ? (isRTL ? '📷 صورة' : '📷 Image') : ''),
      undefined,
      undefined,
      uploadedUrl,
      replyInfo?.id,
      replyInfo?.content,
      replyInfo?.senderName,
    );
    setIsSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    handleTyping();
  };

  // Message actions
  const handleReply = (msg: DMMessageData) => {
    setReplyTo(msg);
    inputRef.current?.focus();
  };

  const handleForward = (msg: DMMessageData) => setForwardMessage(msg);
  const handleInfo = (msg: DMMessageData) => setMessageInfo(msg);

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    showInfo(isRTL ? 'تم النسخ' : 'Copied');
  };

  const handleReact = (messageId: string, emoji: string) => {
    onToggleReaction?.(conversation.id, messageId, emoji);
  };

  const handleDelete = (messageId: string) => {
    onDeleteMessage?.(conversation.id, messageId);
    showInfo(isRTL ? 'تم حذف الرسالة' : 'Message deleted');
  };

  const handleQuickTransfer = async (amount: number) => {
    if (!authUser || amount <= 0 || isTransferring) return;
    if (amount > user.novaBalance) {
      showError(isRTL ? 'رصيد غير كافٍ' : 'Insufficient balance');
      return;
    }
    setIsTransferring(true);
    try {
      const result = await executeTransfer(
        authUser.id,
        conversation.participantId,
        amount,
        'nova',
        'dm_transfer',
        undefined,
        isRTL ? `تحويل Nova` : 'Nova Transfer',
        'تحويل Nova',
      );
      if (!result.success) {
        showError(result.error || (isRTL ? 'فشل التحويل' : 'Transfer failed'));
        return;
      }
      await onSendMessage(
        conversation.id,
        isRTL ? `💸 تم تحويل И${amount} Nova` : `💸 Sent И${amount} Nova`,
        amount,
        conversation.participantId,
      );
      showSuccess(isRTL ? `تم تحويل И${amount} بنجاح ✓` : `Sent И${amount} successfully ✓`);
      setShowQuickTransfer(false);
      setCustomAmount('');
      await refetchWallet();
    } catch {
      showError(isRTL ? 'فشل التحويل' : 'Transfer failed');
    } finally {
      setIsTransferring(false);
    }
  };

  const handleForwardSubmit = (recipientIds: string[]) => {
    if (forwardMessage && onForwardMessage) {
      onForwardMessage(forwardMessage.content, recipientIds);
    }
    showSuccess(
      isRTL
        ? `تم إعادة التوجيه إلى ${recipientIds.length} جهة اتصال`
        : `Forwarded to ${recipientIds.length} contacts`,
    );
    setForwardMessage(null);
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

  const isBusy = isSending || isUploading;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="flex-shrink-0">
        <ChatHeader
          id={conversation.participantId}
          conversationId={conversation.id}
          name={conversation.participantName}
          username={conversation.participantUsername}
          avatar={isSystemChat ? '🤖' : '👤'}
          isOnline={isSystemChat ? true : isOnline}
          lastSeen={isSystemChat ? (isRTL ? 'نظام ذكي' : 'AI System') : (getLastSeenText(language as 'ar' | 'en') || undefined)}
          isTyping={isSystemChat ? false : !!otherUserTyping}
          onBack={onBack}
          onScrollToMessage={scrollToMessage}
        />
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{
          background: 'var(--wa-chat-bg, #ece5dd)',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Ccircle cx='5' cy='5' r='1.5' fill='%23000' fill-opacity='0.03'/%3E%3Ccircle cx='30' cy='5' r='1.5' fill='%23000' fill-opacity='0.03'/%3E%3Ccircle cx='55' cy='5' r='1.5' fill='%23000' fill-opacity='0.03'/%3E%3Ccircle cx='5' cy='30' r='1.5' fill='%23000' fill-opacity='0.03'/%3E%3Ccircle cx='30' cy='30' r='1.5' fill='%23000' fill-opacity='0.03'/%3E%3Ccircle cx='55' cy='30' r='1.5' fill='%23000' fill-opacity='0.03'/%3E%3Ccircle cx='5' cy='55' r='1.5' fill='%23000' fill-opacity='0.03'/%3E%3Ccircle cx='30' cy='55' r='1.5' fill='%23000' fill-opacity='0.03'/%3E%3Ccircle cx='55' cy='55' r='1.5' fill='%23000' fill-opacity='0.03'/%3E%3C/svg%3E")`,
        }}
      >
        <div className="p-4 space-y-1 pb-2">
          {formattedMessages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{isRTL ? 'ابدأ المحادثة' : 'Start the conversation'}</p>
            </div>
          ) : (
            groupedMessages.map((group, groupIndex) => (
              <div key={groupIndex} className="space-y-0.5">
                {group.messages.map((msg) => (
                  <div
                    key={msg.id}
                    ref={(el) => { if (el) messageRefs.current.set(msg.id, el); }}
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
                      onDelete={handleDelete}
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

      {/* Bottom Input Area */}
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

          {/* Image Preview */}
          {imagePreviewUrl && (
            <div className="px-3 pt-2">
              <div className="relative inline-block">
                <img
                  src={imagePreviewUrl}
                  alt="preview"
                  className="h-24 w-24 object-cover rounded-lg border border-border"
                />
                <button
                  onClick={clearSelectedImage}
                  className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full h-5 w-5 flex items-center justify-center"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}

          {/* Quick Transfer Panel */}
          {showQuickTransfer && (
            <div className="px-3 pt-2 pb-1 border-b border-border bg-success/5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-success">
                  {isRTL ? `💸 تحويل سريع — رصيدك: И${user.novaBalance}` : `💸 Quick Transfer — Balance: И${user.novaBalance}`}
                </span>
                <button
                  onClick={() => { setShowQuickTransfer(false); setCustomAmount(''); }}
                  className="ms-auto text-muted-foreground hover:text-foreground"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {QUICK_AMOUNTS.map(amt => (
                  <Button
                    key={amt}
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-sm font-medium border-success/40 hover:bg-success/10 hover:border-success"
                    onClick={() => handleQuickTransfer(amt)}
                    disabled={isTransferring || amt > user.novaBalance}
                  >
                    И{amt}
                  </Button>
                ))}
                <div className="flex items-center gap-1 flex-1 min-w-[100px]">
                  <Input
                    type="number"
                    min="1"
                    value={customAmount}
                    onChange={e => setCustomAmount(e.target.value)}
                    placeholder={isRTL ? 'مبلغ حر' : 'Custom'}
                    className="h-8 text-sm"
                    disabled={isTransferring}
                  />
                  <Button
                    size="sm"
                    className="h-8 px-3 bg-success hover:bg-success/90 text-success-foreground shrink-0"
                    onClick={() => handleQuickTransfer(Number(customAmount))}
                    disabled={isTransferring || !customAmount || Number(customAmount) <= 0}
                  >
                    {isTransferring ? (
                      <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Input Bar */}
          <div className="p-3 flex items-center gap-2">
            {/* Image picker */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              onChange={handleImageSelect}
            />
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-10 w-10 text-muted-foreground hover:text-foreground"
              onClick={() => fileInputRef.current?.click()}
              disabled={isBusy}
            >
              <Image className="h-5 w-5" />
            </Button>

            {/* Quick transfer toggle */}
            <Button
              variant="ghost"
              size="icon"
              className={`shrink-0 h-10 w-10 transition-colors ${showQuickTransfer ? 'text-success bg-success/10' : 'text-muted-foreground hover:text-success'}`}
              onClick={() => setShowQuickTransfer(!showQuickTransfer)}
              title={isRTL ? 'تحويل سريع' : 'Quick Transfer'}
              disabled={isBusy}
            >
              <Zap className="h-5 w-5" />
            </Button>

            <Input
              ref={inputRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={isRTL ? 'اكتب رسالة...' : 'Type a message...'}
              className="flex-1"
              autoComplete="off"
              disabled={isBusy}
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={(!message.trim() && !selectedImage) || isBusy}
              className="shrink-0 h-10 w-10"
            >
              {isUploading ? (
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}

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
