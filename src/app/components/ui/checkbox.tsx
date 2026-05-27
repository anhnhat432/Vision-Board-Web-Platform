"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { CheckIcon } from "lucide-react";

import { cn } from "./utils";

type CheckboxProps = React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root> & {
  controlClassName?: string;
};

const Checkbox = React.forwardRef<React.ComponentRef<typeof CheckboxPrimitive.Root>, CheckboxProps>(
  ({ className, controlClassName, ...props }, ref) => {
    return (
      <CheckboxPrimitive.Root
        ref={ref}
        data-slot="checkbox"
        className={cn(
          "group/checkbox peer inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-transparent bg-transparent text-app-ink transition-[background-color,box-shadow,transform] duration-150 outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-app-surface active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100",
          "aria-invalid:ring-2 aria-invalid:ring-destructive/20",
          className,
        )}
        {...props}
      >
        <span
          aria-hidden="true"
          data-slot="checkbox-control"
          className={cn(
            "flex size-[18px] items-center justify-center rounded border-[1.5px] border-app-line bg-app-surface text-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-[background-color,border-color,box-shadow,transform] duration-150 group-data-[state=checked]/checkbox:border-app-accent group-data-[state=checked]/checkbox:bg-app-accent group-data-[state=checked]/checkbox:shadow-[0_6px_14px_rgba(47,93,80,0.18)]",
            controlClassName,
          )}
        >
          <CheckboxPrimitive.Indicator
            data-slot="checkbox-indicator"
            className="flex items-center justify-center text-white data-[state=checked]:checkmark-pop"
          >
            <CheckIcon className="size-4" strokeWidth={3} />
          </CheckboxPrimitive.Indicator>
        </span>
      </CheckboxPrimitive.Root>
    );
  },
);
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
