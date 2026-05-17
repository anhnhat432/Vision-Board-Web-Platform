import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { STORY_FEELING_OPTIONS } from "@/app/utils/vision-board-config";
import { VisionBoardStoryWizard, type VisionBoardStorySeed } from "./VisionBoardStoryWizard";

const GOALS = [
  { id: "goal_health_1", title: "Chạy 5km", category: "Health" },
  { id: "goal_health_2", title: "Ngủ sâu hơn", category: "Health" },
  { id: "goal_career_1", title: "Ra mắt portfolio", category: "Career" },
];

function renderWizard(options: { availableGoals?: typeof GOALS; onComplete?: (seed: VisionBoardStorySeed) => void } = {}) {
  const onOpenChange = vi.fn();
  const onComplete = options.onComplete ?? vi.fn();

  render(
    <VisionBoardStoryWizard
      open={true}
      onOpenChange={onOpenChange}
      onComplete={onComplete}
      availableGoals={options.availableGoals ?? []}
      year="2026"
    />,
  );

  return { onComplete, onOpenChange };
}

async function selectThreeFeelings(user: ReturnType<typeof userEvent.setup>) {
  for (const feeling of STORY_FEELING_OPTIONS.slice(0, 3)) {
    await user.click(screen.getByRole("button", { name: feeling.label }));
  }
}

async function goToStep2(user: ReturnType<typeof userEvent.setup>) {
  await selectThreeFeelings(user);
  await user.click(screen.getByRole("button", { name: "Tiếp tục" }));
}

async function goToStep3(user: ReturnType<typeof userEvent.setup>, focusName = "Sức khỏe") {
  await goToStep2(user);
  await user.click(screen.getByRole("button", { name: new RegExp(focusName) }));
  await user.click(screen.getByRole("button", { name: "Tiếp tục" }));
}

async function goToStep4(user: ReturnType<typeof userEvent.setup>, focusName = "Sức khỏe") {
  await goToStep3(user, focusName);
  await user.click(screen.getByRole("button", { name: "Tiếp tục" }));
}

describe("VisionBoardStoryWizard", () => {
  it("starts at step 1 and enables continue only after three feelings", async () => {
    const user = userEvent.setup();
    renderWizard();

    expect(screen.getByText("1/4")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tiếp tục" })).toBeDisabled();

    await selectThreeFeelings(user);

    expect(screen.getByText("Đã chọn 3/3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tiếp tục" })).toBeEnabled();
  });

  it("validates step 2 focus area selection and blocks a fourth area", async () => {
    const user = userEvent.setup();
    renderWizard({ availableGoals: GOALS });

    await goToStep2(user);

    expect(screen.getByText("2/4")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tiếp tục" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /Sức khỏe/ }));
    expect(screen.getByRole("button", { name: "Tiếp tục" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: /Sự nghiệp/ }));
    await user.click(screen.getByRole("button", { name: /Tài chính/ }));

    expect(screen.getByRole("button", { name: /Học tập/ })).toBeDisabled();
  });

  it("allows skipping step 3 core quote", async () => {
    const user = userEvent.setup();
    renderWizard();

    await goToStep3(user);
    await user.click(screen.getByRole("button", { name: "Tiếp tục" }));

    expect(screen.getByText("4/4")).toBeInTheDocument();
    expect(screen.getByText("Chọn không gian cho bảng")).toBeInTheDocument();
  });

  it("completes with selected sunset theme and generated items", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    renderWizard({ onComplete });

    await goToStep4(user);
    await user.click(screen.getByRole("button", { name: /Hoàng hôn/ }));
    await user.click(screen.getByRole("button", { name: "Tạo bảng" }));

    expect(onComplete).toHaveBeenCalledTimes(1);
    const seed = onComplete.mock.calls[0][0] as VisionBoardStorySeed;
    expect(seed.themeId).toBe("sunset");
    expect(seed.storyAnswers.feelings).toHaveLength(3);
    expect(seed.storyAnswers.focusAreas.length).toBeGreaterThanOrEqual(1);
    expect(seed.items.length).toBeGreaterThan(0);
  });

  it("injects goal cards for goals in the selected focus area", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    renderWizard({ availableGoals: GOALS, onComplete });

    await goToStep4(user);
    await user.click(screen.getByRole("button", { name: "Tạo bảng" }));

    const seed = onComplete.mock.calls[0][0] as VisionBoardStorySeed;
    const goalCard = seed.items.find((item) => item.type === "goal_card");
    expect(goalCard).toBeTruthy();
    expect(["goal_health_1", "goal_health_2"]).toContain(goalCard?.content);
  });

  it("uses the typed core quote as the quote item", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    renderWizard({ onComplete });

    await goToStep3(user);
    await user.type(screen.getByLabelText("Câu nói trọng tâm"), "Tôi là bình minh");
    await user.click(screen.getByRole("button", { name: "Tiếp tục" }));
    await user.click(screen.getByRole("button", { name: "Tạo bảng" }));

    const seed = onComplete.mock.calls[0][0] as VisionBoardStorySeed;
    expect(seed.items).toContainEqual(expect.objectContaining({ type: "quote", content: "Tôi là bình minh" }));
  });

  it("uses the selected theme default quote font", async () => {
    const user = userEvent.setup();
    const onComplete = vi.fn();
    renderWizard({ onComplete });

    await goToStep4(user);
    await user.click(screen.getByRole("button", { name: /Hoàng hôn/ }));
    await user.click(screen.getByRole("button", { name: "Tạo bảng" }));

    const seed = onComplete.mock.calls[0][0] as VisionBoardStorySeed;
    const quote = seed.items.find((item) => item.type === "quote");
    expect(quote?.style?.quoteFont).toBe("handwriting");
  });
});
