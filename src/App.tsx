import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { UserProvider } from "@/contexts/UserContext";
import { TransactionProvider } from "@/contexts/TransactionContext";
import { P2PProvider } from "@/contexts/P2PContext";
import "@/lib/i18n";

// Pages
import Index from "./pages/Index";
import Contests from "./pages/Contests";
import Team from "./pages/Team";
import Wallet from "./pages/Wallet";
import Chat from "./pages/Chat";
import P2P from "./pages/P2P";
import Spotlight from "./pages/Spotlight";
import Profile from "./pages/Profile";
import PublicProfile from "./pages/PublicProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <LanguageProvider>
      <UserProvider>
        <TransactionProvider>
          <P2PProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/contests" element={<Contests />} />
                  <Route path="/team" element={<Team />} />
                  <Route path="/wallet" element={<Wallet />} />
                  <Route path="/chat" element={<Chat />} />
                  <Route path="/p2p" element={<P2P />} />
                  <Route path="/spotlight" element={<Spotlight />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/user/:userId" element={<PublicProfile />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </P2PProvider>
        </TransactionProvider>
      </UserProvider>
    </LanguageProvider>
  </QueryClientProvider>
);

export default App;
