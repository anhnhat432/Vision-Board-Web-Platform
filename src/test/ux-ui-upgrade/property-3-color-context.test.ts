/**
 * Property-Based Test — Property 3: Phân vùng ngữ cảnh màu
 * (Execution ↔ Reflection) — task 6.5.
 *
 * "For any phần tử giao diện thuộc `Execution_Context`, tập token nó dùng cho
 *  hành động/tiến độ không giao với nhóm warm (`app-warm-*` / `--reflection-*` /
 *  `app-focus-ring-warm`); và for any phần tử thuộc `Reflection_Context`, tập
 *  token dùng cho hành động/tiến độ không giao với nhóm accent (`app-accent-*` /
 *  `app-focus-ring` non-warm). `app-status-*` và các neutral
 *  (`app-bg`/`app-surface`/`app-ink`/`app-line`/`app-muted`/`app-radius`/
 *  `app-shadow`/`app-font`) được dùng ở cả hai ngữ cảnh."
 *
 * Validates: Requirements 2.3, 2.4, 2.5, 2.6
 *
 * Mô hình kiểm chứng (pure — không phụ thuộc DOM/React):
 *   - "Node" = một file JSX/TSX thuộc `Core_Flow_Screen`. Danh sách file lấy từ
 *     `resolveCoreFlowFiles()` (xem `token-scan.ts`), giữ nhất quán với phạm vi
 *     đã chốt cho luồng cốt lõi.
 *   - Mỗi node mang:
 *       (a) `context: "execution" | "reflection"` — phân loại theo file path.
 *           Reflection_Context = `src/app/pages/ReflectionJournal*` HOẶC
 *           `src/features/reflection/**` HOẶC basename PascalCase chứa whole-
 *           word `Reflection`/`Journal`. Mọi file còn lại là Execution. KHÔNG
 *           match `Review` (false-positive với `ReviewStep` setup-time và
 *           `Preview`).
 *       (b) `tokens: Set<string>` — tập token rút từ source: các tham chiếu
 *           dạng `app-*` (Tailwind utility hoặc CSS var) và `var(--reflection-*)`.
 *   - Property: với mọi node, tập token KHÔNG giao tập token "nghịch ngữ cảnh":
 *       Execution: cấm `app-warm[-*]`, `reflection-*`, `app-focus-ring-warm`.
 *       Reflection: cấm `app-accent[-*]`, `app-focus-ring` (non-warm).
 *
 * Generator: chọn một node bất kỳ trong tập node (`fc.constantFrom`),
 * `numRuns ≥ 100`. Test thuần — không render DOM, không I/O ngoài đọc file
 * source ở module scope (đã đọc một lần khi build danh sách node).
 *
 * Lưu ý phạm vi chỉ đọc:
 *   - Test chỉ kiểm chứng bất biến phân vùng. Khi phát hiện vi phạm, nó dừng ở
 *     tầng test và KHÔNG sửa product code (task 6.3 phụ trách migrate). Thông
 *     điệp lỗi liệt kê file + token nghịch ngữ cảnh cụ thể để truy vết.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { DEFAULT_REPO_ROOT, resolveCoreFlowFiles } from "./token-scan";

const PROPERTY_TAG = "Feature: ux-ui-upgrade, Property 3: Phân vùng ngữ cảnh màu (Execution ↔ Reflection)";

// ─────────────────────────────────────────────────────────────
// Domain types
// ─────────────────────────────────────────────────────────────

type Context = "execution" | "reflection";

interface ScreenNode {
  /** Đường dẫn tuyệt đối (đã chuẩn hoá). */
  filePath: string;
  /** Đường dẫn tương đối repo root, dùng cho thông điệp lỗi ổn định. */
  relativePath: string;
  /** Phân loại ngữ cảnh theo file path (xem `classifyContext`). */
  context: Context;
  /** Tập token rút từ source (Tailwind utility + CSS var). */
  tokens: ReadonlySet<string>;
}

// ─────────────────────────────────────────────────────────────
// Phân loại ngữ cảnh theo file path
// ─────────────────────────────────────────────────────────────

