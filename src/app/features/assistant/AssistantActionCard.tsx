import { ArrowRight, BookOpen, CalendarDays, CheckSquare, MessageSquare, Plus, Scale, Target } from "lucide-react";
import type { AssistantAction } from "./parseActions";

interface AssistantActionCardProps {
  action: AssistantAction;
  onExecute: (action: AssistantAction) => Promise<void>;
  onReject: (action: AssistantAction) => void;
  status: "pending" | "executing" | "done" | "error" | "rejected";
  errorMessage?: string;
  verified?: boolean;
  alreadyDone?: boolean;
}

function getIconForAction(type: AssistantAction["type"]) {
  switch (type) {
    case "create_task":
      return <Plus size={16} className="text-indigo-600 dark:text-indigo-400" />;
    case "mark_task_done":
    case "update_task_status":
      return <CheckSquare size={16} className="text-green-600 dark:text-green-400" />;
    case "navigate_to":
      return <ArrowRight size={16} className="text-blue-600 dark:text-blue-400" />;
    case "create_goal":
    case "create_smart_goal_from_insight":
      return <Target size={16} className="text-amber-600 dark:text-amber-400" />;
    case "create_life_insight_note":
      return <BookOpen size={16} className="text-purple-600 dark:text-purple-400" />;
    case "suggest_feasibility_inputs":
      return <Scale size={16} className="text-rose-600 dark:text-rose-400" />;
    case "create_twelve_week_plan_draft":
    case "reschedule_task":
      return <CalendarDays size={16} className="text-sky-600 dark:text-sky-400" />;
    case "add_weekly_review":
      return <MessageSquare size={16} className="text-teal-600 dark:text-teal-400" />;
  }
}

