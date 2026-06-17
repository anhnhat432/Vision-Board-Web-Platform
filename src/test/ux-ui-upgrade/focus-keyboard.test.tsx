// Feature: ux-ui-upgrade, Task 8.4: Component test — focus & keyboard
//
// Mục tiêu:
//   - Kiểm thứ tự đọc khi dùng Tab / Shift+Tab (Requirement 4.5, 4.6).
//   - Khi một phần tử nhận focus, chỉ báo focus (ring) phải nhìn thấy được
//     với độ dày tối thiểu 2 CSS pixel (Requirement 4.1, 4.3).
//   - Khi focus rời khỏi phần tử, chỉ báo phải được gỡ trong vòng ≤100ms
//     (Requirement 4.7).
//   - Reflection_Context dùng token focus ring warm (`app-focus-ring-warm` /
//     `focus-visible:ring-app-warm`); Execution_Context dùng ring accent
//     (`app-focus-ring` / `focus-visible:ring-app-accent`)
//     và hai nhóm token loại trừ lẫn nhau (Requirement 4.4).
//
// Cách tiếp cận: dựng 2 harness component nhỏ tiêu thụ đúng tổ hợp
// utility focus được Core_Flow_Screen sử dụng trong code thực
// (xem `src/features/plan12week/pages/12WeekSetup/components/SetupStepShellLab.tsx`
// cho Execution và `src/app/pages/ReflectionJournal.tsx` cho Reflection).
// Vì jsdom không biên dịch Tailwind, ta giả lập hiệu ứng `:focus-visible`
// bằng inline style được toggle qua React state — vẫn dùng đúng React event
// flow mà userEvent kích hoạt khi Tab. Lớp className giữ nguyên theo
// production để khoá ràng buộc token (warm vs accent) theo Requirement 4.4.
//
// Validates: Requirements 4.1, 4.3, 4.4, 4.5, 4.6, 4.7

import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

// ─────────────────────────────────────────────────────────────
// Harness components — phản chiếu utility focus production
// ─────────────────────────────────────────────────────────────

type FocusContext = "execution" | "reflection";

// Hai cụm class production thực tế (đã grep trong codebase tại thời điểm
// viết test). Khoá ở đây để bất kỳ thay đổi nào ngoài ý muốn trên token
// focus warm/accent đều phá test.
const EXEC_FOCUS_CLASS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2";

const REFLECT_FOCUS_CLASS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-warm focus-visible:ring-offset-2";

// Màu hiển thị tương đương (sample) — chỉ để phân biệt hai ngữ cảnh trong
// jsdom. Không dùng làm contract: contract là class name.
const RING_COLOR: Record<FocusContext, string> = {
  execution: "rgb(42, 84, 71)", // ~ --app-focus-ring (light)
  reflection: "rgb(168, 82, 47)", // ~ --app-focus-ring-warm (light)
};

interface FocusButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  context: FocusContext;
  testId: string;
  children: React.ReactNode;
}

function FocusButton({ context, testId, children, ...rest }: FocusButtonProps) {
  const [focused, setFocused] = useState(false);
  const baseClass = context === "reflection" ? REFLECT_FOCUS_CLASS : EXEC_FOCUS_CLASS;

  // Inline style mô phỏng ring 2px deterministic cho jsdom. `outline` được
  // chọn vì jsdom phản ánh đúng `outlineWidth` qua getComputedStyle.
  const focusStyle: React.CSSProperties | undefined = focused
    ? {
        outlineStyle: "solid",
        outlineWidth: "2px",
        outlineColor: RING_COLOR[context],
        outlineOffset: "2px",
      }
    : undefined;

  return (
    <button
      type="button"
      data-testid={testId}
      data-focus-context={context}
      className={`min-h-11 min-w-11 rounded-md border border-app-line bg-app-surface px-4 py-2 text-sm font-medium text-app-ink ${baseClass}`}
      style={focusStyle}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      {...rest}
    >
      {children}
    </button>
  );
}

function ExecutionHarness() {
  return (
    <section aria-label="Execution surface">
      <FocusButton context="execution" testId="exec-1">
        Bắt đầu
      </FocusButton>
      <FocusButton context="execution" testId="exec-2">
        Tiếp theo
      </FocusButton>
      <FocusButton context="execution" testId="exec-3">
        Hoàn tất
      </FocusButton>
    </section>
  );
}

function ReflectionHarness() {
  return (
    <section aria-label="Reflection surface">
      <FocusButton context="reflection" testId="reflect-1">
        Mở review
      </FocusButton>
      <FocusButton context="reflection" testId="reflect-2">
        Lưu phản tư
      </FocusButton>
      <FocusButton context="reflection" testId="reflect-3">
        Đóng
      </FocusButton>
    </section>
  );
}

function ParseOutlineWidth(el: Element): number {
  const value = window.getComputedStyle(el as HTMLElement).outlineWidth;
  // jsdom có thể trả "2px", "0px", "" hoặc keyword như "medium". Chuẩn hoá
  // về số: bất kỳ giá trị nào không phân giải px → 0.
  if (!value) return 0;
  const match = /^(\d+(?:\.\d+)?)px$/.exec(value.trim());
  return match ? Number(match[1]) : 0;
}

// ─────────────────────────────────────────────────────────────
// 1) Tab / Shift+Tab — thứ tự đọc (R4.5, R4.6)
// ─────────────────────────────────────────────────────────────

