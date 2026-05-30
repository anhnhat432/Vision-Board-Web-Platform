import { Check, Sparkles, BookOpen } from "lucide-react";

import { hasScoredLifeBalance } from "@/app/utils/core-flow-guard";
import { APP_STORAGE_KEYS, type UserData } from "@/app/utils/storage";
import { capitalizeVietnameseName } from "@/app/utils/text";

interface NewUserSetupViewProps {
  userData: UserData;
  displayName: string;
  onContinue: (href: string) => void;
}

interface SetupStep {
  title: string;
  description: string;
  completed: boolean;
  href: string;
}

function hasLocalDraft(key: string): boolean {
  if (typeof window === "undefined") return false;
  const value = window.localStorage.getItem(key);
  return value !== null && value.trim().length > 0;
}

function buildSetupSteps(userData: UserData): SetupStep[] {
  const hasLifeBalance = hasScoredLifeBalance(userData);
  const hasAnyGoal = userData.goals.length > 0;
  const hasInsight = hasLifeBalance && (hasAnyGoal || hasLocalDraft(APP_STORAGE_KEYS.selectedFocusArea));
  const hasSmartGoal = hasInsight && (hasAnyGoal || hasLocalDraft(APP_STORAGE_KEYS.pendingSmartGoal));
  const hasGoalWithFeasibility = userData.goals.some(
    (goal) => Boolean(goal.feasibilityResult) || typeof goal.readinessScore === "number",
  );
  const hasFeasibility =
    hasSmartGoal && (hasGoalWithFeasibility || hasLocalDraft(APP_STORAGE_KEYS.pendingFeasibilityResult));

  return [
    {
      title: "Cân bằng cuộc sống",
      description: "Chấm điểm 8 lĩnh vực cuộc sống để tìm ra nơi lệch nhịp cần ưu tiên nhất.",
      completed: hasLifeBalance,
      href: "/onboarding",
    },
    {
      title: "Trọng tâm chu kỳ",
      description: "Chọn duy nhất một lĩnh vực cốt lõi để tập trung thay đổi trong 12 tuần tới.",
      completed: hasInsight,
      href: hasLifeBalance ? "/life-insight" : "/onboarding",
    },
    {
      title: "Mục tiêu SMART",
      description: "Đóng gói ý định thành mục tiêu SMART rõ nét kết quả, thời gian và lý do.",
      completed: hasSmartGoal,
      href: hasInsight ? "/smart-goal-setup" : "/life-insight",
    },
    {
      title: "Kế hoạch 12 tuần",
      description: "Xây dựng các tactics việc lặp lại, mốc checkpoint tuần và ngày khóa review.",
      completed: false,
      href: hasFeasibility ? "/12-week-setup" : hasSmartGoal ? "/feasibility" : "/smart-goal-setup",
    },
  ];
}

interface CardStepTheme {
  border: string;
  hoverBg: string;
  iconBgPending: string;
  iconTextPending: string;
  badgeText: string;
  badgeBg: string;
}

const getStepTheme = (index: number): CardStepTheme => {
  const stepsMetadata = [
    { label: "Nhìn nhận", step: 1 },
    { label: "Định vị", step: 2 },
    { label: "Thiết lập", step: 3 },
    { label: "Hành động", step: 4 },
  ];
  const meta = stepsMetadata[index] || { label: "Hành động", step: index + 1 };
  
  return {
    border: "border-app-line/80 dark:border-neutral-800/30",
    hoverBg: "hover:bg-app-bg-subtle/30 hover:border-app-line dark:hover:bg-neutral-900/10",
    iconBgPending: "bg-app-bg-subtle dark:bg-neutral-900/40",
    iconTextPending: "text-app-ink-muted",
    badgeText: `Bước ${meta.step} · ${meta.label}`,
    badgeBg: "bg-app-bg-subtle text-app-ink-soft dark:bg-neutral-900/40 dark:text-neutral-400",
  };
};

