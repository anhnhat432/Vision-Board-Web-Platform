import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ArchetypeHint } from "./ArchetypeHint";
import { ArchetypePicker } from "./ArchetypePicker";
import { getGoalArchetypeLabel } from "@/lib/smart-goal/goalArchetypes";

describe("ArchetypeHint", () => {
  it("renders metric variant with recommendedMetric for skill_learning", () => {
    render(<ArchetypeHint archetype="skill_learning" variant="metric" />);
    expect(screen.getByText("Chỉ số nên đo cho loại mục tiêu này")).toBeInTheDocument();
    expect(screen.getByText(/sản phẩm thực hành/i)).toBeInTheDocument();
  });

  it("renders leadAction variant with bullet list for health_fitness", () => {
    render(<ArchetypeHint archetype="health_fitness" variant="leadAction" />);
    expect(screen.getByText("Việc giữ nhịp thường hiệu quả")).toBeInTheDocument();
    const list = screen.getByRole("list");
    expect(list.querySelectorAll("li").length).toBeGreaterThanOrEqual(2);
  });

  it("renders antiPattern variant for exam_study with at least 2 items", () => {
    render(<ArchetypeHint archetype="exam_study" variant="antiPattern" />);
    expect(screen.getByText("Rủi ro hay gặp với loại mục tiêu này")).toBeInTheDocument();
    const list = screen.getByRole("list");
    expect(list.querySelectorAll("li").length).toBeGreaterThanOrEqual(2);
  });

  it("supports the 'other' archetype without crashing", () => {
    render(<ArchetypeHint archetype="other" variant="metric" />);
    expect(screen.getByText(/Loại mục tiêu: Khác/)).toBeInTheDocument();
  });

  it("exposes archetype + variant via data attributes for QA selectors", () => {
    const { container } = render(
      <ArchetypeHint archetype="financial_goal" variant="leadAction" showArchetypeTag={false} />,
    );
    const note = container.querySelector('[role="note"]');
    expect(note?.getAttribute("data-archetype")).toBe("financial_goal");
    expect(note?.getAttribute("data-archetype-hint-variant")).toBe("leadAction");
  });

  it("hides archetype tag when showArchetypeTag is false", () => {
    render(<ArchetypeHint archetype="skill_learning" variant="metric" showArchetypeTag={false} />);
    expect(screen.queryByText(/Loại mục tiêu:/)).toBeNull();
  });
});

describe("ArchetypePicker", () => {
  it("renders the current archetype label inside the trigger", () => {
    render(
      <ArchetypePicker
        archetype="exam_study"
        inferredArchetype="exam_study"
        isUserOverridden={false}
        onChange={() => {}}
        onResetToInferred={() => {}}
      />,
    );

    const trigger = screen.getByRole("combobox", { name: /loại mục tiêu/i });
    expect(trigger.textContent).toContain(getGoalArchetypeLabel("exam_study"));
  });

  it("shows the reset button only when overridden", () => {
    const onChange = vi.fn();
    const onResetToInferred = vi.fn();

    const { rerender } = render(
      <ArchetypePicker
        archetype="skill_learning"
        inferredArchetype="skill_learning"
        isUserOverridden={false}
        onChange={onChange}
        onResetToInferred={onResetToInferred}
      />,
    );

    expect(screen.queryByRole("button", { name: /đoán tự động/i })).toBeNull();

    rerender(
      <ArchetypePicker
        archetype="exam_study"
        inferredArchetype="skill_learning"
        isUserOverridden={true}
        onChange={onChange}
        onResetToInferred={onResetToInferred}
      />,
    );

    expect(screen.getByRole("button", { name: /đoán tự động/i })).toBeInTheDocument();
  });

  it("calls onResetToInferred when reset button clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onResetToInferred = vi.fn();

    render(
      <ArchetypePicker
        archetype="exam_study"
        inferredArchetype="skill_learning"
        isUserOverridden={true}
        onChange={onChange}
        onResetToInferred={onResetToInferred}
      />,
    );

    await user.click(screen.getByRole("button", { name: /đoán tự động/i }));
    expect(onResetToInferred).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("Archetype hint privacy", () => {
  it("does not render any raw user-provided text in hint output", () => {
    // The hint takes only the archetype enum — no goal_statement, metric_name, etc.
    const { container } = render(<ArchetypeHint archetype="exam_study" variant="metric" />);
    const html = container.innerHTML;
    expect(html).not.toContain("user_secret_payload");
    expect(html).not.toContain("personal_id");
  });
});
