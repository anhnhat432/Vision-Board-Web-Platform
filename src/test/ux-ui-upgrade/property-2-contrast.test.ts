/**
 * Property-Based Test — Property 2: WCAG contrast trên mọi cặp màu của luồng cốt lõi
 * (task 8.2).
 *
 * "For any `ThemeMode` ∈ {light, dark} và for any cặp (foreground, effective
 *  background) trong ma trận token của Core_Flow_Screen — bao gồm text thường,
 *  text lớn, viền/biểu tượng chức năng của control, placeholder, focus ring
 *  (accent và warm), và các biến thể trạng thái hover/active/selected —
 *  Contrast_Ratio (công thức WCAG 2.1 trên nền hiệu dụng sau alpha-compositing)
 *  đạt tối thiểu ngưỡng tương ứng: 4.5:1 cho text thường và placeholder,
 *  3:1 cho text lớn, viền/biểu tượng control và focus ring. Các cặp thuộc
 *  control `disabled` được loại khỏi tập kiểm tra."
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.8, 4.2, 4.4
 *
 * Nguồn dữ liệu:
 *   - Parse trực tiếp `src/styles/tokens.css` qua `token-parser` ở cả Light
 *     (`:root`) và Dark (`html.dark`).
 *   - Mọi giá trị màu được phân giải qua chuỗi `var()` về literal Primitive.
 *   - Tokens với alpha (vd. `--app-focus-ring` chứa `rgba(.., .., .., 0.85)`)
 *     được alpha-composite qua nền hiệu dụng (effective bg) chuẩn của theme.
 *
 * Generator: chọn một cặp (themeMode, pair) BẤT KỲ trong ma trận đã định nghĩa
 * (`fc.constantFrom`), `numRuns ≥ 100`. Pure test — không render DOM, không
 * import React, không sửa product code. Chỉ đọc `tokens.css` ở module scope.
 *
 * Phạm vi (loại disabled — Requirement 3.7): KHÔNG đưa vào ma trận các cặp dùng
 * `--app-ink-disabled`, `--btn-primary-bg-disabled`, `--input-bg-disabled`,
 * `--input-text-disabled`.
 */

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { loadTokenSet, resolveToken, type TokenSet } from "./token-parser";

// ─────────────────────────────────────────────────────────────
// Constants & types
// ─────────────────────────────────────────────────────────────

const PROPERTY_TAG = "Feature: ux-ui-upgrade, Property 2: WCAG contrast trên mọi cặp màu của luồng cốt lõi";

type ThemeMode = "light" | "dark";

/**
 * Loại pair → ngưỡng WCAG 2.1 tương ứng.
 *   - normalText / placeholder        ≥ 4.5:1 (Req 3.1, 3.8)
 *   - largeText                       ≥ 3:1   (Req 3.2)
 *   - controlAffordance (border/icon) ≥ 3:1   (Req 3.3)
 *   - focusRing                       ≥ 3:1   (Req 4.2, 4.4)
 *
 * Các trạng thái hover/active/selected được dán nhãn theo loại pair gốc
 * (Req 3.6) — vd. text trên `accent-hover` vẫn là `normalText`.
 */
type PairCategory = "normalText" | "largeText" | "placeholder" | "controlAffordance" | "focusRing";

const THRESHOLD: Record<PairCategory, number> = {
  normalText: 4.5,
  largeText: 3.0,
  placeholder: 4.5,
  controlAffordance: 3.0,
  focusRing: 3.0,
};

interface ContrastPair {
  /** ID ngắn để debug / báo cáo. */
  id: string;
  category: PairCategory;
  /** Tên token màu chữ / màu visible. */
  fg: string;
  /** Tên token nền hiệu dụng (đã alpha-composite nếu cần). */
  bg: string;
  /**
   * Khi `fg` có alpha < 1, nền dùng để alpha-composite. Mặc định = `bg` (nền liền kề).
   * Tách riêng để cho phép trường hợp ring nằm trên một surface lồng trên page-bg
   * trong tương lai; hiện tại đa số không cần.
   */
  bgBaseForAlpha?: string;
}

