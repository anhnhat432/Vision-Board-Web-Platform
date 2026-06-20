import type { ReactNode } from "react";

type StatBadgeTone = "highlight" | "accent-soft";

interface StatBadgeProps {
  children: ReactNode;
  tone?: StatBadgeTone;
  className?: string;
}

const toneStyles: Record<StatBadgeTone, string> = {
  highlight: "bg-app-highlight bg-[#FEF08A] text-app-ink",
  "accent-soft": "bg-app-accent-soft text-app-accent",
};

export function StatBadge({ children, tone = "highlight", className = "" }: StatBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-tight ${toneStyles[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
