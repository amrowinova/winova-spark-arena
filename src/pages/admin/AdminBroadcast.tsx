import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Megaphone,
  Send,
  Users,
  Globe,
  Bell,
  RefreshCcw,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type TargetAudience = 'all' | 'country' | 'rank';

const COUNTRIES = [
  'Saudi Arabia', 'UAE', 'Qatar', 'Kuwait', 'Bahrain', 'Oman', 'Yemen',
  'Egypt', 'Jordan', 'Palestine', 'Lebanon', 'Syria', 'Iraq',
  'Morocco', 'Tunisia', 'Algeria', 'Libya', 'Sudan', 'Turkey', 'Pakistan',
];

const RANKS = ['subscriber', 'marketer', 'leader', 'manager', 'president'];

const NOTIFICATION_TYPES = [
  { value: 'system', labelEn: 'System Message', labelAr: 'رسالة نظام' },
  { value: 'announcement', labelEn: 'Announcement', labelAr: 'إعلان' },
  { value: 'contest_reminder', labelEn: 'Contest Reminder', labelAr: 'تذكير مسابقة' },
  { value: 'maintenance', labelEn: 'Maintenance', labelAr: 'صيانة' },
];

interface BroadcastHistory {
  sent_at: string;
  title: string;
  recipient_count: number;
  type: string;
  sent_by: string | null;
}