/**
 * Quy tắc (rút từ task 6.5 + FUP-1 + design.md → Color Context Map):
 *   Reflection_Context = Reflection Journal page (`src/app/pages/ReflectionJournal*`)
 *   và mọi module dưới `src/features/reflection/**`. Tất cả còn lại là Execution.
 *
 *   Heuristic tên file PHẢI tránh hai loại false-positive đã ghi nhận trong FUP-1:
 *     - `ReviewStep.tsx` ở SMART Goal / 12-Week setup là review-time setup
 *       (Execution), KHÔNG phải Reflection journal.
 *     - `Preview` chứa substring `review` → cần match whole-word PascalCase, KHÔNG
 *       được match substring tự do.
 *
 *   Vì vậy chỉ chấp nhận hai từ khoá whole-word PascalCase trong basename:
 *   `Reflection` và `Journal`. Match tại đầu basename, sau ký tự không-chữ-cái,
 *   hoặc theo sau bởi chữ hoa khác / kết thúc — đảm bảo bắt `ReflectionJournal`,
 *   `WeeklyReflection`, `JournalEntry`, đồng thời loại `Preview`, `ReviewStep`.
 */
function classifyContext(relativePath: string): Context {
  const norm = relativePath.replace(/\\/g, "/");
  const lower = norm.toLowerCase();
  if (lower.startsWith("src/features/reflection/")) {
    return "reflection";
  }
  if (norm.startsWith("src/app/pages/ReflectionJournal")) {
    return "reflection";
  }
  const baseWithExt = norm.split("/").pop() ?? "";
  const base = baseWithExt.replace(/\.[^.]+$/, "");
  if (/(?:^|[^A-Za-z])(?:Reflection|Journal)(?:[A-Z]|[^A-Za-z]|$)/.test(base)) {
    return "reflection";
  }
  return "execution";
}

// ─────────────────────────────────────────────────────────────
// Trích token từ source JSX/TSX
// ─────────────────────────────────────────────────────────────

/**
 * Khớp mọi chuỗi `app-*` xuất hiện ở vị trí Tailwind utility (`bg-app-accent`,
 * `focus-visible:ring-app-warm`...) hoặc CSS var (`var(--app-...)`). Word
 * boundary `\b` ở đầu hoạt động đúng cho cả hai nhờ ranh giới giữa `-`/`(` (non-
 * word) và `a` (word).
 *
 * Lưu ý greedy `[a-z0-9-]*` dừng tại các ký tự kết thúc Tailwind hợp lệ như
 * `/` (opacity modifier), khoảng trắng, dấu nháy, `)` v.v. — đảm bảo tách đúng
 * token gốc, ví dụ `app-warm-soft/30` → `app-warm-soft`.
 */
const APP_TOKEN_RE = /\bapp-[a-z][a-z0-9-]*/g;

/**
 * Token `--reflection-*` chỉ được tiêu thụ qua `var(--reflection-X)` (Tailwind
 * config không expose namespace `reflection-*`). Hạn chế match trong `var(...)`
 * tránh false positive với HTML id/class như `id="reflection-content"`.
 */
