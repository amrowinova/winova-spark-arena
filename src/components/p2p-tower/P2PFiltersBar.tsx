import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { Filter, X } from 'lucide-react';
import type { P2PFilters } from '@/hooks/useP2PControlTower';

interface Props {
  filters: P2PFilters;
  onChange: (f: P2PFilters) => void;
  onReset: () => void;
  countries: string[];
}

const statuses = ['open', 'awaiting_payment', 'payment_sent', 'disputed', 'completed', 'cancelled'];

export function P2PFiltersBar({ filters, onChange, onReset, countries }: Props) {
  const { language } = useLanguage();
  const isAr = language === 'ar';

  const update = (key: keyof P2PFilters, val: any) => onChange({ ...filters, [key]: val });
  const hasFilters = filters.country || filters.status || filters.userId || filters.minAmount || filters.maxAmount;

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold flex items-center gap-1">
          <Filter className="w-3.5 h-3.5" /> {isAr ? 'الفلاتر' : 'Filters'}
        </h4>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={onReset}>
            <X className="w-3 h-3 me-1" /> {isAr ? 'مسح' : 'Clear'}
          </Button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <Select value={filters.country || 'all'} onValueChange={(v) => update('country', v === 'all' ? '' : v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={isAr ? 'البلد' : 'Country'} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isAr ? 'الكل' : 'All'}</SelectItem>
            {countries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filters.status || 'all'} onValueChange={(v) => update('status', v === 'all' ? '' : v)}>
          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder={isAr ? 'الحالة' : 'Status'} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{isAr ? 'الكل' : 'All'}</SelectItem>
            {statuses.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>

        <Input
          className="h-8 text-xs"
          placeholder={isAr ? 'بحث بمستخدم...' : 'Search user...'}
          value={filters.userId}
          onChange={(e) => update('userId', e.target.value)}
        />

        <Input
          className="h-8 text-xs"
          placeholder={isAr ? 'حد أدنى Nova' : 'Min Nova'}
          type="number"
          value={filters.minAmount ?? ''}
          onChange={(e) => update('minAmount', e.target.value ? Number(e.target.value) : null)}
        />

        <Input
          className="h-8 text-xs"
          placeholder={isAr ? 'حد أقصى Nova' : 'Max Nova'}
          type="number"
          value={filters.maxAmount ?? ''}
          onChange={(e) => update('maxAmount', e.target.value ? Number(e.target.value) : null)}
        />

        <Input
          className="h-8 text-xs"
          type="date"
          value={filters.dateFrom}
          onChange={(e) => update('dateFrom', e.target.value)}
        />
      </div>
    </Card>
  );
}
