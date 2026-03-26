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

// Pages
import Index from "./pages/Index";
import Contests from "./pages/Contests";
import Winners from "./pages/Winners";
import Team from "./pages/Team";
import Wallet from "./pages/Wallet";
import Chat from "./pages/Chat";
import P2P from "./pages/P2P";
import Spotlight from "./pages/Spotlight";
import Profile from "./pages/Profile";
import PublicProfile from "./pages/PublicProfile";
import Notifications from "./pages/Notifications";
import HallOfFame from "./pages/HallOfFame";
import LuckyLeaders from "./pages/LuckyLeaders";
import Settings from "./pages/Settings";
import Help from "./pages/Help";
import NotFound from "./pages/NotFound";
import PayUser from "./pages/PayUser";
import ReferralLanding from "./pages/ReferralLanding";
import Referral from "./pages/Referral";
import ReferralLeaders from "./pages/ReferralLeaders";

// Support Pages
import SupportDashboard from "./pages/support/SupportDashboard";
import SupportTicketDetail from "./pages/support/SupportTicketDetail";
import SupportDisputes from "./pages/support/SupportDisputes";
import SupportDisputeDetail from "./pages/support/SupportDisputeDetail";
import SupportUsers from "./pages/support/SupportUsers";
import SupportStaffRatings from "./pages/support/SupportStaffRatings";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminWallets from "./pages/admin/AdminWallets";
import AdminRoles from "./pages/admin/AdminRoles";
import AdminProposals from "./pages/admin/AdminProposals";
import AdminP2P from "./pages/admin/AdminP2P";
import AdminPricing from "./pages/admin/AdminPricing";
import AdminChangeRequests from "./pages/admin/AdminChangeRequests";
import AdminContests from "./pages/admin/AdminContests";
import AdminCycles from "./pages/admin/AdminCycles";
import AdminBroadcast from "./pages/admin/AdminBroadcast";
import AdminCommissions from "./pages/admin/AdminCommissions";
import AdminKYC from "./pages/admin/AdminKYC";
import KYCPage from "./pages/KYCPage";
import Agents from "./pages/Agents";
import AgentReservationChat from "./pages/AgentReservationChat";
import AgentDashboard from "./pages/AgentDashboard";
import AdminAgents from "./pages/admin/AdminAgents";
import AdminFamilies from "./pages/admin/AdminFamilies";
import AdminCountryCodes from "./pages/admin/AdminCountryCodes";
import Giving from "./pages/Giving";
import FamilyRegister from "./pages/FamilyRegister";
import DailyMissions from "./pages/DailyMissions";

