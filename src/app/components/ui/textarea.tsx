import * as React from "react";

import { cn } from "./utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        data-slot="textarea"
        className={cn(
          "resize-none border border-[color:var(--border)] placeholder:text-muted-foreground/70 flex field-sizing-content min-h-20 w-full rounded-[var(--r-input)] bg-input-background px-3.5 py-2.5 text-sm leading-6 font-normal tracking-tight shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[color,box-shadow,border-color,height] outline-none disabled:cursor-not-allowed disabled:opacity-50",
          "hover:border-[color:color-mix(in_srgb,var(--foreground)_18%,transparent)]",
          "focus-visible:border-[color:var(--ring)] focus-visible:ring-[3px] focus-visible:ring-[color-mix(in_srgb,var(--ring)_36%,transparent)]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
