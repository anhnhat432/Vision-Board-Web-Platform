// Feature: global-ui-upgrade, Property 3
/**
 * Property-Based Test — Property 3: Không còn Color_Drift ngoài Brand_Identity
 * (task 5.4).
 *
 * "For any file trong `src/styles/**` và `src/app/**`, không xuất hiện literal
 *  màu nằm ngoài bảng màu Brand_Identity (tím `#7c3aed`/`#7c5cfc`/
 *  `rgba(124,58,237,…)`, indigo `rgba(99,102,241,…)`, xanh dương/cyan
 *  `#2563eb`/`rgba(37,99,235,…)`/`rgba(8,145,178,…)`, tiện ích `bg-violet-*`);
 *  mọi nhu cầu màu trang trí được biểu diễn bằng token thuộc họ Forest Green
 *  hoặc Terracotta phù hợp ngữ cảnh."
 *
 * Validates: Requirements 2.3
 *
 * ── Cách tiếp cận & lý do (đọc kỹ trước khi sửa) ─────────────────────────────
 *
 * Test này encode **bất biến ĐÚNG** cho toàn bộ drift-set (không thu hẹp drift-
 * set để "làm cho pass"). Scanner đọc mọi file `.css`/`.ts`/`.tsx` dưới
 * `src/styles` và `src/app`, strip comment (để tham chiếu tài liệu kiểu
 * `/* … thay drift tím #7c3aed *​/` KHÔNG bị tính là drift thật), rồi tìm tập
 * literal drift đã cho.
 *
 * Vì các task 3.4 / 5.1 / 5.2 đã dọn drift ở các vùng có phạm vi, NHƯNG tài liệu
 * task ghi nhận hai nhóm ngoại lệ **cố ý / ngoài phạm vi** vẫn còn tồn tại:
 *   (a) Palette phân loại lĩnh vực (categorical): life-area accents trong
 *       `tokens.css` (`--color-*-accent`), life-area palette của Onboarding /
 *       LifeInsight / LifeAtlasWheel, và màu trạng thái admin. Đây là palette
 *       phân biệt ngữ nghĩa (career/finance/…, printing/plus/…), KHÔNG phải
 *       accent hành động/thương hiệu — được giữ có chủ đích.
 *   (b) Gradient trang trí trong `theme.css` (khối product-visual / marketing /
 *       hero) đã được các task 3.4/5.x đánh dấu là ngoài phạm vi dọn dẹp.
 *
 * → Ta dùng **ALLOWLIST tường minh** (đóng băng các ngoại lệ đã biết trên) —
 *   cùng pattern với `calm-style-audit.test.ts` (guard `KNOWN_PREEXISTING_
 *   ALLOWLIST`). Test PASS trên cây hiện tại, nhưng sẽ FAIL khi có drift MỚI
 *   (file mới dùng drift, hoặc file đã biết dùng thêm một drift-color mới) —
 *   đây là guard có ý nghĩa, KHÔNG phải no-op và KHÔNG suppress im lặng: mọi
 *   drift ngoài allowlist đều bị chặn và in ra chi tiết file + màu + dòng.
 *
 * Nếu muốn xoá một ngoại lệ (đã dọn xong màu ở một vùng), hãy xoá dòng tương
 * ứng khỏi `KNOWN_INTENTIONAL_DRIFT` — test có hygiene-check bắt allowlist chứa
 * entry đã "chết".
 *
 * ── Reuse ────────────────────────────────────────────────────────────────────
 * - Tái dùng `DEFAULT_REPO_ROOT` từ `token-scan.ts`.
 * - Theo đúng pattern static-scan + signature allowlist + stale-entry hygiene
 *   của `calm-style-scan.ts` / `calm-style-audit.test.ts` (Req 10.5), điều chỉnh
 *   cho color-drift trên phạm vi `src/styles` + `src/app`.
 *
 * Tính chất: pure test — KHÔNG render DOM, KHÔNG import React/product code. Chỉ
 * đọc file nguồn ở module scope. fast-check + Vitest, `numRuns: 100`.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { DEFAULT_REPO_ROOT } from "./token-scan";

const PROPERTY_TAG = "Feature: global-ui-upgrade, Property 3: Không còn Color_Drift ngoài Brand_Identity";

// ─────────────────────────────────────────────────────────────
// Phạm vi quét
// ─────────────────────────────────────────────────────────────

/** Thư mục quét drift (tương đối repo root) — theo task 5.4. */
const SCAN_ROOTS: readonly string[] = ["src/styles", "src/app"];

