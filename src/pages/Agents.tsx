/**
 * Agents Page — Browse nearby agents, create reservations, apply as agent.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, MapPin, Star, Shield, TrendingUp, MessageCircle, ChevronRight, Clock, Users } from 'lucide-react';
import { InnerPageHeader } from '@/components/layout/InnerPageHeader';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { useUser } from '@/contexts/UserContext';
import { useBanner } from '@/contexts/BannerContext';
import { useAgents, type AgentProfile, type AgentDetail } from '@/hooks/useAgents';
import { useAgentReservations } from '@/hooks/useAgentReservations';

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-500/15 text-yellow-600 border-yellow-500/30',
  escrow:    'bg-blue-500/15 text-blue-600 border-blue-500/30',
  completed: 'bg-green-500/15 text-green-600 border-green-500/30',
  cancelled: 'bg-muted text-muted-foreground border-border',
  rejected:  'bg-muted text-muted-foreground border-border',
  disputed:  'bg-destructive/15 text-destructive border-destructive/30',
  resolved:  'bg-primary/15 text-primary border-primary/30',
};

const STATUS_LABEL: Record<string, { ar: string; en: string }> = {
  pending:   { ar: 'بانتظار الوكيل', en: 'Awaiting agent' },
  escrow:    { ar: 'Nova محجوز', en: 'Nova in escrow' },
  completed: { ar: 'مكتمل ✓', en: 'Completed ✓' },
  cancelled: { ar: 'ملغي', en: 'Cancelled' },
  rejected:  { ar: 'مرفوض', en: 'Rejected' },
  disputed:  { ar: 'قيد المراجعة', en: 'Under review' },
  resolved:  { ar: 'محلول', en: 'Resolved' },
};

function TrustBadge({ score, lang }: { score: number; lang: string }) {
  const color = score >= 90 ? 'text-green-500' : score >= 70 ? 'text-yellow-500' : 'text-destructive';
  return (
    <span className={`text-[11px] font-bold ${color}`}>
      {lang === 'ar' ? `ثقة ${score}%` : `Trust ${score}%`}
    </span>
  );
}

export default function AgentsPage() {
  const { language } = useLanguage();
  const { user } = useUser();
  const { success: showSuccess, error: showError } = useBanner();
  const navigate = useNavigate();
  const isRTL = language === 'ar';

  const {
    agents, loading: agentsLoading, myAgentProfile,
    searchAgents, fetchMyAgentProfile, getAgentDetail, applyAsAgent,
  } = useAgents();

  const { myReservations, fetchMyReservations, createReservation } = useAgentReservations();

  // Search form
  const [country, setCountry] = useState(user.country || '');
  const [city, setCity] = useState('');

  // Apply-as-agent form
  const [applyShop, setApplyShop]   = useState('');
  const [applyWA, setApplyWA]       = useState('');
  const [applyCity, setApplyCity]   = useState('');
  const [applyBio, setApplyBio]     = useState('');
  const [applying, setApplying]     = useState(false);

  // Create reservation dialog
  const [selectedAgent, setSelectedAgent] = useState<AgentDetail | null>(null);
  const [bookDialogOpen, setBookDialogOpen] = useState(false);
  const [bookType, setBookType]     = useState<'deposit' | 'withdraw'>('deposit');
  const [bookNova, setBookNova]     = useState('');
  const [bookFiat, setBookFiat]     = useState('');
  const [bookNotes, setBookNotes]   = useState('');
  const [booking, setBooking]       = useState(false);

  useEffect(() => {
    fetchMyAgentProfile();
    fetchMyReservations();
    // Initial search with user country
    if (user.country) searchAgents({ country: user.country });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = () => {
    if (!country.trim()) {
      showError(isRTL ? 'أدخل البلد' : 'Enter a country');
      return;
    }
    searchAgents({ country: country.trim(), city: city.trim() || undefined });
  };

  const handleOpenBookDialog = async (agent: AgentProfile) => {
    const detail = await getAgentDetail(agent.id);
    if (!detail) {
      showError(isRTL ? 'تعذّر تحميل بيانات الوكيل' : 'Failed to load agent');
      return;
    }
    setSelectedAgent(detail);
    setBookType('deposit');
    setBookNova('');
    setBookFiat('');
    setBookNotes('');
    setBookDialogOpen(true);
  };

  const handleBook = async () => {
    if (!selectedAgent) return;
    const novaAmt = parseFloat(bookNova);
    if (!bookNova || isNaN(novaAmt) || novaAmt <= 0) {
      showError(isRTL ? 'أدخل كمية Nova صحيحة' : 'Enter a valid Nova amount');
      return;
    }
    if (bookType === 'withdraw' && novaAmt > user.novaBalance) {
      showError(isRTL ? 'رصيد Nova غير كافٍ' : 'Insufficient Nova balance');
      return;
    }
    setBooking(true);
    const result = await createReservation({
      agent_id:     selectedAgent.id,
      type:         bookType,
      nova_amount:  novaAmt,
      fiat_amount:  bookFiat ? parseFloat(bookFiat) : undefined,
      notes:        bookNotes || undefined,
    });
    setBooking(false);
    if (!result.success) {
      showError(result.error ?? (isRTL ? 'فشل الحجز' : 'Failed to create reservation'));
      return;
    }
    showSuccess(isRTL ? '✅ تم إنشاء الحجز — انتظر موافقة الوكيل' : '✅ Reservation created — awaiting agent');
    setBookDialogOpen(false);
    fetchMyReservations();
    if (result.reservation_id) navigate(`/agents/r/${result.reservation_id}`);
  };

  const handleApply = async () => {
    if (!applyShop.trim() || !applyWA.trim() || !country.trim() || !applyCity.trim()) {
      showError(isRTL ? 'أكمل جميع الحقول المطلوبة' : 'Fill all required fields');
      return;
    }
    setApplying(true);
    const result = await applyAsAgent({
      shop_name: applyShop,
      whatsapp:  applyWA,
      country:   country || user.country,
      city:      applyCity,
      bio:       applyBio || undefined,
    });
    setApplying(false);
    if (!result.success) {
      showError(result.error ?? (isRTL ? 'فشل التقديم' : 'Application failed'));
      return;
    }
    showSuccess(isRTL ? '✅ تم إرسال طلبك — سيراجعه الفريق' : '✅ Application submitted for review');
    fetchMyAgentProfile();
  };

  const commission = selectedAgent
    ? parseFloat(bookNova || '0') * (selectedAgent.commission_pct / 100)
    : 0;
  const net = parseFloat(bookNova || '0') - commission;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <InnerPageHeader title={isRTL ? 'الوكلاء' : 'Agents'} />
      <main className="flex-1 px-4 py-4 pb-20 space-y-4">

        <Tabs defaultValue="browse">
          <TabsList className="w-full grid grid-cols-3 h-9">
            <TabsTrigger value="browse" className="text-xs">
              {isRTL ? '🔍 بحث' : '🔍 Browse'}
            </TabsTrigger>
            <TabsTrigger value="reservations" className="text-xs">
              {isRTL ? '📋 حجوزاتي' : '📋 My Bookings'}
            </TabsTrigger>
            <TabsTrigger value="apply" className="text-xs">
              {isRTL ? '🏪 وكيل' : '🏪 Agent'}
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Browse Agents ─────────────────────────────────────── */}
          <TabsContent value="browse" className="space-y-3 mt-3">
            {/* Search bar */}
            <Card className="p-3">
              <div className="flex gap-2">
                <Input
                  placeholder={isRTL ? 'البلد' : 'Country'}
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="flex-1 h-9 text-sm"
                />
                <Input
                  placeholder={isRTL ? 'المدينة (اختياري)' : 'City (optional)'}
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="flex-1 h-9 text-sm"
                />
                <Button size="sm" onClick={handleSearch} className="h-9 px-3">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </Card>

            {agentsLoading && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {isRTL ? 'جارٍ البحث...' : 'Searching...'}
              </div>
            )}

            {!agentsLoading && agents.length === 0 && (
              <Card className="p-8 text-center">
                <MapPin className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'لا يوجد وكلاء في هذه المنطقة' : 'No agents in this area'}
                </p>
              </Card>
            )}

            {agents.map((agent, i) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    {/* Agent header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground truncate">{agent.shop_name}</p>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">{agent.city}, {agent.country}</span>
                          {agent.distance_km != null && (
                            <span className="text-primary font-medium">· {agent.distance_km} km</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-bold">{agent.avg_rating.toFixed(1)}</span>
                          <span className="text-xs text-muted-foreground">({agent.total_reviews})</span>
                        </div>
                        <TrustBadge score={agent.trust_score} lang={language} />
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-muted/40 rounded-lg p-2">
                        <p className="text-base font-bold text-foreground">{agent.total_completed}</p>
                        <p className="text-[10px] text-muted-foreground">{isRTL ? 'عملية' : 'Ops'}</p>
                      </div>
                      <div className="bg-nova/5 border border-nova/20 rounded-lg p-2">
                        <p className="text-base font-bold text-nova">{agent.commission_pct}%</p>
                        <p className="text-[10px] text-muted-foreground">{isRTL ? 'عمولة' : 'Fee'}</p>
                      </div>
                      <div className="bg-muted/40 rounded-lg p-2">
                        <Shield className="h-4 w-4 mx-auto mb-0.5 text-green-500" />
                        <p className="text-[10px] text-muted-foreground">{isRTL ? 'موثّق' : 'Verified'}</p>
                      </div>
                    </div>

                    {agent.bio && (
                      <p className="text-xs text-muted-foreground leading-relaxed">{agent.bio}</p>
                    )}

                    {/* CTA */}
                    <Button
                      className="w-full h-10 font-bold"
                      onClick={() => handleOpenBookDialog(agent)}
                    >
                      {isRTL ? '📋 احجز الآن' : '📋 Book Now'}
                      <ChevronRight className="h-4 w-4 ms-1" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </TabsContent>

          {/* ── Tab 2: My Reservations ───────────────────────────────────── */}
          <TabsContent value="reservations" className="space-y-3 mt-3">
            {myReservations.length === 0 ? (
              <Card className="p-8 text-center">
                <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  {isRTL ? 'لا توجد حجوزات بعد' : 'No reservations yet'}
                </p>
              </Card>
            ) : (
              myReservations.map((r) => (
                <Card
                  key={r.id}
                  className="overflow-hidden cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => navigate(`/agents/r/${r.id}`)}
                >
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm">{r.shop_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.type === 'deposit'
                            ? (isRTL ? 'إيداع' : 'Deposit')
                            : (isRTL ? 'سحب' : 'Withdraw')}
                          {' · '}И {r.nova_amount}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[r.status] ?? ''}`}>
                          {STATUS_LABEL[r.status]?.[isRTL ? 'ar' : 'en'] ?? r.status}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* ── Tab 3: Apply as Agent ────────────────────────────────────── */}
          <TabsContent value="apply" className="space-y-3 mt-3">
            {myAgentProfile?.found ? (
              <Card className="p-5 text-center space-y-3">
                <p className="text-2xl">
                  {myAgentProfile.status === 'pending'    ? '⏳'
                   : myAgentProfile.status === 'verified' ? '✅'
                   : '🚫'}
                </p>
                <p className="font-bold text-foreground">
                  {myAgentProfile.status === 'pending'
                    ? (isRTL ? 'طلبك قيد المراجعة' : 'Application under review')
                    : myAgentProfile.status === 'verified'
                    ? (isRTL ? 'أنت وكيل معتمد ✓' : 'You are a verified agent ✓')
                    : (isRTL ? 'حساب الوكيل موقوف' : 'Agent account suspended')}
                </p>
                {myAgentProfile.status === 'verified' && (
                  <>
                    <div className="flex justify-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="font-bold text-lg">{myAgentProfile.total_completed ?? 0}</p>
                        <p className="text-muted-foreground text-xs">{isRTL ? 'عملية' : 'Operations'}</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-lg text-yellow-500">
                          {myAgentProfile.avg_rating?.toFixed(1) ?? '0.0'} ⭐
                        </p>
                        <p className="text-muted-foreground text-xs">{isRTL ? 'تقييم' : 'Rating'}</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-lg text-green-500">
                          {myAgentProfile.trust_score ?? 100}%
                        </p>
                        <p className="text-muted-foreground text-xs">{isRTL ? 'ثقة' : 'Trust'}</p>
                      </div>
                    </div>
                    <Button onClick={() => navigate('/agent-dashboard')} className="w-full">
                      {isRTL ? 'لوحة التحكم' : 'My Dashboard'}
                      <ChevronRight className="h-4 w-4 ms-1" />
                    </Button>
                  </>
                )}
              </Card>
            ) : (
              <Card className="p-4 space-y-4">
                <div className="text-center">
                  <p className="text-2xl mb-1">🏪</p>
                  <p className="font-bold text-foreground">
                    {isRTL ? 'أصبح وكيلاً في WeNova' : 'Become a WeNova Agent'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isRTL
                      ? 'ساعد المستخدمين في شحن وسحب Nova واكسب عمولة على كل عملية'
                      : 'Help users deposit/withdraw Nova and earn commission on every operation'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Input
                    placeholder={isRTL ? 'اسم المحل *' : 'Shop name *'}
                    value={applyShop}
                    onChange={(e) => setApplyShop(e.target.value)}
                    className="h-10"
                  />
                  <Input
                    placeholder={isRTL ? 'رقم واتساب *' : 'WhatsApp number *'}
                    value={applyWA}
                    onChange={(e) => setApplyWA(e.target.value)}
                    className="h-10"
                    dir="ltr"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder={isRTL ? 'البلد *' : 'Country *'}
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="h-10"
                    />
                    <Input
                      placeholder={isRTL ? 'المدينة *' : 'City *'}
                      value={applyCity}
                      onChange={(e) => setApplyCity(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <Input
                    placeholder={isRTL ? 'نبذة عنك (اختياري)' : 'Bio (optional)'}
                    value={applyBio}
                    onChange={(e) => setApplyBio(e.target.value)}
                    className="h-10"
                  />
                </div>

                <Button
                  className="w-full h-11 font-bold"
                  onClick={handleApply}
                  disabled={applying}
                >
                  {applying
                    ? <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                    : (isRTL ? 'قدّم طلبك الآن' : 'Submit Application')}
                </Button>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <BottomNav />

      {/* ── Book Reservation Dialog ───────────────────────────────────────── */}
      <Dialog open={bookDialogOpen} onOpenChange={setBookDialogOpen}>
        <DialogContent className="max-w-sm">
          {selectedAgent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span>{selectedAgent.shop_name}</span>
                  <TrustBadge score={selectedAgent.trust_score} lang={language} />
                </DialogTitle>
                <DialogDescription className="flex items-center gap-3 text-xs mt-1">
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    {selectedAgent.avg_rating.toFixed(1)} ({selectedAgent.total_reviews})
                  </span>
                  <span>·</span>
                  <span>{selectedAgent.total_completed} {isRTL ? 'عملية' : 'ops'}</span>
                  <span>·</span>
                  <span className="text-nova font-medium">
                    {selectedAgent.commission_pct}% {isRTL ? 'عمولة' : 'fee'}
                  </span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 mt-2">
                {/* Type selector */}
                <div className="grid grid-cols-2 gap-2">
                  {(['deposit', 'withdraw'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setBookType(t)}
                      className={`p-3 rounded-lg border text-sm font-medium transition-colors text-center ${
                        bookType === t
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'bg-muted/40 border-border text-muted-foreground'
                      }`}
                    >
                      {t === 'deposit'
                        ? (isRTL ? '📥 إيداع\nشراء Nova' : '📥 Deposit\nBuy Nova')
                        : (isRTL ? '📤 سحب\nبيع Nova' : '📤 Withdraw\nSell Nova')}
                    </button>
                  ))}
                </div>

                {/* Nova amount */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    {isRTL ? 'كمية Nova *' : 'Nova Amount *'}
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={bookNova}
                    onChange={(e) => setBookNova(e.target.value)}
                    className="h-10"
                    min="1"
                    dir="ltr"
                  />
                  {bookType === 'withdraw' && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {isRTL ? 'رصيدك: ' : 'Balance: '}
                      <span className="text-nova font-medium">И {user.novaBalance}</span>
                    </p>
                  )}
                </div>

                {/* Fiat amount (optional) */}
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    {isRTL ? 'المبلغ النقدي (اختياري)' : 'Fiat Amount (optional)'}
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={bookFiat}
                    onChange={(e) => setBookFiat(e.target.value)}
                    className="h-10"
                    dir="ltr"
                  />
                </div>

                {/* Commission breakdown */}
                {parseFloat(bookNova) > 0 && (
                  <div className="bg-muted/30 rounded-lg p-3 space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{isRTL ? 'المبلغ:' : 'Amount:'}</span>
                      <span className="font-medium">И {parseFloat(bookNova).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        {isRTL ? `عمولة (${selectedAgent.commission_pct}%):` : `Fee (${selectedAgent.commission_pct}%):`}
                      </span>
                      <span className="text-destructive">−И {commission.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1.5">
                      <span className="font-semibold">{isRTL ? 'الصافي:' : 'Net:'}</span>
                      <span className="font-bold text-nova">И {net.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {/* Notes */}
                <Input
                  placeholder={isRTL ? 'ملاحظات (اختياري)' : 'Notes (optional)'}
                  value={bookNotes}
                  onChange={(e) => setBookNotes(e.target.value)}
                  className="h-10"
                />

                <Button
                  className="w-full h-11 font-bold"
                  onClick={handleBook}
                  disabled={booking || !bookNova}
                >
                  {booking
                    ? <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                    : (isRTL ? 'تأكيد الحجز 📋' : 'Confirm Booking 📋')}
                </Button>

                {selectedAgent.whatsapp && (
                  <a
                    href={`https://wa.me/${selectedAgent.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 text-xs text-green-600 hover:underline"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    {isRTL ? 'تواصل مع الوكيل على واتساب' : 'Contact agent on WhatsApp'}
                  </a>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
