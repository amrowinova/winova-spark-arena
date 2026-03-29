import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, Pin, Search, X, Image, Paperclip, Headphones, UserPlus, Loader2, PenLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { useP2P, P2PChat, P2PMessage } from '@/contexts/P2PContext';
import { useSupport } from '@/contexts/SupportContext';
import { useDirectMessages, DMConversation, DMMessage } from '@/hooks/useDirectMessages';
import { useTeamChat, TeamConversation, TeamMessage } from '@/hooks/useTeamChat';
import { useChatListPresence, useGlobalPresence } from '@/hooks/useChatListPresence';
import { TransferNovaDialog } from '@/components/wallet/TransferNovaDialog';
import { ReceiptDialog } from '@/components/common/ReceiptCard';
import { Receipt } from '@/contexts/TransactionContext';
import { ChatHeader } from '@/components/chat/ChatHeader';
import { TeamChatHeader } from '@/components/chat/TeamChatHeader';
import { MessageBubble, ChatMessage } from '@/components/chat/MessageBubble';
import { DMMessageBubble, DMMessageData } from '@/components/chat/DMMessageBubble';
import { DMChatView } from '@/components/chat/DMChatView';
import { MessageInfoSheet } from '@/components/chat/MessageInfoSheet';
import { SystemMessageBubble, SystemMessageData } from '@/components/chat/SystemMessageBubble';
import { ForwardDialog } from '@/components/chat/ForwardDialog';
import { ReplyBar } from '@/components/chat/ReplyBar';
import { TeamInfoSheet, TeamChatMember } from '@/components/chat/TeamInfoSheet';
import { RankBadge } from '@/components/common/RankBadge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getCountryFlag } from '@/lib/countryFlags';
import { 
  P2PChatHeader, 
  P2POrderCard, 
  P2PPaymentCard, 
  P2PSystemMessage 
} from '@/components/p2p';
import { P2PStatusActions } from '@/components/p2p/P2PStatusActions';
import { useBanner } from '@/contexts/BannerContext';

import type { UserRank } from '@/contexts/UserContext';

interface ChatMessagesProps {
  activeChat: any;
  activeDMConversation: DMConversation | null;
  activeTeamConversation: TeamConversation | null;
  activeTeamMembers: TeamChatMember[];
  message: string;
  setMessage: (message: string) => void;
  transferDialogOpen: boolean;
  setTransferDialogOpen: (open: boolean) => void;
  selectedReceipt: Receipt | null;
  setSelectedReceipt: (receipt: Receipt | null) => void;
  receiptDialogOpen: boolean;
  setReceiptDialogOpen: (open: boolean) => void;
  replyTo: ChatMessage | null;
  setReplyTo: (message: ChatMessage | null) => void;
  replyToDM: DMMessageData | null;
  setReplyToDM: (message: DMMessageData | null) => void;
  forwardMessage: ChatMessage | null;
  setForwardMessage: (message: ChatMessage | null) => void;
  forwardDMMessage: DMMessageData | null;
  setForwardDMMessage: (message: DMMessageData | null) => void;
  messageInfoMessage: DMMessageData | null;
  setMessageInfoMessage: (message: DMMessageData | null) => void;
  teamInfoOpen: boolean;
  setTeamInfoOpen: (open: boolean) => void;
  showP2PDetails: boolean;
  setShowP2PDetails: (show: boolean) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  messageRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
  isRTL: boolean;
  language: string;
  user: any;
  t: (key: string) => string;
  navigate: any;
  dmMessages: Record<string, DMMessage[]>;
  teamMessages: Record<string, TeamMessage[]>;
  getTypingStatus: (id: string) => any;
  sendP2PMessage: (message: string, orderId?: string) => void;
  sendDMMessage: (message: string, files?: File[]) => Promise<void>;
  sendTeamMessage: (message: string, files?: File[]) => Promise<void>;
  toggleDMReaction: (messageId: string, emoji: string) => Promise<void>;
  toggleTeamReaction: (messageId: string, emoji: string) => Promise<void>;
  deleteDMMessage: (messageId: string) => Promise<void>;
  deleteOrder: () => void;
}

