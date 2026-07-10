// Feature: library-page-ui-alignment — Unit/example tests cho VisionBoardGallery.
//
// Đây là các test VÍ DỤ/UNIT (không phải property test). Chúng khẳng định lớp trình
// bày đã căn chỉnh theo Design_System và Data_Behavior KHÔNG đổi:
//   - Hero theo PageHero: title slot, eyebrow, CTA đích /vision-board & /, serif
//   - Tái sử dụng Card/Button/Badge/EmptyState
//   - Toolbar dùng token (rounded-[var(--r-input)], border-app-line, focus:ring-app-accent)
//   - Skeleton mapping (userData=null → skeleton; có dữ liệu → hết skeleton)
//   - Nhánh lỗi tải + "Thử lại" gọi reloadUserData
//   - Màu trạng thái sync theo token (Cloud=text-app-status-success, CloudOff dùng token)
//   - Xoá AlertDialog hai bước → deleteVisionBoard (+ backendDeleteVisionBoard khi synced)
//   - App_Mode real vs demo cho cùng dữ liệu → nội dung phi-demo giống nhau
//   - illustration/aside có aria-hidden
//   - Spy getUserData/saveUserData/deleteVisionBoard/backendGetVisionBoards/
//     backendDeleteVisionBoard/getBackendVisionBoardId để khẳng định Data_Behavior.
//
// Validates: Requirements 2.1, 2.2, 4.3, 5.2, 6.1, 6.2, 6.3, 6.4, 7.1, 7.2, 7.4,
//            7.5, 9.5, 10.1, 10.4, 10.5, 10.6, 11.2, 11.4

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { UserData, VisionBoard, VisionBoardItem } from "@/app/utils/storage";

// ─────────────────────────────────────────────────────────────────────────────
// Trạng thái mock có thể thay đổi giữa các test (userData, user, app-mode, navigate).
// ─────────────────────────────────────────────────────────────────────────────
const state = vi.hoisted(() => ({
  userData: null as UserData | null,
  user: null as { uid: string } | null,
  appMode: "real" as "real" | "demo",
  reloadUserData: vi.fn(),
  navigate: vi.fn(),
}));

// Hook đồng bộ dữ liệu — cấp userData trực tiếp, không chạm Storage_Contract.
vi.mock("@/app/hooks/useSyncedUserData", () => ({
  useSyncedUserData: () => ({
    userData: state.userData,
    reloadUserData: state.reloadUserData,
  }),
}));

// Auth context — điều khiển tình trạng đăng nhập (ảnh hưởng chỉ báo sync + hydrate).
vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: () => ({ user: state.user }),
  useOptionalAuthContext: () => ({ user: state.user }),
}));

// Backend service — spy để khẳng định Data_Behavior (hydrate/xoá backend) không đổi.
const serviceMock = vi.hoisted(() => ({
  getVisionBoards: vi.fn(() => Promise.resolve([] as unknown[])),
  deleteVisionBoard: vi.fn(() => Promise.resolve()),
}));
vi.mock("@/services/visionBoardService", () => ({
  getVisionBoards: serviceMock.getVisionBoards,
  deleteVisionBoard: serviceMock.deleteVisionBoard,
}));

// Link store — spy getBackendVisionBoardId để mô phỏng board synced / chỉ-local.
const linkStoreMock = vi.hoisted(() => ({
  getBackendVisionBoardId: vi.fn((_: string) => null as string | null),
  getLocalVisionBoardId: vi.fn((_: string) => null as string | null),
  saveVisionBoardLink: vi.fn(),
}));
vi.mock("@/lib/api/visionBoardLinkStore", () => ({
  getBackendVisionBoardId: linkStoreMock.getBackendVisionBoardId,
  getLocalVisionBoardId: linkStoreMock.getLocalVisionBoardId,
  saveVisionBoardLink: linkStoreMock.saveVisionBoardLink,
}));

// ScreenGuide gây nhiễu (đọc localStorage/animation) → tắt cho test trình bày.
vi.mock("@/app/components/ScreenGuide", () => ({
  ScreenGuide: () => null,
}));

// react-router: giữ MemoryRouter/useLocation thật, chỉ thay useNavigate bằng spy.
vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return { ...actual, useNavigate: () => state.navigate };
});

// storage: partial mock — spy getUserData/saveUserData/deleteVisionBoard, giữ phần còn lại.
vi.mock("@/app/utils/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/utils/storage")>();
  return {
    ...actual,
    getUserData: vi.fn(actual.getUserData),
    saveUserData: vi.fn(),
    deleteVisionBoard: vi.fn(),
  };
});

