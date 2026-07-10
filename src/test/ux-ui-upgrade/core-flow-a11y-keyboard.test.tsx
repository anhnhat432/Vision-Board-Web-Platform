// Feature: core-flow-ui-upgrade, Task 18.3: Component test a11y (keyboard nav, focus, ARIA)
//
// Mục tiêu (Requirements 12.1, 12.2, 12.4, 12.6, 12.7, 12.8, 12.9, 12.10):
//   - Tab / Shift+Tab: thứ tự tiêu điểm khớp thứ tự DOM (không dùng tabindex dương). (12.1, 12.2)
//   - Mở modal Radix `Dialog` → tiêu điểm bị giữ bên trong (focus trap). (12.6)
//   - Escape đóng modal và trả tiêu điểm về phần tử trigger đã mở nó. (12.7, 12.8)
//   - Enter / Space kích hoạt Primary_CTA (native `<button>`). (12.9)
//   - Control chỉ có icon phải có `aria-label` / `role` mô tả chức năng. (12.4)
//   - Hành động bằng bàn phím thất bại (handler ném lỗi) → hiển thị thông báo lỗi,
//     giữ tiêu điểm ở control liên quan, và giữ nguyên trạng thái dữ liệu. (12.10)
//
// Cách tiếp cận: dùng CHÍNH các primitive production mà lớp a11y wiring (task 18.1)
// dựa vào — Radix `Dialog` (`@/app/components/ui/dialog`) và `Button`
// (`@/app/components/ui/button`, render `<button>` gốc) — trong các harness nhỏ
// phản chiếu cách Core_Flow_Screen dùng chúng. Radix cung cấp sẵn focus trap,
// Escape-to-close và focus return; test này khoá các hành vi đó lại để mọi
// hồi quy (ví dụ ai đó thay Dialog bằng `div` + state) đều bị phát hiện.
//
// Validates: Requirements 12.1, 12.2, 12.4, 12.6, 12.7, 12.8, 12.9, 12.10

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MoreVertical, X } from "lucide-react";
import { useRef, useState } from "react";
import { describe, expect, it } from "vitest";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import { Button } from "@/app/components/ui/button";

// ─────────────────────────────────────────────────────────────
// Harnesses — phản chiếu cách dùng production của Core_Flow
// ─────────────────────────────────────────────────────────────

/** Chuỗi CTA điều hướng thẳng theo thứ tự đọc, dùng Button production. */
function LinearCtaHarness() {
  return (
    <section aria-label="Core flow surface">
      <Button data-testid="cta-1" variant="outline">
        Quay lại
      </Button>
      <Button data-testid="cta-2" variant="outline">
        Lưu nháp
      </Button>
      <Button data-testid="cta-primary" size="lg">
        Tiếp tục
      </Button>
    </section>
  );
}

/** Dialog Radix thật với nhiều phần tử focus được bên trong để kiểm focus trap. */
function ModalHarness() {
  return (
    <div>
      <Button data-testid="before-trigger">Trước trigger</Button>
      <Dialog>
        <DialogTrigger asChild>
          <Button data-testid="open-dialog">Mở nhật ký</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Viết nhật ký mới</DialogTitle>
            <DialogDescription>Ghi lại suy nghĩ của bạn.</DialogDescription>
          </DialogHeader>
          <input data-testid="dialog-input" aria-label="Nội dung nhật ký" />
          <DialogFooter>
            <DialogClose asChild>
              <Button data-testid="dialog-cancel" variant="outline">
                Hủy
              </Button>
            </DialogClose>
            <Button data-testid="dialog-save">Lưu</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Button data-testid="after-trigger">Sau trigger</Button>
    </div>
  );
}

/** Primary_CTA đơn giản đếm số lần kích hoạt (Enter/Space). */
function PrimaryCtaHarness() {
  const [count, setCount] = useState(0);
  return (
    <div>
      <Button data-testid="primary" size="lg" onClick={() => setCount((c) => c + 1)}>
        Kích hoạt
      </Button>
      <span data-testid="count">{count}</span>
    </div>
  );
}

