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
      iconBg: "bg-app-status-warning/10 text-app-status-warning",
    },
    {
      title: "Cần chú ý",
      value: needsAttention,
      note: "quá hạn / review",
      icon: AlertTriangle,
      iconBg: "bg-app-status-error/10 text-app-status-error",
      attention: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 items-stretch" data-tour-id="goaltracker-summary">
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
              "h-full rounded-[var(--app-radius-card)] border p-5 flex flex-col transition-all duration-300",
              isAttention && needsAttention > 0
                ? "border-app-status-error/40 bg-app-status-error/[0.04] shadow-[var(--app-shadow-md)] hover:border-app-status-error/60 hover:shadow-[var(--app-shadow-lg)]"
                : "border-app-line/30 bg-app-surface shadow-[var(--app-shadow-sm)] hover:border-app-accent/20 hover:shadow-[var(--app-shadow-md)]",
            )}
          >
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] mb-3",
                item.iconBg,
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
            </div>
            <p
              className={cn(
                "text-[11px] font-bold uppercase tracking-[0.1em] mb-1",
                isAttention && needsAttention > 0 ? "text-app-status-error" : "text-app-ink-muted",
              )}
            >
              {item.title}
            </p>
            <p
              className={cn(
                "font-serif text-[clamp(24px,2.8vw,32px)] font-extrabold leading-none",
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
                isAttention && needsAttention > 0 ? "text-app-status-error/80" : "text-app-ink-muted",
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
