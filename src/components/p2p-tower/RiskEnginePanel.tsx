import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { AlertTriangle, ShieldAlert, Ban, RefreshCcw } from 'lucide-react';
import type { P2PRiskAnomaly } from '@/hooks/useP2PControlTower';

interface Props {
  anomalies: P2PRiskAnomaly[];
  loading: boolean;
}

const severityConfig: Record<string, { color: string; bg: string; icon: any }> = {
  critical: { color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/30', icon: ShieldAlert },
  high: { color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/30', icon: AlertTriangle },
  medium: { color: 'text-amber-500', bg: 'bg-amber-500/10 border-amber-500/30', icon: Ban },
};

export function RiskEnginePanel({ anomalies, loading }: Props) {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const criticalCount = anomalies.filter(a => a.severity === 'critical').length;
  const highCount = anomalies.filter(a => a.severity === 'high').length;

  return (
    <Card className={`p-4 ${criticalCount > 0 ? 'border-destructive/50' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <ShieldAlert className={`w-4 h-4 ${criticalCount > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
          {isAr ? 'محرك المخاطر' : 'Risk Engine'}
        </h3>
        <div className="flex gap-1">
          {criticalCount > 0 && <Badge variant="destructive" className="text-[10px]">{criticalCount} CRITICAL</Badge>}
          {highCount > 0 && <Badge className="text-[10px] bg-orange-500/10 text-orange-500">{highCount} HIGH</Badge>}
          {anomalies.length === 0 && <Badge variant="outline" className="text-[10px] text-green-500">ALL CLEAR</Badge>}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-4">
          <RefreshCcw className="w-4 h-4 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{isAr ? 'يتم الفحص...' : 'Scanning...'}</span>
        </div>
      ) : anomalies.length === 0 ? (
        <div className="py-4 text-center text-xs text-muted-foreground">
          {isAr ? 'لا توجد تهديدات مكتشفة' : 'No anomalies detected'}
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {anomalies.map((a, i) => {
            const cfg = severityConfig[a.severity] || severityConfig.medium;
            const Icon = cfg.icon;
            return (
              <div key={i} className={`rounded-lg border p-3 ${cfg.bg}`}>
                <div className="flex items-start gap-2">
                  <Icon className={`w-4 h-4 mt-0.5 ${cfg.color} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={`text-[10px] ${cfg.color}`}>{a.type.toUpperCase()}</Badge>
                      <Badge variant="outline" className="text-[10px]">{a.severity.toUpperCase()}</Badge>
                    </div>
                    <p className="text-xs">{isAr ? a.description_ar : a.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
