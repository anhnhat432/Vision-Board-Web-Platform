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
        "surface-empty flex flex-col items-center justify-center gap-6 rounded-xl border border-dashed border-app-line bg-app-bg/50 p-8 text-center sm:p-10",
        className,
      )}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-app-surface text-app-ink-muted">
        {icon}
      </div>
      <div className="space-y-2 max-w-md">
        <h3 className="font-serif text-lg font-medium text-app-ink">{title}</h3>
        <p className="text-sm text-app-ink-muted">{description}</p>
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
