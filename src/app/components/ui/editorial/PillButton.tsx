import type { ButtonHTMLAttributes, ReactNode } from "react";

type PillVariant = "solid" | "outline" | "highlight";
type PillSize = "sm" | "md" | "lg";

interface PillButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: PillVariant;
  size?: PillSize;
  className?: string;
}

const variantStyles: Record<PillVariant, string> = {
  solid:
    "bg-app-accent text-white hover:bg-app-accent-hover shadow-app-sm hover:shadow-app-md",
  outline:
    "border border-app-line-strong bg-app-surface text-app-ink hover:bg-app-bg",
  highlight:
    "bg-app-highlight bg-[#FEF08A] text-app-ink hover:brightness-95",
};

const sizeStyles: Record<PillSize, string> = {
  sm: "px-4 py-1.5 text-xs min-h-9",
  md: "px-5 py-2 text-sm min-h-10",
  lg: "px-6 py-2.5 text-sm min-h-11",
};

export function PillButton({
  children,
  variant = "solid",
  size = "md",
  className = "",
  ...props
}: PillButtonProps) {
  return (
    <button
      type="button"
      className={`inline-flex items-center justify-center gap-1.5 rounded-pill font-semibold transition-all duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
