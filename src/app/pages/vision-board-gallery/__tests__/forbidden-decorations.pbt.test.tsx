// Feature: library-page-ui-alignment, Property 1: Không tồn tại lớp trang trí ngoài hệ thống trong markup
//
// Validates: Requirements 1.2, 1.3, 1.4, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 7.3
//
// Với mọi userData hợp lệ (rỗng, một board, nhiều board với items đa dạng) và cho cả
// bốn nhánh render của Library_Page (grid gom nhóm theo năm, grid phẳng, list, loading
// skeleton), markup KHÔNG chứa bất kỳ pattern nào trong FORBIDDEN_DECORATION_PATTERNS:
// blur-[120px] (aurora orbs), perspective/translateZ/3D rotate, animate-pulse (loop),
// hover:scale-*/group-hover:scale-*, bg-clip-text/text-transparent, bg-gradient-to-*.

import { cleanup, fireEvent, render } from "@testing-library/react";
import fc from "fast-check";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { UserData, VisionBoard, VisionBoardItem, VisionBoardItemType } from "@/app/utils/storage";
import { findForbiddenDecorations } from "./decoration-registry";

// ─────────────────────────────────────────────────────────────────────────────
// Mocks: cấp userData sinh ngẫu nhiên qua useSyncedUserData, một user tuỳ biến qua
// useAuthContext, và vô hiệu hoá đường sync backend (hydrate/delete) để test thuần
// trình bày. react-router dùng MemoryRouter thật (useNavigate/useLocation hoạt động).
// ─────────────────────────────────────────────────────────────────────────────
const syncedDataMock = vi.hoisted(() => ({
  userData: null as UserData | null,
  reloadUserData: vi.fn(),
}));

const authContextMock = vi.hoisted(() => ({
  user: null as { uid: string } | null,
}));

vi.mock("@/app/hooks/useSyncedUserData", () => ({
  useSyncedUserData: () => syncedDataMock,
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: () => authContextMock,
}));

vi.mock("@/services/visionBoardService", () => ({
  getVisionBoards: vi.fn(() => Promise.resolve([])),
  deleteVisionBoard: vi.fn(() => Promise.resolve()),
}));

import { VisionBoardGallery } from "@/app/pages/VisionBoardGallery";

// ─────────────────────────────────────────────────────────────────────────────
// Generators (arbUserData): board với items image/quote/icon đa dạng, năm gây trùng
// nhóm, tên có/không khoảng trắng + unicode, createdAt ISO ngẫu nhiên — gồm cả rỗng.
// ─────────────────────────────────────────────────────────────────────────────
const ITEM_TYPES: readonly VisionBoardItemType[] = ["image", "quote", "icon"];

const arbItem: fc.Arbitrary<VisionBoardItem> = fc.record({
  id: fc.string({ minLength: 1 }),
  type: fc.constantFrom(...ITEM_TYPES),
  content: fc.oneof(
    fc.string(),
    fc.constantFrom(
      "https://example.com/photo.jpg",
      "Sparkles",
      "Heart",
      "Star",
      "Sống một cuộc đời rực rỡ",
    ),
  ),
  x: fc.integer({ min: 0, max: 1000 }),
  y: fc.integer({ min: 0, max: 1000 }),
  width: fc.integer({ min: 0, max: 500 }),
  height: fc.integer({ min: 0, max: 500 }),
});

const arbName: fc.Arbitrary<string> = fc.oneof(
  fc.string(),
  fc.constantFrom("Ước mơ 2025", "  Kế hoạch  ", "Dream Board", "café ☕ vision", ""),
);

const arbCreatedAt: fc.Arbitrary<string> = fc
  .date({
    min: new Date("2000-01-01T00:00:00.000Z"),
    max: new Date("2035-12-31T23:59:59.000Z"),
    noInvalidDate: true,
  })
  .map((d) => d.toISOString());

const arbBoard: fc.Arbitrary<VisionBoard> = fc.record({
  id: fc.string({ minLength: 1 }),
  name: arbName,
  year: fc.constantFrom("2023", "2024", "2025"),
  items: fc.array(arbItem, { maxLength: 6 }),
  createdAt: arbCreatedAt,
});

/** Board với id duy nhất để React key ổn định giữa các lần re-render. */
function withUniqueIds(boards: VisionBoard[]): VisionBoard[] {
  return boards.map((b, i) => ({ ...b, id: `${i}::${b.id}` }));
}

// Chỉ đọc userData.visionBoards trong component → cast tối giản là an toàn.
const arbUserData: fc.Arbitrary<UserData> = fc
  .array(arbBoard, { maxLength: 6 })
  .map((boards) => ({ visionBoards: withUniqueIds(boards) }) as unknown as UserData);

// ─────────────────────────────────────────────────────────────────────────────
function renderGallery() {
  return render(
    <MemoryRouter>
      <VisionBoardGallery />
    </MemoryRouter>,
  );
}

function expectClean(markup: string) {
  expect(findForbiddenDecorations(markup)).toEqual([]);
}

afterEach(() => {
  cleanup();
  syncedDataMock.userData = null;
  authContextMock.user = null;
  syncedDataMock.reloadUserData.mockClear();
  localStorage.clear();
});

describe("VisionBoardGallery — Property 1: không có lớp trang trí ngoài hệ thống", () => {
  it("không chứa lớp trang trí bị cấm ở cả 4 nhánh render với mọi userData", () => {
    fc.assert(
      fc.property(arbUserData, fc.boolean(), (userData, signedIn) => {
        authContextMock.user = signedIn ? { uid: "test-user" } : null;

        // ── Nhánh 1: grid gom nhóm theo năm (mặc định: grid + search "" + newest) ──
        syncedDataMock.userData = userData;
        const view = renderGallery();
        expectClean(view.container.innerHTML);

        // Toolbar chỉ xuất hiện khi có board → dùng nó để tới nhánh phẳng + list.
        const searchInput = view.container.querySelector<HTMLInputElement>(
          'input[aria-label="Tìm bảng tầm nhìn theo tên"]',
        );
        if (searchInput) {
          // ── Nhánh 2: grid phẳng (searchTerm " " → không gom nhóm, vẫn khớp mọi board) ──
          fireEvent.change(searchInput, { target: { value: " " } });
          expectClean(view.container.innerHTML);

          // ── Nhánh 3: list view ──
          const listToggle = view.container.querySelector<HTMLButtonElement>(
            'button[aria-label="Xem dạng danh sách"]',
          );
          if (listToggle) {
            fireEvent.click(listToggle);
            expectClean(view.container.innerHTML);
          }
        }
        view.unmount();

        // ── Nhánh 4: loading skeleton (userData chưa sẵn sàng) ──
        syncedDataMock.userData = null;
        const skeletonView = renderGallery();
        expectClean(skeletonView.container.innerHTML);
        skeletonView.unmount();
      }),
      { numRuns: 100 },
    );
  });
});
