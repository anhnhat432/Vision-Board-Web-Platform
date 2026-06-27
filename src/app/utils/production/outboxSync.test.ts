import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUserData, saveUserData } from "../storage";
import { createEmptyUserData } from "../storage-demo-data";
import {
  CURRENT_STORAGE_VERSION,
  DEFAULT_APP_PREFERENCES,
  MOTIVATIONAL_QUOTES,
} from "../storage-constants";
import { getLastOutboxSyncSnapshot, syncPendingOutbox } from "./outboxSync";

const appModeMock = vi.hoisted(() => ({
  isDemoMode: vi.fn(() => false),
}));
const emailVerificationMock = vi.hoisted(() => ({
  canSyncToCloud: vi.fn(() => false),
  getEmailVerificationRequiredMessage: vi.fn(
    () => "Verify email before cloud sync.",
  ),
}));
const apiClientMock = vi.hoisted(() => ({
  post: vi.fn(),
}));
const billingCoreMock = vi.hoisted(() => ({
  isOffline: vi.fn(() => false),
}));

vi.mock("../app-mode", () => ({
  isDemoMode: appModeMock.isDemoMode,
}));

vi.mock("../email-verification-guard", () => ({
  canSyncToCloud: emailVerificationMock.canSyncToCloud,
  getEmailVerificationRequiredMessage:
    emailVerificationMock.getEmailVerificationRequiredMessage,
}));

vi.mock("@/lib/api/apiClient", () => ({
  apiClient: apiClientMock,
}));

vi.mock("./billingCore", () => ({
  isOffline: billingCoreMock.isOffline,
}));

function createUserDataWithPendingOutbox() {
  const data = createEmptyUserData({
    currentStorageVersion: CURRENT_STORAGE_VERSION,
    defaultAppPreferences: DEFAULT_APP_PREFERENCES,
    motivationalQuotes: MOTIVATIONAL_QUOTES,
  });

  data.syncOutbox.push({
    id: "outbox_verify_1",
    type: "analytics",
    createdAt: "2026-06-25T00:00:00.000Z",
    payloadSummary: "pending sync item",
    status: "pending",
  });

  return data;
}

describe("syncPendingOutbox email verification guard", () => {
  beforeEach(() => {
    localStorage.clear();
    appModeMock.isDemoMode.mockReturnValue(false);
    emailVerificationMock.canSyncToCloud.mockReturnValue(false);
    emailVerificationMock.getEmailVerificationRequiredMessage.mockReturnValue(
      "Verify email before cloud sync.",
    );
    apiClientMock.post.mockReset();
    billingCoreMock.isOffline.mockReturnValue(false);
  });

  it("keeps pending items local and surfaces email_unverified when cloud sync is blocked", async () => {
    saveUserData(createUserDataWithPendingOutbox());
    const requiredEvents: Array<CustomEvent<{ action?: string }>> = [];
    const handleRequired = (event: Event) =>
      requiredEvents.push(event as CustomEvent<{ action?: string }>);
    window.addEventListener("email-verification:required", handleRequired);

    const snapshot = await syncPendingOutbox();

    window.removeEventListener("email-verification:required", handleRequired);

    expect(snapshot).toMatchObject({
      status: "email_unverified",
      syncedCount: 0,
      pendingCount: 1,
      message: "Verify email before cloud sync.",
    });
    expect(getLastOutboxSyncSnapshot()).toMatchObject({
      status: "email_unverified",
      pendingCount: 1,
    });
    expect(getUserData().syncOutbox).toEqual([
      expect.objectContaining({ id: "outbox_verify_1", status: "pending" }),
    ]);
    expect(apiClientMock.post).not.toHaveBeenCalled();
    expect(requiredEvents).toHaveLength(1);
    expect(requiredEvents[0].detail).toEqual({ action: "sync" });
  });
});
