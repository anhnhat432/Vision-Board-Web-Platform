import { cn } from "../ui/utils";

export type AdminBadgeTone =
  | "pending"
  | "confirmed"
  | "printing"
  | "shipping"
  | "delivered"
  | "cancelled"
  | "completed"
  | "expired"
  | "rejected"
  | "failed";

/** Dot colour per tone — used for the status indicator dot. */
const DOT_CLASS: Record<AdminBadgeTone, string> = {
  pending: "bg-amber-400",
  confirmed: "bg-sky-400",
  printing: "bg-violet-400",
  shipping: "bg-blue-400",
  delivered: "bg-emerald-400",
  cancelled: "bg-rose-400",
  completed: "bg-emerald-400",
  expired: "bg-gray-400",
  rejected: "bg-rose-400",
  failed: "bg-rose-400",
};

const TONE_CLASS: Record<AdminBadgeTone, string> = {
  pending:
    "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30",
  confirmed:
    "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30",
  printing:
    "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-300 dark:border-violet-500/30",
  shipping:
    "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/30",
  delivered:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-app-accent-soft dark:text-app-accent dark:border-app-accent/30",
  cancelled:
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30",
  completed:
    "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-app-accent-soft dark:text-app-accent dark:border-app-accent/30",
  expired:
    "bg-gray-50 text-gray-600 border-gray-200 dark:bg-app-bg-subtle dark:text-app-ink-soft dark:border-app-line-strong",
  rejected:
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30",
  failed:
    "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30",
};

interface AdminStatusBadgeProps {
  tone: AdminBadgeTone;
  children: React.ReactNode;
  className?: string;
}

/**
 * Status pill shared by orders / payments / refunds.
 *
 * Features: coloured dot indicator, light & dark mode support.
 */
export function AdminStatusBadge({
  tone,
  children,
  className,
}: AdminStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASS[tone],
        className,
      )}
    >
      <span
        className={cn(
          "inline-block h-1.5 w-1.5 shrink-0 rounded-full",
          DOT_CLASS[tone],
        )}
      />
      {children}
    </span>
  );
}