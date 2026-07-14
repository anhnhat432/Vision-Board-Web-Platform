import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "../ui/button";
import { cn } from "../ui/utils";

export interface AdminPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  itemLabel?: string;
  className?: string;
}

export function AdminPagination({
  page,
  totalPages,
  onPageChange,
  disabled = false,
  itemLabel = "dữ liệu",
  className,
}: AdminPaginationProps) {
  const boundedTotalPages = Math.max(1, totalPages);

  return (
    <nav
      aria-label={"Phân trang " + itemLabel}
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <p className="text-sm tabular-nums text-app-ink-muted" aria-live="polite">
        Trang {page} / {boundedTotalPages}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Trang trước"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Trước
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label="Trang sau"
          disabled={disabled || page >= boundedTotalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Sau
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
