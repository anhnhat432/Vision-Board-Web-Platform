// Feature: core-flow-ui-upgrade, Property 6
/**
 * Property-Based Test — Property 6: Tương phản màu Core_Flow đạt ngưỡng WCAG
 * cho mọi cặp màu (task 18.2).
 *
 * "For any `ThemeMode` ∈ {light, dark} và for any cặp (foreground, effective
 *  background) trong ma trận cặp màu của Core_Flow (bao gồm text thường, text
 *  lớn, placeholder, viền/biểu tượng chức năng của control, và focus ring
 *  accent/warm), Contrast_Ratio theo WCAG 2.1 (trên nền hiệu dụng sau
 *  alpha-compositing) đạt tối thiểu ngưỡng tương ứng với category: 4.5:1 cho
 *  text thường/placeholder; 3:1 cho text lớn, viền/biểu tượng control và focus
 *  ring. Các cặp thuộc control `disabled` bị loại khỏi tập kiểm tra."
 *
 * Validates: Requirements 12.3, 12.5
 *
 * Nguồn dữ liệu:
 *   - Parse `src/styles/tokens.css` qua `token-parser` (test-only) ở cả Light
 *     (`:root`) và Dark (`html.dark`).
 *   - Mọi giá trị màu phân giải qua chuỗi `var()` về literal Primitive.
 *   - Focus ring (`--app-focus-ring`, `--app-focus-ring-warm` — tương ứng class
 *     `focus-visible:ring-app-accent` / `focus-visible:ring-app-warm`) chứa
 *     rgba alpha < 1 → alpha-composite qua nền hiệu dụng của theme.
 *
 * Tính chất: pure test — KHÔNG render DOM, KHÔNG import React, KHÔNG import
 * product code. Chỉ dùng helper WCAG thuần test-only (`computeContrastRatio`/
 * `meetsContrastThreshold`) và token-parser test-only.
 *
 * Phạm vi (loại disabled — Req 12.5 áp cho control hoạt động): KHÔNG đưa vào
 * ma trận các token disabled (`--app-ink-disabled`, `--btn-primary-bg-disabled`,
 * `--input-bg-disabled`, `--input-text-disabled`).
 */

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  type ContrastCategory,
  CONTRAST_THRESHOLD,
  compositeOver,
  computeContrastRatio,
  extractFirstColor,
  meetsContrastThreshold,
  type RGB,
  type RGBA,
} from "./contrast";
import { loadTokenSet, resolveToken, type TokenSet } from "./token-parser";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

type ThemeMode = "light" | "dark";

interface ContrastPair {
  /** ID ngắn để debug / báo cáo counter-example. */
  id: string;
  category: ContrastCategory;
  /** Tên token màu chữ / màu visible. */
  fg: string;
  /** Tên token nền hiệu dụng. */
  bg: string;
  /** Khi `fg`/`bg` có alpha < 1, nền dùng để alpha-composite (mặc định --app-bg). */
  bgBaseForAlpha?: string;
}

// ─────────────────────────────────────────────────────────────
// Ma trận cặp màu Core_Flow (token tự đổi giá trị theo mode)
// ─────────────────────────────────────────────────────────────

/**
 * Danh sách token DISABLED bị loại khỏi kiểm tra (control không hoạt động).
 */
const DISABLED_TOKENS = new Set([
  "--app-ink-disabled",
  "--btn-primary-bg-disabled",
  "--input-bg-disabled",
  "--input-text-disabled",
]);

/**
 * Ma trận đại diện cho các tình huống render trên màn hình Core_Flow
 * (Onboarding → … → Reflection). Focus ring bao gồm cả accent (Execution) và
 * warm (Reflection) như design mô tả.
 */
