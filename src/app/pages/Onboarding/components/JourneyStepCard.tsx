import { motion, useReducedMotion } from "motion/react";
import { cn } from "../../../components/ui/utils";

interface JourneyStepCardProps {
  number: string;
  title: string;
  description: string;
  delay?: number;
  className?: string;
}

export function JourneyStepCard({
  number,
  title,
  description,
  delay = 0,
  className,
}: JourneyStepCardProps) {
  const reduceMotion = useReducedMotion();

  const content = (
    <div
      className={cn(
        "group relative overflow-hidden rounded-card border border-app-line/60 bg-white p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-app-accent/30 hover:shadow-app-sm sm:p-5",
        className,
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-app-accent-soft/30 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-app-accent/10 font-mono text-[11px] font-bold text-app-accent sm:h-8 sm:w-8 sm:text-xs">
          {number}
        </span>
        <h3 className="mt-3 text-[13px] font-bold text-app-ink sm:text-[14px]">
          {title}
        </h3>
        <p className="mt-1 text-[11.5px] leading-relaxed text-app-ink-muted">
          {description}
        </p>
      </div>
    </div>
  );

  if (reduceMotion) {
    return content;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.4,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {content}
    </motion.div>
  );
}
