import type { ReactNode } from "react";

interface HighlightMarkProps {
  children: ReactNode;
  className?: string;
}

export function HighlightMark({ children, className = "" }: HighlightMarkProps) {
  return (
    <mark
      className={`bg-app-highlight bg-[#FEF08A] px-0.5 rounded-sm ${className}`}
    >
      {children}
    </mark>
  );
}
