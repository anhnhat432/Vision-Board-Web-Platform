// Feature: core-flow-ui-upgrade, Task 5.3: Unit test Next_Step_Guidance UI
//
// Validates: Requirements 2.4, 2.6, 2.7
//
// Kiểm chứng hành vi Next_Step_Guidance của `CoreFlowNextStepCta`:
//   - Mỗi màn hình Core_Flow render ĐÚNG MỘT Primary_CTA
//     (`[data-core-flow-primary-cta]`) trỏ tới route đã đăng ký, và bấm CTA điều
//     hướng tới route hiện có (Req 2.4, 2.6).
//   - Bước cuối (`today`) không có bước kế tiếp → không render Primary_CTA
//     (ranh giới Req 2.3).
//   - Route bước kế tiếp bị guard chặn / chưa đăng ký → ẩn Primary_CTA và hiển
//     thị chỉ báo "bước kế tiếp hiện chưa truy cập được" (Req 2.7).
//
// Test này KHÔNG chạm product code. Trường hợp guarded route được mô phỏng bằng
// cách mock `isRegisteredRoute` trong module `../utils/core-flow-navigation`
// (giữ nguyên các export khác qua `importActual`).

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CoreFlowNextStepCta } from "./CoreFlowNextStepCta";
import type { CoreFlowCompletion, CoreFlowStepId } from "../utils/core-flow-position";

// ─────────────────────────────────────────────────────────────
// Mock `isRegisteredRoute` — giữ nguyên các export khác của module.
// Mặc định dùng implementation thật; test guarded route ghi đè bằng
// `mockReturnValueOnce(false)` cho đúng một lần render.
// ─────────────────────────────────────────────────────────────
const { isRegisteredRouteMock } = vi.hoisted(() => ({ isRegisteredRouteMock: vi.fn() }));

vi.mock("../utils/core-flow-navigation", async () => {
  const actual =
    await vi.importActual<typeof import("../utils/core-flow-navigation")>("../utils/core-flow-navigation");
  isRegisteredRouteMock.mockImplementation(actual.isRegisteredRoute);
  return { ...actual, isRegisteredRoute: isRegisteredRouteMock };
});

// Import sau khi khai báo mock để lấy phiên bản đã mock.
import {
  CORE_FLOW_NEXT_STEP_CTA_LABEL,
  CORE_FLOW_STEP_ROUTE,
} from "../utils/core-flow-navigation";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Toàn bộ cờ hoàn tất = true; CTA "next" chỉ phụ thuộc thứ tự `currentStepId`. */
const FULL_COMPLETION: CoreFlowCompletion = {
  life_balance: true,
  life_insight: true,
  smart_goal: true,
  feasibility: true,
  twelve_week_setup: true,
  today: true,
};

/** Các bước có bước kế tiếp (render Primary_CTA) kèm route đích mong đợi. */
const STEPS_WITH_NEXT: ReadonlyArray<{ stepId: CoreFlowStepId; nextRoute: string }> = [
  { stepId: "life_balance", nextRoute: CORE_FLOW_STEP_ROUTE.life_insight },
  { stepId: "life_insight", nextRoute: CORE_FLOW_STEP_ROUTE.smart_goal },
  { stepId: "smart_goal", nextRoute: CORE_FLOW_STEP_ROUTE.feasibility },
  { stepId: "feasibility", nextRoute: CORE_FLOW_STEP_ROUTE.twelve_week_setup },
  { stepId: "twelve_week_setup", nextRoute: CORE_FLOW_STEP_ROUTE.today },
];

/** Bước cuối — không có bước kế tiếp. */
const LAST_STEP: CoreFlowStepId = "today";

/** Hiển thị pathname hiện tại để assert điều hướng sau khi bấm CTA. */
function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
}

function renderCta(currentStepId: CoreFlowStepId, initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <CoreFlowNextStepCta currentStepId={currentStepId} completion={FULL_COMPLETION} />
      <LocationDisplay />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  isRegisteredRouteMock.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────
// 1) Đúng một Primary_CTA trỏ route đã đăng ký + điều hướng đúng (Req 2.4, 2.6)
// ─────────────────────────────────────────────────────────────

describe("Next_Step_Guidance — đúng một Primary_CTA trỏ route đã đăng ký (Req 2.4, 2.6)", () => {
  it.each(STEPS_WITH_NEXT)(
    "bước $stepId: render đúng một [data-core-flow-primary-cta]",
    ({ stepId }) => {
      const { container } = renderCta(stepId);
      const ctas = container.querySelectorAll("[data-core-flow-primary-cta]");
      expect(ctas).toHaveLength(1);
    },
  );

  it("bấm Primary_CTA điều hướng tới route bước kế tiếp đã đăng ký (Req 2.4)", async () => {
    const user = userEvent.setup();
    renderCta("life_balance", "/life-balance");

    expect(screen.getByTestId("location-display")).toHaveTextContent("/life-balance");

    const cta = screen.getByRole("button", {
      name: new RegExp(CORE_FLOW_NEXT_STEP_CTA_LABEL.life_insight),
    });
    await user.click(cta);

    // Điều hướng tới route hiện có `/life-insight` (nextStepId của life_balance).
    expect(screen.getByTestId("location-display")).toHaveTextContent(
      CORE_FLOW_STEP_ROUTE.life_insight,
    );
  });
});

// ─────────────────────────────────────────────────────────────
// 2) Bước cuối không render Primary_CTA "next" (ranh giới Req 2.3)
// ─────────────────────────────────────────────────────────────

describe("Next_Step_Guidance — bước cuối không có Primary_CTA (Req 2.3)", () => {
  it("bước today (bước cuối) không render Primary_CTA và không có chỉ báo", () => {
    const { container } = renderCta(LAST_STEP);
    expect(container.querySelector("[data-core-flow-primary-cta]")).toBeNull();
    expect(container.querySelector("button")).toBeNull();
    expect(screen.queryByTestId("core-flow-next-unavailable")).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// 3) Route bước kế tiếp bị guard chặn → ẩn CTA + hiển thị chỉ báo (Req 2.7)
// ─────────────────────────────────────────────────────────────

describe("Next_Step_Guidance — route guarded ẩn CTA và hiển thị chỉ báo (Req 2.7)", () => {
  it("khi route bước kế tiếp chưa truy cập được: ẩn Primary_CTA, hiện indicator", () => {
    // Mô phỏng route bước kế tiếp bị guard chặn / chưa đăng ký.
    isRegisteredRouteMock.mockReturnValue(false);

    const { container } = renderCta("life_balance");

    // Primary_CTA bị ẩn.
    expect(container.querySelector("[data-core-flow-primary-cta]")).toBeNull();
    // Chỉ báo "bước kế tiếp hiện chưa truy cập được" hiển thị.
    const indicator = screen.getByTestId("core-flow-next-unavailable");
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveTextContent(/chưa truy cập được/i);
  });
});
