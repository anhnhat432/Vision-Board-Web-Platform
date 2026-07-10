// Feature: global-ui-upgrade, Property 6
/**
 * Property-Based Test — Property 6: Contrast văn bản nội dung ≥ 4.5:1 (task 2.6).
 *
 * "For any cặp (token màu chữ nội dung, token màu nền hợp lệ của nó) và for any
 *  mode ∈ {light, dark}, Contrast_Ratio giữa chữ và nền ≥ 4.5:1."
 *
 * Validates: Requirements 7.1
 *
 * Nguồn dữ liệu:
 *   - Parse `src/styles/tokens.css` qua `token-parser` (test-only) ở cả Light
 *     (`:root`) và Dark (`html.dark`).
 *   - Mọi giá trị màu phân giải qua chuỗi `var()` về literal Primitive trước
 *     khi tính Contrast_Ratio (WCAG 2.1). Nếu một token nền có alpha < 1 thì
 *     alpha-composite qua nền nền hiệu dụng (`--app-bg` cùng theme).
 *
 * Phạm vi (task 2.6 — Property 6):
 *   - Body text token: `--app-ink`, `--app-ink-soft`, `--app-ink-muted`,
 *     `--app-ink-link`.
 *   - Nền hợp lệ: `--app-bg`, `--app-bg-subtle`, `--app-surface`.
 *   - Ngưỡng cố định 4.5:1 cho toàn bộ văn bản nội dung (WCAG 2.1 SC 1.4.3).
 *
 * Tính chất: pure test — KHÔNG render DOM, KHÔNG import React, KHÔNG import
 * product code. Chỉ dùng helper WCAG thuần test-only (`contrast.ts`) và
 * token-parser test-only. Tái sử dụng hạ tầng PBT hiện có, fast-check + Vitest.
 */

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { compositeOver, computeContrastRatio, extractFirstColor, type RGB, type RGBA } from "./contrast";
import { loadTokenSet, resolveToken, type TokenSet } from "./token-parser";

// ─────────────────────────────────────────────────────────────
// Constants & types
// ─────────────────────────────────────────────────────────────

type ThemeMode = "light" | "dark";

/** Ngưỡng WCAG 2.1 SC 1.4.3 cho văn bản nội dung (body). */
const BODY_TEXT_THRESHOLD = 4.5;

/** Token màu chữ nội dung cần kiểm (Requirement 7.1). */
const BODY_TEXT_TOKENS = ["--app-ink", "--app-ink-soft", "--app-ink-muted", "--app-ink-link"] as const;

/** Token nền hợp lệ mà văn bản nội dung có thể nằm trên. */
const VALID_BG_TOKENS = ["--app-bg", "--app-bg-subtle", "--app-surface"] as const;

interface BodyContrastPair {
  /** ID ngắn để debug / báo cáo counter-example. */
  id: string;
  /** Token màu chữ nội dung. */
  fg: string;
  /** Token màu nền hợp lệ. */
  bg: string;
}

/** Sinh ma trận (ink × bg hợp lệ). */
const PAIRS: ReadonlyArray<BodyContrastPair> = BODY_TEXT_TOKENS.flatMap((fg) =>
  VALID_BG_TOKENS.map((bg) => ({ id: `${fg}__on__${bg}`, fg, bg })),
);

// ─────────────────────────────────────────────────────────────
// Resolve token → màu; compute cặp (alpha-composite nếu cần)
// ─────────────────────────────────────────────────────────────

function resolveColor(name: string, set: TokenSet): RGBA {
  const r = resolveToken(name, set);
  if (!r.isNonEmpty) {
    throw new Error(`Token ${name} resolved to empty value`);
  }
  const c = extractFirstColor(r.resolvedValue);
  if (!c) {
    throw new Error(`Token ${name} → "${r.resolvedValue}" không phải giá trị màu hợp lệ`);
  }
  return c;
}

interface ComputedPair {
  ratio: number;
  fgValue: string;
  bgValue: string;
}