// ─────────────────────────────────────────────────────────────
// Color parsing & WCAG contrast helpers (pure)
// ─────────────────────────────────────────────────────────────

interface RGBA {
  r: number; // 0..255
  g: number;
  b: number;
  a: number; // 0..1
}

interface RGB {
  r: number;
  g: number;
  b: number;
}

/** Clamp hex digit pair → 0..255. */
function fromHexPair(s: string): number {
  return Number.parseInt(s, 16);
}

/** Parse `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb(...)`, `rgba(...)`. Trả null nếu không phải màu. */
function parseColor(value: string): RGBA | null {
  const v = value.trim();
  if (!v) return null;

  // Named keywords thường gặp.
  if (/^transparent$/i.test(v)) return { r: 0, g: 0, b: 0, a: 0 };
  if (/^white$/i.test(v)) return { r: 255, g: 255, b: 255, a: 1 };
  if (/^black$/i.test(v)) return { r: 0, g: 0, b: 0, a: 1 };

  // Hex
  const hex = /^#([0-9a-fA-F]{3,8})$/.exec(v);
  if (hex) {
    const h = hex[1];
    if (h.length === 3) {
      return {
        r: fromHexPair(h[0] + h[0]),
        g: fromHexPair(h[1] + h[1]),
        b: fromHexPair(h[2] + h[2]),
        a: 1,
      };
    }
    if (h.length === 6) {
      return {
        r: fromHexPair(h.slice(0, 2)),
        g: fromHexPair(h.slice(2, 4)),
        b: fromHexPair(h.slice(4, 6)),
        a: 1,
      };
    }
    if (h.length === 8) {
      return {
        r: fromHexPair(h.slice(0, 2)),
        g: fromHexPair(h.slice(2, 4)),
        b: fromHexPair(h.slice(4, 6)),
        a: fromHexPair(h.slice(6, 8)) / 255,
      };
    }
  }

  // rgb()/rgba() — chấp nhận cả `,` lẫn space-separated, alpha có thể là `0.85` hoặc `85%`.
  const rgb = /^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)(?:\s*[,/ ]\s*([\d.]+%?))?\s*\)$/i.exec(v);
  if (rgb) {
    const [, rs, gs, bs, as] = rgb;
    let alpha = 1;
    if (as !== undefined) {
      alpha = as.endsWith("%") ? Number.parseFloat(as) / 100 : Number.parseFloat(as);
    }
    return {
      r: Number.parseFloat(rs),
      g: Number.parseFloat(gs),
      b: Number.parseFloat(bs),
      a: alpha,
    };
  }

  return null;
}

/**
 * Trích màu đầu tiên từ một literal có thể là shadow (`0 0 0 3px rgba(...)`).
 * Dùng cho `--app-focus-ring*` — chỉ phần `rgba(...)` mới là màu hiển thị.
 */
function extractFirstColor(value: string): RGBA | null {
  const direct = parseColor(value);
  if (direct !== null) return direct;
  const rgbMatch = /rgba?\([^)]+\)/i.exec(value);
  if (rgbMatch) return parseColor(rgbMatch[0]);
  const hexMatch = /#[0-9a-fA-F]{3,8}\b/.exec(value);
  if (hexMatch) return parseColor(hexMatch[0]);
  return null;
}

/** Alpha-compositing: fg (có alpha) trên nền bg opaque → màu hiển thị thực. */
function compositeOver(fg: RGBA, bg: RGB): RGB {
  const a = fg.a;
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
  };
}

