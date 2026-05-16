import { Check } from "lucide-react";

import { APP_STORAGE_KEYS, type UserData } from "@/app/utils/storage";
import { hasScoredLifeBalance } from "@/app/utils/core-flow-guard";

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
  const hasGoalWithFeasibility = userData.goals.some((goal) => Boolean(goal.feasibilityResult) || typeof goal.readinessScore === "number");
  const hasFeasibility = hasSmartGoal && (hasGoalWithFeasibility || hasLocalDraft(APP_STORAGE_KEYS.pendingFeasibilityResult));

  return [
    {
      title: "Cân bằng",
      description: "Chấm điểm 8 lĩnh vực để biết hiện tại đang lệch ở đâu.",
      completed: hasLifeBalance,
      href: "/onboarding",
    },
    {
      title: "Trọng tâm",
      description: "Chọn một vùng sống đáng ưu tiên trong chu kỳ này.",
      completed: hasInsight,
      href: hasLifeBalance ? "/life-insight" : "/onboarding",
    },
    {
      title: "Mục tiêu SMART",
      description: "Viết mục tiêu rõ kết quả, chỉ số, hạn và lý do.",
      completed: hasSmartGoal,
      href: hasInsight ? "/smart-goal-setup" : "/life-insight",
    },
    {
      title: "Kế hoạch 12 tuần",
      description: "Dựng việc lặp lại, mốc tuần và ngày review.",
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
      <section>
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-app-ink-muted">Không gian mới</p>
        <h1 className="mt-4 max-w-3xl font-serif text-[34px] font-medium leading-[1.12] tracking-[-0.02em] text-app-ink sm:text-[40px]">
          Chào {displayName}, hãy bắt đầu chu kỳ 12 tuần đầu tiên.
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-7 text-app-ink-soft">
          Trang chính sẽ sáng rõ hơn sau khi có một mục tiêu thật, một kế hoạch tuần và vài việc hôm nay.
        </p>
      </section>

      <section data-testid="fresh-workspace-empty-state" className="rounded-card border border-app-line bg-app-surface p-5 md:p-6" aria-labelledby="dashboard-new-user-title">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 id="dashboard-new-user-title" className="text-[15px] font-semibold text-app-ink">
              Thiết lập chu kỳ đầu tiên
            </h2>
            <p className="mt-1 text-[13px] leading-6 text-app-ink-muted">
              Chưa có dữ liệu thực thi để hiển thị. Đi qua 4 bước này để Trang chính có dữ liệu thật.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onContinue(nextStep.href)}
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-app-accent px-4 py-2.5 text-[14px] font-medium text-white transition-colors duration-150 hover:bg-[#264d43] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
          >
            Tiếp tục thiết lập →
          </button>
        </div>

        <ol className="mt-6 space-y-3">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-3 rounded-xl border border-app-line bg-app-bg p-4">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold ${
                  step.completed ? "bg-app-accent text-white" : "bg-app-surface text-app-ink-muted"
                }`}
              >
                {step.completed ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : index + 1}
              </span>
              <div className="min-w-0">
                <h3 className="text-[14px] font-medium text-app-ink">{step.title}</h3>
                <p className="mt-1 text-[13px] leading-5 text-app-ink-muted">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
