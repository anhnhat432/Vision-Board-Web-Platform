import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AdminOperationalClassificationBadge, getAdminOperationalClassificationSourceLabel } from "./AdminOperationalClassificationBadge";
import { AdminOperationalClassificationDialog } from "./AdminOperationalClassificationDialog";
import { AdminOperationalScopeFilter } from "./AdminOperationalScopeFilter";

Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
  configurable: true,
  value: () => false,
});
Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
  configurable: true,
  value: () => undefined,
});

describe("admin operational classification primitives", () => {
  it("renders a confirmed real badge only for an explicit user classification", () => {
    render(
      <>
        <AdminOperationalClassificationBadge classification={{ effectiveCategory: "real", source: "user" }} />
        <AdminOperationalClassificationBadge classification={{ effectiveCategory: "real", source: "default" }} />
      </>,
    );

    expect(screen.getAllByText("Dữ liệu thật · Đã xác nhận")).toHaveLength(1);
  });

  it("renders excluded classification badges and source labels without a real-data badge", () => {
    const { rerender } = render(
      <AdminOperationalClassificationBadge classification={{ effectiveCategory: "real", source: "default" }} />,
    );
    expect(screen.queryByText("Test")).not.toBeInTheDocument();

    rerender(
      <AdminOperationalClassificationBadge
        classification={{ effectiveCategory: "test", source: "user", reason: "test_account" }}
      />,
    );
    expect(screen.getByText("Test")).toBeInTheDocument();
    expect(getAdminOperationalClassificationSourceLabel("record")).toBe("Đánh dấu trực tiếp");
  });

  it("exposes the scope filter with an accessible label", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AdminOperationalScopeFilter value="real" onChange={onChange} />);

    await user.click(screen.getByRole("combobox", { name: "Phạm vi dữ liệu" }));
    await user.click(screen.getByRole("option", { name: "Test & nội bộ" }));

    expect(onChange).toHaveBeenCalledWith("excluded");
  });

  it("requires a note for other and announces the validation accessibly", async () => {
    const user = userEvent.setup();
    render(
      <AdminOperationalClassificationDialog
        open
        targetType="payment_order"
        targetLabel="VBTEST0001"
        initialCategory="test"
        initialReason="other"
        initialNote=""
        pending={false}
        onOpenChange={() => undefined}
        onConfirm={async () => undefined}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Xác nhận phân loại" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Nhập ghi chú");
    expect(screen.getByText("Không nhập mật khẩu, secret, thông tin ngân hàng hoặc dữ liệu khách hàng không cần thiết vào ghi chú.")).toBeInTheDocument();
  });

  it("resets draft fields at the open boundary and warns about user cascades", async () => {
    const user = userEvent.setup();
    const props = {
      targetType: "user" as const,
      targetLabel: "Tài khoản kiểm thử",
      initialCategory: "test" as const,
      initialReason: "other" as const,
      initialNote: "Ghi chú gốc",
      pending: false,
      onOpenChange: vi.fn(),
      onConfirm: vi.fn(),
    };
    const { rerender } = render(<AdminOperationalClassificationDialog open {...props} />);

    const note = screen.getByRole("textbox", { name: "Ghi chú" });
    await user.clear(note);
    await user.type(note, "Bản nháp khác");
    expect(note).toHaveValue("Bản nháp khác");
    expect(screen.getByText(/Plus, thanh toán và in ấn/)).toBeInTheDocument();

    rerender(<AdminOperationalClassificationDialog open={false} {...props} />);
    rerender(<AdminOperationalClassificationDialog open {...props} />);

    expect(screen.getByRole("textbox", { name: "Ghi chú" })).toHaveValue("Ghi chú gốc");
  });

  it("keeps a pending dialog open when Escape requests dismissal", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(
      <AdminOperationalClassificationDialog
        open
        targetType="physical_order"
        targetLabel="507f1f77bcf86cd799439011"
        initialCategory="real"
        pending
        onOpenChange={onOpenChange}
        onConfirm={() => undefined}
      />,
    );

    screen.getByRole("alertdialog").focus();
    await user.keyboard("{Escape}");

    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hủy" })).toBeDisabled();
  });

  it("keeps an inherited non-real record from offering an in-dialog real override", async () => {
    const user = userEvent.setup();
    render(
      <AdminOperationalClassificationDialog
        open
        targetType="payment_order"
        targetLabel="VBPAY0001"
        initialCategory="test"
        pending={false}
        disableRealCategory
        disabledRealCategoryReason="Phân loại tài khoản đang kiểm soát đơn này. Hãy khôi phục tài khoản từ trang Người dùng."
        onOpenChange={() => undefined}
        onConfirm={() => undefined}
      />,
    );

    expect(screen.getByText("Phân loại tài khoản đang kiểm soát đơn này. Hãy khôi phục tài khoản từ trang Người dùng.")).toBeInTheDocument();
    await user.click(screen.getByRole("combobox", { name: "Phân loại" }));
    expect(screen.getByRole("option", { name: "Dữ liệu thật" })).toHaveAttribute("data-disabled");
  });
});
