import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InlineStatusMessage } from "./InlineStatusMessage";

describe("InlineStatusMessage", () => {
  it("renders children as the message body", () => {
    render(<InlineStatusMessage tone="info">Đã lưu local.</InlineStatusMessage>);
    expect(screen.getByText("Đã lưu local.")).toBeInTheDocument();
  });

  it("defaults role to 'alert' for error tone", () => {
    render(
      <InlineStatusMessage tone="error" testId="msg">
        Không đồng bộ được.
      </InlineStatusMessage>,
    );
    expect(screen.getByTestId("msg").getAttribute("role")).toBe("alert");
  });

  it("defaults role to 'status' for non-error tones", () => {
    render(
      <InlineStatusMessage tone="warning" testId="msg">
        Lịch tuần đầu hơi dày.
      </InlineStatusMessage>,
    );
    expect(screen.getByTestId("msg").getAttribute("role")).toBe("status");
  });

  it("lets the caller override role", () => {
    render(
      <InlineStatusMessage tone="info" role="alert" testId="msg">
        Critical info
      </InlineStatusMessage>,
    );
    expect(screen.getByTestId("msg").getAttribute("role")).toBe("alert");
  });

  it("renders a prefix inline with the message", () => {
    render(
      <InlineStatusMessage tone="warning" prefix="Cảnh báo:" testId="msg">
        Tuần đầu đang quá dày.
      </InlineStatusMessage>,
    );
    const node = screen.getByTestId("msg");
    expect(node.textContent).toContain("Cảnh báo:");
    expect(node.textContent).toContain("Tuần đầu đang quá dày.");
  });
});
