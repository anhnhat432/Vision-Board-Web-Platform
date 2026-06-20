import { useEffect, useId, useRef, useState } from "react";
import { useReducedMotion } from "./use-reduced-motion";
import { cn } from "./utils";

interface ProgressRingProps extends React.ComponentPropsWithoutRef<"div"> {
  value: number;
  size?: number;
  strokeWidth?: number;
  showPercent?: boolean;
  percentClassName?: string;
}

function clampPercent(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
}

export function ProgressRing({
  value,
  size = 72,
  strokeWidth = 5,
  showPercent = false,
  percentClassName,
  className,
  ...props
}: ProgressRingProps) {
  const shouldReduceMotion = useReducedMotion();
  const gradientId = useId();
  const safeValue = clampPercent(value);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = circumference - (safeValue / 100) * circumference;
  const center = size / 2;

  const [animatedOffset, setAnimatedOffset] = useState(
    shouldReduceMotion ? targetOffset : circumference,
  );
  const frameRef = useRef<number | null>(null);
  const prevValueRef = useRef(shouldReduceMotion ? safeValue : 0);

  useEffect(() => {
    if (shouldReduceMotion) {
      setAnimatedOffset(targetOffset);
      prevValueRef.current = safeValue;
      return;
    }

    const fromValue = prevValueRef.current;
    const toValue = safeValue;
    if (Math.abs(fromValue - toValue) < Number.EPSILON) {
      setAnimatedOffset(targetOffset);
      prevValueRef.current = toValue;
      return;
    }

    const fromOffset = circumference - (fromValue / 100) * circumference;
    const start = performance.now();
    const duration = 900;

    const tick = (timestamp: number) => {
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - (1 - progress) ** 3;
      const current = fromOffset + (targetOffset - fromOffset) * eased;
      setAnimatedOffset(current);
      if (progress < 1) {
        frameRef.current = window.requestAnimationFrame(tick);
      } else {
        prevValueRef.current = toValue;
      }
    };

    frameRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    };
  }, [safeValue, targetOffset, circumference, shouldReduceMotion]);

  return (
    <div
      className={cn("relative inline-flex items-center justify-center shrink-0", className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={safeValue}
      aria-valuemin={0}
      aria-valuemax={100}
      {...props}
    >
      {/* Ambient glow behind the ring */}
      <div
        className="pointer-events-none absolute inset-[-25%] rounded-full bg-app-accent/6 blur-xl dark:bg-app-accent/8"
        aria-hidden="true"
      />
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id={`${gradientId}-light`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#2A5447" />
            <stop offset="55%" stopColor="#3A7D5E" />
            <stop offset="100%" stopColor="#5BA590" />
          </linearGradient>
          <linearGradient
            id={`${gradientId}-dark`}
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="#143027" />
            <stop offset="55%" stopColor="#2A5447" />
            <stop offset="100%" stopColor="#5BA590" />
          </linearGradient>
        </defs>

        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          className="stroke-app-accent-soft"
          strokeWidth={strokeWidth}
        />

        {/* Light mode fill */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId}-light)`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animatedOffset}
          className="dark:hidden"
          style={{
            transition: shouldReduceMotion ? "none" : undefined,
          }}
        />

        {/* Dark mode fill */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId}-dark)`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animatedOffset}
          className="hidden dark:block"
          style={{
            transition: shouldReduceMotion ? "none" : undefined,
          }}
        />
      </svg>
      {showPercent && (
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center font-serif text-lg font-semibold tabular-nums text-app-ink",
            percentClassName,
          )}
        >
          {safeValue}%
        </span>
      )}
    </div>
  );
}
