import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Target } from 'lucide-react';

interface Props {
  results: any[];
  isAr: boolean;
}

const categoryIcons: Record<string, string> = {
  RLS_Security: '🔒', Data_Integrity: '📊', Financial_Safety: '💰',
  Referral_Integrity: '🌳', Behavioral_Chat: '💬', Behavioral_Social: '❤️',
  Behavioral_P2P: '🛒', Fraud_Simulation: '🕵️', Contest_Integrity: '🏆',
  Performance: '⚡', Feature_Test: '🧪', Chat_Stress: '💬',
};

export function SimulationResultsList({ results, isAr }: Props) {
  const [expandedResult, setExpandedResult] = useState<number | null>(null);

  return (
    <div className="space-y-1.5 max-h-80 overflow-y-auto">
      {results.map((r: any, i: number) => {
        const isExpanded = expandedResult === i;
        const hasExecFields = r.what_happened && r.why_it_matters && r.recommended_action;

        return (
          <div key={i} className={`rounded-md border transition-colors ${
            r.status === 'fail' ? 'border-destructive/30 bg-destructive/5' :
            r.status === 'warning' ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-border bg-card'
          }`}>
            <div className="flex items-start gap-2 text-xs px-2.5 py-1.5 cursor-pointer"
              onClick={() => setExpandedResult(isExpanded ? null : i)}>
              <span className="mt-0.5 shrink-0">{categoryIcons[r.category] || '📋'}</span>
              <div className="min-w-0 flex-1">
                <span className="font-medium">{r.test}</span>
                {r.latency_ms != null && <span className="text-muted-foreground ml-1">({r.latency_ms}ms)</span>}
              </div>
              <Badge variant="outline" className={`text-[9px] shrink-0 ${
                r.severity === 'critical' ? 'border-destructive/50 text-destructive' :
                r.severity === 'high' ? 'border-yellow-500/50 text-yellow-600' : ''
              }`}>
                {r.status === 'pass' ? '✓' : r.status === 'fail' ? '✗' : '⚠'} {r.severity}
              </Badge>
            </div>

            {isExpanded && hasExecFields && (
              <div className="px-2.5 pb-2.5 space-y-1.5 border-t border-border/50 mt-1 pt-2">
                <div className="text-[11px]">
                  <span className="font-semibold text-foreground">{isAr ? 'ما حدث: ' : 'What happened: '}</span>
                  <span className="text-muted-foreground">{r.what_happened}</span>
                </div>
                <div className="text-[11px]">
                  <span className="font-semibold text-foreground">{isAr ? 'الأثر: ' : 'Impact: '}</span>
                  <span className="text-muted-foreground">{r.why_it_matters}</span>
                </div>
                <div className="text-[11px] flex items-start gap-1">
                  <Target className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-primary">{isAr ? 'الإجراء: ' : 'Action: '}</span>
                    <span>{r.recommended_action}</span>
                  </div>
                </div>
              </div>
            )}

            {isExpanded && !hasExecFields && (
              <div className="px-2.5 pb-2 text-[11px] text-muted-foreground">{r.detail}</div>
            )}
          </div>
        );
      })}
    </div>
  );
}
