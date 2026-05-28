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

export function NewUserSetupView({ userData, displayName, onContinue }: NewUserSetupViewProps) {
  const steps = buildSetupSteps(userData);
  const nextStep = steps.find((step) => !step.completed) ?? steps[steps.length - 1];

  return (
    <div className="space-y-6">
      {/* Greeting Banner */}
      <section className="relative overflow-hidden rounded-[14px] border border-app-line bg-app-accent-soft p-6 md:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-app-accent">Không gian mới</p>
        <h1 className="mt-4 max-w-3xl font-serif text-3xl font-medium leading-[1.2] tracking-tight text-app-ink sm:text-4xl">
          Chào {capitalizeVietnameseName(displayName)}, hãy bắt đầu chu kỳ 12 tuần đầu tiên.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-app-ink-soft">
          Trang chính sẽ sáng rõ và đầy ắp số liệu trực quan sau khi bạn hoàn thành một mục tiêu thật, một lịch biểu tuần và vài việc hôm nay.
        </p>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-app-line bg-app-surface px-3 py-1 text-xs font-bold text-app-accent">
          <Sparkles className="h-3.5 w-3.5 text-app-accent" />
          <span>Cần hướng dẫn 6 bước chi tiết?</span>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("visionboard:open-guide"))}
            className="ml-1 font-extrabold underline underline-offset-2 hover:underline transition-colors"
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
          {steps.map((step, index) => (
            <button
              key={step.title}
              type="button"
              onClick={() => onContinue(step.href)}
              className="flex text-left gap-4 rounded-[14px] border border-app-line bg-app-surface p-4 hover:bg-app-accent-soft transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                  step.completed
                    ? "bg-app-accent text-white"
                    : "bg-app-surface border border-app-line text-app-ink-muted"
                }`}
              >
                {step.completed ? <Check className="h-4 w-4" strokeWidth={3.5} /> : index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className={`text-sm font-bold ${step.completed ? "text-app-ink-muted line-through" : "text-app-ink"}`}>
                  {step.title}
                </h3>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-app-ink-muted">{step.description}</p>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
