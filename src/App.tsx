import { useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthRequiredProvider } from "@/contexts/AuthRequiredContext";
import { UserProvider } from "@/contexts/UserContext";
import { TransactionProvider } from "@/contexts/TransactionContext";
import { P2PProvider } from "@/contexts/P2PContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { BannerProvider } from "@/contexts/BannerContext";
import { SupportProvider } from "@/contexts/SupportContext";
import { InlineBanner } from "@/components/common/InlineBanner";
import { GlobalAuthGuard } from "@/components/auth/GlobalAuthGuard";
import { ProfileEnsureWrapper } from "@/components/auth/ProfileEnsureWrapper";
import { ChatNotificationHandler } from "@/components/chat/ChatNotificationHandler";
import { PushNotificationHandler } from "@/components/notifications/PushNotificationHandler";
import { PushPermissionPrompt } from "@/components/notifications/PushPermissionPrompt";
import { AuthGuard, SupportGuard, AdminGuard } from "@/components/auth";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppErrorBoundary } from "@/components/common/AppErrorBoundary";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import "@/lib/i18n/index";

// Lazy loaded pages for better performance
const Index = lazy(() => import("./pages/Index"));
const Contests = lazy(() => import("./pages/Contests"));
const Winners = lazy(() => import("./pages/Winners"));
const Team = lazy(() => import("./pages/Team"));
const Wallet = lazy(() => import("./pages/Wallet"));
const Chat = lazy(() => import("./pages/Chat"));
const P2P = lazy(() => import("./pages/P2P"));
const Spotlight = lazy(() => import("./pages/Spotlight"));
const Profile = lazy(() => import("./pages/Profile"));
const PublicProfile = lazy(() => import("./pages/PublicProfile"));
const Notifications = lazy(() => import("./pages/Notifications"));
const HallOfFame = lazy(() => import("./pages/HallOfFame"));
const LuckyLeaders = lazy(() => import("./pages/LuckyLeaders"));
const Settings = lazy(() => import("./pages/Settings"));
const NotificationSettings = lazy(() => import("./pages/NotificationSettings"));
const Help = lazy(() => import("./pages/Help"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PayUser = lazy(() => import("./pages/PayUser"));
const ReferralLanding = lazy(() => import("./pages/ReferralLanding"));
const Referral = lazy(() => import("./pages/Referral"));
const ReferralLeaders = lazy(() => import("./pages/ReferralLeaders"));
const ApplyAgent = lazy(() => import("./pages/ApplyAgent"));
const KYCPage = lazy(() => import("./pages/KYCPage"));
const Agents = lazy(() => import("./pages/Agents"));
const AgentReservationChat = lazy(() => import("./pages/AgentReservationChat"));
const AgentDashboard = lazy(() => import("./pages/AgentDashboard"));
const Giving = lazy(() => import("./pages/Giving"));
const MyImpact = lazy(() => import("./pages/MyImpact"));
const FamilyRegister = lazy(() => import("./pages/FamilyRegister"));
const FamilyThankYou = lazy(() => import("./pages/FamilyThankYou"));
const FamilyGoals = lazy(() => import("./pages/FamilyGoals"));
const DailyMissions = lazy(() => import("./pages/DailyMissions"));
const CountryGoodnessWar = lazy(() => import("./pages/CountryGoodnessWar"));

// Lazy loaded admin pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminWallets = lazy(() => import("./pages/admin/AdminWallets"));
const AdminRoles = lazy(() => import("./pages/admin/AdminRoles"));
const AdminProposals = lazy(() => import("./pages/admin/AdminProposals"));
const AdminP2P = lazy(() => import("./pages/admin/AdminP2P"));
const AdminPricing = lazy(() => import("./pages/admin/AdminPricing"));
const AdminChangeRequests = lazy(() => import("./pages/admin/AdminChangeRequests"));
const AdminContests = lazy(() => import("./pages/admin/AdminContests"));
const AdminCycles = lazy(() => import("./pages/admin/AdminCycles"));
const AdminBroadcast = lazy(() => import("./pages/admin/AdminBroadcast"));
const AdminCommissions = lazy(() => import("./pages/admin/AdminCommissions"));
const AdminKYC = lazy(() => import("./pages/admin/AdminKYC"));
const AdminAgents = lazy(() => import("./pages/admin/AdminAgents"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminFamilies = lazy(() => import("./pages/admin/AdminFamilies"));
const AdminCountryCodes = lazy(() => import("./pages/admin/AdminCountryCodes"));

// Lazy loaded support pages
const SupportDashboard = lazy(() => import("./pages/support/SupportDashboard"));
const SupportTicketDetail = lazy(() => import("./pages/support/SupportTicketDetail"));
const SupportDisputes = lazy(() => import("./pages/support/SupportDisputes"));
const SupportDisputeDetail = lazy(() => import("./pages/support/SupportDisputeDetail"));
const SupportUsers = lazy(() => import("./pages/support/SupportUsers"));
const SupportStaffRatings = lazy(() => import("./pages/support/SupportStaffRatings"));

// Policy Pages
import { Terms, Privacy, Refund, AML, Contact } from "./pages/policies";

import { Suspense, lazy } from "react";

// Loading component for lazy loaded pages
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
  </div>
);


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,       // 30s before refetching in background
      retry: 1,                // 1 retry on failure (not 3)
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

const App = () => {
  // Clear React Query cache on auth state changes; clean up listener on unmount
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        queryClient.clear();
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return (
  <AppErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <AuthRequiredProvider>
          <UserProvider>
            <NotificationProvider>
              <BannerProvider>
                <TransactionProvider>
                  <P2PProvider>
                    <SupportProvider>
                      <TooltipProvider>
                        <BrowserRouter>
                          <GlobalAuthGuard />
                          <ProfileEnsureWrapper />
                          <ChatNotificationHandler />
                          <PushNotificationHandler />
                          <PushPermissionPrompt />
                          <OnboardingFlow />
                          <InlineBanner />
                          <Toaster position="top-center" richColors />
                          <Routes>
                            {/* Public routes */}
                            <Route path="/" element={<Suspense fallback={<PageLoader />}><Index /></Suspense>} />
                            <Route path="/hall-of-fame" element={<Suspense fallback={<PageLoader />}><HallOfFame /></Suspense>} />
                            <Route path="/winners" element={<Suspense fallback={<PageLoader />}><Winners /></Suspense>} />
                            <Route path="/help" element={<Suspense fallback={<PageLoader />}><Help /></Suspense>} />
                            <Route path="/user/:userId" element={<Suspense fallback={<PageLoader />}><PublicProfile /></Suspense>} />
                            <Route path="/pay/:username" element={<Suspense fallback={<PageLoader />}><PayUser /></Suspense>} />
                            <Route path="/ref/:code" element={<Suspense fallback={<PageLoader />}><ReferralLanding /></Suspense>} />

                            {/* Policy pages - public, no login required */}
                            <Route path="/terms" element={<Terms />} />
                            <Route path="/privacy" element={<Privacy />} />
                            <Route path="/refund" element={<Refund />} />
                            <Route path="/aml" element={<AML />} />
                            <Route path="/contact" element={<Contact />} />
                            
                            {/* Protected routes - require authentication */}
                            <Route path="/contests" element={<AuthGuard><Suspense fallback={<PageLoader />}><Contests /></Suspense></AuthGuard>} />
                            <Route path="/team" element={<AuthGuard><Suspense fallback={<PageLoader />}><Team /></Suspense></AuthGuard>} />
                            <Route path="/wallet" element={<AuthGuard><Suspense fallback={<PageLoader />}><Wallet /></Suspense></AuthGuard>} />
                            <Route path="/chat" element={<AuthGuard><Suspense fallback={<PageLoader />}><Chat /></Suspense></AuthGuard>} />
                            <Route path="/p2p" element={<AuthGuard><Suspense fallback={<PageLoader />}><P2P /></Suspense></AuthGuard>} />
                            <Route path="/spotlight" element={<AuthGuard><Suspense fallback={<PageLoader />}><Spotlight /></Suspense></AuthGuard>} />
                            <Route path="/profile" element={<AuthGuard><Suspense fallback={<PageLoader />}><Profile /></Suspense></AuthGuard>} />
                            <Route path="/notifications" element={<AuthGuard><Suspense fallback={<PageLoader />}><Notifications /></Suspense></AuthGuard>} />
                            <Route path="/lucky-leaders" element={<AuthGuard><Suspense fallback={<PageLoader />}><LuckyLeaders /></Suspense></AuthGuard>} />
                            <Route path="/settings" element={<AuthGuard><Suspense fallback={<PageLoader />}><Settings /></Suspense></AuthGuard>} />
                            <Route path="/settings/notifications" element={<AuthGuard><Suspense fallback={<PageLoader />}><NotificationSettings /></Suspense></AuthGuard>} />
                            <Route path="/referral" element={<AuthGuard><Suspense fallback={<PageLoader />}><Referral /></Suspense></AuthGuard>} />
                            <Route path="/referral-leaders" element={<AuthGuard><Suspense fallback={<PageLoader />}><ReferralLeaders /></Suspense></AuthGuard>} />
                            <Route path="/apply-agent" element={<AuthGuard><Suspense fallback={<PageLoader />}><ApplyAgent /></Suspense></AuthGuard>} />
                            <Route path="/kyc" element={<AuthGuard><Suspense fallback={<PageLoader />}><KYCPage /></Suspense></AuthGuard>} />
                            <Route path="/agents" element={<AuthGuard><Suspense fallback={<PageLoader />}><Agents /></Suspense></AuthGuard>} />
                            <Route path="/agents/r/:reservationId" element={<AuthGuard><Suspense fallback={<PageLoader />}><AgentReservationChat /></Suspense></AuthGuard>} />
                            <Route path="/agent-dashboard" element={<AuthGuard><Suspense fallback={<PageLoader />}><AgentDashboard /></Suspense></AuthGuard>} />
                            <Route path="/giving" element={<AuthGuard><Suspense fallback={<PageLoader />}><Giving /></Suspense></AuthGuard>} />
                            <Route path="/my-impact" element={<AuthGuard><Suspense fallback={<PageLoader />}><MyImpact /></Suspense></AuthGuard>} />
                            <Route path="/giving/register" element={<AuthGuard><Suspense fallback={<PageLoader />}><FamilyRegister /></Suspense></AuthGuard>} />
                            <Route path="/giving/thank-you" element={<AuthGuard><Suspense fallback={<PageLoader />}><FamilyThankYou /></Suspense></AuthGuard>} />
                            <Route path="/giving/goals" element={<AuthGuard><Suspense fallback={<PageLoader />}><FamilyGoals /></Suspense></AuthGuard>} />
                            <Route path="/missions" element={<AuthGuard><Suspense fallback={<PageLoader />}><DailyMissions /></Suspense></AuthGuard>} />
                            <Route path="/country-goodness-war" element={<AuthGuard><Suspense fallback={<PageLoader />}><CountryGoodnessWar /></Suspense></AuthGuard>} />

                            {/* Support Panel routes - require support role */}
                            <Route path="/support" element={<SupportGuard><Suspense fallback={<PageLoader />}><SupportDashboard /></Suspense></SupportGuard>} />
                            <Route path="/support/ticket/:ticketId" element={<SupportGuard><Suspense fallback={<PageLoader />}><SupportTicketDetail /></Suspense></SupportGuard>} />
                            <Route path="/support/disputes" element={<SupportGuard><Suspense fallback={<PageLoader />}><SupportDisputes /></Suspense></SupportGuard>} />
                            <Route path="/support/disputes/:orderId" element={<SupportGuard><Suspense fallback={<PageLoader />}><SupportDisputeDetail /></Suspense></SupportGuard>} />
                            <Route path="/support/users" element={<SupportGuard><Suspense fallback={<PageLoader />}><SupportUsers /></Suspense></SupportGuard>} />
                            <Route path="/support/staff-ratings" element={<SupportGuard><Suspense fallback={<PageLoader />}><SupportStaffRatings /></Suspense></SupportGuard>} />

                            {/* Admin Panel routes - require admin role */}
                            <Route path="/admin" element={<AdminGuard><Suspense fallback={<PageLoader />}><AdminDashboard /></Suspense></AdminGuard>} />
                            <Route path="/admin/wallets" element={<AdminGuard><Suspense fallback={<PageLoader />}><AdminWallets /></Suspense></AdminGuard>} />
                            <Route path="/admin/roles" element={<AdminGuard><Suspense fallback={<PageLoader />}><AdminRoles /></Suspense></AdminGuard>} />
                            <Route path="/admin/proposals" element={<AdminGuard><Suspense fallback={<PageLoader />}><AdminProposals /></Suspense></AdminGuard>} />
                            <Route path="/admin/p2p" element={<AdminGuard><Suspense fallback={<PageLoader />}><AdminP2P /></Suspense></AdminGuard>} />
                            <Route path="/admin/pricing" element={<AdminGuard><Suspense fallback={<PageLoader />}><AdminPricing /></Suspense></AdminGuard>} />
                            <Route path="/admin/change-requests" element={<AdminGuard><Suspense fallback={<PageLoader />}><AdminChangeRequests /></Suspense></AdminGuard>} />
                            <Route path="/admin/contests" element={<AdminGuard><Suspense fallback={<PageLoader />}><AdminContests /></Suspense></AdminGuard>} />
                            <Route path="/admin/cycles" element={<AdminGuard><Suspense fallback={<PageLoader />}><AdminCycles /></Suspense></AdminGuard>} />
                            <Route path="/admin/broadcast" element={<AdminGuard><Suspense fallback={<PageLoader />}><AdminBroadcast /></Suspense></AdminGuard>} />
                            <Route path="/admin/commissions" element={<AdminGuard><Suspense fallback={<PageLoader />}><AdminCommissions /></Suspense></AdminGuard>} />
                            <Route path="/admin/kyc" element={<AdminGuard><Suspense fallback={<PageLoader />}><AdminKYC /></Suspense></AdminGuard>} />
                            <Route path="/admin/analytics" element={<AdminGuard><Suspense fallback={<PageLoader />}><AdminAnalytics /></Suspense></AdminGuard>} />
                            <Route path="/admin/agents" element={<AdminGuard><Suspense fallback={<PageLoader />}><AdminAgents /></Suspense></AdminGuard>} />
                            <Route path="/admin/families" element={<AdminGuard><Suspense fallback={<PageLoader />}><AdminFamilies /></Suspense></AdminGuard>} />
                            <Route path="/admin/country-codes" element={<AdminGuard><Suspense fallback={<PageLoader />}><AdminCountryCodes /></Suspense></AdminGuard>} />

                            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                            <Route path="*" element={<Suspense fallback={<PageLoader />}><NotFound /></Suspense>} />
                          </Routes>
                        </BrowserRouter>
                      </TooltipProvider>
                    </SupportProvider>
                  </P2PProvider>
                </TransactionProvider>
              </BannerProvider>
            </NotificationProvider>
          </UserProvider>
        </AuthRequiredProvider>
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
  </AppErrorBoundary>
  );
};

export default App;
