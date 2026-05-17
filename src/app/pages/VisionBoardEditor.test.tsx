import type React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { VisionBoardItem } from "@/app/utils/storage-types";
import { VisionBoardEditor } from "./VisionBoardEditor";

const authContextMock = vi.hoisted(() => ({
  useAuthContext: vi.fn(),
}));

const storageMock = vi.hoisted(() => ({
  addVisionBoard: vi.fn(),
  calculateGoalProgress: vi.fn((goal: { progress?: number }) => goal.progress ?? 0),
  getCurrentPlan: vi.fn(() => "FREE"),
  getUserData: vi.fn(),
  updateVisionBoard: vi.fn(),
}));

vi.mock("@/lib/auth/AuthContext", () => ({
  useAuthContext: authContextMock.useAuthContext,
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

vi.mock("../components/visionBoard/VisionBoardCanvas", () => ({
  VisionBoardCanvas: ({ items, emptyStateSlot }: { items: VisionBoardItem[]; emptyStateSlot?: React.ReactNode }) => (
    <div data-testid="vision-board-canvas">
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
  await user.click(await screen.findByRole("button", { name: "Bắt đầu Story Mode" }));
}

function getCanvasItems(): VisionBoardItem[] {
  return JSON.parse(screen.getByTestId("canvas-items").textContent ?? "[]") as VisionBoardItem[];
}

describe("VisionBoardEditor add dialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authContextMock.useAuthContext.mockReturnValue({ user: null });
    storageMock.calculateGoalProgress.mockImplementation((goal: { progress?: number }) => goal.progress ?? 0);
    setUserData({ goals: [createGoal({ id: "goal_1" }), createGoal({ id: "goal_2", title: "Ngủ sâu hơn" })] });
  });

  it("renders four add tabs", async () => {
    const user = userEvent.setup();
    renderEditor();

    await openAddDialog(user);

    expect(screen.getAllByRole("tab")).toHaveLength(4);
    expect(screen.getByRole("tab", { name: /Mục tiêu/ })).toBeInTheDocument();
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
      expect.objectContaining({ type: "goal_card", content: "goal_1", lifeAreaId: "Health", style: { sizePreset: "M" } }),
    );
  });

  it("applies selected life area and image frame to URL image items", async () => {
    const user = userEvent.setup();
    renderEditor();

    await openAddDialog(user);
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
    await user.type(screen.getByPlaceholderText("Viết một câu nhắc nhở bạn muốn nhìn thấy mỗi ngày..."), "Tự do là chọn lựa");
    await user.click(screen.getByRole("button", { name: "Thêm câu nói vào bảng" }));

    expect(getCanvasItems()).toContainEqual(
      expect.objectContaining({
        type: "quote",
        content: "Tự do là chọn lựa",
        style: { sizePreset: "L", quoteFont: "handwriting" },
      }),
    );
  });
});
