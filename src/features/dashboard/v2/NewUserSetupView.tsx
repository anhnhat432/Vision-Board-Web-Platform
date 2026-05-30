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
  switch (index) {
    case 0: // Cân bằng cuộc sống
      return {
        border: "border-emerald-100 dark:border-emerald-950/30",
        hoverBg: "hover:bg-emerald-50/50 hover:border-emerald-300 dark:hover:bg-emerald-950/10",
        iconBgPending: "bg-emerald-100/60 dark:bg-emerald-950/40",
        iconTextPending: "text-emerald-700 dark:text-emerald-400",
        badgeText: "Bước 1 · Nhìn nhận",
        badgeBg: "bg-emerald-100/70 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
      };
    case 1: // Trọng tâm chu kỳ
      return {
        border: "border-blue-100 dark:border-blue-950/30",
        hoverBg: "hover:bg-blue-50/50 hover:border-blue-300 dark:hover:bg-blue-950/10",
        iconBgPending: "bg-blue-100/60 dark:bg-blue-950/40",
        iconTextPending: "text-blue-700 dark:text-blue-400",
        badgeText: "Bước 2 · Định vị",
        badgeBg: "bg-blue-100/70 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
      };
    case 2: // Mục tiêu SMART
      return {
        border: "border-amber-100 dark:border-amber-950/30",
        hoverBg: "hover:bg-amber-50/50 hover:border-amber-300 dark:hover:bg-amber-950/10",
        iconBgPending: "bg-amber-100/60 dark:bg-amber-950/40",
        iconTextPending: "text-amber-700 dark:text-amber-400",
        badgeText: "Bước 3 · Thiết lập",
        badgeBg: "bg-amber-100/70 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
      };
    default: // Kế hoạch 12 tuần
      return {
        border: "border-indigo-100 dark:border-indigo-950/30",
        hoverBg: "hover:bg-indigo-50/50 hover:border-indigo-300 dark:hover:bg-indigo-950/10",
        iconBgPending: "bg-indigo-100/60 dark:bg-indigo-950/40",
        iconTextPending: "text-indigo-700 dark:text-indigo-400",
        badgeText: "Bước 4 · Hành động",
        badgeBg: "bg-indigo-100/70 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400",
      };
  }
};

export function NewUserSetupView({ userData, displayName, onContinue }: NewUserSetupViewProps) {
  const steps = buildSetupSteps(userData);
  const nextStep = steps.find((step) => !step.completed) ?? steps[steps.length - 1];

  return (
    <div className="space-y-6">
      {/* Greeting Banner */}
      <section className="relative overflow-hidden rounded-[14px] border border-app-line bg-gradient-to-br from-app-accent-soft/40 via-app-surface/90 to-app-accent-soft/20 p-6 md:p-8 shadow-app-md backdrop-blur-sm">
        {/* Các sticker trang trí bay bổng */}
        <div className="absolute top-4 right-12 text-2xl animate-[float_4s_ease-in-out_infinite] opacity-50">🌟</div>
        <div className="absolute bottom-4 right-6 text-3xl animate-[float_5s_ease-in-out_infinite] opacity-40 delay-500">🌱</div>
        <div className="absolute top-1/3 right-1/4 text-2xl animate-[float_6s_ease-in-out_infinite] opacity-30 delay-1000">🚀</div>

        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-app-accent">Không gian của bạn</p>
        <h1 className="mt-4 max-w-3xl font-serif text-3xl font-medium leading-[1.25] tracking-tight text-app-ink sm:text-4xl">
          Chào {capitalizeVietnameseName(displayName)}, hãy bắt đầu chu kỳ 12 tuần đầu tiên ✨
        </h1>
        <p className="mt-3 max-w-2xl text-xs font-semibold leading-relaxed text-app-ink-soft">
          Trang chính sẽ sáng rõ và đầy ắp số liệu trực quan sau khi bạn hoàn thành một mục tiêu thật, một lịch biểu tuần và vài việc hôm nay.
        </p>
        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-app-line bg-app-surface px-3 py-1 text-xs font-bold text-app-accent shadow-sm">
          <Sparkles className="h-3.5 w-3.5 text-app-accent" />
          <span>Cần hướng dẫn 6 bước chi tiết?</span>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("visionboard:open-guide"))}
            className="ml-1 font-bold underline underline-offset-2 hover:text-app-accent-hover transition-colors"
          >
            Mở ngay →
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
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-app-accent px-5 py-2 text-xs font-bold text-white transition-colors duration-150 hover:bg-app-accent/90"
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
                className={`flex text-left gap-4 rounded-[14px] border p-4 transition-all duration-300 active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 ${
                  step.completed
                    ? "border-app-line bg-app-surface/50 opacity-75 hover:bg-app-accent-soft/30 hover:opacity-90"
                    : isNextStep
                    ? `bg-app-surface shadow-md border-app-accent/60 ring-1 ring-app-accent/15 scale-[1.01] hover:scale-[1.02] hover:shadow-lg hover:border-app-accent`
                    : `bg-app-surface shadow-sm ${theme.border} ${theme.hoverBg}`
                }`}
              >
                <div className="relative shrink-0">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-extrabold transition-all duration-300 ${
                      step.completed
                        ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/20"
                        : isNextStep
                        ? "bg-app-accent text-white shadow-md shadow-app-accent/20 animate-pulse"
                        : `${theme.iconBgPending} border border-transparent ${theme.iconTextPending}`
                    }`}
                  >
                    {step.completed ? <Check className="h-4.5 w-4.5" strokeWidth={3.5} /> : index + 1}
                  </span>
                  {step.completed && (
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-600 text-[8px] font-bold text-white ring-2 ring-white select-none">
                      ✓
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h3 className={`text-sm font-bold ${step.completed ? "text-app-ink-muted line-through" : "text-app-ink"}`}>
                      {step.title}
                    </h3>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-extrabold tracking-wide ${theme.badgeBg}`}>
                      {theme.badgeText}
                    </span>
                    {isNextStep && !step.completed && (
                      <span className="inline-block rounded-full bg-app-accent px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
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
