import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useDecisionFeed, useGovernanceAction } from '@/hooks/useCommander';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle2, XCircle, Clock, Search, ChevronDown, ChevronUp, Shield, Undo2, AlertTriangle, TrendingUp, Target } from 'lucide-react';

const TIER_CONFIG: Record<number, { label: string; labelAr: string; color: string }> = {
  0: { label: 'Auto-Handled', labelAr: 'تلقائي', color: 'bg-success/10 text-success border-success/30' },
  1: { label: 'Informational', labelAr: 'إعلامي', color: 'bg-muted text-muted-foreground border-border' },
  2: { label: 'Approval Required', labelAr: 'يتطلب موافقة', color: 'bg-warning/10 text-warning border-warning/30' },
  3: { label: 'CEO Decision Required', labelAr: 'قرار المالك مطلوب', color: 'bg-destructive/10 text-destructive border-destructive/30' },
};

const REC_CONFIG: Record<string, { icon: React.ReactNode; label: string; labelAr: string }> = {
  approve: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: 'Approve', labelAr: 'موافقة' },
  reject: { icon: <XCircle className="h-3.5 w-3.5" />, label: 'Reject', labelAr: 'رفض' },
  investigate: { icon: <Search className="h-3.5 w-3.5" />, label: 'Investigate', labelAr: 'تحقيق' },
  defer: { icon: <Clock className="h-3.5 w-3.5" />, label: 'Defer', labelAr: 'تأجيل' },
};

/** Generate an executive-grade impact statement from raw proposal data */
function generateImpactStatement(item: any, isAr: boolean): string {
  const parts: string[] = [];

  if (item.isFinancial) {
    parts.push(isAr
      ? '⚠️ عملية مالية — أي خطأ قد يؤثر على أرصدة المستخدمين'
      : '⚠️ Financial operation — errors may impact user balances');
  }

  if (item.riskTier >= 3) {
    parts.push(isAr
      ? 'مستوى خطورة حرج — يتطلب قرارك الشخصي قبل التنفيذ'
      : 'Critical risk level — requires your personal decision before execution');
  } else if (item.riskTier === 2) {
    parts.push(isAr
      ? 'مستوى خطورة متوسط — موافقة مطلوبة'
      : 'Moderate risk level — approval required');
  }

  if (item.confidence < 50) {
    parts.push(isAr
      ? `الثقة منخفضة (${item.confidence}%) — البيانات غير كافية لاتخاذ قرار تلقائي`
      : `Low confidence (${item.confidence}%) — insufficient data for autonomous action`);
  }

  return parts.join('. ') || (isAr ? 'عملية روتينية بمخاطر منخفضة' : 'Routine operation with low risk');
}

/** Explain what drives the confidence score and what would raise it */
function getConfidenceBreakdown(item: any, isAr: boolean): { factor: string; status: 'met' | 'unmet' }[] {
  return [
    {
      factor: isAr ? 'خطة تراجع متوفرة' : 'Rollback plan available',
      status: item.isReversible ? 'met' : 'unmet',
    },
    {
      factor: isAr ? 'مستوى خطورة منخفض' : 'Low risk classification',
      status: item.riskTier <= 1 ? 'met' : 'unmet',
    },
    {
      factor: isAr ? 'نطاق تأثير محدود' : 'Limited impact scope',
      status: item.impactScope === 'single_user' || item.impactScope === 'component' ? 'met' : 'unmet',
    },
    {
      factor: isAr ? 'لا تشمل عمليات مالية' : 'No financial operations involved',
      status: !item.isFinancial ? 'met' : 'unmet',
    },
    {
      factor: isAr ? 'جهد تنفيذ بسيط' : 'Simple execution effort',
      status: item.estimatedEffort === 'small' || item.estimatedEffort === 'trivial' ? 'met' : 'unmet',
    },
  ];
}

