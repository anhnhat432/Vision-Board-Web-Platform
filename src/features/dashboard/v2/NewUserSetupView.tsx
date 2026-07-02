import { BookOpen, Check, ChevronDown, ChevronUp, MapPinned, Target } from "lucide-react";
import type { ReactNode } from "react";
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
  companion?: ReactNode;
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
    border: "border-app-line/80",
    hoverBg: "hover:bg-app-bg-subtle/50 hover:border-app-accent/30",
    iconBgPending: "bg-app-bg-subtle",
    iconTextPending: "text-app-ink-muted",
    badgeText: `Bước ${index + 1} · ${meta.stage}`,
    rotate: "",
  };
};

export function NewUserSetupView({ userData, displayName, onContinue, companion }: NewUserSetupViewProps) {
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
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* 1. Editorial Greeting Banner - Premium Light-first Studio style */}
      <section className="relative overflow-hidden rounded-card-lg border border-app-line bg-app-surface p-6 shadow-[0_18px_42px_-34px_rgba(23,21,15,0.28)] md:p-8">

        {/* Ambient background Vision Map Illustration */}
        <div
          className="pointer-events-none absolute right-4 bottom-0 w-48 h-36 opacity-[0.06] dark:opacity-[0.02] select-none z-0 hidden sm:block"
          aria-hidden="true"
        >
          <VisionMapIllustration className="w-full h-full object-contain" />
        </div>

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <span className="inline-flex items-center gap-1.5 rounded-[9px] border border-app-accent/20 bg-app-accent-soft/50 px-3 py-1 text-[9.5px] font-bold uppercase tracking-[0.12em] text-app-accent">
              Chu kỳ 12 tuần
            </span>

            <h1 className="font-serif text-3xl font-semibold leading-[1.16] tracking-tight text-app-ink sm:text-[2.45rem]">
              Chào {capitalizeVietnameseName(displayName)}, hãy thiết lập <br className="hidden sm:inline" />{" "}
              <span className="underline decoration-app-accent/55 underline-offset-4">
                chu kỳ 12 tuần
              </span>{" "}
              đầu tiên
            </h1>

            <p className="max-w-2xl font-serif text-xs font-medium italic leading-relaxed text-app-ink-soft sm:text-sm">
              Biến mục tiêu lớn thành kế hoạch 12 tuần và việc cần làm mỗi ngày, để bạn biết bắt đầu từ đâu.
            </p>

            <div className="pt-2 flex items-center">
              <div className="inline-flex items-center gap-2 rounded-[var(--r-control)] border border-app-line bg-app-bg-subtle px-3.5 py-1.5 text-[11px] font-semibold text-app-ink-soft">
                <MapPinned className="h-3.5 w-3.5 text-app-accent" />
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

          {companion ? <div className="flex justify-end lg:pt-1">{companion}</div> : null}
        </div>
      </section>

      {/* 2. Setup Steps Panel - Guided studio layout */}
      <section
        data-testid="fresh-workspace-empty-state"
        className="w-full rounded-card-lg border border-app-line bg-app-surface p-5 shadow-[0_18px_42px_-34px_rgba(23,21,15,0.26)] md:p-7"
        aria-labelledby="dashboard-new-user-title"
      >
        <div className="mb-6 flex flex-col gap-4 border-b border-app-line/80 pb-5 sm:flex-row sm:items-center sm:justify-between">
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
            className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[var(--r-control)] bg-app-accent px-5 py-2.5 text-xs font-bold text-app-ink-on-accent shadow-[0_10px_22px_-15px_rgba(12,94,58,0.62)] transition-all duration-200 hover:-translate-y-px hover:bg-app-accent-hover active:translate-y-0 active:scale-[0.99]"
          >
            Bắt đầu: {nextStep.title} →
          </button>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="relative grid select-none gap-3.5 lg:col-span-2">
            {steps.map((step, index) => {
              const theme = getStepTheme(index);
              const isNextStep = step.title === nextStep.title;

              return (
                <button
                  key={step.title}
                  type="button"
                  onClick={() => onContinue(step.href)}
                  className={`group relative flex cursor-pointer gap-4 rounded-[16px] border p-4 text-left transition-all duration-300 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 sm:p-5 ${
                    step.completed
                      ? "border-app-line bg-app-bg-subtle/20 opacity-55 hover:opacity-85 hover:border-app-line-strong"
                      : isNextStep
                        ? "border-app-accent/45 bg-app-accent-subtle/28 shadow-[0_10px_28px_-24px_rgba(12,94,58,0.55)] ring-1 ring-app-accent/12"
                        : `bg-app-surface/45 ${theme.border} ${theme.hoverBg} ${theme.rotate}`
                  }`}
                >
                  {/* Index / Check bubble */}
                  <div className="relative shrink-0 pt-0.5">
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                        step.completed
                          ? "bg-app-accent text-app-ink-on-accent shadow-sm"
                          : isNextStep
                            ? "border border-app-accent bg-app-accent-soft text-app-accent font-extrabold"
                            : `border border-app-line-strong bg-app-surface text-app-ink-muted`
                      }`}
                    >
                      {step.completed ? <Check className="h-4 w-4" strokeWidth={3} /> : index + 1}
                    </span>
                  </div>

                  {/* Text Content */}
                  <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h3
                        className={`text-xs font-bold leading-none ${step.completed ? "text-app-ink-muted line-through" : "text-app-ink"}`}
                      >
                        {step.title}
                      </h3>

                      <span
                        className={`inline-block rounded-[8px] px-2 py-0.5 text-[9px] font-bold tracking-wide ${
                          isNextStep && !step.completed
                            ? "bg-app-accent/10 text-app-accent border border-app-accent/10"
                            : "bg-app-bg-subtle text-app-ink-muted"
                        }`}
                      >
                        {theme.badgeText}
                      </span>

                      {isNextStep && !step.completed && (
                        <span className="inline-block rounded-[8px] border border-app-accent/10 bg-app-accent/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-app-accent">
                          Đề xuất
                        </span>
                      )}
                    </div>

                    <p
                      className="text-xs font-semibold leading-relaxed text-app-ink-muted"
                    >
                      {step.description}
                    </p>
                  </div>
                </button>
              );
            })}

            {/* 💡 Accordion: First Week Plan Mockup */}
            <div className="mt-3 overflow-hidden rounded-[16px] border border-app-line/70 bg-app-bg-subtle/30">
              <button
                type="button"
                onClick={() => setShowSamplePlan(!showSamplePlan)}
                className="flex w-full cursor-pointer select-none items-center justify-between px-5 py-4 text-xs font-bold text-app-ink-soft transition-colors hover:bg-app-bg-subtle/60"
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-app-accent" /> Xem cách một chu kỳ 12 tuần vận hành mẫu
                </span>
                {showSamplePlan ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>

              {showSamplePlan && (
                <div className="px-5 pb-5 border-t border-app-line pt-4 bg-app-surface/30 overflow-hidden">
                  <DreamToPlanPreview />
                </div>
              )}
            </div>
          </div>

          {/* Mini Wheel of Life Visual Anchor & Study Corner Image */}
          <div className="space-y-4">
            {hasLifeBalance && userData.currentWheelOfLife && userData.currentWheelOfLife.length > 0 ? (
              <div className="relative rounded-card border border-app-line bg-app-surface p-5 shadow-xs">
                <p className="text-[10px] font-extrabold uppercase tracking-wide text-app-accent mb-4">
                  Kết quả chấm điểm của bạn
                </p>
                <div className="space-y-3">
                  {userData.currentWheelOfLife.map((area) => (
                    <div key={area.name} className="space-y-1">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-app-ink-soft">{translateArea(area.name)}</span>
                        <span className="text-app-accent">{area.score}/10</span>
                      </div>
                      <div
                        className="h-1.5 overflow-hidden rounded-full bg-app-bg-subtle"
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
                <div className="group relative aspect-square w-full select-none overflow-hidden rounded-card border border-app-line/80 shadow-3xs transition-all duration-300 hover:shadow-md">
                  <img
                    src="/vision_board_detail.png"
                    alt="Bảng tầm nhìn chi tiết mẫu"
                    className="w-full h-full object-cover dark:brightness-[0.85] dark:contrast-[1.05]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent flex items-end p-4">
                    <p className="text-[10px] font-medium text-app-ink-on-accent/90 italic font-serif leading-relaxed">
                      "Có tầm nhìn rõ ràng là bước đầu tiên."
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5 rounded-[16px] border border-dashed border-app-line/80 bg-app-surface/30 p-5 text-center">
                  <Target className="h-5 w-5 mx-auto text-app-accent" />
                  <h4 className="text-xs font-bold text-app-ink">
                    Định hình cuộc sống bạn muốn
                  </h4>
                  <p className="text-[10px] leading-relaxed text-app-ink-muted font-semibold">
                    Dành 3 phút chấm Bánh xe cuộc sống để nhìn rõ các khía cạnh cần ưu tiên trước khi bước vào lập kế
                    hoạch hành động.
                  </p>
                </div>
              </div>
            )}

            {/* 🎨 Cozy planning corner generated image asset */}
            <div className="group relative aspect-video w-full select-none overflow-hidden rounded-card border border-app-line/80 shadow-3xs">
              <picture>
                <source srcSet="/study_desk_hero.webp" type="image/webp" />
                <img
                  src="/study_desk_hero.png"
                  alt="Góc học tập & lập kế hoạch ấm áp"
                  className="w-full h-full object-cover"
                  width={320}
                  height={180}
                  loading="lazy"
                  decoding="async"
                />
              </picture>
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent flex items-end p-4">
                <p className="text-[10px] font-medium text-app-ink-on-accent/90 italic font-serif">
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
