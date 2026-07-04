import { Skeleton } from "@/app/components/ui/skeleton";

export function GoalTrackerSkeleton() {
  return (
    <div
      className="mx-auto max-w-[1100px] space-y-5 px-4 pb-16 pt-6 sm:px-6 lg:px-9"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Đang tải danh sách mục tiêu...</span>
      <Skeleton className="h-40 rounded-[var(--app-radius-card)] bg-app-line/60" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-20 rounded-[var(--app-radius-card)] bg-app-line/60" />
        ))}
      </div>
      <div className="space-y-4">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-32 rounded-[var(--app-radius-card)] bg-app-line/60" />
        ))}
      </div>
    </div>
  );
}
