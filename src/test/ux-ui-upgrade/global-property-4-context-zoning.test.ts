/**
 * Property-Based Test — Property 4: Phân vùng ngữ cảnh màu (warm-as-accent chỉ
 * trong Reflection).
 *
 * Feature: global-ui-upgrade, Property 4: Phân vùng ngữ cảnh màu (warm chỉ trong Reflection).
 *
 * "For any file/khối style KHÔNG thuộc Reflection_Context (Execution / Goal /
 *  Plan / Neutral), không tham chiếu token warm (`--app-warm*`, `--reflection-*`,
 *  `--app-focus-ring-warm`) VỚI VAI TRÒ accent/brand; và chiều ngược lại token
 *  warm-as-accent chỉ được tiêu thụ trong Reflection_Context."
 *
 * Validates: Requirements 1.4
 *
 * ── Diễn giải tinh chỉnh Req 1.4 (option 2A) — đọc kỹ trước khi sửa ───────────
 *
 * Bản gốc của bất biến này cấm MỌI tham chiếu warm ngoài Reflection. Khi chạy
 * thực tế trên cây nguồn, có ~34 file ngoài Reflection tham chiếu `--app-warm*`.
 * Điều tra (task 5.5) cho thấy họ Terracotta/warm được dùng TOÀN APP như **bảng
 * màu TRẠNG THÁI danger/warning/error/status affordance** — KHÔNG phải accent
 * trang trí/thương hiệu. Ví dụ: `ui/badge` (variant destructive), `ui/field-error`,
 * `ui/sonner` (toast error), `EmailVerificationBanner`, `SyncStatusPill`
 * (offline/error), các bề mặt billing/order/settings, và các nhắc-nhở
 * rescue/overdue trong 12-week.
 *
 * → Người dùng đã tinh chỉnh Req 1.4 (option 2A): **warm bị cấm CHỈ khi dùng làm
 *   accent/brand; ĐƯỢC PHÉP khi dùng cho danger/warning/error/status affordance.**
 *   Reflection vẫn là nơi DUY NHẤT warm được dùng làm brand/accent tone.
 *   (requirements.md / design.md sẽ được cập nhật riêng để ghi lại tinh chỉnh này.)
 *
 * ── Cách encode bất biến đã tinh chỉnh ───────────────────────────────────────
 *
 * Mô hình kiểm chứng (pure — không phụ thuộc DOM/React):
 *   - "Node" = một file `.ts`/`.tsx` (không phải test) dưới hai gốc tầng tiêu thụ:
 *       `src/app/components/**` và `src/app/pages/**`.
 *   - Mỗi node mang:
 *       (a) `context: "reflection" | "other"` — phân loại theo file path/basename
 *           (xem `classifyContext`). Reflection_Context theo Glossary requirements
 *           là "Nhóm màn hình Reflection/Review" — nơi DUY NHẤT warm-as-accent hợp lệ.
 *       (b) `warmRefs: WarmReference[]` — mọi tham chiếu token warm rút từ source
 *           (`app-warm[-*]` Tailwind/var, `var(--reflection-*)`,
 *           `app-focus-ring-warm`) kèm số dòng để truy vết.
 *   - Để tách "warm-as-status" (được phép) khỏi "warm-as-accent" (bị cấm), test
 *     dùng **ALLOWLIST tường minh cấp file** (`WARM_AS_STATUS_ALLOWLIST`) — đóng
 *     băng đúng tập file status/danger đã điều tra ở trên. Cùng pattern
 *     allowlist + stale-entry hygiene với `global-property-3-no-drift.test.ts`.
 *   - Property: với MỌI node `context = "other"` KHÔNG nằm trong allowlist,
 *     `warmRefs` PHẢI rỗng. Node "other" trong allowlist được miễn (warm dùng cho
 *     status). Node "reflection" luôn được phép (warm-as-accent hợp lệ).
 *
 * Đây KHÔNG phải no-op và KHÔNG suppress im lặng: một file MỚI ngoài Reflection
 * dùng warm làm accent trang trí (không có trong allowlist) sẽ VẪN FAIL và in ra
 * file + token warm + dòng cụ thể. Nếu file đó thực sự là status/danger, phải
 * thêm vào allowlist kèm chú thích vai trò — buộc review có chủ đích.
 *
 * Generator: chọn một node bất kỳ (`fc.constantFrom`), `numRuns ≥ 100`. Test
 * thuần — chỉ I/O đọc file source ở module scope (đọc một lần khi build node).
 *
 * Phạm vi chỉ đọc: test CHỈ kiểm chứng bất biến phân vùng và KHÔNG sửa product
 * code.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { DEFAULT_REPO_ROOT } from "./token-scan";

const PROPERTY_TAG =
  "Feature: global-ui-upgrade, Property 4: Phân vùng ngữ cảnh màu (warm chỉ trong Reflection)";

// ─────────────────────────────────────────────────────────────
// Domain types
// ─────────────────────────────────────────────────────────────

type Context = "reflection" | "other";

interface WarmReference {
  /** Token warm khớp được, ví dụ `app-warm-soft`, `reflection-btn-bg`. */
  token: string;
  /** Dòng (1-indexed) nơi token xuất hiện. */
  line: number;
}

