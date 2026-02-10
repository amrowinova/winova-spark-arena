import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { Shield } from 'lucide-react';

const TIERS = [
  {
    tier: 0,
    label: 'Auto Execute',
    labelAr: 'تنفيذ تلقائي',
    desc: 'High confidence, low risk, reversible. CEO is notified after completion.',
    descAr: 'ثقة عالية، مخاطر منخفضة، قابل للتراجع. يتم إبلاغ المالك بعد الإتمام.',
    color: 'bg-success/10 text-success border-success/30',
  },
  {
    tier: 1,
    label: 'Recommend',
    labelAr: 'توصية',
    desc: 'Moderate confidence. Visible in briefing. No blocking required.',
    descAr: 'ثقة متوسطة. يظهر في الملخص. لا يتطلب انتظار.',
    color: 'bg-muted text-muted-foreground border-border',
  },
  {
    tier: 2,
    label: 'CEO Approval',
    labelAr: 'موافقة المالك',
    desc: 'Higher risk or lower confidence. Requires explicit approval toggle.',
    descAr: 'مخاطر أعلى أو ثقة أقل. يتطلب موافقة صريحة.',
    color: 'bg-warning/10 text-warning border-warning/30',
  },
  {
    tier: 3,
    label: 'Mandatory Decision',
    labelAr: 'قرار إلزامي',
    desc: 'Critical risk, financial, legal, or permissions. Cannot proceed without CEO decision.',
    descAr: 'مخاطر حرجة، مالي، قانوني، أو صلاحيات. لا يمكن المتابعة بدون قرار المالك.',
    color: 'bg-destructive/10 text-destructive border-destructive/30',
  },
];

export function GovernanceTierLegend() {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          {isAr ? 'مستويات الحوكمة' : 'Governance Tiers'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {TIERS.map(t => (
          <div key={t.tier} className={`rounded-lg border p-2.5 ${t.color}`}>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[9px] font-bold">T{t.tier}</Badge>
              <span className="text-xs font-semibold">{isAr ? t.labelAr : t.label}</span>
            </div>
            <p className="text-[10px] mt-1 opacity-80">{isAr ? t.descAr : t.desc}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
