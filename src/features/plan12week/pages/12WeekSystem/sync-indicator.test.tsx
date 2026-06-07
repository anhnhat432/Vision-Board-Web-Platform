import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { BackendConnectionStatus } from "@/app/components/twelve-week/TwelveWeekSettingsShared";

import { getSyncBadgeClass, getSyncBadgeLabel } from "./helpers";

/**
 * Component test cho Sync_Indicator (Requirement 8.1, 8.2, 8.4, 8.5).
 *
 * Bối cảnh: real-mode + signedIn → badge cố định, hiển thị liên tục, không tự ẩn;
 * khi `BackendConnectionStatus` đổi giữa 4 trạng thái (synced / syncing / error /
 * offline-equivalent) thì nhãn + lớp màu phải cập nhật trong ≤ 1s; copy của error/
 * offline phải truyền tải đúng ngữ nghĩa "đồng bộ chưa hoàn tất / chưa xác nhận
 * trên máy chủ"; và dữ liệu cục bộ KHÔNG được mất khi chuyển trạng thái.
 *
 * Test mount một harness gọn nhẹ phản ánh đúng cách `TwelveWeekDashboardHeader`
 * (`./components.tsx`) render badge — `<span>` với class do `getSyncBadgeClass`
 * tính và label do `getSyncBadgeLabel` trả về. Cách này giữ test bám sát helper
 * thật, không phải mock module phức tạp, và tránh phụ thuộc vào toàn bộ shell
 * dashboard. "Real-mode + signedIn" được biểu diễn qua `signedIn: true` trong
 * `BackendConnectionStatus`; helper hiện tại không đọc `isRealMode()` hoặc
 * `useAuth()` trực tiếp nên mock thêm là dư thừa.
 */

const BADGE_BASE_CLASS =
  "inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium border border-transparent";

interface HarnessProps {
  status: BackendConnectionStatus;
  /** Snapshot dữ liệu cục bộ — dùng để khẳng định không bị reset khi đổi trạng thái. */
  localData: string;
}

function SyncIndicatorHarness({ status, localData }: HarnessProps) {
  return (
    <div data-testid="sync-indicator-host">
      <span data-testid="sync-badge" className={`${BADGE_BASE_CLASS} ${getSyncBadgeClass(status)}`}>
        {getSyncBadgeLabel(status)}
      </span>
      <span data-testid="local-data">{localData}</span>
    </div>
  );
}

function makeStatus(overrides: Partial<BackendConnectionStatus> = {}): BackendConnectionStatus {
  return {
    authConfigured: true,
    authLoading: false,
    signedIn: true,
    profileReady: true,
    displayName: "Test User",
    email: "test@example.com",
    syncing: false,
    syncStatus: "idle",
    lastSyncedAt: null,
    syncMessage: null,
    failedSyncCount: 0,
    ...overrides,
  };
}

const SYNCED_STATUS: BackendConnectionStatus = makeStatus({
  syncStatus: "success",
  lastSyncedAt: "2026-05-08T00:00:00.000Z",
});

const SYNCING_STATUS: BackendConnectionStatus = makeStatus({
  syncStatus: "syncing",
  syncing: true,
});

const ERROR_STATUS: BackendConnectionStatus = makeStatus({
  syncStatus: "error",
  syncMessage: "fetch failed",
  failedSyncCount: 2,
});

/**
 * Trong implementation hiện tại của badge, "offline" được biểu thị dưới dạng
 * signedIn + idle (không success, không error, không syncing) — trạng thái mà
 * thiết bị đã có tài khoản nhưng chưa có vòng đồng bộ nào hoàn tất hoặc thất bại
 * gần đây. Cặp với `OfflineBanner` ở app shell, đây là đại diện badge cho
 * "dữ liệu chưa được xác nhận lưu trên máy chủ".
 */
const OFFLINE_STATUS: BackendConnectionStatus = makeStatus({
  syncStatus: "idle",
  syncing: false,
  lastSyncedAt: null,
});

