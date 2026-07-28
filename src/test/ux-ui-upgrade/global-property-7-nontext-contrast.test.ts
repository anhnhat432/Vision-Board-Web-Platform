/**
 * Property-Based Test — Property 7: Contrast thành phần phi văn bản và focus ring ≥ 3:1.
 *
 * Feature: global-ui-upgrade, Property 7: Contrast thành phần phi văn bản và focus ring ≥ 3:1.
 *
 * "For any cặp (token thành phần nhận-biết-phi-văn-bản — border control
 *  --app-line-strong, icon trạng thái --app-status-*, màu focus ring
 *  --app-focus-ring / --app-focus-ring-warm; nền liền kề) và for any
 *  mode ∈ {light, dark}, Contrast_Ratio ≥ 3:1."
 *
 * Validates: Requirements 7.2, 7.3
 *
 * Mô hình kiểm chứng (pure — không render DOM, không import React, không sửa product code):
 *   - Nguồn token: `src/styles/tokens.css` phân giải qua `token-parser.ts`
 *     (`loadTokenSet` + `resolveToken`) ở cả light (`:root`) và dark (`html.dark`).
 *   - Toán màu (WCAG 2.1 relative luminance + alpha-compositing) tái dùng
 *     helper test-only `contrast.ts` (`extractFirstColor`, `compositeOver`,
 *     `computeContrastRatio`, `meetsContrastThreshold`).
 *   - `--app-focus-ring` / `--app-focus-ring-warm` là literal dạng box-shadow
 *     (vd. "0 0 0 3px rgba(...)"); `extractFirstColor` rút phần `rgba(...)` làm
 *     màu hiển thị. Ring thường có alpha < 1 nên được alpha-composite qua nền
 *     liền kề trước khi tính contrast.
 *
 * Generator: chọn một cặp (mode, pair) BẤT KỲ trong ma trận (mode × pair) qua
 * `fc.constantFrom`, `fc.assert(..., { numRuns: 100 })`. Kèm một test liệt kê
 * tường minh toàn ma trận để làm cổng cứng (liệt kê mọi vi phạm).
 *
 * Ý nghĩa thất bại: có một affordance phi văn bản hoặc focus ring không đạt
 * 3:1 so với nền liền kề ở một mode — vi phạm Requirement 7.2 / 7.3, cần chỉnh
 * GIÁ TRỊ token (giữ nguyên tên) trong tokens.css.
 */

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
  compositeOver,
  computeContrastRatio,
  type ContrastCategory,
  CONTRAST_THRESHOLD,
  extractFirstColor,
  meetsContrastThreshold,
  type RGB,
  type RGBA,
} from "./contrast";
import { loadTokenSet, resolveToken, type TokenSet } from "./token-parser";

const PROPERTY_TAG = "Feature: global-ui-upgrade, Property 7: Contrast thành phần phi văn bản và focus ring ≥ 3:1";

type ThemeMode = "light" | "dark";

/** Các nền liền kề hợp lệ mà affordance/ring có thể nằm trên (đều opaque). */
const ADJACENT_BACKGROUNDS = ["--app-bg", "--app-bg-subtle", "--app-surface"] as const;

interface NonTextPair {
  /** ID ngắn để debug / báo cáo. */
  id: string;
  category: ContrastCategory;
  /** Token thành phần phi văn bản / focus ring. */
  fg: string;
  /** Token nền liền kề (opaque). */
  bg: string;
}

/**
 * Token affordance phi văn bản (border control + icon trạng thái) — ngưỡng 3:1
 * (controlAffordance). Focus ring nằm ở nhóm riêng bên dưới.
 */
const AFFORDANCE_TOKENS = [
  "--app-line-strong",
  "--app-status-success",
  "--app-status-warning",
  "--app-status-error",
  "--app-status-info",
] as const;

/** Focus ring — ngưỡng 3:1 (focusRing), giá trị là box-shadow chứa rgba(...). */
const FOCUS_RING_TOKENS = ["--app-focus-ring", "--app-focus-ring-warm"] as const;

/** Sinh ma trận (affordance/ring × nền liền kề). */
const PAIRS: ReadonlyArray<NonTextPair> = [
  ...AFFORDANCE_TOKENS.flatMap((fg) =>
    ADJACENT_BACKGROUNDS.map<NonTextPair>((bg) => ({
      id: `${fg.replace("--app-", "")}-on-${bg.replace("--app-", "")}`,
      category: "controlAffordance",
      fg,
      bg,
    })),
  ),
  ...FOCUS_RING_TOKENS.flatMap((fg) =>
    ADJACENT_BACKGROUNDS.map<NonTextPair>((bg) => ({
      id: `${fg.replace("--app-", "")}-on-${bg.replace("--app-", "")}`,
      category: "focusRing",
      fg,
      bg,
    })),
  ),
];

// ─────────────────────────────────────────────────────────────
// Chuẩn bị dữ liệu (đọc một lần ở module scope — pure, test-time)
// ─────────────────────────────────────────────────────────────

const tokenSetByMode: Record<ThemeMode, TokenSet> = {
  light: loadTokenSet({ mode: "light" }),
  dark: loadTokenSet({ mode: "dark" }),
};

