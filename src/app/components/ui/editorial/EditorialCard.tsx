import { type HTMLAttributes, forwardRef } from "react";

import { cn } from "../utils";

export interface EditorialCardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Tông nền thẻ:
   * - "surface": nền trắng, viền mờ, bóng giấy (mặc định).
   * - "ink": nền tối (--app-ink), chữ sáng.
   * - "accent": nền xanh rừng, chữ trắng.
   * - "muted": nền be nhạt (--app-bg-subtle), viền nét đứt.
   */
  tone?: "surface" | "ink" | "accent" | "muted";
  /** Padding: "md" (24px, mặc định) hoặc "lg" (30px). */
  padding?: "md" | "lg";
  /** Bật hiệu ứng hover nhấc nhẹ (tôn trọng prefers-reduced-motion). */
  interactive?: boolean;
}

/**
 * EditorialCard — thẻ giấy bo lớn với bóng mềm khuếch tán.
 * Dùng cho thẻ nổi bật, hero card, section CTA, và thẻ chứa nội dung editorial.
 */
export const EditorialCard = forwardRef<HTMLDivElement, EditorialCardProps>(
  ({ tone = "surface", padding = "md", interactive = false, className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "relative",
        padding === "md" && "p-6",
        padding === "lg" && "p-[30px]",
        "rounded-[var(--app-radius-card-lg)]",
        tone === "surface" && "bg-app-surface border border-app-line",
        tone === "surface" && "shadow-[var(--app-shadow-card)]",
        tone === "ink" && "bg-app-ink text-app-bg",
        tone === "accent" && "bg-app-accent text-white",
        tone === "muted" && "bg-app-bg-subtle border border-dashed border-app-line-strong",
        interactive && [
          "transition-[transform,box-shadow] duration-[var(--duration-base)] ease-[var(--ease-emphasized)]",
          "hover:shadow-[0_24px_52px_-28px_rgba(23,21,15,0.32)] hover:-translate-y-0.5",
          "motion-reduce:transition-none motion-reduce:hover:transform-none motion-reduce:hover:shadow-[var(--app-shadow-card)]",
        ],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);
EditorialCard.displayName = "EditorialCard";