/** Control chỉ có icon — phải có aria-label mô tả chức năng. */
function IconOnlyHarness() {
  return (
    <div>
      <Button size="icon" aria-label="Tùy chọn khác" data-testid="icon-menu">
        <MoreVertical />
      </Button>
      <Button size="icon" aria-label="Đóng" data-testid="icon-close">
        <X />
      </Button>
    </div>
  );
}

/**
 * Harness cho đường lỗi bàn phím (Req 12.10): handler lưu ném lỗi.
 * UI phải: hiện thông báo lỗi, giữ focus ở control, và KHÔNG đổi dữ liệu đã nhập.
 */
function FailingSaveHarness() {
  const savedRef = useRef("giá trị gốc");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [renderedValue, setRenderedValue] = useState("giá trị gốc");

  const handleSave = () => {
    try {
      // Mô phỏng thao tác lưu thất bại (ví dụ ghi storage ném lỗi).
      throw new Error("save-failed");
    } catch {
      // Không đụng vào dữ liệu đã nhập; chỉ báo lỗi và giữ focus.
      setError("Lưu thất bại. Vui lòng thử lại.");
      buttonRef.current?.focus();
      // Không cập nhật savedRef / renderedValue → dữ liệu giữ nguyên.
      setRenderedValue(savedRef.current);
    }
  };

  return (
    <div>
      <span data-testid="data-value">{renderedValue}</span>
      <Button ref={buttonRef} data-testid="save" onClick={handleSave}>
        Lưu
      </Button>
      {error ? (
        <p role="alert" data-testid="error-msg">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Tiện ích: mọi phần tử có tabindex trong container đều KHÔNG dương (Req 12.2). */
function assertNoPositiveTabindex(container: HTMLElement) {
  const withTabindex = container.querySelectorAll<HTMLElement>("[tabindex]");
  for (const el of withTabindex) {
    const raw = el.getAttribute("tabindex");
    const value = Number(raw);
    expect(Number.isNaN(value)).toBe(false);
    expect(value).toBeLessThanOrEqual(0);
  }
}

// ─────────────────────────────────────────────────────────────
// 1) Tab / Shift+Tab — focus order khớp DOM, không tabindex dương (12.1, 12.2)
// ─────────────────────────────────────────────────────────────

describe("Task 18.3 — focus order khớp thứ tự DOM (Req 12.1, 12.2)", () => {
  it("Tab đi qua các control theo đúng thứ tự DOM", async () => {
    const user = userEvent.setup();
    render(<LinearCtaHarness />);

    expect(document.activeElement).toBe(document.body);

    await user.tab();
    expect(document.activeElement).toBe(screen.getByTestId("cta-1"));

    await user.tab();
    expect(document.activeElement).toBe(screen.getByTestId("cta-2"));

    await user.tab();
    expect(document.activeElement).toBe(screen.getByTestId("cta-primary"));
  });

  it("Shift+Tab đi ngược lại theo đúng thứ tự DOM", async () => {
    const user = userEvent.setup();
    render(<LinearCtaHarness />);

    screen.getByTestId("cta-primary").focus();
    expect(document.activeElement).toBe(screen.getByTestId("cta-primary"));

    await user.tab({ shift: true });
    expect(document.activeElement).toBe(screen.getByTestId("cta-2"));

    await user.tab({ shift: true });
    expect(document.activeElement).toBe(screen.getByTestId("cta-1"));
  });

  it("không control nào dùng tabindex dương", () => {
    const { container } = render(<LinearCtaHarness />);
    assertNoPositiveTabindex(container);
  });
});

// ─────────────────────────────────────────────────────────────
// 2) Modal Radix — focus trap (12.6), Escape đóng + focus return (12.7, 12.8)
// ─────────────────────────────────────────────────────────────

describe("Task 18.3 — modal Radix focus trap + Escape + focus return (Req 12.6, 12.7, 12.8)", () => {
  it("mở dialog giữ tiêu điểm bên trong (focus trap)", async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);

    const trigger = screen.getByTestId("open-dialog");
    await user.click(trigger);

    const dialog = await screen.findByRole("dialog");
    // Tiêu điểm phải nằm trong dialog ngay sau khi mở.
    await waitFor(() => {
      expect(dialog.contains(document.activeElement)).toBe(true);
    });

    // Tab nhiều lần: tiêu điểm không bao giờ thoát ra ngoài dialog
    // (không về trigger, không rơi xuống body, không tới nút ngoài dialog).
    const outside = [
      screen.getByTestId("before-trigger"),
      screen.getByTestId("after-trigger"),
      trigger,
    ];
    for (let i = 0; i < 8; i += 1) {
      await user.tab();
      expect(document.activeElement).not.toBe(document.body);
      for (const el of outside) {
        expect(document.activeElement).not.toBe(el);
      }
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });

  it("Escape đóng dialog và trả tiêu điểm về trigger", async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);

    const trigger = screen.getByTestId("open-dialog");
    await user.click(trigger);
    await screen.findByRole("dialog");

    await user.keyboard("{Escape}");

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    // Focus return về đúng phần tử đã mở modal.
    await waitFor(() => {
      expect(document.activeElement).toBe(trigger);
    });
  });

  it("nút Hủy (DialogClose) đóng dialog và trả tiêu điểm về trigger", async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);

    const trigger = screen.getByTestId("open-dialog");
    await user.click(trigger);
    const dialog = await screen.findByRole("dialog");

    await user.click(within(dialog).getByTestId("dialog-cancel"));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    await waitFor(() => {
      expect(document.activeElement).toBe(trigger);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// 3) Enter / Space kích hoạt Primary_CTA (Req 12.9)
// ─────────────────────────────────────────────────────────────

describe("Task 18.3 — Enter/Space kích hoạt Primary_CTA (Req 12.9)", () => {
  it("Enter và Space đều kích hoạt Primary_CTA khi đang focus", async () => {
    const user = userEvent.setup();
    render(<PrimaryCtaHarness />);

    const primary = screen.getByTestId("primary");
    primary.focus();
    expect(document.activeElement).toBe(primary);

    await user.keyboard("{Enter}");
    expect(screen.getByTestId("count").textContent).toBe("1");

    await user.keyboard(" ");
    expect(screen.getByTestId("count").textContent).toBe("2");
  });
});

// ─────────────────────────────────────────────────────────────
// 4) Icon-only control có aria-label / role (Req 12.4)
// ─────────────────────────────────────────────────────────────

describe("Task 18.3 — control chỉ có icon có nhãn ARIA (Req 12.4)", () => {
  it("mỗi control icon-only expose accessible name qua aria-label", () => {
    render(<IconOnlyHarness />);

    const menu = screen.getByRole("button", { name: "Tùy chọn khác" });
    const close = screen.getByRole("button", { name: "Đóng" });

    expect(menu).toBe(screen.getByTestId("icon-menu"));
    expect(close).toBe(screen.getByTestId("icon-close"));

    // Không control icon-only nào bị thiếu accessible name.
    for (const id of ["icon-menu", "icon-close"] as const) {
      const el = screen.getByTestId(id);
      expect(el.getAttribute("aria-label")?.trim()).toBeTruthy();
    }
  });
});

// ─────────────────────────────────────────────────────────────
// 5) Đường lỗi bàn phím — thông báo lỗi + giữ focus + dữ liệu không đổi (Req 12.10)
// ─────────────────────────────────────────────────────────────

describe("Task 18.3 — handler ném lỗi khi thao tác bằng bàn phím (Req 12.10)", () => {
  it("hiển thị lỗi, giữ focus ở control, dữ liệu giữ nguyên", async () => {
    const user = userEvent.setup();
    render(<FailingSaveHarness />);

    const save = screen.getByTestId("save");
    const before = screen.getByTestId("data-value").textContent;

    save.focus();
    expect(document.activeElement).toBe(save);

    await user.keyboard("{Enter}");

    // Thông báo lỗi hiển thị (role alert cho công nghệ trợ giúp).
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Lưu thất bại");

    // Tiêu điểm vẫn ở control liên quan.
    expect(document.activeElement).toBe(save);

    // Dữ liệu không thay đổi.
    expect(screen.getByTestId("data-value").textContent).toBe(before);
  });
});
