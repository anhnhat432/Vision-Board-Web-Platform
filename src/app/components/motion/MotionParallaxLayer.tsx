import { type HTMLMotionProps, motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

interface MotionParallaxLayerProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  depth?: number;
}

export function MotionParallaxLayer({ children, depth = 0.35, style, ...props }: MotionParallaxLayerProps) {
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const clampedDepth = Math.min(Math.max(depth, 0), 1);
  const y = useTransform(scrollYProgress, [0, 1], [0, -56 * clampedDepth]);

  if (reduceMotion) {
    return (
      <div style={style as CSSProperties} {...(props as HTMLAttributes<HTMLDivElement>)}>
        {children}
      </div>
    );
  }

  return (
    <motion.div style={{ ...style, y }} {...props}>
      {children}
    </motion.div>
  );
}
