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
  const stepsMeta = [
    { badgeText: "Khám phá bản thân", stage: "Nhìn nhận" },
    { badgeText: "Tìm kiếm điểm cốt lõi", stage: "Định vị" },
    { badgeText: "Đóng gói ý chí", stage: "Thiết lập" },
    { badgeText: "Hành trình thực thi", stage: "Hành động" }
  ];
  const meta = stepsMeta[index] || { badgeText: "Hành động", stage: "Thiết lập" };

  return {
    border: "border-app-line/60",
    hoverBg: "hover:bg-neutral-50/40 dark:hover:bg-neutral-900/30 hover:border-app-accent/30",
    iconBgPending: "bg-neutral-100 dark:bg-neutral-900",
    iconTextPending: "text-app-ink-soft",
    badgeText: `Bước ${index + 1} · ${meta.stage}`,
    badgeBg: "bg-neutral-100 dark:bg-neutral-900 text-app-ink-soft",
  };
};

export function NewUserSetupView({ userData, displayName, onContinue }: NewUserSetupViewProps) {
  const steps = buildSetupSteps(userData);
  const nextStep = steps.find((step) => !step.completed) ?? steps[steps.length - 1];

  return (
    <div className="space-y-8">
      {/* Editorial Greeting Banner */}
      <section className="relative overflow-hidden rounded-2xl border border-app-line/80 bg-gradient-to-br from-emerald-50/40 via-white to-emerald-50/10 dark:from-emerald-950/15 dark:via-neutral-900/40 dark:to-neutral-950 p-6 md:p-10 shadow-[0_12px_36px_rgba(47,93,80,0.02)] backdrop-blur-sm">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-app-accent/5 blur-[80px]" />
        <div className="relative z-10 space-y-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-app-accent">Bảng điều khiển của bạn</span>
          <h1 className="max-w-3xl font-serif text-3xl font-normal leading-[1.2] tracking-normal text-app-ink sm:text-[2.5rem]">
            Chào {capitalizeVietnameseName(displayName)}, hãy bắt đầu chu kỳ 12 tuần đầu tiên
          </h1>
          <p className="max-w-2xl text-xs font-normal leading-relaxed text-app-ink-soft/90">
            Dear Our Future sẽ giúp bạn chuyển dịch từ những mong muốn mơ hồ thành hành động cụ thể mỗi ngày. Hãy đi qua các bước thiết lập dưới đây để thắp sáng bản đồ mục tiêu của bạn.
          </p>
          <div className="pt-2 flex items-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-app-line/60 bg-white/80 dark:bg-neutral-900/80 px-3.5 py-1 text-[11px] font-medium text-app-ink-soft shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-app-accent" />
              <span>Cần xem tài liệu hướng dẫn nhanh?</span>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event("visionboard:open-guide"))}
                className="ml-1 font-bold text-app-accent hover:text-app-accent-hover underline underline-offset-2 transition-colors"
              >
                Mở cẩm nang →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Setup Steps Panel V2 */}
      <section
        data-testid="fresh-workspace-empty-state"
        className="rounded-2xl border border-app-line/80 bg-white/40 dark:bg-neutral-900/10 backdrop-blur-sm p-6 md:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.01)]"
        aria-labelledby="dashboard-new-user-title"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-app-line/65 pb-6 mb-6">
          <div className="space-y-1">
            <h2 id="dashboard-new-user-title" className="text-base font-bold text-app-ink flex items-center gap-2.5">
              <BookOpen className="h-4.5 w-4.5 text-app-accent" />
              Bản đồ thiết lập chu kỳ
            </h2>
            <p className="text-xs font-medium text-app-ink-soft">
              Đi qua 4 bước hành trình cốt lõi để chuẩn hóa mục tiêu và lên kế hoạch thực thi 12 tuần.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onContinue(nextStep.href)}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-app-accent px-5 py-2.5 text-xs font-semibold text-white transition-all duration-200 hover:bg-app-accent-hover shadow-sm hover:-translate-y-px active:translate-y-0"
          >
            Tiếp tục thiết lập
          </button>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {steps.map((step, index) => {
            const theme = getStepTheme(index);
            const isNextStep = step.title === nextStep.title;
            return (
              <button
                key={step.title}
                type="button"
                onClick={() => onContinue(step.href)}
                className={`flex text-left gap-4 rounded-xl border p-5 transition-all duration-300 active:scale-[0.99] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 ${
                  step.completed
                    ? "border-app-line bg-neutral-50/20 dark:bg-neutral-900/5 opacity-60 hover:opacity-85 hover:border-app-line/80"
                    : isNextStep
                    ? "bg-white dark:bg-neutral-900 border-app-accent/50 shadow-[0_8px_24px_-6px_rgba(47,93,80,0.06)] ring-1 ring-app-accent/10 hover:border-app-accent hover:shadow-[0_12px_28px_-6px_rgba(47,93,80,0.08)]"
                    : `bg-white/40 dark:bg-neutral-950/20 ${theme.border} ${theme.hoverBg}`
                }`}
              >
                <div className="relative shrink-0">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                      step.completed
                        ? "bg-app-accent text-white shadow-sm"
                        : isNextStep
                        ? "border border-app-accent bg-app-accent-soft text-app-accent font-semibold"
                        : `border border-app-line bg-white dark:bg-neutral-900 text-app-ink-soft`
                    }`}
                  >
                    {step.completed ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : index + 1}
                  </span>
                </div>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h3 className={`text-sm font-bold ${step.completed ? "text-app-ink-muted line-through opacity-80" : "text-app-ink"}`}>
                      {step.title}
                    </h3>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-medium tracking-wide ${
                      isNextStep && !step.completed ? "bg-app-accent/10 text-app-accent" : "bg-neutral-100 dark:bg-neutral-800 text-app-ink-soft"
                    }`}>
                      {theme.badgeText}
                    </span>
                    {isNextStep && !step.completed && (
                      <span className="inline-block rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                        Đề xuất
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium leading-relaxed text-app-ink-soft">{step.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
