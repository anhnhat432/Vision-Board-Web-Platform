// Feature: global-ui-upgrade, Task 8.3: DOM test nhất quán trang + page transition
//
// Mục tiêu kiểm chứng:
//   - R8.3: WHEN một Product_Page được điều hướng vào → áp dụng hiệu ứng chuyển
//     trang dùng token motion của Design_System. `MotionPageTransition` bọc trang
//     trong `<div class="page-transition-shell page-enter">`, và class `.page-enter`
//     điều khiển animation qua token `--duration-*` / `--ease-*` (không literal).
//   - R3.3: WHERE một Product_Page hiển thị tiêu đề cấp trang → dùng CÙNG một bậc
//     typography cho tiêu đề cấp trang đó trên các Product_Page tương đương.
//   - R4.3: WHERE hai UI_Component cùng loại xuất hiện trên các Product_Page khác
//     nhau → dùng CÙNG token padding và bo góc.
//
// Cách tiếp cận:
//   - Mock `useReducedMotion` từ "motion/react" bằng một holder hoisted để bật/tắt
//     Reduced_Motion. Khi tắt → wrapper mang class token motion; khi bật →
//     `MotionPageTransition` trả children trực tiếp (không wrapper).
//   - Class chuyển trang được kiểm ở mức DOM (class presence) + mức CSS (rule
//     `.page-enter` trong theme.css tham chiếu `var(--duration-*)` / `var(--ease-*)`),
//     vì jsdom không áp animation thật.
//   - Nhóm các trang legal/support cùng loại và khẳng định chúng dùng CÙNG token
//     class cho tiêu đề cấp trang (`font-serif text-3xl font-medium`), section-gap
//     (`space-y-section`), card-padding (`p-card-pad`) và radius (`rounded-card`,
//     `rounded-pill`). Các trang dùng `Link` của react-router nên bọc trong
//     `MemoryRouter`.
//
// Validates: Requirements 3.3, 4.3, 8.3

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { render, within } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ─────────────────────────────────────────────────────────────
// Mock motion/react — chỉ ghi đè useReducedMotion, giữ nguyên các export khác.
// Holder hoisted cho phép mỗi test điều khiển giá trị Reduced_Motion.
// ─────────────────────────────────────────────────────────────
const motionMock = vi.hoisted(() => ({ reduceMotion: false as boolean | null }));

vi.mock("motion/react", async () => {
  const actual = await vi.importActual<typeof import("motion/react")>("motion/react");
  return {
    ...actual,
    useReducedMotion: () => motionMock.reduceMotion,
  };
});

import { MotionPageTransition } from "@/app/components/motion/MotionPageTransition";
import { BillingFAQPage } from "@/app/pages/BillingFAQPage";
import { ContactPage } from "@/app/pages/ContactPage";
import { HelpCenterPage } from "@/app/pages/HelpCenterPage";
import { PrivacyPage } from "@/app/pages/PrivacyPage";
import { RefundPolicyPage } from "@/app/pages/RefundPolicyPage";
import { TermsPage } from "@/app/pages/TermsPage";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function renderInRouter(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

function readThemeCss(): string {
  return readFileSync(resolve(process.cwd(), "src/styles/theme.css"), "utf8");
}

/** Trích thân của rule `.page-enter { ... }` đầu tiên (không phải @keyframes,
 * không phải selector-list trong reduced-motion block). */
function extractPageEnterRule(css: string): string | null {
  const m = /\.page-enter\s*\{([^}]*)\}/.exec(css);
  return m ? m[1] : null;
}

// Bậc typography dùng cho tiêu đề cấp trang (page-title tier) — R3.3.
const PAGE_TITLE_TIER_CLASSES = ["font-serif", "text-3xl", "font-medium"] as const;

// Token radius/spacing/padding dùng chung — R4.3.
const RADIUS_CARD = "rounded-card";
const RADIUS_PILL = "rounded-pill";
const SECTION_GAP = "space-y-section";
const CARD_PADDING = "p-card-pad";

