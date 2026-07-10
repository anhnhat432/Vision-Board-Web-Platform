/**
 * Feature: global-ui-upgrade, Property 13
 *
 * Property-Based Test — Property 13: Real mode không lộ copy demo-only.
 *
 * "For any chuỗi copy được render khi `App_Mode` là `real`, chuỗi đó không
 *  chứa cụm từ chỉ dành cho demo trong tập kiểm duyệt
 *  {"dùng thử", "trên trình duyệt này", "không thu tiền thật", "mock", "demo"}
 *  (so khớp không phân biệt hoa thường)."
 *
 * Validates: Requirements 10.1
 *
 * Ghi chú phạm vi:
 *   - Đây là bản thu hẹp riêng cho `global-ui-upgrade`: tập cụm từ bám sát
 *     Requirement 10.1 của spec này (5 cụm). Test `property-8-demo-copy.test.ts`
 *     (feature ux-ui-upgrade) và `public-legal-demo-copy.test.ts` phủ các bề
 *     mặt/cụm từ khác; ba test bổ sung cho nhau chứ không thay thế.
 *
 * Mô hình kiểm chứng (pure — không phụ thuộc DOM/React):
 *   - Tập file = `resolveCoreFlowFiles()` (xem `token-scan.ts`): danh sách file
 *     `.tsx`/`.jsx` thuộc Core_Flow_Screen + shared state component, đã loại
 *     file test/spec/stories. KHÔNG bao gồm route demo-only (ví dụ
 *     `MockBillingCheckout.tsx` không nằm trong `CORE_FLOW_PATHS`).
 *   - Vì `App_Mode` được cố định ở compile/scan-time qua `isRealMode()` /
 *     `isDemoMode()`, ta mô phỏng "chuỗi render trong real mode" bằng cách LOẠI
 *     mọi nhánh copy gated bởi `demoMode`/`isDemoMode()` trước khi trích chuỗi
 *     hiển thị. Những gì còn lại chính là copy có thể hiển thị ở real mode.
 *
 * Sinh dữ liệu: `fc.constantFrom(...realModeStrings)` với `numRuns: 100` —
 * generator thông minh, chỉ sinh trong không gian input thực (chuỗi user-visible
 * đã trích), không random rác.
 *
 * Test THUẦN chỉ đọc: không sửa product code. Khi vi phạm, dừng ở tầng test và
 * liệt kê file + cụm từ để truy vết người sửa copy.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { DEFAULT_REPO_ROOT, resolveCoreFlowFiles } from "./token-scan";

const PROPERTY_TAG = "Feature: global-ui-upgrade, Property 13 — Real mode không lộ copy demo-only";

// ─────────────────────────────────────────────────────────────
// Tập cụm từ kiểm duyệt — đồng bộ Requirement 10.1 (global-ui-upgrade)
// ─────────────────────────────────────────────────────────────

/** Giữ nguyên thứ tự và nội dung theo phát biểu Property 13 (design.md). */
const BANNED_PHRASES: ReadonlyArray<string> = [
  "dùng thử",
  "trên trình duyệt này",
  "không thu tiền thật",
  "mock",
  "demo",
] as const;

const BANNED_PHRASES_LC: ReadonlyArray<string> = BANNED_PHRASES.map((p) => p.toLocaleLowerCase("vi-VN"));

// ─────────────────────────────────────────────────────────────
// Pre-process: loại nhánh demo-only và comment
// (đồng bộ chiến lược với property-8-demo-copy.test.ts)
// ─────────────────────────────────────────────────────────────

const STRING_LIT = String.raw`(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')`;

/** Inline ternary demo-mode với HAI branch string literal → giữ branch real. */
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

/** Pre-process source: strip comment + rút nhánh demo-only về branch real. */
function stripDemoOnlyAndComments(rawSource: string): string {
  let s = stripBlockComments(rawSource);
  s = s.replace(DEMO_INLINE_TERNARY_RE, "$1");
  s = s
    .split("\n")
    .filter((line) => !DEMO_BRANCH_LEFTOVER_RE.test(line))
    .join("\n");
  return s;
}

// ─────────────────────────────────────────────────────────────
// Extract user-visible string literals (đồng bộ với property-8)
// ─────────────────────────────────────────────────────────────

const JSX_TEXT_RE = /[>}]([^<>{}();=]+?)(?=<\/?[A-Za-z]|\{)/g;

const USER_FACING_ATTR_RE =
  /\b(?:aria-label|aria-description|aria-roledescription|aria-valuetext|placeholder|title|alt|description)\s*=\s*"((?:[^"\\]|\\.)*)"/g;

const TOAST_CALL_RE = /\btoast\.(?:info|success|warning|error|message)\s*\(\s*"((?:[^"\\]|\\.)*)"/g;

const JSX_EXPR_STRING_RE = new RegExp(String.raw`\{\s*${STRING_LIT}\s*\}`, "g");

const LETTER_ANYWHERE_RE = /\p{L}/u;

function unwrapLiteral(literal: string): string {
  return literal.slice(1, -1);
}

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
// Build tập copy real-mode một lần ở module scope
// ─────────────────────────────────────────────────────────────

interface SourceCopy {
  relativePath: string;
  text: string;
}

function buildRealModeCopy(): { items: SourceCopy[]; flat: string[] } {
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

const COPY = buildRealModeCopy();

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
// Property 13
// ─────────────────────────────────────────────────────────────

describe("Property 13 — Real mode không lộ copy demo-only (task 1.4)", () => {
  it("Tập copy real-mode không rỗng (sanity, tránh vacuous truth)", () => {
    expect(COPY.flat.length).toBeGreaterThan(0);
    // Vùng quét phải đủ lớn để property có ý nghĩa.
    expect(COPY.flat.length).toBeGreaterThanOrEqual(50);
  });

  it("Tập kiểm duyệt khớp đúng Requirement 10.1 (snapshot)", () => {
    expect(BANNED_PHRASES).toEqual([
      "dùng thử",
      "trên trình duyệt này",
      "không thu tiền thật",
      "mock",
      "demo",
    ]);
  });

  it(PROPERTY_TAG, () => {
    fc.assert(
      fc.property(fc.constantFrom(...COPY.flat), (text) => {
        const hits = findBannedPhrases(text);
        if (hits.length > 0) {
          const source = COPY.items.find((i) => i.text === text);
          throw new Error(
            `Real-mode copy rò rỉ cụm demo-only: ${JSON.stringify(hits)} ` +
              `trong chuỗi ${JSON.stringify(text)}` +
              (source ? ` tại ${source.relativePath}` : ""),
          );
        }
      }),
      { numRuns: 100 },
    );
  });

  it("toàn bộ bề mặt real-mode tuân thủ (deterministic enumeration)", () => {
    const violations: Array<{ relativePath: string; text: string; hits: string[] }> = [];
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
