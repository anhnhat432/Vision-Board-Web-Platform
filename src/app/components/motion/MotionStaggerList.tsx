import { type HTMLMotionProps, motion, useReducedMotion } from "motion/react";
import type { HTMLAttributes, ReactNode } from "react";

interface MotionStaggerListProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
}

export function MotionStaggerList({ children, ...props }: MotionStaggerListProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div {...(props as HTMLAttributes<HTMLDivElement>)}>{children}</div>;
  }

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: {
          transition: { staggerChildren: 0.06 },
        },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