// Nhóm trang legal/support cùng loại (task 8.1).
const LEGAL_SUPPORT_PAGES = [
  { name: "TermsPage", element: <TermsPage /> },
  { name: "PrivacyPage", element: <PrivacyPage /> },
  { name: "RefundPolicyPage", element: <RefundPolicyPage /> },
  { name: "ContactPage", element: <ContactPage /> },
  { name: "HelpCenterPage", element: <HelpCenterPage /> },
  { name: "BillingFAQPage", element: <BillingFAQPage /> },
] as const;

// Trang dạng article/section (không phải Card layout của BillingFAQ) — chia sẻ
// cùng token section-gap + card-padding.
const ARTICLE_PAGES = ["TermsPage", "PrivacyPage", "RefundPolicyPage", "ContactPage", "HelpCenterPage"] as const;

afterEach(() => {
  motionMock.reduceMotion = false;
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────
// 1) R8.3 — Page transition dùng class token motion
// ─────────────────────────────────────────────────────────────

describe("MotionPageTransition — page transition dùng token motion (R8.3)", () => {
  beforeEach(() => {
    motionMock.reduceMotion = false;
  });

  it("khi Reduced_Motion tắt → bọc children trong wrapper mang class .page-transition-shell.page-enter", () => {
    const { container } = render(
      <MotionPageTransition pageKey="/terms">
        <p data-testid="page-body">Nội dung trang</p>
      </MotionPageTransition>,
    );

    const wrapper = container.querySelector(".page-transition-shell");
    expect(wrapper).not.toBeNull();
    // Class token motion phải hiện diện đồng thời (robust: kiểm class presence).
    expect(wrapper).toHaveClass("page-transition-shell", "page-enter");
    // Children được render bên trong wrapper.
    expect(within(wrapper as HTMLElement).getByTestId("page-body")).toBeInTheDocument();
  });

  it("remount theo pageKey khác → vẫn áp class .page-enter cho lần điều hướng mới", () => {
    const { container, rerender } = render(
      <MotionPageTransition pageKey="/terms">
        <span>trang A</span>
      </MotionPageTransition>,
    );
    expect(container.querySelector(".page-enter")).not.toBeNull();

    rerender(
      <MotionPageTransition pageKey="/privacy">
        <span>trang B</span>
      </MotionPageTransition>,
    );
    // Mỗi Product_Page điều hướng vào đều nhận hiệu ứng chuyển trang.
    expect(container.querySelector(".page-transition-shell.page-enter")).not.toBeNull();
  });

  it("khi Reduced_Motion bật → trả children trực tiếp, KHÔNG wrapper page-enter", () => {
    motionMock.reduceMotion = true;
    const { container } = render(
      <MotionPageTransition pageKey="/terms">
        <p data-testid="page-body">Nội dung trang</p>
      </MotionPageTransition>,
    );

    // Không còn wrapper token motion — children render trực tiếp.
    expect(container.querySelector(".page-transition-shell")).toBeNull();
    expect(container.querySelector(".page-enter")).toBeNull();
    expect(within(container).getByTestId("page-body")).toBeInTheDocument();
  });

  it("rule .page-enter trong theme.css điều khiển animation bằng token --duration-*/--ease-* (không literal)", () => {
    const rule = extractPageEnterRule(readThemeCss());
    expect(rule, "thiếu rule .page-enter trong theme.css").not.toBeNull();
    if (rule) {
      // Dùng token motion dùng chung, không hard-code thời lượng/easing.
      expect(rule).toMatch(/animation:\s*[^;]*var\(--duration-[\w-]+\)/i);
      expect(rule).toMatch(/var\(--ease-[\w-]+\)/i);
      // Không xuất hiện literal thời lượng dạng số (vd 320ms/0.32s) trong shorthand.
      expect(rule).not.toMatch(/animation:[^;]*\b\d[\d.]*m?s\b/i);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// 2) R3.3 — Tiêu đề cấp trang dùng CÙNG bậc typography trên các trang tương đương
// ─────────────────────────────────────────────────────────────

describe("Product_Page — tiêu đề cấp trang nhất quán bậc typography (R3.3)", () => {
  it.each(LEGAL_SUPPORT_PAGES)("$name: h1 cấp trang dùng bậc page-title (font-serif text-3xl font-medium)", ({
    element,
  }) => {
    const { container } = renderInRouter(element);
    const h1 = container.querySelector("h1");
    expect(h1, "trang cần có đúng một tiêu đề cấp trang <h1>").not.toBeNull();
    for (const cls of PAGE_TITLE_TIER_CLASSES) {
      expect(h1, `h1 thiếu class bậc page-title '${cls}'`).toHaveClass(cls);
    }
  });

  it("mọi trang legal/support dùng CÙNG một tập class page-title tier cho h1", () => {
    const tierSignatures = LEGAL_SUPPORT_PAGES.map(({ element }) => {
      const { container, unmount } = renderInRouter(element);
      const h1 = container.querySelector("h1") as HTMLElement;
      const classes = h1.className.split(/\s+/);
      // Chữ ký bậc = tập con class typography dùng chung, sắp xếp ổn định.
      const signature = PAGE_TITLE_TIER_CLASSES.filter((c) => classes.includes(c)).join(" ");
      unmount();
      return signature;
    });

    const expected = PAGE_TITLE_TIER_CLASSES.join(" ");
    for (const sig of tierSignatures) {
      expect(sig).toBe(expected);
    }
    // Tất cả trang chia sẻ đúng một chữ ký bậc typography.
    expect(new Set(tierSignatures).size).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────
// 3) R4.3 — Component cùng loại dùng CÙNG token padding + bo góc
// ─────────────────────────────────────────────────────────────

describe("Product_Page — token radius/spacing nhất quán giữa trang tương đương (R4.3)", () => {
  it.each(LEGAL_SUPPORT_PAGES)("$name: dùng token radius dùng chung (rounded-card + rounded-pill)", ({ element }) => {
    const { container } = renderInRouter(element);
    // Bề mặt card dùng token bo góc card.
    expect(container.querySelector(`.${RADIUS_CARD}`), "thiếu bề mặt rounded-card").not.toBeNull();
    // Icon badge dùng token bo góc pill.
    expect(container.querySelector(`.${RADIUS_PILL}`), "thiếu badge rounded-pill").not.toBeNull();
  });

  it.each(ARTICLE_PAGES.map((name) => LEGAL_SUPPORT_PAGES.find((p) => p.name === name)!))(
    "$name: dùng token section-gap (space-y-section) + card-padding (p-card-pad)",
    ({ element }) => {
      const { container } = renderInRouter(element);
      expect(container.querySelector(`.${SECTION_GAP}`), "thiếu section-gap token").not.toBeNull();
      expect(container.querySelector(`.${CARD_PADDING}`), "thiếu card-padding token").not.toBeNull();
    },
  );

  it("nhóm article dùng CÙNG bộ token bố cục (section-gap + card-padding + rounded-card)", () => {
    const layoutSignatures = ARTICLE_PAGES.map((name) => {
      const page = LEGAL_SUPPORT_PAGES.find((p) => p.name === name)!;
      const { container, unmount } = renderInRouter(page.element);
      const tokens = [SECTION_GAP, CARD_PADDING, RADIUS_CARD].filter(
        (t) => container.querySelector(`.${t}`) !== null,
      );
      unmount();
      return tokens.join("|");
    });

    const expected = [SECTION_GAP, CARD_PADDING, RADIUS_CARD].join("|");
    for (const sig of layoutSignatures) {
      expect(sig).toBe(expected);
    }
    expect(new Set(layoutSignatures).size).toBe(1);
  });
});
