import * as React from "react";

import { cn } from "./utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        data-slot="input"
        className={cn(
          "file:text-app-ink placeholder:text-app-ink-muted selection:bg-app-accent selection:text-white text-app-ink border border-app-line flex h-11 w-full min-w-0 rounded-lg px-3 py-2 text-base leading-6 font-normal tracking-tight bg-app-surface shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[color,box-shadow,border-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium md:text-sm hover:border-app-line",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-app-bg/50 disabled:text-app-ink-muted disabled:opacity-100",
          "focus-visible:border-app-accent focus-visible:ring-2 focus-visible:ring-app-accent/20 focus-visible:shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
          "aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