interface ConsumerNode {
  /** Đường dẫn tương đối repo root (dùng slash), ổn định khi báo cáo. */
  relativePath: string;
  /** Phân loại ngữ cảnh theo file path/basename (xem `classifyContext`). */
  context: Context;
  /** Mọi tham chiếu token warm rút từ source. */
  warmRefs: ReadonlyArray<WarmReference>;
}

// ─────────────────────────────────────────────────────────────
// Gốc quét tầng tiêu thụ (Requirement 1.4 — consumer layer)
// ─────────────────────────────────────────────────────────────

const CONSUMER_ROOTS: readonly string[] = ["src/app/components", "src/app/pages"];

const SCANNABLE_EXTENSIONS = new Set([".ts", ".tsx"]);

function isTestLikeFile(filePath: string): boolean {
  return /\.(test|spec|stories)\.[jt]sx?$/.test(filePath);
}

function isScannableFile(filePath: string): boolean {
  return SCANNABLE_EXTENSIONS.has(path.extname(filePath)) && !isTestLikeFile(filePath);
}

/** Duyệt đệ quy một thư mục (bỏ qua `node_modules`), trả file có thể quét. */
function collectFilesFromDir(dir: string): string[] {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry === "node_modules") continue;
    const full = path.join(dir, entry);
    let stat: ReturnType<typeof statSync>;
    try {
      stat = statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      out.push(...collectFilesFromDir(full));
    } else if (isScannableFile(full)) {
      out.push(full);
    }
  }
  return out;
}

/** Phân giải `CONSUMER_ROOTS` thành danh sách file tuyệt đối đã sort + dedupe. */
function resolveConsumerFiles(repoRoot: string = DEFAULT_REPO_ROOT): string[] {
  const files = new Set<string>();
  for (const rel of CONSUMER_ROOTS) {
    const abs = path.resolve(repoRoot, rel);
    let stat: ReturnType<typeof statSync>;
    try {
      stat = statSync(abs);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      for (const f of collectFilesFromDir(abs)) files.add(f);
    } else if (isScannableFile(abs)) {
      files.add(abs);
    }
  }
  return [...files].sort();
}

// ─────────────────────────────────────────────────────────────
// Phân loại ngữ cảnh theo file path/basename
// ─────────────────────────────────────────────────────────────

/**
 * Reflection_Context theo Glossary (requirements.md): "Nhóm màn hình
 * Reflection/Review, nơi DUY NHẤT được dùng token warm/*". Vì vậy một node là
 * Reflection nếu path/basename chỉ báo một trong ba nhóm:
 *   - Reflection Journal (`ReflectionJournal*`) hoặc module dưới
 *     `src/features/reflection/**` (không nằm trong gốc quét nhưng giữ để chắc).
 *   - Basename chứa whole-word PascalCase `Reflection` hoặc `Journal`.
 *   - Basename chứa whole-word PascalCase `Review` (ví dụ `WeeklyReviewSummary`),
 *     NGOẠI TRỪ `ReviewStep` (bước review-time trong SMART/12-Week setup =
 *     Execution) và `Preview` (không phải `Review` PascalCase).
 *
 * Mọi file còn lại là `"other"` (Execution / Goal / Plan / Neutral).
 */