// app-mode: điều khiển real/demo qua state; giữ nguyên helper khác.
vi.mock("@/app/utils/app-mode", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/app/utils/app-mode")>();
  return {
    ...actual,
    getAppMode: () => state.appMode,
    isRealMode: () => state.appMode === "real",
    isDemoMode: () => state.appMode === "demo",
    shouldSeedDemoData: () => false,
  };
});

import { VisionBoardGallery } from "@/app/pages/VisionBoardGallery";
import { deleteVisionBoard, getUserData, saveUserData } from "@/app/utils/storage";
import { getBackendVisionBoardId } from "@/lib/api/visionBoardLinkStore";
import {
  deleteVisionBoard as backendDeleteVisionBoard,
  getVisionBoards as backendGetVisionBoards,
} from "@/services/visionBoardService";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers dựng dữ liệu tối giản (component chỉ đọc userData.visionBoards).
// ─────────────────────────────────────────────────────────────────────────────
function makeItem(overrides: Partial<VisionBoardItem> = {}): VisionBoardItem {
  return {
    id: "item-1",
    type: "image",
    content: "https://example.com/a.jpg",
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    ...overrides,
  };
}

function makeBoard(overrides: Partial<VisionBoard> = {}): VisionBoard {
  return {
    id: "board-1",
    name: "Alpha",
    year: "2025",
    items: [makeItem()],
    createdAt: "2025-01-15T10:00:00.000Z",
    ...overrides,
  };
}

function makeUserData(boards: VisionBoard[]): UserData {
  return { visionBoards: boards } as unknown as UserData;
}

function renderGallery(initialEntries: string[] = ["/gallery"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <VisionBoardGallery />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  state.userData = null;
  state.user = null;
  state.appMode = "real";
  state.reloadUserData = vi.fn();
  state.navigate = vi.fn();
  serviceMock.getVisionBoards.mockReset().mockResolvedValue([]);
  serviceMock.deleteVisionBoard.mockReset().mockResolvedValue(undefined);
  linkStoreMock.getBackendVisionBoardId.mockReset().mockReturnValue(null);
  linkStoreMock.getLocalVisionBoardId.mockReset().mockReturnValue(null);
  linkStoreMock.saveVisionBoardLink.mockReset();
  vi.mocked(getUserData).mockClear();
  vi.mocked(saveUserData).mockClear();
  vi.mocked(deleteVisionBoard).mockClear();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});

