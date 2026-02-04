import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Engineering Team Analysis Topics - Backend & Data Integrity Focus
const ANALYSIS_TOPICS = [
  {
    id: 'database_integrity',
    topic: 'Database Schema & Data Integrity Analysis',
    topicAr: 'تحليل سلامة قاعدة البيانات والبيانات',
    agents: ['system_architect', 'database_integrity_engineer', 'backend_core_engineer', 'challenger_ai'],
    prompt: `تحليل عميق لقاعدة البيانات:
- راجع العلاقات والـ Foreign Keys
- ابحث عن Orphan Records
- تحقق من RLS Policies coverage
- راجع Indexes والـ Performance
- ابحث عن Data Type mismatches
⚠️ تذكر: أي اقتراح = Proposal يحتاج موافقة Admin`
  },
  {
    id: 'wallet_financial_integrity',
    topic: 'Wallet & Financial Ledger Integrity',
    topicAr: 'سلامة المحفظة والسجل المالي',
    agents: ['wallet_p2p_engineer', 'database_integrity_engineer', 'security_fraud_engineer', 'challenger_ai'],
    prompt: `تحليل سلامة النظام المالي:
- تحقق من تطابق wallet_ledger مع wallets.balances
- ابحث عن أي discrepancies في الأرصدة
- راجع الـ RPCs المالية (atomicity)
- تحقق من سلامة escrow في P2P
- ابحث عن race conditions في التحويلات
⚠️ تذكر: أي اقتراح = Proposal يحتاج موافقة Admin`
  },
  {
    id: 'p2p_state_machine',
    topic: 'P2P Order State Machine Analysis',
    topicAr: 'تحليل آلة حالة طلبات P2P',
    agents: ['wallet_p2p_engineer', 'backend_core_engineer', 'security_fraud_engineer', 'challenger_ai'],
    prompt: `تحليل نظام P2P:
- راجع status transitions logic
- تحقق من timer expiration handling
- ابحث عن disputes غير محلولة
- راجع escrow release conditions
- تحقق من edge cases في الـ flow
⚠️ تذكر: أي اقتراح = Proposal يحتاج موافقة Admin`
  },
  {
    id: 'security_rls_audit',
    topic: 'Security & RLS Policies Audit',
    topicAr: 'تدقيق الأمان وسياسات RLS',
    agents: ['security_fraud_engineer', 'database_integrity_engineer', 'system_architect', 'challenger_ai'],
    prompt: `تدقيق أمني شامل:
- راجع جميع RLS policies
- ابحث عن exposed data endpoints
- تحقق من privilege escalation vectors
- راجع auth flows وصلاحيات الأدوار
- ابحث عن data leakage possibilities
⚠️ تذكر: أي اقتراح = Proposal يحتاج موافقة Admin`
  },
  {
    id: 'backend_rpc_review',
    topic: 'Backend RPCs & Edge Functions Review',
    topicAr: 'مراجعة RPCs و Edge Functions',
    agents: ['backend_core_engineer', 'system_architect', 'wallet_p2p_engineer', 'challenger_ai'],
    prompt: `مراجعة الـ Backend:
- راجع جميع RPCs المالية
- تحقق من atomicity كل عملية
- ابحث عن error handling gaps
- راجع input validation
- تحقق من performance bottlenecks
⚠️ تذكر: أي اقتراح = Proposal يحتاج موافقة Admin`
  },
  {
    id: 'frontend_state_sync',
    topic: 'Frontend State & Backend Sync',
    topicAr: 'تزامن حالة الواجهة مع Backend',
    agents: ['frontend_systems_engineer', 'backend_core_engineer', 'system_architect', 'challenger_ai'],
    prompt: `تحليل تزامن الواجهة:
- راجع cache invalidation logic
- ابحث عن stale data scenarios
- تحقق من optimistic update rollbacks
- راجع realtime subscription handling
- ابحث عن race conditions في UI state
⚠️ تذكر: أي اقتراح = Proposal يحتاج موافقة Admin`
  },
  {
    id: 'admin_audit_trail',
    topic: 'Admin Operations & Audit Trail',
    topicAr: 'عمليات الإدارة وسجل التدقيق',
    agents: ['admin_panel_engineer', 'security_fraud_engineer', 'database_integrity_engineer', 'challenger_ai'],
    prompt: `تدقيق نظام الإدارة:
- راجع admin audit logging completeness
- تحقق من bulk operations safety
- ابحث عن missing audit entries
- راجع support staff permissions
- تحقق من moderation workflows
⚠️ تذكر: أي اقتراح = Proposal يحتاج موافقة Admin`
  },
  {
    id: 'system_architecture',
    topic: 'System Architecture & Technical Debt',
    topicAr: 'البنية العامة والديون التقنية',
    agents: ['system_architect', 'backend_core_engineer', 'frontend_systems_engineer', 'challenger_ai'],
    prompt: `مراجعة البنية العامة:
- حدد Technical Debt priorities
- راجع scalability concerns
- ابحث عن tight coupling issues
- تحقق من separation of concerns
- حلل dependency management
⚠️ تذكر: أي اقتراح = Proposal يحتاج موافقة Admin`
  },
  // ============ SCREEN-SPECIFIC TOPICS ============
  {
    id: 'screen_home_analysis',
    topic: 'Home Screen Logic & Data Flow Analysis',
    topicAr: 'تحليل منطق وبيانات شاشة الرئيسية',
    agents: ['screen_home_owner', 'frontend_systems_engineer', 'database_integrity_engineer', 'challenger_ai'],
    prompt: `تحليل شاشة الرئيسية:
- راجع ActiveUsersCard وصحة عداد المستخدمين
- تحقق من تزامن بيانات الترتيب (Leaderboard)
- ابحث عن تأخر في تحديث بطاقات المسابقات
- راجع navigation flow وحالات الخطأ
- تحقق من realtime subscriptions
⚠️ تذكر: أي اقتراح = Proposal يحتاج موافقة Admin`
  },
  {
    id: 'screen_wallet_analysis',
    topic: 'Wallet Screen Logic & Ledger Sync Analysis',
    topicAr: 'تحليل شاشة المحفظة وتزامن السجل',
    agents: ['screen_wallet_owner', 'wallet_p2p_engineer', 'database_integrity_engineer', 'challenger_ai'],
    prompt: `تحليل شاشة المحفظة:
- راجع دقة عرض الأرصدة (Nova, Aura, Locked)
- تحقق من تزامن wallet_ledger مع الـ UI
- ابحث عن race conditions عند التحويل
- راجع حالات frozen wallet في الواجهة
- تحقق من تحديثات الـ transaction history
⚠️ تذكر: أي اقتراح = Proposal يحتاج موافقة Admin`
  },
  {
    id: 'screen_p2p_analysis',
    topic: 'P2P Marketplace Screen Analysis',
    topicAr: 'تحليل شاشة سوق P2P',
    agents: ['screen_p2p_owner', 'wallet_p2p_engineer', 'backend_core_engineer', 'challenger_ai'],
    prompt: `تحليل شاشة P2P Marketplace:
- راجع فلترة الطلبات حسب البلد
- تحقق من عرض حالات الطلبات الصحيحة
- ابحث عن مشاكل في إنشاء طلبات جديدة
- راجع تحديث الأسعار والـ exchange rates
- تحقق من حالات عدم وجود طلبات
⚠️ تذكر: أي اقتراح = Proposal يحتاج موافقة Admin`
  },
  {
    id: 'screen_p2p_chat_analysis',
    topic: 'P2P Chat & Order Flow Analysis',
    topicAr: 'تحليل شات P2P وتدفق الطلبات',
    agents: ['screen_p2p_chat_owner', 'wallet_p2p_engineer', 'security_fraud_engineer', 'challenger_ai'],
    prompt: `تحليل شاشة P2P Chat:
- راجع payment steps flow ودقتها
- تحقق من عرض timer countdown
- ابحث عن مشاكل في رفع ملفات النزاع
- راجع action buttons لكل حالة
- تحقق من رسائل النظام التلقائية
⚠️ تذكر: أي اقتراح = Proposal يحتاج موافقة Admin`
  },
  {
    id: 'screen_dm_chat_analysis',
    topic: 'DM Chat & Messaging Logic Analysis',
    topicAr: 'تحليل الرسائل المباشرة والمحادثات',
    agents: ['screen_dm_chat_owner', 'frontend_systems_engineer', 'backend_core_engineer', 'challenger_ai'],
    prompt: `تحليل شاشة الرسائل:
- راجع message delivery وread receipts
- تحقق من ترتيب المحادثات
- ابحث عن مشاكل في realtime sync
- راجع typing indicators ودقتها
- تحقق من حالات offline/reconnect
⚠️ تذكر: أي اقتراح = Proposal يحتاج موافقة Admin`
  },
  {
    id: 'screen_contests_analysis',
    topic: 'Contests Screen Logic & Voting Analysis',
    topicAr: 'تحليل شاشة المسابقات والتصويت',
    agents: ['screen_contests_owner', 'wallet_p2p_engineer', 'database_integrity_engineer', 'challenger_ai'],
    prompt: `تحليل شاشة المسابقات:
- راجع entry requirements والتحقق منها
- تحقق من voting mechanics وخصم Aura
- ابحث عن مشاكل في حساب الفائزين
- راجع timer accuracy وانتهاء المسابقة
- تحقق من prize distribution logic
⚠️ تذكر: أي اقتراح = Proposal يحتاج موافقة Admin`
  },
  {
    id: 'screen_profile_analysis',
    topic: 'Profile Screen Data & Stats Analysis',
    topicAr: 'تحليل شاشة البروفايل والإحصائيات',
    agents: ['screen_profile_owner', 'database_integrity_engineer', 'frontend_systems_engineer', 'challenger_ai'],
    prompt: `تحليل شاشة البروفايل:
- راجع دقة عرض الإحصائيات
- تحقق من followers/following sync
- ابحث عن مشاكل في P2P reputation display
- راجع wins history وصحتها
- تحقق من profile edit flow
⚠️ تذكر: أي اقتراح = Proposal يحتاج موافقة Admin`
  },
  {
    id: 'screen_team_analysis',
    topic: 'Team Screen Hierarchy & Referral Analysis',
    topicAr: 'تحليل شاشة الفريق والإحالات',
    agents: ['screen_team_owner', 'database_integrity_engineer', 'backend_core_engineer', 'challenger_ai'],
    prompt: `تحليل شاشة الفريق:
- راجع team hierarchy accuracy
- تحقق من referral chains وصحتها
- ابحث عن مشاكل في rank progression display
- راجع activity percentages calculations
- تحقق من direct vs indirect members
⚠️ تذكر: أي اقتراح = Proposal يحتاج موافقة Admin`
  },
  {
    id: 'screen_admin_analysis',
    topic: 'Admin Panel Workflows & Safety Analysis',
    topicAr: 'تحليل لوحة التحكم وسلامة العمليات',
    agents: ['screen_admin_owner', 'admin_panel_engineer', 'security_fraud_engineer', 'challenger_ai'],
    prompt: `تحليل لوحة التحكم:
- راجع bulk operations وسلامتها
- تحقق من audit trail completeness
- ابحث عن missing admin actions
- راجع role permissions في الواجهة
- تحقق من user management workflows
⚠️ تذكر: أي اقتراح = Proposal يحتاج موافقة Admin`
  },
];

