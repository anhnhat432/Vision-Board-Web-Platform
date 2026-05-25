import * as React from "react";
import { useReducedMotion } from "./use-reduced-motion";

import { cn } from "./utils";

type CardProps = React.ComponentProps<"div"> & {
  interactive?: boolean;
};

const DEFAULT_CARD_STYLE = {
  "--card-pointer-x": "0.5",
  "--card-pointer-y": "0.5",
  "--card-rotate-x": "0deg",
  "--card-rotate-y": "0deg",
  "--card-shift-x": "0px",
  "--card-shift-y": "0px",
} as React.CSSProperties;

function Card({ className, interactive = false, style, onPointerMove, onPointerLeave, ...props }: CardProps) {
  const prefersReducedMotion = useReducedMotion();
  const cardRef = React.useRef<HTMLDivElement | null>(null);
  const frameRef = React.useRef<number | null>(null);
  const isPointerInteractive = interactive && !prefersReducedMotion;

  React.useEffect(() => {
    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const setCardPointer = React.useCallback((x: number, y: number, hovering: boolean) => {
    if (!cardRef.current) return;

    const rotateX = ((0.5 - y) * 2.75).toFixed(3);
    const rotateY = ((x - 0.5) * 2.75).toFixed(3);
    const shiftX = ((x - 0.5) * 6).toFixed(2);
    const shiftY = ((y - 0.5) * 6).toFixed(2);

    cardRef.current.style.setProperty("--card-pointer-x", x.toFixed(4));
    cardRef.current.style.setProperty("--card-pointer-y", y.toFixed(4));
    cardRef.current.style.setProperty("--card-rotate-x", `${rotateX}deg`);
    cardRef.current.style.setProperty("--card-rotate-y", `${rotateY}deg`);
    cardRef.current.style.setProperty("--card-shift-x", `${shiftX}px`);
    cardRef.current.style.setProperty("--card-shift-y", `${shiftY}px`);
    cardRef.current.dataset.cardHovering = hovering ? "true" : "false";
  }, []);

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    onPointerMove?.(event);

    if (event.defaultPrevented || !isPointerInteractive || event.pointerType === "touch" || !cardRef.current) {
      return;
    }

    const bounds = cardRef.current.getBoundingClientRect();
    if (bounds.width === 0 || bounds.height === 0) return;

    const pointerX = Math.min(Math.max((event.clientX - bounds.left) / bounds.width, 0), 1);
    const pointerY = Math.min(Math.max((event.clientY - bounds.top) / bounds.height, 0), 1);

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = requestAnimationFrame(() => {
      setCardPointer(pointerX, pointerY, true);
      frameRef.current = null;
    });
  };

  const handlePointerLeave = (event: React.PointerEvent<HTMLDivElement>) => {
    onPointerLeave?.(event);

    if (!isPointerInteractive) return;
    setCardPointer(0.5, 0.5, false);
  };

  return (
    <div
      ref={cardRef}
      data-slot="card"
      data-card-hovering="false"
      className={cn(
        "surface-raised flex flex-col gap-5 rounded-card text-card-foreground sm:gap-6",
        interactive && "surface-clickable-raised card-interactive-base",
        className,
      )}
      style={{ ...DEFAULT_CARD_STYLE, ...style }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-4 pt-4 has-data-[slot=card-action]:grid-cols-[1fr_auto] sm:px-5 sm:pt-5 [.border-b]:pb-4 sm:[.border-b]:pb-5",
        className,
      )}
      {...props}
    />
  );
}

type CardTitleProps = React.ComponentPropsWithoutRef<"h3"> & {
  as?: "h2" | "h3" | "h4";
};

function CardTitle({ className, as: Heading = "h3", ...props }: CardTitleProps) {
  return (
    <Heading
      data-slot="card-title"
      className={cn("font-serif text-lg font-medium leading-tight tracking-normal text-app-ink", className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-sm leading-6 tracking-normal text-app-ink-soft", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", className)}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-4 sm:px-5 [&:last-child]:pb-4 sm:[&:last-child]:pb-5", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-4 pb-4 sm:px-5 sm:pb-5 [.border-t]:pt-4 sm:[.border-t]:pt-5", className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent };
