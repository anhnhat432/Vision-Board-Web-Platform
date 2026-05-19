import type { ReactNode } from "react";
import { Laptop } from "lucide-react";

import { cn } from "@/app/components/ui/utils";

export type LocalOnlyNoticeVariant = "inline" | "compact";

interface LocalOnlyNoticeProps {
  /**
   * Visual density.
   * - "inline" (default): full-width banner with icon + message.
   * - "compact": smaller pill-style for use next to other status badges.
   */
  variant?: LocalOnlyNoticeVariant;
  /**
   * Message override. When omitted a safe default is used that tells the
   * user the data lives on this device only and how they can extend that.
   */
  message?: ReactNode;
  /**
   * Optional trailing action (e.g., a link/button to export local data).
   */
  action?: ReactNode;
  className?: string;
  /**
   * Optional `data-testid` forwarded to the container for targeted tests.
   */
  testId?: string;
}

const DEFAULT_MESSAGE =
  "Dữ liệu đang lưu trên thiết bị này. Bạn vẫn dùng được khi mất mạng; đăng nhập hoặc xuất bản sao nếu muốn giữ thêm một lớp phòng hờ.";

export function LocalOnlyNotice({ variant = "inline", message, action, className, testId }: LocalOnlyNoticeProps) {
  const body = message ?? DEFAULT_MESSAGE;

  if (variant === "compact") {
    return (
      <span
        role="status"
        data-testid={testId}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-[var(--r-pill)] border border-[color:var(--border)] bg-[color:var(--muted)] px-2.5 py-1 text-xs font-semibold tracking-tight text-muted-foreground",
          className,
        )}
      >
        <Laptop className="h-3 w-3" aria-hidden="true" />
        <span>{body}</span>
      </span>
    );
  }

  return (
    <div
      role="status"
      data-testid={testId}
      className={cn(
        "flex flex-col gap-3 rounded-[var(--r-tile)] border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-3 text-sm leading-6 text-muted-foreground sm:flex-row sm:items-center",
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <div
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--r-control)] border border-[color:var(--border)] bg-card text-foreground"
          aria-hidden="true"
        >
          <Laptop className="h-3.5 w-3.5" />
        </div>
        <p className="min-w-0 flex-1">{body}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
