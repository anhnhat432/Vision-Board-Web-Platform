import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform, type HTMLMotionProps } from "motion/react";
import { useEffect, useRef } from "react";

interface MotionCountUpProps extends Omit<HTMLMotionProps<"span">, "children"> {
  value: number;
  duration?: number;
  formatter?: (value: number) => string;
  precision?: number;
  prefix?: string;
  suffix?: string;
}

export function MotionCountUp({
  duration = 1.2,
  formatter,
  precision = 0,
  prefix = "",
  suffix = "",
  value,
  ...props
}: MotionCountUpProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const reduceMotion = useReducedMotion();
  const isInView = useInView(ref, { amount: 0.4, once: true });
  const motionValue = useMotionValue(reduceMotion ? value : 0);
  const rounded = useTransform(motionValue, (latest) => {
    const fixed = Number(latest.toFixed(precision));
    return formatter ? formatter(fixed) : `${prefix}${fixed.toLocaleString("vi-VN")}${suffix}`;
  });

  useEffect(() => {
    if (reduceMotion) {
      motionValue.set(value);
      return;
    }

    if (!isInView) return;

    const controls = animate(motionValue, value, { duration, ease: "easeOut" });
    return controls.stop;
  }, [duration, isInView, motionValue, reduceMotion, value]);

  return <motion.span ref={ref} {...props}>{rounded}</motion.span>;
}
