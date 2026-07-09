import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { emptyNarratives } from "../components/empty-states/narratives";
import { activateAuthenticatedUserData } from "../utils/storage";
import { GoalTracker } from "./GoalTracker";

// Kiểm tra hợp đồng empty state của Core_Flow (Requirement 5.1, 5.2, 5.4):
// - có tiêu đề
// - mô tả ≤ 200 ký tự
// - đúng một Primary_CTA trỏ route hiện có
// - click Primary_CTA → điều hướng đúng route đã đăng ký

const authContextMock = vi.hoisted(() => ({
  useAuthContext: vi.fn(),
  useOptionalAuthContext: vi.fn(),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: authContextMock.useAuthContext,
  useOptionalAuthContext: authContextMock.useOptionalAuthContext,
}));

vi.mock("../hooks/useBackendProgressOverlay", () => ({
  useBackendProgressOverlayMap: () => new Map(),
}));

vi.mock("../utils/app-mode", () => ({
  getAppMode: () => "real",
  isDemoMode: () => false,
  isRealMode: () => true,
  shouldEnable12WeekGoalTombstoneSync: () => true,
  shouldSeedDemoData: () => false,
  shouldShowBillingDebugUi: () => false,
  isPaidCheckoutDisabled: () => false,
}));

const EMPTY_STATE_DESCRIPTION_MAX_LENGTH = 200;

function setSignedInAuthContext() {
  const context = {
    user: {
      uid: "firebase_uid_empty_contract",
      email: "empty-contract@example.com",
      displayName: "Empty Contract",
    },
    userProfile: {
      id: "profile_empty_contract",
      email: "empty-contract@example.com",
      displayName: "Empty Contract",
    },
    userProfileLoading: false,
    userProfileError: null,
    authLoading: false,
    error: null,
    logout: vi.fn().mockResolvedValue(undefined),
    refreshUserProfile: vi.fn(),
    isConfigured: true,
  };
  authContextMock.useAuthContext.mockReturnValue(context);
  authContextMock.useOptionalAuthContext.mockReturnValue(context);
}

function renderGoalTracker() {
  const router = createMemoryRouter(
    [
      { path: "/goals", element: <GoalTracker /> },
      { path: "/onboarding", element: <div data-testid="onboarding-page">Onboarding page</div> },
      { path: "/life-insight", element: <div data-testid="life-insight-page">Life Insight page</div> },
    ],
    { initialEntries: ["/goals"] },
  );

  return { router, ui: render(<RouterProvider router={router} />) };
}

async function findEmptyGoalState(): Promise<HTMLElement> {
  const heading = await screen.findByRole("heading", { name: "Chưa có mục tiêu" });
  const container = heading.closest(".surface-raised") as HTMLElement | null;
  if (!container) {
    throw new Error("Missing empty goal state container");
  }
  return container;
}

describe("GoalTracker empty state contract (Req 5.1, 5.2, 5.4)", () => {
  beforeEach(() => {
    localStorage.clear();
    setSignedInAuthContext();
  });

  it("renders a title and a description within the 200-character limit", async () => {
    activateAuthenticatedUserData("firebase_uid_empty_contract");
    renderGoalTracker();

    const emptyState = await findEmptyGoalState();

    // Tiêu đề
    expect(within(emptyState).getByRole("heading", { name: "Chưa có mục tiêu" })).toBeInTheDocument();

    // Mô tả ≤ 200 ký tự
    const description = within(emptyState).getByText(/Bắt đầu bằng chu kỳ 12 tuần đầu tiên/);
    const descriptionText = description.textContent ?? "";
    expect(descriptionText.length).toBeGreaterThan(0);
    expect(descriptionText.length).toBeLessThanOrEqual(EMPTY_STATE_DESCRIPTION_MAX_LENGTH);
  });

  it("marks exactly one Primary_CTA in the empty state", async () => {
    activateAuthenticatedUserData("firebase_uid_empty_contract");
    renderGoalTracker();

    const emptyState = await findEmptyGoalState();

    // Primary_CTA quy ước dùng nền accent đặc (token `bg-app-accent` không tiền tố);
    // các nút còn lại là secondary (outline) chỉ dùng accent ở trạng thái hover.
    const primaryButtons = within(emptyState)
      .getAllByRole("button")
      .filter((button) => button.className.split(/\s+/).includes("bg-app-accent"));

    expect(primaryButtons).toHaveLength(1);
    expect(primaryButtons[0]).toHaveTextContent("Bắt đầu chu kỳ 12 tuần");
  });

  it("navigates to an existing registered route when the Primary_CTA is activated", async () => {
    activateAuthenticatedUserData("firebase_uid_empty_contract");
    const user = userEvent.setup();
    const { router } = renderGoalTracker();

    const emptyState = await findEmptyGoalState();
    const primaryCta = within(emptyState).getByRole("button", { name: /Bắt đầu chu kỳ 12 tuần/ });

    await user.click(primaryCta);

    // Điều hướng tới route đã đăng ký khởi tạo dữ liệu cho màn hình (Req 5.4).
    expect(router.state.location.pathname).toBe("/onboarding");
  });
});

describe("ReflectionJournal empty state contract (Req 5.1)", () => {
  it("keeps the empty journal description within the 200-character limit", () => {
    // Chuỗi mô tả được ghép đúng như ReflectionJournal render trong nhánh empty.
    const journalDescription = `${emptyNarratives.noJournalEntries.body} Bắt đầu từ một gợi ý bên dưới.`;

    expect(journalDescription.length).toBeGreaterThan(0);
    expect(journalDescription.length).toBeLessThanOrEqual(EMPTY_STATE_DESCRIPTION_MAX_LENGTH);
  });
});
