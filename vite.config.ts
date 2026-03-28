import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/winova-spark-arena/' : '/',
  server: {
    host: "0.0.0.0",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    mode === "production" && visualizer({
      filename: "dist/stats.html",
      open: false,
      gzipSize: true,
      brotliSize: true,
    })
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-tabs', '@radix-ui/react-select'],
          charts: ['recharts'],
          icons: ['lucide-react'],
          utils: ['date-fns', 'clsx', 'tailwind-merge'],
          
          // Feature chunks
          admin: [
            './src/pages/admin/AdminDashboard.tsx',
            './src/pages/admin/AdminAnalytics.tsx',
            './src/pages/admin/AdminAgents.tsx',
            './src/pages/admin/AdminWallets.tsx',
          ],
          support: [
            './src/pages/support/SupportDashboard.tsx',
            './src/pages/support/SupportDisputes.tsx',
            './src/pages/support/SupportTicketDetail.tsx',
          ],
          p2p: [
            './src/pages/P2P.tsx',
            './src/hooks/useP2PDatabase.ts',
            './src/hooks/useP2PMarketplace.ts',
          ],
          agents: [
            './src/pages/Agents.tsx',
            './src/pages/AgentDashboard.tsx',
            './src/hooks/useAgents.ts',
          ],
          contests: [
            './src/pages/Contests.tsx',
            './src/hooks/useFridayContest.ts',
            './src/hooks/useContestConfig.ts',
          ],
          giving: [
            './src/pages/Giving.tsx',
            './src/pages/FamilyRegister.tsx',
            './src/hooks/useGiving.ts',
          ],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
}));