export default function AdminBroadcast() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const { user } = useAuth();

  const [titleEn, setTitleEn] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [messageEn, setMessageEn] = useState('');
  const [messageAr, setMessageAr] = useState('');
  const [notificationType, setNotificationType] = useState('system');
  const [targetAudience, setTargetAudience] = useState<TargetAudience>('all');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedRank, setSelectedRank] = useState('');

  const [isSending, setIsSending] = useState(false);
  const [estimatedCount, setEstimatedCount] = useState<number | null>(null);
  const [isEstimating, setIsEstimating] = useState(false);
  const [history, setHistory] = useState<BroadcastHistory[]>([]);

  const estimateRecipients = async () => {
    setIsEstimating(true);
    let query = supabase.from('profiles').select('id', { count: 'exact', head: true });

    if (targetAudience === 'country' && selectedCountry) {
      query = query.eq('country', selectedCountry);
    } else if (targetAudience === 'rank' && selectedRank) {
      query = query.eq('rank', selectedRank as any);
    }

    const { count } = await query;
    setEstimatedCount(count || 0);
    setIsEstimating(false);
  };

  useEffect(() => {
    estimateRecipients();
  }, [targetAudience, selectedCountry, selectedRank]);

  const handleBroadcast = async () => {
    if (!titleEn || !messageEn) {
      toast.error(isRTL ? 'يرجى ملء العنوان والرسالة بالإنجليزية' : 'Please fill title and message in English');
      return;
    }

    if (!estimatedCount || estimatedCount === 0) {
      toast.error(isRTL ? 'لا يوجد مستخدمون في النطاق المحدد' : 'No users in the selected scope');
      return;
    }

    setIsSending(true);

    // Fetch target user IDs
    let query = supabase.from('profiles').select('id');

    if (targetAudience === 'country' && selectedCountry) {
      query = query.eq('country', selectedCountry);
    } else if (targetAudience === 'rank' && selectedRank) {
      query = query.eq('rank', selectedRank as any);
    }

    const { data: users, error: fetchError } = await query;

    if (fetchError || !users) {
      toast.error(isRTL ? 'فشل في جلب المستخدمين' : 'Failed to fetch users');
      setIsSending(false);
      return;
    }

    // Batch insert notifications (100 at a time)
    const batchSize = 100;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);
      const notifications = batch.map(u => ({
        user_id: u.id,
        type: notificationType,
        title: titleEn,
        title_ar: titleAr || null,
        message: messageEn,
        message_ar: messageAr || null,
        is_read: false,
      }));

      const { error } = await supabase.from('notifications').insert(notifications);
      if (error) {
        errorCount += batch.length;
      } else {
        successCount += batch.length;
      }
    }

    // Log broadcast to audit_logs
    if (user?.id) {
      await supabase.from('audit_logs').insert({
        action: 'broadcast_notification',
        entity_type: 'notifications',
        performed_by: user.id,
        new_value: {
          title: titleEn,
          type: notificationType,
          target: targetAudience,
          country: selectedCountry || null,
          rank: selectedRank || null,
          recipient_count: successCount,
        },
      });
    }

    if (errorCount === 0) {
      toast.success(isRTL
        ? `تم إرسال النشرة لـ ${successCount} مستخدم`
        : `Broadcast sent to ${successCount} users`);
      setTitleEn('');
      setTitleAr('');
      setMessageEn('');
      setMessageAr('');
    } else {
      toast.error(isRTL
        ? `أُرسلت لـ ${successCount}، فشل ${errorCount}`
        : `Sent to ${successCount}, failed ${errorCount}`);
    }

    setIsSending(false);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <InnerPageHeader title={isRTL ? 'النشرات والإشعارات الجماعية' : 'Broadcast & Mass Notifications'} />

      <div className="flex-1 p-4 space-y-4 overflow-y-auto pb-20">
        {/* Header */}
        <Card className="p-4 bg-blue-500/5 border-blue-500/20">
          <div className="flex items-start gap-3">
            <Megaphone className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-blue-600">
                {isRTL ? 'نظام الإشعارات الجماعية' : 'Mass Notification System'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isRTL
                  ? 'أرسل إشعاراً لجميع المستخدمين أو لفئة محددة (دولة أو رتبة)'
                  : 'Send notifications to all users or a specific group (country or rank)'}
              </p>
            </div>
          </div>
        </Card>

        {/* Audience Selector */}
        <Card className="p-4">
          <Label className="text-sm font-medium">
            {isRTL ? 'الجمهور المستهدف' : 'Target Audience'}
          </Label>
          <div className="flex gap-2 mt-2 flex-wrap">
            {([
              { value: 'all', labelEn: 'All Users', labelAr: 'جميع المستخدمين', icon: <Users className="w-3 h-3" /> },
              { value: 'country', labelEn: 'By Country', labelAr: 'حسب الدولة', icon: <Globe className="w-3 h-3" /> },
              { value: 'rank', labelEn: 'By Rank', labelAr: 'حسب الرتبة', icon: <Bell className="w-3 h-3" /> },
            ] as const).map(opt => (
              <Button
                key={opt.value}
                variant={targetAudience === opt.value ? 'default' : 'outline'}
                size="sm"
                className="h-8 text-xs gap-1"
                onClick={() => {
                  setTargetAudience(opt.value);
                  setSelectedCountry('');
                  setSelectedRank('');
                }}
              >
                {opt.icon}
                {isRTL ? opt.labelAr : opt.labelEn}
              </Button>
            ))}
          </div>

          {targetAudience === 'country' && (
            <div className="mt-3">
              <Label className="text-xs text-muted-foreground">{isRTL ? 'اختر الدولة' : 'Select Country'}</Label>
              <div className="flex flex-wrap gap-1.5 mt-1.5 max-h-32 overflow-y-auto">
                {COUNTRIES.map(c => (
                  <button
                    key={c}
                    onClick={() => setSelectedCountry(prev => prev === c ? '' : c)}
                    className={`px-2 py-1 rounded-full text-xs border transition-colors ${
                      selectedCountry === c
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {targetAudience === 'rank' && (
            <div className="mt-3">
              <Label className="text-xs text-muted-foreground">{isRTL ? 'اختر الرتبة' : 'Select Rank'}</Label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {RANKS.map(r => (
                  <button
                    key={r}
                    onClick={() => setSelectedRank(prev => prev === r ? '' : r)}
                    className={`px-3 py-1.5 rounded-full text-xs border capitalize transition-colors ${
                      selectedRank === r
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Estimated recipients */}
          <div className="mt-3 flex items-center gap-2">
            {isEstimating ? (
              <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
            ) : (
              <Users className="w-3 h-3 text-muted-foreground" />
            )}
            <span className="text-xs text-muted-foreground">
              {isRTL
                ? `عدد المستلمين المتوقع: ${estimatedCount?.toLocaleString() ?? '—'}`
                : `Estimated recipients: ${estimatedCount?.toLocaleString() ?? '—'}`}
            </span>
          </div>
        </Card>

        {/* Notification Type */}
        <Card className="p-4">
          <Label className="text-sm font-medium">
            {isRTL ? 'نوع الإشعار' : 'Notification Type'}
          </Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {NOTIFICATION_TYPES.map(t => (
              <Button
                key={t.value}
                variant={notificationType === t.value ? 'default' : 'outline'}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setNotificationType(t.value)}
              >
                {isRTL ? t.labelAr : t.labelEn}
              </Button>
            ))}
          </div>
        </Card>

        {/* Content */}
        <Card className="p-4 space-y-3">
          <div>
            <Label className="text-xs">{isRTL ? 'العنوان (EN) *' : 'Title (EN) *'}</Label>
            <Input
              value={titleEn}
              onChange={e => setTitleEn(e.target.value)}
              placeholder="System announcement"
              maxLength={100}
            />
          </div>
          <div>
            <Label className="text-xs">{isRTL ? 'العنوان (AR)' : 'Title (AR)'}</Label>
            <Input
              value={titleAr}
              onChange={e => setTitleAr(e.target.value)}
              placeholder="إعلان النظام"
              dir="rtl"
              maxLength={100}
            />
          </div>
          <div>
            <Label className="text-xs">{isRTL ? 'نص الرسالة (EN) *' : 'Message (EN) *'}</Label>
            <Textarea
              value={messageEn}
              onChange={e => setMessageEn(e.target.value)}
              placeholder="Write your message here..."
              rows={3}
              maxLength={500}
            />
            <p className="text-[10px] text-muted-foreground mt-1">{messageEn.length}/500</p>
          </div>
          <div>
            <Label className="text-xs">{isRTL ? 'نص الرسالة (AR)' : 'Message (AR)'}</Label>
            <Textarea
              value={messageAr}
              onChange={e => setMessageAr(e.target.value)}
              placeholder="اكتب رسالتك هنا..."
              rows={3}
              dir="rtl"
              maxLength={500}
            />
          </div>
        </Card>

        {/* Warning */}
        {estimatedCount !== null && estimatedCount > 0 && (
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <AlertDescription className="text-amber-700 text-xs">
              {isRTL
                ? `سيتم إرسال هذا الإشعار لـ ${estimatedCount.toLocaleString()} مستخدم. هذا الإجراء لا يمكن التراجع عنه.`
                : `This notification will be sent to ${estimatedCount.toLocaleString()} users. This action cannot be undone.`}
            </AlertDescription>
          </Alert>
        )}

        {/* Send Button */}
        <Button
          className="w-full"
          onClick={handleBroadcast}
          disabled={isSending || !titleEn || !messageEn || (targetAudience === 'country' && !selectedCountry) || (targetAudience === 'rank' && !selectedRank)}
        >
          {isSending ? (
            <RefreshCcw className="w-4 h-4 me-2 animate-spin" />
          ) : (
            <Send className="w-4 h-4 me-2" />
          )}
          {isSending
            ? (isRTL ? 'جارٍ الإرسال...' : 'Sending...')
            : (isRTL ? 'إرسال الإشعار' : 'Send Notification')}
        </Button>
      </div>
    </div>
  );
}
