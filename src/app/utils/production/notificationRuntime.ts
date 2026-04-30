
import { apiClient } from "@/lib/api/apiClient";
import {
  clearPushSubscription,
  getPushSubscription,
  getUserData,
  savePushSubscription,
  saveUserData,
  trackAppEvent,
} from "../storage";
import type { PushSubscriptionRecord } from "../storage-types";
import { EMAIL_REMINDER_ENDPOINT, PUSH_SUBSCRIBE_ENDPOINT, PUSH_VAPID_PUBLIC_KEY } from "./env";
import { isOffline } from "./billingCore";

export interface EmailDeliveryPayload {
  userId: string;
  kind: string;
  scheduledFor: string;
  goalId?: string;
  weekNumber?: number;
  metadata?: Record<string, string>;
}

export interface EmailSyncResult {
  at: string;
  sentCount: number;
  failedCount: number;
  status: "success" | "partial" | "not_configured" | "offline" | "error";
  message: string;
}

/**
 * Reads all due email reminder schedule items and POSTs them to the configured
 * email reminder endpoint.  On success, marks the item `"sent"`.
 * If no endpoint is configured the result is `"not_configured"` but items are
 * still marked sent locally (so they don't re-trigger on next call).
 */
export async function syncEmailReminderSchedule(): Promise<EmailSyncResult> {
  const now = new Date();
  const data = getUserData();
  const dueItems = (data.emailReminderSchedule ?? []).filter(
    (item) => item.status === "scheduled" && new Date(item.scheduledFor) <= now,
  );

  if (dueItems.length === 0) {
    return {
      at: now.toISOString(),
      sentCount: 0,
      failedCount: 0,
      status: "success",
      message: "Không có email nào cần gửi lúc này.",
    };
  }

  if (isOffline()) {
    return {
      at: now.toISOString(),
      sentCount: 0,
      failedCount: dueItems.length,
      status: "offline",
      message: "Đang offline — email sẽ được gửi khi có kết nối.",
    };
  }

  if (!EMAIL_REMINDER_ENDPOINT) {
    // No endpoint configured — mark as sent locally so they don't re-fire
    const ids = new Set(dueItems.map((item) => item.id));
    data.emailReminderSchedule = (data.emailReminderSchedule ?? []).map((item) =>
      ids.has(item.id) ? { ...item, status: "sent" } : item,
    );
    saveUserData(data);
    return {
      at: now.toISOString(),
      sentCount: dueItems.length,
      failedCount: 0,
      status: "not_configured",
      message: "Chưa cấu hình email endpoint — đã đánh dấu gửi locally.",
    };
  }

  let sentCount = 0;
  let failedCount = 0;
  const schedule = data.emailReminderSchedule ?? [];
  data.emailReminderSchedule = schedule;

  for (const item of dueItems) {
    const payload: EmailDeliveryPayload = {
      userId: data.userId,
      kind: item.kind,
      scheduledFor: item.scheduledFor,
      goalId: item.goalId,
      weekNumber: item.weekNumber,
      metadata: item.metadata,
    };

    try {
      const idx = schedule.findIndex((s) => s.id === item.id);

      await apiClient.post<unknown, EmailDeliveryPayload>(EMAIL_REMINDER_ENDPOINT, payload);

      if (idx !== -1) {
        schedule[idx] = {
          ...schedule[idx],
          status: "sent",
        };
      }

      sentCount++;
    } catch {
      const idx = schedule.findIndex((s) => s.id === item.id);
      if (idx !== -1) {
        schedule[idx] = {
          ...schedule[idx],
          status: "canceled",
        };
      }
      failedCount++;
    }
  }

  saveUserData(data);

  return {
    at: now.toISOString(),
    sentCount,
    failedCount,
    status: failedCount === 0 ? "success" : sentCount === 0 ? "error" : "partial",
    message:
      failedCount === 0
        ? `Đã gửi ${sentCount} email nhắc.`
        : `Đã gửi ${sentCount}/${sentCount + failedCount} email — ${failedCount} gặp lỗi.`,
  };
}

export interface PushDeepLinkPayload {
  url: string;
  title: string;
  body: string;
  tag: string;
  data?: Record<string, string>;
}

export function getPushDeepLinkPayload(
  kind: "review" | "missed_task" | "trial_ending" | "cycle_start",
  context?: Record<string, string>,
): PushDeepLinkPayload {
  switch (kind) {
    case "review":
      return {
        url: "/12-week-system?tab=week",
        title: "Đến lúc chốt review tuần rồi",
        body: context?.weekLabel
          ? `Khóa ${context.weekLabel} và chốt ưu tiên cho tuần sau.`
          : "Chốt review trước để tuần sau bắt đầu gọn đầu hơn.",
        tag: "twelve-week-review",
        data: context,
      };
    case "missed_task":
      return {
        url: "/12-week-system?tab=today",
        title: "Có việc đang chờ từ hôm qua",
        body: context?.taskTitle
          ? `"${context.taskTitle}" vẫn chưa được chốt.`
          : "Mở tab Hôm nay để xem việc nào cần làm ngay.",
        tag: "twelve-week-missed-task",
        data: context,
      };
    case "trial_ending":
      return {
        url: "/billing/plan",
        title: "Gói dùng thử sắp hết hạn",
        body: context?.daysLeft
          ? `Còn ${context.daysLeft} ngày — nâng cấp để giữ toàn bộ Plus.`
          : "Nâng cấp ngay để không mất quyền truy cập.",
        tag: "trial-ending",
        data: context,
      };
    case "cycle_start":
      return {
        url: "/12-week-system",
        title: "Chu kỳ 12 tuần đã bắt đầu",
        body: "Hôm nay là ngày 1. Vào tab Hôm nay để bắt đầu ngay.",
        tag: "twelve-week-cycle-start",
        data: context,
      };
  }
}

/**
 * Requests browser push permission, subscribes to the VAPID endpoint if
 * configured, and saves the subscription record to localStorage.
 *
 * Returns: `"granted"` | `"denied"` | `"unsupported"` | `"already_registered"`
 */
export async function requestPushPermissionAndSubscribe(
  goalId?: string,
): Promise<"granted" | "denied" | "unsupported" | "already_registered"> {
  if (typeof window === "undefined") return "unsupported";
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";

  const permission = await window.Notification.requestPermission();
  if (permission !== "granted") return "denied";

  // Already registered and subscription is still valid?
  const existingRecord = getPushSubscription();
  if (existingRecord) return "already_registered";

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription: PushSubscription | null = null;

    if (PUSH_VAPID_PUBLIC_KEY) {
      const vapidKey = urlBase64ToUint8Array(PUSH_VAPID_PUBLIC_KEY) as Uint8Array<ArrayBuffer>;
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });
    } else {
      // No VAPID key configured — use existing subscription or bail out
      subscription = await registration.pushManager.getSubscription();
    }

    if (!subscription) return "granted";

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return "granted";

    const record: PushSubscriptionRecord = {
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      registeredAt: new Date().toISOString(),
      goalId,
    };

    savePushSubscription(record);

    // Queue subscription sync to outbox
    if (PUSH_SUBSCRIBE_ENDPOINT) {
      trackAppEvent("push_subscription_registered", goalId, {
        endpoint: record.endpoint.slice(0, 40),
        registeredAt: record.registeredAt,
      });
    }

    return "granted";
  } catch {
    return "granted"; // permission was granted even if subscribe failed
  }
}

export async function unregisterPushSubscription(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    await subscription?.unsubscribe();
  } catch {
    // ignore
  }
  clearPushSubscription();
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
}
