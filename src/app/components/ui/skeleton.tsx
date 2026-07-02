import { cn } from "./utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="skeleton" className={cn("skeleton-shimmer", className)} {...props} />;
}

function FormSkeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="form-skeleton"
      className={cn("surface-raised space-y-5 rounded-card border border-app-line bg-app-surface p-5 sm:p-6", className)}
      aria-busy="true"
      {...props}
    >
      <div className="space-y-3">
        <Skeleton className="h-3 w-28 rounded-full" />
        <Skeleton className="h-8 w-3/4 rounded-lg" />
        <Skeleton className="h-4 w-full max-w-lg rounded-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-11 rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-11 rounded-lg" />
      </div>
      <div className="flex flex-col gap-3 border-t border-app-line pt-5 sm:flex-row sm:justify-between">
        <Skeleton className="h-10 rounded-lg sm:w-28" />
        <Skeleton className="h-10 rounded-lg sm:w-32" />
      </div>
    </div>
  );
}

export { FormSkeleton, Skeleton };