function classifyContext(relativePath: string): Context {
  const norm = relativePath.replace(/\\/g, "/");
  const lower = norm.toLowerCase();
  if (lower.includes("/reflection/") || lower.startsWith("src/features/reflection/")) {
    return "reflection";
  }
  const baseWithExt = norm.split("/").pop() ?? "";
  const base = baseWithExt.replace(/\.[^.]+$/, "");
  // Reflection / Journal whole-word PascalCase.
  if (/(?:^|[^A-Za-z])(?:Reflection|Journal)(?:[A-Z]|[^A-Za-z]|$)/.test(base)) {
    return "reflection";
  }
  // Review whole-word PascalCase (theo sau bởi chữ hoa khác hoặc hết segment),
  // loại `ReviewStep` (Execution). `Preview` không match vì `Review` cần chữ R
  // hoa (Pre-view → 'r' thường).
  if (/Review(?=[A-Z]|$)/.test(base) && !/ReviewStep/.test(base)) {
    return "reflection";
  }
  return "other";
}

// ─────────────────────────────────────────────────────────────
// Trích tham chiếu token warm từ source
// ─────────────────────────────────────────────────────────────

/**
 * `app-warm`, `app-warm-soft`, `app-warm-border`, `app-warm-hover`,
 * `app-warm-strong`... ở vị trí Tailwind utility (`bg-app-warm-soft`,
 * `shadow-app-warm/25`) hoặc CSS var fragment (`var(--app-warm)`). Ranh giới
 * `\b` đầu hoạt động nhờ ký tự trước (`-`, `(`, khoảng trắng) là non-word.
 */
const APP_WARM_RE = /\bapp-warm(?:-[a-z0-9]+)*/g;

/** Focus ring warm — Reflection-only theo Requirement 5.3 / design I4. */
const APP_FOCUS_RING_WARM_RE = /\bapp-focus-ring-warm\b/g;

/**
 * Token `--reflection-*` chỉ tính khi tiêu thụ qua `var(--reflection-X)`
 * (Tailwind config không expose namespace `reflection-*`). Hạn chế trong
 * `var(...)` tránh false positive với HTML id/attr như `data-reflection-section`
 * hay `id="reflection-prompt-heading"`.
 */
const REFLECTION_VAR_RE = /var\(\s*--(reflection-[a-z][a-z0-9-]*)/g;

function extractWarmReferences(source: string): WarmReference[] {
  const refs: WarmReference[] = [];
  const lines = source.split(/\r\n|\r|\n/);
  lines.forEach((lineText, index) => {
    const lineNo = index + 1;
    for (const re of [APP_WARM_RE, APP_FOCUS_RING_WARM_RE]) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null = re.exec(lineText);
      while (m !== null) {
        refs.push({ token: m[0], line: lineNo });
        if (m.index === re.lastIndex) re.lastIndex += 1;
        m = re.exec(lineText);
      }
    }
    REFLECTION_VAR_RE.lastIndex = 0;
    let r: RegExpExecArray | null = REFLECTION_VAR_RE.exec(lineText);
    while (r !== null) {
      refs.push({ token: r[1], line: lineNo });
      r = REFLECTION_VAR_RE.exec(lineText);
    }
  });
  return refs;
}

// ─────────────────────────────────────────────────────────────
// Build danh sách node một lần ở module scope
// ─────────────────────────────────────────────────────────────

function buildNodes(): ConsumerNode[] {
  const files = resolveConsumerFiles();
  return files.map((filePath) => {
    const relativePath = path.relative(DEFAULT_REPO_ROOT, filePath).split(path.sep).join("/");
    return {
      relativePath,
      context: classifyContext(relativePath),
      warmRefs: extractWarmReferences(readFileSync(filePath, "utf8")),
    };
  });
}

const NODES: ReadonlyArray<ConsumerNode> = buildNodes();

// ─────────────────────────────────────────────────────────────
// ALLOWLIST — file ngoài Reflection dùng warm cho STATUS (không phải accent)
// ─────────────────────────────────────────────────────────────

