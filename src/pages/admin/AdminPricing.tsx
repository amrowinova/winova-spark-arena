import { useState } from 'react';
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
  DollarSign,
  TrendingUp,
  RefreshCcw,
  Save,
  AlertTriangle,
  CheckCircle,
  Globe,
  Coins,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNovaPricing, type AnchorPrices } from '@/hooks/useNovaPricing';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface AnchorField {
  key: keyof AnchorPrices;
  labelEn: string;
  labelAr: string;
  currency: string;
  flag: string;
  descriptionEn: string;
  descriptionAr: string;
}

const ANCHOR_FIELDS: AnchorField[] = [
  {
    key: 'egp',
    labelEn: 'Egyptian Pound (EGP)',
    labelAr: 'الجنيه المصري (ج.م)',
    currency: 'EGP',
    flag: '🇪🇬',
    descriptionEn: 'Base anchor — affects Egypt and all derived currencies',
    descriptionAr: 'المرساة الأساسية — تؤثر على مصر وجميع العملات المشتقة',
  },
  {
    key: 'sar',
    labelEn: 'Saudi Riyal (SAR)',
    labelAr: 'الريال السعودي (ر.س)',
    currency: 'SAR',
    flag: '🇸🇦',
    descriptionEn: 'Gulf anchor — affects Saudi, UAE, Kuwait, Qatar, Bahrain, Oman, Yemen',
    descriptionAr: 'مرساة الخليج — تؤثر على السعودية والإمارات والكويت وقطر والبحرين وعُمان واليمن',
  },
  {
    key: 'usd',
    labelEn: 'US Dollar (USD)',
    labelAr: 'الدولار الأمريكي ($)',
    currency: 'USD',
    flag: '🇺🇸',
    descriptionEn: 'USD anchor — affects Jordan, Palestine, Lebanon, Syria, Iraq, Turkey, Pakistan, Sudan',
    descriptionAr: 'مرساة الدولار — تؤثر على الأردن وفلسطين ولبنان وسوريا والعراق وتركيا وباكستان والسودان',
  },
  {
    key: 'eur',
    labelEn: 'Euro (EUR)',
    labelAr: 'اليورو (€)',
    currency: 'EUR',
    flag: '🇪🇺',
    descriptionEn: 'EUR anchor — affects Morocco, Tunisia, Algeria, Libya',
    descriptionAr: 'مرساة اليورو — تؤثر على المغرب وتونس والجزائر وليبيا',
  },
];

