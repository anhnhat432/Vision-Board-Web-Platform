import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GoalArchetypeExamples } from "./GoalArchetypeExamples";

describe("GoalArchetypeExamples", () => {
  it("renders nothing when archetype is null", () => {
    const { container } = render(<GoalArchetypeExamples archetype={null} variant="goal" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when archetype is 'other' (no specific copy)", () => {
    const { container } = render(<GoalArchetypeExamples archetype="other" variant="goal" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a weak vs stronger goal pair for the goal variant", () => {
    render(<GoalArchetypeExamples archetype="skill_learning" variant="goal" defaultOpen />);
    const panel = screen.getByTestId("goal-archetype-examples");
    expect(panel.getAttribute("data-archetype")).toBe("skill_learning");
    expect(panel.getAttribute("data-variant")).toBe("goal");
    expect(panel.querySelector('[data-tone="weak"]')).not.toBeNull();
    expect(panel.querySelector('[data-tone="stronger"]')).not.toBeNull();
    expect(panel.textContent).toMatch(/Mục tiêu chưa rõ/i);
    expect(panel.textContent).toMatch(/Phiên bản rõ hơn/i);
  });

  it("renders bad vs good metric for the metric variant", () => {
    render(<GoalArchetypeExamples archetype="exam_study" variant="metric" defaultOpen />);
    const panel = screen.getByTestId("goal-archetype-examples");
    expect(panel.textContent).toMatch(/Chỉ số dễ ngộ nhận/i);
    expect(panel.textContent).toMatch(/Chỉ số đo được/i);
    // The exam_study bundle has the tell-tale "đề thi thử" string.
    expect(panel.textContent).toMatch(/đề thi thử/i);
  });

  it("renders the lead indicator pair PLUS the week-1 starter for the lead_indicator variant", () => {
    render(
      <GoalArchetypeExamples archetype="health_fitness" variant="lead_indicator" defaultOpen />,
    );
    const panel = screen.getByTestId("goal-archetype-examples");
    expect(panel.textContent).toMatch(/Việc nhầm thành kết quả/i);
    expect(panel.textContent).toMatch(/Việc lặp lại tốt/i);
    const starter = screen.getByTestId("goal-archetype-week1-starter");
    expect(starter.textContent).toMatch(/Việc bắt đầu cho tuần 1/i);
  });

  it("does not render the week-1 starter for non-lead_indicator variants", () => {
    render(<GoalArchetypeExamples archetype="career_growth" variant="goal" defaultOpen />);
    expect(screen.queryByTestId("goal-archetype-week1-starter")).toBeNull();
  });
});