/**
 * Mỗi entry là `relativePath` (dùng slash) của file ngoài Reflection_Context mà
 * warm được tiêu thụ với vai trò **danger/warning/error/status affordance** — hợp
 * lệ theo Req 1.4 (option 2A). Đây là kết quả điều tra task 5.5 trên đúng ~34
 * file mà scanner bắt được. Granularity cấp file: quyết định "file này dùng warm
 * cho status" mang tính ngữ nghĩa cấp file, nên miễn cả file (mọi biến thể
 * `app-warm*` trong file đó phục vụ cùng vai trò status palette).
 *
 * Guard: bất kỳ file MỚI ngoài Reflection dùng warm mà KHÔNG có trong danh sách
 * này sẽ FAIL (kể cả khi là accent trang trí) → buộc review có chủ đích. Nếu dọn
 * xong warm ở một file, xoá entry tương ứng (hygiene-check bên dưới bắt entry
 * "chết").
 */
const WARM_AS_STATUS_ALLOWLIST: readonly string[] = [
  // ── Status primitives dùng chung (danger/error affordance) ──
  "src/app/components/ui/badge.tsx", // variant "destructive"
  "src/app/components/ui/field-error.tsx", // thông báo lỗi form
  "src/app/components/ui/sonner.tsx", // toast error
  // ── Banner / pill trạng thái toàn cục ──
  "src/app/components/root-layout/EmailVerificationBanner.tsx", // cảnh báo chưa xác thực email
  "src/app/components/root-layout/SyncStatusPill.tsx", // trạng thái offline/error sync
  // ── Xác nhận hành động phá huỷ / nhắc nhở khẩn ──
  "src/app/components/twelve-week/DeleteDataConfirmationDialog.tsx", // xoá dữ liệu (danger)
  "src/app/components/twelve-week/TwelveWeekRescueNudge.tsx", // rescue/overdue nudge
  "src/app/components/UpgradePaywallDialog.impl.tsx", // cảnh báo giới hạn/paywall
  "src/app/components/NewUserGuide.tsx", // callout cảnh báo trong hướng dẫn
  "src/app/components/celebration/MilestoneToast.tsx", // toast trạng thái
  "src/app/components/layout/PrimaryActionCard.tsx", // trạng thái warning của action card
  // ── 12-week: trạng thái tiến độ / cảnh báo lệch kế hoạch ──
  "src/app/components/twelve-week/NextWeekCommitmentsEditor.tsx",
  "src/app/components/twelve-week/ProgressSummaryCard.tsx",
  "src/app/components/twelve-week/TwelveWeekDeviceDetailsSection.tsx",
  "src/app/components/twelve-week/TwelveWeekEmotionFlow.tsx",
  "src/app/components/twelve-week/TwelveWeekInsightsCard.tsx",
  "src/app/components/twelve-week/TwelveWeekLocalStatusSection.tsx",
  "src/app/components/twelve-week/TwelveWeekNextWeekRecommendationCard.tsx",
  "src/app/components/twelve-week/TwelveWeekPlanAccessSection.tsx",
  "src/app/components/twelve-week/TwelveWeekPremiumInsightSection.tsx",
  "src/app/components/twelve-week/TwelveWeekProgressTab.tsx",
  "src/app/components/twelve-week/TwelveWeekSettingsTab.tsx",
  "src/app/components/twelve-week/TwelveWeekTodayTab.tsx",
  "src/app/components/twelve-week/WeeklyEmptyFuture.tsx",
  "src/app/components/twelve-week/ZenJourneyMap.tsx",
  // ── Vision board: chip/renderer trạng thái ──
  "src/app/components/visionBoard/GoalCardChip.tsx",
  "src/app/components/visionBoard/VisionBoardItemRenderer.tsx",
  // ── Billing / order / settings: trạng thái giao dịch & cảnh báo ──
  "src/app/pages/BillingCheckoutQR.tsx",
  "src/app/pages/BillingConfirm.tsx",
  "src/app/pages/BillingFAQPage.tsx",
  "src/app/pages/OrderStatusPage.tsx",
  "src/app/pages/SettingsPage.tsx",
  "src/app/pages/VisionBoardEditor.tsx",
  "src/app/pages/VisionBoardGallery.tsx",
];

const WARM_AS_STATUS_ALLOWLIST_SET = new Set<string>(WARM_AS_STATUS_ALLOWLIST);

/** Node bị coi là vi phạm accent-zoning: ngoài Reflection, có warm, không allowlist. */
function isAccentZoningViolation(node: ConsumerNode): boolean {
  return (
    node.context === "other" &&
    node.warmRefs.length > 0 &&
    !WARM_AS_STATUS_ALLOWLIST_SET.has(node.relativePath)
  );
}

