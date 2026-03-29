import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Send, Trophy, Users, Clock, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { useContestChat } from '@/hooks/useContestChat';
import { getCountryFlag } from '@/lib/countryFlags';

interface ContestMessage {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  country: string;
  message: string;
  timestamp: Date;
  isSystem?: boolean;
}

export function ContestChat() {
  const { language } = useLanguage();
  const { user } = useUser();
  const isRTL = language === 'ar';
  
  const { messages, sendMessage, isConnected, participantCount } = useContestChat();
  const [message, setMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom on new messages
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (message.trim() && sendMessage) {
      sendMessage(message.trim());
      setMessage('');
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ar-SA', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  return (
    <Card className="h-[500px] flex flex-col">
      <CardContent className="p-4 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-orange-500/20 flex items-center justify-center">
              <Trophy className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">
                {isRTL ? 'شات المسابقة' : 'Contest Chat'}
              </h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>{participantCount} {isRTL ? 'متصل' : 'online'}</span>
                {isConnected ? (
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                ) : (
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                )}
              </div>
            </div>
          </div>
          
          <Badge variant="secondary" className="text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            {isRTL ? 'حي' : 'Live'}
          </Badge>
        </div>

        {/* Messages */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 mb-4">
          <div className="space-y-3">
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`flex items-start gap-3 ${
                    msg.userId === user?.id ? 'flex-row-reverse' : ''
                  }`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={msg.avatar} />
                    <AvatarFallback className="text-xs">
                      {msg.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className={`flex-1 max-w-[70%] ${
                    msg.userId === user?.id ? 'items-end' : 'items-start'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium">
                        {msg.username}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(msg.timestamp)}
                      </span>
                      {msg.country && (
                        <span>{getCountryFlag(msg.country)}</span>
                      )}
                    </div>
                    
                    <div
                      className={`rounded-2xl px-3 py-2 text-sm ${
                        msg.userId === user?.id
                          ? 'bg-primary text-primary-foreground ml-auto'
                          : msg.isSystem
                          ? 'bg-muted/50 text-muted-foreground text-center italic'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      {msg.message}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={isRTL ? 'اكتب رسالتك...' : 'Type your message...'}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1"
            disabled={!isConnected}
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || !isConnected}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Status */}
        {!isConnected && (
          <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3 animate-pulse" />
            {isRTL ? 'جاري إعادة الاتصال...' : 'Reconnecting...'}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
