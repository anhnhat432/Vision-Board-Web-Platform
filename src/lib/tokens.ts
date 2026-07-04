/**
 * Design Tokens — TypeScript mirror
 *
 * Dùng file này khi cần token values trong:
 *   - Inline styles (style={{ color: tokens.ink }})
 *   - Animation/motion values (framer-motion, CSS-in-JS)
 *   - Canvas drawing / chart fill props
 *   - Unit tests asserting colors
 *
 * QUAN TRỌNG:
 *   - Trong JSX: ưu tiên Tailwind classes (bg-app-accent, text-app-ink...)
 *   - Chỉ import từ đây khi KHÔNG thể dùng Tailwind class.
 *   - Warm tokens: CHỈ dùng trong Reflection/Review context.
 */

/* ── Primitive palette ──────────────────────────────────────── */
const green = {
  950: "#152B25",
  900: "#1E3D35",
  800: "#264E43",
  700: "#2F5D50",
  600: "#3A7261",
  100: "#E8F0EC",
  50: "#F2F7F4",
} as const;

const terra = {
  800: "#A8522F",
  700: "#C96843",
  600: "#D97757",
  100: "#FCEDE5",
  50: "#FEF6F1",
} as const;

const neutral = {
  950: "#1A1A1A",
  700: "#4A4A4A",
  500: "#6B6B6B",
  400: "#8A8A8A",
  300: "#B8B2AA",
  200: "#D4CFC8",
  150: "#ECE8E1",
  50: "#FAF8F5",
  0: "#FFFFFF",
} as const;

/* ── Token shape ────────────────────────────────────────────── */
export type AppTokens = {
  bg: string;
  bgSubtle: string;
  surface: string;
  ink: string;
  inkSoft: string;
  inkMuted: string;
  inkDisabled: string;
  inkOnAccent: string;
  inkOnWarm: string;
  inkLink: string;
  line: string;
  lineStrong: string;
  accent: string;
  accentHover: string;
  accentActive: string;
  accentSoft: string;
  accentSubtle: string;
  warm: string;
  warmHover: string;
  warmActive: string;
  warmSoft: string;
  warmSubtle: string;
  warmStrong: string;
  warmBorder: string;
  statusSuccess: string;
  statusWarning: string;
  statusError: string;
  statusInfo: string;
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;
  shadowXl: string;
  focusRing: string;
  focusRingWarm: string;
};

/* ── Semantic tokens — Light mode ───────────────────────────── */
export const tokens: AppTokens = {
  /* Background */
  bg: neutral[50],
  bgSubtle: "#F5F2EE",
  surface: neutral[0],

  /* Text */
  ink: neutral[950],
  inkSoft: neutral[700],
  inkMuted: neutral[500],
  inkDisabled: neutral[300],
  inkOnAccent: neutral[0],
  inkOnWarm: neutral[0],
  inkLink: green[700],

  /* Border */
  line: neutral[150],
  lineStrong: neutral[200],

  /* Accent — Forest Green */
  accent: green[700],
  accentHover: green[800],
  accentActive: green[900],
  accentSoft: green[100],
  accentSubtle: green[50],

  /* Warm — Terracotta (Reflection ONLY) */
  warm: terra[600],
  warmHover: terra[700],
  warmActive: terra[800],
  warmSoft: terra[100],
  warmSubtle: terra[50],
  warmStrong: "#5C3A2E",
  warmBorder: "#F3D9CC",

  /* Status */
  statusSuccess: "#3A7D5E",
  statusWarning: "#C4841A",
  statusError: "#B84040",
  statusInfo: "#3A6B9E",

  /* Shadow (string values for boxShadow) */
  shadowSm: "0 1px 3px rgba(26,26,26,0.06), 0 1px 2px rgba(26,26,26,0.04)",
  shadowMd: "0 4px 12px rgba(26,26,26,0.08), 0 2px 4px rgba(26,26,26,0.04)",
  shadowLg: "0 8px 24px rgba(26,26,26,0.10), 0 4px 8px rgba(26,26,26,0.06)",
  shadowXl: "0 16px 40px rgba(26,26,26,0.12), 0 8px 16px rgba(26,26,26,0.06)",

  /* Focus ring */
  focusRing: "0 0 0 3px rgba(47, 93, 80, 0.20)",
  focusRingWarm: "0 0 0 3px rgba(217, 119, 87, 0.20)",
};

