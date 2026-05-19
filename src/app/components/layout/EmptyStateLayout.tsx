import type * as React from "react";
import { cn } from "../ui/utils";

interface EmptyStateLayoutProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  primaryAction?: React.ReactNode;
  secondaryAction?: React.ReactNode;
  className?: string;
}

/**
 * EmptyStateLayout — empty state với icon + title + description + CTA
 *
 * Copy theo UX_COPY_STYLE_GUIDE §4:
 * - Tình trạng (trạng thái hiện tại)
 * - Lý do ngắn (tại sao trống)
 * - Next action + CTA (hành động tiếp theo)
 *
 * Usage:
 * <EmptyStateLayout
 *   icon={<ClipboardX className="text-slate-400" />}
 *   title="Chưa có việc nào trong chu kỳ này"
 *   description="Chu kỳ chưa có việc lặp lại. Tạo việc để bắt đầu thực hiện."
 *   primaryAction={<Button>Vào Setup để thêm việc</Button>}
 * />
 */
export function EmptyStateLayout({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
}: EmptyStateLayoutProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-6 rounded-[var(--r-card)] border border-slate-200 bg-white/92 p-12 text-center",
        className,
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-[var(--r-tile)] bg-muted">{icon}</div>
      <div className="space-y-2 max-w-md">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {(primaryAction || secondaryAction) && (
        <div className="flex flex-col gap-3 sm:flex-row">
          {primaryAction}
          {secondaryAction}
        </div>
      )}
    </div>
  );
}
