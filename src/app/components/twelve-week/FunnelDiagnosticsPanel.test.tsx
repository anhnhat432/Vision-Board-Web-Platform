import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { FunnelDiagnosticsSnapshot } from "@/app/utils/funnel-diagnostics";
import { FunnelDiagnosticsPanel } from "./FunnelDiagnosticsPanel";

function makeSnapshot(overrides: Partial<FunnelDiagnosticsSnapshot> = {}): FunnelDiagnosticsSnapshot {
  return {
    intent: { id: "learn_skill", label: "Học một kỹ năng" },
    steps: {
      onboardingCompleted: true,
      hasRealLifeBalance: true,
      hasFocusArea: true,
      hasPendingSmartGoal: true,
      hasPendingFeasibility: true,
      has12WeekPlan: true,
      hasActiveTwelveWeekSystem: true,
    },
    smart: {
      present: true,
      qualityLevel: "okay",
      overallScoreBucket: "60-79",
      hasMeasurableTarget: true,
      hasBaseline: false,
      weeklyHoursBucket: "5+",
    },
    feasibility: {
      present: true,
      resultType: "challenging",
      adjustedScoreBucket: "10-14",
      bottleneckAxis: "energy",
      planLoad: "balanced",
      weeklyCapacity: "medium",
    },
    plan: {
      present: true,
      qualityLevel: "okay",
      overallScoreBucket: "60-79",
      leadIndicatorCount: 3,
      coreIndicatorCount: 2,
      optionalIndicatorCount: 1,
      milestoneCount: 3,
      weekOneTaskCount: 4,
      weekOneStartable: true,
    },
    execution: {
      hasActiveSystem: true,
      currentWeek: 3,
      totalWeeks: 12,
      completedTaskCount: 7,
      totalTaskCount: 18,
      weeklyReviewsCompleted: 2,
      pendingWeeklyReviews: 0,
      dailyCheckInCount: 9,
      activeWeekCompletionPercent: 65,
      reviewDueToday: false,
    },
    generatedAt: "2026-05-03T08:00:00.000Z",
    ...overrides,
  };
}

describe("FunnelDiagnosticsPanel — visibility", () => {
  it("renders nothing by default (env flag is off in tests)", () => {
    const { container } = render(<FunnelDiagnosticsPanel />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when explicitly disabled even with a snapshot", () => {
    const { container } = render(<FunnelDiagnosticsPanel enabled={false} snapshot={makeSnapshot()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the panel when enabled is forced true (test/dev path)", () => {
    render(<FunnelDiagnosticsPanel enabled snapshot={makeSnapshot()} />);
    expect(screen.getByTestId("funnel-diagnostics-panel")).toBeInTheDocument();
  });
});

describe("FunnelDiagnosticsPanel — content", () => {
  it("shows the privacy note when visible", () => {
    render(<FunnelDiagnosticsPanel enabled snapshot={makeSnapshot()} />);
    const note = screen.getByTestId("funnel-diagnostics-privacy-note");
    expect(note.textContent).toMatch(/không hiển thị nội dung mục tiêu/i);
  });

  it("renders the bucketed metrics from the snapshot", () => {
    render(<FunnelDiagnosticsPanel enabled snapshot={makeSnapshot()} />);
    const panel = screen.getByTestId("funnel-diagnostics-panel");
    expect(panel.textContent).toContain("Học một kỹ năng");
    expect(panel.textContent).toContain("learn_skill");
    expect(panel.textContent).toContain("60-79");
    expect(panel.textContent).toContain("challenging");
    expect(panel.textContent).toContain("balanced");
    expect(panel.textContent).toContain("65%");
  });

  it("does not render any user free text — only ids, levels, counts, and labels", () => {
    const RAW = "RAW USER TEXT THAT SHOULD NEVER LEAK";
    // Even though FunnelDiagnosticsSnapshot doesn't carry strings other than
    // intent label / id / canned bucket strings / generatedAt, this test
    // ensures the panel doesn't accidentally render a stray field.
    render(
      <FunnelDiagnosticsPanel
        enabled
        snapshot={
          {
            ...makeSnapshot(),
            // @ts-expect-error injecting a key that should not be rendered
            __raw: RAW,
          } satisfies FunnelDiagnosticsSnapshot
        }
      />,
    );
    expect(screen.getByTestId("funnel-diagnostics-panel").textContent).not.toContain(RAW);
  });

  it("shows '—' fallbacks for null fields without crashing", () => {
    render(
      <FunnelDiagnosticsPanel
        enabled
        snapshot={{
          ...makeSnapshot(),
          intent: { id: null, label: "Chưa chọn" },
          smart: {
            present: false,
            qualityLevel: null,
            overallScoreBucket: null,
            hasMeasurableTarget: null,
            hasBaseline: null,
            weeklyHoursBucket: null,
          },
          feasibility: {
            present: false,
            resultType: null,
            adjustedScoreBucket: null,
            bottleneckAxis: null,
            planLoad: null,
            weeklyCapacity: null,
          },
          plan: {
            present: false,
            qualityLevel: null,
            overallScoreBucket: null,
            leadIndicatorCount: 0,
            coreIndicatorCount: 0,
            optionalIndicatorCount: 0,
            milestoneCount: 0,
            weekOneTaskCount: 0,
            weekOneStartable: null,
          },
          execution: {
            hasActiveSystem: false,
            currentWeek: null,
            totalWeeks: null,
            completedTaskCount: 0,
            totalTaskCount: 0,
            weeklyReviewsCompleted: 0,
            pendingWeeklyReviews: 0,
            dailyCheckInCount: 0,
            activeWeekCompletionPercent: null,
            reviewDueToday: false,
          },
        }}
      />,
    );
    const panel = screen.getByTestId("funnel-diagnostics-panel");
    expect(panel.textContent).toContain("Chưa chọn");
    expect(panel.textContent).toContain("—");
  });
});
