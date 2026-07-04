import { getLifeAreaLabel } from "../../../utils/storage";
import type { SMARTData } from "../types";

interface SmartGoalHeroProps {
  focusArea: string;
  smartData: SMARTData;
  currentStep: number;
  completedCount: number;
  totalSteps: number;
  progressPercentage: number;
}

export function SmartGoalHero({
  focusArea,
  smartData,
  currentStep,
  completedCount,
  totalSteps,
  progressPercentage,
}: SmartGoalHeroProps) {
  const focusAreaLabel = getLifeAreaLabel(focusArea);
  const headerTitle = currentStep > 0 ? `Đang hoàn thiện mục tiêu ${focusAreaLabel}` : `Viết mục tiêu cho ${focusAreaLabel}`;
  const draftTitle = smartData.specific.goal_statement.trim();
  const nextFocus = [
    { done: draftTitle.length > 0, label: "kết quả" },
    { done: smartData.measurable.target_value.trim().length > 0, label: "chỉ số" },
    { done: smartData.achievable.weekly_time_commitment_hours.trim().length > 0, label: "thời gian" },
    { done: smartData.relevant.motivation_reason.trim().length > 0, label: "lý do" },
    {
      done:
        smartData.timeBound.mode === "date"
          ? smartData.timeBound.target_date.trim().length > 0
          : smartData.timeBound.target_weeks.trim().length > 0,
      label: "deadline",
    },
  ].find((item) => !item.done)?.label;

  return (
    <section
      aria-labelledby="smart-goal-setup-title"
      className="overflow-hidden rounded-[30px] border border-app-line bg-[linear-gradient(135deg,var(--app-surface)_0%,var(--app-bg-subtle)_100%)] px-4 py-4 shadow-[0_22px_70px_-58px_rgba(23,21,15,0.45)] backdrop-blur sm:px-5 sm:py-5"
      data-testid="smart-goal-hero-section"
    >
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(260px,0.36fr)] lg:items-end">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2" data-testid="smart-goal-handoff-card">
            <span className="inline-flex items-center rounded-full border border-app-accent/15 bg-app-accent-subtle px-3 py-1 text-xs font-extrabold text-app-accent">
              SMART 12 tuần
            </span>
            <span className="inline-flex items-center rounded-full border border-app-line bg-app-surface/70 px-3 py-1 text-xs font-semibold text-app-ink-soft">
              {currentStep + 1}/{totalSteps} đang làm
            </span>
          </div>

          <div className="mt-3">
            <h1
              id="smart-goal-setup-title"
              className="text-[clamp(25px,4vw,40px)] font-extrabold leading-[1.02] tracking-[-0.04em] text-app-ink"
              style={{ fontFamily: "'Bricolage Grotesque', serif" }}
            >
              {headerTitle}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-app-ink-soft sm:text-[15px]">
              Một bước một câu hỏi. Cứ viết bản nháp trước, phần rõ ràng sẽ hiện bên cạnh.
            </p>
          </div>

          {draftTitle ? (
            <p className="mt-3 max-w-3xl rounded-[18px] border border-app-line bg-app-surface/70 px-3.5 py-2.5 text-sm leading-6 text-app-ink-soft">
              <span className="font-semibold text-app-ink">Bản nháp: </span>
              <span className="break-words">{draftTitle}</span>
            </p>
          ) : null}
        </div>

        <div className="rounded-[22px] border border-app-line bg-app-surface/75 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs font-extrabold text-app-ink-muted">Độ rõ</span>
            <span className="text-base font-extrabold text-app-ink">{completedCount}/{totalSteps}</span>
          </div>
          <div
            role="progressbar"
            aria-label={`Tiến độ làm rõ mục tiêu: ${completedCount} trên ${totalSteps} phần`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progressPercentage)}
            className="mt-3 h-3 overflow-hidden rounded-full bg-app-line"
          >
            <span
              className="block h-full rounded-full bg-app-accent transition-[width] duration-500 motion-reduce:transition-none"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <p className="mt-3 text-xs font-semibold leading-5 text-app-ink-soft">
            {nextFocus ? `Tiếp theo: làm rõ ${nextFocus}.` : "Đã đủ dữ liệu để chọn bước tiếp theo."}
          </p>
        </div>
      </div>
    </section>
  );
}
