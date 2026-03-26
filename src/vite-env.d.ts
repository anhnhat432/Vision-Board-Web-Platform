/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ANALYTICS_MODE?: string;
  readonly VITE_GA_MEASUREMENT_ID?: string;
  readonly VITE_OUTBOX_SYNC_ENDPOINT?: string;
  readonly VITE_BILLING_PROVIDER_MODE?: string;
  readonly VITE_BILLING_PROVIDER_LABEL?: string;
  readonly VITE_BILLING_API_BASE?: string;
  readonly VITE_BILLING_CHECKOUT_ENDPOINT?: string;
  readonly VITE_BILLING_PORTAL_ENDPOINT?: string;
  readonly VITE_BILLING_RESTORE_ENDPOINT?: string;
  readonly VITE_BILLING_ENTITLEMENT_SYNC_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
