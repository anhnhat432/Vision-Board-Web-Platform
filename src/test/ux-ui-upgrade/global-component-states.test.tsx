// Feature: global-ui-upgrade, Task 7.3: Unit/DOM test hover/focus/disabled & elevation
//
// Mục tiêu (Requirements 5.2, 5.3, 5.4, 5.5):
//   - 5.1/5.2: UI_Component tương tác áp elevation qua token class (shadow-app-*)
//     và trạng thái hover dùng token màu + token motion
//     (duration-[var(--duration-*)] / ease-[var(--ease-*)]).
//   - 5.3: focus ring dùng token (focus-visible:ring-app-accent*) + DOM focus thật.
//   - 5.4: trạng thái disabled dùng token màu disabled (--app-ink-disabled qua
//     disabled:text-app-ink-disabled cho input text-bearing) hoặc xử lý disabled
//     token-based (opacity) cho control không mang chữ.
//   - 5.5: cấu trúc props/API của component KHÔNG đổi — vẫn nhận và forward
//     các prop chuẩn (id, className, aria-*, onClick, disabled, ref).
//
// Cách tiếp cận: bám theo pattern assertion className của
// `src/app/components/ui/button-badge-variants.test.tsx` (assert chuỗi className
// đến từ token utility), bổ sung DOM focus/disabled thật qua Testing Library.
// Không biên dịch Tailwind trong jsdom nên contract là *tên class token*, không
// phải computed style.
//
// Validates: Requirements 5.2, 5.3, 5.4, 5.5

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";

import { Button, buttonVariants } from "@/app/components/ui/button";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Input } from "@/app/components/ui/input";
import { Select, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Switch } from "@/app/components/ui/switch";
import { Textarea } from "@/app/components/ui/textarea";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Lấy className của phần tử theo data-slot sau khi render. */
function slotClass(slot: string): string {
  const el = document.querySelector(`[data-slot="${slot}"]`);
  expect(el, `expected element with data-slot="${slot}"`).toBeTruthy();
  return el?.getAttribute("class") ?? "";
}

// ─────────────────────────────────────────────────────────────
// 5.1 — Elevation dùng token class (shadow-app-*)
// ─────────────────────────────────────────────────────────────

describe("Elevation — UI_Component dùng token shadow-app-* (R5.1)", () => {
  it("Button (default) dùng shadow-app-sm và nâng lên shadow-app-md khi hover", () => {
    const primary = buttonVariants({ variant: "default" });
    expect(primary).toContain("shadow-app-sm");
    expect(primary).toContain("hover:shadow-app-md");
  });

  it("Input dùng token elevation shadow-app-sm", () => {
    render(<Input aria-label="Tên" />);
    expect(slotClass("input")).toContain("shadow-app-sm");
  });

  it("Textarea dùng token elevation shadow-app-sm", () => {
    render(<Textarea aria-label="Ghi chú" />);
    expect(slotClass("textarea")).toContain("shadow-app-sm");
  });

  it("SelectTrigger dùng token elevation shadow-app-sm", () => {
    render(
      <Select>
        <SelectTrigger aria-label="Chọn">
          <SelectValue placeholder="Chọn một mục" />
        </SelectTrigger>
      </Select>,
    );
    expect(slotClass("select-trigger")).toContain("shadow-app-sm");
  });

  it("Checkbox áp token elevation shadow-app-sm trên phần điều khiển", () => {
    render(<Checkbox aria-label="Đồng ý" />);
    expect(slotClass("checkbox-control")).toContain("shadow-app-sm");
  });
});

// ─────────────────────────────────────────────────────────────
// 5.2 — Hover state dùng token màu + token motion
// ─────────────────────────────────────────────────────────────

