"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
import { useTheme } from "../../hooks/useTheme";

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={resolvedTheme === "dark" ? "dark" : "light"}
      className="toaster group"
      position="bottom-right"
      expand={true}
      richColors
      closeButton
      duration={4500}
      gap={8}
      toastOptions={{
        classNames: {
          toast:
            "group toast rounded-[var(--r-card)] border border-app-line bg-app-surface text-sm font-medium text-app-ink shadow-app-lg ring-1 ring-app-ink/5 backdrop-blur-xl dark:border-app-line dark:bg-app-bg dark:text-app-ink dark:ring-app-ink/10",
          description: "text-app-ink-muted text-[0.82rem]",
          actionButton: "rounded-[var(--r-pill)] bg-primary px-3 text-xs font-semibold text-primary-foreground",
          cancelButton:
            "rounded-[var(--r-pill)] bg-app-surface/60 px-3 text-xs font-semibold text-app-ink-muted dark:bg-app-accent-soft dark:text-app-ink-soft",
          success: "border-app-accent/30 bg-app-accent-soft/90 shadow-lg",
          error: "border-app-warm/30 bg-app-warm-soft/90 shadow-lg",
          warning: "border-app-highlight/30 bg-app-highlight/90 shadow-lg",
          info: "border-app-line bg-app-surface/90 shadow-lg",
        },
      }}
      style={
        {
          "--normal-bg": "rgba(255,255,255,0.9)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "rgba(255,255,255,0.7)",
          "--success-bg": "rgba(240,253,244,0.92)",
          "--success-border": "rgba(167,243,208,0.6)",
          "--success-text": "#065f46",
          "--error-bg": "rgba(254,242,242,0.92)",
          "--error-border": "rgba(254,202,202,0.6)",
          "--error-text": "#991b1b",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
