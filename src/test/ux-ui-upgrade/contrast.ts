/**
 * Test-only WCAG 2.1 contrast helper (KHÔNG đưa vào bundle sản phẩm).
 *
 * Helper thuần dùng chung cho các property test tương phản màu. Tái sử dụng cách
 * tính đã có trong `property-2-contrast.test.ts` (WCAG 2.1 relative luminance +
 * alpha-compositing) nhưng tách ra thành module test-only để các test khác
 * (vd. Property 6 — Core_Flow) dùng lại mà không lặp code.
 *
 * KHÔNG import product code — chỉ toán học màu thuần.
 *
 * Tham chiếu:
 *   - WCAG 2.1 SC 1.4.3 (text 4.5:1), 1.4.11 (non-text/UI 3:1), 2.4.7 (focus).
 *   - Design: core-flow-ui-upgrade → R12 Accessibility, Property 6.
 */

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface RGB {
  r: number; // 0..255
  g: number;
  b: number;
}

export interface RGBA extends RGB {
  a: number; // 0..1
}

/**
 * Loại cặp màu → ngưỡng WCAG tương ứng.
 *   - normalText / placeholder        ≥ 4.5:1 (SC 1.4.3 / Req 12.5)
 *   - largeText                       ≥ 3:1   (SC 1.4.3 large / Req 12.5)
 *   - controlAffordance (border/icon) ≥ 3:1   (SC 1.4.11 / Req 12.5)
 *   - focusRing                       ≥ 3:1   (SC 1.4.11 & 2.4.7 / Req 12.3)
 */
export type ContrastCategory = "normalText" | "largeText" | "placeholder" | "controlAffordance" | "focusRing";

export const CONTRAST_THRESHOLD: Record<ContrastCategory, number> = {
  normalText: 4.5,
  largeText: 3.0,
  placeholder: 4.5,
  controlAffordance: 3.0,
  focusRing: 3.0,
};

// ─────────────────────────────────────────────────────────────
// Color parsing (hex / rgb / rgba / named)
// ─────────────────────────────────────────────────────────────

function fromHexPair(s: string): number {
  return Number.parseInt(s, 16);
}

/** Parse `#rgb`, `#rrggbb`, `#rrggbbaa`, `rgb(...)`, `rgba(...)`, một số keyword. Null nếu không phải màu. */
export function parseColor(value: string): RGBA | null {
  const v = value.trim();
  if (!v) return null;

  if (/^transparent$/i.test(v)) return { r: 0, g: 0, b: 0, a: 0 };
  if (/^white$/i.test(v)) return { r: 255, g: 255, b: 255, a: 1 };
  if (/^black$/i.test(v)) return { r: 0, g: 0, b: 0, a: 1 };

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
 * Dùng cho focus ring — chỉ phần `rgba(...)` mới là màu hiển thị.
 */
export function extractFirstColor(value: string): RGBA | null {
  const direct = parseColor(value);
  if (direct !== null) return direct;
  const rgbMatch = /rgba?\([^)]+\)/i.exec(value);
  if (rgbMatch) return parseColor(rgbMatch[0]);
  const hexMatch = /#[0-9a-fA-F]{3,8}\b/.exec(value);
  if (hexMatch) return parseColor(hexMatch[0]);
  return null;
}

// ─────────────────────────────────────────────────────────────
// Alpha compositing + WCAG contrast (pure)
// ─────────────────────────────────────────────────────────────

/** Alpha-compositing: fg (có alpha) trên nền bg opaque → màu hiển thị thực. */
export function compositeOver(fg: RGBA, bg: RGB): RGB {
  const a = fg.a;
  return {
    r: fg.r * a + bg.r * (1 - a),
    g: fg.g * a + bg.g * (1 - a),
    b: fg.b * a + bg.b * (1 - a),
  };
}

/** sRGB channel (0..255) → linear (WCAG 2.1). */
function linearize(channel0to255: number): number {
  const c = channel0to255 / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance theo WCAG 2.1. */
export function relativeLuminance(c: RGB): number {
  return 0.2126 * linearize(c.r) + 0.7152 * linearize(c.g) + 0.0722 * linearize(c.b);
}

/** Contrast ratio theo WCAG 2.1: (L1 + 0.05) / (L2 + 0.05). Kết quả ∈ [1, 21]. */
export function computeContrastRatio(fg: RGB, bg: RGB): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** true nếu `ratio` đạt ngưỡng WCAG của `category`. */
export function meetsContrastThreshold(ratio: number, category: ContrastCategory): boolean {
  return ratio >= CONTRAST_THRESHOLD[category];
}
