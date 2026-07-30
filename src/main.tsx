import { createRoot } from "react-dom/client";
import { cleanupLegacyAssistantHistory } from "./app/features/assistant/cleanupLegacyHistory";
import { getConfiguredGaMeasurementId, isGaMeasurementId } from "./app/utils/analytics-config";
import { getAppMode } from "./app/utils/app-mode";
import { installChunkLoadRecovery } from "./app/utils/chunkLoad";
import { reportProductionRuntimeEnvReadiness } from "./app/utils/production-runtime-env";
import { installFrontendMonitoring } from "./lib/monitoring/sentry";
import App from "./app/App.tsx";
import "./styles/index.css";

installChunkLoadRecovery();
installFrontendMonitoring({ deferUntilIdle: true });
reportProductionRuntimeEnvReadiness();

function scheduleIdleTask(task: () => void, timeout = 3_000): void {
  const requestIdleCallback = window.requestIdleCallback;
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback.call(window, task, { timeout });
    return;
  }

  globalThis.setTimeout(task, 0);
}

function scheduleAfterLoadIdle(task: () => void, timeout = 5_000): void {
  const schedule = () => scheduleIdleTask(task, timeout);

  if (document.readyState === "complete") {
    schedule();
    return;
  }

  window.addEventListener("load", schedule, { once: true });
}

// Inject GA4 script only for explicitly configured real-mode analytics.
const appMode = getAppMode();
const analyticsMode = import.meta.env.VITE_ANALYTICS_MODE?.trim().toLowerCase();
const gaMeasurementId = getConfiguredGaMeasurementId();
if (appMode === "real" && analyticsMode === "ga4" && isGaMeasurementId(gaMeasurementId)) {
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

scheduleIdleTask(cleanupLegacyAssistantHistory, 2_000);

// Register service worker only in production. In dev, stale SW caches can serve old CSS/JS and break layout.
if ("serviceWorker" in navigator) {
  if (import.meta.env.PROD) {
    scheduleAfterLoadIdle(() => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }, 7_000);
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
