import * as React from "react";

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
  translate,
  shine = true,
  ...props
}: InteractiveSurfaceProps) {
  const surfaceRef = React.useRef<HTMLDivElement | null>(null);

  return (
    <div
      ref={surfaceRef}
      className={cn("interactive-surface", shine && "interactive-surface--shine", className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function InteractiveLayer({ className, depth = "medium", ...props }: InteractiveLayerProps) {
  return <div className={cn("interactive-layer", `interactive-layer--${depth}`, className)} {...props} />;
}