/** Derive the recommended action rationale */
function getRecommendationRationale(item: any, isAr: boolean): string {
  if (item.recommendation === 'approve' && item.confidence >= 80) {
    return isAr
      ? 'الثقة عالية مع مخاطر منخفضة. التوصية بالموافقة.'
      : 'High confidence with low risk. Recommendation: approve.';
  }
  if (item.recommendation === 'investigate') {
    return isAr
      ? `الثقة ${item.confidence}% غير كافية أو المخاطر مرتفعة. يلزم تحقيق إضافي.`
      : `${item.confidence}% confidence insufficient or risk elevated. Additional investigation needed.`;
  }
  if (item.recommendation === 'reject') {
    return isAr ? 'مرفوض سابقاً أو مخاطر تفوق الفائدة.' : 'Previously rejected or risks outweigh benefits.';
  }
  return isAr ? 'بيانات غير كافية لتقديم توصية حاسمة. التأجيل مقترح.' : 'Insufficient data for a definitive recommendation. Deferral suggested.';
}

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
          title: isAr ? 'تم التنفيذ' : 'Decision recorded',
          description: isAr ? 'تم تسجيل قرارك وتحديث نموذج التعلم' : 'Your decision has been logged and fed into the learning model',
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
            const impactStatement = generateImpactStatement(item, isAr);
            const confidenceFactors = getConfidenceBreakdown(item, isAr);
            const rationale = getRecommendationRationale(item, isAr);

            return (
              <div key={item.id} className={`rounded-lg border p-3 transition-colors ${item.status === 'pending' ? 'bg-card' : 'bg-muted/30 opacity-70'}`}>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0" onClick={() => setExpandedId(isExpanded ? null : item.id)} role="button">
                    <p className="text-sm font-medium leading-tight">
                      {isAr ? (item.titleAr || item.title) : item.title}
                    </p>
                    {/* Executive Impact Statement — replaces raw description */}
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {impactStatement}
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

                {/* Expanded detail — Executive Intelligence */}
                {isExpanded && (
                  <div className="mt-3 space-y-3">
                    <Separator />

                    {/* Recommendation Rationale */}
                    <div className="rounded-lg border bg-primary/5 p-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Target className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[10px] font-semibold text-primary">
                          {isAr ? 'التوصية التنفيذية' : 'Executive Recommendation'}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed">{rationale}</p>
                    </div>

                    {/* Confidence Transparency */}
                    <div className="rounded-lg border p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-[10px] font-semibold">
                          {isAr ? `تفصيل الثقة — ${item.confidence}%` : `Confidence Breakdown — ${item.confidence}%`}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {confidenceFactors.map((f, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-[10px]">
                            {f.status === 'met'
                              ? <CheckCircle2 className="h-3 w-3 text-success shrink-0" />
                              : <AlertTriangle className="h-3 w-3 text-warning shrink-0" />}
                            <span className={f.status === 'met' ? 'text-muted-foreground' : ''}>
                              {f.factor}
                            </span>
                          </div>
                        ))}
                      </div>
                      {item.confidence < 80 && (
                        <p className="text-[10px] text-muted-foreground mt-2 border-t pt-2">
                          {isAr
                            ? `لرفع الثقة إلى 80%+: عالج العناصر المعلّقة أعلاه (${confidenceFactors.filter(f => f.status === 'unmet').length} عنصر)`
                            : `To reach 80%+: address ${confidenceFactors.filter(f => f.status === 'unmet').length} unmet factor(s) above`}
                        </p>
                      )}
                    </div>

                    {/* Original Details Grid */}
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

                    {/* Full description (original technical detail) */}
                    {item.description && (
                      <div className="text-[11px] border-t pt-2">
                        <span className="text-muted-foreground">{isAr ? 'التفاصيل الفنية' : 'Technical Detail'}</span>
                        <p className="mt-0.5 whitespace-pre-line leading-relaxed">
                          {isAr ? (item.descriptionAr || item.description) : item.description}
                        </p>
                      </div>
                    )}

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
