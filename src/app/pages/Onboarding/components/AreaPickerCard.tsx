import { motion, useReducedMotion } from "motion/react";
import { cn } from "../../../components/ui/utils";
import type { LifeArea } from "../../../utils/storage";

interface AreaPickerCardProps {
  area: LifeArea;
  index: number;
  isSelected: boolean;
  isReviewed: boolean;
  icon: React.ElementType;
  label: string;
  compactLabel: string;
  accent: string;
  bg: string;
  onClick: () => void;
}

export function AreaPickerCard({
  area,
  isSelected,
  isReviewed,
  icon: AreaIcon,
  label,
  compactLabel,
  accent,
  bg,
  onClick,
}: AreaPickerCardProps) {
  const reduceMotion = useReducedMotion();

  const content = (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "dof-areachip relative w-full cursor-pointer rounded-[14px] p-3 text-left font-[inherit] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2",
        isSelected ? "ring-2" : "hover:-translate-y-0.5",
      )}
      style={{
        border: `1.5px solid ${isSelected ? accent : "rgba(23,21,15,0.08)"}`,
        background: isSelected ? bg : "#fff",
      }}
      aria-pressed={isSelected}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] sm:h-10 sm:w-10 sm:rounded-[11px]"
          style={{ background: bg, color: accent }}
        >
          <AreaIcon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <span className="block text-[12px] font-bold leading-tight text-app-ink sm:text-[13px]">
            <span className="sm:hidden">{compactLabel}</span>
            <span className="hidden sm:inline">{label}</span>
          </span>
          <span
            className={cn(
              "mt-1 block text-[10.5px] leading-snug sm:text-[11px]",
              isReviewed ? "text-app-accent" : "text-app-ink-muted",
            )}
          >
            {isReviewed ? `${area.score}/10 · Đã rà` : "Chưa rà"}
          </span>
        </div>
      </div>
      {isReviewed && (
        <div
          className="absolute right-2 top-2 h-2 w-2 rounded-full sm:right-3 sm:top-3"
          style={{ background: accent }}
          aria-hidden="true"
        />
      )}
    </button>
  );

  if (reduceMotion) {
    return content;
  }

  return (
    <motion.div
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
    >
      {content}
    </motion.div>
  );
}