export function ChatMessages({
  activeChat,
  activeDMConversation,
  activeTeamConversation,
  activeTeamMembers,
  message,
  setMessage,
  transferDialogOpen,
  setTransferDialogOpen,
  selectedReceipt,
  setSelectedReceipt,
  receiptDialogOpen,
  setReceiptDialogOpen,
  replyTo,
  setReplyTo,
  replyToDM,
  setReplyToDM,
  forwardMessage,
  setForwardMessage,
  forwardDMMessage,
  setForwardDMMessage,
  messageInfoMessage,
  setMessageInfoMessage,
  teamInfoOpen,
  setTeamInfoOpen,
  showP2PDetails,
  setShowP2PDetails,
  messagesEndRef,
  messageRefs,
  isRTL,
  language,
  user,
  t,
  navigate,
  dmMessages,
  teamMessages,
  getTypingStatus,
  sendP2PMessage,
  sendDMMessage,
  sendTeamMessage,
  toggleDMReaction,
  toggleTeamReaction,
  deleteDMMessage,
  deleteOrder
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Chat Header */}
      {activeChat?.type === 'p2p' && (
        <P2PChatHeader
          chat={activeChat}
          currentUserId={user?.id}
          onBack={() => {/* Handle back */}}
          showDetails={showP2PDetails}
          onShowDetailsChange={setShowP2PDetails}
        />
      )}
      {activeChat?.type === 'team' && activeTeamConversation && (
        <TeamChatHeader
          conversation={activeTeamConversation}
          members={activeTeamMembers}
          currentUserId={user?.id}
          onInfo={() => setTeamInfoOpen(true)}
          onMemberClick={(member) => {/* Handle member click */}}
        />
      )}
      {activeChat?.type === 'dm' && activeDMConversation && (
        <ChatHeader
          conversation={activeDMConversation}
          currentUserId={user?.id}
          onInfo={() => {/* Handle info */}}
          onBack={() => {/* Handle back */}}
        />
      )}

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4" ref={messagesEndRef}>
        <div className="space-y-4 pb-4">
          <AnimatePresence>
            {activeChat?.type === 'p2p' && activeChat.messages?.map((msg: P2PMessage) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                ref={(el) => {
                  if (el) messageRefs.current.set(msg.id, el);
                }}
              >
                {msg.sender_id === user?.id ? (
                  <MessageBubble
                    message={msg}
                    isOwn={true}
                    onReply={(message) => setReplyTo(message)}
                    onForward={(message) => setForwardMessage(message)}
                    onInfo={(message) => setMessageInfoMessage(message)}
                    onDelete={() => {/* Handle delete */}}
                    onReaction={(emoji) => {/* Handle reaction */}}
                  />
                ) : (
                  <MessageBubble
                    message={msg}
                    isOwn={false}
                    onReply={(message) => setReplyTo(message)}
                    onForward={(message) => setForwardMessage(message)}
                    onInfo={(message) => setMessageInfoMessage(message)}
                    onReaction={(emoji) => {/* Handle reaction */}}
                  />
                )}
              </motion.div>
            ))}

            {activeChat?.type === 'dm' && activeDMConversation && dmMessages[activeDMConversation.id]?.map((msg: DMMessage) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                ref={(el) => {
                  if (el) messageRefs.current.set(msg.id, el);
                }}
              >
                <DMMessageBubble
                  message={msg}
                  isOwn={msg.sender_id === user?.id}
                  onReply={(message) => setReplyToDM(message)}
                  onForward={(message) => setForwardDMMessage(message)}
                  onInfo={(message) => setMessageInfoMessage(message)}
                  onDelete={() => deleteDMMessage(msg.id)}
                  onReaction={(emoji) => toggleDMReaction(msg.id, emoji)}
                />
              </motion.div>
            ))}

            {activeChat?.type === 'team' && activeTeamConversation && teamMessages[activeTeamConversation.id]?.map((msg: TeamMessage) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                ref={(el) => {
                  if (el) messageRefs.current.set(msg.id, el);
                }}
              >
                {msg.sender_id === user?.id ? (
                  <MessageBubble
                    message={msg}
                    isOwn={true}
                    onReply={(message) => setReplyTo(message)}
                    onForward={(message) => setForwardMessage(message)}
                    onInfo={(message) => setMessageInfoMessage(message)}
                    onDelete={() => {/* Handle delete */}}
                    onReaction={(emoji) => {/* Handle reaction */}}
                  />
                ) : (
                  <MessageBubble
                    message={msg}
                    isOwn={false}
                    onReply={(message) => setReplyTo(message)}
                    onForward={(message) => setForwardMessage(message)}
                    onInfo={(message) => setMessageInfoMessage(message)}
                    onReaction={(emoji) => {/* Handle reaction */}}
                  />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Reply Bar */}
      {(activeChat?.type === 'dm' || activeChat?.type === 'team') && (
        <ReplyBar
          message={message}
          setMessage={setMessage}
          onSend={(message, files) => {
            if (activeChat?.type === 'dm') {
              sendDMMessage(message, files);
            } else if (activeChat?.type === 'team') {
              sendTeamMessage(message, files);
            }
          }}
          replyTo={activeChat?.type === 'dm' ? replyToDM : replyTo}
          onCancelReply={() => {
            if (activeChat?.type === 'dm') {
              setReplyToDM(null);
            } else {
              setReplyTo(null);
            }
          }}
          onTransfer={() => setTransferDialogOpen(true)}
          isTyping={getTypingStatus(activeChat?.id)}
          disabled={!activeChat}
        />
      )}

      {activeChat?.type === 'p2p' && (
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              placeholder={t('chat.typeMessage')}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendP2PMessage(message);
                  setMessage('');
                }
              }}
              className="flex-1"
            />
            <Button
              onClick={() => {
                sendP2PMessage(message);
                setMessage('');
              }}
              disabled={!message.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          
          {/* P2P Status Actions */}
          {activeChat && (
            <P2PStatusActions
              order={activeChat}
              onCancel={deleteOrder}
              currentUserId={user?.id}
            />
          )}
        </div>
      )}

      {/* Dialogs */}
      <TransferNovaDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        recipient={
          activeChat?.type === 'dm' 
            ? activeDMConversation?.participantName 
            : activeChat?.type === 'p2p' 
            ? activeChat.other_user?.name 
            : undefined
        }
        recipientId={
          activeChat?.type === 'dm' 
            ? activeDMConversation?.participantId 
            : activeChat?.type === 'p2p' 
            ? activeChat.other_user?.id 
            : undefined
        }
      />

      <ReceiptDialog
        open={receiptDialogOpen}
        onOpenChange={setReceiptDialogOpen}
        receipt={selectedReceipt}
      />

      <ForwardDialog
        message={activeChat?.type === 'dm' ? forwardDMMessage : forwardMessage}
        onForward={(targetConversationId) => {
          // Handle forward logic
          setForwardMessage(null);
          setForwardDMMessage(null);
        }}
        onCancel={() => {
          setForwardMessage(null);
          setForwardDMMessage(null);
        }}
      />

      <MessageInfoSheet
        message={messageInfoMessage}
        open={!!messageInfoMessage}
        onOpenChange={(open) => !open && setMessageInfoMessage(null)}
      />

      {activeChat?.type === 'team' && (
        <TeamInfoSheet
          open={teamInfoOpen}
          onOpenChange={setTeamInfoOpen}
          conversation={activeTeamConversation}
          members={activeTeamMembers}
        />
      )}
    </div>
  );
}
