import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  RefreshCcw,
  History,
  ShieldAlert,
  Wallet,
  UserCog,
  Snowflake,
  DollarSign,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  performed_by: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  performer?: {
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
  };
}

interface AIProposal {
  id: string;
  title: string;
  title_ar: string | null;
  description: string;
  status: string;
  priority: string;
  proposed_by: string | null;
  created_at: string;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  freeze_wallet: <Snowflake className="w-4 h-4 text-blue-500" />,
  unfreeze_wallet: <Snowflake className="w-4 h-4 text-green-500" />,
  add_nova: <Wallet className="w-4 h-4 text-green-500" />,
  deduct_nova: <Wallet className="w-4 h-4 text-red-500" />,
  role_assigned: <UserCog className="w-4 h-4 text-purple-500" />,
  role_removed: <UserCog className="w-4 h-4 text-orange-500" />,
  price_update: <DollarSign className="w-4 h-4 text-amber-500" />,
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-600',
  high: 'bg-orange-500/20 text-orange-600',
  medium: 'bg-amber-500/20 text-amber-600',
  low: 'bg-blue-500/20 text-blue-600',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/20 text-amber-600',
  approved: 'bg-green-500/20 text-green-600',
  rejected: 'bg-red-500/20 text-red-600',
  implemented: 'bg-blue-500/20 text-blue-600',
};

