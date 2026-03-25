import * as React from "react";
import { useReducedMotion } from "motion/react";

import { cn } from "./utils";

type InteractiveSurfaceProps = React.ComponentProps<"div"> & {
  intensity?: number;
  translate?: number;
  shine?: boolean;
};

type InteractiveLayerProps = React.ComponentProps<"div"> & {
  depth?: "soft" | "medium" | "strong";
};

const DEFAULT_POINTER_STYLE = {
  "--pointer-x": "0.5",
  "--pointer-y": "0.5",
  "--rotate-x": "0deg",
  "--rotate-y": "0deg",
  "--shift-x": "0px",
  "--shift-y": "0px",
} as React.CSSProperties;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function InteractiveSurface({
  className,
  children,
  intensity = 8,
  translate = 18,
  shine = true,
  style,
  onPointerMove,
  onPointerLeave,
  ...props
}: InteractiveSurfaceProps) {
  const prefersReducedMotion = useReducedMotion();
  const surfaceRef = React.useRef<HTMLDivElement | null>(null);
  const frameRef = React.useRef<number | null>(null);

  const commitPointer = React.useCallback(
    (pointerX: number, pointerY: number, hovering: boolean) => {
      if (!surfaceRef.current) return;

      const rotateX = ((0.5 - pointerY) * intensity).toFixed(3);
      const rotateY = ((pointerX - 0.5) * intensity).toFixed(3);
      const shiftX = ((pointerX - 0.5) * translate * 2).toFixed(2);
      const shiftY = ((pointerY - 0.5) * translate * 2).toFixed(2);

      surfaceRef.current.style.setProperty("--pointer-x", pointerX.toFixed(4));
      surfaceRef.current.style.setProperty("--pointer-y", pointerY.toFixed(4));
      surfaceRef.current.style.setProperty("--rotate-x", `${rotateX}deg`);
      surfaceRef.current.style.setProperty("--rotate-y", `${rotateY}deg`);
      surfaceRef.current.style.setProperty("--shift-x", `${shiftX}px`);
      surfaceRef.current.style.setProperty("--shift-y", `${shiftY}px`);
      surfaceRef.current.dataset.hovering = hovering ? "true" : "false";
    },
    [intensity, translate],
  );

  const schedulePointer = React.useCallback(
    (pointerX: number, pointerY: number, hovering: boolean) => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }

      frameRef.current = requestAnimationFrame(() => {
        commitPointer(pointerX, pointerY, hovering);
        frameRef.current = null;
      });
    },
    [commitPointer],
  );

  React.useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    onPointerMove?.(event);

    if (
      event.defaultPrevented ||
      prefersReducedMotion ||
      event.pointerType === "touch" ||
      !surfaceRef.current
    ) {
      return;
    }

    const bounds = surfaceRef.current.getBoundingClientRect();
    if (bounds.width === 0 || bounds.height === 0) return;

    const pointerX = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
    const pointerY = clamp((event.clientY - bounds.top) / bounds.height, 0, 1);

    schedulePointer(pointerX, pointerY, true);
  };

  const handlePointerLeave = (event: React.PointerEvent<HTMLDivElement>) => {
    onPointerLeave?.(event);

    if (prefersReducedMotion) return;
    schedulePointer(0.5, 0.5, false);
  };

  return (
    <div
      ref={surfaceRef}
      data-hovering="false"
      className={cn(
        "interactive-surface",
        shine && "interactive-surface--shine",
        prefersReducedMotion && "interactive-surface--reduced",
        className,
      )}
      style={{ ...DEFAULT_POINTER_STYLE, ...style }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      {...props}
    >
      {children}
    </div>
  );
}

export function InteractiveLayer({
  className,
  depth = "medium",
  ...props
}: InteractiveLayerProps) {
  return (
    <div
      className={cn("interactive-layer", `interactive-layer--${depth}`, className)}
      {...props}
    />
  );
}