const REFLECTION_VAR_RE = /var\(\s*--(reflection-[a-z][a-z0-9-]*)/g;

function extractTokens(source: string): Set<string> {
  const tokens = new Set<string>();
  for (const match of source.matchAll(APP_TOKEN_RE)) {
    tokens.add(match[0]);
  }
  for (const match of source.matchAll(REFLECTION_VAR_RE)) {
    tokens.add(match[1]);
  }
  return tokens;
}

// ─────────────────────────────────────────────────────────────
// Phân loại token: nhóm warm / accent / neutral
// ─────────────────────────────────────────────────────────────

/** `app-warm`, `app-warm-soft`, `app-warm-strong`, `app-warm-border`,... */
function isWarmToken(name: string): boolean {
  return name === "app-warm" || name.startsWith("app-warm-");
}

/** Bất kỳ token nào tiền tố `reflection-` (chỉ token, không phải HTML id). */
function isReflectionScopedToken(name: string): boolean {
  return name.startsWith("reflection-");
}

/** Focus ring warm — Reflection-only theo Requirement 4.4. */
function isFocusRingWarm(name: string): boolean {
  return name === "app-focus-ring-warm";
}

/** `app-accent`, `app-accent-hover`, `app-accent-active`, `app-accent-soft`,... */
function isAccentToken(name: string): boolean {
  return name === "app-accent" || name.startsWith("app-accent-");
}

/** Focus ring (non-warm) — Execution-only theo design (Reflection dùng warm). */
function isFocusRingNonWarm(name: string): boolean {
  return name === "app-focus-ring";
}

/** Token nghịch ngữ cảnh đối với Execution_Context (Requirement 2.5). */
function forbiddenForExecution(name: string): boolean {
  return isWarmToken(name) || isReflectionScopedToken(name) || isFocusRingWarm(name);
}

/** Token nghịch ngữ cảnh đối với Reflection_Context (Requirement 2.6). */
function forbiddenForReflection(name: string): boolean {
  return isAccentToken(name) || isFocusRingNonWarm(name);
}

// ─────────────────────────────────────────────────────────────
// Build danh sách node một lần ở module scope
// ─────────────────────────────────────────────────────────────

function buildNodes(): ScreenNode[] {
  const files = resolveCoreFlowFiles();
  return files.map((filePath) => {
    const relativePath = path.relative(DEFAULT_REPO_ROOT, filePath).split(path.sep).join("/");
    const source = readFileSync(filePath, "utf8");
    return {
      filePath,
      relativePath,
      context: classifyContext(relativePath),
      tokens: extractTokens(source),
    };
  });
}

const NODES: ReadonlyArray<ScreenNode> = buildNodes();

// ─────────────────────────────────────────────────────────────
// Helpers báo cáo vi phạm
// ─────────────────────────────────────────────────────────────

function findOpposingTokens(node: ScreenNode): string[] {
  const isForbidden = node.context === "execution" ? forbiddenForExecution : forbiddenForReflection;
  return [...node.tokens].filter(isForbidden).sort();
}

function describeContextRule(context: Context): string {
  return context === "execution"
    ? "Execution không dùng app-warm-*, reflection-*, app-focus-ring-warm"
    : "Reflection không dùng app-accent-*, app-focus-ring (non-warm)";
}

// ─────────────────────────────────────────────────────────────
// Property 3
// ─────────────────────────────────────────────────────────────

describe("Property 3 — Phân vùng ngữ cảnh màu (task 6.5)", () => {
  it("Core_Flow_Screen list không rỗng và có ít nhất một node Reflection (sanity)", () => {
    expect(NODES.length).toBeGreaterThan(0);
    expect(NODES.some((n) => n.context === "reflection")).toBe(true);
    expect(NODES.some((n) => n.context === "execution")).toBe(true);
  });

  it(PROPERTY_TAG, () => {
    fc.assert(
      fc.property(fc.constantFrom(...NODES), (node) => {
        const offending = findOpposingTokens(node);
        if (offending.length > 0) {
          throw new Error(
            `Phân vùng ngữ cảnh màu vi phạm tại "${node.relativePath}" (context=${node.context}):\n` +
              `  - Token nghịch ngữ cảnh: ${offending.join(", ")}\n` +
              `  - Quy tắc: ${describeContextRule(node.context)}`,
          );
        }
      }),
      { numRuns: 100 },
    );
  });

  it("toàn bộ Core_Flow_Screen tuân thủ phân vùng (deterministic enumeration)", () => {
    const violations: Array<{
      relativePath: string;
      context: Context;
      offending: string[];
    }> = [];
    for (const node of NODES) {
      const offending = findOpposingTokens(node);
      if (offending.length > 0) {
        violations.push({
          relativePath: node.relativePath,
          context: node.context,
          offending,
        });
      }
    }
    if (violations.length > 0) {
      const report = violations.map((v) => `  ${v.relativePath} [${v.context}]: ${v.offending.join(", ")}`).join("\n");
      throw new Error(`Có ${violations.length} file vi phạm phân vùng ngữ cảnh màu:\n${report}`);
    }
  });
});
