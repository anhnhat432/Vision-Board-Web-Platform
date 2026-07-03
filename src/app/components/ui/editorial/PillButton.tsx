import { type ButtonHTMLAttributes, type AnchorHTMLAttributes, type ElementType, type ReactNode, forwardRef } from "react";

import { cn } from "../utils";

type PillButtonBaseProps = {
  /**
   * Biến thể:
   * - "solid": nền accent xanh rừng, chữ trắng (mặc định).
   * - "outline": nền trong suốt, viền, chữ ink.
   * - "highlight": nền vàng chanh highlight, chữ ink (nổi bật trên nền tối).
   */
  variant?: "solid" | "outline" | "highlight";
  /** Kích thước: "sm" | "md" (mặc định) | "lg". */
  size?: "sm" | "md" | "lg";
  /** Render dưới dạng <a> thay vì <button>. */
  as?: "button" | "a";
  children?: ReactNode;
};

type PillButtonAsButton = PillButtonBaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof PillButtonBaseProps> & { as?: "button" };

type PillButtonAsAnchor = PillButtonBaseProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof PillButtonBaseProps> & { as: "a" };

export type PillButtonProps = PillButtonAsButton | PillButtonAsAnchor;

/**
 * PillButton — nút bo pill với 3 biến thể và 3 kích thước.
 * Có shadow nhẹ, min-height 44px ở md/lg cho mobile, focus-visible ring accent.
 */
export const PillButton = forwardRef<HTMLButtonElement | HTMLAnchorElement, PillButtonProps>(
  ({ variant = "solid", size = "md", as: Component = "button", className, ...props }, ref) => {
    const Comp = Component as ElementType;
    return (
      <Comp
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-semibold rounded-full cursor-pointer border-none transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-app-accent/85 focus-visible:ring-offset-2",
          "motion-reduce:transition-none",

          size === "sm" && "text-xs px-3.5 py-2 min-h-[34px]",
          size === "md" && "text-[13px] px-[18px] py-2.5 min-h-[44px]",
          size === "lg" && "text-[15px] font-bold px-7 py-4 min-h-[48px]",

          variant === "solid" && [
            "bg-app-accent text-white",
            "shadow-[0_8px_22px_-6px_rgba(12,94,58,0.45)]",
            "hover:bg-app-accent-hover",
          ],
          variant === "outline" && [
            "bg-transparent text-app-ink",
            "border-[1.5px] border-app-line-strong",
            "hover:bg-app-accent-subtle",
          ],
          variant === "highlight" && [
            "bg-app-highlight text-app-ink",
            "shadow-[0_10px_26px_-8px_rgba(198,242,78,0.4)]",
            "hover:brightness-105",
          ],

          className,
        )}
        {...(props as Record<string, unknown>)}
      />
    );
  },
);
PillButton.displayName = "PillButton";
