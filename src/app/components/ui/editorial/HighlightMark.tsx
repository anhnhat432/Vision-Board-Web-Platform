import { type HTMLAttributes, forwardRef } from "react";

import { cn } from "../utils";

/**
 * HighlightMark — bọc một cụm từ trong tiêu đề bằng thanh nền vàng chanh
 * (--app-highlight) vẽ phía sau chữ. Dùng kỹ thuật span lồng: span con ở
 * z-index cao, span nền tuyệt đối nằm dưới.
 */
export const HighlightMark = forwardRef<HTMLSpanElement, HTMLAttributes<HTMLSpanElement>>(
  ({ className, children, ...props }, ref) => (
    <span ref={ref} className={cn("relative whitespace-nowrap", className)} {...props}>
      <span className="relative z-[1]">{children}</span>
      <span
        className="absolute left-[-4px] right-[-4px] bottom-[6px] h-[34%] rounded-[3px] z-0 pointer-events-none"
        style={{ background: "var(--app-highlight)" }}
      />
    </span>
  ),
);
HighlightMark.displayName = "HighlightMark";