describe("Hover — token màu + token motion (R5.2)", () => {
  it("Button hover đổi nền bằng token accent-hover và transition dùng token motion", () => {
    const primary = buttonVariants({ variant: "default" });
    expect(primary).toContain("hover:bg-app-accent-hover");
    expect(primary).toContain("duration-[var(--duration-fast)]");
    expect(primary).toContain("ease-[var(--ease-standard)]");
  });

  it("Input hover đổi viền bằng token accent và transition dùng token motion", () => {
    render(<Input aria-label="Tên" />);
    const cls = slotClass("input");
    expect(cls).toContain("hover:border-app-accent/50");
    expect(cls).toContain("duration-[var(--duration-fast)]");
    expect(cls).toContain("ease-[var(--ease-standard)]");
  });

  it("Textarea hover đổi viền bằng token accent và transition dùng token motion", () => {
    render(<Textarea aria-label="Ghi chú" />);
    const cls = slotClass("textarea");
    expect(cls).toContain("hover:border-app-accent/50");
    expect(cls).toContain("duration-[var(--duration-fast)]");
    expect(cls).toContain("ease-[var(--ease-standard)]");
  });

  it("SelectTrigger transition dùng token motion", () => {
    render(
      <Select>
        <SelectTrigger aria-label="Chọn">
          <SelectValue placeholder="Chọn một mục" />
        </SelectTrigger>
      </Select>,
    );
    const cls = slotClass("select-trigger");
    expect(cls).toContain("hover:border-app-line");
    expect(cls).toContain("duration-[var(--duration-fast)]");
    expect(cls).toContain("ease-[var(--ease-standard)]");
  });

  it("Checkbox & Switch transition dùng token motion", () => {
    render(<Checkbox aria-label="Đồng ý" />);
    const cb = slotClass("checkbox");
    expect(cb).toContain("duration-[var(--duration-instant)]");
    expect(cb).toContain("ease-[var(--ease-standard)]");

    render(<Switch aria-label="Bật thông báo" />);
    const sw = slotClass("switch");
    expect(sw).toContain("duration-[var(--duration-instant)]");
    expect(sw).toContain("ease-[var(--ease-standard)]");
  });
});

// ─────────────────────────────────────────────────────────────
// 5.3 — Focus ring dùng token + DOM focus thật
// ─────────────────────────────────────────────────────────────

describe("Focus ring — token focus-visible:ring-app-accent* (R5.3)", () => {
  it("Button dùng focus ring token accent", () => {
    expect(buttonVariants({ variant: "default" })).toContain("focus-visible:ring-app-accent/40");
  });

  it("Input/Textarea dùng focus ring token accent", () => {
    render(<Input aria-label="Tên" />);
    expect(slotClass("input")).toContain("focus-visible:ring-app-accent/20");

    render(<Textarea aria-label="Ghi chú" />);
    expect(slotClass("textarea")).toContain("focus-visible:ring-app-accent/20");
  });

  it("SelectTrigger dùng focus ring token accent", () => {
    render(
      <Select>
        <SelectTrigger aria-label="Chọn">
          <SelectValue placeholder="Chọn một mục" />
        </SelectTrigger>
      </Select>,
    );
    expect(slotClass("select-trigger")).toContain("focus-visible:ring-app-accent/20");
  });

  it("Checkbox & Switch dùng focus ring token accent", () => {
    render(<Checkbox aria-label="Đồng ý" />);
    expect(slotClass("checkbox")).toContain("focus-visible:ring-app-accent/40");

    render(<Switch aria-label="Bật thông báo" />);
    expect(slotClass("switch")).toContain("focus-visible:ring-app-accent/40");
  });

  it("Button nhận focus thật qua bàn phím (DOM focus)", async () => {
    const user = userEvent.setup();
    render(<Button>Lưu</Button>);
    const btn = screen.getByRole("button", { name: "Lưu" });

    expect(document.activeElement).toBe(document.body);
    await user.tab();
    expect(document.activeElement).toBe(btn);
  });

  it("Input nhận focus thật qua bàn phím (DOM focus)", async () => {
    const user = userEvent.setup();
    render(<Input aria-label="Tên" />);
    const input = screen.getByRole("textbox");

    await user.tab();
    expect(document.activeElement).toBe(input);
  });
});

// ─────────────────────────────────────────────────────────────
// 5.4 — Disabled state dùng token
// ─────────────────────────────────────────────────────────────