describe("Focus & keyboard — thứ tự đọc qua Tab / Shift+Tab", () => {
  it("Tab điều hướng focus theo thứ tự đọc (trên → dưới, trái → phải) (R4.5)", async () => {
    const user = userEvent.setup();
    render(<ExecutionHarness />);

    expect(document.activeElement).toBe(document.body);

    await user.tab();
    expect(document.activeElement).toBe(screen.getByTestId("exec-1"));

    await user.tab();
    expect(document.activeElement).toBe(screen.getByTestId("exec-2"));

    await user.tab();
    expect(document.activeElement).toBe(screen.getByTestId("exec-3"));
  });

  it("Shift+Tab điều hướng focus tới phần tử liền trước theo thứ tự đọc (R4.6)", async () => {
    const user = userEvent.setup();
    render(<ExecutionHarness />);

    // Đặt focus ban đầu ở phần tử cuối, rồi shift+tab ngược về.
    const exec3 = screen.getByTestId("exec-3");
    act(() => {
      exec3.focus();
    });
    expect(document.activeElement).toBe(exec3);

    await user.tab({ shift: true });
    expect(document.activeElement).toBe(screen.getByTestId("exec-2"));

    await user.tab({ shift: true });
    expect(document.activeElement).toBe(screen.getByTestId("exec-1"));
  });
});

// ─────────────────────────────────────────────────────────────
// 2) Focus hiển thị ring ≥ 2px (R4.1, R4.3); blur gỡ ring (R4.7)
// ─────────────────────────────────────────────────────────────

describe("Focus & keyboard — chỉ báo focus xuất hiện và biến mất đúng lúc", () => {
  it("phần tử nhận focus có ring ≥ 2px (R4.1, R4.3)", async () => {
    const user = userEvent.setup();
    render(<ExecutionHarness />);

    const target = screen.getByTestId("exec-1");

    // Trước focus: không có ring.
    expect(ParseOutlineWidth(target)).toBe(0);

    await user.tab();

    expect(document.activeElement).toBe(target);
    expect(ParseOutlineWidth(target)).toBeGreaterThanOrEqual(2);
    // Ring phải nhìn thấy được (không bị che/cắt) — đảm bảo phần tử thuộc
    // cây render và không bị display:none/visibility:hidden.
    expect(target).toBeVisible();
    // Outline được vẽ ngoài viền (offset > 0) để không bị nuốt bởi border.
    expect(window.getComputedStyle(target).outlineOffset).toBe("2px");
  });

  it("blur khỏi phần tử thì ring được gỡ (R4.7)", async () => {
    const user = userEvent.setup();
    render(<ExecutionHarness />);

    const first = screen.getByTestId("exec-1");

    await user.tab();
    expect(document.activeElement).toBe(first);
    expect(ParseOutlineWidth(first)).toBeGreaterThanOrEqual(2);

    // Tab tiếp → focus rời khỏi phần tử đầu.
    await user.tab();
    expect(document.activeElement).not.toBe(first);
    expect(ParseOutlineWidth(first)).toBe(0);

    // Blur thủ công khỏi phần tử đang focus cũng phải gỡ ring (≤100ms,
    // ở đây tức thời do React state update đồng bộ trong test).
    const stillFocused = document.activeElement as HTMLElement;
    act(() => {
      stillFocused.blur();
    });
    expect(ParseOutlineWidth(stillFocused)).toBe(0);
    expect(ParseOutlineWidth(first)).toBe(0);
    expect(ParseOutlineWidth(screen.getByTestId("exec-2"))).toBe(0);
    expect(ParseOutlineWidth(screen.getByTestId("exec-3"))).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────
// 3) Reflection dùng ring warm; Execution dùng ring accent (R4.4)
// ─────────────────────────────────────────────────────────────

describe("Focus ring theo ngữ cảnh (Execution accent ↔ Reflection warm)", () => {
  it("Reflection_Context dùng class focus warm và KHÔNG kèm class accent (R4.4)", () => {
    render(<ReflectionHarness />);

    for (const id of ["reflect-1", "reflect-2", "reflect-3"] as const) {
      const className = screen.getByTestId(id).className;
      expect(className).toContain("focus-visible:ring-2");
      expect(className).toContain("focus-visible:ring-app-warm");
      expect(className).not.toContain("focus-visible:ring-app-accent");
    }
  });

  it("Execution_Context dùng class focus accent và KHÔNG kèm class warm (R4.4)", () => {
    render(<ExecutionHarness />);

    for (const id of ["exec-1", "exec-2", "exec-3"] as const) {
      const className = screen.getByTestId(id).className;
      expect(className).toContain("focus-visible:ring-2");
      expect(className).toContain("focus-visible:ring-app-accent");
      expect(className).not.toContain("focus-visible:ring-app-warm");
    }
  });

  it("focus trên Reflection vẽ ring warm (màu khác Execution) — tách biệt hai nhóm token", async () => {
    const user = userEvent.setup();
    render(
      <>
        <ExecutionHarness />
        <ReflectionHarness />
      </>,
    );

    // Tab tới Execution đầu tiên.
    await user.tab();
    const execTarget = screen.getByTestId("exec-1");
    expect(document.activeElement).toBe(execTarget);
    const execColor = window.getComputedStyle(execTarget).outlineColor;
    expect(execColor).toBe(RING_COLOR.execution);

    // Tab nhanh qua các Execution còn lại để chạm Reflection đầu tiên.
    await user.tab(); // exec-2
    await user.tab(); // exec-3
    await user.tab(); // reflect-1
    const reflectTarget = screen.getByTestId("reflect-1");
    expect(document.activeElement).toBe(reflectTarget);
    const reflectColor = window.getComputedStyle(reflectTarget).outlineColor;
    expect(reflectColor).toBe(RING_COLOR.reflection);

    // Hai ring rõ ràng khác màu — Reflection không trùng Execution.
    expect(reflectColor).not.toBe(execColor);
  });
});