/** sRGB channel → linear (WCAG 2.1). */
function linearize(channel0to255: number): number {
  const c = channel0to255 / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance theo WCAG 2.1. */
function relativeLuminance(c: RGB): number {
  return 0.2126 * linearize(c.r) + 0.7152 * linearize(c.g) + 0.0722 * linearize(c.b);
}

/** Contrast ratio theo WCAG 2.1: (L1 + 0.05) / (L2 + 0.05). */
function contrastRatio(a: RGB, b: RGB): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** Resolve một token tới màu RGBA; ném lỗi nếu không phải màu. */
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

// ─────────────────────────────────────────────────────────────
// Contrast pair matrix (giống cho cả light & dark — token tự đổi giá trị theo mode)
// ─────────────────────────────────────────────────────────────

/**
 * Mỗi entry mô tả một cặp (fg, bg) đại diện cho một tình huống render trên
 * Core_Flow_Screen. Token tự thay đổi giá trị giữa light/dark — danh sách giữ
 * nguyên cấu trúc, contrast được kiểm chứng độc lập trên từng theme.
 *
 * Quy tắc loại disabled: không đưa các token disabled vào ma trận (Req 3.7).
 */
const PAIRS: ReadonlyArray<ContrastPair> = [
  // ── Normal text trên các nền chính ────────────────────────────────────
  { id: "ink-on-bg", category: "normalText", fg: "--app-ink", bg: "--app-bg" },
  { id: "ink-on-surface", category: "normalText", fg: "--app-ink", bg: "--app-surface" },
  { id: "ink-on-bg-subtle", category: "normalText", fg: "--app-ink", bg: "--app-bg-subtle" },
  { id: "ink-soft-on-bg", category: "normalText", fg: "--app-ink-soft", bg: "--app-bg" },
  { id: "ink-soft-on-surface", category: "normalText", fg: "--app-ink-soft", bg: "--app-surface" },
  { id: "ink-soft-on-bg-subtle", category: "normalText", fg: "--app-ink-soft", bg: "--app-bg-subtle" },
  { id: "ink-link-on-bg", category: "normalText", fg: "--app-ink-link", bg: "--app-bg" },
  { id: "ink-link-on-surface", category: "normalText", fg: "--app-ink-link", bg: "--app-surface" },

  // ── Placeholder & muted (≥ 4.5:1, Req 3.8) ────────────────────────────
  { id: "ink-muted-on-bg", category: "placeholder", fg: "--app-ink-muted", bg: "--app-bg" },
  { id: "ink-muted-on-surface", category: "placeholder", fg: "--app-ink-muted", bg: "--app-surface" },
  { id: "input-placeholder-on-input-bg", category: "placeholder", fg: "--input-placeholder", bg: "--input-bg" },

  // ── Large text (≥ 3:1, Req 3.2) — caption / large heading variant ─────
  { id: "ink-muted-on-bg-subtle-large", category: "largeText", fg: "--app-ink-muted", bg: "--app-bg-subtle" },

  // ── Status text trên surface ─────────────────────────────────────────
  { id: "status-success-on-surface", category: "normalText", fg: "--app-status-success", bg: "--app-surface" },
  { id: "status-warning-on-surface", category: "normalText", fg: "--app-status-warning", bg: "--app-surface" },
  { id: "status-error-on-surface", category: "normalText", fg: "--app-status-error", bg: "--app-surface" },
  { id: "status-info-on-surface", category: "normalText", fg: "--app-status-info", bg: "--app-surface" },

  // ── Button: Primary (Execution) — text + hover/active variants (Req 3.6) ──
  { id: "btn-primary-text-on-bg", category: "normalText", fg: "--btn-primary-text", bg: "--btn-primary-bg" },
  {
    id: "btn-primary-text-on-bg-hover",
    category: "normalText",
    fg: "--btn-primary-text",
    bg: "--btn-primary-bg-hover",
  },
  {
    id: "btn-primary-text-on-bg-active",
    category: "normalText",
    fg: "--btn-primary-text",
    bg: "--btn-primary-bg-active",
  },

  // ── Button: Ghost / Outline (selected/hover bg) ──────────────────────
  { id: "btn-ghost-text-on-hover-bg", category: "normalText", fg: "--btn-ghost-text", bg: "--btn-ghost-bg-hover" },
  { id: "btn-ghost-text-on-active-bg", category: "normalText", fg: "--btn-ghost-text", bg: "--btn-ghost-bg-active" },
  { id: "btn-outline-text-on-bg", category: "normalText", fg: "--btn-outline-text", bg: "--btn-outline-bg" },
  {
    id: "btn-outline-text-on-hover-bg",
    category: "normalText",
    fg: "--btn-outline-text",
    bg: "--btn-outline-bg-hover",
  },

  // ── Button: Destructive (real-mode AlertDialog danger action — Req 9.3) ──
  { id: "btn-danger-text-on-bg", category: "normalText", fg: "--btn-danger-text", bg: "--btn-danger-bg" },
  { id: "btn-danger-text-on-bg-hover", category: "normalText", fg: "--btn-danger-text", bg: "--btn-danger-bg-hover" },

  // ── Reflection button + tag (Reflection context — Req 2.4) ───────────
  { id: "reflection-btn-text-on-bg", category: "normalText", fg: "--reflection-btn-text", bg: "--reflection-btn-bg" },
  {
    id: "reflection-btn-text-on-hover",
    category: "normalText",
    fg: "--reflection-btn-text",
    bg: "--reflection-btn-hover",
  },
  {
    id: "reflection-btn-text-on-active",
    category: "normalText",
    fg: "--reflection-btn-text",
    bg: "--reflection-btn-active",
  },
  { id: "reflection-tag-text-on-bg", category: "normalText", fg: "--reflection-tag-text", bg: "--reflection-tag-bg" },

  // ── Tag / Pill ────────────────────────────────────────────────────────
  { id: "tag-accent-text-on-bg", category: "normalText", fg: "--tag-accent-text", bg: "--tag-accent-bg" },
  { id: "tag-neutral-text-on-bg", category: "normalText", fg: "--tag-neutral-text", bg: "--tag-neutral-bg" },

  // ── Text on accent / warm primary surfaces (Req 3.6, 2.3, 2.4) ───────
  { id: "ink-on-accent", category: "normalText", fg: "--app-ink-on-accent", bg: "--app-accent" },
  { id: "ink-on-accent-hover", category: "normalText", fg: "--app-ink-on-accent", bg: "--app-accent-hover" },
  { id: "ink-on-accent-active", category: "normalText", fg: "--app-ink-on-accent", bg: "--app-accent-active" },
  { id: "ink-on-warm", category: "normalText", fg: "--app-ink-on-warm", bg: "--app-warm" },
  { id: "ink-on-warm-hover", category: "normalText", fg: "--app-ink-on-warm", bg: "--app-warm-hover" },
  { id: "ink-on-warm-active", category: "normalText", fg: "--app-ink-on-warm", bg: "--app-warm-active" },

  // ── Control affordance: borders + functional icons (≥ 3:1, Req 3.3) ──
  { id: "line-strong-on-surface", category: "controlAffordance", fg: "--app-line-strong", bg: "--app-surface" },
  { id: "line-strong-on-bg", category: "controlAffordance", fg: "--app-line-strong", bg: "--app-bg" },
  { id: "input-border-on-bg", category: "controlAffordance", fg: "--input-border", bg: "--input-bg" },
  { id: "input-border-focus-on-bg", category: "controlAffordance", fg: "--input-border-focus", bg: "--input-bg" },
  { id: "input-border-error-on-bg", category: "controlAffordance", fg: "--input-border-error", bg: "--input-bg" },
  { id: "btn-ghost-border-on-surface", category: "controlAffordance", fg: "--btn-ghost-border", bg: "--app-surface" },
  { id: "btn-outline-border-on-bg", category: "controlAffordance", fg: "--btn-outline-border", bg: "--btn-outline-bg" },
  { id: "accent-icon-on-surface", category: "controlAffordance", fg: "--app-accent", bg: "--app-surface" },
  { id: "accent-hover-icon-on-surface", category: "controlAffordance", fg: "--app-accent-hover", bg: "--app-surface" },
  {
    id: "accent-active-icon-on-surface",
    category: "controlAffordance",
    fg: "--app-accent-active",
    bg: "--app-surface",
  },
  { id: "warm-icon-on-surface", category: "controlAffordance", fg: "--app-warm", bg: "--app-surface" },
  { id: "warm-hover-icon-on-surface", category: "controlAffordance", fg: "--app-warm-hover", bg: "--app-surface" },
  { id: "warm-active-icon-on-surface", category: "controlAffordance", fg: "--app-warm-active", bg: "--app-surface" },
  { id: "status-error-icon-on-surface", category: "controlAffordance", fg: "--app-status-error", bg: "--app-surface" },
  {
    id: "status-warning-icon-on-surface",
    category: "controlAffordance",
    fg: "--app-status-warning",
    bg: "--app-surface",
  },

  // ── Focus ring (≥ 3:1 sau alpha-compositing — Req 4.2, 4.4) ───────────
  { id: "focus-ring-accent-on-bg", category: "focusRing", fg: "--app-focus-ring", bg: "--app-bg" },
  { id: "focus-ring-accent-on-surface", category: "focusRing", fg: "--app-focus-ring", bg: "--app-surface" },
  { id: "focus-ring-warm-on-bg", category: "focusRing", fg: "--app-focus-ring-warm", bg: "--app-bg" },
  { id: "focus-ring-warm-on-surface", category: "focusRing", fg: "--app-focus-ring-warm", bg: "--app-surface" },
];

// ─────────────────────────────────────────────────────────────
// Compute pair → contrast ratio (alpha-composite nếu cần)
// ─────────────────────────────────────────────────────────────

interface ComputedPair {
  pair: ContrastPair;
  mode: ThemeMode;
  fgValue: string;
  bgValue: string;
  visibleFg: RGB;
  effectiveBg: RGB;
  ratio: number;
  threshold: number;
}

function computePair(pair: ContrastPair, mode: ThemeMode, set: TokenSet): ComputedPair {
  const fg = resolveColor(pair.fg, set);
  const bg = resolveColor(pair.bg, set);

  // Nền hiệu dụng phải opaque. Nếu bg có alpha < 1 thì alpha-composite trước
  // qua bgBaseForAlpha (default = app-bg cùng theme).
  let effectiveBg: RGB;
  if (bg.a >= 1) {
    effectiveBg = { r: bg.r, g: bg.g, b: bg.b };
  } else {
    const baseName = pair.bgBaseForAlpha ?? "--app-bg";
    const base = resolveColor(baseName, set);
    if (base.a < 1) {
      throw new Error(`bgBase "${baseName}" cũng không opaque — không thể tổng hợp ổn định`);
    }
    effectiveBg = compositeOver(bg, { r: base.r, g: base.g, b: base.b });
  }

  // Fg có alpha < 1 (vd. focus ring rgba(.., 0.85)) → composite qua effectiveBg.
  const visibleFg: RGB = fg.a >= 1 ? { r: fg.r, g: fg.g, b: fg.b } : compositeOver(fg, effectiveBg);

  const ratio = contrastRatio(visibleFg, effectiveBg);
  const fgResolved = resolveToken(pair.fg, set).resolvedValue;
  const bgResolved = resolveToken(pair.bg, set).resolvedValue;

  return {
    pair,
    mode,
    fgValue: fgResolved,
    bgValue: bgResolved,
    visibleFg,
    effectiveBg,
    ratio,
    threshold: THRESHOLD[pair.category],
  };
}

// ─────────────────────────────────────────────────────────────
// Module-scope data (đọc một lần — pure test)
// ─────────────────────────────────────────────────────────────

const tokenSetByMode: Record<ThemeMode, TokenSet> = {
  light: loadTokenSet({ mode: "light" }),
  dark: loadTokenSet({ mode: "dark" }),
};

/** Chỉ số phẳng để generator chọn ngẫu nhiên trong toàn ma trận (mode × pair). */
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

describe("Property 2 — WCAG contrast trên mọi cặp màu của luồng cốt lõi (task 8.2)", () => {
  it("ma trận có dữ liệu để sinh mẫu (light + dark, ≥ 1 cặp mỗi loại)", () => {
    expect(PAIRS.length).toBeGreaterThan(0);
    expect(FLAT_ENTRIES.length).toBe(PAIRS.length * 2);
    for (const cat of Object.keys(THRESHOLD) as PairCategory[]) {
      const has = PAIRS.some((p) => p.category === cat);
      expect(has, `cần ít nhất 1 pair cho category "${cat}"`).toBe(true);
    }
  });

  it("không có pair nào tham chiếu disabled token (Req 3.7)", () => {
    const banned = new Set([
      "--app-ink-disabled",
      "--btn-primary-bg-disabled",
      "--input-bg-disabled",
      "--input-text-disabled",
    ]);
    for (const p of PAIRS) {
      expect(banned.has(p.fg), `pair ${p.id} fg dùng disabled token`).toBe(false);
      expect(banned.has(p.bg), `pair ${p.id} bg dùng disabled token`).toBe(false);
    }
  });

  it("mọi token trong ma trận đều resolve được trong cả light & dark", () => {
    for (const mode of ["light", "dark"] as ThemeMode[]) {
      const set = tokenSetByMode[mode];
      for (const p of PAIRS) {
        const fg = resolveToken(p.fg, set);
        const bg = resolveToken(p.bg, set);
        expect(fg.isNonEmpty, `${mode}/${p.id}: fg ${p.fg} non-empty`).toBe(true);
        expect(bg.isNonEmpty, `${mode}/${p.id}: bg ${p.bg} non-empty`).toBe(true);
      }
    }
  });

  /**
   * Property test chính.
   *
   * Cấu hình:
   *   - `numRuns: 1000` (vượt ngưỡng ≥ 100 trong design) để đảm bảo random
   *     sampling chạm được mọi pair với xác suất ≈ 1 (xác suất bỏ lỡ
   *     ≈ (57/58)^1000 ≈ 10^-8, không gây flake).
   *   - `seed: 1` để CI reproducible: cùng counter-example mỗi lần chạy nếu
   *     có vi phạm tái xuất hiện.
   */
  it(PROPERTY_TAG, () => {
    fc.assert(
      fc.property(fc.constantFrom(...FLAT_ENTRIES), (entry) => {
        const set = tokenSetByMode[entry.mode];
        const computed = computePair(entry.pair, entry.mode, set);

        if (computed.ratio < computed.threshold) {
          // Ném lỗi với chi tiết để counter-example hiện đầy đủ token & ratio.
          throw new Error(
            `Contrast violation [${entry.mode}/${entry.pair.id}] ` +
              `category=${entry.pair.category} ` +
              `fg=${entry.pair.fg}(${computed.fgValue}) ` +
              `bg=${entry.pair.bg}(${computed.bgValue}) ` +
              `ratio=${computed.ratio.toFixed(2)} threshold=${computed.threshold}`,
          );
        }
      }),
      { numRuns: 1000, seed: 1 },
    );
  });

  /**
   * Quét toàn ma trận một lần để liệt kê đủ vi phạm (test PBT ở trên là random
   * nên có thể không "chạm" mọi pair trong 100 vòng). Test này đóng vai trò
   * gate cứng cho Requirement 3 — liệt kê đầy đủ mọi vi phạm thay vì chỉ một
   * counter-example đại diện.
   */
  it("toàn ma trận đạt ngưỡng WCAG cho cả Light và Dark mode", () => {
    const violations: string[] = [];
    for (const mode of ["light", "dark"] as ThemeMode[]) {
      const set = tokenSetByMode[mode];
      for (const pair of PAIRS) {
        const computed = computePair(pair, mode, set);
        if (computed.ratio < computed.threshold) {
          violations.push(
            `[${mode}/${pair.id}] category=${pair.category} ` +
              `fg=${pair.fg}(${computed.fgValue}) ` +
              `bg=${pair.bg}(${computed.bgValue}) ` +
              `ratio=${computed.ratio.toFixed(2)} threshold=${computed.threshold}`,
          );
        }
      }
    }
    expect(violations, `Có ${violations.length} vi phạm contrast:\n${violations.join("\n")}`).toHaveLength(0);
  });
});
