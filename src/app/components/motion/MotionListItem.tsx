import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import type { HTMLAttributes, ReactNode } from "react";

import { duration as motionDuration, ease as motionEase } from "@/app/lib/motion";

interface MotionListItemProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
}

/**
 * P2-06 Motion Design System.
 *
 * List item with `layout` + enter/exit/reorder animation. Wrap in
 * `<AnimatePresence initial={false}>` from `motion/react` to enable exit
 * animation when items are removed.
 *
 * @example
 * import { AnimatePresence } from "motion/react";
 * import { MotionListItem } from "@/app/components/motion";
 *
 * <ul>
 *   <AnimatePresence initial={false}>
 *     {tasks.map((task) => (
 *       <MotionListItem key={task.id}>
 *         <TaskCard task={task} />
 *       </MotionListItem>
 *     ))}
 *   </AnimatePresence>
 * </ul>
 *
 * Reduced motion: returns a plain <div>, no animation.
 */
export function MotionListItem({ children, ...props }: MotionListItemProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return <div {...(props as HTMLAttributes<HTMLDivElement>)}>{children}</div>;
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, height: 0, scale: 0.98 }}
      animate={{ opacity: 1, height: "auto", scale: 1 }}
      exit={{ opacity: 0, height: 0, scale: 0.98 }}
      transition={{
        duration: motionDuration.medium / 1000,
        ease: motionEase.decelerate,
      }}
      style={{ overflow: "hidden" }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
