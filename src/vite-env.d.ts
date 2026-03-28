/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string;
  readonly VITE_APP_MODE?: string;
  readonly VITE_SHOW_BILLING_DEBUG?: string;
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
