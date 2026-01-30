import { createContext, useContext, useState, ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

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

// Mock support agents
const SUPPORT_AGENTS: SupportAgent[] = [
  { id: 'agent_1', name: 'Ahmad', nameAr: 'أحمد', avatar: '👨‍💼' },
  { id: 'agent_2', name: 'Sara', nameAr: 'سارة', avatar: '👩‍💼' },
  { id: 'agent_3', name: 'Khaled', nameAr: 'خالد', avatar: '👨‍💻' },
];

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

let ticketCounter = 1000;

export function SupportProvider({ children }: { children: ReactNode }) {
  const { language } = useLanguage();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [currentTicket, setCurrentTicket] = useState<SupportTicket | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const hasActiveTicket = currentTicket !== null && 
    (currentTicket.status === 'open' || currentTicket.status === 'in_progress');

  const openNewTicket = (
    category: string, 
    categoryTitle: string, 
    categoryTitleAr: string,
    userName: string
  ) => {
    ticketCounter++;
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const newTicket: SupportTicket = {
      id: `ticket_${ticketCounter}`,
      ticketNumber: ticketCounter,
      category,
      categoryTitle,
      categoryTitleAr,
      status: 'open',
      createdAt: now,
    };

    setTickets(prev => [...prev, newTicket]);
    setCurrentTicket(newTicket);

    // Add ticket opened system message
    const openedMessage: SupportMessage = {
      id: `msg_${Date.now()}_open`,
      type: 'system',
      content: '',
      time: now,
      systemType: 'ticket_opened',
      ticketId: newTicket.id,
      ticket: newTicket,
    };

    setMessages(prev => [...prev, openedMessage]);

    // Simulate agent assignment after 3 seconds
    setTimeout(() => {
      const randomAgent = SUPPORT_AGENTS[Math.floor(Math.random() * SUPPORT_AGENTS.length)];
      const assignTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const updatedTicket: SupportTicket = {
        ...newTicket,
        status: 'in_progress',
        assignedAgent: randomAgent,
      };

      setTickets(prev => prev.map(t => t.id === newTicket.id ? updatedTicket : t));
      setCurrentTicket(updatedTicket);

      // Add agent assigned message
      const agentMessage: SupportMessage = {
        id: `msg_${Date.now()}_agent`,
        type: 'system',
        content: '',
        time: assignTime,
        systemType: 'agent_assigned',
        ticketId: newTicket.id,
        ticket: updatedTicket,
      };

      setMessages(prev => [...prev, agentMessage]);
      setUnreadCount(prev => prev + 1);
    }, 3000);
  };

  const sendMessage = (content: string) => {
    if (!content.trim()) return;
    
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const newMessage: SupportMessage = {
      id: `msg_${Date.now()}`,
      type: 'user',
      content,
      time: now,
      ticketId: currentTicket?.id,
    };

    setMessages(prev => [...prev, newMessage]);

    // Simulate agent response
    if (currentTicket?.assignedAgent) {
      setTimeout(() => {
        const responseTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const isArabic = language === 'ar';
        
        const agentResponse: SupportMessage = {
          id: `msg_${Date.now()}_response`,
          type: 'agent',
          content: isArabic 
            ? 'شكراً لتواصلك معنا. سأساعدك في حل هذه المشكلة. يرجى إعطائي المزيد من التفاصيل.'
            : 'Thank you for reaching out. I will help you solve this issue. Please give me more details.',
          time: responseTime,
          senderName: isArabic ? currentTicket.assignedAgent.nameAr : currentTicket.assignedAgent.name,
          ticketId: currentTicket.id,
        };
        
        setMessages(prev => [...prev, agentResponse]);
        setUnreadCount(prev => prev + 1);
      }, 2000);
    }
  };

  const closeTicket = () => {
    if (!currentTicket) return;

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
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