export function renderActionPreview(action: AssistantAction) {
  const { type, payload } = action;

  switch (type) {
    case "create_smart_goal_from_insight": {
      const p = payload as {
        title: string;
        category: string;
        description?: string;
        deadline?: string;
        focusArea?: string;
      };
      return (
        <div className="mt-2 space-y-1 rounded bg-app-bg-subtle/60 dark:bg-white/5 p-2 text-xs text-app-ink-soft border border-app-line/40">
          <div>
            <span className="font-semibold text-app-ink">Mục tiêu:</span> {p.title}
          </div>
          {p.focusArea && (
            <div>
              <span className="font-semibold text-app-ink">Trọng tâm:</span> {p.focusArea}
            </div>
          )}
          {p.category && (
            <div>
              <span className="font-semibold text-app-ink">Danh mục:</span> {p.category}
            </div>
          )}
          {p.description && (
            <div>
              <span className="font-semibold text-app-ink">Mô tả:</span> {p.description}
            </div>
          )}
          {p.deadline && (
            <div>
              <span className="font-semibold text-app-ink">Thời hạn:</span> {p.deadline}
            </div>
          )}
        </div>
      );
    }

    case "suggest_feasibility_inputs": {
      const p = payload as { answers: Record<number, string> };
      const qLabels: Record<number, string> = {
        1: "Quỹ thời gian",
        2: "Năng lượng",
        3: "Nguồn lực/Kỹ năng",
        4: "Độ rõ mục tiêu",
        5: "Trở ngại lớn nhất",
        6: "Lịch cố định",
        7: "Độ tự tin",
      };
      return (
        <div className="mt-2 space-y-1 rounded bg-app-bg-subtle/60 dark:bg-white/5 p-2 text-xs text-app-ink-soft border border-app-line/40">
          <div className="font-semibold text-app-ink mb-1">Đề xuất câu trả lời khả thi:</div>
          {Object.entries(p.answers).map(([qId, val]) => (
            <div key={qId}>
              <span className="text-app-ink-soft">{qLabels[Number(qId)] || `Câu ${qId}`}:</span>{" "}
              <span className="font-medium text-gray-700">{val}</span>
            </div>
          ))}
        </div>
      );
    }

    case "create_twelve_week_plan_draft": {
      const p = payload as {
        week12Outcome?: string;
        lagMetricName?: string;
        lagMetricTarget?: string;
        lagMetricUnit?: string;
        startDate?: string;
        reviewDay?: string;
        tacticLoadPreference?: string;
        week4Milestone?: string;
        week8Milestone?: string;
        successEvidence?: string;
        leadIndicators?: Array<{ name: string; target: string; unit: string }>;
      };
      return (
        <div className="mt-2 space-y-1.5 rounded bg-app-bg-subtle/60 dark:bg-white/5 p-2 text-xs text-app-ink-soft border border-app-line/40">
          <div className="font-semibold text-app-ink mb-1">Bản nháp kế hoạch 12 tuần:</div>
          {p.week12Outcome && (
            <div>
              <span className="font-semibold text-app-ink">Mục tiêu 12 tuần:</span> {p.week12Outcome}
            </div>
          )}
          {p.lagMetricName && (
            <div>
              <span className="font-semibold text-app-ink">Chỉ số Lag:</span> {p.lagMetricName} (Mục tiêu:{" "}
              {p.lagMetricTarget} {p.lagMetricUnit})
            </div>
          )}
          {p.startDate && (
            <div>
              <span className="font-semibold text-app-ink">Ngày bắt đầu:</span> {p.startDate} (Review: {p.reviewDay})
            </div>
          )}
          {p.tacticLoadPreference && (
            <div>
              <span className="font-semibold text-app-ink">Mức tải:</span> {p.tacticLoadPreference}
            </div>
          )}
          {p.leadIndicators && p.leadIndicators.length > 0 && (
            <div className="mt-1 border-t border-app-line/40 pt-1">
              <span className="font-semibold text-app-ink block mb-0.5">Chỉ số Lead đề xuất:</span>
              <ul className="list-disc pl-4 space-y-0.5">
                {p.leadIndicators.map((li) => (
                  <li key={`${li.name}_${li.target}_${li.unit}`}>
                    {li.name} ({li.target} {li.unit})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }

    case "create_life_insight_note": {
      const p = payload as { title: string; content: string; mood?: string };
      return (
        <div className="mt-2 space-y-1 rounded bg-app-bg-subtle/60 dark:bg-white/5 p-2 text-xs text-app-ink-soft border border-app-line/40">
          <div>
            <span className="font-semibold text-app-ink">Tiêu đề:</span> {p.title}
          </div>
          {p.mood && (
            <div>
              <span className="font-semibold text-app-ink">Tâm trạng:</span> {p.mood}
            </div>
          )}
          <div className="line-clamp-3">
            <span className="font-semibold text-app-ink">Nội dung:</span> {p.content}
          </div>
        </div>
      );
    }

    case "add_weekly_review": {
      const p = payload as {
        weekNumber: number;
        mainObstacle?: string;
        nextWeekPriority?: string;
        reflection?: string;
      };
      return (
        <div className="mt-2 space-y-1 rounded bg-app-bg-subtle/60 dark:bg-white/5 p-2 text-xs text-app-ink-soft border border-app-line/40">
          <div>
            <span className="font-semibold text-app-ink">Review tuần:</span> {p.weekNumber}
          </div>
          {p.mainObstacle && (
            <div>
              <span className="font-semibold text-app-ink">Trở ngại chính:</span> {p.mainObstacle}
            </div>
          )}
          {p.nextWeekPriority && (
            <div>
              <span className="font-semibold text-app-ink">Ưu tiên tuần tới:</span> {p.nextWeekPriority}
            </div>
          )}
          {p.reflection && (
            <div className="line-clamp-2">
              <span className="font-semibold text-app-ink">Phản chiếu:</span> {p.reflection}
            </div>
          )}
        </div>
      );
    }

    case "reschedule_task": {
      const p = payload as { taskId: string; scheduledDate: string };
      return (
        <div className="mt-2 space-y-1 rounded bg-app-bg-subtle/60 dark:bg-white/5 p-2 text-xs text-app-ink-soft border border-app-line/40">
          <div>
            <span className="font-semibold text-app-ink">ID nhiệm vụ:</span> {p.taskId}
          </div>
          <div>
            <span className="font-semibold text-app-ink">Ngày dời lịch mới:</span> {p.scheduledDate}
          </div>
        </div>
      );
    }

    case "update_task_status": {
      const p = payload as { taskId: string; completed: boolean };
      return (
        <div className="mt-2 space-y-1 rounded bg-app-bg-subtle/60 dark:bg-white/5 p-2 text-xs text-app-ink-soft border border-app-line/40">
          <div>
            <span className="font-semibold text-app-ink">ID nhiệm vụ:</span> {p.taskId}
          </div>
          <div>
            <span className="font-semibold text-app-ink">Trạng thái mới:</span>{" "}
            {p.completed ? "Hoàn thành" : "Chưa hoàn thành"}
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}

export function AssistantActionCard({
  action,
  onExecute,
  onReject,
  status,
  errorMessage,
  verified,
  alreadyDone,
}: AssistantActionCardProps) {
  const handleClick = async () => {
    if (status === "executing" || status === "done") return;
    await onExecute(action);
  };

  const getDoneBadge = () => {
    if (alreadyDone) {
      return (
        <span className="rounded px-3 py-1.5 text-xs font-medium bg-amber-500/15 text-amber-700 dark:text-amber-300">
          Đã làm từ trước
        </span>
      );
    }
    if (verified) {
      return (
        <span className="rounded px-3 py-1.5 text-xs font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
          ✓ Đã xác nhận
        </span>
      );
    }
    if (verified === false) {
      return (
        <span className="rounded px-3 py-1.5 text-xs font-medium bg-red-500/15 text-red-600 dark:text-red-300">
          Chưa xác nhận
        </span>
      );
    }
    return (
      <span className="rounded px-3 py-1.5 text-xs font-medium bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
        Đã làm
      </span>
    );
  };

  return (
    <div className="mt-3 rounded-2xl border border-app-line/35 dark:border-white/10 bg-app-surface/60 backdrop-blur-sm p-3.5 shadow-sm hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.15)] transition-all duration-300">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 p-2 rounded-xl bg-app-bg-subtle/80 dark:bg-white/5 border border-app-line/35 dark:border-white/5 flex items-center justify-center shadow-sm backdrop-blur-sm">
          {getIconForAction(action.type)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-app-ink truncate">{action.label}</p>
          {renderActionPreview(action)}
          {status === "error" && errorMessage && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-300 font-medium">{errorMessage}</p>
          )}
        </div>
        {status === "pending" ? (
          <div className="flex gap-1.5 ml-2 shrink-0">
            <button
              type="button"
              onClick={() => onReject(action)}
              className="rounded-full border border-app-line dark:border-white/10 bg-app-surface/80 dark:bg-white/5 px-3 py-1.5 text-xs font-semibold text-app-ink-soft hover:bg-app-bg-subtle dark:hover:bg-white/10 transition-all active:scale-90"
            >
              Từ chối
            </button>
            <button
              type="button"
              onClick={handleClick}
              className="rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:shadow-[0_0_8px_rgba(16,185,129,0.3)] transition-all hover:scale-105 active:scale-90"
            >
              Đồng ý
            </button>
          </div>
        ) : status === "done" ? (
          <div className="ml-2 shrink-0">{getDoneBadge()}</div>
        ) : (
          <span
            className={`rounded px-2.5 py-1.5 text-xs font-semibold shrink-0 ${
              status === "rejected"
                ? "bg-app-bg-subtle text-app-ink-soft"
                : status === "error"
                  ? "bg-red-500/10 text-red-600 dark:text-red-300 border border-red-500/20"
                  : "bg-app-accent-soft text-app-accent"
            }`}
          >
            {status === "executing" && (
              <>
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-app-accent border-t-transparent align-middle mr-1.5" />
                Đang làm...
              </>
            )}
            {status === "rejected" && "Đã từ chối"}
            {status === "error" && "Lỗi"}
          </span>
        )}
      </div>
    </div>
  );
}
