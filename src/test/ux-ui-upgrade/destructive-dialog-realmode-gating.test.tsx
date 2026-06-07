// Feature: ux-ui-upgrade, Task 9.5: Component test — destructive dialog +
// real-mode gating
//
// Mục tiêu (theo task 9.5):
//   - Trigger destructive → `AlertDialog` mở với hai lựa chọn confirm/cancel
//     (không dùng `window.confirm`).
//   - Hành động không thể hoàn tác → xác nhận hai bước (checkbox + gõ chuỗi
//     `XOACLOUD`); nút action bị vô hiệu hóa cho tới khi cả hai điều kiện
//     đạt được.
//   - Grep tĩnh: KHÔNG có `window.confirm(` trong tập file Core_Flow_Screen.
//   - Real-mode: tập route đăng ký KHÔNG bao gồm các route demo-only
//     (`billing/mock-checkout`, debug/seeder).
//
// Phạm vi: TEST-ONLY. Không chạm product code. Mount đúng `TwelveWeekSystemDialogs`
// đã có trong sản phẩm để khoá hợp đồng UI thật. Wrap bằng `MemoryRouter`
// (vì `UpgradePaywallDialog` dùng `useNavigate`).
//
// Validates: Requirements 9.3, 9.5, 9.2, 9.6

import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { appRoutes } from "@/app/routes";
import { TwelveWeekSystemDialogs } from "@/features/plan12week/pages/12WeekSystem/TwelveWeekSystemDialogs";
import { DEFAULT_REPO_ROOT, resolveCoreFlowFiles } from "./token-scan";

// ─────────────────────────────────────────────────────────────
// 1) Component test — destructive AlertDialog confirm/cancel + two-step
// ─────────────────────────────────────────────────────────────

interface RenderDialogsOptions {
  isResetDialogOpen?: boolean;
  isClearLocalDialogOpen?: boolean;
  isDeleteCloudDialogOpen?: boolean;
  isDeleteDataDialogOpen?: boolean;
  isCloudDeleteConfirmed?: boolean;
}

function renderTwelveWeekDialogs(options: RenderDialogsOptions = {}) {
  const handlers = {
    setIsUpgradeDialogOpen: vi.fn(),
    setIsResetDialogOpen: vi.fn(),
    handleResetCycle: vi.fn(),
    setIsClearLocalDialogOpen: vi.fn(),
    handleClearLocalSignals: vi.fn(),
    setIsDeleteCloudDialogOpen: vi.fn(),
    setIsCloudDeleteConfirmed: vi.fn(),
    handleConfirmDeleteCloudWorkspace: vi.fn(),
    setIsDeleteDataDialogOpen: vi.fn(),
    handleDeleteAllData: vi.fn(),
    handleCheckoutComplete: vi.fn(),
  };

  const utils = render(
    <MemoryRouter>
      <TwelveWeekSystemDialogs
        isUpgradeDialogOpen={false}
        setIsUpgradeDialogOpen={handlers.setIsUpgradeDialogOpen}
        upgradeContext="review"
        activePlanCode="FREE"
        activeGoal={null}
        upgradeRecommendedPlan="PLUS"
        activeTab="settings"
        handleCheckoutComplete={handlers.handleCheckoutComplete}
        isResetDialogOpen={options.isResetDialogOpen ?? false}
        setIsResetDialogOpen={handlers.setIsResetDialogOpen}
        handleResetCycle={handlers.handleResetCycle}
        isClearLocalDialogOpen={options.isClearLocalDialogOpen ?? false}
        setIsClearLocalDialogOpen={handlers.setIsClearLocalDialogOpen}
        handleClearLocalSignals={handlers.handleClearLocalSignals}
        isDeleteCloudDialogOpen={options.isDeleteCloudDialogOpen ?? false}
        setIsDeleteCloudDialogOpen={handlers.setIsDeleteCloudDialogOpen}
        isCloudDeleteConfirmed={options.isCloudDeleteConfirmed ?? false}
        setIsCloudDeleteConfirmed={handlers.setIsCloudDeleteConfirmed}
        handleConfirmDeleteCloudWorkspace={handlers.handleConfirmDeleteCloudWorkspace}
        isDeleteDataDialogOpen={options.isDeleteDataDialogOpen ?? false}
        setIsDeleteDataDialogOpen={handlers.setIsDeleteDataDialogOpen}
        demoMode={false}
        isSignedIn={true}
        handleDeleteAllData={handlers.handleDeleteAllData}
        isDeletingData={false}
      />
    </MemoryRouter>,
  );

  return { ...utils, handlers };
}

