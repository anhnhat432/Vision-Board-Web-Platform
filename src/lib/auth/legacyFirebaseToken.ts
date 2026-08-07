const LEGACY_FIREBASE_TOKEN_STORAGE_KEY = "firebase_id_token";

export function clearLegacyFirebaseToken(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(LEGACY_FIREBASE_TOKEN_STORAGE_KEY);
  } catch {
    // Credential cleanup must not break auth initialization when storage is unavailable.
  }
}
