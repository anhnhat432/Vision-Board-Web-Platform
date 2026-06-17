/**
 * Property-Based Test — Property 8: Không rò rỉ ngôn từ demo-only ở real-mode
 * (task 9.4).
 *
 * "For any chuỗi văn bản hiển thị trên Core_Flow_Screen khi ứng dụng chạy ở
 *  real-mode, chuỗi đó không chứa bất kỳ cụm từ nào trong tập kiểm duyệt
 *  {"dùng thử", "không thu tiền thật", "mock", "demo", "trên trình duyệt này",
 *  "không cần đăng nhập", "bản dùng thử trên trình duyệt"} (so khớp không
 *  phân biệt hoa thường)."
 *
 * Validates: Requirements 9.1
 *
 * Mô hình kiểm chứng (pure — không phụ thuộc DOM/React):
 *   - Tập file = `resolveCoreFlowFiles()` (xem `token-scan.ts`) — danh sách
 *     file `.tsx`/`.jsx` thuộc Core_Flow_Screen + shared state component, đã
 *     loại file test/spec/stories. KHÔNG bao gồm route demo-only (ví dụ
 *     `MockBillingCheckout.tsx` không nằm trong CORE_FLOW_PATHS).
 *   - Pre-process source mỗi file để LOẠI nhánh demo-only trước khi extract:
 *       1. Xoá block comment `/* ... *​/` (bao gồm JSX comment `{/* ... *​/}`)
 *          để tên file/biến chứa "Mockup"/"Demo" trong comment không lọt.
 *       2. Thay inline ternary `(demoMode|isDemoMode()) ? "X" : "Y"` →
 *          chỉ giữ branch real `"Y"`. Đây là pattern thực tế tại Dashboard.tsx
 *          cho `TrialCountdownBanner` (banned phrases "Plus dùng thử:",
 *          "trên trình duyệt này" thuộc nhánh demo).
 *       3. Bỏ luôn dòng còn chứa `(demoMode|isDemoMode()) ? | &&` sau bước 2
 *          (multi-line ternary hoặc conditional render demo-only) — bảo thủ:
 *          chấp nhận false negative (mất một số real string) để tuyệt đối
 *          không rò rỉ demo string.
 *   - Extract user-visible string literals từ source đã làm sạch:
 *       (a) JSX text giữa `>` và `<` (không xuyên dấu `{`/`}`).
 *       (b) Giá trị attribute người-dùng-thấy: `aria-label`, `aria-description`,
 *           `aria-roledescription`, `aria-valuetext`, `placeholder`, `title`,
 *           `alt`, `description` — chỉ giá trị string literal (kèm dấu nháy).
 *       (c) `toast.{info,success,warning,error,message}("...")` first arg.
 *       (d) Inline JSX expression chỉ chứa string literal: `{"..."}` hoặc
 *           `{'...'}` — bắt được render text dạng `{text}` thường gặp trong
 *           các nhánh ternary đã được rút về branch real ở bước (2).
 *
 * Generator: chọn một string bất kỳ từ tập đã build (`fc.constantFrom`),
 * `numRuns ≥ 100`. Test thuần — không render DOM, chỉ I/O đọc file ở module
 * scope (đã đọc một lần khi build danh sách).
 *
 * Lưu ý phạm vi chỉ đọc:
 *   - Test KHÔNG sửa product code. Khi vi phạm, dừng ở tầng test và liệt kê
 *     file + dòng + cụm từ vi phạm để truy vết người sửa copy.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { DEFAULT_REPO_ROOT, resolveCoreFlowFiles } from "./token-scan";

const PROPERTY_TAG = "Feature: ux-ui-upgrade, Property 8: Không rò rỉ ngôn từ demo-only ở real-mode";

// ─────────────────────────────────────────────────────────────
// Tập cụm từ kiểm duyệt — đồng bộ với Requirement 9.1 / AGENTS.md
// ─────────────────────────────────────────────────────────────

/**
 * Cố định lower-case để so khớp không phân biệt hoa thường (Req 9.1).
 * Thứ tự không quan trọng nhưng giữ ổn định để snapshot/log dễ đọc.
 */
const BANNED_PHRASES: ReadonlyArray<string> = [
  "dùng thử",
  "không thu tiền thật",
  "mock",
  "demo",
  "trên trình duyệt này",
  "không cần đăng nhập",
  "bản dùng thử trên trình duyệt",
] as const;

const BANNED_PHRASES_LC: ReadonlyArray<string> = BANNED_PHRASES.map((p) => p.toLocaleLowerCase("vi-VN"));

// ─────────────────────────────────────────────────────────────
// Pre-process: loại nhánh demo-only và comment
// ─────────────────────────────────────────────────────────────

