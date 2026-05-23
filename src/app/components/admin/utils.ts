/**
 * Shared formatting / error helpers used by the admin pages.
 * Extracted to avoid duplicating logic across Dashboard / Orders / Payments / Refunds.
 */

export const ADMIN_LOAD_TIMEOUT_MS = 18_000;

export function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

export function formatDate(iso: string | undefined): string {
  if (!iso) return "Chưa có";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function formatVnd(value: number): string {
  return `${value.toLocaleString("vi-VN")}đ`;
}

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => window.clearTimeout(timeoutId));
  });
}
