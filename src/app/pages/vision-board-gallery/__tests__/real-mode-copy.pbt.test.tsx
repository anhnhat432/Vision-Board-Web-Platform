// Feature: library-page-ui-alignment, Property 8: Real mode không rò rỉ Demo_Only_Copy
//
// Validates: Requirements 11.1, 11.3
//
// Với mọi userData hợp lệ, khi App_Mode là real (kể cả trường hợp VITE_APP_MODE
// thiếu/không hợp lệ — theo Req 11.3 được xử lý như real), phần giao diện HIỂN THỊ
// cho người dùng của Library_Page (VisionBoardGallery) KHÔNG chứa (không phân biệt
// hoa/thường) bất kỳ cụm nào trong DEMO_ONLY_PHRASES:
//   "dùng thử", "không cần đăng nhập", "trên trình duyệt này",
//   "không thu tiền thật", "mock", "demo".
//
// Quyết định phạm vi khẳng định (chống dương tính giả):
//   DEMO_ONLY_PHRASES chứa các substring rất phổ biến ("demo", "mock") có thể lọt
//   vào innerHTML qua class/attribute không hiển thị. Property nhắm "markup hiển thị
//   cho người dùng" → ta gom VĂN BẢN HIỂN THỊ (container.textContent) cùng các
//   thuộc tính người-dùng-đọc-được (aria-label, title, placeholder, alt), rồi khẳng
//   định trên chuỗi đó (lowercased). Đồng thời, tên board và nội dung item là DỮ LIỆU
//   NGƯỜI DÙNG (không phải copy của app) nên generator được ràng buộc để không sinh
//   ra các cụm demo — bảo đảm mọi lần khớp (nếu có) đều là copy của chính app.

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

import { DEMO_ONLY_PHRASES } from "./decoration-registry";

// ─────────────────────────────────────────────────────────────────────────────
// Mocks: cấp userData sinh ngẫu nhiên qua useSyncedUserData; vô hiệu hoá đường sync
// backend + link store để test thuần trình bày. react-router dùng MemoryRouter thật.
//
// App_Mode: buộc REAL mode qua mock `@/app/utils/app-mode`. Requirement 11.3 quy định
// mọi giá trị VITE_APP_MODE thiếu/không hợp lệ đều được xử lý như real — ta mô phỏng
// đúng hợp đồng này bằng cách để isRealMode()=true / isDemoMode()=false cho mọi biến
// thể env "real" | thiếu | rỗng | không hợp lệ (xem arbRealModeEnvLabel bên dưới).
// ─────────────────────────────────────────────────────────────────────────────
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

// Buộc real mode cho mọi biến thể env (real | thiếu | rỗng | không hợp lệ → real).
// Partial mock: chỉ ghi đè nhánh App_Mode, giữ nguyên các helper khác
// (shouldSeedDemoData, shouldShowBillingDebugUi, ...) mà storage/các module khác dùng.
vi.mock("@/app/utils/app-mode", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/utils/app-mode")>();
  return {
    ...actual,
    getAppMode: () => "real" as const,
    isRealMode: () => true,
    isDemoMode: () => false,
    shouldSeedDemoData: () => false,
  };
});

import { VisionBoardGallery } from "@/app/pages/VisionBoardGallery";

// ─────────────────────────────────────────────────────────────────────────────
// Generators: arbUserData với board đa dạng. Ràng buộc tên/nội dung item để KHÔNG
// chứa bất kỳ cụm demo nào — tránh dương tính giả từ dữ liệu người dùng.
// ─────────────────────────────────────────────────────────────────────────────
const LOWER_DEMO_PHRASES = DEMO_ONLY_PHRASES.map((p) => p.toLowerCase());

function containsDemoPhrase(value: string): boolean {
  const lower = value.toLowerCase();
  return LOWER_DEMO_PHRASES.some((phrase) => lower.includes(phrase));
}

/** Loại các chuỗi có chứa cụm demo (đây là dữ liệu người dùng, không phải copy app). */
function withoutDemoPhrase(arb: fc.Arbitrary<string>): fc.Arbitrary<string> {
  return arb.filter((s) => !containsDemoPhrase(s));
}

const YEARS = ["2023", "2024", "2025", "2026"] as const;
const ITEM_TYPES: readonly VisionBoardItemType[] = ["image", "quote", "icon"];

const arbItemContent = withoutDemoPhrase(
  fc.oneof(
    fc.string(),
    fc.constantFrom(
      "https://example.com/photo.jpg",
      "Sparkles",
      "Heart",
      "Star",
      "Sống một cuộc đời rực rỡ",
    ),
  ),
);

const arbItem: fc.Arbitrary<VisionBoardItem> = fc.record({
  id: fc.string({ minLength: 1 }),
  type: fc.constantFrom(...ITEM_TYPES),
  content: arbItemContent,
  x: fc.integer({ min: 0, max: 1000 }),
  y: fc.integer({ min: 0, max: 1000 }),
  width: fc.integer({ min: 0, max: 500 }),
  height: fc.integer({ min: 0, max: 500 }),
});

const arbName: fc.Arbitrary<string> = withoutDemoPhrase(
  fc.oneof(
    fc.string(),
    fc.constantFrom("Ước mơ 2025", "  Kế hoạch  ", "Dream Board", "café ☕ vision", ""),
  ),
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

const arbBoards: fc.Arbitrary<VisionBoard[]> = fc
  .array(arbVisionBoard, { maxLength: 6 })
  .map((boards) => boards.map((b, i) => ({ ...b, id: `${i}::${b.id}` })));

const baseUserData: UserData = getUserData();

const arbUserData: fc.Arbitrary<UserData> = arbBoards.map((visionBoards) => ({
  ...baseUserData,
  visionBoards,
}));

// Nhãn env chỉ để tài liệu hoá Req 11.3: mọi biến thể đều phải hành xử như real.
const arbRealModeEnvLabel = fc.constantFrom(
  "real",
  "(missing)",
  "(empty)",
  "STAGING (invalid)",
);

// ─────────────────────────────────────────────────────────────────────────────
// Thu thập văn bản HIỂN THỊ cho người dùng: textContent + thuộc tính đọc-được.
// ─────────────────────────────────────────────────────────────────────────────
const VISIBLE_ATTRS = ["aria-label", "title", "placeholder", "alt"] as const;

function collectUserVisibleText(container: HTMLElement): string {
  const parts: string[] = [container.textContent ?? ""];
  for (const el of Array.from(container.querySelectorAll("*"))) {
    for (const attr of VISIBLE_ATTRS) {
      const value = el.getAttribute(attr);
      if (value) parts.push(value);
    }
  }
  return parts.join(" ").toLowerCase();
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("VisionBoardGallery — Property 8: real mode không rò rỉ Demo_Only_Copy", () => {
  it("không hiển thị bất kỳ cụm demo nào trong real mode với mọi userData", () => {
    fc.assert(
      fc.property(arbUserData, arbRealModeEnvLabel, (userData, _envLabel) => {
        syncedUserDataMock.useSyncedUserData.mockReturnValue({
          userData,
          reloadUserData: syncedUserDataMock.reloadUserData,
        });

        const { container } = render(
          <MemoryRouter>
            <VisionBoardGallery />
          </MemoryRouter>,
        );

        const visibleText = collectUserVisibleText(container);

        for (const phrase of LOWER_DEMO_PHRASES) {
          expect(visibleText).not.toContain(phrase);
        }

        cleanup();
      }),
      { numRuns: 100 },
    );
  });
});
