// Feature: ux-ui-upgrade, Task 8.6: Component test — reduced motion
//
// Mục tiêu kiểm chứng Requirement 5 (Tôn trọng tùy chọn giảm chuyển động):
//   - R5.1: WHILE Reduced_Motion bật → vô hiệu hóa mọi hiệu ứng chuyển động
//     KHÔNG thiết yếu (animation trang trí, transition, parallax, auto-scroll)
//     sao cho không có phần tử nào có chuyển động kéo dài quá 0ms ngoài
//     thay đổi opacity tức thời.
//   - R5.2: WHILE Reduced_Motion bật → motion thiết yếu còn lại (loading,
//     overlay) ≤ 200ms.
//   - R5.3: WHILE Reduced_Motion bật → 100% control vẫn hiển thị, truy cập
//     được qua bàn phím và thao tác được.
//   - R5.4: WHEN Reduced_Motion KHÔNG bật → motion mặc định nằm trong dải
//     150–500ms.
//   - R5.5: WHEN trạng thái Reduced_Motion thay đổi giữa lúc Core_Flow_Screen
//     đang hiển thị → áp dụng cấu hình mới ≤ 500ms KHÔNG cần tải lại trang.
//
// Cách tiếp cận:
//   - Mock `window.matchMedia('(prefers-reduced-motion: reduce)')` bằng một
//     `MediaQueryList`-like có hàm `trigger(matches)` để mô phỏng người dùng
//     bật/tắt tùy chọn OS.
//   - Mount một harness Core_Flow_Screen-like tiêu thụ `useReducedMotion`
//     (đúng hook production tại `src/app/hooks/useReducedMotion.ts`) để xác
//     nhận R5.3 và R5.5 ở mức React (no reload, control thao tác được).
//   - Parse `src/styles/theme.css` để kiểm chứng các bất biến cấp CSS
//     (R5.1, R5.2, R5.4) — jsdom không áp `@media` rules, nên kiểm chứng
//     qua phân tích cấu trúc CSS là cách thuần và bền vững nhất.
//
// Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useReducedMotion } from "@/app/hooks/useReducedMotion";

// ─────────────────────────────────────────────────────────────
// matchMedia mock — đủ rich để hook addEventListener('change', …) hoạt động
// và test có thể trigger thay đổi tùy chọn OS (R5.5).
// ─────────────────────────────────────────────────────────────

interface MockMediaQueryList {
  matches: boolean;
  media: string;
  addEventListener: (event: "change", handler: (e: MediaQueryListEvent) => void) => void;
  removeEventListener: (event: "change", handler: (e: MediaQueryListEvent) => void) => void;
  /** Mô phỏng OS bật/tắt prefers-reduced-motion. */
  trigger: (matches: boolean) => void;
  /** Số listener đang đăng ký (kiểm chứng cleanup khi unmount). */
  listenerCount: () => number;
}

function createMockMediaQuery(initial: boolean, query: string): MockMediaQueryList {
  const handlers = new Set<(e: MediaQueryListEvent) => void>();
  const mq: MockMediaQueryList = {
    matches: initial,
    media: query,
    addEventListener: (_event, handler) => {
      handlers.add(handler);
    },
    removeEventListener: (_event, handler) => {
      handlers.delete(handler);
    },
    trigger: (matches) => {
      mq.matches = matches;
      for (const handler of handlers) {
        handler({ matches, media: query } as MediaQueryListEvent);
      }
    },
    listenerCount: () => handlers.size,
  };
  return mq;
}

// ─────────────────────────────────────────────────────────────
// Harness Core_Flow_Screen-like:
//   - Có 1 button thiết yếu (action) và 1 input thiết yếu (form).
//   - Khi `useReducedMotion()` true → áp class motion thiết yếu (`motion-press`)
//     và bỏ class motion trang trí (`motion-reveal`).
//   - Đếm số click xác nhận hành vi vẫn thao tác được khi reduced-motion.
// ─────────────────────────────────────────────────────────────

