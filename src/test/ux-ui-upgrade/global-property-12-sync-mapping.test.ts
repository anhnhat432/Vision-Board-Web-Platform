/**
 * Feature: global-ui-upgrade, Property 12
 *
 * Property-Based Test — Property 12: Ánh xạ trạng thái sync sang chỉ báo UI
 * phân biệt được (task 1.3).
 *
 * "For any trạng thái sync ∈ {synced, syncing, offline, error} cho người dùng
 *  real-mode đã đăng nhập, hệ thống render một chỉ báo trạng thái phân biệt được
 *  ứng với đúng trạng thái đó (ánh xạ đơn ánh state → biểu diễn UI)."
 *
 * Validates: Requirements 9.5
 *
 * Khác biệt với `property-6-sync-mapping.test.ts` (feature ux-ui-upgrade): test đó
 * kiểm đơn ánh THUẦN trên record `SYNC_STATE_TOKEN` (không render). Property 12 ở
 * đây RENDER chỉ báo thật qua badge harness (giống `sync-indicator.test.tsx`) rồi
 * đối chiếu "chữ ký hiển thị" (label + class màu) để chứng minh ánh xạ
 * state → biểu diễn UI là đơn ánh trên bề mặt DOM đã render. Hai test bổ sung cho
 * nhau: một ở tầng dữ liệu, một ở tầng render.
 *
 * Mô hình kiểm chứng:
 *   - Nguồn: helper thật `getSyncBadgeClass` / `getSyncBadgeLabel` / `toSyncState`
 *     export từ `@/features/plan12week/pages/12WeekSystem/helpers` — KHÔNG định
 *     nghĩa lại ánh xạ trong test để mọi thay đổi ngữ nghĩa đều bị phát hiện.
 *   - "Real-mode + signedIn" biểu diễn qua `signedIn: true` trong
 *     `BackendConnectionStatus`. Helper badge hiện tại không đọc `isRealMode()`
 *     hay `useAuth()` trực tiếp nên không cần mock thêm (đồng bộ lý do trong
 *     `sync-indicator.test.tsx`).
 *   - Mỗi `SyncState` gắn một `BackendConnectionStatus` đại diện; render badge và
 *     lấy chữ ký hiển thị = { label, className }.
 *
 * Bất biến (Requirement 9.5):
 *   1) Đơn ánh: hai state khác nhau ⇒ chữ ký hiển thị khác nhau (phân biệt được).
 *   2) Xác định: cùng state ⇒ cùng chữ ký (deterministic render).
 *   3) |ảnh| = 4: bốn state cho đúng bốn chữ ký hiển thị phân biệt.
 *
 * Generator: chọn cặp `SyncState` bất kỳ (`fc.constantFrom`), `numRuns: 100`.
 * Test không sửa product code; chỉ render và đọc DOM.
 */

import { createElement } from "react";
import { render } from "@testing-library/react";
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { BackendConnectionStatus } from "@/app/components/twelve-week/TwelveWeekSettingsShared";
import {
  SYNC_STATE_TOKEN,
  type SyncState,
  getSyncBadgeClass,
  getSyncBadgeLabel,
  toSyncState,
} from "@/features/plan12week/pages/12WeekSystem/helpers";

const PROPERTY_TAG =
  "Feature: global-ui-upgrade, Property 12: Ánh xạ trạng thái sync sang chỉ báo UI phân biệt được";

/** 4 giá trị Sync_State theo design (Section — Sync State Indicator). */
const SYNC_STATES: ReadonlyArray<SyncState> = ["synced", "syncing", "offline", "error"];

/** Lớp nền dùng chung của badge (đồng bộ với TwelveWeekDashboardHeader / sync-indicator harness). */
const BADGE_BASE_CLASS =
  "inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-medium border border-transparent";

