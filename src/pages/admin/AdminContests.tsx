import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Trophy,
  RefreshCcw,
  Calendar,
  Users,
  Coins,
  Edit,
  Plus,
  CheckCircle,
  Clock,
  XCircle,
  Gift,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { arSA } from 'date-fns/locale';

interface Contest {
  id: string;
  title: string;
  title_ar: string | null;
  contest_date: string;
  start_time: string;
  end_time: string;
  entry_fee: number;
  prize_pool: number;
  max_participants: number | null;
  current_participants: number;
  status: string;
  description: string | null;
  description_ar: string | null;
}

const STATUS_CONFIG = {
  active: {
    colorEn: 'bg-green-500/20 text-green-600',
    labelEn: 'Active',
    labelAr: 'نشط',
    icon: <CheckCircle className="w-3 h-3" />,
  },
  pending: {
    colorEn: 'bg-amber-500/20 text-amber-600',
    labelEn: 'Pending',
    labelAr: 'قادم',
    icon: <Clock className="w-3 h-3" />,
  },
  completed: {
    colorEn: 'bg-blue-500/20 text-blue-600',
    labelEn: 'Completed',
    labelAr: 'منتهي',
    icon: <CheckCircle className="w-3 h-3" />,
  },
  cancelled: {
    colorEn: 'bg-red-500/20 text-red-600',
    labelEn: 'Cancelled',
    labelAr: 'ملغي',
    icon: <XCircle className="w-3 h-3" />,
  },
};

// KSA-based contest timing (daily)
const getKSADateString = (offsetDays = 0): string => {
  const now = new Date();
  const ksaOffset = 3 * 60; // UTC+3
  const ksaTime = new Date(now.getTime() + (ksaOffset - now.getTimezoneOffset()) * 60000);
  const target = addDays(ksaTime, offsetDays);
  return format(target, 'yyyy-MM-dd');
};

const getDayNameAr = (dateStr: string): string => {
  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const d = new Date(dateStr);
  return days[d.getDay()];
};

const getDayNameEn = (dateStr: string): string => {
  return format(new Date(dateStr), 'EEEE');
};

