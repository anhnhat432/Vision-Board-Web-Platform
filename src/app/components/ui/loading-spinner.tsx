import { cn } from "./utils";

function LoadingSpinner({ className, label = "Đang tải..." }: { className?: string; label?: string }) {
  return (
    <div role="status" aria-label={label} className={cn("flex flex-col items-center justify-center gap-3", className)}>
      <div className="relative h-9 w-9">
        <span
          className="block h-9 w-9 rounded-[var(--r-pill)] border-[2.5px]"
          style={{ borderColor: "color-mix(in srgb, var(--foreground) 8%, transparent)" }}
          aria-hidden="true"
        />
        <span
          className="absolute inset-0 block h-9 w-9 animate-spin rounded-[var(--r-pill)] border-[2.5px] border-transparent"
          style={{
            borderTopColor: "var(--app-accent)",
            borderRightColor: "color-mix(in srgb, var(--app-accent) 40%, transparent)",
            animationDuration: "640ms",
          }}
          aria-hidden="true"
        />
      </div>
      {label ? (
        <p className="text-sm font-medium tracking-tight text-muted-foreground">{label}</p>
      ) : null}
    </div>
  );
}

export { LoadingSpinner };
