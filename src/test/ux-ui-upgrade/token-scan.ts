/**
 * Token-compliance scanner cho Core_Flow_Screen (build-time / test-time only).
 *
 * Mục tiêu: quét các file JSX/TSX thuộc luồng cốt lõi (Core_Flow_Screen) + các
 * shared state component được core-flow tiêu thụ, phát hiện hai loại vi phạm
 * Requirement 2.1 ("không sử dụng bất kỳ giá trị màu hard-coded nào"):
 *
 *   1. Hex color literal:           `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`.
 *   2. Primitive Tailwind palette:  `slate-*`, `emerald-*`, `amber-*`, `sky-*`,
 *      `purple-*`, `red-600`, ... (tức `{color}-{shade}` với shade số 50..950).
 *
 * Đây là tiện ích kiểm chứng THUẦN: chỉ ĐỌC file và TRẢ danh sách vi phạm
 * (đường dẫn + dòng + cột + chuỗi khớp). Nó KHÔNG tự sửa product code, không
 * đổi token value, route, hay storage. Các task migrate sau dùng output này.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Loại vi phạm token-compliance. */
export type ViolationKind = "hex-literal" | "primitive-palette";

/** Một vi phạm token-compliance đơn lẻ. */
export interface TokenViolation {
  /** Đường dẫn tuyệt đối tới file chứa vi phạm. */
  filePath: string;
  /** Đường dẫn tương đối so với repo root (ổn định khi báo cáo / so snapshot). */
  relativePath: string;
  /** Dòng (1-indexed). */
  line: number;
  /** Cột (1-indexed) tại ký tự đầu của chuỗi khớp. */
  column: number;
  /** Loại vi phạm. */
  kind: ViolationKind;
  /** Chuỗi token/hex khớp được, ví dụ `bg-slate-100` hoặc `#2a5447`. */
  matched: string;
  /** Trích đoạn dòng nguồn (đã trim) để dễ định vị khi migrate. */
  snippet: string;
}

/** Tên màu của bảng palette nguyên thủy (primitive) trong Tailwind. */
const TAILWIND_PRIMITIVE_COLORS = [
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
] as const;

/**
 * Khớp utility primitive palette dạng `{prefix-}{color}-{shade}`.
 * - `shade` bắt buộc là một bậc Tailwind hợp lệ (50, 100..950) để tránh khớp
 *   nhầm các tên như `green-section`.
 * - Có ranh giới `\b` đầu để không cắt giữa một identifier khác.
 * Lưu ý: regex có cờ `g`, dùng kèm `lastIndex` reset trước mỗi dòng.
 */
const PRIMITIVE_PALETTE_REGEX = new RegExp(
  String.raw`\b(?:[a-z][a-z-]*-)?(?:${TAILWIND_PRIMITIVE_COLORS.join("|")})-(?:50|100|200|300|400|500|600|700|800|900|950)\b`,
  "g",
);

/**
 * Khớp hex color literal: `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`.
 * Ưu tiên độ dài lớn trước để khớp trọn vẹn (8 → 6 → 4 → 3).
 */
const HEX_LITERAL_REGEX = new RegExp(
  String.raw`#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b`,
  "g",
);

/** Repo root suy ra từ vị trí module (src/test/ux-ui-upgrade → ../../..). */
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_REPO_ROOT = path.resolve(MODULE_DIR, "..", "..", "..");

/**
 * Danh sách đường dẫn (file hoặc thư mục) thuộc Core_Flow_Screen + các shared
 * state component được core-flow tiêu thụ. Đường dẫn tương đối so với repo root.
 * Thư mục sẽ được duyệt đệ quy để gom mọi file `.tsx`/`.jsx` (trừ file test).
 */
export const CORE_FLOW_PATHS: readonly string[] = [
  // Onboarding
  "src/app/pages/Onboarding.tsx",
  "src/app/pages/Onboarding",
  // Life Balance
  "src/app/pages/LifeBalance.tsx",
  // Life Insight
  "src/app/pages/LifeInsight.tsx",
  "src/app/pages/LifeInsight",
  // SMART Goal
  "src/app/pages/SMARTGoalSetup.tsx",
  "src/app/pages/SMARTGoalSetup",
  "src/app/pages/AspirationalVision.tsx",
  // Feasibility Check
  "src/app/pages/FeasibilityCheck.tsx",
  "src/app/pages/FeasibilityCheck",
  // 12-Week Setup / System (app-level shell + feature pages)
  "src/app/pages/12WeekSetup",
  "src/features/plan12week/pages",
  // Weekly Execution / Today
  "src/app/pages/GoalTracker.tsx",
  // Reflection / Review
  "src/app/pages/ReflectionJournal.tsx",
  "src/app/pages/ReflectionJournal",
  // Dashboard
  "src/app/pages/Dashboard.tsx",
  "src/features/dashboard",
  // Shared state components tiêu thụ xuyên suốt core-flow
  "src/app/components/states",
];

/** Đuôi file được coi là JSX/TSX để quét. */
const SCANNABLE_EXTENSIONS = new Set([".tsx", ".jsx"]);

/** Bỏ qua file test / story để chỉ quét product UI. */
function isTestFile(filePath: string): boolean {
  return /\.(test|spec|stories)\.[jt]sx?$/.test(filePath);
}

