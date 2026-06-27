const LAST_SENT_STORAGE_PREFIX = "emailVerificationLastSentAt:";

type VerificationRecipient = {
  uid?: string | null;
  email?: string | null;
};

export function getEmailVerificationLastSentStorageKey(user: VerificationRecipient | null | undefined): string | null {
  const scope = user?.uid || user?.email?.trim();
  return scope ? `${LAST_SENT_STORAGE_PREFIX}${scope}` : null;
}

export function readStoredEmailVerificationLastSentAt(
  user: VerificationRecipient | null | undefined,
): number | null {
  const storageKey = getEmailVerificationLastSentStorageKey(user);
  if (!storageKey || typeof window === "undefined") return null;
  const parsed = Number(window.localStorage.getItem(storageKey));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function storeEmailVerificationLastSentAt(
  user: VerificationRecipient | null | undefined,
  timestamp: number,
): void {
  const storageKey = getEmailVerificationLastSentStorageKey(user);
  if (!storageKey || typeof window === "undefined") return;
  window.localStorage.setItem(storageKey, String(timestamp));
}
