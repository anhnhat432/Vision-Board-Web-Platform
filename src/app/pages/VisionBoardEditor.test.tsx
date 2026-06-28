import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type React from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { VisionBoardItem } from "@/app/utils/storage-types";
import { VisionBoardEditor } from "./VisionBoardEditor";

const authContextMock = vi.hoisted(() => ({
  useAuthContext: vi.fn(),
}));

const toPngMock = vi.hoisted(() => vi.fn());

const storySeedMock = vi.hoisted(() => ({
  themeId: "sunset" as const,
  items: [
    {
      id: "seed_quote",
      type: "quote" as const,
      content: "Tôi đang xây cuộc đời mình muốn thức dậy mỗi sáng",
      x: 18,
      y: 38,
      width: 320,
      height: 140,
      style: { sizePreset: "L" as const, quoteFont: "handwriting" as const },
    },
    {
      id: "seed_image",
      type: "image" as const,
      content: "https://example.com/health.jpg",
      x: 50,
      y: 45,
      width: 220,
      height: 165,
      lifeAreaId: "Health",
      style: { sizePreset: "M" as const, imageFrame: "polaroid" as const },
    },
  ],
  storyAnswers: {
    feelings: ["tu-do", "sang-tao", "binh-an"],
    focusAreas: ["Health"],
    coreQuote: "Tôi đang xây cuộc đời mình muốn thức dậy mỗi sáng",
  },
}));

const storageMock = vi.hoisted(() => ({
  addVisionBoard: vi.fn(),
  calculateGoalProgress: vi.fn((goal: { progress?: number }) => goal.progress ?? 0),
  getCurrentEntitlementKeys: vi.fn(() => []),
  getCurrentPlan: vi.fn(() => "FREE"),
  getUserData: vi.fn(),
  updateVisionBoard: vi.fn(),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: authContextMock.useAuthContext,
}));

vi.mock("html-to-image", () => ({
  toPng: toPngMock,
}));

vi.mock("../utils/storage", () => storageMock);

vi.mock("../components/UpgradePaywallDialog", () => ({
  UpgradePaywallDialog: () => null,
}));

vi.mock("../components/illustrations", () => ({
  EmptyOrdersIllustration: () => <div data-testid="empty-illustration" />,
}));

vi.mock("../components/visuals/ProductVisual", () => ({
  ProductVisual: () => <div data-testid="product-visual" />,
}));

vi.mock("../components/visionBoard/VisionBoardStoryWizard", () => ({
  VisionBoardStoryWizard: ({
    open,
    onComplete,
  }: {
    open: boolean;
    onComplete: (seed: typeof storySeedMock) => void;
  }) =>
    open ? (
      <div role="dialog" aria-label="Story Mode Wizard">
        <button type="button" onClick={() => onComplete(storySeedMock)}>
          Mock tạo bảng
        </button>
      </div>
    ) : null,
}));

vi.mock("../components/visionBoard/VisionBoardCanvas", () => ({
  VisionBoardCanvas: ({
    items,
    emptyStateSlot,
    exportRef,
    themeId,
  }: {
    items: VisionBoardItem[];
    emptyStateSlot?: React.ReactNode;
    exportRef?: React.Ref<HTMLDivElement>;
    themeId?: string;
  }) => (
    <div data-testid="vision-board-canvas" data-theme-id={themeId ?? "aurora"} ref={exportRef}>
      <pre data-testid="canvas-items">{JSON.stringify(items)}</pre>
      {items.length === 0 ? emptyStateSlot : null}
    </div>
  ),
}));

type TestGoal = {
  id: string;
  category: string;
  title: string;
  description: string;
  deadline: string;
  tasks: [];
  createdAt: string;
  progress?: number;
};

function createGoal(overrides: Partial<TestGoal>): TestGoal {
  return {
    id: "goal_1",
    category: "Health",
    title: "Chạy 5km",
    description: "",
    deadline: "2026-12-31",
    tasks: [],
    createdAt: "2026-05-17T00:00:00.000Z",
    progress: 60,
    ...overrides,
  };
}