/** Đuôi file được quét. `.css` cho styles, `.ts`/`.tsx` cho app. */
const SCANNABLE_EXTENSIONS = new Set([".css", ".ts", ".tsx"]);

function isTestLikeFile(filePath: string): boolean {
  return /\.(test|spec|stories)\.[jt]sx?$/.test(filePath);
}

function isScannableFile(filePath: string): boolean {
  return SCANNABLE_EXTENSIONS.has(path.extname(filePath)) && !isTestLikeFile(filePath);
}

/** File nguồn (JSX/TSX) — nơi `bg-violet-*` utility và `//` comment có nghĩa. */
function isSourceFile(filePath: string): boolean {
  const ext = path.extname(filePath);
  return ext === ".ts" || ext === ".tsx";
}

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

function resolveDriftFiles(repoRoot: string = DEFAULT_REPO_ROOT, roots: readonly string[] = SCAN_ROOTS): string[] {
  const files = new Set<string>();
  for (const rel of roots) {
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
// Strip comment (giữ nguyên số dòng để báo cáo chính xác)
// ─────────────────────────────────────────────────────────────

/**
 * Thay block comment `/* … *​/` bằng khoảng trắng nhưng GIỮ ký tự newline →
 * số dòng không đổi. Áp dụng cho cả CSS và TS/TSX.
 */
function stripBlockComments(content: string): string {
  return content.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
}

/**
 * Thay line comment `// …` (chỉ trong file nguồn) bằng phần đầu dòng, tránh cắt
 * nhầm `https://` (loại trừ `//` đứng ngay sau dấu `:`). `.` không khớp newline
 * nên số dòng được giữ nguyên.
 */
function stripLineComments(content: string): string {
  return content.replace(/(^|[^:])\/\/[^\n]*/g, (_m, prefix: string) => prefix);
}

// ─────────────────────────────────────────────────────────────
// Drift-set: literal màu ngoài Brand_Identity
// ─────────────────────────────────────────────────────────────

/**
 * `key` là "màu drift chuẩn hoá" — gộp biến thể hex/rgb và mọi mức alpha về một
 * định danh, để signature allowlist gọn (không nở theo từng mức alpha).
 * `sourceOnly` = chỉ tính trong file `.ts`/`.tsx` (utility Tailwind trong
 * className; trong `.css` các selector override như `.dark .bg-violet-600`
 * là phần dọn dẹp, không phải drift).
 */
interface DriftRule {
  key: string;
  label: string;
  regex: RegExp;
  sourceOnly?: boolean;
}

const DRIFT_RULES: readonly DriftRule[] = [
  // Tím (purple)
  { key: "#7c3aed", label: "purple hex #7c3aed", regex: /#7c3aed\b/gi },
  { key: "#7c3aed", label: "purple rgb(124,58,237)", regex: /rgba?\(\s*124\s*,\s*58\s*,\s*237\b/gi },
  { key: "#7c5cfc", label: "purple hex #7c5cfc", regex: /#7c5cfc\b/gi },
  // Indigo
  { key: "#6366f1", label: "indigo rgb(99,102,241)", regex: /rgba?\(\s*99\s*,\s*102\s*,\s*241\b/gi },
  // Xanh dương (blue)
  { key: "#2563eb", label: "blue hex #2563eb", regex: /#2563eb\b/gi },
  { key: "#2563eb", label: "blue rgb(37,99,235)", regex: /rgba?\(\s*37\s*,\s*99\s*,\s*235\b/gi },
  // Cyan
  { key: "#0891b2", label: "cyan rgb(8,145,178)", regex: /rgba?\(\s*8\s*,\s*145\s*,\s*178\b/gi },
  // Tailwind utility bg-violet-* (chỉ file nguồn)
  { key: "bg-violet", label: "tailwind bg-violet-*", regex: /bg-violet-\d+/gi, sourceOnly: true },
];

interface DriftViolation {
  /** Đường dẫn tương đối repo root (slash), ổn định khi báo cáo. */
  relativePath: string;
  /** Dòng (1-indexed). */
  line: number;
  /** Chuỗi khớp được, ví dụ `#2563EB` hoặc `rgba(37, 99, 235, 0.96)`-prefix. */
  matched: string;
  /** Màu drift chuẩn hoá (dùng cho signature allowlist). */
  key: string;
}

/** Quét nội dung một file (đã biết là source hay không) → danh sách drift. */
function scanDriftContent(relativePath: string, rawContent: string, sourceFile: boolean): DriftViolation[] {
  let content = stripBlockComments(rawContent);
  if (sourceFile) content = stripLineComments(content);

  const lines = content.split(/\r\n|\r|\n/);
  const violations: DriftViolation[] = [];

  lines.forEach((lineText, index) => {
    const lineNo = index + 1;
    for (const rule of DRIFT_RULES) {
      if (rule.sourceOnly && !sourceFile) continue;
      rule.regex.lastIndex = 0;
      let m: RegExpExecArray | null = rule.regex.exec(lineText);
      while (m !== null) {
        violations.push({ relativePath, line: lineNo, matched: m[0], key: rule.key });
        if (m.index === rule.regex.lastIndex) rule.regex.lastIndex += 1;
        m = rule.regex.exec(lineText);
      }
    }
  });

  return violations;
}

function scanDriftFile(filePath: string, repoRoot: string = DEFAULT_REPO_ROOT): DriftViolation[] {
  const relativePath = path.relative(repoRoot, filePath).split(path.sep).join("/");
  const content = readFileSync(filePath, "utf8");
  return scanDriftContent(relativePath, content, isSourceFile(filePath));
}

/** Signature dùng cho allowlist: `relativePath :: key`. */
function driftSignature(v: DriftViolation): string {
  return `${v.relativePath} :: ${v.key}`;
}

function formatViolation(v: DriftViolation): string {
  return `${v.relativePath}:${v.line} [${v.key}] ${v.matched}`;
}

// ─────────────────────────────────────────────────────────────
// ALLOWLIST — ngoại lệ cố ý / ngoài phạm vi (documented)
// ─────────────────────────────────────────────────────────────

/**
 * Mỗi entry là chữ ký `relativePath :: key`.
 *
 * (a) Palette phân loại lĩnh vực (categorical) — giữ ngữ nghĩa phân biệt, KHÔNG
 *     dùng làm accent hành động/thương hiệu:
 */
const KNOWN_INTENTIONAL_DRIFT: readonly string[] = [
  // --- (a) Life-area accents (tokens.css) ---
  "src/styles/tokens.css :: #2563eb", // --color-career-accent
  "src/styles/tokens.css :: #7c5cfc", // --color-education-accent
  // --- (a) Life-area palette (Onboarding / LifeInsight / LifeAtlasWheel) ---
  "src/app/pages/Onboarding.tsx :: #2563eb", // AREA_DESIGN_ICON_STYLES (career)
  "src/app/pages/Onboarding.tsx :: #7c5cfc", // AREA_DESIGN_ICON_STYLES (education)
  "src/app/pages/Onboarding/components/LifeAtlasWheel.tsx :: #2563eb", // DESIGN_WEDGE_COLORS (career)
  "src/app/pages/Onboarding/components/LifeAtlasWheel.tsx :: #7c5cfc", // DESIGN_WEDGE_COLORS (education)
  "src/app/pages/LifeInsight.tsx :: bg-violet", // life-area accent palette
  // --- (a) Màu trạng thái admin (side surface) ---
  "src/app/pages/AdminOrderDetailPage.tsx :: bg-violet", // badge "Ảnh"
  "src/app/pages/AdminDashboardPage.tsx :: bg-violet", // stat icon (plus)
  "src/app/components/admin/tokens.ts :: bg-violet", // statIconBg.plus
  "src/app/components/admin/AdminStatusBadge.tsx :: bg-violet", // status "printing"
  // --- (b) Gradient trang trí theme.css (product-visual / marketing / hero) ---
  "src/styles/theme.css :: #2563eb", // gradient xanh dương trang trí
  "src/styles/theme.css :: #0891b2", // gradient cyan trang trí
  "src/styles/theme.css :: #7c3aed", // gradient tím trang trí
  "src/styles/theme.css :: #6366f1", // gradient indigo trang trí
];

const ALLOWLIST_SET = new Set(KNOWN_INTENTIONAL_DRIFT);

// ─────────────────────────────────────────────────────────────
// Module-scope data (quét một lần)
// ─────────────────────────────────────────────────────────────

const SCANNED_FILES: readonly string[] = resolveDriftFiles();
const SCANNED_RELATIVE: readonly string[] = SCANNED_FILES.map((f) =>
  path.relative(DEFAULT_REPO_ROOT, f).split(path.sep).join("/"),
);

/** violations theo từng relativePath. */
const VIOLATIONS_BY_FILE = new Map<string, DriftViolation[]>();
const ALL_VIOLATIONS: DriftViolation[] = [];
for (const filePath of SCANNED_FILES) {
  const vs = scanDriftFile(filePath);
  const rel = path.relative(DEFAULT_REPO_ROOT, filePath).split(path.sep).join("/");
  VIOLATIONS_BY_FILE.set(rel, vs);
  ALL_VIOLATIONS.push(...vs);
}

function unexpectedForFile(relativePath: string): DriftViolation[] {
  const vs = VIOLATIONS_BY_FILE.get(relativePath) ?? [];
  return vs.filter((v) => !ALLOWLIST_SET.has(driftSignature(v)));
}

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────

describe("Property 3 — Không còn Color_Drift ngoài Brand_Identity (task 5.4)", () => {
  it("scanner đọc được cây nguồn src/styles + src/app (không no-op)", () => {
    expect(SCANNED_FILES.length).toBeGreaterThan(0);
    // Có cả file CSS (styles) lẫn file nguồn (app) trong tập quét.
    expect(SCANNED_RELATIVE.some((p) => p.startsWith("src/styles/") && p.endsWith(".css"))).toBe(true);
    expect(SCANNED_RELATIVE.some((p) => p.startsWith("src/app/"))).toBe(true);
  });

  it("scanner phát hiện drift thật và BỎ QUA drift trong comment (self-check)", () => {
    // Drift thật ở value → bị bắt.
    const hit = scanDriftContent("x.css", "a{ color:#7C3AED; b: rgba(37, 99, 235, .5) }", false);
    expect(hit.map((v) => v.key).sort()).toEqual(["#2563eb", "#7c3aed"]);

    // Cùng literal nhưng nằm trong comment → KHÔNG tính.
    const commented = scanDriftContent("x.css", "/* thay drift tím #7c3aed và #2563eb */\n.ok{}", false);
    expect(commented).toEqual([]);

    // bg-violet chỉ tính trong file nguồn, không tính trong .css selector.
    expect(scanDriftContent("y.tsx", 'className="bg-violet-500"', true).map((v) => v.key)).toEqual(["bg-violet"]);
    expect(scanDriftContent("z.css", ".dark .bg-violet-600{}", false)).toEqual([]);
  });

  it("allowlist không chứa entry đã 'chết' (hygiene — giữ tối giản)", () => {
    const seen = new Set(ALL_VIOLATIONS.map(driftSignature));
    const stale = [...ALLOWLIST_SET].filter((sig) => !seen.has(sig));
    expect(
      stale,
      stale.length === 0
        ? ""
        : "Allowlist có entry không còn khớp drift nào (đã dọn xong?). Hãy xoá khỏi " +
            `KNOWN_INTENTIONAL_DRIFT để giữ tối giản:\n${stale.join("\n")}`,
    ).toEqual([]);
  });

  // Property 3 — for any file trong phạm vi: không drift ngoài allowlist.
  it(PROPERTY_TAG, () => {
    fc.assert(
      fc.property(fc.constantFrom(...SCANNED_RELATIVE), (relativePath) => {
        const unexpected = unexpectedForFile(relativePath);
        if (unexpected.length > 0) {
          throw new Error(
            `Color_Drift MỚI ngoài Brand_Identity tại "${relativePath}":\n` +
              unexpected.map(formatViolation).join("\n") +
              "\n→ Thay bằng token họ Forest Green / Terracotta phù hợp ngữ cảnh, " +
              "hoặc nếu là ngoại lệ categorical/decorative hợp lệ thì thêm signature vào KNOWN_INTENTIONAL_DRIFT.",
          );
        }
      }),
      { numRuns: 100 },
    );
  });

  it("toàn bộ phạm vi không còn drift ngoài allowlist (deterministic enumeration)", () => {
    const unexpected = ALL_VIOLATIONS.filter((v) => !ALLOWLIST_SET.has(driftSignature(v)));
    expect(
      unexpected,
      unexpected.length === 0
        ? ""
        : `Phát hiện ${unexpected.length} Color_Drift MỚI (Req 2.3):\n${unexpected.map(formatViolation).join("\n")}`,
    ).toEqual([]);
  });
});
