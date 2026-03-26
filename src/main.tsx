
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";

  // Inject GA4 script when analytics mode is ga4 and measurement ID is set
  const analyticsMode = import.meta.env.VITE_ANALYTICS_MODE?.trim().toLowerCase();
  const gaMeasurementId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();
  if (analyticsMode === "ga4" && gaMeasurementId && /^G-[A-Z0-9]+$/.test(gaMeasurementId)) {
    const gtagScript = document.createElement("script");
    gtagScript.async = true;
    gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaMeasurementId)}`;
    document.head.appendChild(gtagScript);

    window.dataLayer = window.dataLayer ?? [];
    window.gtag = (...args: unknown[]) => {
      window.dataLayer?.push({ event: args[0], ...(typeof args[1] === "string" ? { target: args[1] } : {}), ...(args[2] != null && typeof args[2] === "object" ? (args[2] as Record<string, unknown>) : {}) });
    };
    window.gtag("js", new Date());
    window.gtag("config", gaMeasurementId);
  }

  const rootElement = document.getElementById("root");
  if (!rootElement) throw new Error("Root element #root not found in document");
  createRoot(rootElement).render(<App />);
  