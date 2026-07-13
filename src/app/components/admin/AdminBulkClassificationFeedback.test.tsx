import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AdminBulkClassificationFeedback } from "./AdminBulkClassificationFeedback";

describe("AdminBulkClassificationFeedback", () => {
  it("summarizes counts and keeps failed UIDs in expandable details", () => {
    render(
      <AdminBulkClassificationFeedback
        result={{
          updated: 1,
          unchanged: 1,
          failed: [{ userUid: "missing-user", errorCode: "user_not_found" }],
        }}
        onDismiss={() => undefined}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "1 đã cập nhật, 1 không thay đổi, 1 thất bại",
    );
    expect(screen.getByRole("status")).not.toHaveTextContent("missing-user");
    expect(screen.getByText("1 mục thất bại")).toBeInTheDocument();
    expect(screen.getByText("missing-user · user_not_found")).toBeInTheDocument();
  });

  it("renders transport failure and supports dismissal", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <AdminBulkClassificationFeedback
        result={{ updated: 0, unchanged: 0, failed: [], transportFailed: true }}
        onDismiss={onDismiss}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Không thể gửi yêu cầu phân loại");
    await user.click(
      screen.getByRole("button", { name: "Đóng thông báo kết quả phân loại" }),
    );
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
