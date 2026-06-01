import { type HTMLMotionProps, motion, useInView, useReducedMotion } from "motion/react";
import { type HTMLAttributes, type ReactNode, useRef } from "react";

interface MotionFadeInProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  delay?: number;
}

export function MotionFadeIn({ children, delay = 0, ...props }: MotionFadeInProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();
  const isInView = useInView(ref, { amount: 0.24, once: true });

  if (reduceMotion) {
    return (
      <div ref={ref} {...(props as HTMLAttributes<HTMLDivElement>)}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 18 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 18 }}
      transition={{ duration: 0.42, delay, ease: [0.22, 1, 0.36, 1] }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
