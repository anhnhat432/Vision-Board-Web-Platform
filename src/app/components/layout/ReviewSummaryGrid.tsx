"use client";

import { cn } from "../ui/utils";
import { Badge } from "../ui/badge";

export interface ReviewSummaryItem {
  label: string;
  value: string;
  status?: "success" | "warning" | "destructive";
}

interface ReviewSummaryGridProps {
  items: ReviewSummaryItem[];
  columns?: 1 | 2;
  className?: string;
}

/**
 * ReviewSummaryGrid — grid 1-2 cols cho label-value pairs với optional status badge
 *
 * Usage:
 * <ReviewSummaryGrid
 *   columns={2}
 *   items={[
 *     { label: "Mục tiêu", value: "Tăng 20% doanh thu" },
 *     { label: "Chỉ số", value: "Doanh thu hàng tháng", status: "success" },
 *   ]}
 * />
 */
export function ReviewSummaryGrid({
  items,
  columns = 2,
  className,
}: ReviewSummaryGridProps) {
  return (
    <div
      className={cn(
        "grid gap-4",
        columns === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2",
        className
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{item.label}</span>
            {item.status && (
              <Badge variant={item.status} className="h-5 text-xs">
                {item.status === "success" && "Đạt"}
                {item.status === "warning" && "Cần chú ý"}
                {item.status === "destructive" && "Cần điều chỉnh"}
              </Badge>
            )}
          </div>
          <p className="text-base font-semibold text-foreground">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
