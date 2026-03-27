import { cn } from "./utils";

function LoadingSpinner({ className, label = "Đang tải..." }: { className?: string; label?: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn("flex flex-col items-center justify-center gap-4", className)}
    >
      <div className="relative h-10 w-10">
        {/* Outer ring */}
        <span
          className="block h-10 w-10 rounded-full border-[3px] border-slate-100"
          aria-hidden="true"
        />
        {/* Spinning arc */}
        <span
          className="absolute inset-0 block h-10 w-10 animate-spin rounded-full border-[3px] border-transparent"
          style={{
            borderTopColor: "rgba(109,40,217,0.72)",
            borderRightColor: "rgba(192,38,211,0.44)",
            animationDuration: "700ms",
          }}
          aria-hidden="true"
        />
      </div>
      <p className="text-sm font-medium text-slate-400">{label}</p>
    </div>
  );
}

export { LoadingSpinner };
