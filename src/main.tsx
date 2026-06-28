import { createRoot } from "react-dom/client";
import { cleanupLegacyAssistantHistory } from "./app/features/assistant/cleanupLegacyHistory";
import { getAppMode } from "./app/utils/app-mode";
import { installChunkLoadRecovery } from "./app/utils/chunkLoad";
import "./lib/monitoring/sentry";
import App from "./app/App.tsx";
import "./styles/index.css";

cleanupLegacyAssistantHistory();
installChunkLoadRecovery();

// Inject GA4 script only for explicitly configured real-mode analytics.
const appMode = getAppMode();
const analyticsMode = import.meta.env.VITE_ANALYTICS_MODE?.trim().toLowerCase();
const gaMeasurementId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();
if (appMode === "real" && analyticsMode === "ga4" && gaMeasurementId && /^G-[A-Z0-9]+$/.test(gaMeasurementId)) {
  const gtagScript = document.createElement("script");
  gtagScript.async = true;
  gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaMeasurementId)}`;
  document.head.appendChild(gtagScript);

  window.dataLayer = window.dataLayer ?? [];
  window.gtag = (...args: unknown[]) => {
    window.dataLayer?.push(args as unknown as Record<string, unknown> & { event?: unknown });
  };
  window.gtag("js", new Date());
  window.gtag("config", gaMeasurementId, { send_page_view: false });
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element #root not found in document");
createRoot(rootElement).render(<App />);

// Register service worker only in production. In dev, stale SW caches can serve old CSS/JS and break layout.
if ("serviceWorker" in navigator) {
  if (import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  } else {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().catch(() => {});
      }
    });

    if ("caches" in window) {
      window.caches.keys().then((keys) => {
        for (const key of keys) {
          if (key.startsWith("vbweb-")) window.caches.delete(key).catch(() => {});
        }
      });
    }
  }
}
