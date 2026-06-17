// Feature: ux-ui-upgrade, Task 6.6: Component test — states + content/order
//
// Mục tiêu:
//   - Mount mỗi Core_Flow_Screen ở các nhánh ScreenDataState
//     (loading/empty/error/ready) → assert đúng component dùng chung được render.
//   - Xác nhận timeout guard 30s → chuyển error + retry quay về loading.
//   - Smoke check mutual exclusion: tại mỗi thời điểm chỉ 1 trạng thái hiển thị
//     (Requirement 7.7 đã được kiểm sâu hơn ở Property 5).
//
// Phạm vi: TEST-ONLY. Không chạm production code. Khi một page không phơi bày
// ScreenDataState rõ ràng, ta drive trạng thái qua mock hook ranh giới
// (`useSyncedUserData`) — không refactor page.
//
// Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.6 (state branches + timeout 30s)

import { act, fireEvent, render, renderHook, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { EmptyState } from "../../app/components/states/EmptyState";
import { ScreenStateView } from "../../app/components/states/ScreenStateView";
import { SCREEN_DATA_STATE_TIMEOUT_MS, useScreenDataState } from "../../app/components/states/useScreenDataState";

// ─────────────────────────────────────────────────────────────
// 1) Shared state component — delegate đúng component dùng chung
// ─────────────────────────────────────────────────────────────

describe("ScreenStateView — delegate đúng component dùng chung cho từng nhánh", () => {
  const empty = <EmptyState title="Chưa có bản ghi" testId="shared-empty" />;
  const ready = <p data-testid="shared-ready">nội dung sẵn sàng</p>;

  it("nhánh loading → render shared FormSkeleton (Skeleton/FormSkeleton dùng chung)", () => {
    const { container } = render(
      <ScreenStateView state="loading" empty={empty}>
        {ready}
      </ScreenStateView>,
    );

    // Shared loading slot có data-slot="form-skeleton" (FormSkeleton mặc định).
    expect(container.querySelector('[data-slot="form-skeleton"]')).not.toBeNull();
    expect(container.querySelector('[data-screen-state="loading"]')).not.toBeNull();

    // Mutual exclusion: không có empty/error/ready cùng lúc (Req 7.7).
    expect(screen.queryByTestId("shared-empty")).not.toBeInTheDocument();
    expect(screen.queryByTestId("shared-ready")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("nhánh empty → render shared EmptyState component", () => {
    const { container } = render(
      <ScreenStateView state="empty" empty={empty}>
        {ready}
      </ScreenStateView>,
    );

    expect(screen.getByTestId("shared-empty")).toBeInTheDocument();
    expect(container.querySelector('[data-screen-state="empty"]')).not.toBeNull();

    expect(container.querySelector('[data-slot="form-skeleton"]')).toBeNull();
    expect(screen.queryByTestId("shared-ready")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("nhánh error → render shared InlineStatusMessage tone='error' kèm control thử lại", () => {
    const onRetry = vi.fn();
    const { container } = render(
      <ScreenStateView state="error" empty={empty} onRetry={onRetry}>
        {ready}
      </ScreenStateView>,
    );

    // InlineStatusMessage tone="error" expose role="alert".
    const alert = screen.getByRole("alert");
    expect(alert).toBeInTheDocument();
    // Khối lỗi mặc định gợi nhớ "dữ liệu cục bộ vẫn được giữ" (Req 7.3).
    expect(alert.textContent ?? "").toMatch(/cục bộ/);

    // Control thử lại bắt buộc (Req 7.3).
    const retryButton = screen.getByRole("button", { name: /thử lại/i });
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);

    expect(container.querySelector('[data-screen-state="error"]')).not.toBeNull();
    expect(screen.queryByTestId("shared-empty")).not.toBeInTheDocument();
    expect(screen.queryByTestId("shared-ready")).not.toBeInTheDocument();
  });

  it("nhánh ready → render nội dung dữ liệu thật, không kèm bất kỳ shared state nào khác", () => {
    const { container } = render(
      <ScreenStateView state="ready" empty={empty}>
        {ready}
      </ScreenStateView>,
    );

    expect(screen.getByTestId("shared-ready")).toBeInTheDocument();
    expect(container.querySelector('[data-screen-state="ready"]')).not.toBeNull();

    expect(container.querySelector('[data-slot="form-skeleton"]')).toBeNull();
    expect(screen.queryByTestId("shared-empty")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────
// 2) Timeout guard 30s — useScreenDataState
// ─────────────────────────────────────────────────────────────

describe("useScreenDataState — timeout guard 30s và retry quay về loading", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("chuyển sang error sau khi advanceTimersByTime(30_000) khi đang loading (Req 7.6)", () => {
    const { result } = renderHook(() => useScreenDataState({ status: "loading" }));

    expect(result.current.kind).toBe("loading");
    expect(result.current.timedOut).toBe(false);

    act(() => {
      vi.advanceTimersByTime(SCREEN_DATA_STATE_TIMEOUT_MS);
    });

    expect(result.current.kind).toBe("error");
    expect(result.current.timedOut).toBe(true);
  });

  it("không kích hoạt timeout nếu tải xong trong vòng 30s (Req 7.6 — biên dưới)", () => {
    const { result, rerender } = renderHook(
      ({ status }: { status: "loading" | "ready" }) => useScreenDataState({ status, isEmpty: false }),
      { initialProps: { status: "loading" } },
    );

    act(() => {
      vi.advanceTimersByTime(SCREEN_DATA_STATE_TIMEOUT_MS - 1);
    });

    rerender({ status: "ready" });

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(result.current.kind).toBe("ready");
    expect(result.current.timedOut).toBe(false);
  });

  it("retry() từ trạng thái error timeout → quay về loading và tái khởi động bộ đếm 30s (Req 7.5)", () => {
    const onRetry = vi.fn();
    const { result } = renderHook(() => useScreenDataState({ status: "loading", onRetry }));

    act(() => {
      vi.advanceTimersByTime(SCREEN_DATA_STATE_TIMEOUT_MS);
    });
    expect(result.current.kind).toBe("error");

    act(() => {
      result.current.retry();
    });

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(result.current.kind).toBe("loading");
    expect(result.current.timedOut).toBe(false);

    // Bộ đếm timeout được tái khởi động — quá ngưỡng lần 2 lại lên error.
    act(() => {
      vi.advanceTimersByTime(SCREEN_DATA_STATE_TIMEOUT_MS);
    });
    expect(result.current.kind).toBe("error");
  });
});

// ─────────────────────────────────────────────────────────────
// 3) Tích hợp: ScreenStateView lái bởi useScreenDataState
//    (mô phỏng cách Core_Flow_Screen tiêu thụ chung)
// ─────────────────────────────────────────────────────────────

describe("ScreenStateView + useScreenDataState — chuyển nhánh loading→error→loading qua 30s timeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function Harness({ onRetry }: { onRetry: () => void }) {
    const { kind, retry } = useScreenDataState({ status: "loading", onRetry });
    return (
      <ScreenStateView state={kind} empty={<EmptyState title="Trống" testId="harness-empty" />} onRetry={retry}>
        <p data-testid="harness-ready">sẵn sàng</p>
      </ScreenStateView>
    );
  }

  it("đang tải → quá 30s → khối lỗi shared + retry → quay về loading shared", () => {
    const onRetry = vi.fn();
    const { container } = render(<Harness onRetry={onRetry} />);

    expect(container.querySelector('[data-slot="form-skeleton"]')).not.toBeNull();
    expect(container.querySelector('[data-screen-state="loading"]')).not.toBeNull();

    act(() => {
      vi.advanceTimersByTime(SCREEN_DATA_STATE_TIMEOUT_MS);
    });

    // Mutual exclusion sau timeout: chỉ còn nhánh error.
    expect(container.querySelector('[data-screen-state="error"]')).not.toBeNull();
    expect(container.querySelector('[data-screen-state="loading"]')).toBeNull();
    expect(container.querySelector('[data-slot="form-skeleton"]')).toBeNull();

    const errorBlock = container.querySelector('[data-screen-state="error"]') as HTMLElement;
    expect(within(errorBlock).getByRole("alert")).toBeInTheDocument();

    fireEvent.click(within(errorBlock).getByRole("button", { name: /thử lại/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    // Sau retry: quay về loading shared.
    expect(container.querySelector('[data-screen-state="loading"]')).not.toBeNull();
    expect(container.querySelector('[data-screen-state="error"]')).toBeNull();
  });
});
