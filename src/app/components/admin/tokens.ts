/**
 * Shared editorial tokens for the admin redesign.
 *
 * Use these instead of hard-coding colours across pages so the
 * admin surfaces stay visually aligned. Tailwind reads strings literally so the
 * full class string must appear here for the JIT to keep them in the bundle.
 */

export const adminSurface = {
  card:
    "bg-app-surface border border-app-line rounded-[var(--r-card)] shadow-sm",
  cardHover:
    "hover:shadow-md hover:-translate-y-0.5 transition-all duration-200",
  cardAccent:
    "bg-app-surface border border-app-line rounded-[var(--r-card)] shadow-sm relative overflow-hidden",
  muted: "bg-app-bg-subtle border border-app-line rounded-[var(--r-control)]",
  divider: "border-app-line",
  glass:
    "bg-app-surface/80 backdrop-blur-sm border border-app-line/60 rounded-[var(--r-card)] shadow-sm",
} as const;

export const adminText = {
  hi: "text-app-ink",
  body: "text-app-ink-soft",
  muted: "text-app-ink-muted",
  dim: "text-app-ink-muted",
} as const;

export const adminInput =
  "bg-app-bg-subtle border-app-line text-app-ink placeholder:text-app-ink-muted focus-visible:ring-app-accent/40 transition-colors duration-150";

export const adminFocusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40 focus-visible:ring-offset-0";

/** Accent bar colours for stat cards — each card gets a unique top-bar hue. */
export const statAccentBars = {
  users: "bg-gradient-to-r from-emerald-400 to-teal-500",
  plus: "bg-gradient-to-r from-violet-400 to-purple-500",
  revenue: "bg-gradient-to-r from-amber-400 to-orange-500",
  orders: "bg-gradient-to-r from-sky-400 to-blue-500",
} as const;

/** Icon container gradient backgrounds for stat cards. */
export const statIconBg = {
  users: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  plus: "bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
  revenue: "bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  orders: "bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400",
} as const;
