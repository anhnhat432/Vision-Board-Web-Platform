// Feature: library-page-ui-alignment, Property 3: Container trang là Standard_Page_Container hợp lệ
//
// Validates: Requirements 1.1, 1.6
//
// Với mọi userData hợp lệ, container gốc của Library_Page (VisionBoardGallery)
// chứa đồng thời lớp căn giữa `mx-auto max-w-6xl` và đủ ba lớp padding responsive
// `px-4`, `sm:px-6`, `lg:px-8` (kèm `pb-12 pt-8`), và KHÔNG phải là một phần tử
// bọc gradient/orbs (không chứa `bg-gradient*` hay `blur-[120px]`).

import { cleanup, render } from "@testing-library/react";
import fc from "fast-check";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  UserData,
  VisionBoard,
  VisionBoardItem,
  VisionBoardItemType,
} from "@/app/utils/storage";
import { getUserData } from "@/app/utils/storage";

// --- Mock ranh giới hook/dịch vụ (theo pattern các render test gallery/settings) ---

const syncedUserDataMock = vi.hoisted(() => ({
  useSyncedUserData: vi.fn(),
  reloadUserData: vi.fn(),
}));

vi.mock("@/app/hooks/useSyncedUserData", () => ({
  useSyncedUserData: syncedUserDataMock.useSyncedUserData,
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: () => ({ user: null }),
}));

vi.mock("@/services/visionBoardService", () => ({
  getVisionBoards: vi.fn().mockResolvedValue([]),
  deleteVisionBoard: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/api/visionBoardLinkStore", () => ({
  getBackendVisionBoardId: () => null,
  getLocalVisionBoardId: () => null,
  saveVisionBoardLink: vi.fn(),
}));

vi.mock("@/app/components/ScreenGuide", () => ({
  ScreenGuide: () => null,
}));

import { VisionBoardGallery } from "@/app/pages/VisionBoardGallery";

// --- Generator: arbUserData sinh userData hợp lệ với danh sách board đa dạng ---

const YEARS = ["2023", "2024", "2025", "2026"] as const;

const ITEM_TYPES: readonly VisionBoardItemType[] = ["image", "quote", "icon"];

const arbItem: fc.Arbitrary<VisionBoardItem> = fc.record({
  id: fc.string({ minLength: 1 }),
  type: fc.constantFrom(...ITEM_TYPES),
  content: fc.string(),
  x: fc.integer(),
  y: fc.integer(),
  width: fc.integer({ min: 0, max: 1000 }),
  height: fc.integer({ min: 0, max: 1000 }),
});

const arbName: fc.Arbitrary<string> = fc.oneof(
  fc.string(),
  fc.constantFrom("Ước mơ 2025", "  Kế hoạch  ", "Dream Board", "vision", ""),
);

const arbCreatedAt: fc.Arbitrary<string> = fc
  .date({
    min: new Date("2000-01-01T00:00:00.000Z"),
    max: new Date("2035-12-31T23:59:59.000Z"),
    noInvalidDate: true,
  })
  .map((d) => d.toISOString());

const arbVisionBoard: fc.Arbitrary<VisionBoard> = fc.record({
  id: fc.string({ minLength: 1 }),
  name: arbName,
  year: fc.constantFrom(...YEARS),
  items: fc.array(arbItem, { maxLength: 6 }),
  createdAt: arbCreatedAt,
});

// Bao gồm cả thư viện rỗng và nhiều board (id duy nhất để tránh trùng key React).
const arbBoards: fc.Arbitrary<VisionBoard[]> = fc
  .array(arbVisionBoard, { maxLength: 6 })
  .map((boards) => boards.map((b, i) => ({ ...b, id: `${i}::${b.id}` })));

// Base UserData hợp lệ (mọi trường bắt buộc) — chỉ ghi đè visionBoards ngẫu nhiên.
const baseUserData: UserData = getUserData();

const arbUserData: fc.Arbitrary<UserData> = arbBoards.map((visionBoards) => ({
  ...baseUserData,
  visionBoards,
}));

// Lớp padding + căn giữa bắt buộc của Standard_Page_Container.
const REQUIRED_CONTAINER_CLASSES = [
  "mx-auto",
  "max-w-6xl",
  "px-4",
  "sm:px-6",
  "lg:px-8",
  "pb-12",
  "pt-8",
] as const;

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("VisionBoardGallery — Property 3: Standard_Page_Container hợp lệ", () => {
  it("container gốc luôn có mx-auto max-w-6xl + padding chuẩn, không phải wrapper gradient/orbs", () => {
    fc.assert(
      fc.property(arbUserData, (userData) => {
        syncedUserDataMock.useSyncedUserData.mockReturnValue({
          userData,
          reloadUserData: syncedUserDataMock.reloadUserData,
        });

        const { container } = render(
          <MemoryRouter>
            <VisionBoardGallery />
          </MemoryRouter>,
        );

        // Phần tử gốc do trang render ra (container.firstChild là root <div>).
        const root = container.firstElementChild as HTMLElement | null;
        expect(root).not.toBeNull();

        const rootClass = root?.className ?? "";

        // (a) Có đồng thời lớp căn giữa + đủ ba mốc padding responsive (+ pb-12/pt-8).
        for (const cls of REQUIRED_CONTAINER_CLASSES) {
          expect(rootClass.split(/\s+/)).toContain(cls);
        }

        // (b) Không phải wrapper gradient/orbs.
        expect(rootClass).not.toMatch(/bg-gradient/);
        expect(rootClass).not.toMatch(/blur-\[120px\]/);

        cleanup();
      }),
      { numRuns: 100 },
    );
  });
});
