import { apiClient } from "@/lib/api/apiClient";
import { canSyncToCloud, getEmailVerificationRequiredMessage } from "../email-verification-guard";
import { isDemoMode } from "../app-mode";
import { getUserData, saveUserData } from "../storage";
import { LAST_OUTBOX_SYNC_KEY, OUTBOX_SYNC_ENDPOINT } from "./env";
import { isOffline } from "./billingCore";

export interface OutboxSyncSnapshot {
  at: string;
  status: "idle" | "success" | "partial" | "offline" | "not_configured" | "email_unverified" | "error";
  syncedCount: number;
  pendingCount: number;
  message: string;
}

function persistSyncSnapshot(snapshot: OutboxSyncSnapshot): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_OUTBOX_SYNC_KEY, JSON.stringify(snapshot));
}

export function getLastOutboxSyncSnapshot(): OutboxSyncSnapshot | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(LAST_OUTBOX_SYNC_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OutboxSyncSnapshot;
  } catch {
    return null;
  }
}

export async function syncPendingOutbox(): Promise<OutboxSyncSnapshot> {
  if (isDemoMode()) {
    return {
      at: new Date().toISOString(),
      status: "idle",
      syncedCount: 0,
      pendingCount: 0,
      message: "Dữ liệu đang giữ hàng chờ trên thiết bị này.",
    };
  }

  const MAX_RETRIES = 3;
  const RETRY_BACKOFF_HOURS = [1, 4, 24]; // hours before next retry after 1st, 2nd, 3rd failure

  const data = getUserData();
  const now = new Date();

  // Only process items that are pending and whose retryAt has passed (or not set)
  const pendingItems = data.syncOutbox.filter(
    (item) => item.status === "pending" && (!item.retryAt || new Date(item.retryAt) <= now),
  );

  const baseSnapshot = {
    at: now.toISOString(),
    syncedCount: 0,
    pendingCount: pendingItems.length,
  };

  if (pendingItems.length === 0) {
    const snapshot: OutboxSyncSnapshot = {
      ...baseSnapshot,
      status: "idle",
      message: "Không có mục nào cần đồng bộ.",
    };
    persistSyncSnapshot(snapshot);
    return snapshot;
  }

  if (!canSyncToCloud()) {
    const snapshot: OutboxSyncSnapshot = {
      ...baseSnapshot,
      status: "email_unverified",
      message: getEmailVerificationRequiredMessage("sync"),
    };
    persistSyncSnapshot(snapshot);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("email-verification:required", { detail: { action: "sync" } }));
    }
    return snapshot;
  }

  if (isOffline()) {
    const snapshot: OutboxSyncSnapshot = {
      ...baseSnapshot,
      status: "offline",
      message: "Thiết bị đang mất mạng. Việc đang chờ đồng bộ sẽ được thử lại khi có mạng.",
    };
    persistSyncSnapshot(snapshot);
    return snapshot;
  }

  if (!OUTBOX_SYNC_ENDPOINT) {
    const snapshot: OutboxSyncSnapshot = {
      ...baseSnapshot,
      status: "not_configured",
      message: "Chưa bật nơi sao lưu nên web giữ việc đang chờ đồng bộ trên thiết bị này.",
    };
    persistSyncSnapshot(snapshot);
    return snapshot;
  }

  // Send all pending items in parallel (Promise.allSettled), then mutate state once.
  // Sequential awaits previously made N items take N * latency; this collapses to roughly
  // single-request latency.
  const results = await Promise.allSettled(
    pendingItems.map((item) =>
      apiClient
        .post<unknown, typeof item>(OUTBOX_SYNC_ENDPOINT, item, { keepalive: true })
        .then(() => item),
    ),
  );

  let syncedCount = 0;

  results.forEach((result, index) => {
    const item = pendingItems[index];
    const itemIndex = data.syncOutbox.findIndex((entry) => entry.id === item.id);
    if (itemIndex === -1) return;

    if (result.status === "fulfilled") {
      data.syncOutbox[itemIndex] = {
        ...data.syncOutbox[itemIndex],
        status: "sent",
      };
      syncedCount += 1;
      return;
    }

    // Apply exponential backoff retry model
    const currentRetryCount = (item.retryCount ?? 0) + 1;
    if (currentRetryCount >= MAX_RETRIES) {
      data.syncOutbox[itemIndex] = {
        ...data.syncOutbox[itemIndex],
        status: "failed",
        retryCount: currentRetryCount,
        failedAt: now.toISOString(),
      };
    } else {
      const backoffHours = RETRY_BACKOFF_HOURS[currentRetryCount - 1] ?? 24;
      const nextRetryAt = new Date(now.getTime() + backoffHours * 60 * 60 * 1000).toISOString();
      data.syncOutbox[itemIndex] = {
        ...data.syncOutbox[itemIndex],
        status: "pending",
        retryCount: currentRetryCount,
        retryAt: nextRetryAt,
      };
    }
  });

  saveUserData(data);

  const remainingPendingCount = data.syncOutbox.filter(
    (item) => item.status === "pending" && (!item.retryAt || new Date(item.retryAt) <= now),
  ).length;

  const snapshot: OutboxSyncSnapshot = {
    at: now.toISOString(),
    syncedCount,
    pendingCount: remainingPendingCount,
    status: syncedCount === 0 ? "error" : remainingPendingCount === 0 ? "success" : "partial",
    message:
      syncedCount === 0
        ? "Không thể gửi việc đang chờ đồng bộ tới nơi sao lưu đã cấu hình."
        : remainingPendingCount === 0
          ? "Đã đồng bộ toàn bộ việc đang chờ."
          : "Đã đồng bộ một phần. Một số mục vẫn đang chờ thử lại.",
  };
  persistSyncSnapshot(snapshot);
  return snapshot;
}
