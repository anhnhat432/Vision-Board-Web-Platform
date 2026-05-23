/**
 * Shared dark-theme tokens for the admin redesign.
 *
 * Use these instead of hard-coding `bg-white/[0.03]` etc. across pages so the
 * admin surfaces stay visually aligned. Tailwind reads strings literally so the
 * full class string must appear here for the JIT to keep them in the bundle.
 */

export const adminSurface = {
  card: "bg-white/[0.03] border border-white/10 rounded-[var(--r-card)]",
  cardHover: "hover:bg-white/[0.05] transition-colors",
  muted: "bg-white/5 border border-white/10 rounded-[var(--r-control)]",
  divider: "border-white/10",
} as const;

export const adminText = {
  hi: "text-white",
  body: "text-slate-200",
  muted: "text-slate-400",
  dim: "text-slate-500",
} as const;

export const adminInput =
  "bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-cyan-500/40";

export const adminFocusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 focus-visible:ring-offset-0";
