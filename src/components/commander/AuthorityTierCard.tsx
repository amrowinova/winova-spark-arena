import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuthorityTier } from '@/hooks/useAuthorityTier';
import { Shield, ChevronUp, ChevronDown, Lock, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

const TIER_COLORS = [
  'text-muted-foreground',   // L0
  'text-blue-500',           // L1
  'text-primary',            // L2
  'text-amber-500',          // L3
  'text-green-500',          // L4
];

export function AuthorityTierCard() {
  const { language } = useLanguage();
  const isAr = language === 'ar';
  const {
    currentLevel, currentDef, nextDef, nextRequirements,
    elevationRisk, metrics, history, promote, isLoading, state,
  } = useAuthorityTier();

  if (isLoading) {
    return (
      <Card className="border-primary/20">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">{isAr ? 'جاري التحميل...' : 'Loading...'}</p>
        </CardContent>
      </Card>
    );
  }

  const handlePromote = () => {
    if (!nextRequirements?.isEligible) {
      toast.error(isAr ? 'لم تُستوفَ المتطلبات بعد' : 'Requirements not met yet');
      return;
    }
    promote.mutate({}, {
      onSuccess: () => toast.success(isAr ? `تمت الترقية إلى المستوى ${currentLevel + 1}` : `Promoted to L${currentLevel + 1}`),
      onError: () => toast.error(isAr ? 'فشلت الترقية' : 'Promotion failed'),
    });
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-primary" />
            {isAr ? 'مستوى الصلاحية' : 'Authority Level'}
          </CardTitle>
          <Badge variant={currentLevel >= 3 ? 'default' : 'secondary'} className="text-xs">
            L{currentLevel} — {isAr ? currentDef.nameAr : currentDef.name}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Level Visual */}
        <div className="flex items-center gap-2">
          {[0, 1, 2, 3, 4].map((lvl) => (
            <div
              key={lvl}
              className={`flex-1 h-2 rounded-full transition-colors ${
                lvl <= currentLevel ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Why this level */}
        <div className="rounded-lg border bg-card p-3">
          <p className="text-[10px] text-muted-foreground mb-1">{isAr ? 'سبب المستوى الحالي' : 'Why this level'}</p>
          <p className="text-xs">{state?.reason || (isAr ? 'لم تُكتسب صلاحية بعد' : 'No autonomy earned yet')}</p>
        </div>

        {/* Current Metrics Driving Authority */}
        <div className="grid grid-cols-2 gap-2">
          <MetricPill
            label={isAr ? 'الدقة' : 'Accuracy'}
            value={`${metrics.accuracy}%`}
            icon={<TrendingUp className="h-3 w-3" />}
          />
          <MetricPill
            label={isAr ? 'التراجعات' : 'Reversals'}
            value={`${metrics.reversalRate}%`}
            icon={<ChevronDown className="h-3 w-3" />}
            warn={metrics.reversalRate > 5}
          />
          <MetricPill
            label={isAr ? 'القرارات' : 'Decisions'}
            value={String(metrics.totalPredictions)}
            icon={<CheckCircle2 className="h-3 w-3" />}
          />
          <MetricPill
            label={isAr ? 'التطابق' : 'Similarity'}
            value={`${metrics.confidence}%`}
            icon={<Shield className="h-3 w-3" />}
          />
        </div>

        {/* Next Level Requirements */}
        {nextDef && nextRequirements && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-xs font-medium flex items-center gap-1.5">
              <ChevronUp className="h-3.5 w-3.5 text-primary" />
              {isAr
                ? `المطلوب للمستوى ${nextDef.level} — ${nextDef.nameAr}`
                : `Required for L${nextDef.level} — ${nextDef.name}`}
            </p>

            <RequirementRow
              label={isAr ? `دقة ≥ ${nextDef.minAccuracy}%` : `Accuracy ≥ ${nextDef.minAccuracy}%`}
              progress={nextRequirements.accuracyProgress}
              met={nextRequirements.accuracyMet}
            />
            <RequirementRow
              label={isAr ? `تراجعات ≤ ${nextDef.maxReversalRate}%` : `Reversals ≤ ${nextDef.maxReversalRate}%`}
              progress={nextRequirements.reversalProgress}
              met={nextRequirements.reversalMet}
            />
            <RequirementRow
              label={isAr ? `قرارات ≥ ${nextDef.minPredictions}` : `Decisions ≥ ${nextDef.minPredictions}`}
              progress={nextRequirements.predictionsProgress}
              met={nextRequirements.predictionsMet}
            />

            {/* Risk Warning */}
            {elevationRisk !== 'low' && (
              <div className={`flex items-center gap-1.5 text-[10px] mt-1 ${
                elevationRisk === 'high' ? 'text-destructive' : 'text-warning'
              }`}>
                <AlertTriangle className="h-3 w-3" />
                {isAr
                  ? `مخاطر الترقية: ${elevationRisk === 'high' ? 'عالية' : 'متوسطة'}`
                  : `Elevation risk: ${elevationRisk}`}
              </div>
            )}

            {/* Promote Button */}
            <Button
              size="sm"
              className="w-full mt-2"
              disabled={!nextRequirements.isEligible || promote.isPending}
              onClick={handlePromote}
            >
              {promote.isPending
                ? (isAr ? 'جاري الترقية...' : 'Promoting...')
                : nextRequirements.isEligible
                  ? (isAr ? `الموافقة على الترقية إلى المستوى ${nextDef.level}` : `Approve Elevation to L${nextDef.level}`)
                  : (isAr ? 'المتطلبات غير مستوفاة' : 'Requirements Not Met')}
            </Button>
          </div>
        )}

        {/* Financial Lock Notice */}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground border-t pt-2">
          <Lock className="h-3 w-3" />
          {isAr
            ? 'العمليات المالية والأمنية تتطلب دائماً موافقة المدير — بغض النظر عن المستوى'
            : 'Financial & security operations always require CEO approval — regardless of level'}
        </div>

        {/* Recent History */}
        {history.length > 0 && (
          <div className="border-t pt-2">
            <p className="text-[10px] text-muted-foreground mb-1.5">{isAr ? 'آخر التغييرات' : 'Recent Changes'}</p>
            {history.slice(0, 3).map((h: any) => (
              <div key={h.id} className="flex items-center justify-between text-[10px] py-0.5">
                <span className="flex items-center gap-1">
                  {h.action === 'promotion'
                    ? <ChevronUp className="h-3 w-3 text-green-500" />
                    : <ChevronDown className="h-3 w-3 text-destructive" />}
                  L{h.from_level} → L{h.to_level}
                </span>
                <span className="text-muted-foreground">{new Date(h.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricPill({ label, value, icon, warn }: {
  label: string; value: string; icon: React.ReactNode; warn?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-2 ${warn ? 'border-destructive/30 bg-destructive/5' : 'bg-card'}`}>
      <div className="flex items-center gap-1 mb-0.5">{icon}<span className="text-[9px] text-muted-foreground">{label}</span></div>
      <span className="text-sm font-bold">{value}</span>
    </div>
  );
}

function RequirementRow({ label, progress, met }: { label: string; progress: number; met: boolean }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-[10px]">
        <span className={met ? 'text-green-500' : 'text-muted-foreground'}>{label}</span>
        {met ? <CheckCircle2 className="h-3 w-3 text-green-500" /> : <span>{progress}%</span>}
      </div>
      <Progress value={progress} className="h-1" />
    </div>
  );
}
