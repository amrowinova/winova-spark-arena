import { useState } from 'react';
import { Bot, User, Copy, Check, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Evaluation {
  composite_score: number;
  relevance: number;
  clarity: number;
  technical_depth: number;
  hallucination_risk: number;
  improvement_note: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
  tokens_used?: number;
  evaluation?: Evaluation;
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

function ScoreIndicator({ evaluation }: { evaluation: Evaluation }) {
  const score = evaluation.composite_score;
  const color = score > 0.75 ? 'text-green-500' : score >= 0.5 ? 'text-yellow-500' : 'text-red-500';
  const bgColor = score > 0.75 ? 'bg-green-500/10' : score >= 0.5 ? 'bg-yellow-500/10' : 'bg-red-500/10';
  const borderColor = score > 0.75 ? 'border-green-500/30' : score >= 0.5 ? 'border-yellow-500/30' : 'border-red-500/30';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border ${bgColor} ${borderColor} cursor-help`}>
            <Shield className={`w-3 h-3 ${color}`} />
            <span className={`text-[11px] font-semibold ${color}`}>
              {(score * 100).toFixed(0)}%
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1 text-xs">
            <p className="font-semibold mb-1.5">Self-Evaluation</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
              <span className="text-muted-foreground">Relevance:</span>
              <span>{(evaluation.relevance * 100).toFixed(0)}%</span>
              <span className="text-muted-foreground">Clarity:</span>
              <span>{(evaluation.clarity * 100).toFixed(0)}%</span>
              <span className="text-muted-foreground">Technical Depth:</span>
              <span>{(evaluation.technical_depth * 100).toFixed(0)}%</span>
              <span className="text-muted-foreground">Hallucination Risk:</span>
              <span>{(evaluation.hallucination_risk * 100).toFixed(0)}%</span>
            </div>
            {evaluation.improvement_note && (
              <p className="text-muted-foreground pt-1 border-t border-border/50 mt-1">
                {evaluation.improvement_note}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
                    if (codeString.includes('\n') || match) {
                      return <CodeBlock code={codeString} language={match?.[1]} />;
                    }
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

          {/* Footer for AI messages */}
          {!isUser && (
            <div className="mt-2 pt-2 border-t border-border/30 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
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
              {message.evaluation && (
                <ScoreIndicator evaluation={message.evaluation} />
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
