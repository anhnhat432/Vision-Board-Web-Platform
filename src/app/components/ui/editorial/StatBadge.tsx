import { type HTMLAttributes, forwardRef } from "react";

import { cn } from "../utils";

export interface StatBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Tông: "highlight" (vàng chanh, mặc định) hoặc "accent-soft" (xanh nhạt). */
  tone?: "highlight" | "accent-soft";
}

/**
 * StatBadge — pill nhỏ hiển thị nhãn ngắn như "Tuần 4/12".
 * Mặc định nền --app-highlight, chữ --app-ink.
 */
export const StatBadge = forwardRef<HTMLSpanElement, StatBadgeProps>(
  ({ tone = "highlight", className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-2 text-xs font-bold px-2.5 py-1 rounded-full leading-tight",
        tone === "highlight" && "bg-app-highlight text-app-ink",
        tone === "accent-soft" && "bg-app-accent-soft text-app-accent",
        className,
      )}
      {...props}
    />
  ),
);
StatBadge.displayName = "StatBadge";
