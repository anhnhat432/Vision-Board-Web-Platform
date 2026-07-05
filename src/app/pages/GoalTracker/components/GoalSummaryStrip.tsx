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
      iconBg: "bg-app-accent-subtle text-app-accent",
      monoNoteNum: completedGoals,
    },
    {
      title: "Việc đã chốt",
      value: `${completedTasks}/${totalTasks}`,
      isFraction: true,
      note: `${completionRate}% hoàn thành`,
      icon: CheckCircle2,
      iconBg: "bg-app-accent-subtle text-app-accent",
      monoNoteNum: completionRate,
    },
    {
      title: "Chu kỳ",
      value: activeSystems,
      note: "đang chạy",
      icon: Zap,
      iconBg: "bg-[#FFF8DE] text-[#E7B400]",
    },
    {
      title: "Cần chú ý",
      value: needsAttention,
      note: "quá hạn / review",
      icon: AlertTriangle,
      iconBg: "bg-[#FFEDE8] text-[#FF5C3E]",
      attention: true,
    },
  ];

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
        return (
          <div
            key={item.title}
            className={cn(
              "h-full rounded-[18px] border px-5 py-[18px] flex flex-col transition-all duration-300",
              isAttention && needsAttention > 0
                ? "border-app-status-error/40 bg-app-status-error/[0.04] hover:border-app-status-error/60 hover:shadow-[var(--app-shadow-md)]"
                : "border-[rgba(23,21,15,0.08)] bg-app-surface hover:border-app-accent/20 hover:shadow-[var(--app-shadow-md)]",
            )}
          >
            <div
              className={cn(
                "flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] mb-3",
                item.iconBg,
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
            </div>
            <p
              className={cn(
                "text-[10px] font-bold uppercase tracking-[0.1em] mb-1",
                isAttention && needsAttention > 0 ? "text-app-status-error" : "text-[#A8A296]",
              )}
            >
              {item.title}
            </p>
            <p
              className={cn(
                "font-serif text-[28px] font-extrabold leading-none",
                isAttention && needsAttention > 0 ? "text-app-status-error" : "text-app-ink",
              )}
            >
              {hasFraction ? (
                <>
                  {fracNum}
                  <span className="text-base text-app-ink-muted">/{fracDen}</span>
                </>
              ) : (
                item.value
              )}
            </p>
            <p
              className={cn(
                "mt-1.5 text-[11px] font-medium leading-tight",
                isAttention && needsAttention > 0 ? "text-app-status-error/80" : "text-[#8C887C]",
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
