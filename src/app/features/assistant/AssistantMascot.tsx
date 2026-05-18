import { Tooltip, TooltipContent, TooltipTrigger } from "../../components/ui/tooltip";
import { OwlIcon } from "./OwlIcon";

interface AssistantMascotProps {
  onClick: () => void;
  isOpen: boolean;
}

export function AssistantMascot({ onClick, isOpen }: AssistantMascotProps) {
  if (isOpen) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          aria-label="Mở trợ lý AI"
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 p-1 shadow-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 sm:bottom-4 sm:right-4 sm:p-0.5"
        >
          <span className="absolute inset-0 -z-10 animate-pulse rounded-full bg-indigo-400/30" />
          <span className="relative flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 sm:size-11">
            <OwlIcon size={28} />
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">Hỏi trợ lý</TooltipContent>
    </Tooltip>
  );
}
