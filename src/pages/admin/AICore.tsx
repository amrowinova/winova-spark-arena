import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Send, Bot, User, Plus, Trash2, MessageSquare, Brain, Activity,
  Copy, Check, History, Settings2, Play, Square, AlertTriangle,
  Clock, Loader2, FileCode, Database, Terminal, Cpu, ArrowUp, ArrowDown,
  FolderOpen, File, Rocket, X, Eye, Download, Shield
} from 'lucide-react';
import { useAICore } from '@/hooks/useAICore';
import { AICoreMessageBubble } from '@/components/admin/AICoreMessageBubble';
import { format } from 'date-fns';

export default function AICore() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState('chat');
  const [addMemoryOpen, setAddMemoryOpen] = useState(false);
  const [newMemory, setNewMemory] = useState({ key: '', content: '', category: 'general', importance: 5 });
  const scrollRef = useRef<HTMLDivElement>(null);

  // Project state
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '', stack: '' });
  const [viewingFile, setViewingFile] = useState<{ path: string; content: string; language: string } | null>(null);

  const {
    messages, conversations, currentConversation, memories, executions,
    aiMemories,
    isLoading, isSending,
    sendMessage, loadConversations, loadMessages, newConversation, deleteConversation,
    loadMemory, addMemory, deleteMemory,
    loadAIMemory, deleteAIMemory, boostAIMemory,
    loadExecutions, approveExecution,
    // Tool Layer
    projects, currentProject, projectFiles, projectExecutions,
    loadProjects, createProject, deleteProject,
    loadProjectFiles, readFile, writeFile, deleteFile,
    loadProjectExecutions, requestExecution, approveProjectExecution, rejectProjectExecution,
    generateDeployment, setCurrentProject,
  } = useAICore();

  useEffect(() => { loadConversations(); }, [loadConversations]);
  useEffect(() => { if (activeTab === 'memory') { loadMemory(); loadAIMemory(); } }, [activeTab, loadMemory, loadAIMemory]);
  useEffect(() => { if (activeTab === 'logs') loadExecutions(); }, [activeTab, loadExecutions]);
  useEffect(() => { if (activeTab === 'projects') loadProjects(); }, [activeTab, loadProjects]);
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isSending) return;
    sendMessage(input.trim());
    setInput('');
  };

  const handleAddMemory = () => {
    if (!newMemory.key.trim() || !newMemory.content.trim()) return;
    addMemory(newMemory);
    setNewMemory({ key: '', content: '', category: 'general', importance: 5 });
    setAddMemoryOpen(false);
  };

  const handleCreateProject = async () => {
    if (!newProject.name.trim()) return;
    await createProject(newProject.name, newProject.description, newProject.stack);
    setNewProject({ name: '', description: '', stack: '' });
    setNewProjectOpen(false);
  };

  const handleViewFile = async (projectId: string, path: string) => {
    const file = await readFile(projectId, path);
    if (file) setViewingFile({ path: file.path, content: file.content || '', language: file.language || '' });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <InnerPageHeader title={isRTL ? 'نواة الذكاء الخاص' : 'Private AI Core'} />

      <div className="flex-1 flex flex-col p-4 pb-20 gap-4">
        {/* Status Bar */}
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-primary" />
              <span className="font-semibold text-sm">{isRTL ? 'نظام الذكاء الخاص' : 'Private AI Operating System'}</span>
            </div>
            <div className="flex items-center gap-2">
              {currentProject && (
                <Badge variant="outline" className="text-[10px] gap-1">
                  <FolderOpen className="w-3 h-3" />
                  {projects.find(p => p.id === currentProject)?.name || 'Project'}
                </Badge>
              )}
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-muted-foreground">{isRTL ? 'متصل' : 'Connected'}</span>
            </div>
          </div>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="grid grid-cols-5 mb-4">
            <TabsTrigger value="chat" className="gap-1 text-xs">
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isRTL ? 'محادثة' : 'Chat'}</span>
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-1 text-xs">
              <FolderOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isRTL ? 'المشاريع' : 'Projects'}</span>
            </TabsTrigger>
            <TabsTrigger value="memory" className="gap-1 text-xs">
              <Brain className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isRTL ? 'الذاكرة' : 'Memory'}</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-1 text-xs">
              <Activity className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isRTL ? 'السجلات' : 'Logs'}</span>
            </TabsTrigger>
            <TabsTrigger value="control" className="gap-1 text-xs">
              <Settings2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isRTL ? 'التحكم' : 'Control'}</span>
            </TabsTrigger>
          </TabsList>

          {/* Chat Tab */}
          <TabsContent value="chat" className="flex-1 flex flex-col gap-3 mt-0">
            <div className="flex items-center gap-2">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    <History className="w-4 h-4" />
                    {isRTL ? 'المحادثات' : 'History'}
                  </Button>
                </SheetTrigger>
                <SheetContent side={isRTL ? 'right' : 'left'} className="w-80">
                  <SheetHeader>
                    <SheetTitle>{isRTL ? 'المحادثات السابقة' : 'Conversations'}</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4 space-y-2">
                    <Button variant="outline" className="w-full gap-2" onClick={newConversation}>
                      <Plus className="w-4 h-4" />
                      {isRTL ? 'محادثة جديدة' : 'New Conversation'}
                    </Button>
                    <ScrollArea className="h-[calc(100vh-200px)]">
                      {conversations.map(conv => (
                        <div key={conv.id} className={`p-3 rounded-lg border mb-2 cursor-pointer hover:bg-muted/50 transition-colors ${currentConversation === conv.id ? 'bg-primary/10 border-primary/30' : ''}`}>
                          <div className="flex items-start justify-between" onClick={() => loadMessages(conv.id)}>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{conv.title}</p>
                              <p className="text-xs text-muted-foreground">{format(new Date(conv.updated_at), 'MMM d, HH:mm')}</p>
                            </div>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={(e) => { e.stopPropagation(); deleteConversation(conv.id); }}>
                              <Trash2 className="w-3 h-3 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </ScrollArea>
                  </div>
                </SheetContent>
              </Sheet>
              <Button variant="outline" size="sm" className="gap-1" onClick={newConversation}>
                <Plus className="w-4 h-4" />
                {isRTL ? 'جديد' : 'New'}
              </Button>
              {currentConversation && (
                <Badge variant="secondary" className="text-xs">
                  {conversations.find(c => c.id === currentConversation)?.title || 'Active'}
                </Badge>
              )}
            </div>

            <Card className="flex-1 flex flex-col min-h-[400px]">
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                {messages.length === 0 && !isLoading && (
                  <div className="flex flex-col items-center justify-center h-full text-center py-16 gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{isRTL ? 'نواة الذكاء الخاص' : 'Private AI Core'}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {isRTL ? 'جاهز لتوليد التطبيقات والمواقع والأكواد' : 'Ready to generate apps, websites, and code'}
                      </p>
                    </div>
                  </div>
                )}
                {isLoading && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                )}
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <AICoreMessageBubble key={msg.id} message={msg} />
                  ))}
                  {isSending && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                      <div className="bg-muted rounded-lg p-3">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm text-muted-foreground">{isRTL ? 'يفكر...' : 'Thinking...'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              <div className="p-3 border-t">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder={isRTL ? 'اكتب أمرك...' : 'Type your command...'}
                    disabled={isSending}
                    className="flex-1"
                  />
                  <Button onClick={handleSend} disabled={!input.trim() || isSending} size="icon">
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* Projects Tab */}
          <TabsContent value="projects" className="flex-1 flex flex-col gap-3 mt-0">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                {isRTL ? 'المشاريع' : 'Projects'}
              </h3>
              <div className="flex gap-2">
                {currentProject && (
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => { setCurrentProject(null); }}>
                    <ArrowUp className="w-3 h-3" />
                    {isRTL ? 'رجوع' : 'Back'}
                  </Button>
                )}
                <Dialog open={newProjectOpen} onOpenChange={setNewProjectOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1"><Plus className="w-3 h-3" />{isRTL ? 'مشروع جديد' : 'New Project'}</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>{isRTL ? 'إنشاء مشروع' : 'Create Project'}</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                      <Input placeholder={isRTL ? 'اسم المشروع' : 'Project name'} value={newProject.name} onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))} />
                      <Textarea placeholder={isRTL ? 'الوصف' : 'Description'} value={newProject.description} onChange={e => setNewProject(p => ({ ...p, description: e.target.value }))} rows={3} />
                      <Input placeholder={isRTL ? 'التقنيات' : 'Stack (e.g. React + Supabase)'} value={newProject.stack} onChange={e => setNewProject(p => ({ ...p, stack: e.target.value }))} />
                    </div>
                    <DialogFooter>
                      <Button onClick={handleCreateProject} disabled={!newProject.name.trim()}>{isRTL ? 'إنشاء' : 'Create'}</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <ScrollArea className="flex-1">
              {!currentProject ? (
                <div className="space-y-2">
                  {projects.length === 0 && (
                    <Card className="p-8 text-center">
                      <FolderOpen className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">{isRTL ? 'لا توجد مشاريع' : 'No projects yet'}</p>
                    </Card>
                  )}
                  {projects.map(proj => (
                    <Card key={proj.id} className="p-3 cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => { loadProjectFiles(proj.id); loadProjectExecutions(proj.id); }}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <FolderOpen className="w-4 h-4 text-primary" />
                            <span className="font-medium text-sm">{proj.name}</span>
                            {proj.stack && <Badge variant="outline" className="text-[10px]">{proj.stack}</Badge>}
                          </div>
                          {proj.description && <p className="text-xs text-muted-foreground line-clamp-2">{proj.description}</p>}
                          <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(proj.created_at), 'MMM d, yyyy')}</p>
                        </div>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0" onClick={e => { e.stopPropagation(); deleteProject(proj.id); }}>
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Project Info */}
                  <Card className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-primary" />
                        <span className="font-medium">{projects.find(p => p.id === currentProject)?.name}</span>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" className="gap-1 h-7 text-xs" onClick={() => generateDeployment(currentProject)}>
                          <Rocket className="w-3 h-3" />
                          {isRTL ? 'نشر' : 'Deploy'}
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{projects.find(p => p.id === currentProject)?.description || 'No description'}</p>
                  </Card>

                  {/* Files */}
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <File className="w-3.5 h-3.5" />
                      {isRTL ? 'الملفات' : 'Files'} ({projectFiles.length})
                    </h4>
                    {projectFiles.length === 0 ? (
                      <Card className="p-4 text-center">
                        <p className="text-xs text-muted-foreground">{isRTL ? 'لا توجد ملفات' : 'No files. Use Chat to generate code.'}</p>
                      </Card>
                    ) : (
                      <div className="space-y-1">
                        {projectFiles.map(f => (
                          <Card key={f.id} className="p-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <FileCode className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                <span className="text-xs font-mono truncate">{f.path}</span>
                                {f.language && <Badge variant="outline" className="text-[8px] shrink-0">{f.language}</Badge>}
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => handleViewFile(currentProject, f.path)}>
                                  <Eye className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => deleteFile(f.id, currentProject)}>
                                  <Trash2 className="w-3 h-3 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Executions */}
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Terminal className="w-3.5 h-3.5" />
                      {isRTL ? 'التنفيذ' : 'Executions'}
                    </h4>
                    {projectExecutions.length === 0 ? (
                      <Card className="p-4 text-center">
                        <p className="text-xs text-muted-foreground">{isRTL ? 'لا توجد عمليات' : 'No executions yet'}</p>
                      </Card>
                    ) : (
                      <div className="space-y-1">
                        {projectExecutions.map(ex => (
                          <Card key={ex.id} className="p-2">
                            <div className="flex items-center justify-between mb-1">
                              <Badge variant={ex.status === 'completed' ? 'default' : ex.status === 'failed' ? 'destructive' : ex.status === 'rejected' ? 'secondary' : 'outline'} className="text-[10px]">
                                {ex.status}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground">{format(new Date(ex.created_at), 'MMM d, HH:mm')}</span>
                            </div>
                            <pre className="text-[10px] font-mono text-muted-foreground line-clamp-2 whitespace-pre-wrap">{ex.code.slice(0, 200)}</pre>
                            {ex.status === 'pending' && (
                              <div className="flex gap-1 mt-1">
                                <Button size="sm" className="h-6 text-xs gap-1" onClick={() => approveProjectExecution(ex.id)}>
                                  <Play className="w-3 h-3" /> Approve
                                </Button>
                                <Button size="sm" variant="destructive" className="h-6 text-xs gap-1" onClick={() => rejectProjectExecution(ex.id)}>
                                  <X className="w-3 h-3" /> Reject
                                </Button>
                              </div>
                            )}
                            {ex.output && (
                              <pre className="text-[10px] font-mono mt-1 p-1 rounded bg-muted text-muted-foreground line-clamp-3">{ex.output}</pre>
                            )}
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </ScrollArea>

            {/* File Viewer Dialog */}
            <Dialog open={!!viewingFile} onOpenChange={() => setViewingFile(null)}>
              <DialogContent className="max-w-2xl max-h-[80vh]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 font-mono text-sm">
                    <FileCode className="w-4 h-4" />
                    {viewingFile?.path}
                  </DialogTitle>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh]">
                  <pre className="text-xs font-mono p-3 bg-muted rounded-lg whitespace-pre-wrap">{viewingFile?.content}</pre>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Memory Tab */}
          <TabsContent value="memory" className="flex-1 flex flex-col gap-3 mt-0">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Brain className="w-4 h-4" />
                {isRTL ? 'طبقة الذاكرة' : 'AI Memory Layer'}
              </h3>
              <Badge variant="outline" className="text-[10px]">{aiMemories.length} / 2000</Badge>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-2">
                {aiMemories.length === 0 && (
                  <Card className="p-8 text-center">
                    <Brain className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">{isRTL ? 'لا توجد ذاكرة' : 'No AI memory entries yet'}</p>
                    <p className="text-xs text-muted-foreground mt-1">{isRTL ? 'ستُملأ تلقائياً من التقييمات' : 'Auto-populated from evaluations'}</p>
                  </Card>
                )}
                {aiMemories.map(mem => {
                  const catColor = mem.category === 'improvement' ? 'text-yellow-500' :
                    mem.category === 'strategy' ? 'text-green-500' :
                    mem.category === 'error' ? 'text-destructive' : 'text-muted-foreground';
                  return (
                    <Card key={mem.id} className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge variant="outline" className={`text-[10px] ${catColor}`}>{mem.category}</Badge>
                            <span className="text-[10px] text-muted-foreground font-mono">imp: {mem.importance.toFixed(2)}</span>
                            <span className="text-[10px] text-muted-foreground">{format(new Date(mem.created_at), 'MMM d, HH:mm')}</span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-3">{mem.content}</p>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => boostAIMemory(mem.id, Math.min(1, mem.importance + 0.1))}>
                            <ArrowUp className="w-3 h-3 text-green-500" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => boostAIMemory(mem.id, Math.max(0, mem.importance - 0.1))}>
                            <ArrowDown className="w-3 h-3 text-yellow-500" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => deleteAIMemory(mem.id)}>
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>

              {memories.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium flex items-center gap-2">
                      <Database className="w-3.5 h-3.5" />
                      {isRTL ? 'الذاكرة القديمة' : 'Legacy Memory'}
                    </h4>
                    <Dialog open={addMemoryOpen} onOpenChange={setAddMemoryOpen}>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline" className="gap-1 h-7"><Plus className="w-3 h-3" />{isRTL ? 'إضافة' : 'Add'}</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader><DialogTitle>{isRTL ? 'إضافة ذاكرة' : 'Add Legacy Memory'}</DialogTitle></DialogHeader>
                        <div className="space-y-3">
                          <Input placeholder={isRTL ? 'المفتاح' : 'Key / Title'} value={newMemory.key} onChange={e => setNewMemory(p => ({ ...p, key: e.target.value }))} />
                          <Textarea placeholder={isRTL ? 'المحتوى' : 'Content'} value={newMemory.content} onChange={e => setNewMemory(p => ({ ...p, content: e.target.value }))} rows={4} />
                          <Select value={newMemory.category} onValueChange={v => setNewMemory(p => ({ ...p, category: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="general">General</SelectItem>
                              <SelectItem value="code">Code</SelectItem>
                              <SelectItem value="architecture">Architecture</SelectItem>
                              <SelectItem value="deployment">Deployment</SelectItem>
                              <SelectItem value="rules">Rules</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <DialogFooter>
                          <Button onClick={handleAddMemory} disabled={!newMemory.key.trim() || !newMemory.content.trim()}>{isRTL ? 'حفظ' : 'Save'}</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="space-y-2">
                    {memories.map(mem => (
                      <Card key={mem.id} className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{mem.key}</span>
                              <Badge variant="outline" className="text-[10px]">{mem.category}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">{mem.content}</p>
                          </div>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => deleteMemory(mem.id)}>
                            <Trash2 className="w-3 h-3 text-destructive" />
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="flex-1 flex flex-col gap-3 mt-0">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Terminal className="w-4 h-4" />
                {isRTL ? 'سجلات التنفيذ' : 'Execution Logs'}
              </h3>
              <Button variant="outline" size="sm" onClick={loadExecutions}>{isRTL ? 'تحديث' : 'Refresh'}</Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-2">
                {executions.length === 0 && (
                  <Card className="p-8 text-center">
                    <Activity className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">{isRTL ? 'لا توجد عمليات' : 'No execution logs'}</p>
                  </Card>
                )}
                {executions.map(exec => (
                  <Card key={exec.id} className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={exec.status === 'completed' ? 'default' : exec.status === 'failed' ? 'destructive' : 'secondary'} className="text-[10px]">
                          {exec.status}
                        </Badge>
                        <span className="text-sm font-medium">{exec.action_type}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{format(new Date(exec.created_at), 'MMM d, HH:mm:ss')}</span>
                    </div>
                    {exec.error_message && (
                      <div className="flex items-start gap-1 mt-1">
                        <AlertTriangle className="w-3 h-3 text-destructive shrink-0 mt-0.5" />
                        <p className="text-xs text-destructive">{exec.error_message}</p>
                      </div>
                    )}
                    {exec.duration_ms && (
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">{exec.duration_ms}ms</span>
                      </div>
                    )}
                    {exec.status === 'pending' && exec.requires_approval && (
                      <Button size="sm" className="mt-2 gap-1" onClick={() => approveExecution(exec.id)}>
                        <Play className="w-3 h-3" />
                        {isRTL ? 'موافقة وتنفيذ' : 'Approve & Execute'}
                      </Button>
                    )}
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Control Tab */}
          <TabsContent value="control" className="flex-1 flex flex-col gap-3 mt-0">
            <h3 className="font-semibold flex items-center gap-2">
              <Settings2 className="w-4 h-4" />
              {isRTL ? 'لوحة التحكم' : 'System Control Panel'}
            </h3>

            <Card className="p-4 space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">{isRTL ? 'حالة الخدمات' : 'Service Status'}</h4>
                <div className="space-y-2">
                  {[
                    { label: isRTL ? 'خادم AI' : 'AI Model Server', key: 'AI_CORE_SERVER_URL', icon: Bot },
                    { label: isRTL ? 'قاعدة المتجهات' : 'Vector Database', key: 'AI_CORE_VECTOR_DB_URL', icon: Database },
                    { label: isRTL ? 'بيئة التنفيذ' : 'Code Sandbox', key: 'AI_CORE_SANDBOX_URL', icon: FileCode },
                    { label: isRTL ? 'طبقة الأدوات' : 'Tool Layer', key: 'ai-tool-layer', icon: Terminal },
                  ].map(s => (
                    <div key={s.key} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <s.icon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{s.label}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {s.key === 'ai-tool-layer' ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'يتطلب إعداد' : 'Config Required')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">{isRTL ? 'إجراءات النظام' : 'System Actions'}</h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={loadConversations}>
                    <History className="w-5 h-5" />
                    <span className="text-xs">{isRTL ? 'تحديث المحادثات' : 'Reload Conversations'}</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={loadMemory}>
                    <Brain className="w-5 h-5" />
                    <span className="text-xs">{isRTL ? 'تحديث الذاكرة' : 'Reload Memory'}</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={loadExecutions}>
                    <Activity className="w-5 h-5" />
                    <span className="text-xs">{isRTL ? 'تحديث السجلات' : 'Reload Logs'}</span>
                  </Button>
                  <Button variant="outline" className="h-auto py-3 flex-col gap-1" onClick={loadProjects}>
                    <FolderOpen className="w-5 h-5" />
                    <span className="text-xs">{isRTL ? 'تحديث المشاريع' : 'Reload Projects'}</span>
                  </Button>
                </div>
              </div>

              <Card className="p-3 bg-destructive/5 border-destructive/20">
                <h4 className="text-sm font-medium text-destructive mb-1">
                  <Shield className="w-4 h-4 inline mr-1" />
                  {isRTL ? 'قواعد الأمان' : 'Security Rules'}
                </h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• {isRTL ? 'لا تعديل تلقائي على نظام WINOVA' : 'No automatic WINOVA system modification'}</li>
                  <li>• {isRTL ? 'لا تنفيذ مالي مباشر' : 'No direct financial execution'}</li>
                  <li>• {isRTL ? 'تنفيذ الكود فقط في بيئة معزولة' : 'Code execution only in sandbox'}</li>
                  <li>• {isRTL ? 'موافقة يدوية مطلوبة قبل النشر' : 'Manual approval required before deployment'}</li>
                  <li>• {isRTL ? 'جميع الإجراءات مسجلة' : 'All actions logged'}</li>
                  <li>• {isRTL ? 'لا تنفيذ تلقائي للكود بدون موافقة' : 'No auto code execution without admin approval'}</li>
                </ul>
              </Card>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