// Engineering Agent Prompts - Focus on Analysis & Proposals Only
const AGENT_PROMPTS: Record<string, string> = {
  system_architect: `أنت مهندس النظام الرئيسي. ركز على:
- التصميم الكلي والتوافق بين المكونات
- قابلية التوسع والاستدامة
- تقليل التعقيد والـ Technical Debt
- أنماط التكامل الصحيحة
⚠️ دورك: تحليل + اقتراح فقط. لا تنفيذ.`,

  backend_core_engineer: `أنت مهندس Backend الأساسي. ركز على:
- سلامة الـ RPCs و Edge Functions
- Atomicity في كل عملية
- Error Handling الشامل
- Performance optimization
⚠️ دورك: تحليل + اقتراح فقط. لا تنفيذ.`,

  database_integrity_engineer: `أنت مهندس سلامة البيانات. ركز على:
- Schema consistency
- RLS Policies coverage
- Referential Integrity
- Orphan Records prevention
- Query optimization
⚠️ دورك: تحليل + اقتراح فقط. لا تنفيذ.`,

  security_fraud_engineer: `أنت مهندس الأمان ومكافحة الاحتيال. ركز على:
- ثغرات الوصول غير المصرح
- Data exposure risks
- Privilege escalation vectors
- Fraud patterns detection
- Complete audit logging
⚠️ دورك: تحليل + اقتراح فقط. لا تنفيذ.`,

  wallet_p2p_engineer: `أنت مهندس المحفظة والتداول. ركز على:
- سلامة الأرصدة وتطابق الـ Ledger
- Escrow safety في P2P
- Financial atomicity
- Balance reconciliation
- Race conditions في التحويلات
⚠️ دورك: تحليل + اقتراح فقط. لا تنفيذ.`,

  frontend_systems_engineer: `أنت مهندس أنظمة الواجهة (ليس مصمم). ركز على:
- State management consistency
- Cache invalidation
- Data sync with backend
- Error recovery flows
- Realtime subscription handling
⚠️ دورك: تحليل + اقتراح فقط. لا تنفيذ.`,

  admin_panel_engineer: `أنت مهندس لوحة التحكم. ركز على:
- Admin workflow completeness
- Audit trail coverage
- Bulk operations safety
- Support tools effectiveness
- Moderation workflows
⚠️ دورك: تحليل + اقتراح فقط. لا تنفيذ.`,

  challenger_ai: `أنت الذكاء المعارض - دورك الأساسي:
- تحدي كل افتراض وحل مقترح
- طرح أسوأ السيناريوهات (What Could Go Wrong)
- كشف Edge Cases غير المعالجة
- كسر المنطق الذي يبدو صحيحاً
- لا توافق بسهولة، ابحث عن الثغرات
⚠️ دورك: تحدي + نقد بناء. لا تنفيذ.`,

  // ============ SCREEN OWNERS PROMPTS ============
  screen_home_owner: `أنت مالك شاشة الرئيسية (Home). أنت تفهم كل التفاصيل:
- ActiveUsersCard: كيف يحسب العداد من presence
- Rankings: تزامن الترتيب مع profiles.spotlight_points
- Contest Cards: عرض المسابقات النشطة والقادمة
- Navigation: التنقل للشاشات الأخرى
- Data Flow: ما يأتي من Backend وكيف يُعرض
⚠️ دورك: اكتشاف مشاكل حقيقية في منطق الشاشة. لا تنفيذ.`,

  screen_wallet_owner: `أنت مالك شاشة المحفظة (Wallet). أنت تفهم كل التفاصيل:
- Balances: nova_balance, aura_balance, locked_nova_balance
- Ledger Sync: wallet_ledger entries وتطابقها
- Transaction History: عرض العمليات السابقة
- Frozen States: كيف تظهر المحفظة المجمدة
- Transfer Flow: تحويل Nova بين المستخدمين
⚠️ دورك: اكتشاف مشاكل حقيقية في منطق الشاشة. لا تنفيذ.`,

  screen_p2p_owner: `أنت مالك شاشة P2P Marketplace. أنت تفهم كل التفاصيل:
- Order Cards: عرض الطلبات المتاحة
- Country Filter: فلترة حسب wallet_country
- Create Order: إنشاء طلب buy/sell جديد
- Status Display: حالات الطلبات وألوانها
- Exchange Rates: الأسعار وحساب المبالغ
⚠️ دورك: اكتشاف مشاكل حقيقية في منطق الشاشة. لا تنفيذ.`,

  screen_p2p_chat_owner: `أنت مالك شاشة P2P Chat. أنت تفهم كل التفاصيل:
- Payment Steps: خطوات الدفع حسب الدور (buyer/seller)
- Timer Countdown: العد التنازلي وانتهاء الوقت
- Action Buttons: أزرار التأكيد والإلغاء والنزاع
- Dispute Files: رفع ملفات إثبات
- System Messages: الرسائل التلقائية
⚠️ دورك: اكتشاف مشاكل حقيقية في منطق الشاشة. لا تنفيذ.`,

  screen_dm_chat_owner: `أنت مالك شاشة الرسائل المباشرة (DM). أنت تفهم كل التفاصيل:
- Conversations List: ترتيب المحادثات
- Message Delivery: إرسال واستلام الرسائل
- Read Receipts: is_read و delivered_at
- Typing Indicators: مؤشر الكتابة
- Realtime Sync: التحديث الفوري
⚠️ دورك: اكتشاف مشاكل حقيقية في منطق الشاشة. لا تنفيذ.`,

  screen_contests_owner: `أنت مالك شاشة المسابقات (Contests). أنت تفهم كل التفاصيل:
- Entry Requirements: شروط الدخول (entry_fee, max_participants)
- Voting Logic: التصويت وخصم aura_spent
- Timer Accuracy: توقيت البداية والنهاية
- Winner Calculation: حساب الفائزين والترتيب
- Prize Distribution: توزيع الجوائز
⚠️ دورك: اكتشاف مشاكل حقيقية في منطق الشاشة. لا تنفيذ.`,

  screen_profile_owner: `أنت مالك شاشة البروفايل (Profile). أنت تفهم كل التفاصيل:
- User Stats: النقاط والترتيب والفعالية
- Followers/Following: follows table وعرضها
- P2P Reputation: p2p_ratings وحساب السمعة
- Wins History: المسابقات التي فاز بها
- Profile Edit: تعديل البيانات الشخصية
⚠️ دورك: اكتشاف مشاكل حقيقية في منطق الشاشة. لا تنفيذ.`,

  screen_team_owner: `أنت مالك شاشة الفريق (Team). أنت تفهم كل التفاصيل:
- Team Hierarchy: team_members وعلاقة leader/member
- Referral Logic: referred_by وسلسلة الإحالات
- Rank Display: عرض رتب الأعضاء
- Activity Percentages: حساب نسبة النشاط
- Direct vs Indirect: الفرق بين المستويات
⚠️ دورك: اكتشاف مشاكل حقيقية في منطق الشاشة. لا تنفيذ.`,

  screen_admin_owner: `أنت مالك لوحة التحكم (Admin Panel). أنت تفهم كل التفاصيل:
- User Management: إدارة المستخدمين والأدوار
- Wallet Operations: تجميد/إلغاء تجميد المحافظ
- Nova Distribution: توزيع Nova للمستخدمين
- Audit Logs: سجل العمليات الإدارية
- Support Tools: أدوات فريق الدعم
⚠️ دورك: اكتشاف مشاكل حقيقية في منطق الشاشة. لا تنفيذ.`,
};

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchSystemContext(supabase: any) {
  const [
    { count: totalUsers },
    { count: realUsers },
    { count: totalOrders },
    { count: disputedOrders },
    { count: activeContests },
    { count: totalTeamLinks },
    { count: openTickets },
    { data: walletStats },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_ai', false),
    supabase.from('p2p_orders').select('*', { count: 'exact', head: true }),
    supabase.from('p2p_orders').select('*', { count: 'exact', head: true }).eq('status', 'disputed'),
    supabase.from('contests').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('team_members').select('*', { count: 'exact', head: true }),
    supabase.from('support_tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('wallets').select('nova_balance, aura_balance, is_frozen').limit(1000),
  ]);

  const frozenWallets = walletStats?.filter((w: any) => w.is_frozen)?.length || 0;
  const totalNova = walletStats?.reduce((sum: number, w: any) => sum + (w.nova_balance || 0), 0) || 0;
  const totalAura = walletStats?.reduce((sum: number, w: any) => sum + (w.aura_balance || 0), 0) || 0;

  return {
    totalUsers: totalUsers || 0,
    realUsers: realUsers || 0,
    totalOrders: totalOrders || 0,
    disputedOrders: disputedOrders || 0,
    activeContests: activeContests || 0,
    totalTeamLinks: totalTeamLinks || 0,
    openTickets: openTickets || 0,
    frozenWallets,
    totalNova: Math.round(totalNova),
    totalAura: Math.round(totalAura),
    timestamp: new Date().toISOString(),
  };
}

