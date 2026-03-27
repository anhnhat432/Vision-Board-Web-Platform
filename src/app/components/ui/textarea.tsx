import type * as React from "react";

import { cn } from "./utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "resize-none border-input placeholder:text-muted-foreground dark:bg-input/30 flex field-sizing-content min-h-20 w-full rounded-[24px] border bg-input-background px-4 py-3 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_20px_42px_-30px_rgba(15,23,42,0.36)] transition-[color,box-shadow,border-color,height] outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "hover:border-white hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_24px_46px_-28px_rgba(15,23,42,0.38)]",
        "focus-visible:border-[color-mix(in_srgb,var(--tone-shell-secondary)_60%,transparent)] focus-visible:ring-[4px] focus-visible:ring-[color-mix(in_srgb,var(--tone-shell-secondary)_18%,transparent)] focus-visible:shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_24px_46px_-28px_rgba(15,23,42,0.38)]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
