import { Sparkles, X } from "lucide-react";
import { type MouseEvent, type PointerEvent, useEffect, useRef, useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip";
import type { Position } from "./useDraggableMascot";
import type { NudgeState } from "./useProactiveNudge";
import { OwlIcon } from "./OwlIcon";
import { useOwlIdleAnimation } from "./useOwlIdleAnimation";

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
  const { blinking } = useOwlIdleAnimation({ pause: isDragging || isOpen });
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
          className="assistant-mascot-shell z-50 inline-flex items-center gap-2.5 whitespace-nowrap rounded-full bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-600 dark:from-emerald-600 dark:via-teal-500 dark:to-cyan-500 px-5 py-3 text-white border border-white/20 dark:border-white/10 shadow-[0_8px_32px_rgba(16,185,129,0.3)] dark:shadow-[0_8px_32px_rgba(20,184,166,0.35)] transition-all duration-300 hover:scale-[1.06] active:scale-95 hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] dark:hover:shadow-[0_0_30px_rgba(20,184,166,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg"
        >
          <span className="absolute inset-0 -z-10 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] rounded-full bg-emerald-400/25 opacity-75" />
          <span className="absolute inset-0 -z-10 animate-[pulse_2.5s_ease-in-out_infinite] rounded-full bg-teal-500/20" />
          <OwlIcon
            size={20}
            blinking={blinking}
            className="relative text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.35)] transition-all duration-300"
          />
          <span className="relative text-sm font-bold tracking-wide">Hỏi Cú AI</span>
          {nudge.active ? (
            <span className="absolute -top-1 -right-1 size-3.5 rounded-full bg-app-warm ring-2 ring-app-surface animate-pulse" />
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
