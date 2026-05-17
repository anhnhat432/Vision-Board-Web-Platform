import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LIFE_AREAS } from "@/app/utils/storage-constants";
import { GoalCardChip } from "./GoalCardChip";

describe("GoalCardChip", () => {
  it("renders goal title, deadline, and progress", () => {
    render(
      <GoalCardChip
        width={220}
        goal={{ title: "Chạy 5km", category: "Health", deadline: "2026-12-31", progress: 60 }}
      />,
    );

    expect(screen.getByText("Chạy 5km")).toBeInTheDocument();
    expect(screen.getByText("31/12/2026")).toBeInTheDocument();
    expect(screen.getByText("60%")).toBeInTheDocument();
  });

  it("renders missing-goal state", () => {
    render(<GoalCardChip width={220} goal={undefined} />);

    expect(screen.getByText("Mục tiêu không còn tồn tại")).toBeInTheDocument();
  });

  it("uses life area override for badge label and color", () => {
    const career = LIFE_AREAS.find((area) => area.name === "Career");
    if (!career) throw new Error("Expected Career life area");
    render(
      <GoalCardChip
        width={220}
        lifeAreaId="Career"
        goal={{ title: "Chạy 5km", category: "Health", deadline: "2026-12-31", progress: 60 }}
      />,
    );

    const badge = screen.getByText("Sự nghiệp");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveStyle({ color: career?.color });
  });
});
