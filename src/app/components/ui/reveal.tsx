import type { HTMLMotionProps } from "motion/react";
import { motion, useReducedMotion } from "motion/react";
import type { HTMLAttributes, ReactNode } from "react";
import { useInView } from "./use-in-view";
import { cn } from "./utils";

interface RevealProps extends Omit<HTMLMotionProps<"div">, "children"> {
  amount?: number;
  children: ReactNode;
  delay?: number;
  distance?: number;
  duration?: number;
  once?: boolean;
  scale?: number;
}

export function Reveal({
  amount = 0.18,
  children,
  className,
  delay = 0,
  distance = 22,
  duration = 0.62,
  once = true,
  scale = 0.985,
  ...props
}: RevealProps) {
  const shouldReduceMotion = useReducedMotion();
  const { isInView, ref } = useInView<HTMLDivElement>({
    amount,
    once,
  });

  const visible = shouldReduceMotion || isInView;

  if (shouldReduceMotion) {
    return (
      <div ref={ref} className={cn("reveal-block", className)} {...(props as HTMLAttributes<HTMLDivElement>)}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      className={cn("reveal-block", className)}
      initial={false}
      animate={
        visible
          ? { opacity: 1, y: 0, scale: 1 }
          : { opacity: 0, y: distance, scale }
      }
      transition={{
        delay,
        duration: shouldReduceMotion ? 0 : duration,
        ease: [0.22, 1, 0.36, 1],
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
