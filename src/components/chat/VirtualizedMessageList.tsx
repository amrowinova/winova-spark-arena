import { useCallback, useMemo } from 'react';
import { List } from 'react-window';
import { motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getCountryFlag } from '@/lib/countryFlags';

interface Message {
  id: string;
  userId: string;
  username: string;
  avatar?: string;
  country: string;
  message: string;
  timestamp: Date;
  isOwn: boolean;
}

interface VirtualizedMessageListProps {
  messages: Message[];
  height: number;
  onScrollToBottom?: () => void;
}

const MessageItem = ({ index, style, data }: { index: number; style: any; data: any }) => {
  const message = data.messages[index];
  
  if (!message) return null;

  return (
    <div style={style}>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex items-start gap-3 px-4 py-2 ${
          message.isOwn ? 'flex-row-reverse' : ''
        }`}
      >
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={message.avatar} />
          <AvatarFallback className="text-xs">
            {message.username.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        <div className={`flex-1 min-w-0 ${
          message.isOwn ? 'items-end' : 'items-start'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium">
              {message.username}
            </span>
            <span className="text-xs text-muted-foreground">
              {message.timestamp.toLocaleTimeString('ar-SA', { 
                hour: '2-digit', 
                minute: '2-digit',
                hour12: false 
              })}
            </span>
            {message.country && (
              <span>{getCountryFlag(message.country)}</span>
            )}
          </div>
          
          <div
            className={`rounded-2xl px-3 py-2 text-sm break-words ${
              message.isOwn
                ? 'bg-primary text-primary-foreground ml-auto'
                : 'bg-muted text-foreground'
            }`}
          >
            {message.message}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export function VirtualizedMessageList({ 
  messages, 
  height, 
  onScrollToBottom 
}: VirtualizedMessageListProps) {
  const itemData = useMemo(() => ({ messages }), [messages]);

  const scrollToBottom = useCallback(() => {
    onScrollToBottom?.();
  }, [onScrollToBottom]);

  // Auto-scroll to bottom when new messages arrive
  const handleScroll = useCallback(({ scrollOffset, scrollDirection }: any) => {
    // Check if user is near bottom
    const isNearBottom = scrollOffset > 0 && scrollDirection === 'forward';
    if (isNearBottom) {
      scrollToBottom();
    }
  }, [scrollToBottom]);

  if (!messages.length) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>No messages yet</p>
      </div>
    );
  }

  return (
    <List
      height={height}
      itemCount={messages.length}
      itemSize={80} // Approximate height for each message
      itemData={itemData}
      onScroll={handleScroll}
      overscanCount={5} // Render 5 extra items above/below viewport
    >
      {({ index, style, data }) => <MessageItem index={index} style={style} data={data} />}
    </List>
  );
}
