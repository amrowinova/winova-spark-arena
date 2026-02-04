import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, Brain, Shield, ArrowLeft, Users, AlertTriangle, Info, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  useAIControlRoomCombined, 
  useAIAgents,
  useAIControlRoomFindings,
  getAgentEmoji 
} from '@/hooks/useAIControlRoom';
import { AIControlRoomMessageBubble } from './AIControlRoomMessage';

interface AIControlRoomViewProps {
  onBack: () => void;
}

export function AIControlRoomView({ onBack }: AIControlRoomViewProps) {
  const { language } = useLanguage();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { data: messages, isLoading: messagesLoading } = useAIControlRoomCombined(200);
  const { data: agents, isLoading: agentsLoading } = useAIAgents();
  const { data: findings } = useAIControlRoomFindings(20);
  
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
                  ? `${agents?.length || 0} وكيل نشط • للقراءة فقط`
                  : `${agents?.length || 0} active agents • Read-only`
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
            {findingCounts.high > 0 && (
              <Badge className="bg-warning/20 text-warning border-warning/30 text-xs">
                🟡 {findingCounts.high}
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
                      ? 'لا توجد رسائل بعد. سيبدأ النقاش التلقائي قريباً.'
                      : 'No messages yet. Automated discussion will start soon.'}
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

      {/* Read-Only Footer */}
      <div className="flex-shrink-0 bg-muted/50 border-t border-border p-3">
        <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <Lock className="h-4 w-4" />
          <span>
            {language === 'ar' 
              ? 'غرفة للقراءة فقط - النظام يعمل تلقائياً'
              : 'Read-only room - System runs automatically'}
          </span>
        </div>
      </div>
    </div>
  );
}