// Policy Pages
import { Terms, Privacy, Refund, AML, Contact } from "./pages/policies";


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
                            <Route path="/" element={<Index />} />
                            <Route path="/hall-of-fame" element={<HallOfFame />} />
                            <Route path="/winners" element={<Winners />} />
                            <Route path="/help" element={<Help />} />
                            <Route path="/user/:userId" element={<PublicProfile />} />
                            <Route path="/pay/:username" element={<PayUser />} />
                            <Route path="/ref/:code" element={<ReferralLanding />} />

                            {/* Policy pages - public, no login required */}
                            <Route path="/terms" element={<Terms />} />
                            <Route path="/privacy" element={<Privacy />} />
                            <Route path="/refund" element={<Refund />} />
                            <Route path="/aml" element={<AML />} />
                            <Route path="/contact" element={<Contact />} />
                            
                            {/* Protected routes - require authentication */}
                            <Route path="/contests" element={<AuthGuard><Contests /></AuthGuard>} />
                            <Route path="/team" element={<AuthGuard><Team /></AuthGuard>} />
                            <Route path="/wallet" element={<AuthGuard><Wallet /></AuthGuard>} />
                            <Route path="/chat" element={<AuthGuard><Chat /></AuthGuard>} />
                            <Route path="/p2p" element={<AuthGuard><P2P /></AuthGuard>} />
                            <Route path="/spotlight" element={<AuthGuard><Spotlight /></AuthGuard>} />
                            <Route path="/profile" element={<AuthGuard><Profile /></AuthGuard>} />
                            <Route path="/notifications" element={<AuthGuard><Notifications /></AuthGuard>} />
                            <Route path="/lucky-leaders" element={<AuthGuard><LuckyLeaders /></AuthGuard>} />
                            <Route path="/settings" element={<AuthGuard><Settings /></AuthGuard>} />
                            <Route path="/referral" element={<AuthGuard><Referral /></AuthGuard>} />
                            <Route path="/referral-leaders" element={<AuthGuard><ReferralLeaders /></AuthGuard>} />
                            <Route path="/kyc" element={<AuthGuard><KYCPage /></AuthGuard>} />
                            <Route path="/agents" element={<AuthGuard><Agents /></AuthGuard>} />
                            <Route path="/agents/r/:reservationId" element={<AuthGuard><AgentReservationChat /></AuthGuard>} />
                            <Route path="/agent-dashboard" element={<AuthGuard><AgentDashboard /></AuthGuard>} />
                            <Route path="/giving" element={<AuthGuard><Giving /></AuthGuard>} />
                            <Route path="/giving/register" element={<AuthGuard><FamilyRegister /></AuthGuard>} />
                            <Route path="/missions" element={<AuthGuard><DailyMissions /></AuthGuard>} />

                            {/* Support Panel routes - require support role */}
                            <Route path="/support" element={<SupportGuard><SupportDashboard /></SupportGuard>} />
                            <Route path="/support/ticket/:ticketId" element={<SupportGuard><SupportTicketDetail /></SupportGuard>} />
                            <Route path="/support/disputes" element={<SupportGuard><SupportDisputes /></SupportGuard>} />
                            <Route path="/support/disputes/:orderId" element={<SupportGuard><SupportDisputeDetail /></SupportGuard>} />
                            <Route path="/support/users" element={<SupportGuard><SupportUsers /></SupportGuard>} />
                            <Route path="/support/staff-ratings" element={<SupportGuard><SupportStaffRatings /></SupportGuard>} />

                            {/* Admin Panel routes - require admin role */}
                            <Route path="/admin" element={<AdminGuard><AdminDashboard /></AdminGuard>} />
                            <Route path="/admin/wallets" element={<AdminGuard><AdminWallets /></AdminGuard>} />
                            <Route path="/admin/roles" element={<AdminGuard><AdminRoles /></AdminGuard>} />
                            <Route path="/admin/proposals" element={<AdminGuard><AdminProposals /></AdminGuard>} />
                            <Route path="/admin/p2p" element={<AdminGuard><AdminP2P /></AdminGuard>} />
                            <Route path="/admin/pricing" element={<AdminGuard><AdminPricing /></AdminGuard>} />
                            <Route path="/admin/change-requests" element={<AdminGuard><AdminChangeRequests /></AdminGuard>} />
                            <Route path="/admin/contests" element={<AdminGuard><AdminContests /></AdminGuard>} />
                            <Route path="/admin/cycles" element={<AdminGuard><AdminCycles /></AdminGuard>} />
                            <Route path="/admin/broadcast" element={<AdminGuard><AdminBroadcast /></AdminGuard>} />
                            <Route path="/admin/commissions" element={<AdminGuard><AdminCommissions /></AdminGuard>} />
                            <Route path="/admin/kyc" element={<AdminGuard><AdminKYC /></AdminGuard>} />
                            <Route path="/admin/agents" element={<AdminGuard><AdminAgents /></AdminGuard>} />
                            <Route path="/admin/families" element={<AdminGuard><AdminFamilies /></AdminGuard>} />
                            <Route path="/admin/country-codes" element={<AdminGuard><AdminCountryCodes /></AdminGuard>} />

                            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                            <Route path="*" element={<NotFound />} />
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
