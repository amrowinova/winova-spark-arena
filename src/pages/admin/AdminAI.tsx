import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bot, MessageSquare, AlertTriangle, Clock, Users, CheckCircle, XCircle, ChevronDown, Brain, Shield, Bug, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useLanguage } from '@/contexts/LanguageContext';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { 
  useAIAgents, 
  useAIDiscussionSessions, 
  useAIChatMessages, 
  useAIAnalysisLogs,
  type AIAgent,
  type AIDiscussionSession 
} from '@/hooks/useAIDiscussions';

const ROLE_ICONS: Record<string, typeof Bot> = {
  user_tester: Users,
  marketer_growth: TrendingUp,
  leader_team: Users,
  manager_stats: TrendingUp,
  backend_engineer: Brain,
  system_architect: Shield,
  qa_breaker: Bug,
  fraud_analyst: Shield,
  support_agent: MessageSquare,
  power_user: Users,
  contest_judge: CheckCircle,
  p2p_moderator: Shield,
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-destructive text-destructive-foreground',
  high: 'bg-warning text-warning-foreground',
  medium: 'bg-accent text-accent-foreground',
  low: 'bg-muted text-muted-foreground',
};

function AgentCard({ agent }: { agent: AIAgent }) {
  const Icon = ROLE_ICONS[agent.agent_role] || Bot;
  
  return (
    <Card className="bg-card/50">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium truncate">{agent.agent_name_ar}</h4>
              <Badge variant={agent.is_active ? 'default' : 'secondary'} className="text-xs">
                {agent.is_active ? 'نشط' : 'غير نشط'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {agent.behavior_description}
            </p>
            <div className="flex flex-wrap gap-1 mt-2">
              {agent.focus_areas.slice(0, 3).map((area) => (
                <Badge key={area} variant="outline" className="text-[10px]">
                  {area}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SessionCard({ 
  session, 
  isSelected, 
  onSelect 
}: { 
  session: AIDiscussionSession; 
  isSelected: boolean;
  onSelect: () => void;
}) {
  const isCompleted = session.status === 'completed';
  
  return (
    <Card 
      className={`cursor-pointer transition-colors ${
        isSelected ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
      }`}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isCompleted ? (
              <CheckCircle className="h-4 w-4 text-success" />
            ) : (
              <Clock className="h-4 w-4 text-warning animate-pulse" />
            )}
            <span className="text-sm font-medium">
              جلسة {new Date(session.started_at).toLocaleDateString('ar-SA')}
            </span>
          </div>
          <Badge variant="outline" className="text-xs">
            {session.participants_count} مشارك
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {new Date(session.started_at).toLocaleTimeString('ar-SA')}
          {session.completed_at && (
            <> - {new Date(session.completed_at).toLocaleTimeString('ar-SA')}</>
          )}
        </p>
        {session.action_items && session.action_items.length > 0 && (
          <div className="flex items-center gap-1 mt-2">
            <AlertTriangle className="h-3 w-3 text-warning" />
            <span className="text-xs text-warning">
              {session.action_items.length} مهام
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ChatMessageBubble({ message, agent }: { message: any; agent?: AIAgent }) {
  const Icon = agent ? ROLE_ICONS[agent.agent_role] || Bot : Bot;
  const isSummary = message.is_summary;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isSummary ? 'bg-primary/5 p-4 rounded-xl' : ''}`}
    >
      <div className={`p-2 rounded-lg shrink-0 ${isSummary ? 'bg-primary' : 'bg-muted'}`}>
        <Icon className={`h-4 w-4 ${isSummary ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">
            {agent?.agent_name_ar || 'وكيل AI'}
          </span>
          <Badge variant="outline" className="text-[10px]">
            {message.message_type}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {new Date(message.created_at).toLocaleTimeString('ar-SA')}
          </span>
        </div>
        <p className="text-sm whitespace-pre-wrap">
          {message.content_ar || message.content}
        </p>
      </div>
    </motion.div>
  );
}

function AnalysisLogCard({ log }: { log: any }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge className={SEVERITY_COLORS[log.severity] || 'bg-muted'}>
                  {log.severity}
                </Badge>
                <div>
                  <h4 className="font-medium text-sm">{log.title_ar || log.title}</h4>
                  <p className="text-xs text-muted-foreground">
                    {log.agent?.agent_name_ar} • {log.affected_area}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={log.status === 'open' ? 'destructive' : 'secondary'}>
                  {log.status === 'open' ? 'مفتوح' : 'مغلق'}
                </Badge>
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-3">
            <div>
              <h5 className="text-xs font-medium text-muted-foreground mb-1">الوصف</h5>
              <p className="text-sm">{log.description_ar || log.description}</p>
            </div>
            {log.technical_reason && (
              <div>
                <h5 className="text-xs font-medium text-muted-foreground mb-1">السبب التقني</h5>
                <p className="text-sm font-mono bg-muted p-2 rounded">{log.technical_reason}</p>
              </div>
            )}
            {log.suggested_fix && (
              <div>
                <h5 className="text-xs font-medium text-muted-foreground mb-1">الإصلاح المقترح</h5>
                <p className="text-sm">{log.suggested_fix}</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {new Date(log.created_at).toLocaleString('ar-SA')}
            </p>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default function AdminAI() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  
  const { data: agents = [], isLoading: agentsLoading } = useAIAgents();
  const { data: sessions = [], isLoading: sessionsLoading } = useAIDiscussionSessions();
  const { data: messages = [], isLoading: messagesLoading } = useAIChatMessages(selectedSessionId || undefined);
  const { data: logs = [], isLoading: logsLoading } = useAIAnalysisLogs('open');
  
  // Auto-select first session
  if (sessions.length > 0 && !selectedSessionId) {
    setSelectedSessionId(sessions[0].id);
  }
  
  const activeAgents = agents.filter(a => a.is_active);
  const criticalLogs = logs.filter(l => l.severity === 'critical' || l.severity === 'high');
  
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-background">
      <InnerPageHeader 
        title={isRTL ? 'نظام AI الداخلي' : 'Internal AI System'} 
        onBack={() => navigate('/admin')}
      />
      
      <div className="container pb-24 pt-4 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Bot className="h-8 w-8 mx-auto mb-2 text-primary" />
              <p className="text-2xl font-bold">{activeAgents.length}</p>
              <p className="text-xs text-muted-foreground">وكيل نشط</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 text-success" />
              <p className="text-2xl font-bold">{sessions.length}</p>
              <p className="text-xs text-muted-foreground">جلسة نقاش</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-warning" />
              <p className="text-2xl font-bold">{logs.length}</p>
              <p className="text-xs text-muted-foreground">مشكلة مكتشفة</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <XCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
              <p className="text-2xl font-bold">{criticalLogs.length}</p>
              <p className="text-xs text-muted-foreground">مشكلة حرجة</p>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="discussions" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="discussions">النقاشات</TabsTrigger>
            <TabsTrigger value="agents">الوكلاء</TabsTrigger>
            <TabsTrigger value="findings">الاكتشافات</TabsTrigger>
          </TabsList>
          
          {/* Discussions Tab */}
          <TabsContent value="discussions" className="mt-4">
            <div className="grid md:grid-cols-3 gap-4">
              {/* Sessions List */}
              <div className="space-y-3">
                <h3 className="font-medium">الجلسات</h3>
                {sessionsLoading ? (
                  <p className="text-sm text-muted-foreground">جاري التحميل...</p>
                ) : sessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">لا توجد جلسات بعد</p>
                ) : (
                  <div className="space-y-2">
                    {sessions.map((session) => (
                      <SessionCard
                        key={session.id}
                        session={session}
                        isSelected={selectedSessionId === session.id}
                        onSelect={() => setSelectedSessionId(session.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
              
              {/* Chat View */}
              <div className="md:col-span-2">
                <Card className="h-[500px] flex flex-col">
                  <CardHeader className="py-3 border-b">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      {selectedSessionId ? 'نقاش الجلسة' : 'اختر جلسة'}
                    </CardTitle>
                  </CardHeader>
                  <ScrollArea className="flex-1 p-4">
                    {messagesLoading ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        جاري تحميل الرسائل...
                      </p>
                    ) : messages.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        لا توجد رسائل في هذه الجلسة
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {messages.map((msg) => (
                          <ChatMessageBubble 
                            key={msg.id} 
                            message={msg} 
                            agent={msg.agent} 
                          />
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </Card>
              </div>
            </div>
          </TabsContent>
          
          {/* Agents Tab */}
          <TabsContent value="agents" className="mt-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {agentsLoading ? (
                <p className="text-sm text-muted-foreground">جاري التحميل...</p>
              ) : (
                agents.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} />
                ))
              )}
            </div>
          </TabsContent>
          
          {/* Findings Tab */}
          <TabsContent value="findings" className="mt-4">
            <div className="space-y-3">
              {logsLoading ? (
                <p className="text-sm text-muted-foreground">جاري التحميل...</p>
              ) : logs.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-success opacity-50" />
                    <p className="text-muted-foreground">لا توجد مشاكل مفتوحة حالياً</p>
                  </CardContent>
                </Card>
              ) : (
                logs.map((log) => (
                  <AnalysisLogCard key={log.id} log={log} />
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
