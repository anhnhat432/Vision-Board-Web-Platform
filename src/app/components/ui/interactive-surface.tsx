import * as React from "react";
import { useReducedMotion } from "./use-reduced-motion";
import { cn } from "./utils";

type InteractiveSurfaceProps = Omit<React.ComponentProps<"div">, "translate"> & {
  intensity?: number;
  translate?: number;
  shine?: boolean;
};

type InteractiveLayerProps = React.ComponentProps<"div"> & {
  depth?: "soft" | "medium" | "strong";
};

export function InteractiveSurface({
  className,
  children,
  intensity,
  translate = 4,
  shine = true,
  onPointerMove,
  onPointerLeave,
  onPointerEnter,
  ...props
}: InteractiveSurfaceProps) {
  const surfaceRef = React.useRef<HTMLDivElement | null>(null);
  const boundsRef = React.useRef<DOMRect | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const resetSurface = React.useCallback(() => {
    if (!surfaceRef.current) return;
    surfaceRef.current.style.setProperty("--pointer-x", "0.5");
    surfaceRef.current.style.setProperty("--pointer-y", "0.5");
    surfaceRef.current.style.setProperty("--shift-x", "0px");
    surfaceRef.current.style.setProperty("--shift-y", "0px");
    surfaceRef.current.dataset.hovering = "false";
  }, []);

  const handlePointerEnter = (event: React.PointerEvent<HTMLDivElement>) => {
    onPointerEnter?.(event);
    if (prefersReducedMotion || event.pointerType === "touch" || !surfaceRef.current) return;
    boundsRef.current = surfaceRef.current.getBoundingClientRect();
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    onPointerMove?.(event);
    if (event.defaultPrevented || prefersReducedMotion || event.pointerType === "touch" || !surfaceRef.current) {
      return;
    }

    let bounds = boundsRef.current;
    if (!bounds) {
      bounds = surfaceRef.current.getBoundingClientRect();
      boundsRef.current = bounds;
    }
    if (bounds.width === 0 || bounds.height === 0) return;

    const pointerX = Math.min(Math.max((event.clientX - bounds.left) / bounds.width, 0), 1);
    const pointerY = Math.min(Math.max((event.clientY - bounds.top) / bounds.height, 0), 1);
    const maxShift = Math.min(Math.abs(translate), 5.5);
    const shiftScale = Math.max(0.4, Math.min(intensity ?? 1, 4) / 4);

    surfaceRef.current.style.setProperty("--pointer-x", pointerX.toFixed(4));
    surfaceRef.current.style.setProperty("--pointer-y", pointerY.toFixed(4));
    surfaceRef.current.style.setProperty("--shift-x", `${((pointerX - 0.5) * maxShift * shiftScale).toFixed(2)}px`);
    surfaceRef.current.style.setProperty("--shift-y", `${((pointerY - 0.5) * maxShift * shiftScale).toFixed(2)}px`);
    surfaceRef.current.dataset.hovering = "true";
  };

  const handlePointerLeave = (event: React.PointerEvent<HTMLDivElement>) => {
    onPointerLeave?.(event);
    boundsRef.current = null;
    resetSurface();
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
      onPointerEnter={handlePointerEnter}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      {...props}
    >
      {children}
    </div>
  );
}

export function InteractiveLayer({ className, depth = "medium", ...props }: InteractiveLayerProps) {
  return <div className={cn("interactive-layer", `interactive-layer--${depth}`, className)} {...props} />;
}
