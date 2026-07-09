// Feature: core-flow-ui-upgrade, Task 10.2: DOM/integration test mobile-safety + desktop
//
// Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
//
// ─────────────────────────────────────────────────────────────────────────────
// GHI CHÚ QUAN TRỌNG VỀ GIỚI HẠN JSDOM (đọc trước khi sửa test này)
// ─────────────────────────────────────────────────────────────────────────────
// Test suite của dự án chạy trên **jsdom** (Vitest). jsdom KHÔNG có layout engine
// thật: `offsetWidth`, `scrollWidth`, `clientWidth`, và `getBoundingClientRect()`
// đều trả về 0. Vì vậy KHÔNG thể assert theo pixel thật kiểu:
//     document.documentElement.scrollWidth <= clientWidth
//     bounding box của hai phần tử giao nhau > 0px
//     Primary_CTA nằm trọn trong viewport theo toạ độ pixel
// Những phép đo đó trong jsdom hoặc vô nghĩa (luôn 0) hoặc pass giả tạo.
//
// Do đó test này khoá **HỢP ĐỒNG mobile-safety ở mức class/attribute** — đúng thứ
// mà jsdom kiểm chứng được một cách trung thực và không giả số layout:
//   - Primary_CTA mang vùng chạm tối thiểu qua `min-h-11` (≥ 44 CSS px — Req 4.3).
//   - Primary_CTA dùng `w-full sm:w-auto`: mobile chiếm trọn chiều rộng container
//     (không tràn ngang → không sinh cuộn ngang, Req 4.4), desktop tự co (Req 4.5).
//   - Chỉ có ĐÚNG MỘT phần tử `[data-core-flow-primary-cta]` (Primary_CTA duy nhất).
//   - Khi không có bước kế tiếp, component không render Primary_CTA (không thêm
//     phần tử tương tác có thể chồng lấp/tràn — Req 4.1).
//
// Kiểm chứng pixel thật (scrollWidth ≤ clientWidth, không overlap bounding box,
// CTA trong viewport 320–767px & ≥1024px) được để cho Playwright screenshot ở
// task 13.1 (Desktop 1440x900 + Mobile 390x844) — nơi có layout engine thật.
//
// Test này KHÔNG chạm product code.

import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";

import { CoreFlowNextStepCta } from "../../app/components/CoreFlowNextStepCta";
import type { CoreFlowCompletion, CoreFlowStepId } from "../../app/utils/core-flow-position";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** completion đầy đủ cờ; giá trị không ảnh hưởng tới việc render CTA "next"
 * (CTA phụ thuộc thứ tự `currentStepId`, không phụ thuộc completion). */
const FULL_COMPLETION: CoreFlowCompletion = {
  life_balance: true,
  life_insight: true,
  smart_goal: true,
  feasibility: true,
  twelve_week_setup: true,
  today: true,
};

/** Các bước Core_Flow có bước kế tiếp (render Primary_CTA "next"). */
const STEPS_WITH_NEXT: ReadonlyArray<CoreFlowStepId> = [
  "life_balance",
  "life_insight",
  "smart_goal",
  "feasibility",
  "twelve_week_setup",
];

/** Bước cuối — không có bước kế tiếp. */
const LAST_STEP: CoreFlowStepId = "today";

function renderCta(currentStepId: CoreFlowStepId) {
  return render(
    <MemoryRouter>
      <CoreFlowNextStepCta currentStepId={currentStepId} completion={FULL_COMPLETION} />
    </MemoryRouter>,
  );
}

/**
 * Đặt kích thước viewport giả lập. jsdom không tính lại layout theo giá trị này,
 * nhưng ta set để mô phỏng đúng ý định "render ở viewport 320–767px và ≥1024px"
 * và để khẳng định hợp đồng class là bất biến theo viewport (Tailwind responsive
 * class `w-full sm:w-auto` bao trùm cả hai dải).
 */
function setViewport(width: number) {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { writable: true, configurable: true, value: 844 });
}

const MOBILE_WIDTHS = [320, 390, 767] as const;
const DESKTOP_WIDTHS = [1024, 1440] as const;