async function generateAgentAnalysis(
  apiKey: string,
  agent: any,
  topic: string,
  prompt: string,
  previousResponses: string[],
  turnNumber: number,
  systemContext: any
): Promise<string> {
  const agentPrompt = AGENT_PROMPTS[agent.agent_role] || 
    `أنت ${agent.agent_name_ar}. أجب من منظور دورك بدقة.`;

  const previousContext = previousResponses.length > 0
    ? `\n\nتحليلات الزملاء السابقة:\n${previousResponses.join('\n\n---\n\n')}\n\nالآن دورك. اقرأ ما قاله الآخرون أولاً، ثم أضف تحليلك من منظور دورك. لا تكرر.`
    : '';

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        {
          role: 'system',
          content: `أنت ${agent.agent_name_ar} في مجلس المراجعة الهندسي لـ WINOVA.
${agentPrompt}

📊 معلومات النظام الحالية:
- المستخدمين الحقيقيين: ${systemContext.realUsers}
- طلبات P2P: ${systemContext.totalOrders}
- النزاعات المفتوحة: ${systemContext.disputedOrders}
- المحافظ المجمدة: ${systemContext.frozenWallets}
- إجمالي Nova: ${systemContext.totalNova}
- إجمالي Aura: ${systemContext.totalAura}
- تذاكر الدعم المفتوحة: ${systemContext.openTickets}

📌 قواعد مجلس المراجعة الهندسي:
- ❌ ممنوع: أي تنفيذ مباشر
- ❌ ممنوع: تعديل DB/Wallet/Code
- ✅ مسموح: تحليل + اكتشاف مشاكل + اقتراح حلول
- ✅ كل اقتراح = Proposal قابل للإرسال لمبرمج بشري
- ✅ ركز على: Backend consistency + Database integrity

${previousContext}`,
        },
        {
          role: 'user',
          content: `الموضوع: ${topic}\n\n${prompt}\n\nدورك الآن (المتحدث ${turnNumber + 1}):`,
        },
      ],
      max_tokens: 800,
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'لم أتمكن من التحليل.';
}

