import * as React from "react";

import { cn } from "./utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        data-slot="textarea"
        className={cn(
          "border border-app-line placeholder:text-app-ink-muted text-app-ink flex min-h-24 max-h-60 w-full resize-y rounded-xl bg-app-surface px-3 py-2 text-base leading-6 font-normal tracking-tight shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[color,box-shadow,border-color] outline-none md:text-sm",
          "disabled:cursor-not-allowed disabled:bg-app-bg/50 disabled:text-app-ink-muted disabled:opacity-100",
          "hover:border-app-accent/50",
          "focus-visible:border-app-accent focus-visible:ring-4 focus-visible:ring-app-accent/20",
          "aria-invalid:ring-4 aria-invalid:ring-rose-500/20 dark:aria-invalid:ring-rose-900/30 aria-invalid:border-rose-500 dark:aria-invalid:border-rose-800",
          className,
        )}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
