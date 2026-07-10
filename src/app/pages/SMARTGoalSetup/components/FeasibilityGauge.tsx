import { motion, useReducedMotion } from "motion/react";

interface FeasibilityGaugeProps {
  score: number;
  weeklyHours: number;
}

export function FeasibilityGauge({ score, weeklyHours }: FeasibilityGaugeProps) {
  const shouldReduceMotion = useReducedMotion() ?? false;

  return (
    <div className="rounded-[16px] border border-app-line bg-app-surface p-5 space-y-3.5 select-none">
      <div className="flex items-center justify-between">
        <span className="text-xs font-extrabold text-app-ink-muted">
          Khả thi theo thời gian
        </span>
        <span
          className="text-lg font-extrabold text-app-accent"
          style={{ fontFamily: "'Bricolage Grotesque', serif" }}
        >
          {score}%
        </span>
      </div>

      <div className="relative h-[9px] w-full rounded-full bg-app-bg-subtle overflow-hidden">
        <motion.div
          style={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.8, ease: "easeOut" }}
          className="h-full rounded-full bg-gradient-to-r from-app-accent to-[#16A34A]"
        />
      </div>

      <p className="text-[12px] text-app-ink-soft leading-[var(--text-base--line-height)] font-medium">
        Dành khoảng <span className="font-bold text-app-ink">{weeklyHours} giờ/tuần</span>. Mức độ thời gian khả
        thi giúp bạn tránh kiệt sức và dễ giữ nhịp bền hơn.
      </p>
    </div>
  );
}
