import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/AuthContext", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useAuthContext: () => ({
    user: { uid: "test-user-123" },
    userProfile: { displayName: "Test User" },
    authLoading: false,
    isConfigured: true,
  }),
  useOptionalAuthContext: () => ({
    user: { uid: "test-user-123" },
  }),
}));

import * as appMode from "@/app/utils/app-mode";
import { renderAppRoute, resetTestStorage, seedTwelveWeekGoal } from "@/test/app-flow-helpers";

describe("12-week destructive confirmations", () => {
  beforeEach(() => {
    resetTestStorage();
    vi.spyOn(appMode, "isDemoMode").mockReturnValue(false);
    vi.spyOn(appMode, "isRealMode").mockReturnValue(true);
    vi.spyOn(appMode, "shouldEnable12WeekPullSync").mockReturnValue(true);
    vi.spyOn(appMode, "shouldEnable12WeekMutationSync").mockReturnValue(true);
  });

  it("keeps account and cloud deletion out of cycle settings", async () => {
    seedTwelveWeekGoal();
    renderAppRoute("/12-week-system?tab=settings");
    const user = userEvent.setup();

    const settingsTab = await screen.findByRole("tab", { name: /Chu kỳ/i });
    await user.click(settingsTab);

    expect(await screen.findAllByText("Cài đặt chu kỳ")).not.toHaveLength(0);

    const resetCycleButtons = screen.getAllByRole("button", { name: "Làm mới chu kỳ" });
    expect(resetCycleButtons).toHaveLength(1);
    expect(resetCycleButtons[0]).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Xóa dữ liệu tài khoản/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Xóa tài khoản/i })).not.toBeInTheDocument();
    expect(screen.queryByText("Đồng bộ & An toàn dữ liệu")).not.toBeInTheDocument();
  });

  it("keeps reset-current-cycle confirmation inside cycle settings", async () => {
    seedTwelveWeekGoal();
    renderAppRoute("/12-week-system?tab=settings");
    const user = userEvent.setup();

    const settingsTab = await screen.findByRole("tab", { name: /Chu kỳ/i });
    await user.click(settingsTab);

    const resetCycleButtons = await screen.findAllByRole("button", { name: "Làm mới chu kỳ" });
    expect(resetCycleButtons).toHaveLength(1);
    await user.click(resetCycleButtons[0]);

    expect(await screen.findByRole("heading", { name: "Làm mới chu kỳ 12 tuần?" })).toBeInTheDocument();
  });
});
