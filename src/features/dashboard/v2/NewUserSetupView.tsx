import { BookOpen, Check, ChevronDown, ChevronUp, Sparkles, Target } from "lucide-react";
import { useState } from "react";
import { VisionMapIllustration } from "@/app/components/illustrations";
import { hasScoredLifeBalance } from "@/app/utils/core-flow-guard";
import { APP_STORAGE_KEYS, type UserData } from "@/app/utils/storage";
import { capitalizeVietnameseName } from "@/app/utils/text";
import { DreamToPlanPreview } from "./DreamToPlanPreview";

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
  const canCreatePlan = hasSmartGoal;

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
      href: canCreatePlan ? "/12-week-setup" : "/smart-goal-setup",
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
    { stage: "Nhìn nhận" },
    { stage: "Định vị" },
    { stage: "Thiết lập" },
    { stage: "Hành động" },
  ];
  const meta = stepsMeta[index] || { stage: "Thiết lập" };

  return {
    border: "border-app-line/80 dark:border-neutral-800/80",
    hoverBg: "hover:bg-app-bg-subtle/50 dark:hover:bg-neutral-900/40 hover:border-app-accent/30",
    iconBgPending: "bg-app-bg-subtle dark:bg-neutral-900",
    iconTextPending: "text-app-ink-muted",
    badgeText: `Bước ${index + 1} · ${meta.stage}`,
    rotate: "",
  };
};