describe("Task 9.5 — Destructive AlertDialog mở với hai lựa chọn confirm/cancel (Req 9.3)", () => {
  afterEach(() => {
    cleanup();
  });

  it("Reset chu kỳ 12 tuần (reversible) → AlertDialog với confirm + cancel; không dùng window.confirm", async () => {
    const { handlers } = renderTwelveWeekDialogs({ isResetDialogOpen: true });

    // AlertDialog Radix → có alertdialog role và title.
    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("Làm mới chu kỳ 12 tuần?")).toBeInTheDocument();

    // Hai lựa chọn rõ ràng: cancel (Quay lại) + action danger.
    const cancelBtn = within(dialog).getByRole("button", { name: /Quay lại/ });
    const actionBtn = within(dialog).getByRole("button", { name: /Làm mới từ tuần này/ });
    expect(cancelBtn).toBeInTheDocument();
    expect(actionBtn).toBeInTheDocument();

    // Action button áp token status error (Req 9.1 — task 9.1 đã áp dụng).
    expect(actionBtn.className).toMatch(/bg-app-status-error/);

    // Confirm → gọi handler phá hủy.
    const user = userEvent.setup();
    await user.click(actionBtn);
    expect(handlers.handleResetCycle).toHaveBeenCalledTimes(1);
  });

  it("Reset chu kỳ — Cancel (Quay lại) đóng dialog mà KHÔNG gọi handler phá hủy (Req 9.4)", async () => {
    const { handlers } = renderTwelveWeekDialogs({ isResetDialogOpen: true });
    const dialog = await screen.findByRole("alertdialog");
    const cancelBtn = within(dialog).getByRole("button", { name: /Quay lại/ });

    const user = userEvent.setup();
    await user.click(cancelBtn);

    // Radix AlertDialogCancel triggers onOpenChange(false).
    expect(handlers.setIsResetDialogOpen).toHaveBeenCalledWith(false);
    // Handler phá hủy KHÔNG bao giờ được gọi.
    expect(handlers.handleResetCycle).not.toHaveBeenCalled();
  });

  it("Xóa dấu vết trên thiết bị (reversible) → AlertDialog với confirm + cancel", async () => {
    const { handlers } = renderTwelveWeekDialogs({ isClearLocalDialogOpen: true });

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Xóa dấu vết trên thiết bị này?")).toBeInTheDocument();

    const cancelBtn = within(dialog).getByRole("button", { name: /Giữ lại/ });
    const actionBtn = within(dialog).getByRole("button", { name: /Xóa dấu vết trên thiết bị/ });
    expect(cancelBtn).toBeInTheDocument();
    expect(actionBtn).toBeInTheDocument();
    expect(actionBtn.className).toMatch(/bg-app-status-error/);

    const user = userEvent.setup();
    await user.click(actionBtn);
    expect(handlers.handleClearLocalSignals).toHaveBeenCalledTimes(1);
  });
});

