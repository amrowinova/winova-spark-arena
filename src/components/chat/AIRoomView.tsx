import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, ArrowLeft, Send, Loader2, Wifi, WifiOff, FileText, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAIRoomMessages, useCanAccessAIRoom, useSendQuestion } from '@/hooks/useAIControlRoomRealtime';
import { useAIProposals, type AIProposal } from '@/hooks/useAIProposals';
import { AIRoomMessage } from './AIRoomMessage';

interface AIRoomViewProps {
  onBack: () => void;
}

// Proposal mini-card for the proposals tab
function ProposalMiniCard({ proposal, onClick }: { proposal: AIProposal; onClick: () => void }) {
  const { language } = useLanguage();
  
  const priorityColor = {
    critical: 'text-destructive bg-destructive/10',
    high: 'text-warning bg-warning/10',
    medium: 'text-primary bg-primary/10',
    low: 'text-muted-foreground bg-muted',
  }[proposal.priority] || 'text-muted-foreground bg-muted';

  return (
    <div 
      onClick={onClick}
      className="p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
    >
      <div className="flex items-start gap-2">
        <div className={`p-1.5 rounded ${priorityColor}`}>
          <FileText className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm line-clamp-1">
            {language === 'ar' ? proposal.titleAr || proposal.title : proposal.title}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {language === 'ar' ? proposal.descriptionAr || proposal.description : proposal.description}
          </p>
          <div className="flex gap-1.5 mt-1.5 flex-wrap">
            <Badge variant="outline" className="text-[9px] h-4 px-1">
              {proposal.priority === 'critical' ? '🔴' : proposal.priority === 'high' ? '🟡' : '🔵'} {proposal.priority}
            </Badge>
            {proposal.affectedArea && (
              <Badge variant="secondary" className="text-[9px] h-4 px-1">
                {proposal.affectedArea}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function AIRoomView({ onBack }: AIRoomViewProps) {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState('chat');
  
  const { messages, isLoading, isConnected, refetch } = useAIRoomMessages(100);
  const { data: canAccess } = useCanAccessAIRoom();
  const { sendQuestion, isSending } = useSendQuestion();
  const { data: pendingProposals = [] } = useAIProposals('pending');

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

  const handleProposalClick = (proposal: AIProposal) => {
    // Navigate to Admin Proposals page
    navigate('/admin/proposals');
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

          {/* Refresh button */}
          <Button variant="ghost" size="icon" onClick={() => refetch()} className="h-8 w-8">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-2 h-8">
            <TabsTrigger value="chat" className="text-xs h-7">
              💬 {language === 'ar' ? 'النقاش' : 'Discussion'}
            </TabsTrigger>
            <TabsTrigger value="proposals" className="text-xs h-7 relative">
              📋 {language === 'ar' ? 'المقترحات' : 'Proposals'}
              {pendingProposals.length > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 min-w-4 text-[9px] px-1">
                  {pendingProposals.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content Area */}
      {activeTab === 'chat' ? (
        <>
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
                <p className="text-xs text-muted-foreground mt-1">
                  {language === 'ar' 
                    ? 'اسأل سؤالاً لبدء النقاش'
                    : 'Ask a question to start the discussion'}
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
                  placeholder={language === 'ar' ? 'اسأل الفريق الهندسي...' : 'Ask the engineering team...'}
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
        </>
      ) : (
        /* Proposals Tab */
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {pendingProposals.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <FileText className="h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">
                {language === 'ar' 
                  ? 'لا توجد مقترحات معلقة'
                  : 'No pending proposals'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingProposals.map(proposal => (
                <ProposalMiniCard 
                  key={proposal.id} 
                  proposal={proposal} 
                  onClick={() => handleProposalClick(proposal)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