export function NewUserSetupView({ userData, displayName, onContinue }: NewUserSetupViewProps) {
  const [showSamplePlan, setShowSamplePlan] = useState(false);
  const steps = buildSetupSteps(userData);
  const nextStep = steps.find((step) => !step.completed) ?? steps[steps.length - 1];
  const hasLifeBalance = hasScoredLifeBalance(userData);

  const translateArea = (name: string) => {
    const map: Record<string, string> = {
      Career: "Sự nghiệp",
      Health: "Sức khỏe",
      Relationships: "Mối quan hệ",
      "Personal Growth": "Tinh thần",
      Leisure: "Giải trí",
      Family: "Gia đình",
      Education: "Học tập",
    };
    return map[name] || name;
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full">
      {/* 1. Editorial Greeting Banner - Premium Light-first Studio style */}
      <section className="relative overflow-hidden rounded-3xl border border-app-line/70 dark:border-neutral-800/70 bg-gradient-to-br from-emerald-50/40 via-white to-amber-50/15 dark:from-emerald-950/10 dark:via-neutral-900/30 dark:to-neutral-950 p-6 md:p-10 shadow-3xs">

        {/* Ambient background Vision Map Illustration */}
        <div
          className="pointer-events-none absolute right-4 bottom-0 w-48 h-36 opacity-[0.06] dark:opacity-[0.02] select-none z-0 hidden sm:block"
          aria-hidden="true"
        >
          <VisionMapIllustration className="w-full h-full object-contain" />
        </div>

        <div className="relative z-10 space-y-4 max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-500/5 dark:border-amber-900/30 px-3 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400 shadow-sm">
            Studio Ước Mơ & Thực Thi
          </span>

          <h1 className="font-serif text-3xl font-semibold leading-[1.25] tracking-tight text-app-ink sm:text-[2.5rem]">
            Chào {capitalizeVietnameseName(displayName)}, hãy thiết lập <br className="hidden sm:inline" />{" "}
            <span className="underline decoration-app-accent/55 underline-offset-4">
              chu kỳ 12 tuần
            </span>{" "}
            đầu tiên
          </h1>

          <p className="text-xs sm:text-sm font-medium leading-relaxed text-app-ink-soft dark:text-neutral-400 font-serif italic max-w-2xl">
            Biến mục tiêu lớn thành kế hoạch 12 tuần và việc cần làm mỗi ngày, để bạn biết bắt đầu từ đâu.
          </p>

          <div className="pt-2 flex items-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-app-line dark:border-neutral-800 bg-app-surface/90 dark:bg-neutral-900/90 px-3.5 py-1 text-[11px] font-semibold text-app-ink-soft dark:text-neutral-300 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-app-accent" />
              <span>Cần xem hướng dẫn nhanh?</span>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event("visionboard:open-guide"))}
                className="ml-1 font-bold text-app-accent hover:text-app-accent-hover underline underline-offset-2 transition-colors cursor-pointer"
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
        className="rounded-3xl border border-app-line/80 dark:border-neutral-800/80 bg-[#fbfbfa]/40 p-6 md:p-8 shadow-3xs w-full"
        aria-labelledby="dashboard-new-user-title"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-app-line/80 dark:border-neutral-800/60 pb-6 mb-8">
          <div className="space-y-1">
            <h2
              id="dashboard-new-user-title"
              className="text-xs font-bold uppercase tracking-wide text-app-ink flex items-center gap-2.5"
            >
              <BookOpen className="h-4.5 w-4.5 text-app-accent" />
              Bản đồ ghim chu kỳ
            </h2>
            <p className="text-[10px] font-semibold text-app-ink-muted">
              Hoàn thành 4 chặng cốt lõi để chuẩn hóa mục tiêu và kích hoạt nhịp Today.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onContinue(nextStep.href)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-emerald-700 hover:bg-emerald-800 px-6 py-2.5 text-xs font-bold text-white shadow-md transition-all duration-200 hover:-translate-y-px active:translate-y-0 active:scale-[0.99] cursor-pointer"
          >
            Bắt đầu: {nextStep.title} →
          </button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 grid gap-4 relative select-none">
            {steps.map((step, index) => {
              const theme = getStepTheme(index);
              const isNextStep = step.title === nextStep.title;

              return (
                <button
                  key={step.title}
                  type="button"
                  onClick={() => onContinue(step.href)}
                  className={`group flex text-left gap-4 rounded-2xl border p-5 transition-all duration-300 active:scale-[0.99] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 relative ${
                    step.completed
                      ? "border-app-line bg-app-bg-subtle/20 dark:bg-neutral-900/5 opacity-55 hover:opacity-85 hover:border-app-line-strong"
                      : isNextStep
                        ? "bg-app-surface dark:bg-neutral-900 border-app-accent/65 shadow-[0_8px_30px_rgba(47,93,80,0.06)] ring-1 ring-app-accent/15"
                        : `bg-app-surface/40 dark:bg-neutral-950/20 ${theme.border} ${theme.hoverBg} ${theme.rotate}`
                  }`}
                >
                  {/* Index / Check bubble */}
                  <div className="relative shrink-0 pt-0.5">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                        step.completed
                          ? "bg-emerald-700 text-white shadow-sm"
                          : isNextStep
                            ? "border border-app-accent bg-app-accent-soft text-app-accent font-extrabold"
                            : `border border-app-line-strong dark:border-neutral-700 bg-app-surface dark:bg-neutral-900 text-app-ink-muted`
                      }`}
                    >
                      {step.completed ? <Check className="h-4 w-4" strokeWidth={3} /> : index + 1}
                    </span>
                  </div>

                  {/* Text Content */}
                  <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h3
                        className={`text-xs font-bold leading-none ${step.completed ? "text-app-ink-muted line-through" : "text-app-ink dark:text-neutral-200"}`}
                      >
                        {step.title}
                      </h3>

                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wide ${
                          isNextStep && !step.completed
                            ? "bg-app-accent/10 text-app-accent border border-app-accent/10"
                            : "bg-app-bg-subtle dark:bg-neutral-800 text-app-ink-muted"
                        }`}
                      >
                        {theme.badgeText}
                      </span>

                      {isNextStep && !step.completed && (
                        <span className="inline-block rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide border border-emerald-500/10">
                          Đề xuất
                        </span>
                      )}
                    </div>

                    <p
                      className={`text-xs font-semibold leading-relaxed ${step.completed ? "text-app-ink-muted" : "text-app-ink-muted dark:text-neutral-400"}`}
                    >
                      {step.description}
                    </p>
                  </div>
                </button>
              );
            })}

            {/* 💡 Accordion: First Week Plan Mockup */}
            <div className="mt-4 rounded-2xl border border-app-line/60 dark:border-neutral-800 bg-app-surface/30 dark:bg-neutral-900/20 shadow-3xs overflow-hidden">
              <button
                type="button"
                onClick={() => setShowSamplePlan(!showSamplePlan)}
                className="w-full flex items-center justify-between px-5 py-4 text-xs font-bold text-app-ink-soft dark:text-neutral-300 hover:bg-app-bg-subtle/50 dark:hover:bg-neutral-900/40 transition-colors cursor-pointer select-none"
              >
                <span className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-app-accent" /> Xem cách một chu kỳ 12 tuần vận hành mẫu
                </span>
                {showSamplePlan ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {showSamplePlan && (
                <div className="px-5 pb-5 border-t border-neutral-100 dark:border-neutral-900 pt-4 bg-[#fbfbfa]/30 overflow-hidden">
                  <DreamToPlanPreview />
                </div>
              )}
            </div>
          </div>

          {/* Mini Wheel of Life Visual Anchor & Study Corner Image */}
          <div className="space-y-4">
            {hasLifeBalance && userData.currentWheelOfLife && userData.currentWheelOfLife.length > 0 ? (
              <div className="rounded-3xl border border-app-line/80 bg-app-surface/60 dark:bg-neutral-950/20 p-5 shadow-xs relative">
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-app-accent mb-4">
                  Kết quả chấm điểm của bạn
                </p>
                <div className="space-y-3">
                  {userData.currentWheelOfLife.map((area) => (
                    <div key={area.name} className="space-y-1">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-app-ink-soft dark:text-neutral-400">{translateArea(area.name)}</span>
                        <span className="text-app-accent">{area.score}/10</span>
                      </div>
                      <div
                        className="h-1.5 overflow-hidden rounded-full bg-app-bg-subtle dark:bg-neutral-800"
                        aria-hidden="true"
                      >
                        <div
                          className="h-full rounded-full bg-app-accent transition-all duration-500 ease-out"
                          style={{ width: `${area.score * 10}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-3xl border border-app-line/80 dark:border-neutral-800/80 overflow-hidden shadow-3xs aspect-square w-full group select-none transition-all duration-300 hover:shadow-md">
                  <img
                    src="/vision_board_detail.png"
                    alt="Bảng tầm nhìn chi tiết mẫu"
                    className="w-full h-full object-cover dark:brightness-[0.85] dark:contrast-[1.05]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent flex items-end p-4">
                    <p className="text-[10px] font-medium text-white/90 italic font-serif leading-relaxed">
                      "Có tầm nhìn rõ ràng là bước đầu tiên."
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-dashed border-app-line/80 dark:border-neutral-800 p-5 text-center space-y-2.5 bg-app-surface/30">
                  <Target className="h-5 w-5 mx-auto text-app-accent" />
                  <h4 className="text-xs font-bold text-app-ink dark:text-neutral-200">
                    Định hình cuộc sống bạn muốn
                  </h4>
                  <p className="text-[10px] leading-relaxed text-app-ink-muted dark:text-neutral-400 font-semibold">
                    Dành 3 phút chấm Bánh xe cuộc sống để nhìn rõ các khía cạnh cần ưu tiên trước khi bước vào lập kế
                    hoạch hành động.
                  </p>
                </div>
              </div>
            )}

            {/* 🎨 Cozy planning corner generated image asset */}
            <div className="relative rounded-3xl border border-app-line/80 dark:border-neutral-800/80 overflow-hidden shadow-3xs aspect-video w-full group select-none">
              <img
                src="/study_desk_hero.png"
                alt="Góc học tập & lập kế hoạch ấm áp"
                className="w-full h-full object-cover"
                width={320}
                height={180}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent flex items-end p-4">
                <p className="text-[10px] font-medium text-white/90 italic font-serif">
                  "Một góc nhỏ để giữ nhịp mỗi ngày."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
