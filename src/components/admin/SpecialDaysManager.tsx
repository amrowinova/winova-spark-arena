import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Plus, 
  Edit, 
  Trash2, 
  Globe, 
  Gift, 
  Star,
  Flag,
  PartyPopper,
  TreePine,
  Heart,
  Users,
  Settings,
  Save,
  X,
  Coins,
  Trophy
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { useBanner } from '@/contexts/BannerContext';

interface SpecialDay {
  id: string;
  name: string;
  name_ar: string;
  date: string;
  country_code?: string;
  type: 'national' | 'religious' | 'cultural' | 'custom';
  contest_rules: {
    entry_fee?: number;
    prize_multiplier?: number;
    free_contest?: boolean;
    special_prizes?: boolean;
    description?: string;
    description_ar?: string;
  };
  is_active: boolean;
  created_at: string;
}

interface Country {
  code: string;
  name: string;
  name_ar: string;
}

const COUNTRIES: Country[] = [
  { code: 'SA', name: 'Saudi Arabia', name_ar: 'المملكة العربية السعودية' },
  { code: 'AE', name: 'UAE', name_ar: 'الإمارات العربية المتحدة' },
  { code: 'EG', name: 'Egypt', name_ar: 'مصر' },
  { code: 'JO', name: 'Jordan', name_ar: 'الأردن' },
  { code: 'KW', name: 'Kuwait', name_ar: 'الكويت' },
  { code: 'BH', name: 'Bahrain', name_ar: 'البحرين' },
  { code: 'QA', name: 'Qatar', name_ar: 'قطر' },
  { code: 'OM', name: 'Oman', name_ar: 'عمان' },
  { code: 'IQ', name: 'Iraq', name_ar: 'العراق' },
  { code: 'SY', name: 'Syria', name_ar: 'سوريا' },
  { code: 'LB', name: 'Lebanon', name_ar: 'لبنان' },
  { code: 'PS', name: 'Palestine', name_ar: 'فلسطين' },
  { code: 'YE', name: 'Yemen', name_ar: 'اليمن' },
  { code: 'MA', name: 'Morocco', name_ar: 'المغرب' },
  { code: 'TN', name: 'Tunisia', name_ar: 'تونس' },
  { code: 'DZ', name: 'Algeria', name_ar: 'الجزائر' },
  { code: 'LY', name: 'Libya', name_ar: 'ليبيا' },
  { code: 'SD', name: 'Sudan', name_ar: 'السودان' },
];

const SPECIAL_DAY_ICONS = {
  national: Flag,
  religious: Star,
  cultural: Heart,
  custom: Calendar,
};

