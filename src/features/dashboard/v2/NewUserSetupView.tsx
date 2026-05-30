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
  rotate: string;
}

const getStepTheme = (index: number): CardStepTheme => {
  const stepsMeta = [
    { stage: "Nhìn nhận", rotate: "-rotate-[0.6deg]" },
    { stage: "Định vị", rotate: "rotate-[0.5deg]" },
    { stage: "Thiết lập", rotate: "-rotate-[0.4deg]" },
    { stage: "Hành động", rotate: "rotate-[0.6deg]" }
  ];
  const meta = stepsMeta[index] || { stage: "Thiết lập", rotate: "rotate-0" };

  return {
    border: "border-neutral-200/80 dark:border-neutral-800/80",
    hoverBg: "hover:bg-neutral-50/50 dark:hover:bg-neutral-900/40 hover:border-app-accent/30 hover:rotate-0",
    iconBgPending: "bg-neutral-100 dark:bg-neutral-900",
    iconTextPending: "text-neutral-500",
    badgeText: `Bước ${index + 1} · ${meta.stage}`,
    rotate: meta.rotate,
  };
};

export function NewUserSetupView({ userData, displayName, onContinue }: NewUserSetupViewProps) {
  const steps = buildSetupSteps(userData);
  const nextStep = steps.find((step) => !step.completed) ?? steps[steps.length - 1];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* 1. Editorial Greeting Banner - Premium Vision Board Studio card */}
      <section className="relative overflow-hidden rounded-3xl border border-neutral-200/70 dark:border-neutral-800/70 bg-gradient-to-br from-emerald-50/50 via-white to-emerald-50/20 dark:from-emerald-950/10 dark:via-neutral-900/30 dark:to-neutral-950 p-6 md:p-10 shadow-[0_12px_36px_rgba(47,93,80,0.02)] backdrop-blur-sm">
        {/* Ambient background light */}
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-app-accent/5 blur-[80px]" />
        
        <div className="relative z-10 space-y-4 max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-500/5 dark:border-amber-900/30 px-3 py-0.5 text-[9px] font-bold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400 shadow-sm">
            📌 Studio Ước Mơ & Thực Thi
          </span>
          
          <h1 className="font-serif text-3xl font-normal leading-[1.25] tracking-tight text-app-ink sm:text-[2.5rem]">
            Chào {capitalizeVietnameseName(displayName)}, hãy bắt đầu <span className="underline decoration-amber-400/50 decoration-wavy underline-offset-4">thiết lập hành trình 12 tuần</span> đầu tiên
          </h1>
          
          <p className="text-xs font-medium leading-relaxed text-neutral-600 dark:text-neutral-400 font-serif italic max-w-2xl">
            Nơi những khát vọng mơ hồ của bạn được đóng gói thành các thói quen cụ thể. Từng bước ghim chặt mục tiêu của bạn lên bảng ước mơ và thực hiện đều đặn mỗi ngày.
          </p>
          
          <div className="pt-2 flex items-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-900/90 px-3.5 py-1 text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-app-accent animate-pulse" />
              <span>Cần xem hướng dẫn nhanh?</span>
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

      {/* 2. Setup Steps Panel - Guided studio layout */}
      <section
        data-testid="fresh-workspace-empty-state"
        className="rounded-3xl border border-neutral-200/80 dark:border-neutral-800/80 bg-[#fbfbfa]/40 p-6 md:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.005)]"
        aria-labelledby="dashboard-new-user-title"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-neutral-200/80 dark:border-neutral-800/60 pb-6 mb-8">
          <div className="space-y-1">
            <h2 id="dashboard-new-user-title" className="text-sm font-bold uppercase tracking-[0.2em] text-app-ink flex items-center gap-2.5">
              <BookOpen className="h-4.5 w-4.5 text-app-accent" />
              Bản đồ ghim chu kỳ
            </h2>
            <p className="text-xs font-semibold text-neutral-500">
              Hoàn thành 4 chặng cốt lõi để chuẩn hóa mục tiêu và kích hoạt nhịp Today.
            </p>
          </div>
          
          <button
            type="button"
            onClick={() => onContinue(nextStep.href)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-emerald-700 hover:bg-emerald-800 px-6 py-2.5 text-xs font-bold text-white shadow-md transition-all duration-200 hover:-translate-y-px active:translate-y-0"
          >
            Tiếp tục thiết lập
          </button>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 relative select-none">
          {steps.map((step, index) => {
            const theme = getStepTheme(index);
            const isNextStep = step.title === nextStep.title;
            
            return (
              <button
                key={step.title}
                type="button"
                onClick={() => onContinue(step.href)}
                className={`group flex text-left gap-4 rounded-2xl border p-6 transition-all duration-300 active:scale-[0.99] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 relative ${
                  step.completed
                    ? "border-neutral-200 bg-neutral-50/20 dark:bg-neutral-900/5 opacity-50 hover:opacity-85 hover:border-neutral-300"
                    : isNextStep
                    ? "bg-white dark:bg-neutral-900 border-app-accent/65 shadow-[0_8px_30px_rgba(47,93,80,0.06)] ring-1 ring-app-accent/15 -rotate-[0.5deg] scale-[1.01]"
                    : `bg-white/40 dark:bg-neutral-950/20 ${theme.border} ${theme.hoverBg} ${theme.rotate}`
                }`}
              >
                {/* 📌 Pin indicator on top header of cards to align with Roadmap 4-step */}
                <span className="absolute -top-3 left-4 text-lg select-none filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.05)]">📌</span>
                
                {/* Index / Check bubble */}
                <div className="relative shrink-0 pt-1">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                      step.completed
                        ? "bg-emerald-700 text-white shadow-sm"
                        : isNextStep
                        ? "border border-app-accent bg-app-accent-soft text-app-accent font-extrabold"
                        : `border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-500`
                    }`}
                  >
                    {step.completed ? <Check className="h-4.5 w-4.5" strokeWidth={3} /> : index + 1}
                  </span>
                </div>
                
                {/* Text Content */}
                <div className="min-w-0 flex-1 space-y-2 pt-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <h3 className={`text-xs font-bold leading-none ${step.completed ? "text-neutral-400 line-through" : "text-neutral-800 dark:text-neutral-200"}`}>
                      {step.title}
                    </h3>
                    
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide ${
                      isNextStep && !step.completed 
                        ? "bg-app-accent/10 text-app-accent border border-app-accent/10" 
                        : "bg-neutral-100 dark:bg-neutral-800 text-neutral-500"
                    }`}>
                      {theme.badgeText}
                    </span>
                    
                    {isNextStep && !step.completed && (
                      <span className="inline-block rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border border-emerald-500/10 animate-pulse">
                        Đề xuất
                      </span>
                    )}
                  </div>
                  
                  <p className={`text-xs font-semibold leading-relaxed ${step.completed ? "text-neutral-400" : "text-neutral-500 dark:text-neutral-400"}`}>
                    {step.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
