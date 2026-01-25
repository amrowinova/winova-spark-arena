import { motion } from 'framer-motion';
import { Users, TrendingUp, TrendingDown, Star } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useLanguage } from '@/contexts/LanguageContext';

export type TeamFilter = 'all' | 'active' | 'inactive' | 'promotable';

interface TeamFiltersProps {
  filter: TeamFilter;
  onFilterChange: (filter: TeamFilter) => void;
  counts: {
    all: number;
    active: number;
    inactive: number;
    promotable: number;
  };
}

export function TeamFilters({ filter, onFilterChange, counts }: TeamFiltersProps) {
  const { language } = useLanguage();

  const filters = [
    { 
      value: 'all' as TeamFilter, 
      label: language === 'ar' ? 'الكل' : 'All',
      count: counts.all,
      icon: Users 
    },
    { 
      value: 'active' as TeamFilter, 
      label: language === 'ar' ? 'نشط' : 'Active',
      count: counts.active,
      icon: TrendingUp 
    },
    { 
      value: 'inactive' as TeamFilter, 
      label: language === 'ar' ? 'غير نشط' : 'Inactive',
      count: counts.inactive,
      icon: TrendingDown 
    },
    { 
      value: 'promotable' as TeamFilter, 
      label: language === 'ar' ? 'مؤهل' : 'Promotable',
      count: counts.promotable,
      icon: Star 
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
        {filters.map(({ value, label, count, icon: Icon }) => (
          <ToggleGroupItem 
            key={value}
            value={value}
            className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground px-3 py-2 h-auto rounded-full flex items-center gap-1.5 text-sm whitespace-nowrap"
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
