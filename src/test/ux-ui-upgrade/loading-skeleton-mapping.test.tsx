// Feature: core-flow-ui-upgrade, Task 16.2: Component/DOM test skeleton mapping + overflow + thay thế
//
// Validates: Requirements 14.1, 14.2, 14.3, 14.5, 14.6, 14.7
//
// ─────────────────────────────────────────────────────────────────────────────
// GHI CHÚ QUAN TRỌNG VỀ GIỚI HẠN JSDOM (đọc trước khi sửa test này)
// ─────────────────────────────────────────────────────────────────────────────
// Test suite của dự án chạy trên **jsdom** (Vitest). jsdom KHÔNG có layout engine
// thật: `offsetWidth`, `scrollWidth`, `clientWidth`, và `getBoundingClientRect()`
// đều trả về 0. Vì vậy phép đo pixel thật kiểu `document.scrollWidth <= clientWidth`
// hoặc "phần tử skeleton tràn container theo toạ độ pixel" hoặc luôn pass giả tạo
// (0 <= 0) hoặc vô nghĩa. Đây là cùng giới hạn đã được ghi chú ở test anh em
// `mobile-safety-touch-target.test.tsx` (task 10.2).
//
// Do đó test này khoá **HỢP ĐỒNG mobile-safety ở mức class/attribute** — thứ mà
// jsdom kiểm chứng được trung thực:
//   - Container skeleton dùng `min-w-0` (Req 14.2: không ép co gây tràn ngang) và
//     chiều rộng bị chặn bằng `max-w-*` + padding responsive (Req 14.3: không tràn
//     container ở desktop).
//   - Hợp đồng class bất biến giữa dải Mobile (320–767px) và Desktop (≥1024px).
// Kiểm chứng pixel thật (scrollWidth ≤ clientWidth, không phần tử tràn container)
// được để cho Playwright screenshot ở task 13.1/21.1 — nơi có layout engine thật.
//
// Phần hành vi state-machine (loading hiển thị skeleton ánh xạ 1:1 vùng nội dung,
// ready/error thay toàn bộ skeleton, error kèm "Thử lại") được kiểm chứng đầy đủ
// và trung thực trong jsdom.

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ScreenStateView } from "@/app/components/states/ScreenStateView";
import { GoalListSkeleton } from "@/app/pages/GoalTracker/components/GoalListSkeleton";
import { getUserData, saveUserData, type UserData } from "@/app/utils/storage";

// ─────────────────────────────────────────────────────────────
// Mock nguồn dữ liệu của ReflectionJournal để lái màn hình vào đúng nhánh
// loading (userData chưa sẵn sàng → hiển thị skeleton cấp trang). getUserData()
// luôn trả dữ liệu hợp lệ nên nhánh loading chỉ đạt được khi userData == null.
// Holder hoisted cho phép mỗi test set trạng thái userData riêng.
// ─────────────────────────────────────────────────────────────
const reflectionDataMock = vi.hoisted(() => ({
  userData: null as UserData | null,
  reloadUserData: vi.fn(),
}));

vi.mock("@/app/hooks/useSyncedUserData", () => ({
  useSyncedUserData: () => reflectionDataMock,
}));

// Import sau khi khai báo mock để ReflectionJournal dùng hook đã mock.
import { ReflectionJournal } from "@/app/pages/ReflectionJournal";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

function setViewport(width: number) {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { writable: true, configurable: true, value: 844 });
}

const MOBILE_WIDTHS = [320, 390, 767] as const;
const DESKTOP_WIDTHS = [1024, 1440] as const;

const SKELETON_SELECTOR = '[data-slot="skeleton"]';

/** Số khối skeleton mà `GoalListSkeleton` ánh xạ 1:1 với vùng nội dung thật:
 * vùng tiêu đề (label + heading + số lượng = 3) + vùng list (3 thẻ) = 6. */
const GOAL_SKELETON_BLOCK_COUNT = 6;

afterEach(() => {
  setViewport(1024);
  reflectionDataMock.userData = null;
  reflectionDataMock.reloadUserData.mockClear();
  localStorage.clear();
});

// ─────────────────────────────────────────────────────────────
// 1) ScreenStateView + skeleton per-screen: loading hiển thị skeleton ánh xạ
//    1:1 vùng nội dung; ready/error thay toàn bộ skeleton (Req 14.1, 14.5, 14.6, 14.7)
// ─────────────────────────────────────────────────────────────

