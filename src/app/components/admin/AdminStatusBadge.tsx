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

const TONE_CLASS: Record<AdminBadgeTone, string> = {
  pending: "bg-amber-500/15 text-amber-200 border-amber-500/30",
  confirmed: "bg-sky-500/15 text-sky-200 border-sky-500/30",
  printing: "bg-violet-500/15 text-violet-200 border-violet-500/30",
  shipping: "bg-blue-500/15 text-blue-200 border-blue-500/30",
  delivered: "bg-emerald-500/15 text-emerald-200 border-emerald-500/30",
  cancelled: "bg-rose-500/15 text-rose-200 border-rose-500/30",
  completed: "bg-emerald-500/15 text-emerald-200 border-emerald-500/30",
  expired: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  rejected: "bg-rose-500/15 text-rose-200 border-rose-500/30",
  failed: "bg-rose-500/15 text-rose-200 border-rose-500/30",
};

interface AdminStatusBadgeProps {
  tone: AdminBadgeTone;
  children: React.ReactNode;
  className?: string;
}

/**
 * Dark-theme status pill shared by orders / payments / refunds.
 */
export function AdminStatusBadge({ tone, children, className }: AdminStatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--r-pill)] border px-2.5 py-0.5 text-xs font-medium",
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