/* ── Dark mode token overrides ──────────────────────────────── */
// Dùng Partial<AppTokens> thay vì Partial<typeof tokens> để tránh
// TypeScript enforce literal string types từ light mode as const.
export const tokensDark: Partial<AppTokens> = {
  bg: "#1C1A15",
  bgSubtle: "#211F1A",
  surface: "#26231D",

  ink: "#F2EDE5",
  inkSoft: "#C8C2B5",
  inkMuted: "#A39B8C",
  inkDisabled: "#6B6358",
  inkLink: "#5BA590",

  line: "#3A342B",
  lineStrong: "#4A4239",

  accent: "#5BA590",
  accentHover: "#4D9480",
  accentActive: "#3E7A68",
  accentSoft: "#1F3A33",
  accentSubtle: "#192E28",

  warm: "#E89878",
  warmHover: "#D98060",
  warmActive: "#C96843",
  warmSoft: "#3A2820",
  warmSubtle: "#2E201A",
  warmStrong: "#F8D5C2",
  warmBorder: "#5C3A2E",

  shadowSm: "0 1px 3px rgba(0,0,0,0.20), 0 1px 2px rgba(0,0,0,0.15)",
  shadowMd: "0 4px 12px rgba(0,0,0,0.28), 0 2px 4px rgba(0,0,0,0.16)",
  shadowLg: "0 8px 24px rgba(0,0,0,0.36), 0 4px 8px rgba(0,0,0,0.20)",
  shadowXl: "0 16px 40px rgba(0,0,0,0.44), 0 8px 16px rgba(0,0,0,0.24)",
};

/* ── Runtime token resolver ─────────────────────────────────── */
/** Trả về token value theo mode hiện tại (dùng trong JS context). */
export function getToken(key: keyof AppTokens, isDark = false): string {
  if (isDark && key in tokensDark) {
    return tokensDark[key] as string;
  }
  return tokens[key];
}

/* ── Reflection context helpers ─────────────────────────────── */
/**
 * isReflectionScreen — Danh sách route/screen thuộc Reflection context.
 * Khi một screen xuất hiện trong danh sách này:
 *   - Dùng warm token thay accent token
 *   - Primary button: bg-app-warm, hover:bg-app-warm-hover
 *   - Card border: border-app-warm-border
 *   - Prompt text: text-app-warm, font-serif
 */
export const REFLECTION_ROUTES = ["/weekly-reflection", "/daily-checkin", "/goal-review", "/review"] as const;

export type ReflectionRoute = (typeof REFLECTION_ROUTES)[number];

export function isReflectionRoute(pathname: string): boolean {
  return REFLECTION_ROUTES.some((r) => pathname.startsWith(r));
}

/* ── Flow → Color zone mapping ──────────────────────────────── */
/**
 * Bản đồ màu theo flow sản phẩm.
 * Giá trị là "accent" hoặc "warm" — dùng để switch token context.
 */
export const FLOW_COLOR_ZONE = {
  onboarding: "accent",
  lifeBalance: "accent",
  lifeInsight: "accent",
  smartGoal: "accent",
  feasibility: "accent",
  twelveWeekPlan: "accent",
  weeklyExecution: "accent",
  weeklyReflection: "warm",
  dailyCheckin: "warm",
  goalReview: "warm",
} as const;

export type FlowStep = keyof typeof FLOW_COLOR_ZONE;
export type ColorZone = (typeof FLOW_COLOR_ZONE)[FlowStep];
