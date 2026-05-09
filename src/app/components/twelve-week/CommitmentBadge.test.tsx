import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CommitmentBadge } from "./CommitmentBadge";

describe("CommitmentBadge", () => {
  it("renders Chưa điền when commitment is missing", () => {
    render(<CommitmentBadge tacticName="Deep work" />);

    expect(screen.getByRole("button", { name: /Chưa điền/i })).toBeInTheDocument();
  });

  it("renders 0/5 câu when commitment object exists but is empty", () => {
    render(
      <CommitmentBadge
        tacticName="Deep work"
        commitment={{
          want: "",
          cost: "",
          means: "",
          tradeoff: "",
          reward: "",
        }}
      />,
    );

    expect(screen.getByRole("button", { name: /0\/5 câu/i })).toBeInTheDocument();
  });

  it("renders X/5 câu for partially filled commitment", () => {
    render(
      <CommitmentBadge
        tacticName="Deep work"
        commitment={{
          want: "Tôi muốn ship đều.",
          cost: "",
          means: "Tôi sẽ khóa lịch.",
          tradeoff: "",
          reward: "",
        }}
      />,
    );

    expect(screen.getByRole("button", { name: /2\/5 câu/i })).toBeInTheDocument();
  });

  it("renders 5/5 câu for fully filled commitment and saves edits", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <CommitmentBadge
        tacticName="Deep work"
        commitment={{
          want: "Want",
          cost: "Cost",
          means: "Means",
          tradeoff: "Tradeoff",
          reward: "Reward",
        }}
        onSave={onSave}
      />,
    );

    await user.click(screen.getByRole("button", { name: /5\/5 câu/i }));
    await user.clear(screen.getByLabelText("Tôi thực sự muốn điều này vì..."));
    await user.type(screen.getByLabelText("Tôi thực sự muốn điều này vì..."), "Updated want");
    await user.click(screen.getByRole("button", { name: "Lưu cam kết" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        want: "Updated want",
        cost: "Cost",
        means: "Means",
        tradeoff: "Tradeoff",
        reward: "Reward",
      }),
    );
  });
});
