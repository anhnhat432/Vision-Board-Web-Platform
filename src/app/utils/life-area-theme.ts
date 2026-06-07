import type { CSSProperties } from "react";

/**
 * Shared life-area theming.
 *
 * Every life area maps to a single semantic accent token declared in
 * `src/styles/tokens.css` (`--color-<area>-accent`). All surface tints, borders
 * and selection states are derived from that one accent via `color-mix`, so no
 * primitive Tailwind palette (blue-/amber-/emerald-/...) is consumed directly.
 *
 * This replaces the duplicated `getAreaColorConfig` / `getIntentColorConfig`
 * helpers that previously hard-coded primitive colors in LifeBalance and
 * LifeInsight, which broke the design-token contract (see docs/DESIGN.md §6.2).
 */

const AREA_ACCENT_VARS: Record<string, string> = {
  Career: "--color-career-accent",
  Finance: "--color-finance-accent",
  Health: "--color-health-accent",
  Education: "--color-education-accent",
  Relationships: "--color-relationships-accent",
  Family: "--color-family-accent",
  "Personal Growth": "--color-personal-growth-accent",
  Leisure: "--color-leisure-accent",
};

/** Resolve the accent CSS variable for a life area, falling back to the brand accent. */
export function getLifeAreaAccentVar(name: string): string {
  const token = AREA_ACCENT_VARS[name];
  return token ? `var(${token})` : "var(--app-accent)";
}

export interface LifeAreaTheme {
  /** Accent CSS variable string, e.g. `var(--color-career-accent)`. */
  accent: string;
  /** Quiet tinted surface (calm card background + border). */
  surfaceStyle: CSSProperties;
  /** Solid accent fill, for icon chips / dots. */
  accentBgStyle: CSSProperties;
  /** Stronger tinted surface for the selected/active state. */
  selectedSurfaceStyle: CSSProperties;
}

/**
 * Build token-driven inline styles for a life area.
 *
 * Tints use `color-mix` against semantic surface/line tokens so they adapt to
 * light/dark mode automatically and never rely on primitive Tailwind colors.
 */
export function getLifeAreaTheme(name: string): LifeAreaTheme {
  const accent = getLifeAreaAccentVar(name);

  return {
    accent,
    surfaceStyle: {
      backgroundColor: `color-mix(in oklab, ${accent} 8%, var(--app-surface))`,
      borderColor: `color-mix(in oklab, ${accent} 22%, var(--app-line))`,
    },
    accentBgStyle: {
      backgroundColor: accent,
    },
    selectedSurfaceStyle: {
      backgroundColor: `color-mix(in oklab, ${accent} 14%, var(--app-surface))`,
      borderColor: accent,
      boxShadow: `0 0 0 1px color-mix(in oklab, ${accent} 35%, transparent)`,
    },
  };
}