export function NewUserSetupView({ userData, displayName, onContinue }: NewUserSetupViewProps) {
  const steps = buildSetupSteps(userData);
  const nextStep = steps.find((step) => !step.completed) ?? steps[steps.length - 1];

  return (
    <div className="space-y-6">
      {/* Greeting Banner */}
      <section className="relative overflow-hidden rounded-[14px] border border-app-line bg-gradient-to-br from-app-accent-soft/40 via-app-surface/90 to-app-accent-soft/20 p-6 md:p-8 shadow-sm backdrop-blur-sm">
        {/* Background blur blobs for depth */}
        <div aria-hidden="true" className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-app-accent/5 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute right-1/4 bottom-0 h-32 w-32 rounded-full bg-app-accent/5 blur-2xl" />

        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-app-accent/80">Không gian của bạn</p>
        <h1 className="mt-4 max-w-3xl font-serif text-3xl font-medium leading-tight tracking-tight text-app-ink sm:text-4xl">
          Chào {capitalizeVietnameseName(displayName)}, hãy khởi động chu kỳ 12 tuần đầu tiên.
        </h1>
        <p className="mt-3 max-w-2xl text-sm font-normal leading-relaxed text-app-ink-soft/90">
          Không gian làm việc của bạn sẽ tự động kích hoạt đầy đủ các bảng dữ liệu trực quan ngay sau khi bạn hoàn thành việc thiết lập mục tiêu và kế hoạch hành động.
        </p>
        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-app-line/80 bg-app-surface px-3 py-1 text-xs font-medium text-app-accent shadow-sm">
          <Sparkles className="h-3.5 w-3.5 text-app-accent/80" />
          <span>Bạn cần hướng dẫn chi tiết?</span>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("visionboard:open-guide"))}
            className="ml-1 font-semibold underline underline-offset-2 hover:text-app-accent-hover transition-colors"
          >
            Xem tài liệu hướng dẫn →
          </button>
        </div>
      </section>

      {/* Setup Steps Panel V2 */}
      <section
        data-testid="fresh-workspace-empty-state"
        className="surface-empty rounded-[14px] border border-app-line bg-app-surface p-5 md:p-6"
        aria-labelledby="dashboard-new-user-title"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-app-line pb-4 mb-6">
          <div>
            <h2 id="dashboard-new-user-title" className="text-base font-bold text-app-ink flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-app-accent" />
              Thiết lập chu kỳ đầu tiên
            </h2>
            <p className="text-xs font-semibold text-app-ink-muted mt-0.5">
              Hãy đi qua 4 bước hành động cốt lõi này để khởi động chu kỳ của bạn.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onContinue(nextStep.href)}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-app-accent px-5 py-2 text-xs font-medium text-white transition-all duration-medium hover:bg-app-accent-hover hover:shadow-sm"
          >
            Tiếp tục thiết lập →
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {steps.map((step, index) => {
            const theme = getStepTheme(index);
            const isNextStep = step.title === nextStep.title;
            return (
              <button
                key={step.title}
                type="button"
                onClick={() => onContinue(step.href)}
                className={`flex text-left gap-4 rounded-[14px] border p-4 transition-all duration-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 ${
                  step.completed
                    ? "border-app-line bg-app-surface/30 opacity-70 hover:opacity-90 hover:bg-app-bg-subtle/20"
                    : isNextStep
                    ? `bg-app-surface shadow-sm border-app-accent/50 hover:shadow-md hover:border-app-accent`
                    : `bg-app-surface shadow-sm ${theme.border} ${theme.hoverBg}`
                }`}
              >
                <div className="relative shrink-0">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-extrabold transition-all duration-300 ${
                      step.completed
                        ? "bg-app-accent text-white shadow-sm"
                        : isNextStep
                        ? "bg-app-accent text-white shadow-sm"
                        : `${theme.iconBgPending} border border-app-line/45 ${theme.iconTextPending}`
                    }`}
                  >
                    {step.completed ? <Check className="h-4.5 w-4.5" strokeWidth={3.5} /> : index + 1}
                  </span>
                  {step.completed && (
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-app-accent text-[8px] font-bold text-white ring-2 ring-white select-none">
                      ✓
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h3 className={`text-sm font-bold ${step.completed ? "text-app-ink-muted line-through" : "text-app-ink"}`}>
                      {step.title}
                    </h3>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold tracking-wide ${theme.badgeBg}`}>
                      {theme.badgeText}
                    </span>
                    {isNextStep && !step.completed && (
                      <span className="inline-block rounded-full bg-app-accent px-2 py-0.5 text-[9px] font-semibold text-white uppercase tracking-wider">
                        Đề xuất làm tiếp
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-app-ink-muted">{step.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
