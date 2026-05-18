import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip";
import { OwlIcon } from "./OwlIcon";
import { useDraggableMascot } from "./useDraggableMascot";

interface AssistantMascotProps {
  onClick: () => void;
  isOpen: boolean;
}

export function AssistantMascot({ onClick, isOpen }: AssistantMascotProps) {
  const { position, isDragging, handlePointerDown, wasDragged } = useDraggableMascot();
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipTimeoutRef = useRef<number | null>(null);
  const pointerFocusRef = useRef(false);

  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        window.clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

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
    onClick();
  };

  if (isOpen) return null;

  return (
    <Tooltip open={showTooltip && !isDragging}>
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
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">Kéo để di chuyển · Click để hỏi</TooltipContent>
    </Tooltip>
  );
}
