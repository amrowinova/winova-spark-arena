import { useState } from 'react';
import { Bot, User, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  tokens_used?: number;
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success('Copied');
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative my-3 rounded-lg bg-muted/60 border overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted border-b">
        <span className="text-xs text-muted-foreground font-mono">{language || 'code'}</span>
        <Button variant="ghost" size="sm" className="h-6 px-2 gap-1" onClick={handleCopy}>
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          <span className="text-[10px]">{copied ? 'Copied' : 'Copy'}</span>
        </Button>
      </div>
      <pre className="p-3 overflow-x-auto text-xs leading-relaxed"><code>{code}</code></pre>
    </div>
  );
}

export function AICoreMessageBubble({ message }: { message: Message }) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const time = format(new Date(message.created_at), 'HH:mm');

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    toast.success('Copied');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
          <Bot className="w-4 h-4 text-primary" />
        </div>
      )}

      <div className={`group max-w-[85%] sm:max-w-[75%] ${isUser ? 'order-first' : ''}`}>
        {/* Sender + Time header */}
        <div className={`flex items-center gap-2 mb-1 ${isUser ? 'justify-end' : ''}`}>
          <span className="text-[10px] font-medium text-muted-foreground">
            {isUser ? 'You' : 'AI'}
          </span>
          <span className="text-[10px] text-muted-foreground">{time}</span>
        </div>

        {/* Bubble */}
        <div className={`relative rounded-2xl px-4 py-3 ${isUser ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'}`}>
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
          ) : (
            <div className="text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-headings:my-2 prose-pre:my-0 prose-pre:p-0 prose-pre:bg-transparent">
              <ReactMarkdown
                components={{
                  code({ className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const codeString = String(children).replace(/\n$/, '');
                    // Multi-line = code block
                    if (codeString.includes('\n') || match) {
                      return <CodeBlock code={codeString} language={match?.[1]} />;
                    }
                    // Inline code
                    return <code className="bg-background/20 px-1.5 py-0.5 rounded text-xs font-mono" {...props}>{children}</code>;
                  },
                  pre({ children }) {
                    return <>{children}</>;
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}

          {/* Copy button for AI messages */}
          {!isUser && (
            <div className="mt-2 pt-2 border-t border-border/30 flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 gap-1 text-muted-foreground hover:text-foreground"
                onClick={handleCopyMessage}
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span className="text-[10px]">{copied ? 'Copied' : 'Copy'}</span>
              </Button>
              {message.tokens_used && (
                <span className="text-[10px] text-muted-foreground">{message.tokens_used} tokens</span>
              )}
            </div>
          )}
        </div>
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
}
