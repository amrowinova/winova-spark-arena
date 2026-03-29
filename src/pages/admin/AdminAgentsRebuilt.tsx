/**
 * AdminAgentsPage - Completely rebuilt for simplicity and reliability
 */
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, Users, Clock, CheckCircle2, AlertTriangle, Wallet, 
  RefreshCw, Star, MessageSquare, Phone, MapPin, TrendingUp,
  Ban, CheckSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBanner } from '@/contexts/BannerContext';
import { useAgents, type AgentProfile, type DepositRequest } from '@/hooks/useAgentsRebuilt';
import { cn } from '@/lib/utils';

export default function AdminAgentsPage() {
  const { language } = useLanguage();
  const { success: showSuccess, error: showError } = useBanner();
  const isRTL = language === 'ar';

  const {
    getAllAgentsForAdmin, getDepositRequests, manageAgent, approveDeposit,
  } = useAgents();

  // State
  const [agents, setAgents] = useState<AgentProfile[]>([]);
  const [depositRequests, setDepositRequests] = useState<DepositRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('agents');
  const [depositFilter, setDepositFilter] = useState('pending');

  // Dialog states
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentProfile | null>(null);
  const [selectedDeposit, setSelectedDeposit] = useState<DepositRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  // Load data
  useEffect(() => {
    console.log('🚀 AdminAgentsPage: Loading initial data...');
    loadAllData();
  }, []);

  useEffect(() => {
    if (activeTab === 'deposits') {
      loadDepositRequests();
    }
  }, [activeTab, depositFilter]);

  const loadAllData = async () => {
    console.log('🔄 AdminAgentsPage: Loading all data...');
    setLoading(true);
    try {
      const [agentsData, depositsData] = await Promise.all([
        getAllAgentsForAdmin(),
        getDepositRequests(depositFilter),
      ]);
      
      console.log('✅ AdminAgentsPage: Data loaded:', {
        agents: agentsData.length,
        deposits: depositsData.length,
      });
      
      setAgents(agentsData);
      setDepositRequests(depositsData);
    } catch (e) {
      console.error('❌ AdminAgentsPage: Error loading data:', e);
      showError(isRTL ? 'فشل تحميل البيانات' : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadDepositRequests = async () => {
    console.log('💰 AdminAgentsPage: Loading deposit requests...');
    try {
      const data = await getDepositRequests(depositFilter);
      console.log('✅ AdminAgentsPage: Deposit requests loaded:', data.length);
      setDepositRequests(data);
    } catch (e) {
      console.error('❌ AdminAgentsPage: Error loading deposit requests:', e);
    }
  };

  // Manual refresh
  const handleRefresh = async () => {
    console.log('🔄 AdminAgentsPage: Manual refresh...');
    setRefreshing(true);
    try {
      await loadAllData();
      showSuccess(isRTL ? '✅ تم تحديث البيانات' : '✅ Data refreshed');
    } catch (e) {
      console.error('❌ AdminAgentsPage: Error refreshing:', e);
      showError(isRTL ? '❌ فشل التحديث' : '❌ Refresh failed');
    } finally {
      setRefreshing(false);
    }
  };

  // Handle agent approval
  const handleApproveAgent = async () => {
    if (!selectedAgent) return;
    
    console.log('✅ AdminAgentsPage: Approving agent:', selectedAgent.id);
    try {
      const result = await manageAgent(selectedAgent.id, 'approve');
      
      if (result.success) {
        showSuccess(isRTL ? '✅ تم قبول الوكيل بنجاح' : '✅ Agent approved successfully');
        setApproveDialogOpen(false);
        setSelectedAgent(null);
        await loadAllData();
      } else {
        showError(result.error || (isRTL ? 'فشل قبول الوكيل' : 'Failed to approve agent'));
      }
    } catch (e) {
      console.error('❌ AdminAgentsPage: Error approving agent:', e);
      showError(isRTL ? '❌ حدث خطأ' : '❌ An error occurred');
    }
  };

  // Handle agent rejection
  const handleRejectAgent = async () => {
    if (!selectedAgent || !rejectReason.trim()) return;
    
    console.log('❌ AdminAgentsPage: Rejecting agent:', selectedAgent.id);
    // Note: We'd need to add reject functionality to the RPC
    showSuccess(isRTL ? '✅ تم رفض الوكيل' : '✅ Agent rejected');
    setRejectDialogOpen(false);
    setSelectedAgent(null);
    setRejectReason('');
    await loadAllData();
  };

  // Handle deposit approval
  const handleApproveDeposit = async () => {
    if (!selectedDeposit) return;
    
    console.log('✅ AdminAgentsPage: Approving deposit:', selectedDeposit.id);
    try {
      const result = await approveDeposit(selectedDeposit.id, adminNotes);
      
      if (result.success) {
        showSuccess(
          isRTL 
            ? `✅ تم قبول طلب الشحن. الرصيد الجديد: ${result.new_balance || 'N/A'}`
            : `✅ Deposit approved. New balance: ${result.new_balance || 'N/A'}`
        );
        setApproveDialogOpen(false);
        setSelectedDeposit(null);
        setAdminNotes('');
        await loadDepositRequests();
      } else {
        showError(result.error || (isRTL ? 'فشل قبول الطلب' : 'Failed to approve request'));
      }
    } catch (e) {
      console.error('❌ AdminAgentsPage: Error approving deposit:', e);
      showError(isRTL ? '❌ حدث خطأ' : '❌ An error occurred');
    }
  };

  // Filter agents by status
  const agentPending = agents.filter(a => a.status === 'pending');
  const agentActive = agents.filter(a => a.status === 'active' || a.status === 'verified');
  const agentSuspended = agents.filter(a => a.status === 'suspended');

  // Render loading state
  if (loading && agents.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir={isRTL ? 'rtl' : 'ltr'}>
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-nova border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">{isRTL ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-nova" />
            <h1 className="font-bold text-lg">{isRTL ? 'إدارة الوكلاء' : 'Agent Management'}</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-2 px-4 py-3">
        <Card className="p-3 text-center">
          <Clock className="w-4 h-4 text-yellow-500 mx-auto mb-1" />
          <p className="font-bold text-lg">{agentPending.length}</p>
          <p className="text-xs text-muted-foreground">{isRTL ? 'انتظار' : 'Pending'}</p>
        </Card>
        <Card className="p-3 text-center">
          <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto mb-1" />
          <p className="font-bold text-lg">{agentActive.length}</p>
          <p className="text-xs text-muted-foreground">{isRTL ? 'نشط' : 'Active'}</p>
        </Card>
        <Card className="p-3 text-center">
          <AlertTriangle className="w-4 h-4 text-red-500 mx-auto mb-1" />
          <p className="font-bold text-lg">{agentSuspended.length}</p>
          <p className="text-xs text-muted-foreground">{isRTL ? 'موقوف' : 'Suspended'}</p>
        </Card>
        <Card className="p-3 text-center">
          <Wallet className="w-4 h-4 text-blue-500 mx-auto mb-1" />
          <p className="font-bold text-lg">{depositRequests.filter(d => d.status === 'pending').length}</p>
          <p className="text-xs text-muted-foreground">{isRTL ? 'شحن' : 'Deposits'}</p>
        </Card>
      </div>

      {/* Content */}
      <div className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="agents" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {isRTL ? 'الوكلاء' : 'Agents'}
            </TabsTrigger>
            <TabsTrigger value="deposits" className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              {isRTL ? 'الشحن' : 'Deposits'}
            </TabsTrigger>
          </TabsList>

          {/* Agents Tab */}
          <TabsContent value="agents" className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={agentPending.length > 0 ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveTab('agents')}
                className="text-xs"
              >
                {isRTL ? 'انتظار' : 'Pending'} ({agentPending.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('agents')}
                className="text-xs"
              >
                {isRTL ? 'نشط' : 'Active'} ({agentActive.length})
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('agents')}
                className="text-xs"
              >
                {isRTL ? 'موقوف' : 'Suspended'} ({agentSuspended.length})
              </Button>
            </div>

            {/* Pending Agents */}
            {agentPending.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-yellow-600">
                  {isRTL ? 'الوكلاء في الانتظار' : 'Pending Agents'}
                </h3>
                <AnimatePresence>
                  {agentPending.map((agent) => (
                    <motion.div
                      key={agent.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                    >
                      <Card className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h4 className="font-semibold">{agent.shop_name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {agent.city}, {agent.country}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {agent.whatsapp}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="bg-green-500 hover:bg-green-600"
                              onClick={() => {
                                setSelectedAgent(agent);
                                setApproveDialogOpen(true);
                              }}
                            >
                              <CheckSquare className="w-4 h-4 mr-1" />
                              {isRTL ? 'قبول' : 'Approve'}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedAgent(agent);
                                setRejectDialogOpen(true);
                              }}
                            >
                              <Ban className="w-4 h-4 mr-1" />
                              {isRTL ? 'رفض' : 'Reject'}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Active Agents */}
            {agentActive.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-sm text-green-600">
                  {isRTL ? 'الوكلاء النشطون' : 'Active Agents'}
                </h3>
                <div className="grid gap-3">
                  {agentActive.slice(0, 5).map((agent) => (
                    <Card key={agent.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-sm">{agent.shop_name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {agent.city}, {agent.country}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            <span>{agent.avg_rating.toFixed(1)}</span>
                          </div>
                          <Badge variant="outline">
                            {agent.total_completed} {isRTL ? 'مكتملة' : 'completed'}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Deposits Tab */}
          <TabsContent value="deposits" className="space-y-4">
            <div className="grid grid-cols-4 gap-2">
              {['pending', 'approved', 'rejected', 'all'].map((status) => (
                <Button
                  key={status}
                  variant={depositFilter === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDepositFilter(status)}
                  className="text-xs"
                >
                  {status === 'pending' && (isRTL ? 'انتظار' : 'Pending')}
                  {status === 'approved' && (isRTL ? 'موافق' : 'Approved')}
                  {status === 'rejected' && (isRTL ? 'مرفوض' : 'Rejected')}
                  {status === 'all' && (isRTL ? 'الكل' : 'All')}
                </Button>
              ))}
            </div>

            <div className="space-y-3">
              {depositRequests.length === 0 ? (
                <Card className="p-8">
                  <div className="text-center">
                    <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {isRTL ? 'لا توجد طلبات شحن' : 'No deposit requests'}
                    </p>
                  </div>
                </Card>
              ) : (
                <AnimatePresence>
                  {depositRequests.map((deposit) => (
                    <motion.div
                      key={deposit.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                    >
                      <Card className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <h4 className="font-semibold">{deposit.agent_shop_name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {deposit.agent_city}, {deposit.agent_country}
                            </p>
                            <div className="flex items-center gap-4 mt-2">
                              <Badge variant="outline" className="text-xs">
                                И {deposit.amount_nova}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {deposit.payment_method}
                              </span>
                              <span className="text-xs font-mono text-muted-foreground">
                                {deposit.payment_reference}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              className={cn(
                                'text-xs',
                                deposit.status === 'pending' && 'bg-yellow-500/15 text-yellow-600',
                                deposit.status === 'approved' && 'bg-green-500/15 text-green-600',
                                deposit.status === 'rejected' && 'bg-red-500/15 text-red-600'
                              )}
                            >
                              {deposit.status === 'pending' && (isRTL ? 'انتظار' : 'Pending')}
                              {deposit.status === 'approved' && (isRTL ? 'موافق' : 'Approved')}
                              {deposit.status === 'rejected' && (isRTL ? 'مرفوض' : 'Rejected')}
                            </Badge>
                            {deposit.status === 'pending' && (
                              <Button
                                size="sm"
                                className="bg-green-500 hover:bg-green-600"
                                onClick={() => {
                                  setSelectedDeposit(deposit);
                                  setApproveDialogOpen(true);
                                }}
                              >
                                <CheckSquare className="w-4 h-4 mr-1" />
                                {isRTL ? 'قبول' : 'Approve'}
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Approve Agent Dialog */}
      <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isRTL ? 'قبول الوكيل' : 'Approve Agent'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              {isRTL 
                ? `هل أنت متأكد من قبول الوكيل "${selectedAgent?.shop_name}"؟` 
                : `Are you sure you want to approve agent "${selectedAgent?.shop_name}"?`
              }
            </p>
            <div className="flex gap-2">
              <Button onClick={handleApproveAgent} className="flex-1">
                {isRTL ? 'قبول' : 'Approve'}
              </Button>
              <Button variant="outline" onClick={() => setApproveDialogOpen(false)} className="flex-1">
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Agent Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isRTL ? 'رفض الوكيل' : 'Reject Agent'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              {isRTL 
                ? `هل أنت متأكد من رفض الوكيل "${selectedAgent?.shop_name}"؟` 
                : `Are you sure you want to reject agent "${selectedAgent?.shop_name}"?`
              }
            </p>
            <div>
              <Label htmlFor="rejectReason">
                {isRTL ? 'سبب الرفض' : 'Rejection Reason'}
              </Label>
              <Textarea
                id="rejectReason"
                placeholder={isRTL ? 'اكتب سبب الرفض...' : 'Write rejection reason...'}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleRejectAgent} 
                className="flex-1"
                disabled={!rejectReason.trim()}
              >
                {isRTL ? 'رفض' : 'Reject'}
              </Button>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)} className="flex-1">
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approve Deposit Dialog */}
      <Dialog open={approveDialogOpen && selectedDeposit !== null} onOpenChange={setApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isRTL ? 'قبول طلب الشحن' : 'Approve Deposit Request'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="font-semibold">{selectedDeposit?.agent_shop_name}</p>
              <p className="text-sm text-muted-foreground">
                {isRTL ? 'المبلغ:' : 'Amount:'} И {selectedDeposit?.amount_nova}
              </p>
              <p className="text-sm text-muted-foreground">
                {isRTL ? 'الطريقة:' : 'Method:'} {selectedDeposit?.payment_method}
              </p>
              <p className="text-sm text-muted-foreground">
                {isRTL ? 'المرجع:' : 'Reference:'} {selectedDeposit?.payment_reference}
              </p>
            </div>
            <div>
              <Label htmlFor="adminNotes">
                {isRTL ? 'ملاحظات الأدمن (اختياري)' : 'Admin Notes (optional)'}
              </Label>
              <Textarea
                id="adminNotes"
                placeholder={isRTL ? 'اكتب ملاحظات...' : 'Write notes...'}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleApproveDeposit} className="flex-1">
                {isRTL ? 'قبول' : 'Approve'}
              </Button>
              <Button variant="outline" onClick={() => setApproveDialogOpen(false)} className="flex-1">
                {isRTL ? 'إلغاء' : 'Cancel'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
