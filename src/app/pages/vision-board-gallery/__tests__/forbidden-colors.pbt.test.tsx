// Feature: library-page-ui-alignment, Property 2: Mọi màu đều thuộc tập token Design_System
//
// Validates: Requirements 4.2, 5.1, 5.3, 5.4, 5.5, 8.1, 8.2, 8.5
//
// Với mọi userData hợp lệ (rỗng, một board, nhiều board với items đa dạng) và cho
// cả bốn nhánh render của Library_Page (grid gom nhóm theo năm, grid phẳng, list,
// loading skeleton), markup KHÔNG chứa bất kỳ pattern nào trong
// FORBIDDEN_COLOR_PATTERNS: màu Tailwind theo bảng số ngoài token, hex literal
// trong className, và bg/text/border-white|black không có biến thể chế độ.
//
// ─────────────────────────────────────────────────────────────────────────────
// GHI CHÚ CHỐNG DƯƠNG TÍNH GIẢ (đọc trước khi sửa)
// ─────────────────────────────────────────────────────────────────────────────
// FORBIDDEN_COLOR_PATTERNS nhắm vào MÀU trong thuộc tính class (Tailwind utility)
// — ví dụ `text-white`, `bg-blue-500`, `border-[#aabbcc]`. Nếu quét toàn bộ
// `container.innerHTML` thì sẽ bắt nhầm:
//   - hex trong SVG trang trí (VisionMapIllustration: fill="#ffffff", stop-color
//     "#2F5D50"...), vốn là `aria-hidden` illustration hợp lệ;
//   - CSS custom properties trong inline style / arbitrary value
//     (`bg-[radial-gradient(var(--app-line)...)]`, `bg-[color:var(--color-*)]`).
// Vì vậy test này CHỈ quét giá trị thuộc tính `class` của mọi phần tử render, và
// loại bỏ token hợp lệ của Design_System (`--r-*`, `--chart-*`, `app-*`) TRƯỚC khi
// so khớp — đúng như allowlist mà decoration-registry dùng (Property 1/8).