const PAIRS: ReadonlyArray<ContrastPair> = [
  // ── Text thường trên các nền chính của Core_Flow (≥ 4.5:1 — Req 12.5) ──
  { id: "ink-on-bg", category: "normalText", fg: "--app-ink", bg: "--app-bg" },
  { id: "ink-on-surface", category: "normalText", fg: "--app-ink", bg: "--app-surface" },
  { id: "ink-on-bg-subtle", category: "normalText", fg: "--app-ink", bg: "--app-bg-subtle" },
  { id: "ink-soft-on-bg", category: "normalText", fg: "--app-ink-soft", bg: "--app-bg" },
  { id: "ink-soft-on-surface", category: "normalText", fg: "--app-ink-soft", bg: "--app-surface" },
  { id: "ink-link-on-surface", category: "normalText", fg: "--app-ink-link", bg: "--app-surface" },

  // ── Placeholder / muted (≥ 4.5:1 — Req 12.5) ──────────────────────────
  { id: "ink-muted-on-bg", category: "placeholder", fg: "--app-ink-muted", bg: "--app-bg" },
  { id: "ink-muted-on-surface", category: "placeholder", fg: "--app-ink-muted", bg: "--app-surface" },
  { id: "input-placeholder-on-input-bg", category: "placeholder", fg: "--input-placeholder", bg: "--input-bg" },

  // ── Text lớn (≥ 3:1 — Req 12.5) — caption / heading lớn ───────────────
  { id: "ink-muted-on-bg-subtle-large", category: "largeText", fg: "--app-ink-muted", bg: "--app-bg-subtle" },

  // ── Status text (thông báo lỗi/lưu form Core_Flow) trên surface ───────
  { id: "status-success-on-surface", category: "normalText", fg: "--app-status-success", bg: "--app-surface" },
  { id: "status-warning-on-surface", category: "normalText", fg: "--app-status-warning", bg: "--app-surface" },
  { id: "status-error-on-surface", category: "normalText", fg: "--app-status-error", bg: "--app-surface" },
  { id: "status-info-on-surface", category: "normalText", fg: "--app-status-info", bg: "--app-surface" },

  // ── Primary_CTA (Execution) — text trên các biến thể bg ───────────────
  { id: "btn-primary-text-on-bg", category: "normalText", fg: "--btn-primary-text", bg: "--btn-primary-bg" },
  { id: "btn-primary-text-on-hover", category: "normalText", fg: "--btn-primary-text", bg: "--btn-primary-bg-hover" },
  { id: "btn-primary-text-on-active", category: "normalText", fg: "--btn-primary-text", bg: "--btn-primary-bg-active" },
  { id: "ink-on-accent", category: "normalText", fg: "--app-ink-on-accent", bg: "--app-accent" },

  // ── Secondary nav (Ghost / Outline) ──────────────────────────────────
  { id: "btn-ghost-text-on-hover", category: "normalText", fg: "--btn-ghost-text", bg: "--btn-ghost-bg-hover" },
  { id: "btn-outline-text-on-bg", category: "normalText", fg: "--btn-outline-text", bg: "--btn-outline-bg" },

  // ── Reflection context (bước cuối Core_Flow) — text warm ──────────────
  { id: "reflection-btn-text-on-bg", category: "normalText", fg: "--reflection-btn-text", bg: "--reflection-btn-bg" },
  { id: "ink-on-warm", category: "normalText", fg: "--app-ink-on-warm", bg: "--app-warm" },
  { id: "reflection-tag-text-on-bg", category: "normalText", fg: "--reflection-tag-text", bg: "--reflection-tag-bg" },

  // ── Viền / biểu tượng chức năng của control (≥ 3:1 — Req 12.5) ────────
  { id: "input-border-on-bg", category: "controlAffordance", fg: "--input-border", bg: "--input-bg" },
  { id: "input-border-focus-on-bg", category: "controlAffordance", fg: "--input-border-focus", bg: "--input-bg" },
  { id: "input-border-error-on-bg", category: "controlAffordance", fg: "--input-border-error", bg: "--input-bg" },
  { id: "btn-outline-border-on-bg", category: "controlAffordance", fg: "--btn-outline-border", bg: "--btn-outline-bg" },
  { id: "line-strong-on-surface", category: "controlAffordance", fg: "--app-line-strong", bg: "--app-surface" },
  { id: "accent-icon-on-surface", category: "controlAffordance", fg: "--app-accent", bg: "--app-surface" },
  { id: "warm-icon-on-surface", category: "controlAffordance", fg: "--app-warm", bg: "--app-surface" },
  { id: "status-error-icon-on-surface", category: "controlAffordance", fg: "--app-status-error", bg: "--app-surface" },

  // ── Focus ring accent + warm (≥ 3:1 sau alpha-composite — Req 12.3) ───
  { id: "focus-ring-accent-on-bg", category: "focusRing", fg: "--app-focus-ring", bg: "--app-bg" },
  { id: "focus-ring-accent-on-surface", category: "focusRing", fg: "--app-focus-ring", bg: "--app-surface" },
  { id: "focus-ring-warm-on-bg", category: "focusRing", fg: "--app-focus-ring-warm", bg: "--app-bg" },
  { id: "focus-ring-warm-on-surface", category: "focusRing", fg: "--app-focus-ring-warm", bg: "--app-surface" },
];

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
  threshold: number;
  fgValue: string;
  bgValue: string;
}