function isScannableFile(filePath: string): boolean {
  return SCANNABLE_EXTENSIONS.has(path.extname(filePath)) && !isTestFile(filePath);
}

/** Duyệt đệ quy một thư mục, trả về danh sách file JSX/TSX có thể quét. */
function collectFilesFromDir(dir: string): string[] {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
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

/**
 * Phân giải `CORE_FLOW_PATHS` (file hoặc thư mục) thành danh sách file tuyệt đối,
 * đã loại file test và đã loại trùng lặp.
 */
export function resolveCoreFlowFiles(
  repoRoot: string = DEFAULT_REPO_ROOT,
  paths: readonly string[] = CORE_FLOW_PATHS,
): string[] {
  const files = new Set<string>();
  for (const rel of paths) {
    const abs = path.resolve(repoRoot, rel);
    let stat: ReturnType<typeof statSync>;
    try {
      stat = statSync(abs);
    } catch {
      // Đường dẫn không tồn tại (ví dụ thư mục tùy chọn) → bỏ qua an toàn.
      continue;
    }
    if (stat.isDirectory()) {
      for (const f of collectFilesFromDir(abs)) {
        files.add(f);
      }
    } else if (isScannableFile(abs)) {
      files.add(abs);
    }
  }
  return [...files].sort();
}

/**
 * Quét nội dung text của một file, trả về danh sách vi phạm.
 * Có thể truyền sẵn `content` để test thuần không cần đọc đĩa.
 */
export function scanContent(
  filePath: string,
  content: string,
  repoRoot: string = DEFAULT_REPO_ROOT,
): TokenViolation[] {
  const violations: TokenViolation[] = [];
  const relativePath = path.relative(repoRoot, filePath).split(path.sep).join("/");
  const lines = content.split(/\r\n|\r|\n/);

  const pushMatches = (regex: RegExp, kind: ViolationKind) => {
    lines.forEach((lineText, index) => {
      regex.lastIndex = 0;
      let match: RegExpExecArray | null = regex.exec(lineText);
      while (match !== null) {
        violations.push({
          filePath,
          relativePath,
          line: index + 1,
          column: match.index + 1,
          kind,
          matched: match[0],
          snippet: lineText.trim(),
        });
        // Tránh vòng lặp vô hạn với khớp rỗng (không xảy ra ở đây, nhưng an toàn).
        if (match.index === regex.lastIndex) {
          regex.lastIndex += 1;
        }
        match = regex.exec(lineText);
      }
    });
  };

  pushMatches(HEX_LITERAL_REGEX, "hex-literal");
  pushMatches(PRIMITIVE_PALETTE_REGEX, "primitive-palette");

  // Sắp xếp theo (line, column) để output ổn định, dễ đọc.
  violations.sort((a, b) => (a.line - b.line) || (a.column - b.column));
  return violations;
}

/** Đọc và quét một file trên đĩa. */
export function scanFile(
  filePath: string,
  repoRoot: string = DEFAULT_REPO_ROOT,
): TokenViolation[] {
  const content = readFileSync(filePath, "utf8");
  return scanContent(filePath, content, repoRoot);
}

/** Kết quả tổng hợp khi quét toàn bộ core-flow. */
export interface ScanReport {
  /** Danh sách file đã quét (tuyệt đối). */
  scannedFiles: string[];
  /** Toàn bộ vi phạm tìm thấy, gộp từ mọi file. */
  violations: TokenViolation[];
  /** Số vi phạm theo từng relativePath, sắp theo số lượng giảm dần. */
  countByFile: Record<string, number>;
  /** Số vi phạm theo loại. */
  countByKind: Record<ViolationKind, number>;
}

/**
 * Quét toàn bộ Core_Flow_Screen (default) hoặc một tập đường dẫn tùy chọn.
 * Trả về báo cáo tổng hợp để các task migrate sau tiêu thụ.
 */
export function scanCoreFlowScreens(
  repoRoot: string = DEFAULT_REPO_ROOT,
  paths: readonly string[] = CORE_FLOW_PATHS,
): ScanReport {
  const scannedFiles = resolveCoreFlowFiles(repoRoot, paths);
  const violations: TokenViolation[] = [];
  for (const file of scannedFiles) {
    violations.push(...scanFile(file, repoRoot));
  }

  const countByFile: Record<string, number> = {};
  const countByKind: Record<ViolationKind, number> = {
    "hex-literal": 0,
    "primitive-palette": 0,
  };
  for (const v of violations) {
    countByFile[v.relativePath] = (countByFile[v.relativePath] ?? 0) + 1;
    countByKind[v.kind] += 1;
  }

  return { scannedFiles, violations, countByFile, countByKind };
}

/**
 * Định dạng báo cáo vi phạm thành chuỗi human-readable (dùng cho assert message
 * hoặc log khi chạy thủ công). Mỗi dòng: `relativePath:line:column [kind] matched`.
 */
export function formatViolations(violations: readonly TokenViolation[]): string {
  if (violations.length === 0) {
    return "No token-compliance violations found.";
  }
  return violations
    .map(
      (v) =>
        `${v.relativePath}:${v.line}:${v.column} [${v.kind}] ${v.matched}`,
    )
    .join("\n");
}