interface FlatEntry {
  mode: ThemeMode;
  pair: NonTextPair;
}

const FLAT_ENTRIES: ReadonlyArray<FlatEntry> = (["light", "dark"] as const).flatMap((mode) =>
  PAIRS.map((pair) => ({ mode, pair })),
);

/** Resolve token → RGBA (rút màu đầu tiên nếu là box-shadow). Ném lỗi nếu không phải màu. */
function resolveColor(name: string, set: TokenSet): RGBA {
  const r = resolveToken(name, set);
  if (!r.isNonEmpty) {
    throw new Error(`Token ${name} resolve về rỗng`);
  }
  const c = extractFirstColor(r.resolvedValue);
  if (!c) {
    throw new Error(`Token ${name} → "${r.resolvedValue}" không chứa giá trị màu hợp lệ`);
  }
  return c;
}

interface ComputedPair {
  ratio: number;
  threshold: number;
  fgValue: string;
  bgValue: string;
  effectiveBg: RGB;
  visibleFg: RGB;
}

function computePair(pair: NonTextPair, set: TokenSet): ComputedPair {
  const fg = resolveColor(pair.fg, set);
  const bg = resolveColor(pair.bg, set);

  if (bg.a < 1) {
    throw new Error(`Nền liền kề ${pair.bg} không opaque (alpha=${bg.a}) — không thể so contrast ổn định`);
  }
  const effectiveBg: RGB = { r: bg.r, g: bg.g, b: bg.b };

  // Affordance/ring có alpha < 1 (vd. focus ring rgba(.., 0.85)) → composite qua nền liền kề.
  const visibleFg: RGB = fg.a >= 1 ? { r: fg.r, g: fg.g, b: fg.b } : compositeOver(fg, effectiveBg);

  const ratio = computeContrastRatio(visibleFg, effectiveBg);

  return {
    ratio,
    threshold: CONTRAST_THRESHOLD[pair.category],
    fgValue: resolveToken(pair.fg, set).resolvedValue,
    bgValue: resolveToken(pair.bg, set).resolvedValue,
    effectiveBg,
    visibleFg,
  };
}

// ─────────────────────────────────────────────────────────────
// Property 7
// ─────────────────────────────────────────────────────────────

describe("Property 7 — Contrast thành phần phi văn bản và focus ring ≥ 3:1 (task 2.7)", () => {
  it("ma trận có dữ liệu để sinh mẫu (light + dark, có affordance và focus ring)", () => {
    expect(PAIRS.length).toBeGreaterThan(0);
    expect(FLAT_ENTRIES.length).toBe(PAIRS.length * 2);
    expect(PAIRS.some((p) => p.category === "controlAffordance")).toBe(true);
    expect(PAIRS.some((p) => p.category === "focusRing")).toBe(true);
  });

  it("mọi token trong ma trận đều resolve được ở cả light & dark", () => {
    for (const mode of ["light", "dark"] as ThemeMode[]) {
      const set = tokenSetByMode[mode];
      for (const p of PAIRS) {
        expect(resolveToken(p.fg, set).isNonEmpty, `${mode}/${p.id}: fg ${p.fg} non-empty`).toBe(true);
        expect(resolveToken(p.bg, set).isNonEmpty, `${mode}/${p.id}: bg ${p.bg} non-empty`).toBe(true);
      }
    }
  });

  it(`${PROPERTY_TAG}`, () => {
    fc.assert(
      fc.property(fc.constantFrom(...FLAT_ENTRIES), (entry) => {
        const set = tokenSetByMode[entry.mode];
        const computed = computePair(entry.pair, set);

        if (!meetsContrastThreshold(computed.ratio, entry.pair.category)) {
          throw new Error(
            `Contrast violation [${entry.mode}/${entry.pair.id}] ` +
              `category=${entry.pair.category} ` +
              `fg=${entry.pair.fg}(${computed.fgValue}) ` +
              `bg=${entry.pair.bg}(${computed.bgValue}) ` +
              `ratio=${computed.ratio.toFixed(2)} threshold=${computed.threshold}`,
          );
        }
      }),
      { numRuns: 100 },
    );
  });

  it("toàn ma trận đạt ngưỡng ≥ 3:1 cho cả Light và Dark mode (enumeration)", () => {
    const violations: string[] = [];
    for (const mode of ["light", "dark"] as ThemeMode[]) {
      const set = tokenSetByMode[mode];
      for (const pair of PAIRS) {
        const computed = computePair(pair, set);
        if (!meetsContrastThreshold(computed.ratio, pair.category)) {
          violations.push(
            `[${mode}/${pair.id}] category=${pair.category} ` +
              `fg=${pair.fg}(${computed.fgValue}) ` +
              `bg=${pair.bg}(${computed.bgValue}) ` +
              `ratio=${computed.ratio.toFixed(2)} threshold=${computed.threshold}`,
          );
        }
      }
    }
    expect(violations, `Có ${violations.length} vi phạm contrast phi văn bản:\n${violations.join("\n")}`).toHaveLength(
      0,
    );
  });
});
