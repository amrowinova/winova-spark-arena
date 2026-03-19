import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Percent,
  Save,
  RefreshCcw,
  AlertTriangle,
  Crown,
  Shield,
  Star,
  Zap,
  TrendingUp,
  Users,
  CheckCircle,
  Info,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const RANK_CONFIG = [
  {
    key: 'leader',
    labelEn: 'Leader',
    labelAr: 'قائد',
    descriptionEn: 'Main earner from team contest entries',
    descriptionAr: 'المكتسب الرئيسي من مشتركي الفريق',
    icon: <Star className="w-4 h-4 text-blue-500" />,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    key: 'manager',
    labelEn: 'Manager',
    labelAr: 'مدير',
    descriptionEn: 'Mid-tier commission from team earnings',
    descriptionAr: 'عمولة متوسطة من أرباح الفريق',
    icon: <Shield className="w-4 h-4 text-purple-500" />,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    key: 'president',
    labelEn: 'President',
    labelAr: 'رئيس',
    descriptionEn: 'Top-level country president commission',
    descriptionAr: 'عمولة رئيس الدولة',
    icon: <Crown className="w-4 h-4 text-yellow-500" />,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
  },
];

interface CommissionRates {
  subscriber: number;
  marketer: number;
  leader: number;
  manager: number;
  president: number;
}

const DEFAULT_RATES: CommissionRates = {
  subscriber: 0,
  marketer: 0,
  leader: 0.82,
  manager: 0.15,
  president: 0.03,
};

