/**
 * Shared editorial tokens for the admin redesign.
 *
 * Use these instead of hard-coding colours across pages so the
 * admin surfaces stay visually aligned. Tailwind reads strings literally so the
 * full class string must appear here for the JIT to keep them in the bundle.
 */

export const adminSurface = {
  card: "bg-app-surface border border-app-line rounded-[var(--r-card)]",
  cardHover: "hover:bg-app-accent-soft/30 transition-colors",
  muted: "bg-app-bg-subtle border border-app-line rounded-[var(--r-control)]",
  divider: "border-app-line",
} as const;

export const adminText = {
  hi: "text-app-ink",
  body: "text-app-ink-soft",
  muted: "text-app-ink-muted",
  dim: "text-app-ink-muted",
} as const;

export const adminInput =
  "bg-app-bg-subtle border-app-line text-app-ink placeholder:text-app-ink-muted focus-visible:ring-app-accent/40";

export const adminFocusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40 focus-visible:ring-offset-0";
