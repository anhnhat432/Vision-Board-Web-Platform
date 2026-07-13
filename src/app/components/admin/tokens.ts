/**
 * Shared editorial tokens for the admin redesign.
 *
 * Use these instead of hard-coding colours across pages so the
 * admin surfaces stay visually aligned. Tailwind reads strings literally so the
 * full class string must appear here for the JIT to keep them in the bundle.
 */

export const adminSurface = {
  card: "rounded-[var(--r-card)] border border-app-line bg-app-surface shadow-sm",
  cardHover:
    "transition-colors duration-150 motion-reduce:transition-none hover:border-app-line-strong hover:bg-app-bg-subtle/30",
  cardAccent:
    "relative overflow-hidden rounded-[var(--r-card)] border border-app-line bg-app-surface shadow-sm",
  muted: "rounded-[var(--r-control)] border border-app-line bg-app-bg-subtle",
  divider: "border-app-line",
  glass:
    "rounded-[var(--r-card)] border border-app-line bg-app-surface/90 shadow-sm backdrop-blur-sm",
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

export const statAccentBars = {
  users: "bg-emerald-500/70",
  plus: "bg-sky-500/70",
  revenue: "bg-amber-500/70",
  orders: "bg-app-accent/70",
} as const;

export const statIconBg = {
  users: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  plus: "bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
  revenue: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  orders: "bg-app-accent-soft text-app-accent",
} as const;