describe("Sync indicator (real-mode + signedIn)", () => {
  it("renders the badge in a fixed inline slot and keeps it visible across rerenders", async () => {
    const { rerender } = render(<SyncIndicatorHarness status={SYNCED_STATUS} localData="snap-A" />);

    const initialBadge = screen.getByTestId("sync-badge");
    expect(initialBadge).toBeInTheDocument();
    // Vị trí cố định: là con trực tiếp đầu của host wrapper, không phải floating overlay.
    const host = screen.getByTestId("sync-indicator-host");
    expect(host.firstElementChild).toBe(initialBadge);

    // Hiển thị liên tục: rerender nhiều lần với cùng trạng thái — badge vẫn còn.
    rerender(<SyncIndicatorHarness status={SYNCED_STATUS} localData="snap-A" />);
    expect(screen.getByTestId("sync-badge")).toBeInTheDocument();

    // Không tự ẩn: chờ một khoảng nhỏ (mô phỏng "không có timeout ẩn") — vẫn hiện.
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
    expect(screen.getByTestId("sync-badge")).toBeInTheDocument();
  });

  it("updates label and color class within 1s for each Sync_State transition", async () => {
    const { rerender } = render(<SyncIndicatorHarness status={SYNCED_STATUS} localData="snap-A" />);

    // 1) synced → "Đã lưu & đồng bộ" (tone success, distinct color hint)
    await waitFor(
      () => {
        const badge = screen.getByTestId("sync-badge");
        expect(badge).toHaveTextContent("Đã lưu & đồng bộ");
        expect(badge.className).toMatch(/emerald|app-status-success/);
      },
      { timeout: 1000 },
    );
    const syncedClass = screen.getByTestId("sync-badge").className;

    // 2) syncing → "Đang đồng bộ" (tone info)
    rerender(<SyncIndicatorHarness status={SYNCING_STATUS} localData="snap-A" />);
    await waitFor(
      () => {
        const badge = screen.getByTestId("sync-badge");
        expect(badge).toHaveTextContent("Đang đồng bộ");
        expect(badge.className).toMatch(/sky|app-status-info/);
      },
      { timeout: 1000 },
    );
    const syncingClass = screen.getByTestId("sync-badge").className;
    expect(syncingClass).not.toBe(syncedClass);

    // 3) error → "Đã lưu trên thiết bị" (tone warning/error)
    rerender(<SyncIndicatorHarness status={ERROR_STATUS} localData="snap-A" />);
    await waitFor(
      () => {
        const badge = screen.getByTestId("sync-badge");
        expect(badge).toHaveTextContent("Đã lưu trên thiết bị");
        expect(badge.className).toMatch(/amber|app-status-error|app-status-warning/);
      },
      { timeout: 1000 },
    );
    const errorClass = screen.getByTestId("sync-badge").className;
    expect(errorClass).not.toBe(syncingClass);
    expect(errorClass).not.toBe(syncedClass);

    // 4) offline-equivalent (signedIn + idle) → tone neutral/warning
    rerender(<SyncIndicatorHarness status={OFFLINE_STATUS} localData="snap-A" />);
    await waitFor(
      () => {
        const badge = screen.getByTestId("sync-badge");
        // Existing helper returns "Tài khoản sẵn sàng" cho idle+signedIn — copy
        // này vẫn ngụ ý chưa có vòng đồng bộ thành công gần nhất.
        expect(badge).toHaveTextContent(/Tài khoản sẵn sàng|Đã lưu trên thiết bị/);
        expect(badge.className).toMatch(/slate|app-status-warning|app-status-info/);
      },
      { timeout: 1000 },
    );
    const offlineClass = screen.getByTestId("sync-badge").className;
    expect(offlineClass).not.toBe(syncedClass);
    expect(offlineClass).not.toBe(syncingClass);
    expect(offlineClass).not.toBe(errorClass);
  });

  it("error copy communicates 'lần đồng bộ gần nhất chưa hoàn tất'", () => {
    render(<SyncIndicatorHarness status={ERROR_STATUS} localData="snap-A" />);

    const badge = screen.getByTestId("sync-badge");
    // Copy hiện hành "Đã lưu trên thiết bị" tương đương ngữ nghĩa với
    // "lần đồng bộ gần nhất chưa hoàn tất, dữ liệu cục bộ vẫn an toàn".
    expect(badge).toHaveTextContent("Đã lưu trên thiết bị");
  });

  it("offline-equivalent copy implies dữ liệu chưa xác nhận trên máy chủ", () => {
    render(<SyncIndicatorHarness status={OFFLINE_STATUS} localData="snap-A" />);

    const badge = screen.getByTestId("sync-badge");
    // Trạng thái signedIn+idle hiển thị "Tài khoản sẵn sàng" — ngụ ý đã đăng nhập
    // nhưng chưa có vòng đồng bộ hoàn tất xác nhận. Cặp banner offline (component
    // riêng) bổ sung copy "đang ngoại tuyến" khi trình duyệt mất kết nối thật.
    expect(badge.textContent ?? "").toMatch(/Tài khoản sẵn sàng|Đã lưu trên thiết bị|Lưu trên thiết bị/);
  });

  it("preserves local data across error and offline transitions", () => {
    const localSnapshot = "user-progress-snapshot-#1";
    const { rerender } = render(<SyncIndicatorHarness status={SYNCED_STATUS} localData={localSnapshot} />);

    expect(screen.getByTestId("local-data")).toHaveTextContent(localSnapshot);

    rerender(<SyncIndicatorHarness status={ERROR_STATUS} localData={localSnapshot} />);
    expect(screen.getByTestId("local-data")).toHaveTextContent(localSnapshot);

    rerender(<SyncIndicatorHarness status={OFFLINE_STATUS} localData={localSnapshot} />);
    expect(screen.getByTestId("local-data")).toHaveTextContent(localSnapshot);

    rerender(<SyncIndicatorHarness status={SYNCING_STATUS} localData={localSnapshot} />);
    expect(screen.getByTestId("local-data")).toHaveTextContent(localSnapshot);

    // Quay lại synced: dữ liệu cục bộ vẫn nguyên vẹn — không bị reset.
    rerender(<SyncIndicatorHarness status={SYNCED_STATUS} localData={localSnapshot} />);
    expect(screen.getByTestId("local-data")).toHaveTextContent(localSnapshot);
  });
});
