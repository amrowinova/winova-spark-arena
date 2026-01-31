import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { UserProvider } from "@/contexts/UserContext";
import { TransactionProvider } from "@/contexts/TransactionContext";
import { P2PProvider } from "@/contexts/P2PContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { BannerProvider } from "@/contexts/BannerContext";
import { SupportProvider } from "@/contexts/SupportContext";
import { InlineBanner } from "@/components/common/InlineBanner";
import { AuthGuard } from "@/components/auth";
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


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <AuthProvider>
        <UserProvider>
          <NotificationProvider>
            <BannerProvider>
              <TransactionProvider>
                <P2PProvider>
                  <SupportProvider>
                    <TooltipProvider>
                      <InlineBanner />
                      <BrowserRouter>
                      <Routes>
                        {/* Public routes */}
                        <Route path="/" element={<Index />} />
                        <Route path="/hall-of-fame" element={<HallOfFame />} />
                        <Route path="/winners" element={<Winners />} />
                        <Route path="/help" element={<Help />} />
                        <Route path="/user/:userId" element={<PublicProfile />} />
                        
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
      </AuthProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
