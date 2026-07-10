import { useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

interface MotionPageTransitionProps {
  children: ReactNode;
  pageKey: string;
}

export function MotionPageTransition({ children, pageKey }: MotionPageTransitionProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return <>{children}</>;

  // Token-based page enter: the `.page-enter` class drives the enter animation via the
  // Design_System motion tokens (`--duration-medium` / `--ease-emphasized`) instead of
  // hard-coded literals, so navigating into a Product_Page stays consistent with the rest
  // of the motion system. Keying the wrapper on the route path remounts it on navigation,
  // which replays the CSS animation for each page. `.page-enter` is already disabled under
  // `prefers-reduced-motion: reduce` by the global media query.
  return (
    <div key={pageKey} className="page-transition-shell page-enter">
      {children}
    </div>
  );
}
