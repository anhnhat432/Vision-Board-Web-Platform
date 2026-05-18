import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip";
import { OwlIcon } from "./OwlIcon";
import { useDraggableMascot } from "./useDraggableMascot";

interface AssistantMascotProps {
  onClick: () => void;
  isOpen: boolean;
}

export function AssistantMascot({ onClick, isOpen }: AssistantMascotProps) {
  const { position, isDragging, handlePointerDown, wasDragged } = useDraggableMascot();

  const handleClick = () => {
    if (isOpen) return;
    if (wasDragged) return;
    onClick();
  };

  if (isOpen) return null;

  return (
    <Tooltip open={!isDragging}>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={handleClick}
          onPointerDown={handlePointerDown}
          aria-label="Mở trợ lý AI"
          aria-keyshortcuts="Enter Space"
          style={{
            position: "fixed",
            left: position.x,
            top: position.y,
            touchAction: "none",
            cursor: isDragging ? "grabbing" : "grab",
          }}
          className="z-50 flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 p-1 shadow-lg transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 sm:p-0.5"
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
