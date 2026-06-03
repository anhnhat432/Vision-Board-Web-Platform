import { Calendar, CheckCircle2, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { formatDateInputValue } from "@/app/utils/storage-date-utils";
import { getArchetypeForIntent, getUserIntentId, hasActionableArchetypeHint } from "@/app/utils/user-intent";
import { buildLeadIndicatorSchedules } from "@/features/plan12week/pages/12WeekSetup/helpers";
import type { PendingFeasibilityResult, TwelveWeekSetupDraft } from "@/features/plan12week/pages/12WeekSetup/types";
import type { GoalArchetype, PendingSMARTGoal } from "@/lib/smart-goal";
import { isLowFeasibility } from "../logic/generatePlan";
import { getArchetypeFirstAction, getArchetypePlanFullDefaults } from "../logic/planArchetypeDefaults";
import { PlanPreviewLab } from "./PlanPreviewLab";

interface PlanPreviewStepLabProps {
  draft: TwelveWeekSetupDraft;
  smartGoal: PendingSMARTGoal;
  feasibility: PendingFeasibilityResult;
  focusArea: string;
  selectedTemplate: { id: string; name: string } | null;
  onBack?: () => void;
  onSubmit?: () => void;
  onChange?: <K extends keyof TwelveWeekSetupDraft>(key: K, value: TwelveWeekSetupDraft[K]) => void;
  validationMessage?: string | null;
  canConfirm?: boolean;
}

export function PlanPreviewStepLab({
  draft,
  smartGoal: _smartGoal,
  feasibility: _feasibility,
  focusArea: _focusArea,
  selectedTemplate: _selectedTemplate,
  onBack: _onBack,
  onSubmit: _onSubmit,
  onChange: _onChange,
  validationMessage,
  canConfirm = true,
}: PlanPreviewStepLabProps) {
  const archetype = useMemo((): GoalArchetype | null => {
    const intent = getUserIntentId();
    if (!intent || !hasActionableArchetypeHint(intent)) return null;
    return getArchetypeForIntent(intent);
  }, []);

  const previewPlan = useMemo(() => {
    const lowFeasibility = isLowFeasibility({
      planLoad: draft.tacticLoadPreference,
      weeklyCapacity: "medium",
      bottleneckAxis: _feasibility?.bottleneck?.axis,
    });

    const defaults = archetype ? getArchetypePlanFullDefaults(archetype) : null;
    const firstAction = archetype ? getArchetypeFirstAction(archetype, { lowFeasibility }) : null;

    const leadMetrics = draft.leadIndicators
      .filter((indicator) => indicator.name.trim() !== "")
      .map((indicator) => ({
        name: indicator.name,
        weeklyTarget: parseInt(indicator.target, 10) || 1,
      }));

    const weekStart = new Date();
    weekStart.setHours(0, 0, 0, 0);
    const planLoadOptions = {
      tacticLoadPreference: draft.tacticLoadPreference,
      dailyTimeBudget: draft.dailyTimeBudget,
      preferredDays: draft.preferredDays,
    };
    const scheduledIndicators = buildLeadIndicatorSchedules(draft.leadIndicators, planLoadOptions);

    const weekOneTasks: Array<{ id: string; title: string; scheduledDate: string; isCore: boolean }> = [];
    scheduledIndicators.forEach((indicator) => {
      indicator.schedule.forEach((dayOffset, taskIndex) => {
        const taskDate = new Date(weekStart);
        taskDate.setDate(weekStart.getDate() + dayOffset);
        const title = `${indicator.name} #${taskIndex + 1}`;
        weekOneTasks.push({
          id: `task_${indicator.id}_${Date.now()}_${dayOffset}`,
          title,
          scheduledDate: formatDateInputValue(taskDate),
          isCore: indicator.type === "core",
        });
      });
    });

    weekOneTasks.sort((a, b) => {
      if (a.isCore && !b.isCore) return -1;
      if (!a.isCore && b.isCore) return 1;
      return a.scheduledDate.localeCompare(b.scheduledDate);
    });

    const weeks = Array.from({ length: 12 }, (_, i) => {
      const weekNumber = i + 1;
      let focus = "";
      let expectedOutput = "";

      if (weekNumber === 1) {
        focus = defaults?.weekOneFocus || "";
        expectedOutput = defaults ? `${defaults.weekOneExpectedOutput}\n\nViệc đầu tiên: ${firstAction}` : "";
      } else if (weekNumber === 4) {
        expectedOutput = defaults?.milestoneTemplates.week4 || "";
      } else if (weekNumber === 8) {
        expectedOutput = defaults?.milestoneTemplates.week8 || "";
      } else if (weekNumber === 12) {
        expectedOutput = defaults?.milestoneTemplates.week12 || "";
      }

      return {
        weekNumber,
        focus,
        expectedOutput,
        leadMetrics,
        tasks: weekNumber === 1 ? weekOneTasks : [],
      };
    });

    return {
      vision: draft.vision12Week,
      weeks,
    };
  }, [
    draft.vision12Week,
    draft.leadIndicators,
    draft.preferredDays,
    draft.dailyTimeBudget,
    draft.tacticLoadPreference,
    archetype,
    _feasibility,
  ]);

  const firstTwoTasks = useMemo(() => {
    return draft.leadIndicators.filter((ind) => ind.name.trim().length > 0).slice(0, 2);
  }, [draft.leadIndicators]);

  return (
    <div className="space-y-6 select-none animate-in fade-in duration-300">
      {/* 📱 MOCKUP ĐIỆN THOẠI TODAY SIMULATION (Nhân vật chính tạo cảm hứng) */}
      <section className="mx-auto max-w-sm overflow-hidden rounded-[24px] border-[8px] border-app-ink bg-app-bg p-[3px] shadow-app-lg motion-safe:animate-in motion-safe:slide-in-from-bottom-5 duration-500 relative group">
        {/* Notch giả lập iPhone */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-4.5 bg-app-ink rounded-b-xl z-20 flex items-center justify-around px-2 text-[10px] text-app-surface/50 font-bold select-none">
          <span>09:41</span>
          <div className="w-2.5 h-2.5 bg-app-surface rounded-full border border-app-line/20" />
          <span>🔋 100%</span>
        </div>

        {/* Nội dung màn hình giả lập */}
        <div className="rounded-[18px] bg-app-bg-subtle p-5 pt-8 min-h-[360px] text-xs text-app-ink relative z-10 flex flex-col justify-between">
          <div className="space-y-4">
            {/* Header giả lập */}
            <div className="flex items-center justify-between border-b border-app-line/40 pb-2.5 pt-1">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-app-accent">Hôm nay · Today</p>
                <h5 className="font-serif text-base font-semibold text-app-ink">Ngày khởi động 🚀</h5>
              </div>
              <Sparkles className="h-5 w-5 text-app-accent animate-pulse" />
            </div>

            {/* Đích đến 12 tuần mini */}
            <div className="rounded-card bg-app-surface p-3 shadow-app-sm border border-app-line/60">
              <span className="text-[10px] font-bold text-app-accent uppercase tracking-wider">
                🏆 Đích đến Tuần 12 của bạn
              </span>
              <p className="mt-0.5 text-xs font-semibold text-app-ink leading-relaxed line-clamp-2 italic">
                “{draft.week12Outcome || "Kế hoạch 12 tuần mơ ước…"}”
              </p>
            </div>

            {/* Checklist giả lập */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-app-ink-muted">
                Nhiệm vụ cần check-in hôm nay:
              </p>

              {firstTwoTasks.length > 0 ? (
                firstTwoTasks.map((tactic) => (
                  <div
                    key={tactic.id}
                    className="w-full rounded-card border border-app-line bg-app-surface hover:bg-app-accent-subtle/30 p-3 flex items-center justify-between shadow-app-sm transition-all duration-200 text-left hover:border-app-accent/20"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-semibold text-app-ink leading-normal truncate">{tactic.name}</p>
                      <p className="text-[10px] text-app-ink-soft mt-0.5 font-medium">
                        Mục tiêu: {tactic.target} {tactic.unit}
                      </p>
                    </div>
                    <CheckCircle2 className="h-5 w-5 text-app-line-strong shrink-0 hover:text-app-accent hover:scale-105 transition-all" />
                  </div>
                ))
              ) : (
                <div className="rounded-card border border-dashed border-app-line p-4 text-center text-app-ink-muted">
                  Chưa có hành động lặp lại
                </div>
              )}
            </div>

            {/* Thanh tiến độ */}
            <div className="space-y-1.5 pt-1.5">
              <div className="flex justify-between text-[10px] font-bold text-app-ink-muted">
                <span>TIẾN ĐỘ TUẦN 1</span>
                <span>0% / 100%</span>
              </div>
              <div className="w-full bg-app-accent-soft h-2 rounded-pill overflow-hidden">
                <div className="bg-app-accent w-1/12 h-full rounded-pill animate-pulse" />
              </div>
            </div>
          </div>

          {/* Footer mockup */}
          <div className="border-t border-app-line/40 pt-3 flex items-center justify-between text-[10px] font-bold text-app-ink-muted uppercase">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5 text-app-accent" /> Tuần 1 / 12
            </span>
            <span className="text-app-accent">Nhịp thực thi: 100% 🔥</span>
          </div>
        </div>
      </section>

      {/* Chữ truyền cảm hứng */}
      <div className="text-center max-w-md mx-auto space-y-1.5">
        <h4 className="font-serif text-lg font-semibold text-app-ink leading-snug">
          Giao diện check-in Today của bạn đã sẵn sàng!
        </h4>
        <p className="text-xs text-app-ink-soft leading-relaxed font-medium">
          Giao diện mockup trên điện thoại mô phỏng chính xác những gì bạn sẽ trải nghiệm hằng ngày. Bấm Kích hoạt ở
          dưới để bắt đầu tuần đầu tiên rực rỡ nhé!
        </p>
      </div>

      {/* 🗺️ BẢN ĐỒ CHI TIẾT 12 TUẦN (Mở rộng/Xem thêm ở dưới) */}
      <div className="border-t border-app-line/60 pt-6">
        <PlanPreviewLab draft={draft} previewPlan={previewPlan} />
      </div>

      {validationMessage ? (
        <p
          role="alert"
          className="rounded-card border border-app-status-error/30 bg-app-status-error/5 px-3.5 py-2.5 text-xs font-semibold text-app-status-error"
        >
          {validationMessage}
        </p>
      ) : null}
      {!canConfirm && !validationMessage ? (
        <p className="rounded-card border border-app-line bg-app-bg-subtle px-3.5 py-2.5 text-xs text-app-ink-soft font-medium">
          Kiểm tra lại các bước trước khi lưu kế hoạch.
        </p>
      ) : null}
    </div>
  );
}