describe("Disabled — dùng token màu disabled (R5.4)", () => {
  it("Input dùng token --app-ink-disabled qua disabled:text-app-ink-disabled", () => {
    render(<Input aria-label="Tên" disabled />);
    const cls = slotClass("input");
    expect(cls).toContain("disabled:text-app-ink-disabled");
  });

  it("Textarea dùng token --app-ink-disabled qua disabled:text-app-ink-disabled", () => {
    render(<Textarea aria-label="Ghi chú" disabled />);
    expect(slotClass("textarea")).toContain("disabled:text-app-ink-disabled");
  });

  it("SelectTrigger dùng token --app-ink-disabled qua disabled:text-app-ink-disabled", () => {
    render(
      <Select>
        <SelectTrigger aria-label="Chọn" disabled>
          <SelectValue placeholder="Chọn một mục" />
        </SelectTrigger>
      </Select>,
    );
    expect(slotClass("select-trigger")).toContain("disabled:text-app-ink-disabled");
  });

  it("Button/Checkbox/Switch thể hiện disabled bằng token opacity + con trỏ", () => {
    const primary = buttonVariants({ variant: "default" });
    expect(primary).toContain("disabled:opacity-50");
    expect(primary).toContain("disabled:pointer-events-none");

    render(<Checkbox aria-label="Đồng ý" />);
    const cb = slotClass("checkbox");
    expect(cb).toContain("disabled:opacity-50");
    expect(cb).toContain("disabled:cursor-not-allowed");

    render(<Switch aria-label="Bật thông báo" />);
    const sw = slotClass("switch");
    expect(sw).toContain("disabled:opacity-50");
    expect(sw).toContain("disabled:cursor-not-allowed");
  });

  it("Input disabled thực sự không nhận input (DOM behavior)", async () => {
    const user = userEvent.setup();
    render(<Input aria-label="Tên" disabled />);
    const input = screen.getByRole("textbox") as HTMLInputElement;

    expect(input.disabled).toBe(true);
    await user.type(input, "abc");
    expect(input.value).toBe("");
  });

  it("Button disabled không kích hoạt onClick (DOM behavior)", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Lưu
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Lưu" });

    expect(btn).toBeDisabled();
    await user.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────
// 5.5 — Props/API không đổi: vẫn nhận & forward prop chuẩn + ref
// ─────────────────────────────────────────────────────────────

describe("Props/API bảo toàn — component forward prop chuẩn và ref (R5.5)", () => {
  it("Button forward id/className/aria-*/onClick và ref tới <button>", async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLButtonElement>();
    const onClick = vi.fn();

    render(
      <Button
        ref={ref}
        id="save-btn"
        className="custom-class"
        aria-label="Lưu thay đổi"
        data-testid="save"
        onClick={onClick}
      >
        Lưu
      </Button>,
    );

    const btn = screen.getByTestId("save");
    expect(btn.tagName).toBe("BUTTON");
    expect(btn.id).toBe("save-btn");
    expect(btn.getAttribute("aria-label")).toBe("Lưu thay đổi");
    expect(btn.className).toContain("custom-class");
    // className tuỳ biến được nối, không thay thế token nội bộ.
    expect(btn.className).toContain("bg-app-accent");
    expect(ref.current).toBe(btn);

    await user.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("Input forward standard props (id/name/type/placeholder/value) và ref", () => {
    const ref = createRef<HTMLInputElement>();
    render(
      <Input
        ref={ref}
        id="email"
        name="email"
        type="email"
        placeholder="you@example.com"
        defaultValue="a@b.com"
        aria-label="Email"
      />,
    );
    const input = screen.getByLabelText("Email") as HTMLInputElement;
    expect(input.id).toBe("email");
    expect(input.name).toBe("email");
    expect(input.type).toBe("email");
    expect(input.placeholder).toBe("you@example.com");
    expect(input.value).toBe("a@b.com");
    expect(ref.current).toBe(input);
  });

  it("Textarea forward standard props và ref", () => {
    const ref = createRef<HTMLTextAreaElement>();
    render(<Textarea ref={ref} id="note" name="note" rows={5} aria-label="Ghi chú" />);
    const ta = screen.getByLabelText("Ghi chú") as HTMLTextAreaElement;
    expect(ta.id).toBe("note");
    expect(ta.name).toBe("note");
    expect(ta.rows).toBe(5);
    expect(ref.current).toBe(ta);
  });

  it("Checkbox giữ prop controlClassName và forward className/aria + hành vi toggle", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(
      <Checkbox
        aria-label="Đồng ý"
        className="outer-cls"
        controlClassName="control-cls"
        onCheckedChange={onCheckedChange}
      />,
    );
    const cb = slotClass("checkbox");
    expect(cb).toContain("outer-cls");
    expect(slotClass("checkbox-control")).toContain("control-cls");

    await user.click(screen.getByRole("checkbox"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("Switch forward className/aria và hành vi toggle", async () => {
    const user = userEvent.setup();
    const onCheckedChange = vi.fn();
    render(<Switch aria-label="Bật thông báo" className="switch-cls" onCheckedChange={onCheckedChange} />);

    expect(slotClass("switch")).toContain("switch-cls");
    await user.click(screen.getByRole("switch"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });
});
