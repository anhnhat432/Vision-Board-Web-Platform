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
            "group toast rounded-[22px] border border-white/70 bg-white/90 backdrop-blur-xl shadow-[0_24px_56px_-24px_rgba(15,23,42,0.32)] text-slate-900 text-sm font-medium",
          description: "text-slate-500 text-[0.82rem]",
          actionButton: "rounded-full bg-primary text-primary-foreground text-xs font-semibold px-3",
          cancelButton: "rounded-full bg-white/60 text-slate-500 text-xs font-semibold px-3",
          success:
            "border-emerald-200/60 bg-emerald-50/90 shadow-[0_24px_56px_-24px_rgba(16,185,129,0.32)]",
          error:
            "border-red-200/60 bg-red-50/90 shadow-[0_24px_56px_-24px_rgba(239,68,68,0.28)]",
          warning:
            "border-amber-200/60 bg-amber-50/90 shadow-[0_24px_56px_-24px_rgba(245,158,11,0.28)]",
          info:
            "border-sky-200/60 bg-sky-50/90 shadow-[0_24px_56px_-24px_rgba(14,165,233,0.28)]",
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
