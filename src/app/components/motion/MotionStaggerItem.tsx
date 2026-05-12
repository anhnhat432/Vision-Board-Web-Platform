import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import type { HTMLAttributes, ReactNode } from "react";

interface MotionStaggerItemProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
}

export function MotionStaggerItem({ children, ...props }: MotionStaggerItemProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div {...(props as HTMLAttributes<HTMLDivElement>)}>{children}</div>;
  }

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 14 },
        show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
