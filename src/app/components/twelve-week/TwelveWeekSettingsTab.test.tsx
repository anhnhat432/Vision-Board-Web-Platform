import type { ComponentProps } from "react";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TwelveWeekSettingsTab } from "./TwelveWeekSettingsTab";

vi.mock("./TwelveWeekCycleSettingsPanel", () => ({
  TwelveWeekCycleSettingsPanel: () => <div>Cycle controls</div>,
}));
vi.mock("./WeeklyTimeBlocksPanel", () => ({ WeeklyTimeBlocksPanel: () => <div>Time blocks</div> }));
vi.mock("./TwelveWeekPlanAccessSection", () => ({ TwelveWeekPlanAccessSection: () => <div>Plan access</div> }));
vi.mock("./TwelveWeekLocalStatusSection", () => ({ TwelveWeekLocalStatusSection: () => <div>Sync status</div> }));
vi.mock("./TwelveWeekDeviceDetailsSection", () => ({
  TwelveWeekRemindersSettings: () => <div>Reminders</div>,
  TwelveWeekExecutionPreferences: () => <div>Execution preferences</div>,
  TwelveWeekDataSafety: () => <div>Data safety</div>,
  TwelveWeekQuickShortcuts: () => <div>Quick shortcuts</div>,
  TwelveWeekDangerZone: () => (
    <div>
      <button type="button">Đặt lại chu kỳ</button>
      <button type="button">Xóa dữ liệu</button>
    </div>
  ),
}));
vi.mock("../FeedbackDialog", () => ({ FeedbackDialog: () => <button type="button">Góp ý</button> }));
vi.mock("../../utils/app-mode", () => ({ isRealMode: () => false }));

const props = {
  system: { weeklyTimeBlocks: [] },
} as unknown as ComponentProps<typeof TwelveWeekSettingsTab>;

describe("TwelveWeekSettingsTab", () => {
  it("groups settings into cycle, sync, and data regions", () => {
    render(<TwelveWeekSettingsTab {...props} />);

    expect(screen.getByRole("region", { name: "Chu kỳ" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Nhắc nhở và đồng bộ" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Dữ liệu và nguy hiểm" })).toBeInTheDocument();
    expect(screen.getByText("Cycle controls")).toBeInTheDocument();
    expect(screen.getByText("Sync status")).toBeInTheDocument();
  });

  it("keeps destructive actions inside the danger region", () => {
    render(<TwelveWeekSettingsTab {...props} />);

    const danger = screen.getByRole("region", { name: "Dữ liệu và nguy hiểm" });
    expect(within(danger).getByRole("button", { name: /reset|đặt lại/i })).toBeInTheDocument();
    expect(within(danger).getByRole("button", { name: /xóa/i })).toBeInTheDocument();
  });
});