export default function AdminCommissions() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [rates, setRates] = useState<CommissionRates>(DEFAULT_RATES);
  const [editRates, setEditRates] = useState<Partial<CommissionRates>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const fetchRates = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'commission_rates')
      .single();

    if (data?.value) {
      const stored = data.value as unknown as CommissionRates;
      setRates({ ...DEFAULT_RATES, ...stored });
    } else {
      // Rates not in DB yet — use defaults
      setRates(DEFAULT_RATES);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchRates(); }, []);

  const getDisplayValue = (key: keyof CommissionRates): string => {
    const edited = editRates[key];
    if (edited !== undefined) return String(edited);
    return String(rates[key]);
  };

  const handleChange = (key: keyof CommissionRates, val: string) => {
    const num = val === '' ? '' : parseFloat(val);
    setEditRates(prev => ({ ...prev, [key]: num as number }));
  };

  const hasChanges = Object.keys(editRates).some(key => {
    const k = key as keyof CommissionRates;
    const edited = editRates[k];
    return edited !== undefined && edited !== '' && Number(edited) !== rates[k];
  });

  const getTotal = (): number => {
    return RANK_CONFIG.reduce((sum, rc) => {
      const val = editRates[rc.key as keyof CommissionRates] !== undefined
        ? Number(editRates[rc.key as keyof CommissionRates])
        : rates[rc.key as keyof CommissionRates];
      return sum + val;
    }, 0);
  };

  const handleSave = async () => {
    if (!hasChanges) return;

    // Validate: all rates must be >= 0
    for (const rc of RANK_CONFIG) {
      const val = editRates[rc.key as keyof CommissionRates];
      if (val !== undefined && val !== '') {
        if (isNaN(Number(val)) || Number(val) < 0) {
          toast.error(isRTL ? `قيمة غير صالحة لـ ${rc.labelAr}` : `Invalid value for ${rc.labelEn}`);
          return;
        }
      }
    }

    const total = getTotal();
    if (total > 1.0) {
      toast.error(isRTL
        ? `مجموع العمولات (${(total * 100).toFixed(1)}%) يتجاوز 100%`
        : `Total commissions (${(total * 100).toFixed(1)}%) exceed 100%`);
      return;
    }

    setIsSaving(true);

    const newRates: CommissionRates = { ...rates };
    Object.keys(editRates).forEach(key => {
      const k = key as keyof CommissionRates;
      const val = editRates[k];
      if (val !== undefined && val !== '') {
        newRates[k] = Number(val);
      }
    });

    // Upsert commission_rates in app_settings
    const { error } = await supabase
      .from('app_settings')
      .upsert({
        key: 'commission_rates',
        value: newRates as unknown as Record<string, unknown>,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
        description: 'Rank commission rates (Nova per qualified participant)',
      }, { onConflict: 'key' });

    if (error) {
      toast.error(isRTL ? 'فشل حفظ النسب' : 'Failed to save rates');
      setIsSaving(false);
      return;
    }

    // Log to audit_logs
    if (user?.id) {
      await supabase.from('audit_logs').insert({
        action: 'commission_rate_update',
        entity_type: 'app_settings',
        performed_by: user.id,
        old_value: rates as unknown as Record<string, unknown>,
        new_value: newRates as unknown as Record<string, unknown>,
      });
    }

    await queryClient.invalidateQueries({ queryKey: ['commission_rates'] });
    setRates(newRates);
    setEditRates({});
    setLastSaved(new Date());
    setIsSaving(false);
    toast.success(isRTL ? 'تم حفظ نسب العمولات' : 'Commission rates saved');
  };

  const total = getTotal();
  const totalPercent = (total * 100).toFixed(1);
  const isTotalOk = total <= 1.0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <InnerPageHeader title={isRTL ? 'إدارة نسب العمولات' : 'Commission Rate Management'} />

      <div className="flex-1 p-4 space-y-4 overflow-y-auto pb-20">
        {/* Info */}
        <Card className="p-4 bg-purple-500/5 border-purple-500/20">
          <div className="flex items-start gap-3">
            <Percent className="w-5 h-5 text-purple-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-purple-600">
                {isRTL ? 'نسب العمولات حسب الرتبة' : 'Commission Rates by Rank'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isRTL
                  ? 'تحدد هذه النسب كم نوفا يكسب كل رتبة عن كل مشارك مؤهل في مسابقات فريقه.'
                  : 'These rates determine how much Nova each rank earns per qualified team participant in contests.'}
              </p>
            </div>
          </div>
        </Card>

        {/* Ranks with zero commission */}
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs font-medium">
              {isRTL ? 'رتب بدون عمولة' : 'Ranks with no commission'}
            </p>
          </div>
          <div className="flex gap-2">
            {([
              { key: 'subscriber', labelEn: 'Subscriber', labelAr: 'مشترك' },
              { key: 'marketer', labelEn: 'Marketer', labelAr: 'مسوّق' },
            ] as const).map(r => (
              <div key={r.key} className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2">
                <Users className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs">{isRTL ? r.labelAr : r.labelEn}</span>
                <Badge variant="secondary" className="text-[10px]">0 Nova</Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Editable Ranks */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {RANK_CONFIG.map(rc => {
              const currentVal = rates[rc.key as keyof CommissionRates];
              const editedVal = editRates[rc.key as keyof CommissionRates];
              const displayVal = getDisplayValue(rc.key as keyof CommissionRates);
              const changed = editedVal !== undefined && editedVal !== '' && Number(editedVal) !== currentVal;

              return (
                <Card key={rc.key} className={`p-4 transition-all ${changed ? 'border-amber-500/50 bg-amber-500/5' : ''}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-full ${rc.bgColor} flex items-center justify-center shrink-0`}>
                      {rc.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">
                          {isRTL ? rc.labelAr : rc.labelEn}
                        </p>
                        {changed && (
                          <Badge variant="secondary" className="text-[10px] bg-amber-500/20 text-amber-600">
                            {isRTL ? 'معدّل' : 'Modified'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {isRTL ? rc.descriptionAr : rc.descriptionEn}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Label className="text-xs text-muted-foreground mb-1 block">
                        {isRTL ? 'نوفا لكل مشارك مؤهل' : 'Nova per qualified participant'}
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-primary">И</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={displayVal}
                          onChange={e => handleChange(rc.key as keyof CommissionRates, e.target.value)}
                          className="pl-8"
                          disabled={isSaving}
                        />
                      </div>
                    </div>
                    <div className="text-center shrink-0">
                      <p className="text-xs text-muted-foreground">{isRTL ? 'الحالي' : 'Current'}</p>
                      <p className={`text-2xl font-bold ${rc.color}`}>{currentVal}</p>
                      <p className="text-xs text-muted-foreground">Nova</p>
                    </div>
                  </div>

                  {changed && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                      <AlertTriangle className="w-3 h-3" />
                      <span>{currentVal} → {Number(editedVal).toFixed(2)}</span>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Total summary */}
        <Card className={`p-4 ${!isTotalOk ? 'border-red-500/50 bg-red-500/5' : 'bg-muted/30'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <p className="text-sm font-medium">
                {isRTL ? 'إجمالي العمولة لكل مشارك' : 'Total Commission per Participant'}
              </p>
            </div>
            <div className="text-right">
              <p className={`text-2xl font-bold ${!isTotalOk ? 'text-red-500' : 'text-primary'}`}>
                {total.toFixed(2)} И
              </p>
              <p className="text-xs text-muted-foreground">= {totalPercent}%</p>
            </div>
          </div>
          {!isTotalOk && (
            <p className="text-xs text-red-500 mt-2">
              {isRTL ? 'تحذير: المجموع يتجاوز 100%' : 'Warning: Total exceeds 100%'}
            </p>
          )}
        </Card>

        {/* Warning */}
        {hasChanges && (
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <AlertDescription className="text-amber-700 text-xs">
              {isRTL
                ? 'تغيير نسب العمولات يؤثر على الأرباح المستقبلية للفريق. لا يؤثر على الأرباح السابقة.'
                : 'Changing commission rates affects future team earnings. Past earnings are not affected.'}
            </AlertDescription>
          </Alert>
        )}

        {lastSaved && (
          <div className="flex items-center gap-2 text-xs text-green-600">
            <CheckCircle className="w-3 h-3" />
            <span>
              {isRTL
                ? `آخر حفظ: ${lastSaved.toLocaleTimeString('ar-SA')}`
                : `Last saved: ${lastSaved.toLocaleTimeString()}`}
            </span>
          </div>
        )}

        <div className="flex gap-3">
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={!hasChanges || isSaving || !isTotalOk}
          >
            {isSaving ? <RefreshCcw className="w-4 h-4 me-2 animate-spin" /> : <Save className="w-4 h-4 me-2" />}
            {isRTL ? 'حفظ النسب' : 'Save Rates'}
          </Button>
          {hasChanges && (
            <Button variant="outline" onClick={() => setEditRates({})}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
