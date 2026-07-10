// Feature: library-page-ui-alignment, Property 4: Đúng một tiêu đề cấp trang và cấu trúc heading hợp lệ
//
// Validates: Requirements 4.4
//
// Với mọi userData hợp lệ, Library_Page (`VisionBoardGallery`) render ĐÚNG MỘT
// phần tử `h1` (nằm trong hero PageHero), và mọi heading còn lại có cấp ≥ 2
// (không bỏ cấp gây cấu trúc không hợp lệ). Hero (PageHero) render `h1`; các
// section gom nhóm theo năm render `<h2>`; CardTitle render `h3`.
//
// GHI CHÚ: PageHero (src/app/components/layout/PageHero.tsx) render tiêu đề với
// `titleAs = 1` mặc định → đúng một `h1`. Component `VisionBoardGallery` dùng
// PageHero không truyền `titleAs` nên giữ `h1`. Đây là nguồn `h1` DUY NHẤT của trang.

import { cleanup, render } from "@testing-library/react";
import fc from "fast-check";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMemoryRouter, RouterProvider } from "react-router";

import type { UserData } from "@/app/utils/storage";
import type { VisionBoard, VisionBoardItem, VisionBoardItemType } from "@/app/utils/storage";

// ─────────────────────────────────────────────────────────────
// Mock ranh giới dữ liệu/nguồn ngoài để lái Library_Page vào nhánh "ready" với
// userData sinh ngẫu nhiên. Holder hoisted cho phép mỗi iteration set userData.
// ─────────────────────────────────────────────────────────────
const galleryDataMock = vi.hoisted(() => ({
  userData: null as UserData | null,
  reloadUserData: vi.fn(),
}));

vi.mock("@/app/hooks/useSyncedUserData", () => ({
  useSyncedUserData: () => galleryDataMock,
}));

// user = null → không chạy hydrate backend (backendGetVisionBoards không được gọi).
vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: () => ({ user: null }),
}));

// Import sau khi khai báo mock để component dùng hook/context đã mock.
import { VisionBoardGallery } from "@/app/pages/VisionBoardGallery";

// ─────────────────────────────────────────────────────────────
// Generator: arbUserData (chỉ trường được đọc: visionBoards). Các trường còn lại
// không được Library_Page đọc trong nhánh render này, nên minimal shape là đủ.
// ─────────────────────────────────────────────────────────────

const YEARS = ["2023", "2024", "2025", "2026"] as const;
const ITEM_TYPES: readonly VisionBoardItemType[] = ["image", "quote", "icon"];

const arbItem: fc.Arbitrary<VisionBoardItem> = fc.record({
  id: fc.string(),
  type: fc.constantFrom(...ITEM_TYPES),
  content: fc.string(),
  x: fc.integer(),
  y: fc.integer(),
  width: fc.integer({ min: 0, max: 1000 }),
  height: fc.integer({ min: 0, max: 1000 }),
});

const arbName: fc.Arbitrary<string> = fc.oneof(
  fc.string(),
  fc.constantFrom("Ước mơ 2025", "  Kế hoạch  ", "Dream Board", "café ☕ vision", "DREAM board", "vision"),
);

const arbCreatedAt: fc.Arbitrary<string> = fc
  .date({
    min: new Date("2000-01-01T00:00:00.000Z"),
    max: new Date("2035-12-31T23:59:59.000Z"),
    noInvalidDate: true,
  })
  .map((d) => d.toISOString());

const arbVisionBoard: fc.Arbitrary<VisionBoard> = fc
  .record({
    id: fc.string(),
    name: arbName,
    year: fc.constantFrom(...YEARS),
    items: fc.array(arbItem, { maxLength: 6 }),
    createdAt: arbCreatedAt,
  })
  // Bảo đảm id item duy nhất trong một board để tránh cảnh báo React "duplicate key"
  // do generator có thể sinh chuỗi rỗng trùng nhau (không ảnh hưởng property).
  .map((board) => ({
    ...board,
    items: board.items.map((item, i) => ({ ...item, id: `${i}::${item.id}` })),
  }));

// minLength: 1 để bảo đảm có ít nhất một board → view mặc định (grid + không
// search + newest = grouped) render ít nhất một section năm với `<h2>`, khiến
// property kiểm chứng cấu trúc heading nhiều cấp có ý nghĩa.
const arbBoards: fc.Arbitrary<VisionBoard[]> = fc
  .array(arbVisionBoard, { minLength: 1, maxLength: 10 })
  .map((boards) => boards.map((b, i) => ({ ...b, id: `${i}::${b.id}` })));

const arbUserData: fc.Arbitrary<UserData> = arbBoards.map(
  (visionBoards) => ({ visionBoards } as unknown as UserData),
);

function renderGallery(userData: UserData) {
  galleryDataMock.userData = userData;
  const router = createMemoryRouter(
    [
      { path: "/gallery", element: <VisionBoardGallery /> },
      { path: "/vision-board", element: <div>vision board editor</div> },
      { path: "/", element: <div>home</div> },
    ],
    { initialEntries: ["/gallery"] },
  );
  return render(<RouterProvider router={router} />);
}

afterEach(() => {
  cleanup();
  galleryDataMock.userData = null;
  galleryDataMock.reloadUserData.mockClear();
});

describe("VisionBoardGallery — Property 4: cấu trúc heading hợp lệ", () => {
  it("render đúng một h1 (hero) và mọi heading còn lại cấp ≥ 2", () => {
    fc.assert(
      fc.property(arbUserData, (userData) => {
        const { container, unmount } = renderGallery(userData);
        try {
          const headings = Array.from(
            container.querySelectorAll<HTMLElement>("h1,h2,h3,h4,h5,h6"),
          );

          // Có ít nhất một heading (hero h1 luôn tồn tại).
          expect(headings.length).toBeGreaterThan(0);

          const levels = headings.map((el) => Number.parseInt(el.tagName.slice(1), 10));
          const h1Count = levels.filter((lvl) => lvl === 1).length;

          // (a) ĐÚNG MỘT h1 (tiêu đề cấp trang trong hero).
          expect(h1Count).toBe(1);

          // (b) Mọi heading còn lại có cấp ≥ 2 (không có h1 nào khác ngoài hero).
          const nonH1Levels = levels.filter((_, idx) => levels[idx] !== 1);
          for (const lvl of nonH1Levels) {
            expect(lvl).toBeGreaterThanOrEqual(2);
          }
        } finally {
          unmount();
        }
      }),
      { numRuns: 100 },
    );
  });
});
