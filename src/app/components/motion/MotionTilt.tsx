import { type HTMLMotionProps, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { type CSSProperties, type HTMLAttributes, type ReactNode, useEffect, useRef, useState } from "react";

interface MotionTiltProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  intensity?: number;
}

export function MotionTilt({
  children,
  intensity = 8,
  onPointerLeave,
  onPointerMove,
  style,
  ...props
}: MotionTiltProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();
  const [canTilt, setCanTilt] = useState(false);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const rotateX = useTransform(pointerY, [-0.5, 0.5], [intensity, -intensity]);
  const rotateY = useTransform(pointerX, [-0.5, 0.5], [-intensity, intensity]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    const update = () => setCanTilt(query.matches);
    update();
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, []);

  if (reduceMotion || !canTilt) {
    return (
      <div ref={ref} style={style as CSSProperties} {...(props as HTMLAttributes<HTMLDivElement>)}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      style={{ ...style, rotateX, rotateY, transformPerspective: 900 }}
      onPointerMove={(event) => {
        onPointerMove?.(event);
        if (event.defaultPrevented || event.pointerType === "touch" || !ref.current) return;

        const bounds = ref.current.getBoundingClientRect();
        if (bounds.width === 0 || bounds.height === 0) return;

        pointerX.set((event.clientX - bounds.left) / bounds.width - 0.5);
        pointerY.set((event.clientY - bounds.top) / bounds.height - 0.5);
      }}
      onPointerLeave={(event) => {
        onPointerLeave?.(event);
        pointerX.set(0);
        pointerY.set(0);
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
