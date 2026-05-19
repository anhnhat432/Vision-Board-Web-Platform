"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { useReducedMotion } from "./use-reduced-motion";

import { cn } from "./utils";

const Progress = React.forwardRef<
  React.ComponentRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => {
  const shouldReduceMotion = useReducedMotion();
  const safeValue = Math.max(0, Math.min(100, value ?? 0));
  const [displayValue, setDisplayValue] = React.useState(shouldReduceMotion ? safeValue : 0);
  const previousValueRef = React.useRef(shouldReduceMotion ? safeValue : 0);

  React.useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayValue(safeValue);
      previousValueRef.current = safeValue;
      return;
    }

    const from = previousValueRef.current;
    const to = safeValue;

    if (Math.abs(to - from) < Number.EPSILON) {
      setDisplayValue(to);
      previousValueRef.current = to;
      return;
    }

    let animationFrame = 0;
    const start = performance.now();
    const duration = 850;

    const tick = (timestamp: number) => {
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      const nextValue = from + (to - from) * eased;

      setDisplayValue(nextValue);

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(tick);
        return;
      }

      previousValueRef.current = to;
      setDisplayValue(to);
    };

    animationFrame = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [safeValue, shouldReduceMotion]);

  return (
    <ProgressPrimitive.Root
      ref={ref}
      data-slot="progress"
      className={cn("progress-shell relative h-2 w-full overflow-hidden rounded-full bg-app-accent-soft", className)}
      {...props}
      aria-label={props["aria-label"] ?? (props["aria-labelledby"] ? undefined : "Tiến độ")}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="progress-indicator h-full rounded-full bg-app-accent"
        style={{ width: `${displayValue}%` }}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