function computePair(pair: BodyContrastPair, set: TokenSet): ComputedPair {
  const fg = resolveColor(pair.fg, set);
  const bg = resolveColor(pair.bg, set);

  // Nền hiệu dụng phải opaque; alpha-composite qua --app-bg nếu bg trong suốt.
  let effectiveBg: RGB;
  if (bg.a >= 1) {
    effectiveBg = { r: bg.r, g: bg.g, b: bg.b };
  } else {
    const base = resolveColor("--app-bg", set);
    if (base.a < 1) {
      throw new Error(`bgBase --app-bg cho ${pair.id} không opaque — không thể tổng hợp ổn định`);
    }
    effectiveBg = compositeOver(bg, { r: base.r, g: base.g, b: base.b });
  }

  // Fg có alpha < 1 → composite qua effectiveBg trước khi tính contrast.
  const visibleFg: RGB = fg.a >= 1 ? { r: fg.r, g: fg.g, b: fg.b } : compositeOver(fg, effectiveBg);

  return {
    ratio: computeContrastRatio(visibleFg, effectiveBg),
    fgValue: resolveToken(pair.fg, set).resolvedValue,
    bgValue: resolveToken(pair.bg, set).resolvedValue,
  };
}

// ─────────────────────────────────────────────────────────────
// Module-scope data (đọc token một lần — pure test)
// ─────────────────────────────────────────────────────────────

const tokenSetByMode: Record<ThemeMode, TokenSet> = {
  light: loadTokenSet({ mode: "light" }),
  dark: loadTokenSet({ mode: "dark" }),
};

interface FlatEntry {
  mode: ThemeMode;
  pair: BodyContrastPair;
}

const FLAT_ENTRIES: ReadonlyArray<FlatEntry> = (["light", "dark"] as const).flatMap((mode) =>
  PAIRS.map((pair) => ({ mode, pair })),
);

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────

describe("Property 6 — Contrast văn bản nội dung ≥ 4.5:1 (task 2.6)", () => {
  it("ma trận (ink × bg) có dữ liệu cho cả light & dark", () => {
    expect(PAIRS.length).toBe(BODY_TEXT_TOKENS.length * VALID_BG_TOKENS.length);
    expect(FLAT_ENTRIES.length).toBe(PAIRS.length * 2);
  });

  it("mọi token trong ma trận đều resolve được trong cả light & dark", () => {
    for (const mode of ["light", "dark"] as ThemeMode[]) {
      const set = tokenSetByMode[mode];
      for (const p of PAIRS) {
        expect(resolveToken(p.fg, set).isNonEmpty, `${mode}/${p.id}: fg ${p.fg} non-empty`).toBe(true);
        expect(resolveToken(p.bg, set).isNonEmpty, `${mode}/${p.id}: bg ${p.bg} non-empty`).toBe(true);
      }
    }
  });

  // Property 6 — for any (mode, cặp ink/bg hợp lệ): ratio ≥ 4.5:1.
  it("for any (mode, cặp ink/bg hợp lệ), Contrast_Ratio ≥ 4.5:1", () => {
    fc.assert(
      fc.property(fc.constantFrom(...FLAT_ENTRIES), (entry) => {
        const set = tokenSetByMode[entry.mode];
        const { ratio, fgValue, bgValue } = computePair(entry.pair, set);

        if (ratio < BODY_TEXT_THRESHOLD) {
          throw new Error(
            `Body contrast violation [${entry.mode}/${entry.pair.id}] ` +
              `fg=${entry.pair.fg}(${fgValue}) ` +
              `bg=${entry.pair.bg}(${bgValue}) ` +
              `ratio=${ratio.toFixed(2)} threshold=${BODY_TEXT_THRESHOLD}`,
          );
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Quét toàn ma trận một lần để liệt kê đầy đủ vi phạm (test PBT random ở trên
   * có thể không "chạm" mọi cặp trong 100 vòng). Đóng vai trò gate cứng cho
   * Requirement 7.1.
   */
  it("toàn ma trận (ink × bg) đạt ≥ 4.5:1 cho cả Light và Dark mode", () => {
    const violations: string[] = [];
    for (const mode of ["light", "dark"] as ThemeMode[]) {
      const set = tokenSetByMode[mode];
      for (const pair of PAIRS) {
        const { ratio, fgValue, bgValue } = computePair(pair, set);
        if (ratio < BODY_TEXT_THRESHOLD) {
          violations.push(
            `[${mode}/${pair.id}] fg=${pair.fg}(${fgValue}) bg=${pair.bg}(${bgValue}) ` +
              `ratio=${ratio.toFixed(2)} threshold=${BODY_TEXT_THRESHOLD}`,
          );
        }
      }
    }
    expect(violations, `Có ${violations.length} vi phạm contrast:\n${violations.join("\n")}`).toHaveLength(0);
  });
});