const STRING_LIT = String.raw`(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')`;

/** Khớp inline ternary demo-mode với HAI branch là string literal. */
const DEMO_INLINE_TERNARY_RE = new RegExp(
  String.raw`\b(?:demoMode|isDemoMode\(\))\s*\?\s*${STRING_LIT}\s*:\s*(${STRING_LIT})`,
  "g",
);

/** Pattern còn sót sau bước thay thế → dòng đó là demo branching → bỏ cả dòng. */
const DEMO_BRANCH_LEFTOVER_RE = /\b(?:demoMode|isDemoMode\(\))\s*[?&]/;

/** Xoá block comment (bao gồm JSX comment dạng `{/* ... *​/}`). */
function stripBlockComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, " ");
}

/**
 * Pre-process source theo các bước mô tả ở header. Trả về source đã làm sạch.
 */
function stripDemoOnlyAndComments(rawSource: string): string {
  // 1. Strip block comments (bao gồm JSX comment `{/* ... *​/}`).
  let s = stripBlockComments(rawSource);

  // 2. Inline ternary `(demoMode|isDemoMode()) ? "X" : "Y"` → giữ "Y".
  s = s.replace(DEMO_INLINE_TERNARY_RE, "$1");

  // 3. Bỏ các dòng còn chứa demo branching (multi-line ternary / `&&`).
  s = s
    .split("\n")
    .filter((line) => !DEMO_BRANCH_LEFTOVER_RE.test(line))
    .join("\n");

  return s;
}

// ─────────────────────────────────────────────────────────────
// Extract user-visible string literals
// ─────────────────────────────────────────────────────────────

/**
 * JSX text content: giữa `>`/`}` (tag-end hoặc JSX-expression-end) và `<` (đầu
 * tag JSX kế tiếp, có lookahead `<\/?[A-Za-z]` để tránh khớp generic kiểu
 * `Array<string>`) HOẶC `{` (đầu JSX expression kế tiếp).
 *
 * Nội dung loại trừ thêm `;`, `=`, `(`, `)` để khử blob JS giữa các tag JSX
 * (ví dụ thân hàm, khai báo `const ... = ...`, kiểu `(): T => {}`). JSX text
 * thực tế hiếm khi chứa các ký tự này; đánh đổi này ưu tiên tránh false
 * positive cho property test.
 */
const JSX_TEXT_RE = /[>}]([^<>{}();=]+?)(?=<\/?[A-Za-z]|\{)/g;

/** Attribute người-dùng-thấy = string literal. */
const USER_FACING_ATTR_RE =
  /\b(?:aria-label|aria-description|aria-roledescription|aria-valuetext|placeholder|title|alt|description)\s*=\s*"((?:[^"\\]|\\.)*)"/g;

/** `toast.X("...")` first arg là string literal (double quote). */
const TOAST_CALL_RE = /\btoast\.(?:info|success|warning|error|message)\s*\(\s*"((?:[^"\\]|\\.)*)"/g;

/** Inline JSX expression chỉ chứa một string literal: `{"..."}` hoặc `{'...'}`. */
const JSX_EXPR_STRING_RE = new RegExp(String.raw`\{\s*${STRING_LIT}\s*\}`, "g");

/**
 * Lấy giá trị thật của một matched string literal (đã có dấu nháy).
 * Không cần unescape đầy đủ; chỉ bóc dấu nháy ngoài là đủ cho mục đích so khớp
 * banned phrase (banned phrases không chứa `\n`/`\\`/escape đặc biệt).
 */
function unwrapLiteral(literal: string): string {
  return literal.slice(1, -1);
}

/** Có ít nhất một ký tự thuộc bảng chữ cái (Latin / Việt / khác). */
const LETTER_ANYWHERE_RE = /\p{L}/u;

/**
 * Trích tập string literal "có thể là user-visible" từ source đã pre-process.
 * Trả về danh sách KHÔNG trùng lặp, đã sort theo thứ tự từ điển để output ổn
 * định — tiện cho assert message.
 */