afterEach(() => {
  // Khôi phục innerWidth mặc định của jsdom.
  setViewport(1024);
});

// ─────────────────────────────────────────────────────────────
// 1) Primary_CTA touch target + no-horizontal-overflow contract (Req 4.3, 4.4)
// ─────────────────────────────────────────────────────────────

describe("Mobile-safety — Primary_CTA touch target & overflow contract (Req 4.3, 4.4)", () => {
  it.each(MOBILE_WIDTHS)("ở viewport mobile %ipx: CTA có min-h-11 (≥44px) và w-full (không tràn ngang)", (width) => {
    setViewport(width);
    const { container } = renderCta("life_balance");

    const cta = container.querySelector<HTMLElement>("[data-core-flow-primary-cta]");
    expect(cta).not.toBeNull();

    // Req 4.3: vùng chạm tối thiểu 44x44 CSS px. Tailwind `min-h-11` = 44px.
    expect(cta).toHaveClass("min-h-11");
    // Req 4.4: mobile chiếm trọn chiều rộng container → không tạo cuộn ngang.
    expect(cta).toHaveClass("w-full");
    // Desktop breakpoint tự co (không ép full-width trên màn rộng — Req 4.5).
    expect(cta).toHaveClass("sm:w-auto");
  });

  it.each(DESKTOP_WIDTHS)("ở viewport desktop %ipx: CTA giữ min-h-11 và có sm:w-auto (Req 4.5)", (width) => {
    setViewport(width);
    const { container } = renderCta("smart_goal");

    const cta = container.querySelector<HTMLElement>("[data-core-flow-primary-cta]");
    expect(cta).not.toBeNull();
    expect(cta).toHaveClass("min-h-11");
    expect(cta).toHaveClass("sm:w-auto");
  });
});

// ─────────────────────────────────────────────────────────────
// 2) Đúng một Primary_CTA trên mỗi màn hình có bước kế tiếp (Req 4.1, 4.3)
// ─────────────────────────────────────────────────────────────

describe("Mobile-safety — đúng một Primary_CTA, không phần tử tương tác thừa (Req 4.1)", () => {
  it.each(STEPS_WITH_NEXT)("bước %s render đúng một phần tử [data-core-flow-primary-cta]", (stepId) => {
    const { container } = renderCta(stepId);
    const ctas = container.querySelectorAll("[data-core-flow-primary-cta]");
    expect(ctas).toHaveLength(1);
    expect(ctas[0]).toHaveClass("min-h-11");
  });

  it("bước cuối (today) không render Primary_CTA 'next' (không thêm phần tử có thể tràn/chồng lấp — Req 4.1, 4.6)", () => {
    const { container } = renderCta(LAST_STEP);
    expect(container.querySelector("[data-core-flow-primary-cta]")).toBeNull();
    // Container không chứa nút nào → không có phần tử tương tác thừa.
    expect(container.querySelector("button")).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// 3) Bất biến theo viewport: hợp đồng class không đổi giữa mobile và desktop
// ─────────────────────────────────────────────────────────────

describe("Mobile-safety — hợp đồng class bất biến giữa dải mobile và desktop (Req 4.3–4.5)", () => {
  it("cùng bộ class touch-target/width ở cả 320px và 1440px", () => {
    setViewport(320);
    const mobile = renderCta("feasibility");
    const mobileCta = mobile.container.querySelector<HTMLElement>("[data-core-flow-primary-cta]");
    const mobileClasses = mobileCta?.className ?? "";
    mobile.unmount();

    setViewport(1440);
    const desktop = renderCta("feasibility");
    const desktopCta = desktop.container.querySelector<HTMLElement>("[data-core-flow-primary-cta]");
    const desktopClasses = desktopCta?.className ?? "";

    // Component không phụ thuộc innerWidth (Tailwind responsive class bao cả 2 dải)
    // → chuỗi class phải giống hệt nhau ở mobile và desktop.
    expect(mobileClasses).toBe(desktopClasses);
    expect(mobileClasses).toContain("min-h-11");
    expect(mobileClasses).toContain("w-full");
    expect(mobileClasses).toContain("sm:w-auto");
  });
});
