
  import { createRoot } from "react-dom/client";
  import { getAppMode } from "./app/utils/app-mode";
  import "./lib/monitoring/sentry";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import "@fontsource/be-vietnam-pro/300.css";
  import "@fontsource/be-vietnam-pro/400.css";
  import "@fontsource/be-vietnam-pro/500.css";
  import "@fontsource/be-vietnam-pro/600.css";
  import "@fontsource/be-vietnam-pro/700.css";
  import "@fontsource/be-vietnam-pro/400-italic.css";
  import "@fontsource/be-vietnam-pro/500-italic.css";

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

  // Register service worker for offline support
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    });
  }
