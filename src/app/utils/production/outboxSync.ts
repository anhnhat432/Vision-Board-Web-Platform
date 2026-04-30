
import { apiClient } from "@/lib/api/apiClient";
import { getUserData, saveUserData } from "../storage";
import { LAST_OUTBOX_SYNC_KEY, OUTBOX_SYNC_ENDPOINT } from "./env";
import { isOffline } from "./billingCore";

export interface OutboxSyncSnapshot {
  at: string;
  status: "idle" | "success" | "partial" | "offline" | "not_configured" | "error";
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

  if (isOffline()) {
    const snapshot: OutboxSyncSnapshot = {
      ...baseSnapshot,
      status: "offline",
      message: "Thiết bị đang offline. Outbox sẽ được thử lại khi có mạng.",
    };
    persistSyncSnapshot(snapshot);
    return snapshot;
  }

  if (!OUTBOX_SYNC_ENDPOINT) {
    const snapshot: OutboxSyncSnapshot = {
      ...baseSnapshot,
      status: "not_configured",
      message: "Chưa cấu hình VITE_OUTBOX_SYNC_ENDPOINT nên web giữ outbox ở local.",
    };
    persistSyncSnapshot(snapshot);
    return snapshot;
  }

  let syncedCount = 0;

  for (const item of pendingItems) {
    try {
      await apiClient.post<unknown, typeof item>(OUTBOX_SYNC_ENDPOINT, item, {
        keepalive: true,
      });

      const itemIndex = data.syncOutbox.findIndex((entry) => entry.id === item.id);
      if (itemIndex !== -1) {
        data.syncOutbox[itemIndex] = {
          ...data.syncOutbox[itemIndex],
          status: "sent",
        };
      }

      syncedCount += 1;
    } catch {
      // Apply exponential backoff retry model
      const currentRetryCount = (item.retryCount ?? 0) + 1;
      const itemIndex = data.syncOutbox.findIndex((entry) => entry.id === item.id);

      if (itemIndex !== -1) {
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
      }
    }
  }

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
        ? "Không thể gửi outbox tới endpoint đã cấu hình."
        : remainingPendingCount === 0
          ? "Đã đồng bộ toàn bộ outbox đang chờ."
          : "Đã đồng bộ một phần. Một số mục vẫn đang chờ thử lại.",
  };
  persistSyncSnapshot(snapshot);
  return snapshot;
}
