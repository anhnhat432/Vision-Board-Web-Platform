import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { Sparkles, X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip";
import type { NudgeState } from "./useProactiveNudge";
import type { Position } from "./useDraggableMascot";

interface AssistantMascotProps {
  onClick: () => void;
  isOpen: boolean;
  nudge: NudgeState;
  dismissNudge: () => void;
  position: Position;
  isDragging: boolean;
  handlePointerDown: (event: PointerEvent<HTMLButtonElement>) => void;
  wasDragged: boolean;
}

export function AssistantMascot({
  onClick,
  isOpen,
  nudge,
  dismissNudge,
  position,
  isDragging,
  handlePointerDown,
  wasDragged,
}: AssistantMascotProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimeoutRef = useRef<number | null>(null);
  const tooltipAutoCloseRef = useRef<number | null>(null);
  const pointerFocusRef = useRef(false);
  const lastNudgeKeyRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        window.clearTimeout(tooltipTimeoutRef.current);
      }
      if (tooltipAutoCloseRef.current) {
        window.clearTimeout(tooltipAutoCloseRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isOpen || !nudge.active) {
      setShowTooltip(false);
      if (tooltipAutoCloseRef.current) {
        window.clearTimeout(tooltipAutoCloseRef.current);
      }
      return;
    }

    const nudgeKey = `${nudge.reason ?? "none"}:${nudge.message}`;
    if (lastNudgeKeyRef.current === nudgeKey) return;

    lastNudgeKeyRef.current = nudgeKey;
    if (tooltipAutoCloseRef.current) {
      window.clearTimeout(tooltipAutoCloseRef.current);
    }
    tooltipAutoCloseRef.current = window.setTimeout(() => {
      setShowTooltip(false);
    }, 8_000);

    const openId = window.setTimeout(() => {
      setShowTooltip(true);
    }, 500);

    return () => {
      window.clearTimeout(openId);
    };
  }, [isOpen, nudge.active, nudge.message, nudge.reason]);

  const hideTooltip = () => {
    if (tooltipTimeoutRef.current) {
      window.clearTimeout(tooltipTimeoutRef.current);
    }
    setShowTooltip(false);
  };

  const handleFocus = () => {
    if (pointerFocusRef.current) {
      pointerFocusRef.current = false;
      return;
    }

    setShowTooltip(true);
    if (tooltipTimeoutRef.current) {
      window.clearTimeout(tooltipTimeoutRef.current);
    }
    tooltipTimeoutRef.current = window.setTimeout(() => {
      setShowTooltip(false);
    }, 2000);
  };

  const handleMascotPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    pointerFocusRef.current = true;
    hideTooltip();
    handlePointerDown(e);
  };

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (isOpen) return;
    if (wasDragged) {
      e.preventDefault();
      return;
    }
    dismissNudge();
    onClick();
  };

  const handleDismiss = () => {
    dismissNudge();
    hideTooltip();
  };

  if (isOpen) return null;

  return (
    <Tooltip open={showTooltip && !isDragging && !isOpen}>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleClick}
          onPointerDown={handleMascotPointerDown}
          onFocus={handleFocus}
          onBlur={hideTooltip}
          aria-label="Mở trợ lý AI"
          aria-keyshortcuts="Enter Space"
          style={{
            position: "fixed",
            left: position.x,
            top: position.y,
            touchAction: "none",
            cursor: isDragging ? "grabbing" : "grab",
          }}
          className="assistant-mascot-shell z-50 inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-app-accent px-4 py-2.5 text-white shadow-lg transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg"
        >
          <span className="absolute inset-0 -z-10 animate-pulse rounded-full bg-app-accent/25" />
          <Sparkles
            className={`relative h-4 w-4 text-white ${isDragging || isOpen ? "" : "animate-sparkle-twinkle"}`}
            strokeWidth={2.2}
          />
          <span className="relative text-sm font-semibold tracking-tight">Hỏi AI</span>
          {nudge.active ? (
            <span className="absolute -top-1 -right-1 size-3 rounded-full bg-app-warm ring-2 ring-app-surface animate-pulse" />
          ) : null}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px] text-sm">
        <div className="relative pr-5">
          {nudge.active ? (
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Ẩn gợi ý"
              className="absolute right-0 top-0 inline-flex size-4 items-center justify-center rounded-full text-background/80 transition hover:text-background"
            >
              <X className="size-3" />
            </button>
          ) : null}
          <div>{nudge.active ? nudge.message : "Kéo để di chuyển · Click để hỏi"}</div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
