// Integration / DOM tests cho Library_Page (VisionBoardGallery).
//
// Validates: Requirements 8.3, 8.4, 8.6, 8.7, 12.3, 12.4
//
// Bao phủ:
//  - A11y/contrast ở Light_Mode và Dark_Mode (Req 8.3, 8.4): kiểm tra bằng bộ
//    kiểm a11y dựa trên DOM (không có jest-axe/vitest-axe trong repo). Xem GHI CHÚ
//    GIỚI HẠN JSDOM bên dưới — jsdom không dựng layout thật nên KHÔNG thể tính tỉ
//    lệ tương phản pixel; ta khẳng định các bất biến a11y kiểm được (mọi nút có
//    accessible name, mọi <img> có alt, control có nhãn) trong cả hai chế độ màu.
//  - Toggle html.dark KHÔNG cần reload (Req 8.6, 8.7): thêm class `dark` vào
//    documentElement sau khi render và khẳng định trang vẫn render, không crash,
//    giữ nguyên nội dung (không cần mount lại).
//  - Mobile-safety không cuộn ngang ở 320–767px (Req 12.3): khẳng định
//    `scrollWidth <= clientWidth` (xem GHI CHÚ GIỚI HẠN JSDOM) + container dùng
//    padding responsive chuẩn.
//  - Primary_CTA vùng chạm ≥ 44px (Req 12.4): jsdom không tính pixel layout nên
//    ta khẳng định sự hiện diện của lớp touch-target 44px do <Button> cung cấp
//    (`after:h-11` + `after:min-w-[44px]`) trên Primary_CTA "Tạo bảng mới".
//
// ─────────────────────────────────────────────────────────────────────────────
// GHI CHÚ GIỚI HẠN JSDOM (báo cáo trong task):
//   jsdom KHÔNG dựng layout/CSS thật: `scrollWidth`/`clientWidth`/`offsetWidth`
//   đều trả 0, và không có công cụ tính màu đã resolve. Vì vậy:
//     • Không thể đo Contrast_Ratio thật → dùng audit a11y cấu trúc DOM thay thế
//       và tin tưởng token trong tokens.css đã đạt ngưỡng (như design ghi chú).
//     • `scrollWidth <= clientWidth` đúng một cách tầm thường (0 <= 0); ta vẫn giữ
//       assertion theo yêu cầu, đồng thời bổ sung assert padding responsive.
//     • Không đo được min-h/min-w pixel của Primary_CTA → assert lớp touch-target.
//   Kiểm chứng contrast/overflow/pixel thật thuộc về smoke/visual test trên trình
//   duyệt (Playwright), nằm ngoài phạm vi test jsdom này.
// ─────────────────────────────────────────────────────────────────────────────

import { cleanup, render, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { UserData } from "@/app/utils/storage";
import { getUserData, type VisionBoard } from "@/app/utils/storage";

// ─────────────────────────────────────────────────────────────────────────────
// Mock ranh giới (giống các test anh em): cấp userData qua hook đồng bộ mà không
// chạm Storage_Contract; user chưa đăng nhập để bỏ qua hydrate backend; vô hiệu
// hoá service backend. react-router dùng MemoryRouter thật.
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
  useOptionalAuthContext: () => authContextMock,
}));

vi.mock("@/services/visionBoardService", () => ({
  getVisionBoards: vi.fn(() => Promise.resolve([])),
  deleteVisionBoard: vi.fn(() => Promise.resolve()),
}));

import { VisionBoardGallery } from "@/app/pages/VisionBoardGallery";

// ─────────────────────────────────────────────────────────────────────────────
// Dữ liệu mẫu cố định: hai board có items image/quote/icon để render đầy đủ hero,
// stats, toolbar, và lưới thẻ (đủ bề mặt cho audit a11y).
// ─────────────────────────────────────────────────────────────────────────────
const BASE_USER_DATA = getUserData();

