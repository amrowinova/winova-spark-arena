import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface SupportAgent {
  id: string;
  name: string;
  nameAr: string;
  avatar: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: number;
  category: string;
  categoryTitle: string;
  categoryTitleAr: string;
  status: SupportTicketStatus;
  createdAt: string;
  assignedAgent?: SupportAgent;
  resolvedAt?: string;
  closedAt?: string;
}

export interface SupportMessage {
  id: string;
  type: 'user' | 'agent' | 'system';
  content: string;
  time: string;
  senderName?: string;
  ticketId?: string;
  systemType?: 'ticket_opened' | 'agent_assigned' | 'resolved' | 'closed' | 'reopened';
  ticket?: SupportTicket;
}

interface SupportContextType {
  messages: SupportMessage[];
  tickets: SupportTicket[];
  currentTicket: SupportTicket | null;
  hasActiveTicket: boolean;
  totalUnread: number;
  openNewTicket: (category: string, categoryTitle: string, categoryTitleAr: string, userName: string) => void;
  sendMessage: (content: string) => void;
  closeTicket: () => void;
  markAsRead: () => void;
}

const SupportContext = createContext<SupportContextType | undefined>(undefined);

// Helper to map DB ticket to our SupportTicket interface
function mapDbTicket(row: any, ticketIndex: number): SupportTicket {
  return {
    id: row.id,
    ticketNumber: ticketIndex,
    category: row.category || 'general',
    categoryTitle: row.title || 'Support',
    categoryTitleAr: row.title || 'الدعم',
    status: row.status as SupportTicketStatus,
    createdAt: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    resolvedAt: row.resolved_at ? new Date(row.resolved_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
  };
}

// Helper to map DB message to our SupportMessage interface
function mapDbMessage(row: any, userId: string | undefined): SupportMessage {
  const isUser = row.sender_id === userId;
  return {
    id: row.id,
    type: isUser ? 'user' : 'agent',
    content: row.content,
    time: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    senderName: isUser ? undefined : 'Support',
    ticketId: row.ticket_id,
  };
}

export function SupportProvider({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [currentTicket, setCurrentTicket] = useState<SupportTicket | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const hasActiveTicket = currentTicket !== null && 
    (currentTicket.status === 'open' || currentTicket.status === 'in_progress');

  // Load tickets from DB on mount
  const loadTickets = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading tickets:', error);
      return;
    }

    if (data && data.length > 0) {
      const mapped = data.map((row, i) => mapDbTicket(row, 1000 + i));
      setTickets(mapped);

      // Set current ticket if there's an active one
      const active = mapped.find(t => t.status === 'open' || t.status === 'in_progress');
      if (active) {
        setCurrentTicket(active);
      }
    }
  }, [user]);

  // Load messages for current ticket
  const loadMessages = useCallback(async () => {
    if (!user || !currentTicket) return;

    const { data, error } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', currentTicket.id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    if (data) {
      const mapped = data.map(row => mapDbMessage(row, user.id));
      
      // Add system message for ticket opening at the beginning
      const systemMsg: SupportMessage = {
        id: `system_open_${currentTicket.id}`,
        type: 'system',
        content: '',
        time: currentTicket.createdAt,
        systemType: 'ticket_opened',
        ticketId: currentTicket.id,
        ticket: currentTicket,
      };
      
      setMessages([systemMsg, ...mapped]);
    }
  }, [user, currentTicket]);

  // Load on mount and when user changes
  useEffect(() => {
    if (user) {
      loadTickets();
    } else {
      setTickets([]);
      setMessages([]);
      setCurrentTicket(null);
    }
  }, [user, loadTickets]);

  // Load messages when current ticket changes
  useEffect(() => {
    if (currentTicket) {
      loadMessages();
    }
  }, [currentTicket, loadMessages]);

  // Realtime subscription for new messages on current ticket
  useEffect(() => {
    if (!user || !currentTicket) return;

    const channel = supabase
      .channel(`support_messages_${currentTicket.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${currentTicket.id}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          // Only add if it's not from the current user (avoid duplicates)
          if (newMsg.sender_id !== user.id) {
            const mapped = mapDbMessage(newMsg, user.id);
            setMessages(prev => [...prev, mapped]);
            setUnreadCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, currentTicket]);

  // Realtime subscription for ticket updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('support_ticket_updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'support_tickets',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as any;
          // Update ticket in list
          setTickets(prev => prev.map(t => 
            t.id === updated.id ? { ...t, status: updated.status, resolvedAt: updated.resolved_at } : t
          ));
          // Update current ticket if it matches
          if (currentTicket?.id === updated.id) {
            setCurrentTicket(prev => prev ? { ...prev, status: updated.status } : prev);
            
            // Add system message for status change
            if (updated.status === 'in_progress' && updated.assigned_to) {
              const agentMsg: SupportMessage = {
                id: `system_assigned_${Date.now()}`,
                type: 'system',
                content: '',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                systemType: 'agent_assigned',
                ticketId: updated.id,
                ticket: currentTicket ? { ...currentTicket, status: 'in_progress' } : undefined,
              };
              setMessages(prev => [...prev, agentMsg]);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, currentTicket]);

  const openNewTicket = async (
    category: string, 
    categoryTitle: string, 
    categoryTitleAr: string,
    userName: string
  ) => {
    if (!user) return;

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Insert real ticket into DB
    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: user.id,
        title: categoryTitle,
        description: `${categoryTitle} - opened by ${userName}`,
        category,
        status: 'open',
        priority: 'normal',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating ticket:', error);
      return;
    }

    const newTicket: SupportTicket = {
      id: data.id,
      ticketNumber: tickets.length + 1001,
      category,
      categoryTitle,
      categoryTitleAr,
      status: 'open',
      createdAt: now,
    };

    setTickets(prev => [newTicket, ...prev]);
    setCurrentTicket(newTicket);

    // Add ticket opened system message locally
    const openedMessage: SupportMessage = {
      id: `msg_${Date.now()}_open`,
      type: 'system',
      content: '',
      time: now,
      systemType: 'ticket_opened',
      ticketId: newTicket.id,
      ticket: newTicket,
    };

    setMessages([openedMessage]);
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || !user || !currentTicket) return;
    
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Optimistic UI update
    const tempMsg: SupportMessage = {
      id: `msg_${Date.now()}`,
      type: 'user',
      content,
      time: now,
      ticketId: currentTicket.id,
    };
    setMessages(prev => [...prev, tempMsg]);

    // Insert into DB
    const { error } = await supabase
      .from('support_messages')
      .insert({
        ticket_id: currentTicket.id,
        sender_id: user.id,
        content,
        is_internal: false,
      });

    if (error) {
      console.error('Error sending support message:', error);
    }
  };

  const closeTicket = async () => {
    if (!currentTicket || !user) return;

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Update in DB
    const { error } = await supabase
      .from('support_tickets')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('id', currentTicket.id);

    if (error) {
      console.error('Error closing ticket:', error);
      return;
    }

    const updatedTicket: SupportTicket = {
      ...currentTicket,
      status: 'resolved',
      resolvedAt: now,
    };

    setTickets(prev => prev.map(t => t.id === currentTicket.id ? updatedTicket : t));

    // Add resolved message
    const resolvedMessage: SupportMessage = {
      id: `msg_${Date.now()}_resolved`,
      type: 'system',
      content: '',
      time: now,
      systemType: 'resolved',
      ticketId: currentTicket.id,
      ticket: updatedTicket,
    };

    setMessages(prev => [...prev, resolvedMessage]);
    setCurrentTicket(null);
  };

  const markAsRead = () => {
    setUnreadCount(0);
  };

  return (
    <SupportContext.Provider value={{
      messages,
      tickets,
      currentTicket,
      hasActiveTicket,
      totalUnread: unreadCount,
      openNewTicket,
      sendMessage,
      closeTicket,
      markAsRead,
    }}>
      {children}
    </SupportContext.Provider>
  );
}

export function useSupport() {
  const context = useContext(SupportContext);
  if (!context) {
    throw new Error('useSupport must be used within a SupportProvider');
  }
  return context;
}