function setUserData({ goals = [], visionBoards = [] }: { goals?: TestGoal[]; visionBoards?: unknown[] }) {
  storageMock.getUserData.mockReturnValue({
    goals,
    visionBoards,
    achievements: [],
  });
}

function renderEditor(initialEntry = "/vision-board") {
  const router = createMemoryRouter(
    [
      {
        path: "/vision-board/:id?",
        element: <VisionBoardEditor />,
      },
      {
        path: "/goals",
        element: <div>Trang mục tiêu</div>,
      },
      {
        path: "/gallery",
        element: <div>Thư viện</div>,
      },
    ],
    { initialEntries: [initialEntry] },
  );

  return render(<RouterProvider router={router} />);
}

async function openAddDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: "Thêm phần tử" }));
}

function getCanvasItems(): VisionBoardItem[] {
  return JSON.parse(screen.getByTestId("canvas-items").textContent ?? "[]") as VisionBoardItem[];
}

describe("VisionBoardEditor add dialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authContextMock.useAuthContext.mockReturnValue({ user: null });
    storageMock.addVisionBoard.mockReturnValue("board_saved");
    storageMock.calculateGoalProgress.mockImplementation((goal: { progress?: number }) => goal.progress ?? 0);
    toPngMock.mockResolvedValue("data:image/png;base64,exported");
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    setUserData({ goals: [createGoal({ id: "goal_1" }), createGoal({ id: "goal_2", title: "Ngủ sâu hơn" })] });
  });

  it("does not auto-open the initial setup popup for a new board", async () => {
    renderEditor();

    expect(await screen.findByRole("button", { name: "Thêm phần tử" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders add tabs", async () => {
    const user = userEvent.setup();
    renderEditor();

    await openAddDialog(user);

    expect(screen.getAllByRole("tab")).toHaveLength(5);
    expect(screen.getByRole("tab", { name: /Mục tiêu/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Sticker" })).toBeInTheDocument();
  });

  it("renders goals in the goal card tab", async () => {
    const user = userEvent.setup();
    renderEditor();

    await openAddDialog(user);
    await user.click(screen.getByRole("tab", { name: /Mục tiêu/ }));

    expect(screen.getByText("Chạy 5km")).toBeInTheDocument();
    expect(screen.getByText("Ngủ sâu hơn")).toBeInTheDocument();
  });

  it("shows goal empty state and navigation button", async () => {
    const user = userEvent.setup();
    setUserData({ goals: [] });
    renderEditor();

    await openAddDialog(user);
    await user.click(screen.getByRole("tab", { name: /Mục tiêu/ }));

    expect(screen.getByText("Bạn chưa có mục tiêu nào để ghim lên bảng")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đi tới Mục tiêu" })).toBeInTheDocument();
  });

  it("filters out goals already pinned on the board", async () => {
    const user = userEvent.setup();
    setUserData({
      goals: [createGoal({ id: "goal_1" }), createGoal({ id: "goal_2", title: "Ngủ sâu hơn" })],
      visionBoards: [
        {
          id: "board_1",
          name: "Board cũ",
          year: "2026",
          createdAt: "2026-05-17T00:00:00.000Z",
          items: [{ id: "item_goal", type: "goal_card", content: "goal_1", x: 10, y: 10, width: 220, height: 140 }],
        },
      ],
    });
    renderEditor("/vision-board/board_1");

    await user.click(await screen.findByRole("button", { name: "Thêm phần tử" }));
    await user.click(screen.getByRole("tab", { name: /Mục tiêu/ }));

    expect(screen.queryByText("Chạy 5km")).not.toBeInTheDocument();
    expect(screen.getByText("Ngủ sâu hơn")).toBeInTheDocument();
  });

  it("adds a selected goal card item", async () => {
    const user = userEvent.setup();
    renderEditor();

    await openAddDialog(user);
    await user.click(screen.getByRole("tab", { name: /Mục tiêu/ }));
    await user.click(screen.getByRole("button", { name: /Chạy 5km/ }));
    await user.click(screen.getByRole("button", { name: "Ghim mục tiêu vào bảng" }));

    expect(getCanvasItems()).toContainEqual(
      expect.objectContaining({
        type: "goal_card",
        content: "goal_1",
        lifeAreaId: "Health",
        style: { sizePreset: "M" },
      }),
    );
  });

  it("applies selected life area and image frame to URL image items", async () => {
    const user = userEvent.setup();
    renderEditor();

    await openAddDialog(user);
    await user.click(screen.getByRole("button", { name: /Life area/ }));
    await user.click(screen.getByRole("button", { name: "Sức khỏe" }));
    await user.click(screen.getByRole("button", { name: "Polaroid" }));
    await user.type(screen.getByPlaceholderText("https://example.com/my-image.jpg"), "https://example.com/a.jpg");
    await user.click(screen.getByRole("button", { name: "Thêm ảnh từ URL" }));

    expect(getCanvasItems()).toContainEqual(
      expect.objectContaining({
        type: "image",
        lifeAreaId: "Health",
        style: { sizePreset: "M", imageFrame: "polaroid" },
      }),
    );
  });

  it("applies selected quote font to quote items", async () => {
    const user = userEvent.setup();
    renderEditor();

    await openAddDialog(user);
    await user.click(screen.getByRole("tab", { name: /Câu nói/ }));
    await user.click(screen.getByRole("button", { name: /Viết tay/ }));
    await user.type(
      screen.getByPlaceholderText("Viết một câu nhắc nhở bạn muốn nhìn thấy mỗi ngày..."),
      "Tự do là chọn lựa",
    );
    await user.click(screen.getByRole("button", { name: "Thêm câu nói vào bảng" }));

    expect(getCanvasItems()).toContainEqual(
      expect.objectContaining({
        type: "quote",
        content: "Tự do là chọn lựa",
        style: expect.objectContaining({ sizePreset: "L", quoteFont: "handwriting" }),
      }),
    );
  });

  it("completes story mode, saves seed data, reopens board, and exports wallpaper", async () => {
    const user = userEvent.setup();
    const { unmount } = renderEditor();

    await user.click(await screen.findByRole("button", { name: "Bắt đầu Story Mode" }));
    expect(screen.getByRole("dialog", { name: "Story Mode Wizard" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Mock tạo bảng" }));

    expect(getCanvasItems()).toHaveLength(2);
    expect(screen.getByTestId("vision-board-canvas")).toHaveAttribute("data-theme-id", "sunset");
    expect(screen.getByRole("button", { name: "Tải về wallpaper" })).toBeEnabled();

    await user.type(screen.getByPlaceholderText("Tên vision board của bạn"), "Bảng 2026");
    await user.click(screen.getByRole("button", { name: "Lưu bảng" }));

    expect(storageMock.addVisionBoard).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Bảng 2026",
        theme: "sunset",
        items: storySeedMock.items,
        storyAnswers: storySeedMock.storyAnswers,
      }),
    );

    setUserData({
      goals: [createGoal({ id: "goal_1" })],
      visionBoards: [
        {
          id: "board_saved",
          name: "Bảng 2026",
          year: "2026",
          createdAt: "2026-05-17T00:00:00.000Z",
          items: storySeedMock.items,
          theme: storySeedMock.themeId,
          storyAnswers: storySeedMock.storyAnswers,
        },
      ],
    });
    unmount();
    renderEditor("/vision-board/board_saved");

    expect(screen.getByTestId("vision-board-canvas")).toHaveAttribute("data-theme-id", "sunset");
    expect(getCanvasItems()).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Tải về wallpaper" }));
    expect(screen.getByText("Wallpaper điện thoại (9:16)")).toBeInTheDocument();
    expect(screen.getByText("Wallpaper máy tính (16:9)")).toBeInTheDocument();
    expect(screen.getByText(/Vuông \(1:1\)/)).toBeInTheDocument();
    const wallpaperOption = screen.getByText("Wallpaper điện thoại (9:16)").closest("button");
    if (!wallpaperOption) throw new Error("Expected wallpaper ratio option");
    await user.click(wallpaperOption);
    await user.click(screen.getByRole("button", { name: "Tải về" }));

    await waitFor(() => {
      expect(toPngMock).toHaveBeenCalledWith(
        screen.getByTestId("vision-board-canvas"),
        expect.objectContaining({ canvasWidth: 1080, canvasHeight: 1920 }),
      );
    });
  });
});
