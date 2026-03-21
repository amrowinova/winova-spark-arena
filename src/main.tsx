import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker, setupInstallPrompt } from "./lib/pwaUtils";
import { initializeFeatureFlags, isFeatureEnabled } from "./lib/featureFlags";
import { initSentry } from "./lib/sentry";

// Initialize Sentry error tracking
initSentry();

// Initialize feature flags (Level 3 Governance - UI Rollback Strategy)
initializeFeatureFlags({});

// Register PWA Service Worker (Level 3 Execution - PWA Enhancement)
if (isFeatureEnabled('pwa_enabled')) {
  registerServiceWorker();
  setupInstallPrompt();
}

createRoot(document.getElementById("root")!).render(<App />);
