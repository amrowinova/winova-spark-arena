/**
 * AdminFamilies — Manage family registration requests.
 * Features: approve/reject with optional note, edit need_score, view details
 */
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Heart, MapPin, Users, Clock, Loader2, RefreshCw, Sliders } from 'lucide-react';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBanner } from '@/contexts/BannerContext';
import { supabase } from '@/integrations/supabase/client';

interface FamilyRequest {
  id: string;
  submitted_by: string;
  head_name: string;
  country: string;
  city: string;
  story: string;
  members_count: number;
  contact_phone: string | null;
  photo_urls: string[];
  status: 'pending' | 'approved' | 'rejected';
  admin_note: string | null;
  reviewed_at: string | null;
  created_at: string;
}

const STATUS_BADGE: Record<string, string> = {
  pending:  'bg-yellow-500/15 text-yellow-600 border-yellow-500/30',
  approved: 'bg-green-500/15 text-green-600 border-green-500/30',
  rejected: 'bg-red-500/15 text-red-600 border-red-500/30',
};
const STATUS_LABEL: Record<string, string> = {
  pending: 'في الانتظار', approved: 'مقبول', rejected: 'مرفوض',
};

export default function AdminFamilies() {
  const { language } = useLanguage();
  const { success: showSuccess, error: showError } = useBanner();
  const isRTL = language === 'ar';

  const [requests, setRequests] = useState<FamilyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [selected, setSelected] = useState<FamilyRequest | null>(null);
  const [note, setNote] = useState('');
  const [needScore, setNeedScore] = useState(70);
  const [processing, setProcessing] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('family_requests')
      .select('*')
      .order('created_at', { ascending: false });
    setRequests((data as FamilyRequest[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { void fetchRequests(); }, [fetchRequests]);

  const handleAction = async (action: 'approve' | 'reject') => {
    if (!selected) return;
    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc('admin_review_family_request', {
        p_request_id: selected.id,
        p_action:     action,
        p_note:       note.trim() || null,
        p_need_score: needScore,
      });
      if (error) throw error;
      const result = data as { success: boolean; error?: string };
      if (!result.success) throw new Error(result.error);

      showSuccess(action === 'approve' ? '✅ تم قبول الطلب' : '❌ تم رفض الطلب');
      setSelected(null);
      setNote('');
      setNeedScore(70);
      await fetchRequests();
    } catch (err) {
      showError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setProcessing(false);
      setActionType(null);
    }
  };

  const filtered = requests.filter((r) => r.status === activeTab);

  return (
    <div className="min-h-screen bg-background pb-10" dir={isRTL ? 'rtl' : 'ltr'}>
      <InnerPageHeader
        title="إدارة طلبات العائلات"
        rightAction={
          <Button variant="ghost" size="icon" onClick={fetchRequests}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        }
      />

      <div className="px-4 pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-3 mb-4">
            {['pending', 'approved', 'rejected'].map((s) => (
              <TabsTrigger key={s} value={s} className="text-xs">
                {STATUS_LABEL[s]}
                <Badge variant="secondary" className="ms-1 text-[10px]">
                  {requests.filter((r) => r.status === s).length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          {['pending', 'approved', 'rejected'].map((tab) => (
            <TabsContent key={tab} value={tab} className="space-y-3">
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-14 text-muted-foreground">
                  <Heart className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>لا توجد طلبات</p>
                </div>
              ) : (
                filtered.map((req) => (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-card border border-border rounded-xl p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-bold">{req.head_name}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <MapPin className="h-3 w-3" />
                          {req.city}, {req.country}
                          <span className="mx-1">·</span>
                          <Users className="h-3 w-3" />
                          {req.members_count} أفراد
                        </div>
                      </div>
                      <Badge className={`text-[10px] border ${STATUS_BADGE[req.status]}`}>
                        {STATUS_LABEL[req.status]}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-2">{req.story}</p>

                    {req.photo_urls?.length > 0 && (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {req.photo_urls.slice(0, 3).map((url, i) => (
                          <img key={i} src={url} alt="" className="h-14 w-20 object-cover rounded-lg flex-shrink-0" />
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(req.created_at).toLocaleDateString('ar-SA')}
                      </span>
                      {req.contact_phone && <span>📞 {req.contact_phone}</span>}
                    </div>

                    {req.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm" className="flex-1 gap-1 bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => { setSelected(req); setActionType('approve'); }}
                        >
                          <CheckCircle2 className="h-4 w-4" /> قبول
                        </Button>
                        <Button
                          size="sm" variant="destructive" className="flex-1 gap-1"
                          onClick={() => { setSelected(req); setActionType('reject'); }}
                        >
                          <XCircle className="h-4 w-4" /> رفض
                        </Button>
                      </div>
                    )}
                    {req.admin_note && (
                      <p className="text-xs bg-muted rounded-lg p-2 text-muted-foreground">
                        📝 {req.admin_note}
                      </p>
                    )}
                  </motion.div>
                ))
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Action Dialog */}
      <Dialog open={!!selected && !!actionType} onOpenChange={(v) => { if (!v) { setSelected(null); setActionType(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'approve' ? (
                <><CheckCircle2 className="h-5 w-5 text-green-500" /> قبول الطلب</>
              ) : (
                <><XCircle className="h-5 w-5 text-destructive" /> رفض الطلب</>
              )}
            </DialogTitle>
            <DialogDescription>{selected?.head_name} — {selected?.city}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {actionType === 'approve' && (
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5" />
                  درجة الاحتياج (0-100)
                </Label>
                <div className="flex items-center gap-3">
                  <input
                    type="range" min={0} max={100} value={needScore}
                    onChange={(e) => setNeedScore(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="w-10 text-center font-bold text-sm">{needScore}</span>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>ملاحظة {actionType === 'reject' ? '(سبب الرفض)' : '(اختياري)'}</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="اكتب ملاحظة أو سبب..."
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setSelected(null); setActionType(null); }}>
                إلغاء
              </Button>
              <Button
                className={`flex-1 ${actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-destructive hover:bg-destructive/90'} text-white`}
                onClick={() => handleAction(actionType!)}
                disabled={processing}
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : (actionType === 'approve' ? 'قبول' : 'رفض')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
