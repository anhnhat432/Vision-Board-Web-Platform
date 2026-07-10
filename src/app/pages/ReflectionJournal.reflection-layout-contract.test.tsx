import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { emptyNarratives } from "../components/empty-states/narratives";
import { getUserData, saveUserData } from "../utils/storage";
import { ReflectionJournal } from "./ReflectionJournal";

// Kiểm tra hợp đồng layout + CTA + empty state của bề mặt Reflection/Review
// (Requirement 15.1, 15.2, 15.3, 15.4, 15.5):
// - Hai <section> tách biệt, mỗi khối có heading (h2) riêng + ranh giới phân tách.
// - Đúng một Primary_CTA (nền accent đặc `bg-app-warm`) ở màn hình ready, còn lại secondary.
// - Empty state: có tiêu đề, mô tả dài 1–200 ký tự, đúng một Primary_CTA.
// - Kích hoạt Primary_CTA của empty state → mở luồng tạo reflection (Dialog) tại chỗ,
//   KHÔNG tạo route mới (giữ nguyên /journal — đúng như hiện thực constraint 15.5).
// - Trạng thái loading: KHÔNG render empty state / Primary_CTA của empty state.

const EMPTY_STATE_DESCRIPTION_MAX_LENGTH = 200;

// Cho phép ép trạng thái `loading` (userData === null) mà không đụng Storage_Contract.
// Mặc định "real": ủy quyền cho getUserData() thật, phản ánh localStorage đã seed.
const syncState = vi.hoisted(() => ({ mode: "real" as "real" | "loading" }));

vi.mock("../hooks/useSyncedUserData", async () => {
  const actual = await vi.importActual<typeof import("../utils/storage")>("../utils/storage");
  return {
    useSyncedUserData: () => ({
      userData: syncState.mode === "loading" ? null : actual.getUserData(),
      reloadUserData: vi.fn(),
    }),
  };
});

function seedJournal(reflectionCount: number) {
  const data = getUserData();
  data.reflections =
    reflectionCount === 0
      ? []
      : Array.from({ length: reflectionCount }, (_, index) => ({
          id: `reflection_${index}`,
          date: "2025-01-15",
          title: `Ghi chép ${index}`,
          content: `Nội dung phản tư ${index}`,
          mood: "happy" as const,
          entryType: "freeform" as const,
        }));
  saveUserData(data);
}

function renderJournal() {
  const router = createMemoryRouter([{ path: "/journal", element: <ReflectionJournal /> }], {
    initialEntries: ["/journal"],
  });

  return { router, ui: render(<RouterProvider router={router} />) };
}

// Primary_CTA quy ước trên bề mặt Reflection dùng nền accent đặc `bg-app-warm`;
// các phần tử điều hướng còn lại là secondary (outline / chỉ dùng accent khi hover).
function getPrimaryCtas(container: HTMLElement) {
  return within(container)
    .getAllByRole("button")
    .filter((button) => button.className.split(/\s+/).includes("bg-app-warm"));
}

function findEmptyState(): HTMLElement {
  const heading = screen.getByRole("heading", { name: emptyNarratives.noJournalEntries.title });
  const container = heading.closest("section");
  if (!container) {
    throw new Error("Missing reflection empty state container");
  }
  return container;
}