import fc from "fast-check";
import { fireEvent, render } from "@testing-library/react";
import { RouterProvider, createMemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { UserData, VisionBoard, VisionBoardItem, VisionBoardItemType } from "@/app/utils/storage";
import { FORBIDDEN_COLOR_PATTERNS } from "./decoration-registry";

// ─────────────────────────────────────────────────────────────
// Mock ranh giới: cung cấp userData sinh ngẫu nhiên qua hook, giữ auth ở trạng
// thái chưa đăng nhập để không kích hoạt hydrate backend (giữ test tất định).
// ─────────────────────────────────────────────────────────────
const galleryDataMock = vi.hoisted(() => ({
  userData: null as UserData | null,
  reloadUserData: vi.fn(),
}));

vi.mock("@/app/hooks/useSyncedUserData", () => ({
  useSyncedUserData: () => galleryDataMock,
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: () => ({ user: null }),
}));

// Import sau khi khai báo mock để component dùng hook đã mock.
import { VisionBoardGallery } from "@/app/pages/VisionBoardGallery";

// ─────────────────────────────────────────────────────────────
// Allowlist token hợp lệ — loại khỏi chuỗi class trước khi quét màu bị cấm.
// (Giữ đồng bộ với decoration-registry.ts để tránh dương tính giả.)
// ─────────────────────────────────────────────────────────────
const ALLOWED_TOKEN_PATTERNS: readonly RegExp[] = [
  /--r-[a-z0-9-]+/gi, // radius custom properties: --r-input, --r-soft, --r-pill...
  /--chart-\d+/gi, // chart color tokens: --chart-1..--chart-5
  /\bapp-[a-z0-9-]+/gi, // app-* design tokens: app-accent, app-line, app-status-*...
];

function stripAllowedTokens(text: string): string {
  return ALLOWED_TOKEN_PATTERNS.reduce((acc, pattern) => acc.replace(pattern, " "), text);
}

function toGlobal(pattern: RegExp): RegExp {
  return pattern.global ? pattern : new RegExp(pattern.source, `${pattern.flags}g`);
}

/** Pattern white/black được áp dụng có điều kiện (xem ngoại lệ Req 8.5 bên dưới). */
function isWhiteOrBlackPattern(pattern: RegExp): boolean {
  return /white|black/.test(pattern.source);
}

// ─────────────────────────────────────────────────────────────
// Ngoại lệ Req 8.5: white/black được coi là hợp lệ KHI nó là màu chữ trên một
// BỀ MẶT token của Design_System (accent/warm/status/destructive/danger). Đây là
// cặp tương phản do Design_System quy định — chính là on-accent foreground mà các
// component dùng chung (`Button`/`Badge` variant `default`) đã chốt và được khóa
// bởi test `button-badge-variants.test.tsx`. Ta KHÔNG đổi component dùng chung
// (ngoài phạm vi Shell/side-surface), nên loại white/black-trên-nền-token khỏi
// tập vi phạm. Hex literal và màu palette Tailwind vẫn bị cấm tuyệt đối.
// ─────────────────────────────────────────────────────────────
function hasDesignSystemColorSurface(rawClass: string): boolean {
  return (
    /\bbg-app-[a-z0-9-]+/.test(rawClass) || // bg-app-accent / bg-app-warm / bg-app-status-*
    /\bbg-destructive\b/.test(rawClass) ||
    /\bbg-primary\b/.test(rawClass) ||
    /\bbg-\[color:var\(--[a-z0-9-]+\)\]/.test(rawClass) // bg-[color:var(--color-danger-fg)]
  );
}

/**
 * Quét mọi phần tử render, trả về danh sách màu bị cấm trong thuộc tính `class`.
 * - Màu palette Tailwind + hex literal: cấm tuyệt đối trên mọi phần tử.
 * - white/black: chỉ vi phạm khi phần tử KHÔNG kèm bề mặt token Design_System.
 */
function findForbiddenColors(container: HTMLElement): string[] {
  const matches: string[] = [];
  for (const el of Array.from(container.querySelectorAll<HTMLElement>("*"))) {
    const raw = el.getAttribute("class");
    if (!raw) continue;

    const onTokenSurface = hasDesignSystemColorSurface(raw);
    const sanitized = stripAllowedTokens(raw);

    for (const pattern of FORBIDDEN_COLOR_PATTERNS) {
      if (isWhiteOrBlackPattern(pattern) && onTokenSurface) continue;
      const found = sanitized.match(toGlobal(pattern));
      if (found) matches.push(...found);
    }
  }
  return matches;
}

// ─────────────────────────────────────────────────────────────
// Generators (arbUserData): board với name/year/items đa dạng.
// ─────────────────────────────────────────────────────────────
const YEARS = ["2023", "2024", "2025", "2026"] as const;

const ITEM_TYPES: readonly VisionBoardItemType[] = ["image", "quote", "icon", "goal_card", "sticker"];

// content cho image dùng URL hợp lệ để ImageWithFallback render <img>; loại khác
// dùng chuỗi bất kỳ (gồm unicode) để bao phủ collage/quote/icon.
const arbItem: fc.Arbitrary<VisionBoardItem> = fc
  .record({
    id: fc.string({ minLength: 1 }),
    type: fc.constantFrom(...ITEM_TYPES),
    content: fc.oneof(
      fc.string(),
      fc.constantFrom("https://example.test/a.png", "Sparkles", "Trophy", "Ước mơ lớn ☕", ""),
    ),
    x: fc.integer(),
    y: fc.integer(),
    width: fc.integer({ min: 0, max: 800 }),
    height: fc.integer({ min: 0, max: 800 }),
  })
  .map((item) => item as VisionBoardItem);

const arbName: fc.Arbitrary<string> = fc.oneof(
  fc.string(),
  fc.constantFrom("Ước mơ 2025", "  Kế hoạch  ", "Dream Board", "café ☕ vision", "", "vision"),
);

const arbBoard: fc.Arbitrary<VisionBoard> = fc
  .record({
    id: fc.string({ minLength: 1 }),
    name: arbName,
    year: fc.constantFrom(...YEARS),
    items: fc.array(arbItem, { maxLength: 5 }),
    createdAt: fc
      .date({ min: new Date("2010-01-01T00:00:00.000Z"), max: new Date("2030-12-31T23:59:59.000Z"), noInvalidDate: true })
      .map((d) => d.toISOString()),
  })
  .map((board) => board as VisionBoard);

const arbBoards: fc.Arbitrary<VisionBoard[]> = fc
  .array(arbBoard, { maxLength: 6 })
  .map((boards) => boards.map((b, i) => ({ ...b, id: `${i}::${b.id}` })));

// Bốn nhánh render của Library_Page.
type Branch = "skeleton" | "gridGrouped" | "gridFlat" | "list";
const BRANCHES: readonly Branch[] = ["skeleton", "gridGrouped", "gridFlat", "list"];

// Base UserData tối thiểu — component chỉ đọc `visionBoards`. Các trường khác được
// cast an toàn vì không ảnh hưởng nhánh render của Property 2.
const BASE_USER_DATA = { visionBoards: [] as VisionBoard[] } as unknown as UserData;

function renderBranch(branch: Branch, boards: VisionBoard[]) {
  galleryDataMock.userData = branch === "skeleton" ? null : ({ ...BASE_USER_DATA, visionBoards: boards } as UserData);

  const router = createMemoryRouter(
    [
      { path: "/gallery", element: <VisionBoardGallery /> },
      { path: "/vision-board", element: <div>editor</div> },
      { path: "/", element: <div>home</div> },
    ],
    { initialEntries: ["/gallery"] },
  );

  const utils = render(<RouterProvider router={router} />);
  const { container } = utils;

  // Đưa về đúng nhánh yêu cầu (chỉ khi có toolbar, tức boards > 0).
  if (branch === "gridFlat") {
    const sortSelect = container.querySelector<HTMLSelectElement>('select[aria-label="Sắp xếp danh sách bảng"]');
    if (sortSelect) fireEvent.change(sortSelect, { target: { value: "name" } });
  } else if (branch === "list") {
    const listToggle = container.querySelector<HTMLButtonElement>('button[aria-label="Xem dạng danh sách"]');
    if (listToggle) fireEvent.click(listToggle);
  }

  return utils;
}

afterEach(() => {
  galleryDataMock.userData = null;
  galleryDataMock.reloadUserData.mockClear();
});

describe("VisionBoardGallery — Property 2: mọi màu thuộc tập token Design_System", () => {
  it("markup không dùng màu ngoài token cho cả bốn nhánh render", () => {
    fc.assert(
      fc.property(fc.constantFrom(...BRANCHES), arbBoards, (branch, boards) => {
        const { container, unmount } = renderBranch(branch, boards);
        try {
          const forbidden = findForbiddenColors(container);
          expect(forbidden).toEqual([]);
        } finally {
          unmount();
        }
      }),
      { numRuns: 100 },
    );
  }, 60000);
});
