import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Send, Paperclip, Star } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { SupportChatHeader, SupportStatus, SupportAgent } from '@/components/chat/SupportChatHeader';
import { SupportSystemMessage, SupportSystemMessageData } from '@/components/chat/SupportSystemMessage';
import { useBanner } from '@/contexts/BannerContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface SupportMessage {
  id: string;
  content: string;
  time: string;
  isMine: boolean;
  senderName?: string;
}

interface SupportTicket {
  category: string;
  categoryTitle: string;
  isSupport: boolean;
  agent?: {
    id: string;
    name: string;
    nameEn?: string;
    username: string;
    avatar: string;
  };
}

// Mock support agents
const SUPPORT_AGENTS: SupportAgent[] = [
  { id: 'agent_1', name: 'Ahmad', nameAr: 'أحمد', avatar: '👨‍💼' },
  { id: 'agent_2', name: 'Sara', nameAr: 'سارة', avatar: '👩‍💼' },
  { id: 'agent_3', name: 'Khaled', nameAr: 'خالد', avatar: '👨‍💻' },
];

export default function SupportChat() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useUser();
  const { success: showSuccess } = useBanner();
  
  const isRTL = language === 'ar';
  const supportTicket = location.state?.supportTicket as SupportTicket | undefined;
  
  const [status, setStatus] = useState<SupportStatus>('waiting');
  const [agent, setAgent] = useState<SupportAgent | undefined>(undefined);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [systemMessages, setSystemMessages] = useState<SupportSystemMessageData[]>([]);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState(0);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, systemMessages]);

  // Initial setup - add ticket opened message
  useEffect(() => {
    if (!supportTicket) {
      navigate('/help');
      return;
    }

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Add ticket opened system message
    const ticketOpenedMsg: SupportSystemMessageData = {
      id: 'sys_1',
      type: 'ticket_opened',
      categoryTitle: supportTicket.categoryTitle,
      time: now,
    };
    
    setSystemMessages([ticketOpenedMsg]);

    // Simulate agent assignment after 3 seconds
    const assignTimeout = setTimeout(() => {
      const randomAgent = SUPPORT_AGENTS[Math.floor(Math.random() * SUPPORT_AGENTS.length)];
      setAgent(randomAgent);
      setStatus('active');
      
      const assignTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const agentAssignedMsg: SupportSystemMessageData = {
        id: 'sys_2',
        type: 'agent_assigned',
        agentName: randomAgent.name,
        agentNameAr: randomAgent.nameAr,
        userName: user.name.split(' ')[0],
        categoryTitle: supportTicket.categoryTitle,
        time: assignTime,
      };
      
      setSystemMessages(prev => [...prev, agentAssignedMsg]);
    }, 3000);

    return () => clearTimeout(assignTimeout);
  }, [supportTicket, navigate, user.name]);

  const handleSend = () => {
    if (!message.trim()) return;
    
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const newMessage: SupportMessage = {
      id: `msg_${Date.now()}`,
      content: message,
      time: now,
      isMine: true,
    };
    
    setMessages(prev => [...prev, newMessage]);
    setMessage('');

    // Simulate agent response after 2 seconds
    if (agent && status === 'active') {
      setTimeout(() => {
        const responseTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const agentResponse: SupportMessage = {
          id: `msg_${Date.now()}_agent`,
          content: isRTL 
            ? 'شكراً لتواصلك معنا. سأساعدك في حل هذه المشكلة. يرجى إعطائي المزيد من التفاصيل.'
            : 'Thank you for reaching out. I will help you solve this issue. Please give me more details.',
          time: responseTime,
          isMine: false,
          senderName: isRTL ? agent.nameAr : agent.name,
        };
        setMessages(prev => [...prev, agentResponse]);
      }, 2000);
    }
  };

  const handleBack = () => {
    navigate('/help');
  };

  const handleCloseTicket = () => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const resolvedMsg: SupportSystemMessageData = {
      id: 'sys_resolved',
      type: 'ticket_resolved',
      time: now,
    };
    
    setSystemMessages(prev => [...prev, resolvedMsg]);
    setStatus('resolved');
    
    // Open rating dialog after a short delay
    setTimeout(() => {
      setRatingDialogOpen(true);
    }, 500);
  };

  const handleSubmitRating = () => {
    showSuccess(isRTL ? 'شكراً لتقييمك!' : 'Thank you for your feedback!');
    setRatingDialogOpen(false);
    setTimeout(() => navigate('/help'), 1000);
  };

  if (!supportTicket) {
    return null;
  }

  return (
    <AppLayout title={isRTL ? 'دعم' : 'Support'} showNav={false} showHeader={false}>
      <div className="flex flex-col h-screen">
        {/* Support Header */}
        <SupportChatHeader
          categoryTitle={supportTicket.categoryTitle}
          status={status}
          agent={agent}
          onBack={handleBack}
          onCloseTicket={handleCloseTicket}
        />

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-2">
            {/* System Messages */}
            {systemMessages.map((sysMsg) => (
              <SupportSystemMessage key={sysMsg.id} message={sysMsg} />
            ))}

            {/* Chat Messages */}
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'} mb-2`}
              >
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl ${
                  msg.isMine 
                    ? 'bg-primary text-primary-foreground rounded-br-sm' 
                    : 'bg-muted rounded-bl-sm'
                }`}>
                  {!msg.isMine && msg.senderName && (
                    <p className="text-xs font-medium mb-1 opacity-70">{msg.senderName}</p>
                  )}
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  <span className="text-[10px] opacity-60 block text-end mt-1">{msg.time}</span>
                </div>
              </motion.div>
            ))}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input - disabled when resolved */}
        <div className="p-4 border-t border-border bg-card safe-bottom">
          {status === 'resolved' ? (
            <div className="text-center text-sm text-muted-foreground py-2">
              {isRTL ? 'تم إغلاق هذه التذكرة' : 'This ticket has been closed'}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="shrink-0">
                <Paperclip className="h-4 w-4" />
              </Button>
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={isRTL ? 'اكتب رسالتك...' : 'Type your message...'}
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              />
              <Button size="icon" onClick={handleSend} disabled={!message.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Rating Dialog */}
        <Dialog open={ratingDialogOpen} onOpenChange={setRatingDialogOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-center">
                {isRTL ? 'قيّم تجربتك' : 'Rate Your Experience'}
              </DialogTitle>
              <DialogDescription className="text-center">
                {isRTL 
                  ? 'كيف كانت تجربتك مع فريق الدعم؟'
                  : 'How was your experience with our support team?'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex justify-center gap-2 py-4">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setSelectedRating(star)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star 
                    className={`h-8 w-8 ${
                      star <= selectedRating 
                        ? 'fill-warning text-warning' 
                        : 'text-muted-foreground'
                    }`}
                  />
                </button>
              ))}
            </div>
            
            <Button 
              onClick={handleSubmitRating}
              disabled={selectedRating === 0}
              className="w-full"
            >
              {isRTL ? 'إرسال التقييم' : 'Submit Rating'}
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