export default function AdminChangeRequests() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [proposals, setProposals] = useState<AIProposal[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [isLoadingProposals, setIsLoadingProposals] = useState(true);

  const fetchAuditLogs = async () => {
    setIsLoadingLogs(true);
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (data) {
      // Fetch performer profiles
      const performerIds = [...new Set(data.map(l => l.performed_by))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url')
        .in('id', performerIds);

      const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

      setAuditLogs(data.map(log => ({
        ...log,
        old_value: log.old_value as Record<string, unknown> | null,
        new_value: log.new_value as Record<string, unknown> | null,
        metadata: log.metadata as Record<string, unknown> | null,
        performer: profileMap[log.performed_by],
      })));
    }
    setIsLoadingLogs(false);
  };

  const fetchProposals = async () => {
    setIsLoadingProposals(true);
    const { data } = await supabase
      .from('ai_proposals')
      .select('id, title, title_ar, description, status, priority, proposed_by, created_at')
      .order('created_at', { ascending: false })
      .limit(30);

    if (data) setProposals(data as AIProposal[]);
    setIsLoadingProposals(false);
  };

  useEffect(() => {
    fetchAuditLogs();
    fetchProposals();
  }, []);

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), isRTL ? 'dd MMM yyyy - HH:mm' : 'MMM dd, yyyy - HH:mm', {
      locale: isRTL ? arSA : undefined,
    });
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, { en: string; ar: string }> = {
      freeze_wallet: { en: 'Wallet Frozen', ar: 'تجميد محفظة' },
      unfreeze_wallet: { en: 'Wallet Unfrozen', ar: 'إلغاء تجميد محفظة' },
      add_nova: { en: 'Nova Added', ar: 'إضافة نوفا' },
      deduct_nova: { en: 'Nova Deducted', ar: 'خصم نوفا' },
      role_assigned: { en: 'Role Assigned', ar: 'تعيين دور' },
      role_removed: { en: 'Role Removed', ar: 'إزالة دور' },
      price_update: { en: 'Price Updated', ar: 'تحديث سعر' },
      admin_adjust: { en: 'Balance Adjusted', ar: 'تعديل الرصيد' },
    };
    return (isRTL ? labels[action]?.ar : labels[action]?.en) || action;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <InnerPageHeader
        title={isRTL ? 'سجل التغييرات والطلبات' : 'Change Requests & Audit Log'}
      />

      <div className="flex-1 p-4 overflow-y-auto pb-20">
        <Tabs defaultValue="audit">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="audit" className="flex-1 text-xs">
              <History className="w-3 h-3 me-1" />
              {isRTL ? 'سجل الإجراءات' : 'Audit Log'}
            </TabsTrigger>
            <TabsTrigger value="proposals" className="flex-1 text-xs">
              <ShieldAlert className="w-3 h-3 me-1" />
              {isRTL ? 'مقترحات النظام' : 'AI Proposals'}
            </TabsTrigger>
          </TabsList>

          {/* Audit Log Tab */}
          <TabsContent value="audit" className="space-y-3">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={fetchAuditLogs} disabled={isLoadingLogs}>
                <RefreshCcw className={`w-4 h-4 me-1 ${isLoadingLogs ? 'animate-spin' : ''}`} />
                {isRTL ? 'تحديث' : 'Refresh'}
              </Button>
            </div>

            {isLoadingLogs ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))}
              </div>
            ) : auditLogs.length === 0 ? (
              <Card className="p-8 text-center">
                <History className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">
                  {isRTL ? 'لا يوجد سجلات حتى الآن' : 'No audit logs yet'}
                </p>
              </Card>
            ) : (
              auditLogs.map(log => (
                <Card key={log.id} className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                      {ACTION_ICONS[log.action] || <Clock className="w-4 h-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{getActionLabel(log.action)}</span>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {log.entity_type}
                        </Badge>
                      </div>

                      {/* Performer */}
                      <div className="flex items-center gap-1.5 mt-1">
                        <Avatar className="w-4 h-4">
                          <AvatarImage src={log.performer?.avatar_url || ''} />
                          <AvatarFallback className="text-[8px]">
                            {log.performer?.full_name?.[0] || 'A'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground">
                          {log.performer?.full_name || log.performer?.username || log.performed_by.slice(0, 8)}
                        </span>
                      </div>

                      {/* Metadata */}
                      {log.metadata && typeof log.metadata === 'object' && (
                        <div className="mt-1 text-xs text-muted-foreground bg-muted/50 rounded p-1.5">
                          {Object.entries(log.metadata).slice(0, 3).map(([k, v]) => (
                            <span key={k} className="me-2">
                              <span className="opacity-60">{k}:</span> {String(v)}
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDate(log.created_at)}
                      </p>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          {/* AI Proposals Tab */}
          <TabsContent value="proposals" className="space-y-3">
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={fetchProposals} disabled={isLoadingProposals}>
                <RefreshCcw className={`w-4 h-4 me-1 ${isLoadingProposals ? 'animate-spin' : ''}`} />
                {isRTL ? 'تحديث' : 'Refresh'}
              </Button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-2">
              {(['pending', 'approved', 'rejected'] as const).map(status => {
                const count = proposals.filter(p => p.status === status).length;
                const icons = {
                  pending: <Clock className="w-3 h-3" />,
                  approved: <CheckCircle className="w-3 h-3" />,
                  rejected: <XCircle className="w-3 h-3" />,
                };
                const labels = {
                  pending: { en: 'Pending', ar: 'قيد الانتظار' },
                  approved: { en: 'Approved', ar: 'موافق عليها' },
                  rejected: { en: 'Rejected', ar: 'مرفوضة' },
                };
                return (
                  <Card key={status} className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <span className={STATUS_COLORS[status].split(' ')[1]}>{icons[status]}</span>
                    </div>
                    <p className="text-xl font-bold">{count}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {isRTL ? labels[status].ar : labels[status].en}
                    </p>
                  </Card>
                );
              })}
            </div>

            {isLoadingProposals ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-lg" />
                ))}
              </div>
            ) : proposals.length === 0 ? (
              <Card className="p-8 text-center">
                <ShieldAlert className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">
                  {isRTL ? 'لا يوجد مقترحات' : 'No proposals yet'}
                </p>
              </Card>
            ) : (
              proposals.map(proposal => (
                <Card key={proposal.id} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge className={`text-[10px] ${PRIORITY_COLORS[proposal.priority] || 'bg-muted text-muted-foreground'}`}>
                          {proposal.priority}
                        </Badge>
                        <Badge className={`text-[10px] ${STATUS_COLORS[proposal.status] || 'bg-muted text-muted-foreground'}`}>
                          {proposal.status}
                        </Badge>
                      </div>
                      <p className="font-medium text-sm line-clamp-1">
                        {isRTL ? (proposal.title_ar || proposal.title) : proposal.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {proposal.description}
                      </p>
                      {proposal.proposed_by && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {isRTL ? 'بواسطة:' : 'By:'} {proposal.proposed_by}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {formatDate(proposal.created_at)}
                  </p>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
