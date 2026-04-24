import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { AppPreferences } from "@/app/utils/storage-types";
import { TwelveWeekLocalStatusSection } from "./TwelveWeekLocalStatusSection";

const appPreferences: AppPreferences = {
  allowLocalAnalytics: true,
  enableInAppReminders: true,
  enableBrowserNotifications: false,
  keepLocalOutbox: true,
  preferredReminderHour: 19,
};

const backendConnectionStatus = {
  authConfigured: true,
  authLoading: false,
  signedIn: true,
  profileReady: true,
  displayName: "Test User",
  email: "test@example.com",
  syncing: false,
  syncStatus: "success",
  lastSyncedAt: "2026-04-24T08:00:00.000Z",
  syncMessage: null,
  failedSyncCount: 0,
} as const;

describe("TwelveWeekLocalStatusSection", () => {
  it("renders backend conflict details and resolution actions", () => {
    const onUseBackendPlanForConflicts = vi.fn();
    const onKeepLocalPlanForConflicts = vi.fn();

    render(
      <TwelveWeekLocalStatusSection
        activeGoalId="goal_1"
        appPreferences={appPreferences}
        backendConnectionStatus={backendConnectionStatus}
        isHydratingBackendPlans={false}
        isResolvingBackendPlanConflicts={false}
        lastBackendHydrationResult={{
          status: "idle",
          hydratedCount: 0,
          updatedCount: 0,
          skippedCount: 1,
          failedCount: 0,
          conflictCount: 1,
          latestGoalId: "goal_1",
          message: "1 local/backend differences need review.",
          conflicts: [
            {
              kind: "task_completion",
              goalId: "goal_1",
              goalTitle: "Launch cycle",
              planId: "plan_1",
              planVision: "Ship the launch plan",
              weekNumber: 1,
              localId: "local_task_1",
              backendId: "remote_task_1",
              localValue: "done",
              backendValue: "not done",
              message: "Task completion differs.",
            },
          ],
        }}
        onHydrateBackendPlans={vi.fn()}
        onKeepLocalPlanForConflicts={onKeepLocalPlanForConflicts}
        onUseBackendPlanForConflicts={onUseBackendPlanForConflicts}
        pendingOutboxCount={0}
      />,
    );

    expect(screen.getByText("Cần chọn nguồn dữ liệu")).toBeInTheDocument();
    expect(screen.getByText(/Chưa có dữ liệu nào bị ghi đè/i)).toBeInTheDocument();
    expect(screen.getByText("Launch cycle")).toBeInTheDocument();
    expect(screen.getByText("Trạng thái việc")).toBeInTheDocument();
    expect(screen.getByText("Dùng bản backend:")).toBeInTheDocument();
    expect(screen.getByText("Giữ bản local:")).toBeInTheDocument();
    expect(screen.getByText("done")).toBeInTheDocument();
    expect(screen.getByText("not done")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Dùng bản backend/i }));
    fireEvent.click(screen.getByRole("button", { name: /Giữ bản local/i }));

    expect(onUseBackendPlanForConflicts).toHaveBeenCalledWith("goal_1");
    expect(onKeepLocalPlanForConflicts).toHaveBeenCalledWith("goal_1");
  });
});
