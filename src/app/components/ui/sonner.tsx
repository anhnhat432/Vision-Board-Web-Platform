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
            "group toast rounded-[var(--r-card)] border border-white/70 bg-white/90 text-sm font-medium text-slate-900 shadow-2xl ring-1 ring-slate-900/5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/88 dark:text-slate-50 dark:ring-white/10",
          description: "text-slate-500 text-[0.82rem]",
          actionButton: "rounded-[var(--r-pill)] bg-primary px-3 text-xs font-semibold text-primary-foreground",
          cancelButton:
            "rounded-[var(--r-pill)] bg-white/60 px-3 text-xs font-semibold text-slate-500 dark:bg-white/10 dark:text-slate-300",
          success: "border-emerald-200/60 bg-emerald-50/90 shadow-lg",
          error: "border-red-200/60 bg-red-50/90 shadow-lg",
          warning: "border-amber-200/60 bg-amber-50/90 shadow-lg",
          info: "border-sky-200/60 bg-sky-50/90 shadow-lg",
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
