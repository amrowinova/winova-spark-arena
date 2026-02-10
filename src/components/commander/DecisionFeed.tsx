import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useDecisionFeed, useGovernanceAction } from '@/hooks/useCommander';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, Clock, Search, ChevronDown, ChevronUp, Shield, Undo2 } from 'lucide-react';

const TIER_CONFIG: Record<number, { label: string; labelAr: string; color: string }> = {
  0: { label: 'Auto', labelAr: 'تلقائي', color: 'bg-success/10 text-success border-success/30' },
  1: { label: 'Inform', labelAr: 'إعلام', color: 'bg-muted text-muted-foreground border-border' },
  2: { label: 'Approval Required', labelAr: 'يتطلب موافقة', color: 'bg-warning/10 text-warning border-warning/30' },
  3: { label: 'CEO Decision', labelAr: 'قرار المالك', color: 'bg-destructive/10 text-destructive border-destructive/30' },
};

const REC_CONFIG: Record<string, { icon: React.ReactNode; label: string; labelAr: string }> = {
  approve: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: 'Approve', labelAr: 'موافقة' },
  reject: { icon: <XCircle className="h-3.5 w-3.5" />, label: 'Reject', labelAr: 'رفض' },
  investigate: { icon: <Search className="h-3.5 w-3.5" />, label: 'Investigate', labelAr: 'تحقيق' },
  defer: { icon: <Clock className="h-3.5 w-3.5" />, label: 'Defer', labelAr: 'تأجيل' },
};

export function DecisionFeed() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const { data: items = [], isLoading } = useDecisionFeed();
  const governance = useGovernanceAction();
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'decided'>('pending');

  const filtered = items.filter(item => {
    if (filter === 'pending') return item.status === 'pending';
    if (filter === 'decided') return item.status !== 'pending';
    return true;
  });

  // Sort: highest impact × lowest confidence gap first
  const sorted = [...filtered].sort((a, b) => {
    if (a.status === 'pending' && b.status !== 'pending') return -1;
    if (b.status === 'pending' && a.status !== 'pending') return 1;
    const scoreA = a.riskTier * 100 + (100 - a.confidence);
    const scoreB = b.riskTier * 100 + (100 - b.confidence);
    return scoreB - scoreA;
  });

  const handleAction = (proposalId: string, action: 'approved' | 'rejected' | 'deferred') => {
    governance.mutate({ proposalId, action }, {
      onSuccess: () => {
        toast({
          title: isAr ? 'تم التنفيذ' : 'Action completed',
          description: isAr ? 'تم تسجيل قرارك' : 'Your decision has been recorded',
        });
      },
      onError: (err: Error) => {
        toast({ title: isAr ? 'خطأ' : 'Error', description: err.message, variant: 'destructive' });
      },
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            {isAr ? 'قرارات تنتظرك' : 'Decision Queue'}
            {filtered.filter(i => i.status === 'pending').length > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                {filtered.filter(i => i.status === 'pending').length}
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-1">
            {(['pending', 'all', 'decided'] as const).map(f => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'ghost'}
                size="sm"
                className="text-[10px] h-7 px-2"
                onClick={() => setFilter(f)}
              >
                {f === 'pending' ? (isAr ? 'معلق' : 'Pending') : f === 'all' ? (isAr ? 'الكل' : 'All') : (isAr ? 'مقرر' : 'Decided')}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">{isAr ? 'جاري التحميل...' : 'Loading...'}</p>
        ) : sorted.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success/40" />
            <p className="text-sm text-muted-foreground">
              {isAr ? 'لا توجد قرارات معلقة' : 'No pending decisions'}
            </p>
          </div>
        ) : (
          sorted.slice(0, 20).map(item => {
            const tier = TIER_CONFIG[item.riskTier] || TIER_CONFIG[1];
            const rec = REC_CONFIG[item.recommendation] || REC_CONFIG.defer;
            const isExpanded = expandedId === item.id;

            return (
              <div key={item.id} className={`rounded-lg border p-3 transition-colors ${item.status === 'pending' ? 'bg-card' : 'bg-muted/30 opacity-70'}`}>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0" onClick={() => setExpandedId(isExpanded ? null : item.id)} role="button">
                    <p className="text-sm font-medium leading-tight">
                      {isAr ? (item.titleAr || item.title) : item.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                      {isAr ? (item.descriptionAr || item.description) : item.description}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => setExpandedId(isExpanded ? null : item.id)}>
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </Button>
                </div>

                {/* Metadata row */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  <Badge variant="outline" className={`text-[9px] ${tier.color}`}>
                    T{item.riskTier} · {isAr ? tier.labelAr : tier.label}
                  </Badge>
                  <Badge variant="outline" className="text-[9px]">
                    {item.confidence}% {isAr ? 'ثقة' : 'confidence'}
                  </Badge>
                  {item.isReversible && (
                    <Badge variant="outline" className="text-[9px] text-success border-success/30">
                      <Undo2 className="h-2.5 w-2.5 me-0.5" />
                      {isAr ? 'قابل للتراجع' : 'Reversible'}
                    </Badge>
                  )}
                  {item.isFinancial && (
                    <Badge variant="destructive" className="text-[9px]">
                      {isAr ? '💰 مالي' : '💰 Financial'}
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-[9px] ms-auto">
                    {rec.icon} <span className="ms-0.5">{isAr ? rec.labelAr : rec.label}</span>
                  </Badge>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="mt-3 space-y-2">
                    <Separator />
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-muted-foreground">{isAr ? 'المنطقة المتأثرة' : 'Affected Area'}</span>
                        <p className="font-medium">{item.affectedArea || (isAr ? 'عام' : 'General')}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{isAr ? 'نوع العملية' : 'Type'}</span>
                        <p className="font-medium">{item.proposalType}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{isAr ? 'الجهد المقدر' : 'Effort'}</span>
                        <p className="font-medium">{item.estimatedEffort || (isAr ? 'غير محدد' : 'Unknown')}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{isAr ? 'نطاق التأثير' : 'Impact Scope'}</span>
                        <p className="font-medium">{item.impactScope || (isAr ? 'غير محدد' : 'Unknown')}</p>
                      </div>
                    </div>
                    {item.rollbackPlan && (
                      <div className="text-[11px]">
                        <span className="text-muted-foreground">{isAr ? 'خطة التراجع' : 'Rollback Plan'}</span>
                        <p className="font-medium mt-0.5">{item.rollbackPlan}</p>
                      </div>
                    )}

                    {/* Action buttons for pending items */}
                    {item.status === 'pending' && (
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" className="text-xs h-8 flex-1" onClick={() => handleAction(item.id, 'approved')} disabled={governance.isPending}>
                          <CheckCircle2 className="h-3.5 w-3.5 me-1" />
                          {isAr ? 'موافقة' : 'Approve'}
                        </Button>
                        <Button size="sm" variant="destructive" className="text-xs h-8 flex-1" onClick={() => handleAction(item.id, 'rejected')} disabled={governance.isPending}>
                          <XCircle className="h-3.5 w-3.5 me-1" />
                          {isAr ? 'رفض' : 'Reject'}
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => handleAction(item.id, 'deferred')} disabled={governance.isPending}>
                          <Clock className="h-3.5 w-3.5 me-1" />
                          {isAr ? 'تأجيل' : 'Defer'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
