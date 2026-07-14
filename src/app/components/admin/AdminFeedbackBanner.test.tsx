import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AdminFeedbackBanner } from "./AdminFeedbackBanner";

describe("AdminFeedbackBanner", () => {
  it("keeps verbose details outside the live summary", () => {
    render(
      <AdminFeedbackBanner
        tone="warning"
        summary="1 đã cập nhật, 1 thất bại."
        detailsLabel="1 mục thất bại"
        details={<p>missing-user · user_not_found</p>}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("1 đã cập nhật, 1 thất bại");
    expect(screen.getByRole("status")).not.toHaveTextContent("missing-user");
    expect(screen.getByText("missing-user · user_not_found")).toBeInTheDocument();
  });

  it("supports a labelled dismiss action", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <AdminFeedbackBanner
        tone="success"
        summary="Đã cập nhật."
        onDismiss={onDismiss}
        dismissLabel="Đóng thông báo cập nhật"
      />,
    );

    await user.click(screen.getByRole("button", { name: "Đóng thông báo cập nhật" }));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
