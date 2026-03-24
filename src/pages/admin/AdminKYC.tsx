import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  CheckCircle2, XCircle, Clock, Eye,
  RefreshCw, Shield, Calendar, User,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface KYCRow {
  id: string;
  user_id: string;
  full_name: string;
  birth_date: string;
  id_image_url: string;
  status: 'pending' | 'verified' | 'rejected';
  admin_notes: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  profile: {
    name: string;
    username: string;
    avatar_url: string | null;
  } | null;
}

const STATUS_BADGE: Record<KYCRow['status'], { label: string; labelAr: string; color: string }> = {
  pending:  { label: 'Pending',  labelAr: 'قيد المراجعة', color: 'bg-blue-100 text-blue-700' },
  verified: { label: 'Verified', labelAr: 'موثق',         color: 'bg-green-100 text-green-700' },
  rejected: { label: 'Rejected', labelAr: 'مرفوض',        color: 'bg-red-100 text-red-700' },
};

export default function AdminKYC() {
  const { language } = useLanguage();
  const isRTL = language === 'ar';

  const [requests, setRequests]       = useState<KYCRow[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [filter, setFilter]           = useState<'pending' | 'verified' | 'rejected' | 'all'>('pending');
  const [selected, setSelected]       = useState<KYCRow | null>(null);
  const [adminNotes, setAdminNotes]   = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    let query = (supabase as any)
      .from('kyc_requests')
      .select(`
        id, user_id, full_name, birth_date, id_image_url,
        status, admin_notes, submitted_at, reviewed_at,
        profile:profile_id ( name, username, avatar_url )
      `)
      .order('submitted_at', { ascending: false })
      .limit(100);

    if (filter !== 'all') query = query.eq('status', filter);

    const { data, error } = await query;
    if (error) { console.error(error); }
    else { setRequests((data ?? []) as KYCRow[]); }
    setIsLoading(false);
  }, [filter]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const openSheet = (row: KYCRow) => {
    setSelected(row);
    setAdminNotes(row.admin_notes ?? '');
    setReviewError(null);
  };

  const handleReview = useCallback(async (decision: 'verified' | 'rejected') => {
    if (!selected) return;
    if (decision === 'rejected' && !adminNotes.trim()) {
      setReviewError(isRTL ? 'يرجى كتابة سبب الرفض' : 'Please provide a rejection reason');
      return;
    }
    setIsReviewing(true);
    setReviewError(null);

    const { error } = await (supabase.rpc as any)('admin_review_kyc', {
      p_request_id: selected.id,
      p_decision:   decision,
      p_notes:      adminNotes.trim() || null,
    });

    setIsReviewing(false);
    if (error) {
      setReviewError(error.message);
    } else {
      toast.success(isRTL
        ? (decision === 'verified' ? 'تم قبول الطلب ✓' : 'تم رفض الطلب')
        : (decision === 'verified' ? 'Request approved ✓' : 'Request rejected'));
      setSelected(null);
      fetchRequests();
    }
  }, [selected, adminNotes, isRTL, fetchRequests]);

  // ── Counts ──────────────────────────────────────────────────────────────────
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
      <InnerPageHeader title={isRTL ? 'مراجعة التحقق من الهوية' : 'KYC Verification Review'} />

      <div className="p-4 space-y-4 pb-24">

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {(['pending', 'verified', 'rejected'] as const).map(s => {
            const count = requests.filter(r => r.status === s).length;
            const cfg = STATUS_BADGE[s];
            return (
              <Card
                key={s}
                className={`p-3 text-center cursor-pointer border-2 transition-colors ${
                  filter === s ? 'border-primary' : 'border-transparent'
                }`}
                onClick={() => setFilter(s)}
              >
                <div className={`text-xl font-bold ${
                  s === 'pending' ? 'text-blue-600' :
                  s === 'verified' ? 'text-green-600' : 'text-red-600'
                }`}>{isLoading ? '—' : count}</div>
                <div className="text-xs text-muted-foreground">
                  {isRTL ? cfg.labelAr : cfg.label}
                </div>
              </Card>
            );
          })}
        </div>

        {/* Filter buttons */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'pending', 'verified', 'rejected'] as const).map(f => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? 'default' : 'outline'}
              onClick={() => setFilter(f)}
            >
              {isRTL
                ? (f === 'all' ? 'الكل' : STATUS_BADGE[f].labelAr)
                : (f === 'all' ? 'All' : STATUS_BADGE[f].label)}
            </Button>
          ))}
          <Button size="sm" variant="ghost" onClick={fetchRequests} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* List */}
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))
          : requests.length === 0
          ? (
            <div className="text-center text-muted-foreground py-12">
              <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>{isRTL ? 'لا توجد طلبات' : 'No requests found'}</p>
            </div>
          )
          : requests.map(row => {
              const cfg = STATUS_BADGE[row.status];
              const profile = row.profile;
              return (
                <Card
                  key={row.id}
                  className="p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => openSheet(row)}
                >
                  <Avatar className="w-10 h-10 shrink-0">
                    <AvatarImage src={profile?.avatar_url ?? ''} />
                    <AvatarFallback>{(profile?.name ?? row.full_name).charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{profile?.name ?? row.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      @{profile?.username ?? '—'} ·{' '}
                      {new Date(row.submitted_at).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}
                    </p>
                  </div>
                  <Badge className={`text-xs ${cfg.color}`}>
                    {isRTL ? cfg.labelAr : cfg.label}
                  </Badge>
                </Card>
              );
            })
        }
      </div>

      {/* Detail sheet */}
      <Sheet open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto rounded-t-2xl">
          {selected && (
            <>
              <SheetHeader className="pb-4 border-b">
                <SheetTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  {isRTL ? 'تفاصيل الطلب' : 'Request Details'}
                </SheetTitle>
              </SheetHeader>

              <div className="space-y-4 pt-4">
                {/* User info */}
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={selected.profile?.avatar_url ?? ''} />
                    <AvatarFallback>{selected.full_name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{selected.profile?.name ?? selected.full_name}</p>
                    <p className="text-sm text-muted-foreground">@{selected.profile?.username ?? '—'}</p>
                  </div>
                  <Badge className={`ml-auto ${STATUS_BADGE[selected.status].color}`}>
                    {isRTL ? STATUS_BADGE[selected.status].labelAr : STATUS_BADGE[selected.status].label}
                  </Badge>
                </div>

                {/* Fields */}
                <Card className="p-3 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{isRTL ? 'الاسم:' : 'Name:'}</span>
                    <span className="font-medium">{selected.full_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{isRTL ? 'تاريخ الميلاد:' : 'DOB:'}</span>
                    <span className="font-medium">
                      {new Date(selected.birth_date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{isRTL ? 'تاريخ الإرسال:' : 'Submitted:'}</span>
                    <span className="font-medium">
                      {new Date(selected.submitted_at).toLocaleString(isRTL ? 'ar-SA' : 'en-US')}
                    </span>
                  </div>
                </Card>

                {/* ID image */}
                <div>
                  <p className="text-sm font-medium mb-2">
                    {isRTL ? 'صورة الهوية:' : 'ID Photo:'}
                  </p>
                  <a href={selected.id_image_url} target="_blank" rel="noreferrer">
                    <img
                      src={selected.id_image_url}
                      alt="ID"
                      className="w-full max-h-60 object-cover rounded-lg border cursor-pointer hover:opacity-90 transition-opacity"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <p className="text-xs text-primary mt-1 flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {isRTL ? 'اضغط لعرض بالحجم الكامل' : 'Tap to view full size'}
                    </p>
                  </a>
                </div>

                {/* Admin notes */}
                {selected.status === 'pending' && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      {isRTL ? 'ملاحظات (مطلوبة عند الرفض):' : 'Notes (required for rejection):'}
                    </label>
                    <Textarea
                      value={adminNotes}
                      onChange={e => setAdminNotes(e.target.value)}
                      placeholder={isRTL ? 'سبب القرار...' : 'Reason for decision...'}
                      rows={3}
                    />
                  </div>
                )}

                {/* Existing notes (read-only after review) */}
                {selected.status !== 'pending' && selected.admin_notes && (
                  <Card className="p-3 text-sm bg-muted/30">
                    <p className="text-muted-foreground text-xs mb-1">
                      {isRTL ? 'ملاحظات الأدمن:' : 'Admin notes:'}
                    </p>
                    <p>{selected.admin_notes}</p>
                  </Card>
                )}

                {reviewError && (
                  <Alert variant="destructive" className="py-2">
                    <AlertDescription className="text-sm">{reviewError}</AlertDescription>
                  </Alert>
                )}

                {/* Action buttons */}
                {selected.status === 'pending' && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <Button
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                      onClick={() => handleReview('rejected')}
                      disabled={isReviewing}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      {isRTL ? 'رفض' : 'Reject'}
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleReview('verified')}
                      disabled={isReviewing}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      {isRTL ? 'قبول' : 'Approve'}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
