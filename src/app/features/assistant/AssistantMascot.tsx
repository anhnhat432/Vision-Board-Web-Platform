import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { X } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip";
import { OwlIcon } from "./OwlIcon";
import type { NudgeState } from "./useProactiveNudge";
import { useDraggableMascot } from "./useDraggableMascot";

interface AssistantMascotProps {
  onClick: () => void;
  isOpen: boolean;
  nudge: NudgeState;
  dismissNudge: () => void;
}

export function AssistantMascot({ onClick, isOpen, nudge, dismissNudge }: AssistantMascotProps) {
  const { position, isDragging, handlePointerDown, wasDragged } = useDraggableMascot();
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
          className="z-50 flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 p-1 shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 sm:p-0.5"
        >
          <span className="absolute inset-0 -z-10 animate-pulse rounded-full bg-indigo-400/30" />
          <span className="relative flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 sm:size-11">
            <OwlIcon size={28} />
            {nudge.active ? (
              <span className="absolute -top-1 -right-1 size-3 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
            ) : null}
          </span>
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
