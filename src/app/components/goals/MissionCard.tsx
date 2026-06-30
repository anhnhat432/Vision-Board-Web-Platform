/**
 * MissionCard — Goal card dạng sticky note
 *
 * Mỗi mục tiêu như một tờ sticky note được ghim lên bảng,
 * với washi tape, shadow, và trạng thái visual rõ ràng.
 *
 * Concept: Studio Desk / Mission Board
 */

import {
  ArrowRight,
  Award,
  CheckCircle2,
  Circle,
  Lock,
  Mail,
  MailOpen,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/app/components/ui/button";
import { CountUp } from "@/app/components/ui/count-up";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { cn } from "@/app/components/ui/utils";
import { GoalStatusRail } from "./GoalStatusRail";
import {
  getGoalArchetypeIcon,
} from "@/app/components/illustrations";
import {
  getGoalExecutionStats,
  getLifeAreaLabel,
  getTwelveWeekCurrentWeek,
  getTwelveWeekTodayTasks,
  type Goal,
  type PricingPlanCode,
  type TwelveWeekSystem,
} from "@/app/utils/storage";
import { getPlanLabel } from "@/app/utils/twelve-week-premium";

/* ─── Category styles ─── */
const CATEGORY_STYLES = {
  default: {
    bg: "bg-app-accent-soft text-app-accent",
    text: "text-app-accent",
    border: "border-app-accent/15",
    bar: "from-app-accent/80 to-app-accent",
  },
};

/* ─── Health status ─── */
interface HealthStatus {
  label: string;
  bgClass: string;
}

function getGoalHealthStatus(
  goal: Goal,
  progress: number,
  isOverdue: boolean,
  isNearDeadline: boolean,
): HealthStatus {
  const stats = getGoalExecutionStats(goal);

  if (progress === 100) {
    return {
      label: "Hoàn thành ✨",
      bgClass:
        "bg-app-status-success/10 text-app-status-success border border-app-status-success/30",
    };
  }
  if (isOverdue) {
    return {
      label: "Cần chỉnh nhịp 🌊",
      bgClass:
        "bg-app-status-warning/10 text-app-status-warning border border-app-status-warning/30",
    };
  }
  if (stats.reviewDueToday) {
    return {
      label: "Đến ngày review 📋",
      bgClass:
        "bg-app-status-warning/10 text-app-status-warning border border-app-status-warning/30",
    };
  }
  if (isNearDeadline) {
    return {
      label: "Sắp đến hạn ⏳",
      bgClass: "bg-app-status-warning/10 text-app-status-warning border border-app-status-warning/30",
    };
  }
  return {
    label: "Đang đi đều 🌱",
    bgClass: "bg-app-status-info/10 text-app-status-info border border-app-status-info/30",
  };
}

/* ─── Completion details ─── */
interface GoalCompletionDetails {
  completedAtStr: string;
  completedTasks: number;
  totalTasks: number;
}

function getGoalCompletionDetails(goal: Goal): GoalCompletionDetails {
  const stats = getGoalExecutionStats(goal);
  let latestDate: Date | null = null;

  if (goal.twelveWeekSystem) {
    for (const task of goal.twelveWeekSystem.taskInstances) {
      if (task.completed && task.completedAt) {
        try {
          const d = new Date(task.completedAt);
          if (!Number.isNaN(d.getTime()) && (!latestDate || d > latestDate)) {
            latestDate = d;
          }
        } catch {
          /* ignore */
        }
      }
    }
  } else {
    for (const task of goal.tasks) {
      if (task.completed && task.lastModifiedAt) {
        try {
          const d = new Date(task.lastModifiedAt);
          if (!Number.isNaN(d.getTime()) && (!latestDate || d > latestDate)) {
            latestDate = d;
          }
        } catch {
          /* ignore */
        }
      }
    }
  }

  let completedAtStr = "Vừa hoàn thành";
  if (latestDate) {
    const day = String(latestDate.getDate()).padStart(2, "0");
    const month = String(latestDate.getMonth() + 1).padStart(2, "0");
    const year = latestDate.getFullYear();
    completedAtStr = `${day}/${month}/${year}`;
  }

  return {
    completedAtStr,
    completedTasks: stats.completed,
    totalTasks: stats.total,
  };
}

/* ─── MissionCard Props ─── */
export interface MissionCardProps {
  goal: Goal;
  currentPlanCode: PricingPlanCode;
  progress: number;
  isOverdue: boolean;
  isNearDeadline: boolean;
  handleToggleTask: (goalId: string, taskId: string) => void;
  openTwelveWeekCenter: (goalId: string) => void;
  setGoalToDelete: (goalId: string) => void;
}

export function MissionCard({
  goal,
  currentPlanCode,
  progress,
  isOverdue,
  isNearDeadline,
  handleToggleTask,
  openTwelveWeekCenter,
  setGoalToDelete,
}: MissionCardProps) {
  const system = goal.twelveWeekSystem;
  const systemCurrentWeek = system ? getTwelveWeekCurrentWeek(system) : null;
  const GoalArchetypeIcon = getGoalArchetypeIcon(system?.goalType ?? goal.category);
  const areaStyle = CATEGORY_STYLES.default;

  const displayTasks = useMemo(() => {
    if (system) {
      const todayTasks = getTwelveWeekTodayTasks(system);
      return todayTasks.filter((task) => !task.completed).slice(0, 2);
    }
    return (goal.tasks || []).filter((task) => !task.completed).slice(0, 2);
  }, [system, goal.tasks]);

  const completedTasksCount = useMemo(() => {
    if (system) {
      const todayTasks = getTwelveWeekTodayTasks(system);
      return todayTasks.filter((t) => t.completed).length;
    }
    return (goal.tasks || []).filter((t) => t.completed).length;
  }, [system, goal.tasks]);

  const totalTasksCount = useMemo(() => {
    if (system) {
      const todayTasks = getTwelveWeekTodayTasks(system);
      return todayTasks.length;
    }
    return (goal.tasks || []).length;
  }, [system, goal.tasks]);

  const completionDetails = useMemo(() => getGoalCompletionDetails(goal), [goal]);
  const health = useMemo(
    () => getGoalHealthStatus(goal, progress, isOverdue, isNearDeadline),
    [goal, progress, isOverdue, isNearDeadline],
  );
  const isCompleted = progress === 100;

  return (
    <article
      id={`goal-card-${goal.id}`}
      className={cn(
        "relative rounded-[16px] transition-all duration-200 overflow-hidden",
        "motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-app-md",
        isCompleted
          ? "bg-app-accent-subtle/40 border border-app-accent/25 shadow-app-sm"
          : "bg-app-surface border border-app-line shadow-app-sm hover:border-app-accent/20",
      )}
    >
      {/* Washi tape decoration — only for active goals */}
      {!isCompleted && (
        <div
          className="absolute -top-1.5 left-7 w-12 h-3.5 bg-app-accent/8 dark:bg-app-accent/12 rotate-[-2deg] rounded-sm border border-dashed border-app-accent/10 z-10"
          aria-hidden="true"
        />
      )}

      {/* Completed seal overlay */}
      {isCompleted && (
        <div
          className="absolute top-3 right-3 z-10"
          aria-hidden="true"
        >
          <span className="text-lg" title="Đã hoàn thành">🏆</span>
        </div>
      )}

      {/* Delete button */}
      <button
        type="button"
        className="absolute top-2 right-2 h-9 w-9 rounded-lg text-app-ink-muted/30 hover:text-app-status-error hover:bg-app-status-error/5 transition-colors duration-150 flex items-center justify-center z-20"
        onClick={() => setGoalToDelete(goal.id)}
        aria-label={`Xóa mục tiêu ${goal.title}`}
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {/* Content */}
      <div className="p-4 sm:p-5 space-y-3.5">
        {/* Header: Icon + Title + Meta */}
        <div className="flex items-start gap-2.5">
          <div
            className={cn(
              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px]",
              areaStyle.bg,
              areaStyle.text,
            )}
          >
            <GoalArchetypeIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            <h3 className="pr-8 text-[14px] font-bold leading-snug text-app-ink break-words line-clamp-2">
              {goal.title}
            </h3>
            <p className="flex flex-wrap items-center gap-1 text-[11px] text-app-ink-muted">
              <span className="font-semibold">
                {system ? `Tuần ${systemCurrentWeek ?? "-"}/12` : "Mục tiêu thường"}
              </span>
              <span aria-hidden="true">·</span>
              <span className={cn("font-bold", areaStyle.text)}>
                {getLifeAreaLabel(goal.category)}
              </span>
              {goal.deadline && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Hạn: {new Date(goal.deadline).toLocaleDateString("vi-VN")}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Health badge */}
        <div className="flex flex-wrap gap-1.5">
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", health.bgClass)}>
            {health.label}
          </span>
          {system && (
            <span className="rounded-full bg-app-status-warning/10 px-2 py-0.5 text-[10px] font-bold text-app-status-warning">
              {getPlanLabel(currentPlanCode)}
            </span>
          )}
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-app-ink-muted">
              Tiến độ
            </span>
            <span className={cn("font-mono text-sm font-bold tabular-nums", areaStyle.text)}>
              <CountUp value={progress} suffix="%" />
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-app-bg" aria-hidden="true">
            <div
              className={cn(
                "h-full rounded-full bg-gradient-to-r transition-all duration-500 ease-out",
                areaStyle.bar,
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 12-week journey rail (for 12-week goals) */}
        {system && <GoalStatusRail system={system} />}

        {/* Tasks section */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-app-ink">
              {system ? "Việc hôm nay" : "Nhiệm vụ chưa xong"}
            </p>
            <span className="rounded-full bg-app-accent-subtle px-2 py-0.5 font-mono text-[11px] font-bold tabular-nums text-app-accent">
              {completedTasksCount}/{totalTasksCount}
            </span>
          </div>

          <div className="space-y-1">
            {displayTasks.map((task) => (
              <TaskRow
                key={task.id}
                goalId={goal.id}
                task={task}
                onToggle={handleToggleTask}
              />
            ))}

            {displayTasks.length === 0 && (
              <p className="flex min-h-[44px] items-center justify-center text-[11px] italic text-app-ink-muted/60">
                {system ? "Không có việc hôm nay." : "Đã chốt hết việc chưa xong."}
              </p>
            )}
          </div>
        </div>

        {/* Completed state — celebration */}
        {isCompleted && (
          <div className="rounded-[10px] bg-app-accent-subtle/60 border border-app-accent/15 p-3 space-y-1">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-app-accent" />
              <p className="text-xs font-bold text-app-accent">Mục tiêu đã hoàn thành</p>
            </div>
            <p className="text-[11px] text-app-ink-soft">
              Hoàn thành ngày {completionDetails.completedAtStr} · {completionDetails.completedTasks}/{completionDetails.totalTasks} việc đã chốt
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {system && !isCompleted && (
            <Button
              type="button"
              className="rounded-full bg-app-accent text-white hover:bg-app-accent-hover px-3.5 py-1.5 text-xs font-bold shadow-app-sm inline-flex items-center gap-1.5"
              onClick={() => openTwelveWeekCenter(goal.id)}
            >
              Tiếp tục chu kỳ
              <ArrowRight className="h-3 w-3" />
            </Button>
          )}
          {system && <FutureSelfLetter goalId={goal.id} progress={progress} system={system} />}
        </div>
      </div>
    </article>
  );
}

/* ─── Task Row ─── */
interface TaskRowProps {
  goalId: string;
  task: { id: string; title: string; completed: boolean };
  onToggle: (goalId: string, taskId: string) => void;
}

function TaskRow({ goalId, task, onToggle }: TaskRowProps) {
  return (
    <div className="flex items-center gap-2.5 rounded-[8px] border border-app-line bg-app-bg-subtle/50 px-2.5 py-1.5 transition-colors duration-150 hover:border-app-accent/15">
      <button
        type="button"
        onClick={() => onToggle(goalId, task.id)}
        className="flex shrink-0 items-center justify-center min-h-[36px] min-w-[36px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 rounded-lg"
        aria-label={task.completed ? `Hủy chốt việc: ${task.title}` : `Chốt việc: ${task.title}`}
      >
        {task.completed ? (
          <CheckCircle2 className="size-[18px] text-app-accent shrink-0" />
        ) : (
          <span className="flex size-[18px] items-center justify-center rounded-full border-2 border-app-line/60 bg-app-surface transition-colors duration-150 hover:border-app-accent">
            <Circle className="size-2.5 text-app-ink-muted shrink-0 opacity-0" />
          </span>
        )}
      </button>
      <span
        className={cn(
          "truncate text-[13px] font-medium transition-colors duration-150",
          task.completed ? "line-through text-app-ink-muted" : "text-app-ink",
        )}
      >
        {task.title}
      </span>
    </div>
  );
}

/* ─── Future Self Letter (preserved from original) ─── */
interface FutureSelfLetterProps {
  goalId: string;
  progress: number;
  system?: TwelveWeekSystem;
}

function FutureSelfLetter({ goalId, progress, system }: FutureSelfLetterProps) {
  const [letterText, setLetterText] = useState<string | null>(null);
  const [isWriteOpen, setIsWriteOpen] = useState(false);
  const [isReadOpen, setIsReadOpen] = useState(false);
  const [tempText, setTempText] = useState("");
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);

  const handleWriteOpenChange = (open: boolean) => {
    if (!open) {
      const isDirty = tempText.trim() !== (letterText || "").trim();
      if (isDirty) {
        setDiscardConfirmOpen(true);
        return;
      }
    }
    setIsWriteOpen(open);
  };

  const handleConfirmDiscard = () => {
    setDiscardConfirmOpen(false);
    setIsWriteOpen(false);
  };

  const discardLetterAlertDialog = (
    <AlertDialog open={discardConfirmOpen} onOpenChange={setDiscardConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Bỏ thay đổi trên thư?</AlertDialogTitle>
          <AlertDialogDescription>
            Nội dung thư thay đổi chưa được lưu/niêm phong sẽ bị mất. Bạn vẫn muốn đóng chứ?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Tiếp tục viết</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirmDiscard}
            className="bg-app-status-error hover:bg-app-status-error/90 text-white"
          >
            Bỏ thay đổi
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  useEffect(() => {
    const saved = localStorage.getItem(`future_letter_${goalId}`);
    setLetterText(saved);
  }, [goalId]);

  const handleOpenWrite = () => {
    setTempText(letterText || "");
    setIsReadOpen(false);
    setIsWriteOpen(true);
  };

  const handleSave = () => {
    if (!tempText.trim()) {
      localStorage.removeItem(`future_letter_${goalId}`);
      setLetterText(null);
      toast.info("Đã xóa thư nháp.");
    } else {
      localStorage.setItem(`future_letter_${goalId}`, tempText);
      setLetterText(tempText);
      toast.success("Bức thư gửi tương lai đã được niêm phong!");
    }
    setIsWriteOpen(false);
  };

  const isUnlocked = useMemo(() => {
    if (progress === 100) return true;
    if (!system) return false;
    if (system.currentWeek >= 12) return true;
    try {
      const today = new Date();
      const end = new Date(system.endDate);
      if (today > end) return true;
    } catch {
      /* ignore */
    }
    return false;
  }, [progress, system]);

  const handleReadClick = () => {
    if (!isUnlocked) {
      toast.info("Thư đang được niêm phong 🔒", {
        description: "Đạt 100% tiến độ hoặc hoàn thành tuần 12 để mở.",
      });
      return;
    }
    setIsReadOpen(true);
  };

  if (!letterText) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenWrite}
          className="h-auto rounded-full border border-app-line bg-app-surface px-3 py-1.5 text-[11px] font-semibold text-app-ink-soft transition-all inline-flex items-center gap-1.5 hover:bg-app-bg"
        >
          <Mail className="h-3.5 w-3.5 text-app-accent" />
          Viết thư tuần 12
        </Button>

        <Dialog open={isWriteOpen} onOpenChange={handleWriteOpenChange}>
          <DialogContent className="max-w-lg p-5 sm:p-6 bg-app-surface border border-app-line rounded-[18px] shadow-app-lg">
            <DialogHeader className="space-y-1.5 text-left border-b border-app-line/45 pb-3">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-app-accent shrink-0" />
                <DialogTitle className="font-serif text-lg font-bold text-app-ink">
                  Gửi tôi ở tuần thứ 12
                </DialogTitle>
              </div>
            </DialogHeader>
            <DialogDescription className="text-sm text-app-ink-soft leading-relaxed mt-2">
              Viết một vài dòng nhắn nhủ, cam kết hoặc khích lệ bản thân lúc này. Bức thư sẽ được khóa lại và chỉ mở ra
              khi bạn đạt 100% tiến độ hoặc hoàn thành chu kỳ 12 tuần.
            </DialogDescription>

            <div className="pt-2">
              <textarea
                className="w-full min-h-[160px] rounded-xl border border-app-line bg-app-bg p-3.5 text-sm text-app-ink placeholder:text-app-ink-muted focus:outline-none focus:ring-2 focus:ring-app-accent/25 resize-none transition-all"
                placeholder="Gửi bản thân thân mến ở tuần 12…"
                value={tempText}
                onChange={(e) => setTempText(e.target.value)}
                maxLength={500}
              />
            </div>

            <DialogFooter className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mt-3">
              <span className="text-xs sm:text-sm text-app-ink-muted w-full sm:w-auto text-left font-medium">
                {tempText.length}/500 ký tự
              </span>
              <div className="flex gap-2.5 w-full sm:w-auto justify-end shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsWriteOpen(false)}
                  className="rounded-lg border border-app-line bg-app-surface text-app-ink hover:bg-app-bg h-9 px-4 py-2 font-bold text-xs sm:text-sm"
                >
                  Hủy
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  className="rounded-lg bg-app-accent text-white hover:bg-app-accent-hover font-bold h-9 px-4 py-2 text-xs sm:text-sm"
                >
                  Niêm phong thư
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {discardLetterAlertDialog}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={isUnlocked ? () => setIsReadOpen(true) : handleReadClick}
        className={cn(
          "rounded-lg border px-3 py-1.5 text-[11px] font-bold transition-all inline-flex items-center gap-1.5 h-8",
          isUnlocked
            ? "border-app-accent/30 bg-app-accent-soft text-app-accent hover:bg-app-accent-subtle"
            : "border-app-status-warning/30 bg-app-status-warning/10 text-app-status-warning hover:bg-app-status-warning/20",
        )}
      >
        {isUnlocked ? (
          <>
            <MailOpen className="h-3.5 w-3.5 text-app-accent" />
            Đọc thư
          </>
        ) : (
          <>
            <Lock className="h-3 w-3 text-app-status-warning" />
            Thư tuần 12
          </>
        )}
      </button>

      {/* Dialog Đọc thư */}
      <Dialog open={isReadOpen} onOpenChange={setIsReadOpen}>
        <DialogContent className="max-w-lg p-5 sm:p-6 bg-app-surface border border-app-line rounded-[18px] shadow-app-lg">
          <DialogHeader className="space-y-1.5 text-left border-b border-app-line pb-3">
            <div className="flex items-center gap-2">
              <MailOpen className="h-5 w-5 text-app-accent shrink-0" />
              <DialogTitle className="font-serif text-lg font-bold text-app-ink">
                Thư gửi từ quá khứ
              </DialogTitle>
            </div>
          </DialogHeader>
          <DialogDescription className="text-sm text-app-ink-soft mt-2">
            Bức thư bạn tự tay viết khi bắt đầu hành trình chinh phục mục tiêu này.
          </DialogDescription>

          <div className="bg-app-bg-subtle dark:bg-app-bg-subtle/40 rounded-xl p-4 border border-app-line/60 my-2">
            <p className="text-sm italic leading-relaxed text-app-ink whitespace-pre-wrap font-serif">
              "{letterText}"
            </p>
          </div>

          <DialogFooter className="flex flex-row justify-between items-center gap-3 w-full mt-2">
            <button
              type="button"
              onClick={handleOpenWrite}
              className="text-xs sm:text-sm text-app-accent hover:underline font-bold"
            >
              Chỉnh sửa thư
            </button>
            <Button
              size="sm"
              onClick={() => setIsReadOpen(false)}
              className="rounded-lg bg-app-accent hover:bg-app-accent-hover text-app-ink-on-accent font-bold h-9 px-4 py-2 text-xs sm:text-sm"
            >
              Tuyệt vời
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Chỉnh sửa khi đã có thư */}
      <Dialog open={isWriteOpen} onOpenChange={handleWriteOpenChange}>
        <DialogContent className="max-w-lg p-5 sm:p-6 bg-app-surface border border-app-line rounded-[18px] shadow-app-lg">
          <DialogHeader className="space-y-1.5 text-left border-b border-app-line/45 pb-3">
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-app-accent shrink-0" />
              <DialogTitle className="font-serif text-lg font-bold text-app-ink">
                Chỉnh sửa thư gửi tuần 12
              </DialogTitle>
            </div>
          </DialogHeader>
          <DialogDescription className="text-sm text-app-ink-soft leading-relaxed mt-2">
            Chỉnh sửa hoặc xóa bức thư gửi cho chính bạn ở cuối hành trình mục tiêu.
          </DialogDescription>

          <div className="pt-2">
            <textarea
              className="w-full min-h-[160px] rounded-xl border border-app-line bg-app-bg p-3.5 text-sm text-app-ink placeholder:text-app-ink-muted focus:outline-none focus:ring-2 focus:ring-app-accent/25 resize-none transition-all"
              placeholder="Gửi bản thân thân mến…"
              value={tempText}
              onChange={(e) => setTempText(e.target.value)}
              maxLength={500}
            />
          </div>

          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mt-3">
            <span className="text-xs sm:text-sm text-app-ink-muted w-full sm:w-auto text-left font-medium">
              {tempText.length}/500 ký tự
            </span>
            <div className="flex gap-2.5 w-full sm:w-auto justify-end shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsWriteOpen(false)}
                className="rounded-lg border border-app-line bg-app-surface text-app-ink hover:bg-app-bg h-9 px-4 py-2 font-bold text-xs sm:text-sm"
              >
                Hủy
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                className="rounded-lg bg-app-accent text-white hover:bg-app-accent-hover font-bold h-9 px-4 py-2 text-xs sm:text-sm"
              >
                Lưu thay đổi
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {discardLetterAlertDialog}
    </>
  );
}