describe("ReflectionJournal layout + CTA + empty-state contract (Req 15.1–15.5)", () => {
  beforeEach(() => {
    localStorage.clear();
    syncState.mode = "real";
  });

  afterEach(() => {
    syncState.mode = "real";
    vi.clearAllMocks();
  });

  // Req 15.1 — hai section tách biệt, mỗi khối có heading riêng + ranh giới phân tách.
  it("renders two labelled sections (prompt + progress) with their own heading and a boundary", () => {
    seedJournal(1);
    renderJournal();

    const promptSection = document.querySelector<HTMLElement>('[data-reflection-section="prompt"]');
    const progressSection = document.querySelector<HTMLElement>('[data-reflection-section="progress"]');

    expect(promptSection).not.toBeNull();
    expect(progressSection).not.toBeNull();

    // Mỗi section có heading h2 riêng, liên kết qua aria-labelledby.
    expect(promptSection).toHaveAttribute("aria-labelledby", "reflection-prompt-heading");
    expect(progressSection).toHaveAttribute("aria-labelledby", "reflection-progress-heading");

    const promptHeading = document.getElementById("reflection-prompt-heading");
    const progressHeading = document.getElementById("reflection-progress-heading");
    expect(promptHeading?.tagName).toBe("H2");
    expect(progressHeading?.tagName).toBe("H2");
    expect(promptHeading?.textContent?.trim().length).toBeGreaterThan(0);
    expect(progressHeading?.textContent?.trim().length).toBeGreaterThan(0);

    // Ranh giới phân tách rõ giữa hai phần: section tiến độ có đường viền trên (border-t).
    expect(progressSection?.className.split(/\s+/)).toContain("border-t");
  });

  // Req 15.2 — đúng một Primary_CTA trên màn hình, còn lại secondary.
  it("marks exactly one Primary_CTA on the ready screen and the rest as secondary", () => {
    seedJournal(1);
    renderJournal();

    const primaryCtas = getPrimaryCtas(document.body);
    expect(primaryCtas).toHaveLength(1);
    expect(primaryCtas[0]).toHaveTextContent(/Viết entry mới/i);

    // Các nút điều hướng còn lại không được đánh dấu là Primary_CTA.
    const secondaryNav = screen.getByRole("button", { name: /Dòng thời gian/i });
    expect(secondaryNav.className.split(/\s+/)).not.toContain("bg-app-warm");
  });

  // Req 15.4 — empty state: tiêu đề + mô tả 1–200 ký tự + đúng một Primary_CTA.
  it("renders an empty state with a title, a 1–200 char description and exactly one Primary_CTA", () => {
    seedJournal(0);
    renderJournal();

    const emptyState = findEmptyState();

    // Tiêu đề tồn tại.
    expect(
      within(emptyState).getByRole("heading", { name: emptyNarratives.noJournalEntries.title }),
    ).toBeInTheDocument();

    // Mô tả dài 1–200 ký tự.
    const description = within(emptyState).getByText(new RegExp(emptyNarratives.noJournalEntries.body));
    const descriptionText = description.textContent ?? "";
    expect(descriptionText.length).toBeGreaterThanOrEqual(1);
    expect(descriptionText.length).toBeLessThanOrEqual(EMPTY_STATE_DESCRIPTION_MAX_LENGTH);

    // Đúng một Primary_CTA trong empty state.
    const primaryCtas = getPrimaryCtas(emptyState);
    expect(primaryCtas).toHaveLength(1);
    expect(primaryCtas[0]).toHaveTextContent(/Viết entry đầu tiên/i);
  });

  // Req 15.5 — kích hoạt Primary_CTA của empty state → mở luồng tạo reflection tại chỗ,
  // KHÔNG tạo route mới / đổi route availability (ở lại /journal, mở Dialog).
  it("activates the create-reflection flow (dialog) without navigating to a new route", async () => {
    seedJournal(0);
    const user = userEvent.setup();
    const { router } = renderJournal();

    const emptyState = findEmptyState();
    const primaryCta = within(emptyState).getByRole("button", { name: /Viết entry đầu tiên/i });

    // Dialog tạo reflection chưa mở trước khi kích hoạt Primary_CTA.
    expect(screen.queryByRole("dialog", { name: /Viết nhật ký mới/i })).not.toBeInTheDocument();

    await user.click(primaryCta);

    // Luồng tạo reflection mở tại chỗ (Dialog "Viết nhật ký mới").
    // Định danh theo accessible name để tránh nhầm với popover hướng dẫn (ScreenGuide).
    const dialog = await screen.findByRole("dialog", { name: /Viết nhật ký mới/i });
    expect(within(dialog).getByRole("heading", { name: /Viết nhật ký mới/i })).toBeInTheDocument();

    // Không tạo route mới: vẫn ở /journal.
    expect(router.state.location.pathname).toBe("/journal");
  });

  // Req 15.3 — WHILE đang tải: KHÔNG render empty state / Primary_CTA của empty state.
  it("does not render the empty state or its Primary_CTA while loading", () => {
    seedJournal(0);
    syncState.mode = "loading";
    renderJournal();

    // Trạng thái tải hiển thị (skeleton cấp trang có role=status).
    expect(screen.getByRole("status")).toBeInTheDocument();

    // Không có empty state / Primary_CTA của empty state.
    expect(screen.queryByRole("heading", { name: emptyNarratives.noJournalEntries.title })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Viết entry đầu tiên/i })).not.toBeInTheDocument();
  });
});
