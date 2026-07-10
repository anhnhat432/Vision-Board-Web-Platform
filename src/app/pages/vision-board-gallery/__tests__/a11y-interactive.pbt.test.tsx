// Feature: library-page-ui-alignment, Property 5: Mọi phần tử tương tác có
// accessible name và không dùng tabindex dương — với mọi danh sách VisionBoard
// sinh ngẫu nhiên, mọi <button> và mọi form control (<input>/<select>) render
// trên Library_Page đều có accessible name không rỗng (văn bản hiển thị hoặc
// aria-label/aria-labelledby/label liên kết), và markup không chứa thuộc tính
// `tabindex` với giá trị dương.
//
// Validates: Requirements 9.1, 9.3, 9.4

import { cleanup, render } from "@testing-library/react";
import fc from "fast-check";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { UserData } from "@/app/utils/storage";
import { getUserData, type VisionBoard, type VisionBoardItem } from "@/app/utils/storage";

const PROPERTY_TAG =
  "Feature: library-page-ui-alignment, Property 5: Mọi phần tử tương tác có accessible name và không dùng tabindex dương";

// ─────────────────────────────────────────────────────────────────────────────
// Mock ranh giới: cấp userData sinh ngẫu nhiên qua hook đồng bộ (không chạm
// Storage_Contract), và user chưa đăng nhập để bỏ qua hydrate backend.
// ─────────────────────────────────────────────────────────────────────────────
const galleryData = vi.hoisted(() => ({ userData: null as UserData | null }));

vi.mock("@/app/hooks/useSyncedUserData", () => ({
  useSyncedUserData: () => ({
    userData: galleryData.userData,
    reloadUserData: vi.fn(),
  }),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: () => ({ user: null }),
  useOptionalAuthContext: () => ({ user: null }),
}));

import { VisionBoardGallery } from "@/app/pages/VisionBoardGallery";

// ─────────────────────────────────────────────────────────────────────────────
// Generators — board có ít nhất một phần tử để lưới thẻ + toolbar chắc chắn render.
// ─────────────────────────────────────────────────────────────────────────────
const itemArb: fc.Arbitrary<VisionBoardItem> = fc
  .constantFrom("image", "quote", "icon")
  .chain((type) =>
    fc.record({
      id: fc.string({ minLength: 1 }),
      type: fc.constant(type as VisionBoardItem["type"]),
      content: fc.string(),
      x: fc.constant(0),
      y: fc.constant(0),
      width: fc.constant(1),
      height: fc.constant(1),
    }),
  );

const boardArb: fc.Arbitrary<VisionBoard> = fc.record({
  id: fc.string({ minLength: 1 }),
  name: fc.string(),
  year: fc.constantFrom("2023", "2024", "2025", "2026"),
  createdAt: fc.date().map((d) => d.toISOString()),
  items: fc.array(itemArb, { maxLength: 6 }),
});

// Ít nhất một board để render grid cards + toolbar (Req 9.1/9.3 cần các control tồn tại).
const boardsArb: fc.Arbitrary<VisionBoard[]> = fc.array(boardArb, {
  minLength: 1,
  maxLength: 12,
});

const BASE_USER_DATA = getUserData();

function buildUserData(boards: VisionBoard[]): UserData {
  return { ...BASE_USER_DATA, visionBoards: boards };
}

// ─────────────────────────────────────────────────────────────────────────────
// Accessible name: văn bản hiển thị HOẶC aria-label HOẶC aria-labelledby HOẶC
// <label> liên kết (for=id hoặc bọc ngoài). Trả true nếu có tên không rỗng.
// ─────────────────────────────────────────────────────────────────────────────
function hasAccessibleName(el: Element, container: HTMLElement): boolean {
  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel && ariaLabel.trim().length > 0) return true;

  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    const named = labelledBy.split(/\s+/).some((id) => {
      if (!id) return false;
      const ref = container.querySelector(`#${CSS.escape(id)}`);
      return Boolean(ref && (ref.textContent ?? "").trim().length > 0);
    });
    if (named) return true;
  }

  // Văn bản hiển thị (áp dụng cho <button> có nhãn chữ).
  if ((el.textContent ?? "").trim().length > 0) return true;

  // <label> liên kết cho form control.
  const id = el.getAttribute("id");
  if (id) {
    const label = container.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (label && (label.textContent ?? "").trim().length > 0) return true;
  }
  const wrappingLabel = el.closest("label");
  if (wrappingLabel && (wrappingLabel.textContent ?? "").trim().length > 0) return true;

  return false;
}

function renderGallery(boards: VisionBoard[]): HTMLElement {
  galleryData.userData = buildUserData(boards);
  const { container } = render(
    <MemoryRouter initialEntries={["/gallery"]}>
      <VisionBoardGallery />
    </MemoryRouter>,
  );
  return container;
}

afterEach(() => {
  cleanup();
});

describe("VisionBoardGallery a11y — Property 5", () => {
  it(PROPERTY_TAG, () => {
    fc.assert(
      fc.property(boardsArb, (boards) => {
        const container = renderGallery(boards);

        try {
          // (Req 9.1) Mọi nút icon + (Req 9.3) mọi control có accessible name không rỗng.
          const interactive = container.querySelectorAll("button, input, select, textarea");
          expect(interactive.length).toBeGreaterThan(0);
          for (const el of Array.from(interactive)) {
            expect(
              hasAccessibleName(el, container),
              `Phần tử tương tác thiếu accessible name: <${el.tagName.toLowerCase()}> ${el.outerHTML.slice(0, 120)}`,
            ).toBe(true);
          }

          // (Req 9.4) Không dùng tabindex dương ở bất kỳ phần tử nào.
          const tabbables = container.querySelectorAll("[tabindex]");
          for (const el of Array.from(tabbables)) {
            const raw = el.getAttribute("tabindex") ?? "0";
            const value = Number.parseInt(raw, 10);
            expect(
              Number.isNaN(value) || value <= 0,
              `tabindex dương bị cấm: "${raw}" trên <${el.tagName.toLowerCase()}>`,
            ).toBe(true);
          }
        } finally {
          cleanup();
        }
      }),
      { numRuns: 100 },
    );
  });
});