describe("Loading skeleton wiring qua ScreenStateView — GoalTracker (Req 14.1, 14.5, 14.6, 14.7)", () => {
  it("nhánh loading render skeleton per-screen ánh xạ 1:1 vùng nội dung, hiển thị đồng bộ (Req 14.1, 14.5)", () => {
    const { container } = render(
      <ScreenStateView state="loading" loadingFallback={<GoalListSkeleton />} empty={<div>empty</div>}>
        <div data-testid="ready-content">Nội dung thật</div>
      </ScreenStateView>,
    );

    // Render là đồng bộ: skeleton có mặt ngay sau render, không cần chờ timer (Req 14.5).
    const loadingRegion = container.querySelector('[data-screen-state="loading"]');
    expect(loadingRegion).not.toBeNull();

    // Vùng skeleton dùng landmark trạng thái tải, không hiển thị nội dung thật/empty.
    const status = within(loadingRegion as HTMLElement).getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByTestId("ready-content")).toBeNull();
    expect(screen.queryByText("empty")).toBeNull();

    // Ánh xạ 1:1: đủ số khối placeholder tương ứng vùng tiêu đề + vùng list (Req 14.1).
    expect(loadingRegion?.querySelectorAll(SKELETON_SELECTOR)).toHaveLength(GOAL_SKELETON_BLOCK_COUNT);
  });

  it("nhánh ready thay TOÀN BỘ skeleton bằng nội dung thật, không giữ lại phần tử skeleton (Req 14.6)", () => {
    const { container } = render(
      <ScreenStateView state="ready" loadingFallback={<GoalListSkeleton />} empty={<div>empty</div>}>
        <div data-testid="ready-content">Nội dung thật</div>
      </ScreenStateView>,
    );

    expect(container.querySelector('[data-screen-state="ready"]')).not.toBeNull();
    expect(screen.getByTestId("ready-content")).toBeInTheDocument();
    // Không còn bất kỳ phần tử skeleton nào sau khi nội dung thật hiển thị.
    expect(container.querySelectorAll(SKELETON_SELECTOR)).toHaveLength(0);
  });

  it("nhánh error thay skeleton bằng khối lỗi kèm 'Thử lại', không giữ lại skeleton (Req 14.7)", async () => {
    const onRetry = vi.fn();
    const { container } = render(
      <ScreenStateView state="error" onRetry={onRetry} loadingFallback={<GoalListSkeleton />} empty={<div>empty</div>}>
        <div data-testid="ready-content">Nội dung thật</div>
      </ScreenStateView>,
    );

    expect(container.querySelector('[data-screen-state="error"]')).not.toBeNull();
    // Không còn skeleton khi đã ở nhánh lỗi.
    expect(container.querySelectorAll(SKELETON_SELECTOR)).toHaveLength(0);
    expect(screen.queryByTestId("ready-content")).toBeNull();

    // Có tùy chọn thử lại và bấm được (Req 14.7).
    const retry = screen.getByRole("button", { name: /Thử lại/i });
    expect(retry).toBeInTheDocument();
    await userEvent.click(retry);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("chuyển loading → ready trên cùng một cây: skeleton biến mất hoàn toàn (Req 14.6)", () => {
    const { container, rerender } = render(
      <ScreenStateView state="loading" loadingFallback={<GoalListSkeleton />} empty={<div>empty</div>}>
        <div data-testid="ready-content">Nội dung thật</div>
      </ScreenStateView>,
    );
    expect(container.querySelectorAll(SKELETON_SELECTOR).length).toBeGreaterThan(0);

    rerender(
      <ScreenStateView state="ready" loadingFallback={<GoalListSkeleton />} empty={<div>empty</div>}>
        <div data-testid="ready-content">Nội dung thật</div>
      </ScreenStateView>,
    );
    expect(container.querySelectorAll(SKELETON_SELECTOR)).toHaveLength(0);
    expect(screen.getByTestId("ready-content")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────
// 2) Hợp đồng no-overflow của skeleton ở Mobile 320–767px & Desktop ≥1024px
//    (Req 14.2, 14.3) — kiểm ở mức class do jsdom không có layout engine.
// ─────────────────────────────────────────────────────────────

describe("Skeleton overflow contract — Mobile 320–767px & Desktop ≥1024px (Req 14.2, 14.3)", () => {
  it.each(MOBILE_WIDTHS)("ở Mobile %ipx: container skeleton dùng min-w-0 (không ép tràn ngang)", (width) => {
    setViewport(width);
    const { container } = render(<GoalListSkeleton />);
    const root = container.querySelector('[role="status"]') as HTMLElement;
    expect(root).not.toBeNull();
    // Req 14.2: container cho phép co để không sinh cuộn ngang trên mobile.
    expect(root).toHaveClass("min-w-0");
  });

  it.each(
    DESKTOP_WIDTHS,
  )("ở Desktop %ipx: container skeleton giữ min-w-0, không phần tử có chiều rộng cố định", (width) => {
    setViewport(width);
    const { container } = render(<GoalListSkeleton />);
    const root = container.querySelector('[role="status"]') as HTMLElement;
    expect(root).toHaveClass("min-w-0");

    // Req 14.3: không phần tử skeleton nào dùng chiều rộng pixel cố định
    // (w-[NNNpx]) có thể tràn container; chỉ dùng utility co giãn (h-*, w-*, rounded-*).
    const skeletons = Array.from(container.querySelectorAll<HTMLElement>(SKELETON_SELECTOR));
    expect(skeletons.length).toBeGreaterThan(0);
    for (const node of skeletons) {
      expect(node.className).not.toMatch(/\bw-\[\d+px\]/);
    }
  });

  it("hợp đồng class của container skeleton bất biến giữa 320px và 1440px", () => {
    setViewport(320);
    const mobile = render(<GoalListSkeleton />);
    const mobileClass = mobile.container.querySelector('[role="status"]')?.className ?? "";
    mobile.unmount();

    setViewport(1440);
    const desktop = render(<GoalListSkeleton />);
    const desktopClass = desktop.container.querySelector('[role="status"]')?.className ?? "";

    expect(mobileClass).toBe(desktopClass);
    expect(mobileClass).toContain("min-w-0");
  });
});

// ─────────────────────────────────────────────────────────────
// 3) GoalListSkeleton ánh xạ 1:1 vùng nội dung: tiêu đề + list (Req 14.1)
// ─────────────────────────────────────────────────────────────

describe("GoalListSkeleton — ánh xạ 1:1 vùng nội dung (Req 14.1)", () => {
  it("có landmark trạng thái tải + đủ khối tiêu đề và khối list", () => {
    const { container } = render(<GoalListSkeleton />);

    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    // Nhãn ẩn cho screen reader mô tả nội dung sắp hiển thị.
    expect(within(status).getByText(/Đang tải danh sách mục tiêu/i)).toBeInTheDocument();

    // Vùng tiêu đề (3 khối) + vùng list (3 thẻ) = 6 khối ánh xạ 1:1.
    expect(container.querySelectorAll(SKELETON_SELECTOR)).toHaveLength(GOAL_SKELETON_BLOCK_COUNT);
  });
});

// ─────────────────────────────────────────────────────────────
// 4) ReflectionJournal — nhánh loading thật (userData chưa sẵn sàng) hiển thị
//    skeleton ánh xạ 1:1 vùng nội dung; khi dữ liệu sẵn sàng skeleton biến mất
//    hoàn toàn (Req 14.1, 14.6).
// ─────────────────────────────────────────────────────────────

function renderReflectionJournal() {
  const router = createMemoryRouter(
    [
      { path: "/journal", element: <ReflectionJournal /> },
      { path: "/onboarding", element: <div data-testid="onboarding-page">Onboarding page</div> },
    ],
    { initialEntries: ["/journal"] },
  );
  return { router, ui: render(<RouterProvider router={router} />) };
}

describe("ReflectionJournal — loading skeleton thật + thay thế khi ready (Req 14.1, 14.6)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("nhánh loading (userData chưa sẵn sàng) hiển thị skeleton ánh xạ vùng hero/thống kê/list, không màn hình trống (Req 14.1)", () => {
    reflectionDataMock.userData = null;
    const {
      ui: { container },
    } = renderReflectionJournal();

    // Landmark trạng thái tải với nhãn ẩn cho screen reader.
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-busy", "true");
    expect(within(status).getByText(/Đang tải nhật ký/i)).toBeInTheDocument();

    // Skeleton ánh xạ 1:1: hero (1) + thống kê (3) + list (5) = 9 khối placeholder.
    expect(container.querySelectorAll(SKELETON_SELECTOR)).toHaveLength(9);

    // Không phải màn hình trống: có khối placeholder thực sự.
    expect(container.querySelectorAll(SKELETON_SELECTOR).length).toBeGreaterThan(0);
  });

  it("container skeleton cấp trang dùng max-w + min-w an toàn overflow ở mobile và desktop (Req 14.2, 14.3)", () => {
    reflectionDataMock.userData = null;

    setViewport(320);
    const mobile = renderReflectionJournal();
    const mobileRoot = mobile.ui.container.querySelector('[role="status"]') as HTMLElement;
    // Container bị chặn chiều rộng (max-w-6xl) + padding responsive → không tràn ngang.
    expect(mobileRoot.className).toContain("max-w-6xl");
    expect(mobileRoot.className).toContain("px-4");
    const mobileClass = mobileRoot.className;
    mobile.ui.unmount();

    setViewport(1440);
    const desktop = renderReflectionJournal();
    const desktopRoot = desktop.ui.container.querySelector('[role="status"]') as HTMLElement;
    // Hợp đồng class bất biến giữa mobile và desktop.
    expect(desktopRoot.className).toBe(mobileClass);
  });

  it("khi dữ liệu sẵn sàng, skeleton cấp trang bị thay hoàn toàn bằng nội dung thật (Req 14.6)", async () => {
    // Dữ liệu hợp lệ nhưng chưa có reflection → màn hình rời trạng thái loading.
    const seeded = getUserData();
    saveUserData(seeded);
    reflectionDataMock.userData = seeded;

    renderReflectionJournal();

    // Nội dung thật xuất hiện (heading hai section của Reflection/Review).
    expect(await screen.findByRole("heading", { name: /Nhật ký phản tư/i })).toBeInTheDocument();

    // Không còn landmark skeleton "Đang tải nhật ký" nào.
    expect(screen.queryByText(/Đang tải nhật ký/i)).toBeNull();
  });
});