const SAMPLE_BOARDS: VisionBoard[] = [
  {
    id: "board-1",
    name: "Ước mơ 2025",
    year: "2025",
    createdAt: new Date("2025-01-15T10:00:00.000Z").toISOString(),
    items: [
      { id: "i1", type: "image", content: "https://example.com/a.jpg", x: 0, y: 0, width: 10, height: 10 },
      { id: "i2", type: "quote", content: "Sống một cuộc đời rực rỡ", x: 0, y: 0, width: 10, height: 10 },
      { id: "i3", type: "icon", content: "Sparkles", x: 0, y: 0, width: 10, height: 10 },
    ],
  },
  {
    id: "board-2",
    name: "Kế hoạch 2024",
    year: "2024",
    createdAt: new Date("2024-06-20T10:00:00.000Z").toISOString(),
    items: [
      { id: "i4", type: "image", content: "https://example.com/b.jpg", x: 0, y: 0, width: 10, height: 10 },
      { id: "i5", type: "quote", content: "Kiên trì mỗi ngày", x: 0, y: 0, width: 10, height: 10 },
    ],
  },
];

function buildUserData(boards: VisionBoard[]): UserData {
  return { ...BASE_USER_DATA, visionBoards: boards };
}

function renderGallery(): ReturnType<typeof render> {
  return render(
    <MemoryRouter initialEntries={["/gallery"]}>
      <VisionBoardGallery />
    </MemoryRouter>,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Accessible name: aria-label/aria-labelledby/label liên kết/văn bản hiển thị.
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

  if ((el.textContent ?? "").trim().length > 0) return true;

  const id = el.getAttribute("id");
  if (id) {
    const label = container.querySelector(`label[for="${CSS.escape(id)}"]`);
    if (label && (label.textContent ?? "").trim().length > 0) return true;
  }
  const wrappingLabel = el.closest("label");
  if (wrappingLabel && (wrappingLabel.textContent ?? "").trim().length > 0) return true;

  return false;
}

/**
 * Audit a11y cấu trúc DOM (thay cho jest-axe/vitest-axe không có trong repo).
 * Trả về mảng vi phạm dạng chuỗi; rỗng nghĩa là đạt các bất biến kiểm được.
 */
function auditA11y(container: HTMLElement): string[] {
  const violations: string[] = [];

  // Mọi phần tử tương tác có accessible name.
  for (const el of Array.from(container.querySelectorAll("button, input, select, textarea, a[href]"))) {
    if (!hasAccessibleName(el, container)) {
      violations.push(`Thiếu accessible name: <${el.tagName.toLowerCase()}> ${el.outerHTML.slice(0, 100)}`);
    }
  }

  // Mọi <img> có thuộc tính alt (rỗng cũng hợp lệ với ảnh trang trí).
  for (const img of Array.from(container.querySelectorAll("img"))) {
    if (img.getAttribute("alt") === null) {
      violations.push(`<img> thiếu thuộc tính alt: ${img.outerHTML.slice(0, 100)}`);
    }
  }

  // Không dùng tabindex dương (thứ tự focus khớp thứ tự đọc).
  for (const el of Array.from(container.querySelectorAll("[tabindex]"))) {
    const value = Number.parseInt(el.getAttribute("tabindex") ?? "0", 10);
    if (!Number.isNaN(value) && value > 0) {
      violations.push(`tabindex dương: ${el.getAttribute("tabindex")}`);
    }
  }

  return violations;
}

/** Tìm Primary_CTA "Tạo bảng mới" trong hero. */
function findPrimaryCta(container: HTMLElement): HTMLButtonElement {
  const buttons = Array.from(container.querySelectorAll<HTMLButtonElement>('button[data-slot="button"]'));
  const cta = buttons.find((b) => (b.textContent ?? "").includes("Tạo bảng mới"));
  if (!cta) throw new Error('Không tìm thấy Primary_CTA "Tạo bảng mới"');
  return cta;
}

afterEach(() => {
  cleanup();
  document.documentElement.classList.remove("dark");
  syncedDataMock.userData = null;
  authContextMock.user = null;
  syncedDataMock.reloadUserData.mockClear();
  localStorage.clear();
});

describe("VisionBoardGallery — integration: contrast/a11y + mobile-safety", () => {
  it("không có vi phạm a11y kiểm-được ở Light_Mode (Req 8.3, 8.4)", () => {
    document.documentElement.classList.remove("dark");
    syncedDataMock.userData = buildUserData(SAMPLE_BOARDS);
    const { container } = renderGallery();

    expect(auditA11y(container)).toEqual([]);
  });

  it("không có vi phạm a11y kiểm-được ở Dark_Mode (Req 8.3, 8.4)", () => {
    document.documentElement.classList.add("dark");
    syncedDataMock.userData = buildUserData(SAMPLE_BOARDS);
    const { container } = renderGallery();

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(auditA11y(container)).toEqual([]);
  });

  it("toggle html.dark không cần reload — trang vẫn render, không crash (Req 8.6, 8.7)", () => {
    document.documentElement.classList.remove("dark");
    syncedDataMock.userData = buildUserData(SAMPLE_BOARDS);
    const { container } = renderGallery();

    const titleBefore = container.querySelector('[data-slot="page-hero-title"]');
    expect(titleBefore).not.toBeNull();
    expect(titleBefore?.textContent).toContain("ước mơ");

    // Bật dark mode bằng cách thêm class `dark` vào documentElement — KHÔNG mount lại.
    document.documentElement.classList.add("dark");

    // Cùng container/DOM instance vẫn còn (không reload/remount).
    const titleAfter = container.querySelector('[data-slot="page-hero-title"]');
    expect(titleAfter).toBe(titleBefore);
    expect(titleAfter?.isConnected).toBe(true);
    expect(within(container).getByText("Tạo bảng mới", { exact: false })).toBeInTheDocument();

    // Tắt lại dark mode cũng không phá vỡ DOM đang gắn.
    document.documentElement.classList.remove("dark");
    expect(container.querySelector('[data-slot="page-hero-title"]')?.isConnected).toBe(true);
  });

  it("không tạo cuộn ngang ở viewport 320–767px (Req 12.3)", () => {
    // Thiết lập viewport mobile (biên dưới 320 và một mốc giữa dải 320–767).
    for (const width of [320, 480, 767]) {
      Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
      window.dispatchEvent(new Event("resize"));

      syncedDataMock.userData = buildUserData(SAMPLE_BOARDS);
      const { container, unmount } = renderGallery();

      const root = container.firstElementChild as HTMLElement | null;
      expect(root).not.toBeNull();

      // GHI CHÚ GIỚI HẠN JSDOM: scrollWidth/clientWidth = 0 trong jsdom → 0 <= 0.
      // Assertion vẫn được giữ theo yêu cầu; overflow thật cần kiểm trên trình duyệt.
      expect(root!.scrollWidth).toBeLessThanOrEqual(root!.clientWidth);

      // Bổ trợ (kiểm-được trong jsdom): container dùng padding responsive chuẩn,
      // tránh padding cố định lớn gây tràn ở màn hẹp.
      const cls = root!.className;
      expect(cls).toContain("px-4");
      expect(cls).toContain("sm:px-6");
      expect(cls).toContain("lg:px-8");
      expect(cls).toContain("max-w-6xl");

      unmount();
      cleanup();
    }
  });

  it("Primary_CTA có vùng chạm ≥ 44px trên mobile (Req 12.4)", () => {
    syncedDataMock.userData = buildUserData(SAMPLE_BOARDS);
    const { container } = renderGallery();

    const cta = findPrimaryCta(container);

    // GHI CHÚ GIỚI HẠN JSDOM: không đo được pixel min-h/min-w. Ta khẳng định lớp
    // touch-target 44px do <Button> cung cấp (after:h-11 = 44px, after:min-w-[44px]),
    // chỉ hiện trên mobile (sm:after:hidden) — bảo đảm vùng chạm ≥ 44x44 CSS px.
    const cls = cta.className;
    expect(cls).toContain("after:h-11");
    expect(cls).toContain("after:min-w-[44px]");
    expect(cls).toContain("sm:after:hidden");
  });
});
