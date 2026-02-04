import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Brain, ArrowLeft, Lock, Send, Loader2, FileCheck, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  useAIControlRoomCombined, 
  useAIAgents,
  useAIControlRoomFindings,
  useCanAccessAIControlRoom,
  getAgentEmoji 
} from '@/hooks/useAIControlRoom';
import { useAIHumanQuestion } from '@/hooks/useAIHumanQuestion';
import { useAIProposals, getPriorityColor, getPriorityBadge, getStatusBadge, useApproveProposal, useRejectProposal } from '@/hooks/useAIProposals';
import { AIControlRoomMessageBubble } from './AIControlRoomMessage';
import { useAuth } from '@/contexts/AuthContext';

interface AIControlRoomViewProps {
  onBack: () => void;
}

export function AIControlRoomView({ onBack }: AIControlRoomViewProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [questionInput, setQuestionInput] = useState('');
  
  const { data: messages, isLoading: messagesLoading } = useAIControlRoomCombined(200);
  const { data: agents, isLoading: agentsLoading } = useAIAgents();
  const { data: findings } = useAIControlRoomFindings(20);
  const { data: proposals, isLoading: proposalsLoading } = useAIProposals();
  const { data: canAccess } = useCanAccessAIControlRoom();
  const { askQuestion, isAsking } = useAIHumanQuestion();
  const { mutate: approveProposal, isPending: isApproving } = useApproveProposal();
  const { mutate: rejectProposal, isPending: isRejecting } = useRejectProposal();
  
  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages?.length]);

  // Count findings by severity
  const findingCounts = {
    critical: findings?.filter(f => f.severity === 'critical').length || 0,
    high: findings?.filter(f => f.severity === 'high').length || 0,
    medium: findings?.filter(f => f.severity === 'medium').length || 0,
    low: findings?.filter(f => f.severity === 'low').length || 0,
  };

  // Count proposals by status
  const proposalCounts = {
    pending: proposals?.filter(p => p.status === 'pending').length || 0,
    approved: proposals?.filter(p => p.status === 'approved').length || 0,
    rejected: proposals?.filter(p => p.status === 'rejected').length || 0,
  };

  const handleAskQuestion = () => {
    if (!questionInput.trim() || isAsking) return;
    askQuestion(questionInput.trim());
    setQuestionInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAskQuestion();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" style={{ height: '100dvh' }}>
      {/* Header */}
      <div className="flex-shrink-0 bg-card border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-3 flex-1">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                🧠 {language === 'ar' ? 'غرفة تحكم AI' : 'AI Control Room'}
                <Lock className="h-3 w-3 text-muted-foreground" />
              </h2>
              <p className="text-xs text-muted-foreground">
                {language === 'ar' 
                  ? `${agents?.length || 0} وكيل نشط • نقاش متسلسل`
                  : `${agents?.length || 0} active agents • Turn-based`
                }
              </p>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="hidden sm:flex items-center gap-2">
            {findingCounts.critical > 0 && (
              <Badge variant="destructive" className="text-xs">
                🔴 {findingCounts.critical}
              </Badge>
            )}
            {proposalCounts.pending > 0 && (
              <Badge className="bg-warning/20 text-warning border-warning/30 text-xs">
                ⏳ {proposalCounts.pending}
              </Badge>
            )}
          </div>
        </div>
        
        {/* Active Agents Bar */}
        <div className="px-4 pb-3 flex gap-2 overflow-x-auto hide-scrollbar">
          {agentsLoading ? (
            <>
              <Skeleton className="h-6 w-20 rounded-full shrink-0" />
              <Skeleton className="h-6 w-24 rounded-full shrink-0" />
              <Skeleton className="h-6 w-20 rounded-full shrink-0" />
            </>
          ) : (
            agents?.slice(0, 8).map(agent => (
              <Badge 
                key={agent.id} 
                variant="secondary" 
                className="shrink-0 text-[10px] px-2"
              >
                {getAgentEmoji(agent.agentRole)}{' '}
                {language === 'ar' ? agent.agentNameAr : agent.agentName}
              </Badge>
            ))
          )}
          {(agents?.length || 0) > 8 && (
            <Badge variant="outline" className="shrink-0 text-[10px]">
              +{(agents?.length || 0) - 8}
            </Badge>
          )}
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="discussion" className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-border px-4">
          <TabsList className="h-10">
            <TabsTrigger value="discussion" className="text-xs">
              💬 {language === 'ar' ? 'النقاش' : 'Discussion'}
            </TabsTrigger>
            <TabsTrigger value="proposals" className="text-xs">
              📝 {language === 'ar' ? 'الاقتراحات' : 'Proposals'}
              {proposalCounts.pending > 0 && (
                <span className="ms-1 px-1.5 py-0.5 rounded-full bg-warning text-warning-foreground text-[10px]">
                  {proposalCounts.pending}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="findings" className="text-xs">
              🔍 {language === 'ar' ? 'المشاكل' : 'Findings'}
              {(findingCounts.critical + findingCounts.high) > 0 && (
                <span className="ms-1 px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground text-[10px]">
                  {findingCounts.critical + findingCounts.high}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="agents" className="text-xs">
              🤖 {language === 'ar' ? 'الوكلاء' : 'Agents'}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Discussion Tab */}
        <TabsContent value="discussion" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2">
              {/* Deliberate Mode Notice */}
              <div className="bg-info/10 border border-info/30 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 text-info text-sm">
                  <Clock className="h-4 w-4" />
                  <span>
                    {language === 'ar' 
                      ? 'وضع النقاش العميق: الردود متسلسلة مع تأخير 5-10 ثواني'
                      : 'Deliberate Mode: Sequential responses with 5-10s delay'}
                  </span>
                </div>
              </div>

              {messagesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-3">
                      <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-20 w-full rounded-xl" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : messages?.length === 0 ? (
                <div className="text-center py-12">
                  <Brain className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    {language === 'ar' 
                      ? 'لا توجد رسائل بعد. اسأل الفريق الهندسي!'
                      : 'No messages yet. Ask the engineering team!'}
                  </p>
                </div>
              ) : (
                messages?.map(msg => (
                  <AIControlRoomMessageBubble key={msg.id} message={msg} />
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Proposals Tab */}
        <TabsContent value="proposals" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-warning/10 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-warning">{proposalCounts.pending}</div>
                  <div className="text-[10px] text-warning/80">
                    {language === 'ar' ? 'بانتظار' : 'Pending'}
                  </div>
                </div>
                <div className="bg-success/10 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-success">{proposalCounts.approved}</div>
                  <div className="text-[10px] text-success/80">
                    {language === 'ar' ? 'معتمد' : 'Approved'}
                  </div>
                </div>
                <div className="bg-destructive/10 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-destructive">{proposalCounts.rejected}</div>
                  <div className="text-[10px] text-destructive/80">
                    {language === 'ar' ? 'مرفوض' : 'Rejected'}
                  </div>
                </div>
              </div>

              {/* Governance Notice */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 text-primary text-sm">
                  <FileCheck className="h-4 w-4" />
                  <span>
                    {language === 'ar' 
                      ? 'جميع الاقتراحات تحتاج موافقتك قبل التنفيذ'
                      : 'All proposals require your approval before execution'}
                  </span>
                </div>
              </div>

              {/* Proposals List */}
              {proposalsLoading ? (
                <div className="space-y-3">
                  {[1, 2].map(i => (
                    <Skeleton key={i} className="h-32 w-full rounded-xl" />
                  ))}
                </div>
              ) : proposals?.length === 0 ? (
                <div className="text-center py-12">
                  <FileCheck className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-muted-foreground">
                    {language === 'ar' 
                      ? 'لا توجد اقتراحات بعد'
                      : 'No proposals yet'}
                  </p>
                </div>
              ) : (
                proposals?.map(proposal => {
                  const priorityBadge = getPriorityBadge(proposal.priority, language as 'ar' | 'en');
                  const statusBadge = getStatusBadge(proposal.status, language as 'ar' | 'en');
                  
                  return (
                    <motion.div
                      key={proposal.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-card border border-border rounded-xl p-4"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className="font-semibold text-foreground">
                          {language === 'ar' ? proposal.titleAr || proposal.title : proposal.title}
                        </h3>
                        <div className="flex gap-1.5 shrink-0">
                          <Badge variant="outline" className={`text-[10px] ${getPriorityColor(proposal.priority)}`}>
                            {priorityBadge.emoji} {priorityBadge.label}
                          </Badge>
                          <Badge variant="outline" className={`text-[10px] ${statusBadge.color}`}>
                            {statusBadge.emoji} {statusBadge.label}
                          </Badge>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        {language === 'ar' ? proposal.descriptionAr || proposal.description : proposal.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {proposal.proposedByName && (
                            <span>💡 {proposal.proposedByName}</span>
                          )}
                          {proposal.affectedArea && (
                            <Badge variant="secondary" className="text-[10px]">
                              📍 {proposal.affectedArea}
                            </Badge>
                          )}
                        </div>
                        
                        {/* Admin Actions */}
                        {proposal.status === 'pending' && canAccess && (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs text-destructive hover:bg-destructive/10"
                              onClick={() => rejectProposal({ proposalId: proposal.id })}
                              disabled={isRejecting || isApproving}
                            >
                              ❌ {language === 'ar' ? 'رفض' : 'Reject'}
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => approveProposal({ proposalId: proposal.id })}
                              disabled={isRejecting || isApproving}
                            >
                              ✅ {language === 'ar' ? 'موافقة' : 'Approve'}
                            </Button>
                          </div>
                        )}
                      </div>
                      
                      {/* Admin Notes */}
                      {proposal.adminNotes && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <p className="text-xs text-muted-foreground">
                            <span className="font-medium">📝 {language === 'ar' ? 'ملاحظات:' : 'Notes:'}</span>{' '}
                            {proposal.adminNotes}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Findings Tab */}
        <TabsContent value="findings" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-3">
              {/* Summary Cards */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="bg-destructive/10 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-destructive">{findingCounts.critical}</div>
                  <div className="text-[10px] text-destructive/80">
                    {language === 'ar' ? 'خطير' : 'Critical'}
                  </div>
                </div>
                <div className="bg-warning/10 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-warning">{findingCounts.high}</div>
                  <div className="text-[10px] text-warning/80">
                    {language === 'ar' ? 'عالي' : 'High'}
                  </div>
                </div>
                <div className="bg-info/10 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-info">{findingCounts.medium}</div>
                  <div className="text-[10px] text-info/80">
                    {language === 'ar' ? 'متوسط' : 'Medium'}
                  </div>
                </div>
                <div className="bg-muted rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-muted-foreground">{findingCounts.low}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {language === 'ar' ? 'منخفض' : 'Low'}
                  </div>
                </div>
              </div>

              {/* Findings List */}
              {findings?.map(finding => (
                <AIControlRoomMessageBubble 
                  key={finding.id} 
                  message={{ 
                    ...finding, 
                    type: 'finding' as const,
                    content: finding.description,
                    contentAr: finding.descriptionAr,
                  }} 
                />
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Agents Tab */}
        <TabsContent value="agents" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full">
            <div className="p-4 grid gap-3">
              {agents?.map(agent => (
                <motion.div
                  key={agent.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card border border-border rounded-xl p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-xl">
                      {getAgentEmoji(agent.agentRole)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground">
                        {language === 'ar' ? agent.agentNameAr : agent.agentName}
                      </h3>
                      <p className="text-xs text-muted-foreground capitalize">
                        {agent.agentRole.replace(/_/g, ' ')}
                      </p>
                      
                      {/* Focus Areas */}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {agent.focusAreas.slice(0, 3).map((area, idx) => (
                          <Badge key={idx} variant="outline" className="text-[10px]">
                            {area}
                          </Badge>
                        ))}
                        {agent.focusAreas.length > 3 && (
                          <Badge variant="secondary" className="text-[10px]">
                            +{agent.focusAreas.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Active Status */}
                    <Badge 
                      variant={agent.isActive ? 'default' : 'secondary'}
                      className="shrink-0 text-[10px]"
                    >
                      {agent.isActive 
                        ? (language === 'ar' ? '🟢 نشط' : '🟢 Active')
                        : (language === 'ar' ? '⚪ غير نشط' : '⚪ Inactive')
                      }
                    </Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Footer - Input for authorized users, read-only message for others */}
      <div className="flex-shrink-0 bg-card border-t border-border p-3">
        {canAccess ? (
          <div className="flex gap-2">
            <Textarea
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={language === 'ar' 
                ? 'اسأل فريق AI الهندسي... (Enter للإرسال)'
                : 'Ask the AI engineering team... (Enter to send)'}
              className="min-h-[44px] max-h-[120px] resize-none flex-1"
              disabled={isAsking}
            />
            <Button
              onClick={handleAskQuestion}
              disabled={!questionInput.trim() || isAsking}
              size="icon"
              className="h-11 w-11 shrink-0"
            >
              {isAsking ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
            <Lock className="h-4 w-4" />
            <span>
              {language === 'ar' 
                ? 'غرفة للقراءة فقط - النظام يعمل تلقائياً'
                : 'Read-only room - System runs automatically'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
