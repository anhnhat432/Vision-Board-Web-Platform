import type { CSSProperties } from "react";
import { useReducedMotion } from "../../components/ui/use-reduced-motion";
import { cn } from "../../components/ui/utils";

interface MascotBubbleProps {
  text: string;
  active: boolean;
  mascotPosition: { x: number; y: number };
  onDismiss?: () => void;
  onHoverStart?: () => void;
  onHoverEnd?: () => void;
}

function getViewportWidth(): number {
  if (typeof window === "undefined") return 0;
  return window.innerWidth;
}

export function MascotBubble({ text, active, mascotPosition, onDismiss, onHoverStart, onHoverEnd }: MascotBubbleProps) {
  const prefersReducedMotion = useReducedMotion();
  const viewportWidth = getViewportWidth();
  const shouldPlaceLeft = mascotPosition.x > viewportWidth / 2;
  const style: CSSProperties = {
    top: mascotPosition.y + 8,
    ...(shouldPlaceLeft ? { right: viewportWidth - mascotPosition.x + 8 } : { left: mascotPosition.x + 72 }),
  };

  return (
    <div
      aria-live="polite"
      aria-hidden={!active}
      onClick={active ? onDismiss : undefined}
      onMouseEnter={active ? onHoverStart : undefined}
      onMouseLeave={active ? onHoverEnd : undefined}
      className={cn(
        "fixed z-40 max-w-[200px] rounded-2xl bg-app-surface px-3 py-2 text-left text-sm text-app-ink shadow-lg ring-1 ring-app-line/70 dark:ring-white/10 transition-all duration-300",
        prefersReducedMotion && "transition-none duration-0",
        active ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 -translate-y-1",
      )}
      style={style}
    >
      {text}
      <span
        className={cn(
          "absolute -bottom-1 size-3 rotate-45 bg-app-surface ring-1 ring-app-line/70 dark:ring-white/10",
          shouldPlaceLeft ? "right-4" : "left-4",
        )}
      />
    </div>
  );
}