function makeStatus(overrides: Partial<BackendConnectionStatus> = {}): BackendConnectionStatus {
  // real-mode signed-in baseline
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

/**
 * `BackendConnectionStatus` đại diện cho mỗi `SyncState`, phản ánh cách
 * `12WeekSystem` dựng status thật:
 *   - synced   → syncStatus "success"
 *   - syncing  → syncing true / syncStatus "syncing"
 *   - error    → syncStatus "error"
 *   - offline  → signedIn + idle (chưa có vòng đồng bộ hoàn tất/thất bại gần đây;
 *                cặp với OfflineBanner ở app shell) — biểu diễn badge trung tính.
 */
const STATE_STATUS: Record<SyncState, BackendConnectionStatus> = {
  synced: makeStatus({ syncStatus: "success", lastSyncedAt: "2026-05-08T00:00:00.000Z" }),
  syncing: makeStatus({ syncStatus: "syncing", syncing: true }),
  offline: makeStatus({ syncStatus: "idle", syncing: false, lastSyncedAt: null }),
  error: makeStatus({ syncStatus: "error", syncMessage: "fetch failed", failedSyncCount: 2 }),
};

/** `online` truyền vào `toSyncState` để tái tạo đúng state đích (offline ⇔ !online). */
const STATE_ONLINE: Record<SyncState, boolean> = {
  synced: true,
  syncing: true,
  offline: false,
  error: true,
};

/**
 * Render badge cho một `SyncState` và trả về "chữ ký hiển thị" = { label, className }.
 * Dùng `createElement` (không JSX) để file giữ đuôi `.ts` theo đặc tả task.
 */
function renderIndicatorSignature(state: SyncState): string {
  const status = STATE_STATUS[state];
  const { container, unmount } = render(
    createElement(
      "span",
      {
        "data-testid": "sync-badge",
        className: `${BADGE_BASE_CLASS} ${getSyncBadgeClass(status)}`,
      },
      getSyncBadgeLabel(status),
    ),
  );
  const badge = container.querySelector('[data-testid="sync-badge"]');
  if (!badge) throw new Error("Không render được badge chỉ báo sync");
  const signature = JSON.stringify({ label: badge.textContent ?? "", className: badge.className });
  unmount();
  return signature;
}

describe("Property 12 — Ánh xạ trạng thái sync sang chỉ báo UI phân biệt được (task 1.3)", () => {
  it("mỗi status đại diện rút gọn đúng về SyncState mục tiêu (sanity qua toSyncState)", () => {
    for (const state of SYNC_STATES) {
      expect(toSyncState(STATE_STATUS[state], STATE_ONLINE[state])).toBe(state);
    }
  });

  it("mỗi state render ra label non-empty (chỉ báo luôn hiển thị)", () => {
    for (const state of SYNC_STATES) {
      const status = STATE_STATUS[state];
      const label = getSyncBadgeLabel(status);
      expect(typeof label).toBe("string");
      expect(label.trim().length).toBeGreaterThan(0);
      // Class màu phải chứa token status/ink hợp lệ (không rỗng).
      expect(getSyncBadgeClass(status).trim().length).toBeGreaterThan(0);
    }
  });

  it("|ảnh của ánh xạ render| = 4 (bốn chỉ báo hiển thị phân biệt)", () => {
    const signatures = new Set(SYNC_STATES.map((state) => renderIndicatorSignature(state)));
    expect(signatures.size).toBe(4);
  });

  it("SYNC_STATE_TOKEN vẫn đơn ánh (bốn token màu phân biệt — bảo toàn ngữ nghĩa)", () => {
    expect(new Set(Object.keys(SYNC_STATE_TOKEN))).toEqual(new Set(SYNC_STATES));
    expect(new Set(Object.values(SYNC_STATE_TOKEN)).size).toBe(4);
  });

  it(PROPERTY_TAG, () => {
    fc.assert(
      fc.property(
        fc.constantFrom<SyncState>(...SYNC_STATES),
        fc.constantFrom<SyncState>(...SYNC_STATES),
        (a, b) => {
          const sigA = renderIndicatorSignature(a);
          const sigB = renderIndicatorSignature(b);
          if (a !== b) {
            // Đơn ánh (Req 9.5): state khác nhau ⇒ chỉ báo hiển thị phân biệt được.
            expect(sigA).not.toBe(sigB);
          } else {
            // Xác định: cùng state ⇒ cùng chỉ báo.
            expect(sigA).toBe(sigB);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
