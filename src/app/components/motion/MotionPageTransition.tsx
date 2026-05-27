import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

interface MotionPageTransitionProps {
  children: ReactNode;
  pageKey: string;
}

export function MotionPageTransition({ children, pageKey }: MotionPageTransitionProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return <>{children}</>;

  // Default sync mode (no `mode="wait"`): exit and enter overlap, so navigating to a new
  // page is not blocked by the previous page's 200ms exit animation. Duration trimmed to
  // 120ms so the fade still reads but doesn't feel sluggish.
  return (
    <AnimatePresence initial={false}>
      <motion.div
        key={pageKey}
        className="page-transition-shell"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
