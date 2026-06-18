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

/**
 * Tailwind-class palette variant for life areas.
 *
 * Survey/onboarding screens (LifeBalance, LifeInsight, Onboarding) render with
 * utility class strings (`bgLight`, `border`, hover/selected states) rather than
 * inline token styles. This shared map keeps those screens in sync instead of
 * duplicating the same switch in each page. `accent` still resolves to the
 * semantic accent token so it stays aligned with `getLifeAreaTheme`.
 */
export interface AreaColorConfig {
  bgLight: string;
  text: string;
  border: string;
  accent: string;
  hoverBg: string;
  selectedBg: string;
  iconBg: string;
  iconSelectedBg: string;
}

const AREA_COLOR_PRESETS: readonly AreaColorConfig[] = [
  // Career – blue
  {
    bgLight: "bg-blue-50 dark:bg-blue-950/20",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-900/30",
    accent: "var(--color-career-accent)",
    hoverBg: "hover:bg-blue-50/50 hover:border-blue-300 dark:hover:bg-blue-950/10",
    selectedBg:
      "border-blue-500 bg-gradient-to-br from-blue-500/10 to-blue-500/5 ring-1 ring-blue-500/20 shadow-md shadow-blue-500/10",
    iconBg: "bg-blue-100/60 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 group-hover:bg-blue-100",
    iconSelectedBg: "bg-blue-600 text-white",
  },
  // Finance – amber
  {
    bgLight: "bg-amber-50 dark:bg-amber-950/20",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-200 dark:border-amber-900/30",
    accent: "var(--color-finance-accent)",
    hoverBg: "hover:bg-amber-50/50 hover:border-amber-300 dark:hover:bg-amber-950/10",
    selectedBg:
      "border-amber-500 bg-gradient-to-br from-amber-500/10 to-amber-500/5 ring-1 ring-amber-500/20 shadow-md shadow-amber-500/10",
    iconBg: "bg-amber-100/60 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 group-hover:bg-amber-100",
    iconSelectedBg: "bg-amber-500 text-white",
  },
  // Health – emerald
  {
    bgLight: "bg-emerald-50 dark:bg-emerald-950/20",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-900/30",
    accent: "var(--color-health-accent)",
    hoverBg: "hover:bg-emerald-50/50 hover:border-emerald-300 dark:hover:bg-emerald-950/10",
    selectedBg:
      "border-emerald-500 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 ring-1 ring-emerald-500/20 shadow-md shadow-emerald-500/10",
    iconBg:
      "bg-emerald-100/60 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 group-hover:bg-emerald-100",
    iconSelectedBg: "bg-emerald-600 text-white",
  },
  // Education – indigo
  {
    bgLight: "bg-indigo-50 dark:bg-indigo-950/20",
    text: "text-indigo-600 dark:text-indigo-400",
    border: "border-indigo-200 dark:border-indigo-900/30",
    accent: "var(--color-education-accent)",
    hoverBg: "hover:bg-indigo-50/50 hover:border-indigo-300 dark:hover:bg-indigo-950/10",
    selectedBg:
      "border-indigo-500 bg-gradient-to-br from-indigo-500/10 to-indigo-500/5 ring-1 ring-indigo-500/20 shadow-md shadow-indigo-500/10",
    iconBg: "bg-indigo-100/60 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 group-hover:bg-indigo-100",
    iconSelectedBg: "bg-indigo-600 text-white",
  },
  // Relationships – rose
  {
    bgLight: "bg-rose-50 dark:bg-rose-950/20",
    text: "text-rose-600 dark:text-rose-400",
    border: "border-rose-200 dark:border-rose-900/30",
    accent: "var(--color-relationships-accent)",
    hoverBg: "hover:bg-rose-50/50 hover:border-rose-300 dark:hover:bg-rose-950/10",
    selectedBg:
      "border-rose-500 bg-gradient-to-br from-rose-500/10 to-rose-500/5 ring-1 ring-rose-500/20 shadow-md shadow-rose-500/10",
    iconBg: "bg-rose-100/60 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 group-hover:bg-rose-100",
    iconSelectedBg: "bg-rose-600 text-white",
  },
  // Family – teal
  {
    bgLight: "bg-teal-50 dark:bg-teal-950/20",
    text: "text-teal-600 dark:text-teal-400",
    border: "border-teal-200 dark:border-teal-900/30",
    accent: "var(--color-family-accent)",
    hoverBg: "hover:bg-teal-50/50 hover:border-teal-300 dark:hover:bg-teal-950/10",
    selectedBg:
      "border-teal-500 bg-gradient-to-br from-teal-500/10 to-teal-500/5 ring-1 ring-teal-500/20 shadow-md shadow-teal-500/10",
    iconBg: "bg-teal-100/60 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400 group-hover:bg-teal-100",
    iconSelectedBg: "bg-teal-600 text-white",
  },
  // Personal Growth – orange
  {
    bgLight: "bg-orange-50 dark:bg-orange-950/20",
    text: "text-orange-600 dark:text-orange-400",
    border: "border-orange-200 dark:border-orange-900/30",
    accent: "var(--color-personal-growth-accent)",
    hoverBg: "hover:bg-orange-50/50 hover:border-orange-300 dark:hover:bg-orange-950/10",
    selectedBg:
      "border-orange-500 bg-gradient-to-br from-orange-500/10 to-orange-500/5 ring-1 ring-orange-500/20 shadow-md shadow-orange-500/10",
    iconBg: "bg-orange-100/60 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400 group-hover:bg-orange-100",
    iconSelectedBg: "bg-orange-600 text-white",
  },
  // Leisure – sky
  {
    bgLight: "bg-sky-50 dark:bg-sky-950/20",
    text: "text-sky-600 dark:text-sky-400",
    border: "border-sky-200 dark:border-sky-900/30",
    accent: "var(--color-leisure-accent)",
    hoverBg: "hover:bg-sky-50/50 hover:border-sky-300 dark:hover:bg-sky-950/10",
    selectedBg:
      "border-sky-500 bg-gradient-to-br from-sky-500/10 to-sky-500/5 ring-1 ring-sky-500/20 shadow-md shadow-sky-500/10",
    iconBg: "bg-sky-100/60 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400 group-hover:bg-sky-100",
    iconSelectedBg: "bg-sky-600 text-white",
  },
];

const NAMED_AREA_COLORS: Record<string, AreaColorConfig> = {
  Career: AREA_COLOR_PRESETS[0],
  Finance: AREA_COLOR_PRESETS[1],
  Health: AREA_COLOR_PRESETS[2],
  Education: AREA_COLOR_PRESETS[3],
  Relationships: AREA_COLOR_PRESETS[4],
  Family: AREA_COLOR_PRESETS[5],
  "Personal Growth": AREA_COLOR_PRESETS[6],
  Leisure: AREA_COLOR_PRESETS[7],
};

function hashAreaName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return h;
}

export const getAreaColorConfig = (name: string): AreaColorConfig => {
  const named = NAMED_AREA_COLORS[name];
  if (named) return named;
  return AREA_COLOR_PRESETS[hashAreaName(name) % AREA_COLOR_PRESETS.length];
};