describe("Task 9.5 — Hành động không thể hoàn tác cần xác nhận hai bước (Req 9.5)", () => {
  afterEach(() => {
    cleanup();
  });

  it("Xóa workspace cloud — bước 1: checkbox + bước 2: gõ XOACLOUD; action bị disabled cho tới khi cả hai đạt", async () => {
    // Render với cờ checkbox chưa tick (bước 1 chưa hoàn tất).
    const { handlers } = renderTwelveWeekDialogs({
      isDeleteCloudDialogOpen: true,
      isCloudDeleteConfirmed: false,
    });

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Xóa dữ liệu 12 tuần đã đồng bộ?")).toBeInTheDocument();

    const actionBtn = within(dialog).getByRole("button", { name: /Xóa dữ liệu đã đồng bộ/ });
    const cancelBtn = within(dialog).getByRole("button", { name: /Quay lại/ });
    expect(actionBtn).toBeInTheDocument();
    expect(cancelBtn).toBeInTheDocument();

    // Trạng thái khởi đầu: action DISABLED (cả hai bước đều chưa đạt).
    expect(actionBtn).toBeDisabled();

    // Bước 2 đơn lẻ — gõ XOACLOUD nhưng checkbox vẫn chưa tick → action VẪN disabled.
    const textInput = within(dialog).getByPlaceholderText("XOACLOUD");
    const user = userEvent.setup();
    await user.type(textInput, "XOACLOUD");
    expect(actionBtn).toBeDisabled();

    // Click action vẫn không gọi handler khi disabled.
    await user.click(actionBtn);
    expect(handlers.handleConfirmDeleteCloudWorkspace).not.toHaveBeenCalled();
  });

  it("Xóa workspace cloud — Cancel đóng dialog, KHÔNG xóa dữ liệu (Req 9.4)", async () => {
    const { handlers } = renderTwelveWeekDialogs({
      isDeleteCloudDialogOpen: true,
      isCloudDeleteConfirmed: true,
    });

    const dialog = await screen.findByRole("alertdialog");
    const cancelBtn = within(dialog).getByRole("button", { name: /Quay lại/ });

    const user = userEvent.setup();
    await user.click(cancelBtn);

    expect(handlers.setIsDeleteCloudDialogOpen).toHaveBeenCalledWith(false);
    expect(handlers.handleConfirmDeleteCloudWorkspace).not.toHaveBeenCalled();
  });

  it("Xóa workspace cloud — đủ hai bước (checkbox tick + gõ XOACLOUD) → action ENABLED và confirm gọi handler", async () => {
    const { handlers } = renderTwelveWeekDialogs({
      isDeleteCloudDialogOpen: true,
      isCloudDeleteConfirmed: true, // Bước 1 đã đạt (checkbox tick).
    });

    const dialog = await screen.findByRole("alertdialog");
    const actionBtn = within(dialog).getByRole("button", { name: /Xóa dữ liệu đã đồng bộ/ });

    // Trước khi gõ XOACLOUD: vẫn disabled (mới chỉ bước 1).
    expect(actionBtn).toBeDisabled();

    const textInput = within(dialog).getByPlaceholderText("XOACLOUD");
    const user = userEvent.setup();
    await user.type(textInput, "XOACLOUD");

    // Sau khi đủ hai bước: action ENABLED.
    expect(actionBtn).toBeEnabled();

    await user.click(actionBtn);
    expect(handlers.handleConfirmDeleteCloudWorkspace).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────
// 2) Grep tĩnh — không có window.confirm(...) trong Core_Flow_Screen
// ─────────────────────────────────────────────────────────────

describe("Task 9.5 — Grep: KHÔNG có window.confirm trong Core_Flow_Screen (Req 9.3)", () => {
  it("không có occurrence nào của `window.confirm(` trong tập file core-flow", () => {
    const files = resolveCoreFlowFiles();
    expect(files.length).toBeGreaterThan(0);

    interface Hit {
      relativePath: string;
      line: number;
      snippet: string;
    }

    const hits: Hit[] = [];
    // Match raw `window.confirm(` để bắt cả pattern alias hiếm như `globalThis.confirm`
    // ta KHÔNG match (test này khoá đúng tập đã được kiểm duyệt theo Req 9.3 +
    // AGENTS.md "destructive actions ... must use the in-app `AlertDialog` component,
    // not `window.confirm`").
    const PATTERN = /window\.confirm\s*\(/g;

    for (const file of files) {
      const content = readFileSync(file, "utf8");
      if (!content.includes("window.confirm")) continue;
      const lines = content.split(/\r\n|\r|\n/);
      lines.forEach((line, idx) => {
        PATTERN.lastIndex = 0;
        if (PATTERN.test(line)) {
          hits.push({
            // Đường dẫn tương đối ổn định cho thông điệp lỗi.
            relativePath: file.replace(/\\/g, "/").split("/src/").pop() ?? file,
            line: idx + 1,
            snippet: line.trim(),
          });
        }
      });
    }

    expect(
      hits,
      `Phát hiện ${hits.length} occurrence của \`window.confirm(\` trong core-flow. ` +
        `Theo Requirement 9.3 + AGENTS.md, hành động phá hủy phải dùng AlertDialog. Vi phạm:\n` +
        hits.map((h) => `  src/${h.relativePath}:${h.line}  ${h.snippet}`).join("\n"),
    ).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────
// 3) Real-mode route gating — không đăng ký route demo-only (Req 9.2, 9.6)
// ─────────────────────────────────────────────────────────────

/**
 * Walk đệ quy `appRoutes` để gom toàn bộ tập path đã đăng ký (cả top-level lẫn
 * children). Trả về Set chứa các path string (giữ nguyên prefix `/` ở root).
 */
function collectAllRoutePaths(routes: readonly unknown[]): Set<string> {
  const out = new Set<string>();
  const walk = (entries: readonly unknown[]) => {
    for (const entry of entries) {
      if (!entry || typeof entry !== "object") continue;
      const node = entry as { path?: unknown; children?: unknown };
      if (typeof node.path === "string") {
        out.add(node.path);
      }
      if (Array.isArray(node.children)) {
        walk(node.children);
      }
    }
  };
  walk(routes);
  return out;
}

describe("Task 9.5 — Real-mode route gating (Req 9.2, 9.6)", () => {
  it("appRoutes KHÔNG đăng ký `/billing/mock-checkout` hay biến thể `billing/mock-checkout`", () => {
    const paths = collectAllRoutePaths(appRoutes);

    // Không tồn tại path mock-checkout dưới bất kỳ dạng nào (root hoặc nested).
    const offenders = [...paths].filter((p) => /(?:^\/?)(?:billing\/)?mock-checkout/i.test(p));
    expect(offenders, `Real-mode đang đăng ký route demo-only: ${offenders.join(", ")}`).toEqual([]);
  });

  it("appRoutes KHÔNG chứa bất kỳ route demo-only nào trong tập kiểm duyệt (mock-*, demo-seed*, debug-*, seeder)", () => {
    const paths = collectAllRoutePaths(appRoutes);

    const BANNED_PATTERNS: ReadonlyArray<RegExp> = [
      /(?:^|\/)mock-/i, // /mock-checkout, billing/mock-*
      /(?:^|\/)demo-/i, // /demo-seed, /demo-*
      /(?:^|\/)seeder?(?:[\W_]|$)/i, // /seeder, /demo-seeders
      /(?:^|\/)__debug/i, // /__debug-*
      /\/billing\/mock/i,
    ];

    const offenders = [...paths].filter((p) => BANNED_PATTERNS.some((re) => re.test(p)));
    expect(
      offenders,
      `Real-mode route table chứa các đường dẫn demo-only sau: ${offenders.join(", ") || "(none)"}`,
    ).toEqual([]);
  });

  it("`appRoutes` được khai báo tĩnh (static) — không phân nhánh theo isRealMode/isDemoMode tại thời điểm đăng ký", () => {
    // Đọc trực tiếp source `routes.tsx` và assert KHÔNG có lời gọi
    // `isDemoMode()` / `isRealMode()` trong phần khai báo `appRoutes`.
    // Lý do: gating phải là "static omission" — demo route không được register
    // trong production. Nếu source có nhánh động thì test này sẽ buộc rà soát.
    const routesPath = path.resolve(DEFAULT_REPO_ROOT, "src", "app", "routes.tsx");
    const routesSource = readFileSync(routesPath, "utf8");
    expect(
      routesSource.includes("isDemoMode("),
      "routes.tsx KHÔNG được phân nhánh route theo isDemoMode() — gating phải là static omission",
    ).toBe(false);
    expect(
      routesSource.includes("isRealMode("),
      "routes.tsx KHÔNG được phân nhánh route theo isRealMode() — gating phải là static omission",
    ).toBe(false);
  });

  it("page module `MockBillingCheckout.tsx` tồn tại (cho test/preview), nhưng KHÔNG được wired vào appRoutes", () => {
    // Module tồn tại trong codebase…
    const mockPagePath = path.resolve(DEFAULT_REPO_ROOT, "src", "app", "pages", "MockBillingCheckout.tsx");
    const mockPageSource = readFileSync(mockPagePath, "utf8");
    expect(mockPageSource).toContain("export function MockBillingCheckout");

    // …nhưng routes.tsx KHÔNG import nó.
    const routesPath = path.resolve(DEFAULT_REPO_ROOT, "src", "app", "routes.tsx");
    const routesSource = readFileSync(routesPath, "utf8");
    expect(routesSource).not.toMatch(/MockBillingCheckout/);
    expect(routesSource).not.toMatch(/mock-checkout/i);
  });
});
