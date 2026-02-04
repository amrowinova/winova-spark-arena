import { useRef, useEffect, useState } from 'react';
import { Brain, ArrowLeft, Send, Loader2, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAIRoomMessages, useCanAccessAIRoom, useSendQuestion } from '@/hooks/useAIControlRoomRealtime';
import { AIRoomMessage } from './AIRoomMessage';

interface AIRoomViewProps {
  onBack: () => void;
}

export function AIRoomView({ onBack }: AIRoomViewProps) {
  const { language } = useLanguage();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');
  
  const { messages, isLoading, isConnected } = useAIRoomMessages(100);
  const { data: canAccess } = useCanAccessAIRoom();
  const { sendQuestion, isSending } = useSendQuestion();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    if (!input.trim() || isSending) return;
    sendQuestion(input.trim());
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" style={{ height: '100dvh' }}>
      {/* Header - Compact */}
      <div className="flex-shrink-0 bg-card border-b border-border px-3 py-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Brain className="h-4 w-4 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
              🧠 {language === 'ar' ? 'الفريق الهندسي' : 'Engineering Team'}
            </h2>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              {isConnected ? (
                <>
                  <Wifi className="h-2.5 w-2.5 text-success" />
                  {language === 'ar' ? 'متصل - مباشر' : 'Connected - Live'}
                </>
              ) : (
                <>
                  <WifiOff className="h-2.5 w-2.5 text-muted-foreground" />
                  {language === 'ar' ? 'غير متصل' : 'Disconnected'}
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-2">
                <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Brain className="h-10 w-10 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">
              {language === 'ar' 
                ? 'الفريق الهندسي يعمل على مراقبة النظام...'
                : 'Engineering team is monitoring the system...'}
            </p>
          </div>
        ) : (
          <>
            {messages.map(msg => (
              <AIRoomMessage key={msg.id} message={msg} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 bg-card border-t border-border p-2">
        {canAccess ? (
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={language === 'ar' ? 'اسأل الفريق...' : 'Ask the team...'}
              className="h-9 text-sm"
              disabled={isSending}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isSending}
              size="icon"
              className="h-9 w-9 shrink-0"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        ) : (
          <p className="text-center text-xs text-muted-foreground py-1">
            {language === 'ar' ? '📖 للقراءة فقط' : '📖 Read-only'}
          </p>
        )}
      </div>
    </div>
  );
}
