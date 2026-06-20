import { type HTMLAttributes, forwardRef } from "react";

import { cn } from "../utils";

export interface EyebrowProps extends HTMLAttributes<HTMLSpanElement> {
  /** Tông màu: "accent" (mặc định, xanh rừng) hoặc "muted" (xám mờ). */
  tone?: "accent" | "muted";
}

/**
 * Eyebrow — nhãn nhỏ in hoa, letter-spacing rộng.
 * Dùng để dẫn đoạn như "Lộ trình của bạn", "Vì sao chọn…".
 */
export const Eyebrow = forwardRef<HTMLSpanElement, EyebrowProps>(
  ({ tone = "accent", className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-block text-[11px] font-bold tracking-[0.14em] uppercase",
        tone === "accent" && "text-app-accent",
        tone === "muted" && "text-app-ink-muted",
        className,
      )}
      {...props}
    />
  ),
);
Eyebrow.displayName = "Eyebrow";
