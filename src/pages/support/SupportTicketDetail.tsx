import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSupport, SupportTicket, SupportMessage } from '@/hooks/useSupport';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Send, 
  User, 
  Clock, 
  CheckCircle,
  AlertTriangle,
  Eye,
  MessageSquare
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

export default function SupportTicketDetail() {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const { user } = useAuth();
  const { tickets, fetchMessages, sendMessage, updateTicketStatus, assignTicket } = useSupport();
  
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Find ticket from loaded tickets
  useEffect(() => {
    if (ticketId && tickets.length > 0) {
      const found = tickets.find(t => t.id === ticketId);
      if (found) {
        setTicket(found);
      }
    }
  }, [ticketId, tickets]);

  // Load messages
  useEffect(() => {
    const loadMessages = async () => {
      if (ticketId) {
        const msgs = await fetchMessages(ticketId);
        setMessages(msgs);
      }
    };
    loadMessages();
  }, [ticketId, fetchMessages]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Realtime subscription for messages
  useEffect(() => {
    if (!ticketId) return;

    const channel = supabase
      .channel(`ticket_messages_${ticketId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'support_messages',
          filter: `ticket_id=eq.${ticketId}`
        },
        async () => {
          const msgs = await fetchMessages(ticketId);
          setMessages(msgs);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ticketId, fetchMessages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !ticketId || isSending) return;

    setIsSending(true);
    const { error } = await sendMessage(ticketId, newMessage.trim(), isInternal);
    
    if (!error) {
      setNewMessage('');
      const msgs = await fetchMessages(ticketId);
      setMessages(msgs);
    }
    setIsSending(false);
  };

  const handleAssignToMe = async () => {
    if (!ticketId || !user) return;
    await assignTicket(ticketId, user.id);
  };

  const handleResolve = async () => {
    if (!ticketId) return;
    await updateTicketStatus(ticketId, 'resolved', new Date().toISOString());
  };

  const handleReopen = async () => {
    if (!ticketId) return;
    await updateTicketStatus(ticketId, 'open');
  };

  if (!ticket) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <InnerPageHeader title={isRTL ? 'تفاصيل التذكرة' : 'Ticket Details'} />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">{isRTL ? 'جارٍ التحميل...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  const isResolved = ticket.status === 'resolved' || ticket.status === 'closed';
  const isAssignedToMe = ticket.assigned_to === user?.id;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <InnerPageHeader 
        title={`#${ticket.id.slice(0, 8)}`}
      />

      {/* Ticket Info */}
      <Card className="mx-4 mt-4 p-4">
        <div className="flex items-start gap-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={ticket.user_avatar || undefined} />
            <AvatarFallback>
              <User className="w-5 h-5" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h2 className="font-semibold text-foreground">{ticket.title}</h2>
            <p className="text-sm text-muted-foreground">{ticket.user_name}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant={ticket.status === 'open' ? 'secondary' : ticket.status === 'in_progress' ? 'default' : 'outline'}>
                {ticket.status === 'open' ? (isRTL ? 'مفتوحة' : 'Open') :
                 ticket.status === 'in_progress' ? (isRTL ? 'جارٍ' : 'In Progress') :
                 (isRTL ? 'تم الحل' : 'Resolved')}
              </Badge>
              {ticket.priority === 'urgent' && (
                <Badge variant="destructive">{isRTL ? 'عاجل' : 'Urgent'}</Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(ticket.created_at), {
                  addSuffix: true,
                  locale: isRTL ? ar : enUS,
                })}
              </span>
            </div>
          </div>
        </div>

        {ticket.description && (
          <p className="mt-4 text-sm text-muted-foreground border-t pt-4">
            {ticket.description}
          </p>
        )}

        {/* Reference Link */}
        {ticket.reference_type && ticket.reference_id && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4 w-full"
            onClick={() => {
              if (ticket.reference_type === 'p2p_order') {
                navigate(`/support/disputes?order=${ticket.reference_id}`);
              }
            }}
          >
            <Eye className="w-4 h-4 me-2" />
            {isRTL ? 'عرض المرجع' : 'View Reference'} ({ticket.reference_type})
          </Button>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          {!ticket.assigned_to && (
            <Button 
              variant="default" 
              size="sm" 
              className="flex-1"
              onClick={handleAssignToMe}
            >
              <CheckCircle className="w-4 h-4 me-2" />
              {isRTL ? 'تعيين لي' : 'Assign to Me'}
            </Button>
          )}
          {isAssignedToMe && !isResolved && (
            <Button 
              variant="default" 
              size="sm" 
              className="flex-1"
              onClick={handleResolve}
            >
              <CheckCircle className="w-4 h-4 me-2" />
              {isRTL ? 'تم الحل' : 'Mark Resolved'}
            </Button>
          )}
          {isResolved && (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={handleReopen}
            >
              <Clock className="w-4 h-4 me-2" />
              {isRTL ? 'إعادة فتح' : 'Reopen'}
            </Button>
          )}
        </div>
      </Card>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">
              {isRTL ? 'لا توجد رسائل بعد' : 'No messages yet'}
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    msg.is_internal
                      ? 'bg-yellow-500/20 border border-yellow-500/30'
                      : isMe
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {msg.is_internal && (
                    <div className="flex items-center gap-1 text-xs text-yellow-600 mb-1">
                      <AlertTriangle className="w-3 h-3" />
                      {isRTL ? 'ملاحظة داخلية' : 'Internal Note'}
                    </div>
                  )}
                  <p className="text-sm">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    {msg.sender_name} • {formatDistanceToNow(new Date(msg.created_at), {
                      addSuffix: true,
                      locale: isRTL ? ar : enUS,
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      {!isResolved && (
        <div className="p-4 border-t bg-background">
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant={isInternal ? 'default' : 'outline'}
              size="sm"
              onClick={() => setIsInternal(!isInternal)}
            >
              <AlertTriangle className="w-3 h-3 me-1" />
              {isRTL ? 'داخلي' : 'Internal'}
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder={isRTL ? 'اكتب رسالة...' : 'Type a message...'}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={isSending}
            />
            <Button 
              size="icon" 
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isSending}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