function computePair(pair: ContrastPair, set: TokenSet): ComputedPair {
  const fg = resolveColor(pair.fg, set);
  const bg = resolveColor(pair.bg, set);

  // Nền hiệu dụng phải opaque; alpha-composite nếu bg trong suốt.
  let effectiveBg: RGB;
  if (bg.a >= 1) {
    effectiveBg = { r: bg.r, g: bg.g, b: bg.b };
  } else {
    const base = resolveColor(pair.bgBaseForAlpha ?? "--app-bg", set);
    if (base.a < 1) {
      throw new Error(`bgBase cho ${pair.id} không opaque — không thể tổng hợp ổn định`);
    }
    effectiveBg = compositeOver(bg, { r: base.r, g: base.g, b: base.b });
  }

  // Fg có alpha < 1 (focus ring rgba(.., 0.85)) → composite qua effectiveBg.
  const visibleFg: RGB = fg.a >= 1 ? { r: fg.r, g: fg.g, b: fg.b } : compositeOver(fg, effectiveBg);

  return {
    ratio: computeContrastRatio(visibleFg, effectiveBg),
    threshold: CONTRAST_THRESHOLD[pair.category],
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
  pair: ContrastPair;
}

const FLAT_ENTRIES: ReadonlyArray<FlatEntry> = (["light", "dark"] as const).flatMap((mode) =>
  PAIRS.map((pair) => ({ mode, pair })),
);

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────

describe("Property 6 — Tương phản màu Core_Flow đạt ngưỡng WCAG (task 18.2)", () => {
  it("ma trận Core_Flow có dữ liệu và không tham chiếu disabled token (Req 12.5)", () => {
    expect(PAIRS.length).toBeGreaterThan(0);
    expect(FLAT_ENTRIES.length).toBe(PAIRS.length * 2);
    for (const p of PAIRS) {
      expect(DISABLED_TOKENS.has(p.fg), `pair ${p.id} fg dùng disabled token`).toBe(false);
      expect(DISABLED_TOKENS.has(p.bg), `pair ${p.id} bg dùng disabled token`).toBe(false);
    }
    // Có ít nhất một cặp focus ring accent + warm (Req 12.3).
    expect(PAIRS.some((p) => p.category === "focusRing" && p.fg === "--app-focus-ring")).toBe(true);
    expect(PAIRS.some((p) => p.category === "focusRing" && p.fg === "--app-focus-ring-warm")).toBe(true);
  });

  // Property 6 — for any (themeMode, pair): ratio ≥ ngưỡng category.
  it("for any (themeMode, pair) trong ma trận Core_Flow, Contrast_Ratio ≥ ngưỡng WCAG của category", () => {
    fc.assert(
      fc.property(fc.constantFrom(...FLAT_ENTRIES), (entry) => {
        const set = tokenSetByMode[entry.mode];
        const { ratio, threshold, fgValue, bgValue } = computePair(entry.pair, set);

        if (!meetsContrastThreshold(ratio, entry.pair.category)) {
          throw new Error(
            `Contrast violation [${entry.mode}/${entry.pair.id}] ` +
              `category=${entry.pair.category} ` +
              `fg=${entry.pair.fg}(${fgValue}) ` +
              `bg=${entry.pair.bg}(${bgValue}) ` +
              `ratio=${ratio.toFixed(2)} threshold=${threshold}`,
          );
        }
      }),
      { numRuns: 100 },
    );
  });
});