// ─────────────────────────────────────────────────────────────
// Helpers báo cáo vi phạm
// ─────────────────────────────────────────────────────────────

function formatWarmRefs(refs: ReadonlyArray<WarmReference>): string {
  // Gom theo token → danh sách dòng, sort để signature ổn định.
  const byToken = new Map<string, number[]>();
  for (const { token, line } of refs) {
    const arr = byToken.get(token) ?? [];
    arr.push(line);
    byToken.set(token, arr);
  }
  return [...byToken.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([token, ls]) => `${token} (dòng ${[...new Set(ls)].sort((x, y) => x - y).join(", ")})`)
    .join("; ");
}

// ─────────────────────────────────────────────────────────────
// Property 4
// ─────────────────────────────────────────────────────────────

describe("Property 4 — Phân vùng ngữ cảnh màu (warm chỉ trong Reflection) [task 5.5]", () => {
  it("danh sách node tầng tiêu thụ không rỗng và có cả hai ngữ cảnh (sanity)", () => {
    expect(NODES.length).toBeGreaterThan(0);
    expect(NODES.some((n) => n.context === "reflection")).toBe(true);
    expect(NODES.some((n) => n.context === "other")).toBe(true);
  });

  it("extractor bắt được ít nhất một tham chiếu warm trong Reflection_Context (sanity extractor)", () => {
    const reflectionWithWarm = NODES.filter((n) => n.context === "reflection" && n.warmRefs.length > 0);
    expect(reflectionWithWarm.length).toBeGreaterThan(0);
  });

  it("allowlist warm-as-status không chứa entry đã 'chết' (hygiene — giữ tối giản)", () => {
    // Mỗi entry allowlist phải ứng với một node "other" đang thực sự tham chiếu
    // warm. Nếu file đã dọn sạch warm (hoặc đổi tên / chuyển sang Reflection),
    // entry trở nên vô nghĩa và phải xoá.
    const activeOtherWithWarm = new Set(
      NODES.filter((n) => n.context === "other" && n.warmRefs.length > 0).map((n) => n.relativePath),
    );
    const stale = WARM_AS_STATUS_ALLOWLIST.filter((rel) => !activeOtherWithWarm.has(rel));
    expect(
      stale,
      stale.length === 0
        ? ""
        : "Allowlist có entry không còn khớp warm-ref nào (đã dọn xong / đổi phân loại?). " +
            `Hãy xoá khỏi WARM_AS_STATUS_ALLOWLIST để giữ tối giản:\n${stale.join("\n")}`,
    ).toEqual([]);
  });

  it(PROPERTY_TAG, () => {
    fc.assert(
      fc.property(fc.constantFrom(...NODES), (node) => {
        if (isAccentZoningViolation(node)) {
          throw new Error(
            `Phân vùng ngữ cảnh màu vi phạm tại "${node.relativePath}" (context=other):\n` +
              `  - Tham chiếu token warm với vai trò accent/brand (chỉ hợp lệ trong Reflection_Context): ${formatWarmRefs(node.warmRefs)}\n` +
              `  - Quy tắc (Requirement 1.4, option 2A): file ngoài Reflection không dùng --app-warm*, --reflection-*, --app-focus-ring-warm LÀM ACCENT/BRAND.\n` +
              `  - Nếu warm ở đây phục vụ danger/warning/error/status affordance, thêm "${node.relativePath}" vào WARM_AS_STATUS_ALLOWLIST kèm chú thích vai trò.`,
          );
        }
      }),
      { numRuns: 100 },
    );
  });

  it("liệt kê đầy đủ file vi phạm accent-zoning ngoài allowlist (deterministic enumeration)", () => {
    const violations = NODES.filter(isAccentZoningViolation);
    if (violations.length > 0) {
      const report = violations
        .map((v) => `  ${v.relativePath}: ${formatWarmRefs(v.warmRefs)}`)
        .join("\n");
      throw new Error(
        `Có ${violations.length} file ngoài Reflection_Context tham chiếu token warm KHÔNG có trong allowlist ` +
          `(nghi accent/brand — Req 1.4 option 2A):\n${report}\n` +
          "→ Chuyển sang token neutral/forest phù hợp, hoặc nếu là status/danger hợp lệ thì thêm vào WARM_AS_STATUS_ALLOWLIST.",
      );
    }
  });
});