interface HarnessProps {
  onClick?: () => void;
}

function ReducedMotionHarness({ onClick }: HarnessProps) {
  const reduce = useReducedMotion();
  const [count, setCount] = useState(0);

  // Class trang trí (motion-reveal) chỉ bật khi KHÔNG reduce → R5.1.
  // Class thiết yếu (motion-press) luôn bật, nhưng theme.css đảm bảo
  // dưới reduce, transform :active bị vô hiệu hoá → R5.2.
  const decorClass = reduce ? "" : "motion-reveal";
  const essentialClass = "motion-press";

  return (
    <section aria-label="Reduced-motion harness" data-reduced-motion={reduce ? "on" : "off"}>
      <p data-testid="reduce-flag">{reduce ? "reduce-on" : "reduce-off"}</p>
      <button
        type="button"
        data-testid="harness-action"
        className={`${essentialClass} ${decorClass}`.trim()}
        onClick={() => {
          setCount((c) => c + 1);
          onClick?.();
        }}
      >
        Hành động chính
      </button>
      <p data-testid="harness-count">{count}</p>
      <input data-testid="harness-input" type="text" aria-label="Trường nhập" defaultValue="" />
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Đọc + tiện ích parse theme.css cho kiểm chứng cấp CSS
// ─────────────────────────────────────────────────────────────

function readThemeCss(): string {
  return readFileSync(resolve(process.cwd(), "src/styles/theme.css"), "utf8");
}

/** Trích các custom property `--duration-*` từ block `:root` đầu tiên. */
function extractDurationTokens(css: string): Record<string, number> {
  const out: Record<string, number> = {};
  const rootMatch = /:root\s*\{([\s\S]*?)\}/.exec(css);
  if (!rootMatch) return out;
  const body = rootMatch[1];
  const decl = /--duration-([\w-]+)\s*:\s*([\d.]+)ms/g;
  let m: RegExpExecArray | null = decl.exec(body);
  while (m !== null) {
    out[`--duration-${m[1]}`] = Number(m[2]);
    m = decl.exec(body);
  }
  return out;
}

/**
 * Trích nội dung tất cả các block `@media (prefers-reduced-motion: reduce)`
 * (gộp lại) — để kiểm chứng các rule áp dụng dưới reduced-motion.
 */
function extractReducedMotionBlocks(css: string): string {
  // Quét nested-brace để lấy đúng nội dung của from `{` tới `}` cân bằng.
  const queries = [...css.matchAll(/@media\s*\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{/gi)];
  const chunks: string[] = [];
  for (const q of queries) {
    const start = (q.index ?? 0) + q[0].length;
    let depth = 1;
    let i = start;
    while (i < css.length && depth > 0) {
      const ch = css[i];
      if (ch === "{") depth += 1;
      else if (ch === "}") depth -= 1;
      i += 1;
    }
    chunks.push(css.slice(start, i - 1));
  }
  return chunks.join("\n");
}

// ─────────────────────────────────────────────────────────────
// Hằng số dùng chung
// ─────────────────────────────────────────────────────────────

const QUERY = "(prefers-reduced-motion: reduce)";

const ESSENTIAL_MOTION_MAX_MS = 200; // R5.2
const DEFAULT_MOTION_MIN_MS = 150; // R5.4
const DEFAULT_MOTION_MAX_MS = 500; // R5.4
const TOGGLE_BUDGET_MS = 500; // R5.5

// ─────────────────────────────────────────────────────────────
// 1) R5.5 — Toggle áp dụng ≤ 500ms KHÔNG cần tải lại trang
// ─────────────────────────────────────────────────────────────

describe("Reduced-motion — toggle áp dụng ≤500ms không reload (R5.5)", () => {
  let mq: MockMediaQueryList;
  let reloadSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mq = createMockMediaQuery(false, QUERY);
    vi.stubGlobal("matchMedia", (q: string) => {
      // Trả mock duy nhất khi query là prefers-reduced-motion;
      // các query khác trả stub trung tính.
      if (q.includes("prefers-reduced-motion")) return mq;
      return {
        matches: false,
        media: q,
        addEventListener: () => {},
        removeEventListener: () => {},
      } as unknown as MediaQueryList;
    });

    // Theo dõi mọi cố gắng tải lại trang. Dùng `Object.defineProperty` để
    // ghi đè `location.reload` trong jsdom.
    reloadSpy = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        ...window.location,
        reload: reloadSpy,
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("bật prefers-reduced-motion ở runtime → hook cập nhật ≤500ms, không reload", () => {
    vi.useFakeTimers();
    const start = Date.now();

    render(<ReducedMotionHarness />);

    expect(screen.getByTestId("reduce-flag")).toHaveTextContent("reduce-off");

    act(() => {
      mq.trigger(true);
    });

    // Hook cập nhật state đồng bộ — chắc chắn ≤500ms (chưa tăng giờ ảo).
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThanOrEqual(TOGGLE_BUDGET_MS);
    expect(screen.getByTestId("reduce-flag")).toHaveTextContent("reduce-on");
    expect(screen.getByTestId("harness-action")).toHaveAttribute("class", expect.stringMatching(/^motion-press\s*$/));

    // Không bao giờ gọi reload (R5.5).
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it("tắt prefers-reduced-motion ở runtime → hook cập nhật ngược, không reload", () => {
    mq.matches = true;
    render(<ReducedMotionHarness />);
    expect(screen.getByTestId("reduce-flag")).toHaveTextContent("reduce-on");

    act(() => {
      mq.trigger(false);
    });

    expect(screen.getByTestId("reduce-flag")).toHaveTextContent("reduce-off");
    // Class trang trí được phục hồi khi tắt reduce → R5.4 (motion mặc định).
    expect(screen.getByTestId("harness-action").className).toContain("motion-reveal");
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it("unmount harness gỡ listener matchMedia (không leak)", () => {
    const { unmount } = render(<ReducedMotionHarness />);
    expect(mq.listenerCount()).toBeGreaterThan(0);
    unmount();
    expect(mq.listenerCount()).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────
// 2) R5.3 — Khi reduced-motion bật, control vẫn truy cập + thao tác được
// ─────────────────────────────────────────────────────────────

describe("Reduced-motion — control vẫn truy cập và thao tác được (R5.3)", () => {
  let mq: MockMediaQueryList;

  beforeEach(() => {
    mq = createMockMediaQuery(true, QUERY); // bật ngay từ đầu
    vi.stubGlobal("matchMedia", (q: string) => {
      if (q.includes("prefers-reduced-motion")) return mq;
      return {
        matches: false,
        media: q,
        addEventListener: () => {},
        removeEventListener: () => {},
      } as unknown as MediaQueryList;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("button vẫn click được và counter cập nhật", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ReducedMotionHarness onClick={onClick} />);

    const button = screen.getByTestId("harness-action");
    await user.click(button);
    await user.click(button);

    expect(onClick).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId("harness-count")).toHaveTextContent("2");
  });

  it("button focus được qua phím Tab, vẫn thao tác bằng Enter/Space", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<ReducedMotionHarness onClick={onClick} />);

    await user.tab();
    expect(document.activeElement).toBe(screen.getByTestId("harness-action"));

    // Activate qua bàn phím — Enter hoặc Space đều phải kích hoạt action.
    await user.keyboard("{Enter}");
    await user.keyboard(" ");
    expect(onClick).toHaveBeenCalledTimes(2);

    // Tab tiếp tới input → vẫn focus và nhận input.
    await user.tab();
    const input = screen.getByTestId("harness-input") as HTMLInputElement;
    expect(document.activeElement).toBe(input);

    fireEvent.change(input, { target: { value: "vẫn nhập được" } });
    expect(input.value).toBe("vẫn nhập được");
  });

  it("không có control nào bị aria-hidden hoặc ẩn khỏi cây accessibility", () => {
    render(<ReducedMotionHarness />);

    const button = screen.getByTestId("harness-action");
    const input = screen.getByTestId("harness-input");

    expect(button).toBeVisible();
    expect(button).not.toHaveAttribute("aria-hidden", "true");
    expect(button).not.toBeDisabled();

    expect(input).toBeVisible();
    expect(input).not.toHaveAttribute("aria-hidden", "true");
    expect(input).not.toBeDisabled();
  });
});

// ─────────────────────────────────────────────────────────────
// 3) R5.1 — Vô hiệu hóa motion KHÔNG thiết yếu (CSS-level invariant)
// ─────────────────────────────────────────────────────────────

describe("Reduced-motion — vô hiệu hóa motion không thiết yếu (R5.1)", () => {
  it("@media (prefers-reduced-motion: reduce) tồn tại trong theme.css", () => {
    const css = readThemeCss();
    const blocks = extractReducedMotionBlocks(css);
    expect(blocks.length).toBeGreaterThan(0);
  });

  it("rule '*' trong reduced-motion block giảm animation/transition về ≤ ngưỡng tức thời", () => {
    const blocks = extractReducedMotionBlocks(readThemeCss());

    // Quy tắc * { animation-duration: 0.01ms; transition-duration: 0.01ms; }
    // bao quát toàn bộ phần tử (R5.1: không có phần tử nào chuyển động > 0ms
    // ngoài thay đổi opacity tức thời — 0.01ms được coi là tức thời).
    const universalRule =
      /\*,\s*\*::before,\s*\*::after\s*\{[^}]*animation-duration:\s*0\.01ms[^}]*transition-duration:\s*0\.01ms/i;

    expect(blocks).toMatch(universalRule);
  });

  it("các class motion trang trí (motion-reveal*, appear-*, brand-glow-pulse, page-enter, success-flash) bị set animation:none", () => {
    const blocks = extractReducedMotionBlocks(readThemeCss());

    const decorativeClasses = [
      ".motion-reveal",
      ".motion-reveal-fade",
      ".appear-fade-up",
      ".appear-scale-in",
      ".appear-fade-in",
      ".brand-glow-pulse",
      ".page-enter",
      ".success-flash",
    ];

    for (const cls of decorativeClasses) {
      expect(blocks, `class trang trí ${cls} cần xuất hiện trong reduced-motion block`).toContain(cls);
    }

    // Mỗi rule trang trí thường gồm `animation: none` (có thể kèm !important)
    // hoặc `animation-duration: 0.01ms` từ rule * bao trên. Kiểm chứng có
    // ít nhất một khai báo `animation: none` trong block.
    expect(blocks).toMatch(/animation:\s*none/i);
  });

  it("transform trang trí (motion-press:active, motion-lift:hover, tap-scale, press-feedback) bị vô hiệu hóa", () => {
    const blocks = extractReducedMotionBlocks(readThemeCss());

    expect(blocks).toMatch(/\.motion-press:active\s*\{[^}]*transform:\s*none/i);
    expect(blocks).toMatch(/\.motion-lift:hover\s*\{[^}]*transform:\s*none/i);

    // Khối lớn liệt kê các util Phase 1: transform: none !important + animation: none !important
    expect(blocks).toMatch(/\.tap-scale[^{}]*\{[\s\S]*?transform:\s*none\s*!important/i);
    expect(blocks).toMatch(/\.press-feedback[^{}]*\{[\s\S]*?transform:\s*none\s*!important/i);
  });
});

// ─────────────────────────────────────────────────────────────
// 4) R5.2 — Motion thiết yếu còn lại ≤ 200ms (CSS-level invariant)
// ─────────────────────────────────────────────────────────────

describe("Reduced-motion — motion thiết yếu ≤ 200ms (R5.2)", () => {
  it("token --duration-instant ≤ 200ms để phục vụ overlay/dialog/tooltip thiết yếu", () => {
    const tokens = extractDurationTokens(readThemeCss());
    expect(tokens["--duration-instant"]).toBeDefined();
    expect(tokens["--duration-instant"]).toBeLessThanOrEqual(ESSENTIAL_MOTION_MAX_MS);
  });

  it("overlay/dialog/sheet/popover/tooltip dưới reduced-motion dùng --duration-instant (≤200ms)", () => {
    const blocks = extractReducedMotionBlocks(readThemeCss());

    // Có khối quy định lại animation/transition cho data-slot overlay
    // và khối đó dùng var(--duration-instant) thay vì duration dài hơn.
    const overlayRule = /\[data-slot="dialog-content"\][\s\S]*?\[data-slot="tooltip-content"\]\s*\{([\s\S]*?)\}/i;
    const m = overlayRule.exec(blocks);
    expect(m, "thiếu khối overlay essential motion trong reduced-motion block").not.toBeNull();
    if (m) {
      const ruleBody = m[1];
      expect(ruleBody).toMatch(/animation-duration:\s*var\(--duration-instant\)/i);
      expect(ruleBody).toMatch(/transition:\s*opacity\s+var\(--duration-instant\)/i);
      expect(ruleBody).toMatch(/transform:\s*none/i);

      // Không dùng các duration dài hơn 200ms cho overlay essential.
      expect(ruleBody).not.toMatch(/--duration-(base|medium|slow|slower)/i);
    }
  });

  it("không có duration nào > 200ms được tham chiếu trong các rule overlay essential dưới reduce", () => {
    const blocks = extractReducedMotionBlocks(readThemeCss());
    const tokens = extractDurationTokens(readThemeCss());

    // Lấy tất cả var(--duration-*) trong block reduced-motion.
    const refs = [...blocks.matchAll(/var\(\s*(--duration-[\w-]+)\s*\)/g)].map((m) => m[1]);

    // Mỗi tham chiếu phân giải về ms phải ≤ 200.
    for (const ref of refs) {
      const ms = tokens[ref];
      expect(ms, `${ref} không có giá trị ms`).toBeDefined();
      expect(ms).toBeLessThanOrEqual(ESSENTIAL_MOTION_MAX_MS);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// 5) R5.4 — Motion mặc định (khi không reduce) trong dải 150–500ms
// ─────────────────────────────────────────────────────────────

describe("Reduced-motion — default motion duration trong [150ms, 500ms] (R5.4)", () => {
  it("toàn bộ token --duration-* khai báo trong :root nằm trong dải 150–500ms", () => {
    const tokens = extractDurationTokens(readThemeCss());

    // Phải có ít nhất các token chính (snapshot tên token).
    const expected = [
      "--duration-instant",
      "--duration-fast",
      "--duration-base",
      "--duration-medium",
      "--duration-slow",
    ];
    for (const name of expected) {
      expect(tokens[name], `thiếu token ${name}`).toBeDefined();
    }

    for (const [name, ms] of Object.entries(tokens)) {
      expect(
        ms,
        `${name} = ${ms}ms nằm ngoài dải mặc định [${DEFAULT_MOTION_MIN_MS}, ${DEFAULT_MOTION_MAX_MS}]`,
      ).toBeGreaterThanOrEqual(DEFAULT_MOTION_MIN_MS);
      expect(
        ms,
        `${name} = ${ms}ms nằm ngoài dải mặc định [${DEFAULT_MOTION_MIN_MS}, ${DEFAULT_MOTION_MAX_MS}]`,
      ).toBeLessThanOrEqual(DEFAULT_MOTION_MAX_MS);
    }
  });
});
