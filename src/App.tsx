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
import { AuthGuard, SupportGuard, AdminGuard } from "@/components/auth";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
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
import AdminAI from "./pages/admin/AdminAI";
import AdminProposals from "./pages/admin/AdminProposals";
import ControlTower from "./pages/admin/ControlTower";
import StrategicBrain from "./pages/admin/StrategicBrain";
import Evolution from "./pages/admin/Evolution";
import Commander from "./pages/admin/Commander";

// Policy Pages
import { Terms, Privacy, Refund, AML, Contact } from "./pages/policies";


const queryClient = new QueryClient();

// Clear React Query cache on auth state changes
supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
    // Clear all cached queries to force fresh data fetch
    queryClient.clear();
  }
});

const App = () => (
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
                          <InlineBanner />
                          <Toaster position="top-center" richColors />
                          <Routes>
                            {/* Public routes */}
                            <Route path="/" element={<Index />} />
                            <Route path="/hall-of-fame" element={<HallOfFame />} />
                            <Route path="/winners" element={<Winners />} />
                            <Route path="/help" element={<Help />} />
                            <Route path="/user/:userId" element={<PublicProfile />} />
                            
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
                            <Route path="/admin/ai" element={<AdminGuard><AdminAI /></AdminGuard>} />
                            <Route path="/admin/proposals" element={<AdminGuard><AdminProposals /></AdminGuard>} />
                            <Route path="/admin/control-tower" element={<AdminGuard><ControlTower /></AdminGuard>} />
                            <Route path="/admin/strategic-brain" element={<AdminGuard><StrategicBrain /></AdminGuard>} />
                            <Route path="/admin/evolution" element={<AdminGuard><Evolution /></AdminGuard>} />
                            <Route path="/admin/commander" element={<AdminGuard><Commander /></AdminGuard>} />
                            
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
);

export default App;