export default function AdminContests() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [contests, setContests] = useState<Contest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedContest, setSelectedContest] = useState<Contest | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isCreatingToday, setIsCreatingToday] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    title: '',
    title_ar: '',
    entry_fee: '',
    prize_pool: '',
    max_participants: '',
    status: 'pending',
    start_time: '20:00',
    end_time: '23:59',
  });

  const fetchContests = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('contests')
      .select('*')
      .order('contest_date', { ascending: false })
      .limit(30);

    if (data) setContests(data as Contest[]);
    setIsLoading(false);
  };

  useEffect(() => { fetchContests(); }, []);

  const todayKSA = getKSADateString(0);
  const tomorrowKSA = getKSADateString(1);
  const todayContest = contests.find(c => c.contest_date === todayKSA);
  const tomorrowContest = contests.find(c => c.contest_date === tomorrowKSA);

  const openEdit = (contest: Contest) => {
    setSelectedContest(contest);
    setEditForm({
      title: contest.title,
      title_ar: contest.title_ar || '',
      entry_fee: String(contest.entry_fee),
      prize_pool: String(contest.prize_pool),
      max_participants: contest.max_participants ? String(contest.max_participants) : '',
      status: contest.status,
      start_time: format(new Date(contest.start_time), 'HH:mm'),
      end_time: format(new Date(contest.end_time), 'HH:mm'),
    });
    setIsSheetOpen(true);
  };

  const openCreateToday = () => {
    const today = getKSADateString(0);
    const dayNameEn = getDayNameEn(today);
    const dayNameAr = getDayNameAr(today);
    setSelectedContest(null);
    setEditForm({
      title: `${dayNameEn} Contest - ${today}`,
      title_ar: `مسابقة ${dayNameAr} - ${today}`,
      entry_fee: '10',
      prize_pool: '0',
      max_participants: '',
      status: 'active',
      start_time: '20:00',
      end_time: '23:59',
    });
    setIsSheetOpen(true);
  };

  const handleSave = async () => {
    if (!editForm.title || !editForm.entry_fee) {
      toast.error(isRTL ? 'يرجى ملء الحقول المطلوبة' : 'Please fill required fields');
      return;
    }

    setIsSaving(true);

    const today = getKSADateString(0);
    const contestDate = selectedContest?.contest_date || today;
    const startTime = `${contestDate}T${editForm.start_time}:00+03:00`;
    const endTime = `${contestDate}T${editForm.end_time}:00+03:00`;

    const payload = {
      title: editForm.title,
      title_ar: editForm.title_ar || null,
      entry_fee: parseFloat(editForm.entry_fee),
      prize_pool: parseFloat(editForm.prize_pool || '0'),
      max_participants: editForm.max_participants ? parseInt(editForm.max_participants) : null,
      status: editForm.status,
      start_time: startTime,
      end_time: endTime,
    };

    if (selectedContest) {
      const { error } = await supabase
        .from('contests')
        .update(payload)
        .eq('id', selectedContest.id);

      if (error) {
        toast.error(isRTL ? 'فشل التحديث' : 'Update failed');
      } else {
        toast.success(isRTL ? 'تم تحديث المسابقة' : 'Contest updated');
        setIsSheetOpen(false);
        fetchContests();
      }
    } else {
      const { error } = await supabase
        .from('contests')
        .insert({ ...payload, contest_date: today });

      if (error) {
        toast.error(isRTL ? 'فشل الإنشاء' : 'Creation failed');
      } else {
        toast.success(isRTL ? 'تم إنشاء مسابقة اليوم' : "Today's contest created");
        setIsSheetOpen(false);
        fetchContests();
      }
    }

    setIsSaving(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <InnerPageHeader title={isRTL ? 'إدارة المسابقات' : 'Contest Management'} />

      <div className="flex-1 p-4 space-y-4 overflow-y-auto pb-20">
        {/* Today & Tomorrow Status */}
        <div className="grid grid-cols-2 gap-3">
          <Card className={`p-3 ${todayContest ? 'border-green-500/30' : 'border-dashed border-amber-500/30'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-primary" />
              <p className="text-xs font-medium">{isRTL ? 'مسابقة اليوم' : "Today's Contest"}</p>
            </div>
            {todayContest ? (
              <>
                <p className="font-bold text-sm line-clamp-1">
                  {isRTL ? (todayContest.title_ar || todayContest.title) : todayContest.title}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <Badge className={`text-[10px] ${STATUS_CONFIG[todayContest.status as keyof typeof STATUS_CONFIG]?.colorEn}`}>
                    {isRTL
                      ? STATUS_CONFIG[todayContest.status as keyof typeof STATUS_CONFIG]?.labelAr
                      : STATUS_CONFIG[todayContest.status as keyof typeof STATUS_CONFIG]?.labelEn}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {todayContest.current_participants} {isRTL ? 'مشارك' : 'participants'}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2 h-7 text-xs"
                  onClick={() => openEdit(todayContest)}
                >
                  <Edit className="w-3 h-3 me-1" />
                  {isRTL ? 'تعديل' : 'Edit'}
                </Button>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground mb-2">
                  {isRTL ? 'لا توجد مسابقة لليوم' : 'No contest for today'}
                </p>
                <Button
                  size="sm"
                  className="w-full h-7 text-xs"
                  onClick={openCreateToday}
                  disabled={isCreatingToday}
                >
                  <Plus className="w-3 h-3 me-1" />
                  {isRTL ? 'إنشاء الآن' : 'Create Now'}
                </Button>
              </>
            )}
          </Card>

          <Card className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              <p className="text-xs font-medium">{isRTL ? 'مسابقة الغد' : "Tomorrow's Contest"}</p>
            </div>
            {tomorrowContest ? (
              <>
                <p className="font-bold text-sm line-clamp-1">
                  {isRTL ? (tomorrowContest.title_ar || tomorrowContest.title) : tomorrowContest.title}
                </p>
                <Badge className={`text-[10px] mt-1 ${STATUS_CONFIG[tomorrowContest.status as keyof typeof STATUS_CONFIG]?.colorEn}`}>
                  {isRTL
                    ? STATUS_CONFIG[tomorrowContest.status as keyof typeof STATUS_CONFIG]?.labelAr
                    : STATUS_CONFIG[tomorrowContest.status as keyof typeof STATUS_CONFIG]?.labelEn}
                </Badge>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                {isRTL ? 'لم تُنشأ بعد' : 'Not created yet'}
              </p>
            )}
          </Card>
        </div>

        {/* Contest Schedule Info */}
        <Card className="p-3 bg-blue-500/5 border-blue-500/20">
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              {isRTL
                ? 'المسابقات يومية وتُسمى تلقائياً باسم اليوم وتاريخه. التوقيت موحد (KSA) 8 مساءً حتى 11:59 مساءً.'
                : 'Contests are daily and named after the day and date. Unified timing (KSA): 8 PM to 11:59 PM.'}
            </p>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-sm">
            {isRTL ? 'جميع المسابقات' : 'All Contests'}
          </h3>
          <Button variant="outline" size="sm" onClick={fetchContests} disabled={isLoading}>
            <RefreshCcw className={`w-4 h-4 me-1 ${isLoading ? 'animate-spin' : ''}`} />
            {isRTL ? 'تحديث' : 'Refresh'}
          </Button>
        </div>

        {/* Contests List */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
          </div>
        ) : contests.length === 0 ? (
          <Card className="p-8 text-center">
            <Trophy className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">
              {isRTL ? 'لا توجد مسابقات' : 'No contests found'}
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {contests.map(contest => {
              const statusConf = STATUS_CONFIG[contest.status as keyof typeof STATUS_CONFIG];
              const dayNameEn = getDayNameEn(contest.contest_date);
              const dayNameAr = getDayNameAr(contest.contest_date);
              return (
                <Card key={contest.id} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={`text-[10px] ${statusConf?.colorEn}`}>
                          {isRTL ? statusConf?.labelAr : statusConf?.labelEn}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {isRTL ? dayNameAr : dayNameEn} • {contest.contest_date}
                        </span>
                      </div>
                      <p className="font-medium text-sm line-clamp-1">
                        {isRTL ? (contest.title_ar || contest.title) : contest.title}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Coins className="w-3 h-3" />
                          {contest.entry_fee} Nova
                        </span>
                        <span className="flex items-center gap-1">
                          <Gift className="w-3 h-3" />
                          {contest.prize_pool} Nova
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {contest.current_participants}
                          {contest.max_participants ? `/${contest.max_participants}` : ''}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 shrink-0"
                      onClick={() => openEdit(contest)}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit/Create Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {selectedContest
                ? (isRTL ? 'تعديل المسابقة' : 'Edit Contest')
                : (isRTL ? 'إنشاء مسابقة' : 'Create Contest')}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 mt-4 pb-8">
            <div>
              <Label className="text-xs">{isRTL ? 'العنوان (EN)' : 'Title (EN)'} *</Label>
              <Input
                value={editForm.title}
                onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
                placeholder="Monday Contest - 2026-03-19"
              />
            </div>
            <div>
              <Label className="text-xs">{isRTL ? 'العنوان (AR)' : 'Title (AR)'}</Label>
              <Input
                value={editForm.title_ar}
                onChange={e => setEditForm(p => ({ ...p, title_ar: e.target.value }))}
                placeholder="مسابقة الاثنين - 2026-03-19"
                dir="rtl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{isRTL ? 'رسوم الدخول (نوفا)' : 'Entry Fee (Nova)'} *</Label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.entry_fee}
                  onChange={e => setEditForm(p => ({ ...p, entry_fee: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">{isRTL ? 'مجمع الجوائز (نوفا)' : 'Prize Pool (Nova)'}</Label>
                <Input
                  type="number"
                  min="0"
                  value={editForm.prize_pool}
                  onChange={e => setEditForm(p => ({ ...p, prize_pool: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{isRTL ? 'وقت البداية (KSA)' : 'Start Time (KSA)'}</Label>
                <Input
                  type="time"
                  value={editForm.start_time}
                  onChange={e => setEditForm(p => ({ ...p, start_time: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">{isRTL ? 'وقت النهاية (KSA)' : 'End Time (KSA)'}</Label>
                <Input
                  type="time"
                  value={editForm.end_time}
                  onChange={e => setEditForm(p => ({ ...p, end_time: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label className="text-xs">{isRTL ? 'الحد الأقصى للمشاركين' : 'Max Participants'}</Label>
              <Input
                type="number"
                min="1"
                value={editForm.max_participants}
                onChange={e => setEditForm(p => ({ ...p, max_participants: e.target.value }))}
                placeholder={isRTL ? 'غير محدود' : 'Unlimited'}
              />
            </div>

            <div>
              <Label className="text-xs">{isRTL ? 'الحالة' : 'Status'}</Label>
              <div className="flex gap-2 mt-1 flex-wrap">
                {(['pending', 'active', 'completed', 'cancelled'] as const).map(s => (
                  <Button
                    key={s}
                    variant={editForm.status === s ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setEditForm(p => ({ ...p, status: s }))}
                  >
                    {isRTL ? STATUS_CONFIG[s].labelAr : STATUS_CONFIG[s].labelEn}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <RefreshCcw className="w-4 h-4 me-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 me-2" />
              )}
              {selectedContest
                ? (isRTL ? 'حفظ التغييرات' : 'Save Changes')
                : (isRTL ? 'إنشاء المسابقة' : 'Create Contest')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