export default function AdminPricing() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { anchorPrices, isLoading } = useNovaPricing();

  const [editValues, setEditValues] = useState<Partial<AnchorPrices>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const getValue = (key: keyof AnchorPrices): string => {
    if (key in editValues) return String(editValues[key]);
    return String(anchorPrices[key] ?? '');
  };

  const handleChange = (key: keyof AnchorPrices, val: string) => {
    setEditValues(prev => ({ ...prev, [key]: val === '' ? '' : parseFloat(val) }));
  };

  const hasChanges = ANCHOR_FIELDS.some(f => {
    const edited = editValues[f.key];
    return edited !== undefined && String(edited) !== '' && Number(edited) !== anchorPrices[f.key];
  });

  const handleSave = async () => {
    if (!hasChanges) return;

    // Validate all values
    for (const field of ANCHOR_FIELDS) {
      const val = editValues[field.key];
      if (val !== undefined && val !== '') {
        const num = Number(val);
        if (isNaN(num) || num <= 0) {
          toast.error(
            isRTL
              ? `قيمة غير صالحة لـ ${field.labelAr}`
              : `Invalid value for ${field.labelEn}`
          );
          return;
        }
      }
    }

    setIsSaving(true);

    // Build updated prices
    const newPrices: AnchorPrices = { ...anchorPrices };
    ANCHOR_FIELDS.forEach(f => {
      const val = editValues[f.key];
      if (val !== undefined && val !== '') {
        newPrices[f.key] = Number(val);
      }
    });

    const { error } = await supabase
      .from('app_settings')
      .update({
        value: newPrices as unknown as Record<string, unknown>,
        updated_by: user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq('key', 'nova_prices');

    if (error) {
      toast.error(isRTL ? 'فشل حفظ الأسعار' : 'Failed to save prices');
      setIsSaving(false);
      return;
    }

    // Invalidate pricing cache
    await queryClient.invalidateQueries({ queryKey: ['nova_prices'] });
    setEditValues({});
    setLastSaved(new Date());
    setIsSaving(false);
    toast.success(isRTL ? 'تم حفظ أسعار النوفا بنجاح' : 'Nova prices saved successfully');
  };

  const handleReset = () => setEditValues({});

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <InnerPageHeader
        title={isRTL ? 'إدارة أسعار النوفا' : 'Nova Pricing Control'}
      />

      <div className="flex-1 p-4 space-y-4 overflow-y-auto pb-20">
        {/* Header Info */}
        <Card className="p-4 bg-amber-500/5 border-amber-500/20">
          <div className="flex items-start gap-3">
            <Coins className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-amber-600">
                {isRTL ? 'أسعار المرساة الأربعة' : 'Four Anchor Prices'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isRTL
                  ? 'جميع أسعار العملات الأخرى مشتقة من هذه المراسي الأربعة. أي تغيير هنا يؤثر فورياً على كامل المنصة.'
                  : 'All other currency rates are derived from these 4 anchors. Changes here affect the entire platform immediately.'}
              </p>
            </div>
          </div>
        </Card>

        {/* Anchor Price Editors */}
        <div className="space-y-3">
          {ANCHOR_FIELDS.map(field => {
            const current = anchorPrices[field.key];
            const editVal = editValues[field.key];
            const displayVal = getValue(field.key);
            const changed = editVal !== undefined && editVal !== '' && Number(editVal) !== current;

            return (
              <Card key={field.key} className={`p-4 transition-all ${changed ? 'border-amber-500/50 bg-amber-500/5' : ''}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{field.flag}</span>
                      <p className="font-medium text-sm">
                        {isRTL ? field.labelAr : field.labelEn}
                      </p>
                      {changed && (
                        <Badge variant="secondary" className="text-[10px] bg-amber-500/20 text-amber-600">
                          {isRTL ? 'معدّل' : 'Modified'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {isRTL ? field.descriptionAr : field.descriptionEn}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground mb-1 block">
                      {isRTL ? 'И 1 = كم' : 'И 1 = how much'} {field.currency}
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-primary">И</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.001"
                        value={displayVal}
                        onChange={e => handleChange(field.key, e.target.value)}
                        className="pl-8"
                        disabled={isLoading || isSaving}
                      />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground">
                      {isRTL ? 'الحالي' : 'Current'}
                    </p>
                    <p className="text-lg font-bold text-primary">
                      {current?.toFixed(field.key === 'egp' ? 1 : 2)}
                    </p>
                    <p className="text-xs text-muted-foreground">{field.currency}</p>
                  </div>
                </div>

                {changed && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                    <AlertTriangle className="w-3 h-3" />
                    <span>
                      {isRTL
                        ? `التغيير: ${current} → ${Number(editVal).toFixed(4)}`
                        : `Change: ${current} → ${Number(editVal).toFixed(4)}`}
                    </span>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Derived currencies info */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-blue-500" />
            <h3 className="font-semibold text-sm">
              {isRTL ? 'العملات المشتقة (25 عملة)' : 'Derived Currencies (25 total)'}
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
            <span>🇸🇦 SAR → 🇦🇪 AED, 🇰🇼 KWD, 🇶🇦 QAR, 🇧🇭 BHD, 🇴🇲 OMR, 🇾🇪 YER</span>
            <span>💵 USD → 🇯🇴 JOD, 🇵🇸 ILS, 🇱🇧 LBP, 🇸🇾 SYP, 🇮🇶 IQD, 🇹🇷 TRY, 🇵🇰 PKR, 🇸🇩 SDG</span>
            <span>💶 EUR → 🇲🇦 MAD, 🇹🇳 TND, 🇩🇿 DZD, 🇱🇾 LYD</span>
            <span>🇪🇬 EGP → مرساة مستقلة</span>
          </div>
        </Card>

        {/* Warning */}
        {hasChanges && (
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <AlertDescription className="text-amber-700">
              {isRTL
                ? 'تحذير: تغيير الأسعار يؤثر فورياً على جميع التحويلات والمحافظ والمعاملات. تأكد من القيم قبل الحفظ.'
                : 'Warning: Changing prices immediately affects all conversions, wallets, and transactions. Verify values before saving.'}
            </AlertDescription>
          </Alert>
        )}

        {/* Last saved */}
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

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="flex-1"
          >
            {isSaving ? (
              <RefreshCcw className="w-4 h-4 me-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 me-2" />
            )}
            {isRTL ? 'حفظ الأسعار' : 'Save Prices'}
          </Button>
          {hasChanges && (
            <Button variant="outline" onClick={handleReset}>
              {isRTL ? 'إلغاء' : 'Cancel'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
