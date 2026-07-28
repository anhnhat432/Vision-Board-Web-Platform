import { AlertTriangle, CheckCircle2, Target, Zap } from "lucide-react";
import { cn } from "@/app/components/ui/utils";

interface GoalSummaryStripProps {
  totalGoals: number;
  completedGoals: number;
  completedTasks: number;
  totalTasks: number;
  activeSystems: number;
  needsAttention: number;
}

export function GoalSummaryStrip({
  totalGoals,
  completedGoals,
  completedTasks,
  totalTasks,
  activeSystems,
  needsAttention,
}: GoalSummaryStripProps) {
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const items = [
    {
      title: "Mục tiêu",
      value: totalGoals,
      note: `${completedGoals} hoàn thành`,
      icon: Target,
      iconBg: "bg-app-accent text-white",
      tintClass: "bg-app-accent-subtle/40",
      barClass: "bg-app-accent",
      monoNoteNum: completedGoals,
    },
    {
      title: "Việc đã chốt",
      value: `${completedTasks}/${totalTasks}`,
      isFraction: true,
      note: `${completionRate}% hoàn thành`,
      icon: CheckCircle2,
      iconBg: "bg-app-accent text-white",
      tintClass: "bg-app-accent-subtle/40",
      barClass: "bg-app-accent",
      monoNoteNum: completionRate,
    },
    {
      title: "Chu kỳ",
      value: activeSystems,
      note: "đang chạy",
      icon: Zap,
      iconBg: "bg-[#E7B400] text-white",
      tintClass: "bg-[#FFF8DE]/60",
      barClass: "bg-[#E7B400]",
    },
    {
      title: "Cần chú ý",
      value: needsAttention,
      note: "quá hạn / review",
      icon: AlertTriangle,
      iconBg: "bg-app-energy text-white",
      tintClass: "bg-[#FFEDE8]/60",
      barClass: "bg-app-energy",
      attention: true,
    },
  ] as const;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px] items-stretch" data-tour-id="goaltracker-summary">
      {items.map((item) => {
        const Icon = item.icon;
        const isFractionItem = (item as typeof item & { isFraction?: boolean }).isFraction;
        const hasFraction = isFractionItem && typeof item.value === "string" && item.value.includes("/");
        const fracParts = hasFraction ? String(item.value).split("/") : [];
        const fracNum = fracParts[0] ?? "";
        const fracDen = fracParts[1] ?? "";
        const monoNoteNumVal = (item as typeof item & { monoNoteNum?: number }).monoNoteNum;
        const isAttention = (item as typeof item & { attention?: boolean }).attention;
        const isActiveAttention = isAttention && needsAttention > 0;
        return (
          <div
            key={item.title}
            className={cn(
              "relative h-full overflow-hidden rounded-card border px-5 pt-[22px] pb-[18px] flex flex-col",
              isActiveAttention
                ? "border-app-status-error/35 bg-app-status-error/[0.05]"
                : cn("border-app-line/70", item.tintClass),
            )}
          >
            <span
              className={cn(
                "absolute inset-x-0 top-0 h-[3px]",
                isActiveAttention ? "bg-app-status-error" : item.barClass,
              )}
              aria-hidden="true"
            />
            <div className="mb-3 flex items-center justify-between">
              <div
                className={cn(
                  "flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-input shadow-[var(--app-shadow-sm)]",
                  isActiveAttention ? "bg-app-status-error text-white" : item.iconBg,
                )}
              >
                <Icon className="h-[19px] w-[19px]" />
              </div>
              <p
                className={cn(
                  "text-[10px] font-bold uppercase tracking-[0.12em]",
                  isActiveAttention ? "text-app-status-error" : "text-app-ink-muted",
                )}
              >
                {item.title}
              </p>
            </div>
            <p
              className={cn(
                "font-serif text-[34px] font-extrabold leading-none tabular-nums",
                isActiveAttention ? "text-app-status-error" : "text-app-ink",
              )}
            >
              {hasFraction ? (
                <>
                  {fracNum}
                  <span className="text-lg text-app-ink-muted">/{fracDen}</span>
                </>
              ) : (
                item.value
              )}
            </p>
            <p
              className={cn(
                "mt-2 text-[11.5px] font-semibold leading-tight",
                isActiveAttention ? "text-app-status-error/80" : "text-app-ink-soft",
              )}
            >
              {monoNoteNumVal !== undefined ? (
                <>
                  <span className="font-mono">{monoNoteNumVal}</span>
                  {item.note.replace(/^\d+/, "")}
                </>
              ) : (
                item.note
              )}
            </p>
          </div>
        );
      })}
    </div>
  );
}