// ─────────────────────────────────────────────────────────────────────────────
describe("VisionBoardGallery — Hero theo PageHero (Req 2.1, 2.2, 4.3)", () => {
  it("render title slot của PageHero với cụm nhấn 'ước mơ' và dùng serif", () => {
    state.userData = makeUserData([makeBoard()]);
    const { container } = renderGallery();

    const title = container.querySelector('[data-slot="page-hero-title"]');
    expect(title).not.toBeNull();
    expect(title?.textContent).toContain("ước mơ");
    // Req 4.3: heading hero dùng font-serif theo quy ước PageHero.
    expect(title?.className).toContain("font-serif");
    // Req 4.4 gián tiếp: title cấp trang là h1.
    expect(title?.tagName).toBe("H1");
  });

  it("hiển thị đúng eyebrow 'Thư viện Bản vẽ Tương lai'", () => {
    state.userData = makeUserData([makeBoard()]);
    renderGallery();
    expect(screen.getByText("Thư viện Bản vẽ Tương lai")).toBeInTheDocument();
  });

  it("Primary_CTA 'Tạo bảng mới' điều hướng tới /vision-board (Req 10.4)", () => {
    state.userData = makeUserData([makeBoard()]);
    renderGallery();

    fireEvent.click(screen.getByRole("button", { name: /Tạo bảng mới/ }));
    expect(state.navigate).toHaveBeenCalledWith("/vision-board");
  });

  it("hành động phụ 'Trang chủ' điều hướng tới / (Req 10.4)", () => {
    state.userData = makeUserData([makeBoard()]);
    renderGallery();

    fireEvent.click(screen.getByRole("button", { name: "Trang chủ" }));
    expect(state.navigate).toHaveBeenCalledWith("/");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("VisionBoardGallery — tái sử dụng component dùng chung (Req 6.1–6.4)", () => {
  it("thẻ board dùng Card (data-slot=card) và Badge (data-slot=badge) cho năm", () => {
    state.userData = makeUserData([makeBoard({ name: "Bảng Xuân", year: "2024" })]);
    const { container } = renderGallery();

    expect(container.querySelector('[data-slot="card"]')).not.toBeNull();

    const badges = Array.from(container.querySelectorAll('[data-slot="badge"]'));
    expect(badges.some((b) => (b.textContent ?? "").includes("2024"))).toBe(true);
  });

  it("nút hành động dùng Button (data-slot=button)", () => {
    state.userData = makeUserData([makeBoard()]);
    renderGallery();

    const cta = screen.getByRole("button", { name: /Tạo bảng mới/ });
    expect(cta.getAttribute("data-slot")).toBe("button");
  });

  it("thư viện trống render EmptyState 'trống' (Req 6.2)", () => {
    state.userData = makeUserData([]);
    renderGallery();
    expect(screen.getByText("Thư viện của bạn vẫn còn trống")).toBeInTheDocument();
  });

  it("lọc không có kết quả render EmptyState 'không tìm thấy' (Req 6.2)", () => {
    state.userData = makeUserData([makeBoard({ name: "Alpha" })]);
    renderGallery();

    const search = screen.getByLabelText("Tìm bảng tầm nhìn theo tên");
    fireEvent.change(search, { target: { value: "zzz-khong-khop" } });

    expect(screen.getByText("Không tìm thấy bảng phù hợp")).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("VisionBoardGallery — toolbar dùng token (Req 6.5)", () => {
  it("ô tìm kiếm dùng rounded-[var(--r-input)], border-app-line, focus:ring-app-accent", () => {
    state.userData = makeUserData([makeBoard()]);
    renderGallery();

    const search = screen.getByLabelText("Tìm bảng tầm nhìn theo tên");
    const cls = search.className;
    expect(cls).toContain("rounded-[var(--r-input)]");
    expect(cls).toContain("border-app-line");
    expect(cls).toContain("focus:ring-app-accent");
  });

  it("các select năm/sắp xếp có nhãn a11y và dùng token", () => {
    state.userData = makeUserData([makeBoard()]);
    renderGallery();

    const yearSelect = screen.getByLabelText("Lọc bảng theo năm");
    const sortSelect = screen.getByLabelText("Sắp xếp danh sách bảng");
    for (const el of [yearSelect, sortSelect]) {
      expect(el.className).toContain("rounded-[var(--r-input)]");
      expect(el.className).toContain("border-app-line");
      expect(el.className).toContain("focus:ring-app-accent");
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("VisionBoardGallery — skeleton mapping (Req 7.1, 7.2, 7.4)", () => {
  it("userData=null → hiển thị skeleton đồng bộ với đủ nhóm vùng chính", () => {
    state.userData = null;
    const { container } = renderGallery();

    const status = container.querySelector('[role="status"]');
    expect(status).not.toBeNull();
    expect(status?.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByText("Đang tải bộ sưu tập tầm nhìn...")).toBeInTheDocument();

    // Mỗi vùng chính có skeleton: hero(1) + stats(3) + toolbar(1) + grid(6) = 11.
    const skeletons = container.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBe(11);
  });

  it("có dữ liệu → không còn phần tử skeleton nào", () => {
    state.userData = makeUserData([makeBoard()]);
    const { container } = renderGallery();

    expect(container.querySelector('[data-slot="skeleton"]')).toBeNull();
    expect(container.querySelector('[role="status"][aria-busy="true"]')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("VisionBoardGallery — nhánh lỗi tải (Req 7.5)", () => {
  it("getUserData ném lỗi khi userData=null → hiển thị lỗi + 'Thử lại' gọi reloadUserData", () => {
    state.userData = null;
    // Chỉ ném một lần: effect dò đọc chạy đúng một lần khi mount → bật loadError.
    vi.mocked(getUserData).mockImplementationOnce(() => {
      throw new Error("read failed");
    });

    renderGallery();

    expect(screen.getByText("Không tải được dữ liệu thư viện")).toBeInTheDocument();
    // Không giữ skeleton sau khi vào trạng thái lỗi.
    expect(document.querySelector('[role="status"][aria-busy="true"]')).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(state.reloadUserData).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("VisionBoardGallery — màu trạng thái sync theo token (Req 5.2, 10.6)", () => {
  it("board đã synced (user + backendId) → chỉ báo Cloud dùng text-app-status-success", () => {
    state.user = { uid: "u1" };
    state.userData = makeUserData([makeBoard()]);
    linkStoreMock.getBackendVisionBoardId.mockReturnValue("backend-123");

    const { container } = renderGallery();

    expect(container.innerHTML).toContain("text-app-status-success");
  });

  it("board chỉ-local (user, chưa synced) → CloudOff dùng token app-ink-muted, không dùng success", () => {
    state.user = { uid: "u1" };
    state.userData = makeUserData([makeBoard()]);
    linkStoreMock.getBackendVisionBoardId.mockReturnValue(null);

    const { container } = renderGallery();

    expect(container.innerHTML).toContain("text-app-ink-muted");
    expect(container.innerHTML).not.toContain("text-app-status-success");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("VisionBoardGallery — xoá AlertDialog hai bước (Req 10.5, 10.6)", () => {
  it("mở dialog rồi xác nhận → gọi deleteVisionBoard; chưa synced → không gọi backendDeleteVisionBoard", () => {
    state.user = null;
    state.userData = makeUserData([makeBoard({ id: "b-1", name: "Alpha" })]);
    linkStoreMock.getBackendVisionBoardId.mockReturnValue(null);

    renderGallery();

    // Bước 1: mở dialog xác nhận.
    fireEvent.click(screen.getByRole("button", { name: "Xóa bảng Alpha" }));
    expect(screen.getByText("Xóa vision board này?")).toBeInTheDocument();
    // Chưa xác nhận thì chưa xoá.
    expect(vi.mocked(deleteVisionBoard)).not.toHaveBeenCalled();

    // Bước 2: xác nhận.
    fireEvent.click(screen.getByRole("button", { name: "Xóa" }));
    expect(vi.mocked(deleteVisionBoard)).toHaveBeenCalledWith("b-1");
    expect(serviceMock.deleteVisionBoard).not.toHaveBeenCalled();
    expect(state.reloadUserData).toHaveBeenCalled();
  });

  it("board synced → xác nhận xoá gọi cả deleteVisionBoard và backendDeleteVisionBoard", () => {
    state.user = { uid: "u1" };
    state.userData = makeUserData([makeBoard({ id: "b-2", name: "Beta" })]);
    linkStoreMock.getBackendVisionBoardId.mockReturnValue("backend-999");

    renderGallery();

    fireEvent.click(screen.getByRole("button", { name: "Xóa bảng Beta" }));
    fireEvent.click(screen.getByRole("button", { name: "Xóa" }));

    expect(vi.mocked(deleteVisionBoard)).toHaveBeenCalledWith("b-2");
    expect(backendDeleteVisionBoard).toHaveBeenCalledWith("backend-999");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("VisionBoardGallery — App_Mode real vs demo (Req 11.2, 11.4)", () => {
  it("nội dung phi-demo giống nhau ở real và demo cho cùng dữ liệu", () => {
    const boards = [makeBoard({ id: "b-1", name: "Alpha", year: "2025" })];

    state.appMode = "real";
    state.userData = makeUserData(boards);
    const realView = renderGallery();
    const realText = realView.container.textContent;
    cleanup();

    state.appMode = "demo";
    state.userData = makeUserData(boards);
    const demoView = renderGallery();
    const demoText = demoView.container.textContent;

    expect(demoText).toBe(realText);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("VisionBoardGallery — aria-hidden cho phần trang trí (Req 9.5)", () => {
  it("aside hero (illustration) được đánh dấu aria-hidden", () => {
    state.userData = makeUserData([makeBoard()]);
    const { container } = renderGallery();

    const hiddenWithSvg = Array.from(
      container.querySelectorAll('[aria-hidden="true"]'),
    ).some((el) => el.querySelector("svg") !== null);
    expect(hiddenWithSvg).toBe(true);
  });

  it("EmptyState illustration khi thư viện trống có aria-hidden", () => {
    state.userData = makeUserData([]);
    const { container } = renderGallery();

    const hiddenWithSvg = Array.from(
      container.querySelectorAll('[aria-hidden="true"]'),
    ).some((el) => el.querySelector("svg") !== null);
    expect(hiddenWithSvg).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("VisionBoardGallery — Data_Behavior không đổi (Req 10.1)", () => {
  it("render bình thường không tự ý ghi (saveUserData/deleteVisionBoard không được gọi)", () => {
    state.userData = makeUserData([makeBoard()]);
    renderGallery();

    expect(vi.mocked(saveUserData)).not.toHaveBeenCalled();
    expect(vi.mocked(deleteVisionBoard)).not.toHaveBeenCalled();
    // Chỉ báo sync đọc qua link store hiện có.
    expect(getBackendVisionBoardId).toHaveBeenCalled();
  });

  it("user đăng nhập → hydrate đọc backendGetVisionBoards (giữ nguyên hành vi)", () => {
    state.user = { uid: "u1" };
    state.userData = makeUserData([makeBoard()]);

    renderGallery();

    expect(backendGetVisionBoards).toHaveBeenCalledTimes(1);
  });
});
