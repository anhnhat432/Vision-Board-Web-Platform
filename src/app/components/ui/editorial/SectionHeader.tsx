import { type HTMLAttributes, createElement, forwardRef } from "react";

import { Eyebrow } from "./Eyebrow";
import { cn } from "../utils";

export interface SectionHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Nhãn eyebrow phía trên (không bắt buộc). */
  eyebrow?: string;
  /** Tiêu đề chính (bắt buộc). */
  title: string;
  /** Mô tả phía dưới (không bắt buộc). */
  description?: string;
  /** Căn lề: "left" (mặc định) hoặc "center". */
  align?: "left" | "center";
  /** Thẻ heading: "h1" | "h2" | "h3" (mặc định "h2"). */
  as?: "h1" | "h2" | "h3";
}

/**
 * SectionHeader — khối tiêu đề có eyebrow + heading serif + mô tả.
 * Heading dùng font-serif (Bricolage Grotesque) với cỡ chữ clamp.
 */
export const SectionHeader = forwardRef<HTMLDivElement, SectionHeaderProps>(
  ({ eyebrow, title, description, align = "left", as = "h2", className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(align === "center" && "text-center", className)}
      {...props}
    >
      {eyebrow ? <Eyebrow className="mb-2.5" tone="accent">{eyebrow}</Eyebrow> : null}
      {createElement(
        as,
        {
          className: cn(
            "font-serif font-extrabold tracking-[-0.03em] m-0",
            as === "h1" && "text-[clamp(32px,4.5vw,56px)] leading-[0.98] tracking-[-0.035em]",
            as === "h2" && "text-[clamp(26px,3.4vw,40px)] leading-[1.08]",
            as === "h3" && "text-[clamp(22px,2.8vw,32px)] leading-[1.12]",
          ),
          style: { color: "var(--app-ink)" },
        },
        title,
      )}
      {description ? (
        <p
          className="mt-3 text-[15px] leading-relaxed max-w-[48ch]"
          style={{ color: "var(--app-ink-soft)" }}
        >
          {description}
        </p>
      ) : null}
    </div>
  ),
);
SectionHeader.displayName = "SectionHeader";
