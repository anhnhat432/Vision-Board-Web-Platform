import type { ReactNode } from "react";

type EyebrowTone = "accent" | "muted";

interface EyebrowProps {
  children: ReactNode;
  tone?: EyebrowTone;
  className?: string;
}

const toneStyles: Record<EyebrowTone, string> = {
  accent: "text-app-accent",
  muted: "text-app-ink-muted",
};

export function Eyebrow({ children, tone = "accent", className = "" }: EyebrowProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] ${toneStyles[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