function extractVisibleStrings(cleanedSource: string): string[] {
  const out = new Set<string>();

  // (a) JSX text content
  for (const m of cleanedSource.matchAll(JSX_TEXT_RE)) {
    const text = m[1].trim();
    if (text.length === 0) continue;
    if (!LETTER_ANYWHERE_RE.test(text)) continue;
    out.add(text);
  }

  // (b) User-facing attribute string values
  for (const m of cleanedSource.matchAll(USER_FACING_ATTR_RE)) {
    const value = m[1];
    if (value.trim().length === 0) continue;
    out.add(value);
  }

  // (c) toast.X("...")
  for (const m of cleanedSource.matchAll(TOAST_CALL_RE)) {
    const value = m[1];
    if (value.trim().length === 0) continue;
    out.add(value);
  }

  // (d) {"..."} / {'...'} JSX expression chỉ chứa string literal
  for (const m of cleanedSource.matchAll(JSX_EXPR_STRING_RE)) {
    const value = unwrapLiteral(m[0].trim().slice(1, -1).trim());
    if (value.trim().length === 0) continue;
    if (!LETTER_ANYWHERE_RE.test(value)) continue;
    out.add(value);
  }

  return [...out].sort();
}

// ─────────────────────────────────────────────────────────────
// Build tập copy real-mode core-flow một lần ở module scope
// ─────────────────────────────────────────────────────────────

interface SourceCopy {
  /** Đường dẫn tương đối repo root (ổn định cho thông điệp lỗi). */
  relativePath: string;
  /** Một string user-visible. */
  text: string;
}

function buildRealModeCoreFlowCopy(): { items: SourceCopy[]; flat: string[] } {
  const files = resolveCoreFlowFiles();
  const items: SourceCopy[] = [];
  const flatSet = new Set<string>();
  for (const filePath of files) {
    const relativePath = path.relative(DEFAULT_REPO_ROOT, filePath).split(path.sep).join("/");
    const raw = readFileSync(filePath, "utf8");
    const cleaned = stripDemoOnlyAndComments(raw);
    for (const text of extractVisibleStrings(cleaned)) {
      items.push({ relativePath, text });
      flatSet.add(text);
    }
  }
  return { items, flat: [...flatSet].sort() };
}

const COPY = buildRealModeCoreFlowCopy();

// ─────────────────────────────────────────────────────────────
// Helpers kiểm tra banned phrase
// ─────────────────────────────────────────────────────────────

function findBannedPhrases(text: string): string[] {
  const lc = text.toLocaleLowerCase("vi-VN");
  const hits: string[] = [];
  for (let i = 0; i < BANNED_PHRASES_LC.length; i += 1) {
    if (lc.includes(BANNED_PHRASES_LC[i])) {
      hits.push(BANNED_PHRASES[i]);
    }
  }
  return hits;
}

// ─────────────────────────────────────────────────────────────
// Property 8
// ─────────────────────────────────────────────────────────────

describe("Property 8 — Không rò rỉ ngôn từ demo-only ở real-mode (task 9.4)", () => {
  it("Tập copy real-mode core-flow không rỗng (sanity)", () => {
    expect(COPY.flat.length).toBeGreaterThan(0);
    // Đảm bảo vùng quét đã chạm Core_Flow_Screen + shared states (đại lượng
    // phải đủ lớn để property test có ý nghĩa — không vacuous).
    expect(COPY.flat.length).toBeGreaterThanOrEqual(50);
  });

  it("Tập kiểm duyệt khớp đúng Requirement 9.1 (snapshot)", () => {
    expect(BANNED_PHRASES).toEqual([
      "dùng thử",
      "không thu tiền thật",
      "mock",
      "demo",
      "trên trình duyệt này",
      "không cần đăng nhập",
      "bản dùng thử trên trình duyệt",
    ]);
  });

  it(PROPERTY_TAG, () => {
    fc.assert(
      fc.property(fc.constantFrom(...COPY.flat), (text) => {
        const hits = findBannedPhrases(text);
        if (hits.length > 0) {
          // Tìm file đầu tiên chứa string này để truy vết.
          const source = COPY.items.find((i) => i.text === text);
          throw new Error(
            `Real-mode core-flow copy rò rỉ cụm demo-only: ${JSON.stringify(hits)} ` +
              `trong chuỗi ${JSON.stringify(text)}` +
              (source ? ` tại ${source.relativePath}` : ""),
          );
        }
      }),
      { numRuns: 100 },
    );
  });

  it("toàn bộ Core_Flow_Screen tuân thủ (deterministic enumeration)", () => {
    const violations: Array<{
      relativePath: string;
      text: string;
      hits: string[];
    }> = [];
    for (const { relativePath, text } of COPY.items) {
      const hits = findBannedPhrases(text);
      if (hits.length > 0) {
        violations.push({ relativePath, text, hits });
      }
    }
    if (violations.length > 0) {
      const report = violations
        .map((v) => `  ${v.relativePath}: ${JSON.stringify(v.hits)} ← ${JSON.stringify(v.text)}`)
        .join("\n");
      throw new Error(`Có ${violations.length} chuỗi real-mode rò rỉ ngôn từ demo-only:\n${report}`);
    }
  });
});
