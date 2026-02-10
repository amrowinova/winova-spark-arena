import { Badge } from '@/components/ui/badge';
import { BehavioralMetrics } from '@/hooks/useGhostArmy';
import {
  Heart, MessageSquare, ShoppingCart, CheckCircle2, XCircle,
  AlertTriangle, Star, Users, Clock, ThumbsUp, ThumbsDown,
} from 'lucide-react';

interface Props {
  metrics: BehavioralMetrics;
  isAr: boolean;
  simulation: {
    agents_tested?: number;
    passed: number;
    failed: number;
    critical_issues: number;
    duration_ms: number;
  };
}

export function BehavioralMetricsGrid({ metrics, isAr, simulation }: Props) {
  const m = metrics;

  return (
    <div className="space-y-3">
      {/* Overview bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={simulation.critical_issues > 0 ? 'destructive' : simulation.failed > 0 ? 'secondary' : 'default'} className="text-xs">
          {simulation.passed}✓ {simulation.failed}✗ {simulation.critical_issues > 0 ? `${simulation.critical_issues} critical` : ''}
        </Badge>
        <span className="text-xs text-muted-foreground">{simulation.agents_tested || '—'} agents • {simulation.duration_ms}ms</span>
      </div>

      {/* Social */}
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          {isAr ? 'النشاط الاجتماعي' : 'Social Activity'}
        </p>
        <div className="grid grid-cols-3 gap-2">
          <Stat icon={<Heart className="h-3.5 w-3.5 text-pink-500" />} value={m.follows_created} label={isAr ? 'متابعات' : 'Follows'} />
          <Stat icon={<Users className="h-3.5 w-3.5 text-primary" />} value={m.profiles_viewed} label={isAr ? 'ملفات' : 'Profiles'} />
          <Stat icon={<MessageSquare className="h-3.5 w-3.5 text-blue-500" />} value={m.messages_sent} label={isAr ? 'رسائل' : 'Messages'}
            sub={`${m.chats_started} ${isAr ? 'محادثة' : 'convos'}`} />
        </div>
      </div>

      {/* P2P Trading */}
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          {isAr ? 'تداول P2P' : 'P2P Trading'}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat icon={<ShoppingCart className="h-3.5 w-3.5 text-primary" />} value={m.p2p_orders_created} label={isAr ? 'طلبات' : 'Orders'} />
          <Stat icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />} value={m.p2p_orders_completed} label={isAr ? 'مكتملة' : 'Completed'}
            highlight={m.p2p_orders_completed > 0 ? 'success' : undefined} />
          <Stat icon={<XCircle className="h-3.5 w-3.5 text-muted-foreground" />} value={m.p2p_orders_cancelled} label={isAr ? 'ملغاة' : 'Cancelled'} />
          <Stat icon={<AlertTriangle className="h-3.5 w-3.5 text-destructive" />} value={m.p2p_disputes} label={isAr ? 'نزاعات' : 'Disputes'}
            highlight={m.p2p_disputes > 0 ? 'danger' : undefined} />
        </div>
      </div>

      {/* Ratings */}
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          {isAr ? 'التقييمات' : 'Ratings Distribution'}
        </p>
        <div className="grid grid-cols-3 gap-2">
          <Stat icon={<Star className="h-3.5 w-3.5 text-yellow-500" />} value={m.ratings_submitted} label={isAr ? 'إجمالي' : 'Total'} />
          <Stat icon={<ThumbsUp className="h-3.5 w-3.5 text-emerald-500" />} value={m.ratings_positive} label={isAr ? 'إيجابي' : 'Positive'}
            sub={m.ratings_submitted > 0 ? `${Math.round(m.ratings_positive / m.ratings_submitted * 100)}%` : '—'} />
          <Stat icon={<ThumbsDown className="h-3.5 w-3.5 text-destructive" />} value={m.ratings_negative} label={isAr ? 'سلبي' : 'Negative'} />
        </div>
      </div>

      {/* Referrals */}
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
          {isAr ? 'الإحالات' : 'Referral Readiness'}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Stat icon={<Clock className="h-3.5 w-3.5 text-muted-foreground" />} value={`${m.referrals_succeeded}/${m.referrals_attempted}`}
            label={isAr ? 'جاهز' : 'Ready'} />
          <Stat icon={<CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
            value={m.referrals_attempted > 0 ? `${Math.round(m.referrals_succeeded / m.referrals_attempted * 100)}%` : '—'}
            label={isAr ? 'معدل النجاح' : 'Success Rate'} />
        </div>
      </div>
    </div>
  );
}

function Stat({ icon, value, label, sub, highlight }: {
  icon: React.ReactNode; value: string | number; label: string; sub?: string;
  highlight?: 'success' | 'danger';
}) {
  return (
    <div className={`rounded-lg border p-2 ${
      highlight === 'success' ? 'border-emerald-500/30 bg-emerald-500/5' :
      highlight === 'danger' ? 'border-destructive/30 bg-destructive/5' : 'bg-card'
    }`}>
      <div className="flex items-center gap-1 mb-0.5">{icon}</div>
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      {sub && <p className="text-[9px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
