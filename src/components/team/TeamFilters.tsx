import { motion } from 'framer-motion';
import { AlertTriangle, Clock, TrendingUp, Users } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useLanguage } from '@/contexts/LanguageContext';

export type TeamFilter = 'needs-attention' | 'at-risk' | 'active' | 'has-team';

interface TeamFiltersProps {
  filter: TeamFilter;
  onFilterChange: (filter: TeamFilter) => void;
  counts: {
    needsAttention: number;
    atRisk: number;
    active: number;
    hasTeam: number;
  };
}

export function TeamFilters({ filter, onFilterChange, counts }: TeamFiltersProps) {
  const { language } = useLanguage();

  const filters = [
    { 
      value: 'needs-attention' as TeamFilter, 
      label: language === 'ar' ? 'يحتاج اهتمام' : 'Needs Attention',
      count: counts.needsAttention,
      icon: AlertTriangle,
      activeClass: 'data-[state=on]:bg-destructive data-[state=on]:text-destructive-foreground'
    },
    { 
      value: 'at-risk' as TeamFilter, 
      label: language === 'ar' ? 'معرض للخطر' : 'At Risk',
      count: counts.atRisk,
      icon: Clock,
      activeClass: 'data-[state=on]:bg-warning data-[state=on]:text-warning-foreground'
    },
    { 
      value: 'active' as TeamFilter, 
      label: language === 'ar' ? 'نشط' : 'Active',
      count: counts.active,
      icon: TrendingUp,
      activeClass: 'data-[state=on]:bg-success data-[state=on]:text-success-foreground'
    },
    { 
      value: 'has-team' as TeamFilter, 
      label: language === 'ar' ? 'لديه فريق' : 'Has Team',
      count: counts.hasTeam,
      icon: Users,
      activeClass: 'data-[state=on]:bg-primary data-[state=on]:text-primary-foreground'
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-x-auto pb-2 -mx-4 px-4"
    >
      <ToggleGroup 
        type="single" 
        value={filter} 
        onValueChange={(v) => v && onFilterChange(v as TeamFilter)}
        className="justify-start gap-2 w-max"
      >
        {filters.map(({ value, label, count, icon: Icon, activeClass }) => (
          <ToggleGroupItem 
            key={value}
            value={value}
            className={`${activeClass} px-3 py-2 h-auto rounded-full flex items-center gap-1.5 text-sm whitespace-nowrap border border-border`}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
            <span className="text-xs opacity-70">({count})</span>
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </motion.div>
  );
}
