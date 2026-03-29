import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Reply, Send, X, Users } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { getCountryFlag } from '@/lib/countryFlags';

interface ThreadMessage {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  country: string;
  message: string;
  timestamp: Date;
  replyTo?: string;
}

interface ThreadRepliesProps {
  messageId: string;
  messageAuthor: string;
  onClose: () => void;
  onReply: (message: string, replyTo: string) => void;
}

export function ThreadReplies({ messageId, messageAuthor, onClose, onReply }: ThreadRepliesProps) {
  const { language } = useLanguage();
  const { user } = useUser();
  const isRTL = language === 'ar';
  
  const [replies, setReplies] = useState<ThreadMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Mock thread replies - in real app, fetch from API
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setReplies([
        {
          id: '1',
          userId: 'user1',
          username: 'Ahmed',
          country: 'SA',
          message: 'أوافق على هذا الرأي!',
          timestamp: new Date(Date.now() - 300000),
        },
        {
          id: '2',
          userId: 'user2',
          username: 'Sarah',
          country: 'AE',
          message: 'I think this is a great point!',
          timestamp: new Date(Date.now() - 180000),
        },
      ]);
    }, 500);
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom on new replies
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [replies]);

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    
    const newReply: ThreadMessage = {
      id: Date.now().toString(),
      userId: user?.id || '',
      username: user?.username || 'Anonymous',
      avatar: user?.avatar,
      country: user?.country || '',
      message: replyText.trim(),
      timestamp: new Date(),
      replyTo: messageId,
    };
    
    setReplies(prev => [...prev, newReply]);
    onReply(replyText.trim(), messageId);
    setReplyText('');
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return isRTL ? 'الآن' : 'now';
    if (minutes < 60) return `${minutes} ${isRTL ? 'دقيقة' : 'min'}`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ${isRTL ? 'ساعة' : 'hr'}`;
    
    return date.toLocaleDateString();
  };

  return (
    <Card className="fixed inset-4 z-50 flex flex-col max-w-2xl mx-auto">
      <CardContent className="p-4 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <div>
              <h3 className="font-semibold text-sm">
                {isRTL ? 'الردود على' : 'Replies to'} {messageAuthor}
              </h3>
              <p className="text-xs text-muted-foreground">
                {replies.length} {isRTL ? 'رد' : 'replies'}
              </p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Replies */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 my-4">
          <div className="space-y-3">
            <AnimatePresence>
              {replies.map((reply) => (
                <motion.div
                  key={reply.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-start gap-3"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={reply.avatar} />
                    <AvatarFallback className="text-xs">
                      {reply.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium">
                        {reply.username}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(reply.timestamp)}
                      </span>
                      {reply.country && (
                        <span>{getCountryFlag(reply.country)}</span>
                      )}
                    </div>
                    
                    <div className="rounded-lg px-3 py-2 bg-muted text-sm">
                      {reply.message}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* Reply Input */}
        <div className="flex gap-2 pt-3 border-t">
          <div className="flex-1 relative">
            <Input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={isRTL ? 'اكتب ردك...' : 'Type your reply...'}
              onKeyPress={(e) => e.key === 'Enter' && handleSendReply()}
              className="pr-10"
            />
            <Reply className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
          
          <Button
            onClick={handleSendReply}
            disabled={!replyText.trim() || isLoading}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Participants */}
        <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
          <Users className="h-3 w-3" />
          <span>
            {new Set(replies.map(r => r.userId)).size} {isRTL ? 'مشارك' : 'participants'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