export function SpecialDaysManager() {
  const { language } = useLanguage();
  const { success: showSuccess, error: showError } = useBanner();
  const isRTL = language === 'ar' || language === 'ur' || language === 'fa';

  const [specialDays, setSpecialDays] = useState<SpecialDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<SpecialDay | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    name_ar: '',
    date: '',
    country_code: '',
    type: 'custom' as const,
    entry_fee: '',
    prize_multiplier: '',
    free_contest: false,
    special_prizes: false,
    description: '',
    description_ar: '',
    is_active: true,
  });

  useEffect(() => {
    fetchSpecialDays();
  }, []);

  const fetchSpecialDays = async () => {
    try {
      const { data, error } = await supabase
        .from('special_days')
        .select('*')
        .order('date', { ascending: true });

      if (error) throw error;
      setSpecialDays(data || []);
    } catch (error) {
      console.error('Error fetching special days:', error);
      showError(isRTL ? 'فشل تحميل الأيام الخاصة' : 'Failed to load special days');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ── Validation ───────────────────────────────────────────────────
    if (!formData.name.trim() || !formData.name_ar.trim()) {
      showError(isRTL ? 'الاسم بالعربي والإنجليزي مطلوبان' : 'Both Arabic and English names are required');
      return;
    }
    if (!formData.date) {
      showError(isRTL ? 'التاريخ مطلوب' : 'Date is required');
      return;
    }
    // Prevent past dates (only on new entries, not edits)
    if (!editingDay) {
      const today = new Date().toISOString().split('T')[0];
      if (formData.date < today) {
        showError(isRTL ? 'لا يمكن إضافة يوم خاص في الماضي' : 'Cannot add a special day in the past');
        return;
      }
    }
    const entryFeeVal = formData.entry_fee ? parseFloat(formData.entry_fee) : null;
    const multiplierVal = formData.prize_multiplier ? parseFloat(formData.prize_multiplier) : null;
    if (entryFeeVal !== null && entryFeeVal < 0) {
      showError(isRTL ? 'رسوم الدخول يجب أن تكون 0 أو أكثر' : 'Entry fee must be 0 or more');
      return;
    }
    if (multiplierVal !== null && multiplierVal <= 0) {
      showError(isRTL ? 'مضاعف الجائزة يجب أن يكون أكبر من 0' : 'Prize multiplier must be greater than 0');
      return;
    }
    // ─────────────────────────────────────────────────────────────────

    try {
      const submitData = {
        name: formData.name,
        name_ar: formData.name_ar,
        date: formData.date,
        country_code: formData.country_code || null,
        type: formData.type,
        contest_rules: {
          entry_fee: formData.entry_fee ? parseFloat(formData.entry_fee) : null,
          prize_multiplier: formData.prize_multiplier ? parseFloat(formData.prize_multiplier) : null,
          free_contest: formData.free_contest,
          special_prizes: formData.special_prizes,
          description: formData.description || null,
          description_ar: formData.description_ar || null,
        },
        is_active: formData.is_active,
      };

      if (editingDay) {
        const { error } = await supabase
          .from('special_days')
          .update(submitData)
          .eq('id', editingDay.id);

        if (error) throw error;
        showSuccess(isRTL ? 'تم تحديث اليوم الخاص بنجاح' : 'Special day updated successfully');
      } else {
        const { error } = await supabase
          .from('special_days')
          .insert(submitData);

        if (error) throw error;
        showSuccess(isRTL ? 'تم إضافة اليوم الخاص بنجاح' : 'Special day added successfully');
      }

      resetForm();
      fetchSpecialDays();
    } catch (error) {
      console.error('Error saving special day:', error);
      showError(isRTL ? 'فشل حفظ اليوم الخاص' : 'Failed to save special day');
    }
  };

  const handleEdit = (day: SpecialDay) => {
    setEditingDay(day);
    setFormData({
      name: day.name,
      name_ar: day.name_ar,
      date: day.date,
      country_code: day.country_code || '',
      type: day.type,
      entry_fee: day.contest_rules.entry_fee?.toString() || '',
      prize_multiplier: day.contest_rules.prize_multiplier?.toString() || '',
      free_contest: day.contest_rules.free_contest || false,
      special_prizes: day.contest_rules.special_prizes || false,
      description: day.contest_rules.description || '',
      description_ar: day.contest_rules.description_ar || '',
      is_active: day.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('special_days')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showSuccess(isRTL ? 'تم حذف اليوم الخاص بنجاح' : 'Special day deleted successfully');
      fetchSpecialDays();
    } catch (error) {
      console.error('Error deleting special day:', error);
      showError(isRTL ? 'فشل حذف اليوم الخاص' : 'Failed to delete special day');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      name_ar: '',
      date: '',
      country_code: '',
      type: 'custom',
      entry_fee: '',
      prize_multiplier: '',
      free_contest: false,
      special_prizes: false,
      description: '',
      description_ar: '',
      is_active: true,
    });
    setEditingDay(null);
    setIsDialogOpen(false);
  };

  const getTypeIcon = (type: string) => {
    const IconComponent = SPECIAL_DAY_ICONS[type as keyof typeof SPECIAL_DAY_ICONS] || Calendar;
    return <IconComponent className="h-4 w-4" />;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'national': return 'bg-red-100 text-red-800 border-red-200';
      case 'religious': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'cultural': return 'bg-pink-100 text-pink-800 border-pink-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getCountryName = (code: string) => {
    const country = COUNTRIES.find(c => c.code === code);
    return country ? (isRTL ? country.name_ar : country.name) : code;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {isRTL ? 'الأيام الخاصة' : 'Special Days'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {isRTL ? 'الأيام الخاصة' : 'Special Days'}
          </CardTitle>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {isRTL ? 'إضافة يوم' : 'Add Day'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {specialDays.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold mb-2">
                {isRTL ? 'لا توجد أيام خاصة' : 'No special days'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {isRTL ? 'أضف أياماً خاصة لتعديل قواعد المسابقات' : 'Add special days to modify contest rules'}
              </p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                {isRTL ? 'إضافة أول يوم' : 'Add First Day'}
              </Button>
            </div>
          ) : (
            specialDays.map((day) => {
              const IconComponent = SPECIAL_DAY_ICONS[day.type] || Calendar;
              return (
                <motion.div
                  key={day.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-lg ${getTypeColor(day.type)}`}>
                          <IconComponent className="h-4 w-4" />
                        </div>
                        <div>
                          <h3 className="font-semibold">
                            {isRTL ? day.name_ar : day.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(day.date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                        <Badge className={getTypeColor(day.type)}>
                          {day.type}
                        </Badge>
                        {day.country_code && (
                          <Badge variant="outline">
                            <Globe className="h-3 w-3 mr-1" />
                            {getCountryName(day.country_code)}
                          </Badge>
                        )}
                        {!day.is_active && (
                          <Badge variant="secondary">
                            {isRTL ? 'غير نشط' : 'Inactive'}
                          </Badge>
                        )}
                      </div>
                      
                      {day.contest_rules && (
                        <div className="mt-3 space-y-1">
                          {day.contest_rules.free_contest && (
                            <div className="flex items-center gap-2 text-sm">
                              <Gift className="h-3 w-3 text-green-500" />
                              <span>{isRTL ? 'مسابقة مجانية' : 'Free Contest'}</span>
                            </div>
                          )}
                          {day.contest_rules.entry_fee && (
                            <div className="flex items-center gap-2 text-sm">
                              <Coins className="h-3 w-3 text-blue-500" />
                              <span>{isRTL ? 'رسوم دخول' : 'Entry Fee'}: И {day.contest_rules.entry_fee}</span>
                            </div>
                          )}
                          {day.contest_rules.prize_multiplier && (
                            <div className="flex items-center gap-2 text-sm">
                              <Trophy className="h-3 w-3 text-yellow-500" />
                              <span>{isRTL ? 'مضاعفة الجائزة' : 'Prize Multiplier'}: {day.contest_rules.prize_multiplier}x</span>
                            </div>
                          )}
                          {day.contest_rules.special_prizes && (
                            <div className="flex items-center gap-2 text-sm">
                              <Star className="h-3 w-3 text-purple-500" />
                              <span>{isRTL ? 'جوائز خاصة' : 'Special Prizes'}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(day)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(day.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Add/Edit Dialog */}
        <AnimatePresence>
          {isDialogOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-background rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold">
                    {editingDay ? 
                      (isRTL ? 'تعديل يوم خاص' : 'Edit Special Day') : 
                      (isRTL ? 'إضافة يوم خاص' : 'Add Special Day')
                    }
                  </h2>
                  <Button variant="ghost" size="sm" onClick={resetForm}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">{isRTL ? 'الاسم (إنجليزي)' : 'Name (English)'}</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="name_ar">{isRTL ? 'الاسم (عربي)' : 'Name (Arabic)'}</Label>
                      <Input
                        id="name_ar"
                        value={formData.name_ar}
                        onChange={(e) => setFormData(prev => ({ ...prev, name_ar: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="date">{isRTL ? 'التاريخ' : 'Date'}</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="type">{isRTL ? 'النوع' : 'Type'}</Label>
                      <Select value={formData.type} onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="national">{isRTL ? 'وطني' : 'National'}</SelectItem>
                          <SelectItem value="religious">{isRTL ? 'ديني' : 'Religious'}</SelectItem>
                          <SelectItem value="cultural">{isRTL ? 'ثقافي' : 'Cultural'}</SelectItem>
                          <SelectItem value="custom">{isRTL ? 'مخصص' : 'Custom'}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="country">{isRTL ? 'البلد (اختياري)' : 'Country (Optional)'}</Label>
                      <Select value={formData.country_code} onValueChange={(value) => setFormData(prev => ({ ...prev, country_code: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder={isRTL ? 'اختر بلداً' : 'Select country'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">{isRTL ? 'الكل' : 'All'}</SelectItem>
                          {COUNTRIES.map(country => (
                            <SelectItem key={country.code} value={country.code}>
                              {isRTL ? country.name_ar : country.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>{isRTL ? 'قواعد المسابقة' : 'Contest Rules'}</Label>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="free_contest"
                        checked={formData.free_contest}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, free_contest: checked }))}
                      />
                      <Label htmlFor="free_contest">{isRTL ? 'مسابقة مجانية' : 'Free Contest'}</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="special_prizes"
                        checked={formData.special_prizes}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, special_prizes: checked }))}
                      />
                      <Label htmlFor="special_prizes">{isRTL ? 'جوائز خاصة' : 'Special Prizes'}</Label>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="entry_fee">{isRTL ? 'رسوم الدخول' : 'Entry Fee'}</Label>
                        <Input
                          id="entry_fee"
                          type="number"
                          step="0.01"
                          value={formData.entry_fee}
                          onChange={(e) => setFormData(prev => ({ ...prev, entry_fee: e.target.value }))}
                          placeholder="10"
                        />
                      </div>
                      <div>
                        <Label htmlFor="prize_multiplier">{isRTL ? 'مضاعفة الجائزة' : 'Prize Multiplier'}</Label>
                        <Input
                          id="prize_multiplier"
                          type="number"
                          step="0.1"
                          value={formData.prize_multiplier}
                          onChange={(e) => setFormData(prev => ({ ...prev, prize_multiplier: e.target.value }))}
                          placeholder="2.0"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="description">{isRTL ? 'الوصف (إنجليزي)' : 'Description (English)'}</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder={isRTL ? 'وصف اليوم الخاص...' : 'Description of special day...'}
                      />
                    </div>

                    <div>
                      <Label htmlFor="description_ar">{isRTL ? 'الوصف (عربي)' : 'Description (Arabic)'}</Label>
                      <Textarea
                        id="description_ar"
                        value={formData.description_ar}
                        onChange={(e) => setFormData(prev => ({ ...prev, description_ar: e.target.value }))}
                        placeholder={isRTL ? 'وصف اليوم الخاص...' : 'وصف اليوم الخاص...'}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                    />
                    <Label htmlFor="is_active">{isRTL ? 'نشط' : 'Active'}</Label>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button type="submit" className="flex-1">
                      <Save className="h-4 w-4 mr-2" />
                      {editingDay ? 
                        (isRTL ? 'تحديث' : 'Update') : 
                        (isRTL ? 'إضافة' : 'Add')
                      }
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm}>
                      {isRTL ? 'إلغاء' : 'Cancel'}
                    </Button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
