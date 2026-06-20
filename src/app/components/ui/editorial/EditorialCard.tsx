import type { ReactNode } from "react";

type EditorialTone = "surface" | "ink" | "accent" | "muted";
type EditorialPadding = "md" | "lg";

interface EditorialCardProps {
  children: ReactNode;
  tone?: EditorialTone;
  padding?: EditorialPadding;
  interactive?: boolean;
  className?: string;
}

const toneStyles: Record<EditorialTone, string> = {
  surface: "bg-app-surface border-app-line",
  ink: "bg-app-ink text-white border-app-ink",
  accent: "bg-app-accent-soft border-app-accent/20 text-app-accent",
  muted: "bg-app-bg-subtle border-app-line",
};

const paddingStyles: Record<EditorialPadding, string> = {
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
};

export function EditorialCard({
  children,
  tone = "surface",
  padding = "md",
  interactive = false,
  className = "",
}: EditorialCardProps) {
  return (
    <section
      className={`rounded-card border shadow-app-sm ${paddingStyles[padding]} ${toneStyles[tone]} ${interactive ? "transition-shadow duration-300 hover:shadow-app-md" : ""} ${className}`}
    >
      {children}
    </section>
  );
}
