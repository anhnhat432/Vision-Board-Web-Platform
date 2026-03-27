import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "./use-reduced-motion";

import { cn } from "./utils";
import { useInView } from "./use-in-view";

interface CountUpProps extends React.ComponentPropsWithoutRef<"span"> {
  value: number;
  amount?: number;
  duration?: number;
  formatter?: (value: number) => string;
  margin?: string;
  once?: boolean;
  precision?: number;
  prefix?: string;
  suffix?: string;
}

function easeOutCubic(progress: number) {
  return 1 - (1 - progress) ** 3;
}

export function CountUp({
  amount = 0.28,
  className,
  duration = 900,
  formatter,
  margin,
  once = true,
  precision = 0,
  prefix = "",
  suffix = "",
  value,
  ...props
}: CountUpProps) {
  const shouldReduceMotion = useReducedMotion();
  const { isInView, ref } = useInView<HTMLSpanElement>({
    amount,
    margin,
    once,
  });

  const [displayValue, setDisplayValue] = useState(shouldReduceMotion ? value : 0);
  const previousValueRef = useRef(shouldReduceMotion ? value : 0);

  useEffect(() => {
    if (shouldReduceMotion) {
      setDisplayValue(value);
      previousValueRef.current = value;
      return;
    }

    if (!isInView) return;

    const from = previousValueRef.current;
    const to = value;

    if (Math.abs(to - from) < Number.EPSILON) {
      setDisplayValue(to);
      previousValueRef.current = to;
      return;
    }

    let animationFrame = 0;
    const start = performance.now();

    const updateValue = (timestamp: number) => {
      const progress = Math.min((timestamp - start) / duration, 1);
      const easedProgress = easeOutCubic(progress);
      const nextValue = from + (to - from) * easedProgress;

      setDisplayValue(nextValue);

      if (progress < 1) {
        animationFrame = window.requestAnimationFrame(updateValue);
        return;
      }

      previousValueRef.current = to;
      setDisplayValue(to);
    };

    animationFrame = window.requestAnimationFrame(updateValue);

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [duration, isInView, shouldReduceMotion, value]);

  const defaultFormatter = useMemo(() => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    });
  }, [precision]);

  const content = formatter
    ? formatter(displayValue)
    : `${prefix}${defaultFormatter.format(displayValue)}${suffix}`;

  return (
    <span ref={ref} className={cn("count-up", className)} {...props}>
      {content}
    </span>
  );
}
