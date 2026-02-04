import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  Send, 
  Loader2, 
  CheckCircle, 
  XCircle,
  ArrowLeft,
  Bot
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { type AIProposal, useApproveProposal, useRejectProposal } from '@/hooks/useAIProposals';
import { AGENT_CONFIG, getAgentEmoji, getCategoryStyle } from '@/hooks/useAIControlRoomRealtime';

interface DiscussionMessage {
  id: string;
  agentName: string;
  agentNameAr: string;
  agentRole: string;
  content: string;
  contentAr: string | null;
  category: string;
  createdAt: string;
  isChallenger: boolean;
}

interface ProposalDiscussionSheetProps {
  proposal: AIProposal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProposalDiscussionSheet({ 
  proposal, 
  open, 
  onOpenChange 
}: ProposalDiscussionSheetProps) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const { mutate: approve, isPending: isApproving } = useApproveProposal();
  const { mutate: reject, isPending: isRejecting } = useRejectProposal();

  // Start discussion when sheet opens with a proposal
  useEffect(() => {
    if (open && proposal && messages.length === 0) {
      startDiscussion();
    }
  }, [open, proposal?.id]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const startDiscussion = async () => {
    if (!proposal) return;
    
    setIsLoading(true);
    setIsGenerating(true);

    try {
      // Call edge function to generate discussion
      const { data, error } = await supabase.functions.invoke('ai-proposal-discussion', {
        body: { proposalId: proposal.id }
      });

      if (error) throw error;

      // Poll for messages (they arrive via realtime but also fetch initial)
      const { data: discussionMessages } = await supabase
        .from('ai_chat_room')
        .select(`
          id,
          content,
          content_ar,
          message_category,
          created_at,
          ai_agents!ai_chat_room_agent_id_fkey (
            agent_name,
            agent_name_ar,
            agent_role
          )
        `)
        .eq('session_id', proposal.id)
        .order('created_at', { ascending: true });

      if (discussionMessages) {
        setMessages(discussionMessages.map((msg: any) => ({
          id: msg.id,
          agentName: msg.ai_agents?.agent_name || 'AI',
          agentNameAr: msg.ai_agents?.agent_name_ar || 'AI',
          agentRole: msg.ai_agents?.agent_role || 'system_architect',
          content: msg.content,
          contentAr: msg.content_ar,
          category: msg.message_category || 'discussion',
          createdAt: msg.created_at,
          isChallenger: msg.ai_agents?.agent_role === 'challenger_ai',
        })));
      }
    } catch (error) {
      console.error('Discussion error:', error);
      toast({
        title: language === 'ar' ? 'خطأ' : 'Error',
        description: language === 'ar' ? 'فشل بدء النقاش' : 'Failed to start discussion',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsGenerating(false);
    }
  };

  // Realtime subscription for new messages
  useEffect(() => {
    if (!proposal || !open) return;

    const channel = supabase
      .channel(`proposal-discussion-${proposal.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_chat_room',
          filter: `session_id=eq.${proposal.id}`,
        },
        async (payload) => {
          // Fetch agent info for the new message
          const { data: agent } = await supabase
            .from('ai_agents')
            .select('agent_name, agent_name_ar, agent_role')
            .eq('id', payload.new.agent_id)
            .single();

          const newMsg: DiscussionMessage = {
            id: payload.new.id,
            agentName: agent?.agent_name || 'AI',
            agentNameAr: agent?.agent_name_ar || 'AI',
            agentRole: agent?.agent_role || 'system_architect',
            content: payload.new.content,
            contentAr: payload.new.content_ar,
            category: payload.new.message_category || 'discussion',
            createdAt: payload.new.created_at,
            isChallenger: agent?.agent_role === 'challenger_ai',
          };

          setMessages(prev => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [proposal?.id, open]);

  const handleFinalApprove = () => {
    if (!proposal) return;
    approve({ proposalId: proposal.id, notes: `تمت الموافقة بعد نقاش ${messages.length} رسائل` });
    onOpenChange(false);
  };

  const handleFinalReject = () => {
    if (!proposal) return;
    reject({ proposalId: proposal.id, notes: `تم الرفض بعد نقاش ${messages.length} رسائل` });
    onOpenChange(false);
  };

  if (!proposal) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[95vh] p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="p-4 border-b flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <SheetTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                {language === 'ar' ? 'نقاش الاقتراح' : 'Proposal Discussion'}
              </SheetTitle>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {language === 'ar' ? proposal.titleAr || proposal.title : proposal.title}
              </p>
            </div>
            {isGenerating && (
              <Badge variant="secondary" className="animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin ml-1" />
                {language === 'ar' ? 'يناقشون...' : 'Discussing...'}
              </Badge>
            )}
          </div>
        </SheetHeader>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-16 w-full rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <Bot className="h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">
                {language === 'ar' 
                  ? 'جاري بدء النقاش الهندسي...'
                  : 'Starting engineering discussion...'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg, index) => {
                const emoji = getAgentEmoji(msg.agentRole);
                const style = getCategoryStyle(msg.category);
                const config = AGENT_CONFIG[msg.agentRole];

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`flex gap-2 ${msg.isChallenger ? 'bg-destructive/5 p-2 rounded-lg -mx-2' : ''}`}
                  >
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-lg shrink-0 ${
                      msg.isChallenger ? 'bg-destructive/10' : 'bg-primary/10'
                    }`}>
                      {emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`font-medium text-sm ${config?.color || ''}`}>
                          {language === 'ar' ? msg.agentNameAr : msg.agentName}
                        </span>
                        {msg.isChallenger && (
                          <Badge variant="destructive" className="text-[10px] h-4">
                            {language === 'ar' ? 'معارض' : 'Challenger'}
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(msg.createdAt).toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className={`p-2 rounded-lg ${style.bg} border ${style.border}`}>
                        <p className="text-sm whitespace-pre-wrap">
                          {language === 'ar' ? msg.contentAr || msg.content : msg.content}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <Separator />

        {/* Actions Footer */}
        <div className="p-4 flex-shrink-0 bg-card">
          <div className="flex gap-3">
            <Button
              onClick={handleFinalApprove}
              className="flex-1"
              disabled={isApproving || messages.length < 2}
            >
              {isApproving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 ml-2" />
                  {language === 'ar' ? 'موافقة نهائية' : 'Final Approve'}
                </>
              )}
            </Button>
            <Button
              variant="destructive"
              onClick={handleFinalReject}
              className="flex-1"
              disabled={isRejecting}
            >
              {isRejecting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <XCircle className="h-4 w-4 ml-2" />
                  {language === 'ar' ? 'رفض' : 'Reject'}
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground mt-2">
            {language === 'ar' 
              ? `${messages.length} رسائل في النقاش`
              : `${messages.length} messages in discussion`}
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
