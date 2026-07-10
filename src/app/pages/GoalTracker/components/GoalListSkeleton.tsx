import { Skeleton } from "@/app/components/ui/skeleton";

/**
 * Skeleton per-screen cho vùng DANH SÁCH mục tiêu (slot `loadingFallback` của
 * `ScreenStateView` trong `GoalTracker`). Ánh xạ 1:1 các vùng nội dung thật:
 * vùng tiêu đề section (label + heading + số lượng) và vùng list các thẻ
 * `GoalCard`. Dùng cùng container `min-w-0`/`space-y-*` như nội dung thật để
 * không tràn viewport (Req 14.2, 14.3). Lớp trình bày thuần — không đọc/ghi
 * storage (Req 14.8). Tôn trọng R10: chỉ dùng `Skeleton` (shimmer tĩnh, không
 * motion > 300ms, không loop/autoplay/glow).
 */
export function GoalListSkeleton() {
  return (
    <div className="min-w-0 space-y-6" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Đang tải danh sách mục tiêu...</span>
      <div className="space-y-4">
        {/* Vùng tiêu đề section */}
        <div className="mx-1 mb-1 mt-2 space-y-2">
          <Skeleton className="h-3 w-24 rounded-full bg-app-line/60" />
          <Skeleton className="h-6 w-48 rounded-lg bg-app-line/60" />
          <Skeleton className="h-3.5 w-20 rounded-full bg-app-line/60" />
        </div>
        {/* Vùng list các thẻ mục tiêu */}
        <div className="space-y-5">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-40 rounded-[var(--app-radius-card)] bg-app-line/60" />
          ))}
        </div>
      </div>
    </div>
  );
}
