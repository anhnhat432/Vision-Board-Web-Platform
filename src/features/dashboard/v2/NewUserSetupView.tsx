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
        border: "border-app-line/65",
        hoverBg: "hover:bg-app-bg/40 hover:border-app-accent/30",
        iconBgPending: "bg-app-accent-soft/30",
        iconTextPending: "text-app-accent",
        badgeText: "Bước 1 · Nhìn nhận",
        badgeBg: "bg-app-accent-soft/40 text-app-accent",
      };
    case 1: // Trọng tâm chu kỳ
      return {
        border: "border-app-line/65",
        hoverBg: "hover:bg-app-bg/40 hover:border-app-accent/30",
        iconBgPending: "bg-app-accent-soft/30",
        iconTextPending: "text-app-accent",
        badgeText: "Bước 2 · Định vị",
        badgeBg: "bg-app-accent-soft/40 text-app-accent",
      };
    case 2: // Mục tiêu SMART
      return {
        border: "border-app-line/65",
        hoverBg: "hover:bg-app-bg/40 hover:border-app-accent/30",
        iconBgPending: "bg-app-accent-soft/30",
        iconTextPending: "text-app-accent",
        badgeText: "Bước 3 · Thiết lập",
        badgeBg: "bg-app-accent-soft/40 text-app-accent",
      };
    default: // Kế hoạch 12 tuần
      return {
        border: "border-app-line/65",
        hoverBg: "hover:bg-app-bg/40 hover:border-app-accent/30",
        iconBgPending: "bg-app-accent-soft/30",
        iconTextPending: "text-app-accent",
        badgeText: "Bước 4 · Hành động",
        badgeBg: "bg-app-accent-soft/40 text-app-accent",
      };
  }
};

export function NewUserSetupView({ userData, displayName, onContinue }: NewUserSetupViewProps) {
  const steps = buildSetupSteps(userData);
  const nextStep = steps.find((step) => !step.completed) ?? steps[steps.length - 1];

  return (
    <div className="space-y-6">
      {/* Greeting Banner */}
      <section className="relative overflow-hidden rounded-[18px] border border-app-line bg-gradient-to-br from-app-accent-soft/20 via-app-surface to-app-accent-soft/5 p-6 md:p-8 shadow-[0_8px_24px_-10px_rgba(47,93,80,0.03)] backdrop-blur-sm">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-app-accent/80">Không gian của bạn</p>
        <h1 className="mt-4 max-w-3xl font-serif text-3xl font-normal leading-[1.3] tracking-normal text-app-ink sm:text-[2.25rem]">
          Chào {capitalizeVietnameseName(displayName)}, hãy bắt đầu chu kỳ 12 tuần đầu tiên
        </h1>
        <p className="mt-3.5 max-w-2xl text-xs font-medium leading-relaxed text-app-ink-soft/90">
          Trang chính sẽ sáng rõ và đầy ắp số liệu trực quan sau khi bạn hoàn thành một mục tiêu thật, một lịch biểu tuần và vài việc hôm nay.
        </p>
        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-app-line/60 bg-app-surface px-3.5 py-1 text-[11px] font-medium text-app-ink-soft shadow-sm">
          <Sparkles className="h-3.5 w-3.5 text-app-accent/80" />
          <span>Cần hướng dẫn 6 bước chi tiết?</span>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("visionboard:open-guide"))}
            className="ml-1 font-bold text-app-accent hover:text-app-accent-hover underline underline-offset-2 transition-colors"
          >
            Mở ngay →
          </button>
        </div>
      </section>


      {/* Setup Steps Panel V2 */}
      <section
        data-testid="fresh-workspace-empty-state"
        className="surface-empty rounded-[18px] border border-app-line bg-app-surface p-5 md:p-6"
        aria-labelledby="dashboard-new-user-title"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-app-line pb-4 mb-6">
          <div>
            <h2 id="dashboard-new-user-title" className="text-base font-bold text-app-ink flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-app-accent/80" />
              Thiết lập chu kỳ đầu tiên
            </h2>
            <p className="text-xs font-medium text-app-ink-muted mt-0.5">
              Hãy đi qua 4 bước hành động cốt lõi này để khởi động chu kỳ của bạn.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onContinue(nextStep.href)}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-app-accent px-4 py-2 text-xs font-medium text-white transition-all duration-150 hover:bg-app-accent-hover shadow-sm"
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
                className={`flex text-left gap-4 rounded-[16px] border p-5 transition-all duration-300 active:scale-[0.99] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 ${
                  step.completed
                    ? "border-app-line bg-app-surface/40 opacity-70 hover:opacity-90 hover:border-app-accent/35"
                    : isNextStep
                    ? "bg-app-surface shadow-[0_6px_20px_-4px_rgba(47,93,80,0.04)] border-app-accent/60 ring-1 ring-app-accent/10 hover:border-app-accent hover:shadow-[0_8px_24px_-4px_rgba(47,93,80,0.06)]"
                    : `bg-app-surface shadow-[0_4px_16px_rgba(0,0,0,0.01)] ${theme.border} ${theme.hoverBg}`
                }`}
              >
                <div className="relative shrink-0">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold transition-all duration-300 ${
                      step.completed
                        ? "bg-app-accent text-white shadow-sm"
                        : isNextStep
                        ? "bg-app-accent text-white shadow-sm"
                        : `${theme.iconBgPending} border border-transparent ${theme.iconTextPending}`
                    }`}
                  >
                    {step.completed ? <Check className="h-4 w-4" strokeWidth={3} /> : index + 1}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h3 className={`text-sm font-bold ${step.completed ? "text-app-ink-muted line-through opacity-85" : "text-app-ink"}`}>
                      {step.title}
                    </h3>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide ${theme.badgeBg}`}>
                      {theme.badgeText}
                    </span>
                    {isNextStep && !step.completed && (
                      <span className="inline-block rounded-full bg-app-accent px-2 py-0.5 text-[9px] font-bold text-white uppercase tracking-wider">
                        Đề xuất
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs font-medium leading-relaxed text-app-ink-muted">{step.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
