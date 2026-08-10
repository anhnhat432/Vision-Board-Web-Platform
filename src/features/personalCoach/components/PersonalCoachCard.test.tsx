import type { CoachRecommendation } from "@shared/personalCoachSchema";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PersonalCoachState } from "../hooks/usePersonalCoach";

const hookMock = vi.hoisted(() => ({
  state: null as PersonalCoachState | null,
  retry: vi.fn(),
  isRetrying: false,
}));

vi.mock("../hooks/usePersonalCoach", () => ({
  usePersonalCoach: () => ({
    state: hookMock.state,
    retry: hookMock.retry,
    isRetrying: hookMock.isRetrying,
  }),
}));

import { PersonalCoachCard } from "./PersonalCoachCard";

const taskRecommendation: CoachRecommendation = {
  title: "Ưu tiên hôm nay",
  recommendation: "Hãy chốt case study trước khi chuyển sang việc phụ.",
  rationale: [
    "Theo kế hoạch hôm nay, đây là task cốt lõi.",
    "Theo dữ liệu thực thi, task này vẫn đang mở.",
    "Trong review gần nhất, bạn đã chọn giảm tải.",
  ],
  primaryAction: { type: "open_task", taskId: "task_1" },
};

function renderCard(context: object | null = {}): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <PersonalCoachCard context={context as never} setupHref="/onboarding" />
    </MemoryRouter>,
  );
}

describe("PersonalCoachCard", () => {
  beforeEach(() => {
    hookMock.retry.mockReset();
    hookMock.isRetrying = false;
    hookMock.state = {
      status: "ready",
      recommendation: taskRecommendation,
      source: "ai",
    };
  });

  it("renders an actionable no-active-goal state without calling AI", () => {
    hookMock.state = { status: "idle", recommendation: null };
    renderCard(null);

    expect(screen.getByRole("heading", { name: "Coach cần một mục tiêu 12 tuần" })).toBeInTheDocument();
    expect(screen.getByText(/chưa có chu kỳ 12 tuần đang hoạt động/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tiếp tục thiết lập" })).toHaveAttribute("href", "/onboarding");
  });

  it("announces loading while keeping the deterministic recommendation usable", () => {
    hookMock.state = { status: "loading", recommendation: taskRecommendation };
    renderCard();

    expect(screen.getByRole("status")).toHaveTextContent("Coach đang làm mới gợi ý");
    expect(screen.getByText(taskRecommendation.recommendation)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mở trong Today" })).toHaveAttribute(
      "href",
      "/12-week-system?tab=today",
    );
  });

  it("keeps evidence collapsed, keyboard accessible, and capped at three bullets", async () => {
    const user = userEvent.setup();
    renderCard();

    const disclosure = screen.getByRole("button", { name: "Vì sao?" });
    expect(disclosure).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(taskRecommendation.rationale[0])).not.toBeInTheDocument();

    disclosure.focus();
    await user.keyboard("{Enter}");

    expect(disclosure).toHaveAttribute("aria-expanded", "true");
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
    expect(screen.getByText(taskRecommendation.rationale[2])).toBeInTheDocument();
  });

  it.each([
    ["open_today", "Mở Today", "/12-week-system?tab=today"],
    ["open_week_review", "Review tuần", "/12-week-system?tab=week"],
    ["open_week_plan", "Xem kế hoạch tuần", "/12-week-system?tab=week"],
  ] as const)("maps %s to a trusted route", (type, label, href) => {
    hookMock.state = {
      status: "ready",
      source: "ai",
      recommendation: {
        ...taskRecommendation,
        primaryAction: { type },
      },
    };

    renderCard();

    const action = screen.getByRole("link", { name: label });
    expect(action).toHaveAttribute("href", href);
    expect(action).toHaveClass("min-h-11");
  });

  it.each([
    ["offline", "Ngoại tuyến"],
    ["rate_limited", "Tạm giới hạn"],
    ["error", "Gợi ý dự phòng"],
  ] as const)("shows the %s fallback state and one retry control", async (status, label) => {
    const user = userEvent.setup();
    hookMock.state = {
      status,
      recommendation: taskRecommendation,
      errorCode: `COACH_${status.toUpperCase()}`,
    };
    renderCard();

    expect(screen.getByText(label)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Thử lại gợi ý Coach" }));
    expect(hookMock.retry).toHaveBeenCalledTimes(1);
  });

  it("does not invent more work when the deterministic state says today is complete", () => {
    hookMock.state = {
      status: "ready",
      source: "deterministic",
      recommendation: {
        title: "Hôm nay đã khép lại",
        recommendation: "Bạn không cần thêm việc mới. Nếu còn 2 phút, hãy check-in.",
        rationale: ["Theo dữ liệu thực thi, mọi việc hôm nay đã hoàn thành."],
        primaryAction: { type: "open_today" },
      },
    };
    renderCard();

    expect(screen.getByText(/không cần thêm việc mới/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mở Today" })).toBeInTheDocument();
  });
});
