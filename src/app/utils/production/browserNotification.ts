import { getInAppReminders, getUserData } from "../storage";
import { LAST_BROWSER_NOTIFICATION_KEY } from "./env";

export type BrowserNotificationStatus = NotificationPermission | "unsupported";

function readLastNotificationMap(): Record<string, string> {
  if (typeof window === "undefined") return {};

  try {
    const raw = localStorage.getItem(LAST_BROWSER_NOTIFICATION_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeLastNotificationMap(value: Record<string, string>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_BROWSER_NOTIFICATION_KEY, JSON.stringify(value));
}

export function getBrowserNotificationStatus(): BrowserNotificationStatus {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return window.Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<BrowserNotificationStatus> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  return window.Notification.requestPermission();
}

export function sendTestBrowserNotification(): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (window.Notification.permission !== "granted") return false;

  new window.Notification("Nhắc việc từ Dear Our Future", {
    body: "Browser notification đã sẵn sàng. Từ giờ web có thể nhắc việc ngay cả khi bạn không mở đúng tab 12 tuần.",
    tag: "vision-board-test-notification",
  });

  return true;
}

export function maybeShowBrowserReminderNotification(): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (window.Notification.permission !== "granted") return false;

  const data = getUserData();
  if (!data.appPreferences.enableBrowserNotifications) return false;

  const reminder = getInAppReminders()[0];
  if (!reminder) return false;

  const todayKey = new Date().toDateString();
  const history = readLastNotificationMap();
  if (history[reminder.id] === todayKey) return false;

  new window.Notification(reminder.title, {
    body: reminder.description,
    tag: reminder.id,
  });

  history[reminder.id] = todayKey;
  writeLastNotificationMap(history);
  return true;
}
