"use client";

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { useReducedMotion } from "./use-reduced-motion";

import { cn } from "./utils";

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
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
      data-slot="progress"
      className={cn(
        "progress-shell relative h-2.5 w-full overflow-hidden rounded-full border border-white/60 bg-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]",
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="progress-indicator relative h-full w-full flex-1 rounded-full gradient-brand shadow-[0_10px_28px_-18px_rgba(109,40,217,0.62)]"
        style={{ transform: `translateX(-${100 - displayValue}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
