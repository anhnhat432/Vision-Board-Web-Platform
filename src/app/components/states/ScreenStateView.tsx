import { RotateCw } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/app/components/ui/utils";

import { FormSkeleton } from "../ui/skeleton";
import { InlineStatusMessage } from "./InlineStatusMessage";
import type { ScreenStateKind } from "./useScreenDataState";

interface ScreenStateViewProps {
  /** Trạng thái đã phân giải (thường lấy từ `useScreenDataState().kind`). */
  state: ScreenStateKind;
  /** Nội dung dữ liệu thật, render khi `state === "ready"`. */
  children: ReactNode;
  /**
   * Node trạng thái rỗng dùng chung (thường là `<EmptyState />`), render khi
   * `state === "empty"`.
   */
  empty: ReactNode;
  /**
   * Chỉ báo tải dùng chung. Mặc định `<FormSkeleton />`. Truyền `<Skeleton />`
   * khác khi màn hình cần khung loading riêng.
   */
  loadingFallback?: ReactNode;
  /** Tiêu đề khối lỗi. */
  errorTitle?: ReactNode;
  /** Mô tả khối lỗi (điều gì xảy ra → cái gì vẫn an toàn → bước tiếp theo). */
  errorDescription?: ReactNode;
  /** Nhãn nút thử lại. */
  retryLabel?: string;
  /** Handler thử lại — bắt buộc để hiển thị control thử lại (Requirement 7.3). */
  onRetry?: () => void;
  className?: string;
  testId?: string;
}

const DEFAULT_ERROR_TITLE = "Không tải được dữ liệu";
const DEFAULT_ERROR_DESCRIPTION =
  "Lần tải gần nhất chưa hoàn tất. Dữ liệu cục bộ của bạn vẫn được giữ nguyên. Hãy thử lại.";
const DEFAULT_RETRY_LABEL = "Thử lại";

/**
 * Trình bày chuẩn hoá cho máy trạng thái màn hình: render ĐÚNG MỘT nhánh trong
 * {loading, empty, error, ready} (Requirement 7.1–7.4, 7.7) bằng các component
 * dùng chung — `Skeleton`/`FormSkeleton`, `EmptyState`, và khối lỗi
 * `InlineStatusMessage tone="error"` kèm control thử lại.
 */
export function ScreenStateView({
  state,
  children,
  empty,
  loadingFallback,
  errorTitle = DEFAULT_ERROR_TITLE,
  errorDescription = DEFAULT_ERROR_DESCRIPTION,
  retryLabel = DEFAULT_RETRY_LABEL,
  onRetry,
  className,
  testId,
}: ScreenStateViewProps) {
  if (state === "loading") {
    return (
      <div className={className} data-testid={testId} data-screen-state="loading">
        {loadingFallback ?? <FormSkeleton aria-label="Đang tải dữ liệu" />}
      </div>
    );
  }

  if (state === "empty") {
    return (
      <div className={className} data-testid={testId} data-screen-state="empty">
        {empty}
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className={cn("space-y-3", className)} data-testid={testId} data-screen-state="error">
        <InlineStatusMessage tone="error" prefix={errorTitle ? <>{errorTitle}.</> : undefined}>
          {errorDescription}
        </InlineStatusMessage>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--r-control)] border border-app-line bg-app-surface px-4 py-2 text-sm font-medium text-app-ink transition-colors duration-150 hover:bg-app-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg)]"
          >
            <RotateCw className="h-4 w-4" aria-hidden="true" />
            {retryLabel}
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className={className} data-testid={testId} data-screen-state="ready">
      {children}
    </div>
  );
}
