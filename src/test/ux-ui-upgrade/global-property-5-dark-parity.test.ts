/**
 * Property-Based Test — Property 5: Dark mode parity cho mọi Semantic_Token thị giác.
 *
 * Feature: global-ui-upgrade, Property 5: Dark mode parity cho mọi Semantic_Token thị giác.
 *
 * "For any Semantic_Token thị giác được định nghĩa trong light mode (`:root`),
 *  tồn tại một giá trị override tương ứng trong dark mode (`html.dark`), sao cho
 *  khi Theme_Engine bật class `dark` thì token đó resolve về giá trị dark hợp lệ
 *  (không rơi về giá trị light)."
 *
 * Validates: Requirements 6.1, 6.3
 *
 * Mô hình kiểm chứng (pure — không phụ thuộc DOM/React):
 *   - Light set: `loadTokenSet({ mode: "light" })` (chỉ đọc `:root`).
 *   - Dark set:  `loadTokenSet({ mode: "dark" })` (đọc `:root` rồi override bằng
 *     `html.dark`) — dùng để xác nhận token resolve non-empty ở dark.
 *   - Tập tên override dark: trích trực tiếp các khai báo bên trong khối
 *     `html.dark { … }` từ `readTokensCss()`. Cần tập tên này (thay vì so sánh
 *     value light-vs-dark) vì một số token override dark CÓ CHỦ Ý giữ cùng giá
 *     trị light (ví dụ `--app-highlight: #c6f24e` ở cả hai mode) — so sánh value
 *     sẽ báo nhầm "thiếu override".
 *
 * Visual predicate (định nghĩa cẩn thận theo design.md):
 *   Một Semantic_Token (`--app-*`, theo `classifyLayer`) là "thị giác" khi nó
 *   KHÔNG thuộc nhóm mode-agnostic (radius / spacing-gap / card-padding / font).
 *   Các token mode-agnostic (`--app-radius-*`, `--app-section-gap*`,
 *   `--app-card-padding*`, `--app-font-*`) hợp lệ khi KHÔNG có override dark nên
 *   bị loại khỏi tập kiểm chứng. Phần còn lại (bg / surface / overlay / ink /
 *   line / accent / warm / status / focus / highlight / energy / glass / shadow)
 *   đều là token thị giác phụ thuộc mode và PHẢI có override dark.
 *
 * Generator: chọn một tên Semantic_Token thị giác BẤT KỲ từ light set,
 * `fc.assert(..., { numRuns: 100 })`. Test thuần — I/O đọc file một lần ở module scope.
 *
 * Ý nghĩa thất bại: nếu test fail, dấu hiệu một Semantic_Token thị giác định
 * nghĩa ở `:root` nhưng THIẾU override trong `html.dark` → token sẽ rơi về giá
 * trị light khi bật dark mode (vi phạm Requirement 6.1, 6.3). Cách xử lý đúng là
 * bổ sung override token đúng lớp trong `html.dark`, KHÔNG vá bằng literal cục bộ.
 */

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { classifyLayer, loadTokenSet, readTokensCss, resolveToken, type TokenSet } from "./token-parser";

const PROPERTY_TAG = "Feature: global-ui-upgrade, Property 5: Dark mode parity cho mọi Semantic_Token thị giác";

// ─────────────────────────────────────────────────────────────
// Chuẩn bị dữ liệu (đọc một lần ở module scope — pure, test-time)
// ─────────────────────────────────────────────────────────────

const lightSet: TokenSet = loadTokenSet({ mode: "light" });
const darkSet: TokenSet = loadTokenSet({ mode: "dark" });

/**
 * Trích tập tên token được khai báo TƯỜNG MINH bên trong các khối `html.dark`
 * (bỏ qua bridge `@theme inline`). Mirror logic khối/decl của token-parser để
 * phát hiện "có override" độc lập với value (một số override giữ nguyên value).
 */
function extractDarkOverrideNames(css: string): Set<string> {
  const cleaned = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const names = new Set<string>();
  const blockRe = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null = blockRe.exec(cleaned);
  while (match !== null) {
    const selector = match[1].trim();
    const isDark = /html\.dark|\.dark\b/.test(selector);
    const isTheme = selector.includes("@theme");
    if (isDark && !isTheme) {
      for (const chunk of match[2].split(";")) {
        const decl = chunk.trim();
        const m = /^(--[\w-]+)\s*:/.exec(decl);
        if (m) {
          names.add(m[1]);
        }
      }
    }
    match = blockRe.exec(cleaned);
  }
  return names;
}

const darkOverrideNames: ReadonlySet<string> = extractDarkOverrideNames(readTokensCss());

/**
 * Visual predicate: Semantic_Token (`--app-*`) phụ thuộc mode.
 * Loại các token mode-agnostic (radius / gap / padding / font) — chúng hợp lệ
 * khi không có override dark.
 */
const MODE_AGNOSTIC_RE = /radius|gap|padding|font/;

function isVisualSemanticToken(name: string): boolean {
  if (classifyLayer(name) !== "semantic") {
    return false; // chỉ xét Layer 2 (`--app-*`); primitive/component ngoài phạm vi
  }
  return !MODE_AGNOSTIC_RE.test(name);
}

/** Tập tên Semantic_Token thị giác định nghĩa ở light (`:root`) — không gian sinh mẫu. */
const visualLightTokens: ReadonlyArray<string> = [...lightSet.keys()].filter(isVisualSemanticToken).sort();

// ─────────────────────────────────────────────────────────────
// Property 5
// ─────────────────────────────────────────────────────────────

describe("Property 5 — Dark mode parity cho mọi Semantic_Token thị giác (task 2.4)", () => {
  it("light set + tập token thị giác có dữ liệu để sinh mẫu (sanity)", () => {
    expect(lightSet.size).toBeGreaterThan(0);
    expect(darkSet.size).toBeGreaterThan(0);
    expect(visualLightTokens.length).toBeGreaterThan(0);
    expect(darkOverrideNames.size).toBeGreaterThan(0);
  });

  it(`${PROPERTY_TAG} — mỗi Semantic_Token thị giác light có override dark hợp lệ`, () => {
    fc.assert(
      fc.property(fc.constantFrom(...visualLightTokens), (name) => {
        // (A) Tồn tại override tường minh trong `html.dark` (Req 6.1) — không rơi
        // về giá trị light khi Theme_Engine bật `dark`.
        expect(darkOverrideNames.has(name)).toBe(true);

        // (B) Ở dark mode token resolve về literal non-empty, không còn `var(`
        // treo (Req 6.3) — giá trị dark hợp lệ.
        const resolved = resolveToken(name, darkSet);
        expect(resolved.isNonEmpty).toBe(true);
        expect(resolved.resolvedValue).not.toContain("var(");
      }),
      { numRuns: 100 },
    );
  });

  it("không Semantic_Token thị giác nào thiếu override dark — deterministic enumeration", () => {
    const missing = visualLightTokens.filter((name) => !darkOverrideNames.has(name)).sort();
    if (missing.length > 0) {
      const lines: string[] = [];
      lines.push(`Có ${missing.length} Semantic_Token thị giác định nghĩa ở :root nhưng THIẾU override trong html.dark (vi phạm Req 6.1, 6.3):`);
      for (const n of missing) {
        lines.push(`  - ${n}`);
      }
      lines.push("");
      lines.push("Bổ sung override đúng lớp trong khối `html.dark` của src/styles/tokens.css.");
      lines.push("KHÔNG vá bằng literal màu cục bộ — phải thêm token đúng lớp.");
      throw new Error(lines.join("\n"));
    }
    expect(missing).toEqual([]);
  });
});