async function generateSessionSummary(
  apiKey: string,
  topic: string,
  responses: Array<{ agent: string; response: string }>
): Promise<{ summary: string; proposals: any[] }> {
  const responsesText = responses
    .map((r, i) => `[${i + 1}] ${r.agent}:\n${r.response}`)
    .join('\n\n---\n\n');

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3-flash-preview',
      messages: [
        {
          role: 'system',
          content: `أنت منسق مجلس المراجعة الهندسي لـ WINOVA.

مهمتك:
1. تلخيص تحليلات الفريق الهندسي
2. استخراج المشاكل المكتشفة بوضوح
3. تجميع الحلول كـ Proposals قابلة للإرسال لمبرمج بشري أو Lovable

⚠️ قواعد صارمة:
- لا تنفيذ - فقط Proposals
- كل Proposal يجب أن يكون واضحاً وقابلاً للتنفيذ
- التركيز على: Backend consistency + Database integrity
- UI فقط لخدمة المنطق وليس للتجميل

أخرج JSON:
{
  "summary": "ملخص تنفيذي موجز للمشاكل المكتشفة",
  "proposals": [
    {
      "title": "عنوان واضح للاقتراح",
      "description": "وصف تقني دقيق للحل",
      "priority": "critical|high|medium|low",
      "area": "backend|database|security|wallet|p2p|frontend|admin",
      "risk_level": "high|medium|low",
      "impact_scope": "نطاق التأثير",
      "rollback_plan": "خطة التراجع",
      "estimated_effort": "small|medium|large",
      "suggested_by": "اسم المهندس",
      "code_snippet": "مثال كود مختصر إن وجد"
    }
  ]
}

باللغة العربية فقط.`,
        },
        {
          role: 'user',
          content: `الموضوع: ${topic}\n\nتحليلات الفريق الهندسي:\n${responsesText}`,
        },
      ],
      max_tokens: 2000,
      temperature: 0.5,
    }),
  });

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '{}';
  
  try {
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch?.[1] || jsonMatch?.[0] || '{}');
    return {
      summary: parsed.summary || 'لم أتمكن من إنشاء الملخص.',
      proposals: parsed.proposals || []
    };
  } catch {
    return { summary: content, proposals: [] };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get request body (optional topic override)
    let topicId: string | null = null;
    try {
      const body = await req.json();
      topicId = body?.topic_id;
    } catch {
      // No body, use random topic
    }
    
    // Select topic
    const topic = topicId 
      ? ANALYSIS_TOPICS.find(t => t.id === topicId)
      : ANALYSIS_TOPICS[Math.floor(Math.random() * ANALYSIS_TOPICS.length)];
    
    if (!topic) {
      return new Response(
        JSON.stringify({ error: 'Topic not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting Engineering Review Session: ${topic.id}`);

    // Fetch system context
    const systemContext = await fetchSystemContext(supabase);

    // Create session
    const { data: session, error: sessionError } = await supabase
      .from('ai_discussion_sessions')
      .insert({
        trigger_type: 'scheduled',
        status: 'in_progress',
        discussion_topic: topic.topic,
        discussion_topic_ar: topic.topicAr,
      })
      .select()
      .single();

    if (sessionError) throw sessionError;

    // Get relevant engineering agents
    const { data: allAgents, error: agentsError } = await supabase
      .from('ai_agents')
      .select('*')
      .eq('is_active', true)
      .in('agent_role', topic.agents);

    if (agentsError) throw agentsError;

    const selectedAgents = allAgents || [];
    
    // Get system architect for session coordination
    const systemArchitect = selectedAgents.find(a => a.agent_role === 'system_architect') 
      || selectedAgents.find(a => a.agent_role === 'database_integrity_engineer')
      || selectedAgents[0];
    
    if (!systemArchitect) {
      throw new Error('No engineering agents available for review session');
    }

    // Insert topic announcement
    await supabase.from('ai_chat_room').insert({
      agent_id: systemArchitect.id,
      content: `🔧 جلسة مجلس المراجعة الهندسي\n\n**الموضوع:** ${topic.topicAr}\n\n${topic.prompt}\n\n📋 الفريق: ${selectedAgents.map(a => a.agent_name_ar).join(' | ')}\n\n⚠️ تحليل فقط - لا تنفيذ مباشر`,
      content_ar: `🔧 جلسة مجلس المراجعة الهندسي\n\n**الموضوع:** ${topic.topicAr}\n\n${topic.prompt}\n\n📋 الفريق: ${selectedAgents.map(a => a.agent_name_ar).join(' | ')}\n\n⚠️ تحليل فقط - لا تنفيذ مباشر`,
      message_type: 'scheduled_topic',
      ai_session_id: session.id,
      turn_order: 0,
    });

    // Generate responses SEQUENTIALLY (Turn-based Engineering Review)
    const responses: Array<{ agent: string; agentId: string; response: string }> = [];
    const previousResponses: string[] = [];
    
    for (let i = 0; i < selectedAgents.length; i++) {
      const agent = selectedAgents[i];
      
      // Deliberate delay between engineers (5-10 seconds)
      if (i > 0) {
        await delay(5000 + Math.random() * 5000);
      }

      const response = await generateAgentAnalysis(
        lovableApiKey,
        agent,
        topic.topicAr,
        topic.prompt,
        previousResponses,
        i,
        systemContext
      );
      
      responses.push({
        agent: agent.agent_name_ar,
        agentId: agent.id,
        response
      });
      
      previousResponses.push(`${agent.agent_name_ar}: ${response}`);

      // Insert engineer response with turn order
      await supabase.from('ai_chat_room').insert({
        agent_id: agent.id,
        content: response,
        content_ar: response,
        message_type: 'analysis',
        ai_session_id: session.id,
        turn_order: i + 1,
        previous_context: previousResponses.slice(0, -1).join('\n---\n'),
      });
    }

    // Final delay before summary
    await delay(3000);

    // Generate summary with proposals
    const { summary, proposals } = await generateSessionSummary(
      lovableApiKey,
      topic.topicAr,
      responses.map(r => ({ agent: r.agent, response: r.response }))
    );

    // Insert summary
    await supabase.from('ai_chat_room').insert({
      agent_id: systemArchitect.id,
      content: `📋 ملخص جلسة المراجعة الهندسية:\n\n${summary}\n\n🔧 Proposals للتنفيذ: ${proposals.length}\n⚠️ كل Proposal قابل للإرسال لمبرمج بشري أو Lovable`,
      content_ar: `📋 ملخص جلسة المراجعة الهندسية:\n\n${summary}\n\n🔧 Proposals للتنفيذ: ${proposals.length}\n⚠️ كل Proposal قابل للإرسال لمبرمج بشري أو Lovable`,
      message_type: 'summary',
      ai_session_id: session.id,
      is_summary: true,
      turn_order: selectedAgents.length + 1,
      is_proposal: proposals.length > 0,
    });

    // Insert proposals with full governance fields
    for (const proposal of proposals) {
      const proposingAgent = selectedAgents.find(a => 
        a.agent_name_ar === proposal.suggested_by || 
        a.agent_name === proposal.suggested_by
      );
      
      await supabase.from('ai_proposals').insert({
        session_id: session.id,
        title: proposal.title,
        title_ar: proposal.title,
        description: proposal.description,
        description_ar: proposal.description,
        proposal_type: 'enhancement',
        priority: proposal.priority || 'medium',
        affected_area: proposal.area,
        proposed_by: proposingAgent?.id || systemArchitect.id,
        status: 'pending',
        risk_level: proposal.risk_level || 'medium',
        impact_scope: proposal.impact_scope,
        rollback_plan: proposal.rollback_plan,
        estimated_effort: proposal.estimated_effort,
        code_snippet: proposal.code_snippet,
      });
    }

    // Update session
    await supabase
      .from('ai_discussion_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        summary,
        summary_ar: summary,
        messages_count: responses.length + 2,
        participants_count: selectedAgents.length,
        findings_count: 0,
        proposals_generated: proposals.length,
      })
      .eq('id', session.id);

    return new Response(
      JSON.stringify({
        success: true,
        session_id: session.id,
        topic: topic.id,
        participants: selectedAgents.map(a => a.agent_name_ar),
        proposals_count: proposals.length,
        governance: 'review_only_no_execution'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Engineering Review Session Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
