import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { UserProvider } from "@/contexts/UserContext";
import { TransactionProvider } from "@/contexts/TransactionContext";
import { P2PProvider } from "@/contexts/P2PContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { BannerProvider } from "@/contexts/BannerContext";
import { SupportProvider } from "@/contexts/SupportContext";
import { InlineBanner } from "@/components/common/InlineBanner";
import "@/lib/i18n";

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
                      <Route path="/" element={<Index />} />
                      <Route path="/contests" element={<Contests />} />
                      <Route path="/winners" element={<Winners />} />
                      <Route path="/team" element={<Team />} />
                      <Route path="/wallet" element={<Wallet />} />
                      <Route path="/chat" element={<Chat />} />
                      <Route path="/p2p" element={<P2P />} />
                      <Route path="/spotlight" element={<Spotlight />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/notifications" element={<Notifications />} />
                      <Route path="/hall-of-fame" element={<HallOfFame />} />
                      <Route path="/lucky-leaders" element={<LuckyLeaders />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/help" element={<Help />} />
                      <Route path="/user/:userId" element={<PublicProfile />} />
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
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
