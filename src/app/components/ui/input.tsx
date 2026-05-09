import type * as React from "react";

import { cn } from "./utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-11 w-full min-w-0 rounded-[var(--r-control)] border px-4 py-2.5 text-sm leading-6 font-normal tracking-normal bg-input-background shadow-sm transition-[color,box-shadow,border-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 hover:border-white/90 hover:shadow-md",
        "focus-visible:border-[color-mix(in_srgb,var(--tone-shell-secondary)_60%,transparent)] focus-visible:ring-[4px] focus-visible:ring-[color-mix(in_srgb,var(--tone-shell-secondary)_18%,transparent)] focus-visible:shadow-md",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
