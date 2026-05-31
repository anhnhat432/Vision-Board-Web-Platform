import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  Compass,
  Heart,
  HeartPulse,
  Home,
  Smile,
  Sprout,
  Target,
  Users,
  WalletCards,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";

import { toast } from "sonner";

import { AutoSaveIndicator } from "../components/AutoSaveIndicator";
import { CoreFlowProgress } from "../components/CoreFlowProgress";
import { PageShell } from "../components/PageShell";
import { InlineStatusMessage } from "../components/states/InlineStatusMessage";
import { ZenBreathingGate } from "./Onboarding/components/ZenBreathingGate";
import { SimpleRadarChart } from "../components/SimpleRadarChart";
import { Slider } from "../components/ui/slider";
import { trackAnalyticsEvent } from "../utils/analytics";
import { VisionMapIllustration } from "../components/illustrations/VisionMapIllustration";
import { hasRealLifeBalance } from "../utils/core-flow-guard";
import { LIFE_AREAS, type LifeArea, getLifeAreaLabel, getUserData, updateWheelOfLife } from "../utils/storage";
import { useScrollToTopOnChange } from "../hooks/useScrollToTopOnChange";
import { useDirtyFormGuard } from "../hooks/useDirtyFormGuard";

type OnboardingStep = "welcome" | "assessment";

type AutoSaveDraftStatus = "idle" | "saving" | "saved";

const JOURNEY_STEPS = [
  {
    icon: Heart,
    title: "🎯 Chấm 8 lĩnh vực",
    description: "Nhìn nhanh sức khỏe hiện tại của từng phần trong cuộc sống.",
  },
  {
    icon: Compass,
    title: "💡 Chọn trọng tâm",
    description: "Dữ liệu này mở Góc nhìn cuộc sống để chọn đúng nơi nên ưu tiên.",
  },
  {
    icon: Target,
    title: "🚀 Đi tiếp tới mục tiêu SMART",
    description: "Trọng tâm được chuyển thành mục tiêu rõ và kế hoạch 12 tuần.",
  },
] satisfies Array<{ icon: LucideIcon; title: string; description: string }>;

interface AreaColorConfig {
  bgLight: string;
  text: string;
  border: string;
  accent: string;
  glow: string;
}

const getAreaColorConfig = (name: string): AreaColorConfig => {
  switch (name) {
    case "Career":
      return {
        bgLight: "bg-blue-50 dark:bg-blue-950/20",
        text: "text-blue-600 dark:text-blue-400",
        border: "border-blue-100 dark:border-blue-900/30",
        accent: "#2563eb",
        glow: "shadow-blue-500/10 dark:shadow-blue-500/20",
      };
    case "Finance":
      return {
        bgLight: "bg-amber-50 dark:bg-amber-950/20",
        text: "text-amber-600 dark:text-amber-400",
        border: "border-amber-100 dark:border-amber-900/30",
        accent: "#d97706",
        glow: "shadow-amber-500/10 dark:shadow-amber-500/20",
      };
    case "Health":
      return {
        bgLight: "bg-emerald-50 dark:bg-emerald-950/20",
        text: "text-emerald-600 dark:text-emerald-400",
        border: "border-emerald-100 dark:border-emerald-900/30",
        accent: "#059669",
        glow: "shadow-emerald-500/10 dark:shadow-emerald-500/20",
      };
    case "Education":
      return {
        bgLight: "bg-indigo-50 dark:bg-indigo-950/20",
        text: "text-indigo-600 dark:text-indigo-400",
        border: "border-indigo-100 dark:border-indigo-900/30",
        accent: "#4f46e5",
        glow: "shadow-indigo-500/10 dark:shadow-indigo-500/20",
      };
    case "Relationships":
      return {
        bgLight: "bg-rose-50 dark:bg-rose-950/20",
        text: "text-rose-600 dark:text-rose-400",
        border: "border-rose-100 dark:border-rose-900/30",
        accent: "#e11d48",
        glow: "shadow-rose-500/10 dark:shadow-rose-500/20",
      };
    case "Family":
      return {
        bgLight: "bg-teal-50 dark:bg-teal-950/20",
        text: "text-teal-600 dark:text-teal-400",
        border: "border-teal-100 dark:border-teal-900/30",
        accent: "#0d9488",
        glow: "shadow-teal-500/10 dark:shadow-teal-500/20",
      };
    case "Personal Growth":
      return {
        bgLight: "bg-orange-50 dark:bg-orange-950/20",
        text: "text-orange-600 dark:text-orange-400",
        border: "border-orange-100 dark:border-orange-900/30",
        accent: "#ea580c",
        glow: "shadow-orange-500/10 dark:shadow-orange-500/20",
      };
    case "Leisure":
      return {
        bgLight: "bg-sky-50 dark:bg-sky-950/20",
        text: "text-sky-600 dark:text-sky-400",
        border: "border-sky-100 dark:border-sky-900/30",
        accent: "#0284c7",
        glow: "shadow-sky-500/10 dark:shadow-sky-500/20",
      };
    default:
      return {
        bgLight: "bg-app-accent-soft",
        text: "text-app-accent",
        border: "border-app-line",
        accent: "var(--app-accent)",
        glow: "shadow-app-accent/5",
      };
  }
};



const LIFE_AREA_DETAILS: Record<string, string> = {
  Career: "Việc học, công việc, hướng đi nghề nghiệp và cảm giác tiến triển.",
  Finance: "Thu nhập, chi tiêu, tiết kiệm và mức an tâm với tiền bạc.",
  Health: "Năng lượng, giấc ngủ, vận động và cách bạn chăm cơ thể.",
  Education: "Việc học thêm, kỹ năng mới và khả năng duy trì nhịp phát triển.",
  Relationships: "Bạn bè, người yêu, cộng đồng và chất lượng kết nối gần đây.",
  Family: "Sự hiện diện, hỗ trợ và cảm giác bình yên trong gia đình.",
  "Personal Growth": "Tự hiểu mình, thói quen cá nhân và khả năng giữ lời với bản thân.",
  Leisure: "Nghỉ ngơi, vui chơi, sở thích và khoảng trống để hồi phục.",
};

const LIFE_AREA_ICON_MAP: Record<string, LucideIcon> = {
  Career: BriefcaseBusiness,
  Finance: WalletCards,
  Health: HeartPulse,
  Education: BookOpen,
  Relationships: Users,
  Family: Home,
  "Personal Growth": Sprout,
  Leisure: Smile,
};

export const ONBOARDING_DRAFT_STORAGE_KEY = "onboarding_draft";
const ONBOARDING_DRAFT_VERSION = 1;

const createDefaultOnboardingLifeAreas = () => LIFE_AREAS.map((area) => ({ ...area, score: 5 }));

function getCalmLifeAreaIcon(areaName: string): LucideIcon {
  return LIFE_AREA_ICON_MAP[areaName] ?? Compass;
}

type OnboardingDraft = {
  version: number;
  completed: boolean;
  step: OnboardingStep;
  lifeAreas: LifeArea[];
  reviewedAreaIndices: number[];
  updatedAt: string;
};

function normalizeDraftScore(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return 5;
  return Math.min(10, Math.max(0, Math.round(value)));
}

function parseOnboardingDraft(raw: string | null): OnboardingDraft | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<OnboardingDraft> | null;
    if (!parsed || typeof parsed !== "object" || parsed.completed) return null;

    const draftLifeAreas = Array.isArray(parsed.lifeAreas) ? parsed.lifeAreas : [];
    const lifeAreas = LIFE_AREAS.map((baseArea, index) => {
      const draftArea = draftLifeAreas.find((area) => area?.name === baseArea.name) ?? draftLifeAreas[index];
      return { ...baseArea, score: normalizeDraftScore(draftArea?.score) };
    });
    const reviewedAreaIndices = Array.isArray(parsed.reviewedAreaIndices)
      ? parsed.reviewedAreaIndices.filter(
          (index): index is number => Number.isInteger(index) && index >= 0 && index < LIFE_AREAS.length,
        )
      : [];

    return {
      version: ONBOARDING_DRAFT_VERSION,
      completed: false,
      step: parsed.step === "assessment" ? "assessment" : "welcome",
      lifeAreas,
      reviewedAreaIndices: [...new Set(reviewedAreaIndices)],
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function readOnboardingDraft(): OnboardingDraft | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(ONBOARDING_DRAFT_STORAGE_KEY);
  const draft = parseOnboardingDraft(raw);
  if (raw && !draft) window.localStorage.removeItem(ONBOARDING_DRAFT_STORAGE_KEY);
  return draft;
}

function writeOnboardingDraft(draft: OnboardingDraft) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ONBOARDING_DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

function clearOnboardingDraft() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ONBOARDING_DRAFT_STORAGE_KEY);
}

function createOnboardingDraft(
  step: OnboardingStep,
  lifeAreas: LifeArea[],
  reviewedAreaIndices: Set<number>,
): OnboardingDraft {
  return {
    version: ONBOARDING_DRAFT_VERSION,
    completed: false,
    step,
    lifeAreas: lifeAreas.map((area) => ({ ...area })),
    reviewedAreaIndices: [...reviewedAreaIndices],
    updatedAt: new Date().toISOString(),
  };
}

function getScaleGuidance(score: number): string {
  if (score <= 3) return "Cần chăm sóc";
  if (score <= 7) return "Ổn định";
  return "Đang phát triển";
}

function getScaleGuidanceColor(score: number): string {
  if (score <= 3) return "text-rose-600 dark:text-rose-400 bg-rose-50/60 dark:bg-rose-950/20";
  if (score <= 7) return "text-amber-600 dark:text-amber-400 bg-amber-50/60 dark:bg-amber-950/20";
  return "text-emerald-600 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/20";
}

export function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [isReturning, setIsReturning] = useState(false);
  const [lifeAreas, setLifeAreas] = useState<LifeArea[]>(createDefaultOnboardingLifeAreas);
  const [reviewedAreaIndices, setReviewedAreaIndices] = useState<Set<number>>(new Set());
  const [isDirty, setIsDirty] = useState(false);
  const [availableDraft, setAvailableDraft] = useState<OnboardingDraft | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveDraftStatus>("saved");
  const flowTopRef = useRef<HTMLDivElement | null>(null);
  const autosaveTimerRef = useRef<number | null>(null);
  const [showBreathing, setShowBreathing] = useState(false);
  const [activeAreaIndex, setActiveAreaIndex] = useState<number | null>(0);

  const radarData = useMemo(
    () =>
      lifeAreas.map((area) => ({
        subject: getLifeAreaLabel(area.name),
        value: area.score,
        fullMark: 10,
      })),
    [lifeAreas],
  );

  const guardedRef = useRef(false);
  useEffect(() => {
    if (guardedRef.current) return;
    guardedRef.current = true;
    const data = getUserData();
    if (hasRealLifeBalance(data)) {
      setIsReturning(true);
      setLifeAreas(data.currentWheelOfLife);
      setReviewedAreaIndices(new Set(data.currentWheelOfLife.map((_, index) => index)));
      clearOnboardingDraft();
      return;
    }

    setAvailableDraft(readOnboardingDraft());
  }, []);

  const averageScore = lifeAreas.reduce((sum, area) => sum + area.score, 0) / lifeAreas.length;
  const strongestArea = [...lifeAreas].sort((a, b) => b.score - a.score)[0];
  const growthArea = [...lifeAreas].sort((a, b) => a.score - b.score)[0];
  const reviewedAreaCount = reviewedAreaIndices.size;
  const remainingAreaCount = Math.max(0, lifeAreas.length - reviewedAreaCount);
  const canCompleteAssessment = remainingAreaCount === 0;

  useScrollToTopOnChange(step, {
    focusRef: flowTopRef,
    topOffset: 0,
  });

  const cancelPendingDraftSave = useCallback(() => {
    if (!autosaveTimerRef.current) return;
    window.clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = null;
  }, []);

  const markAreaReviewed = useCallback((index: number) => {
    setReviewedAreaIndices((current) => {
      const next = new Set(current);
      next.add(index);
      return next;
    });
  }, []);

  const handleScoreChangeWrapped = useCallback(
    (index: number, value: number[]) => {
      setLifeAreas((currentAreas) =>
        currentAreas.map((area, areaIndex) => (areaIndex === index ? { ...area, score: value[0] ?? 0 } : area)),
      );
      markAreaReviewed(index);
      setIsDirty(true);
    },
    [markAreaReviewed],
  );

  const handleSkipArea = useCallback(
    (index: number) => {
      markAreaReviewed(index);
      setIsDirty(true);
    },
    [markAreaReviewed],
  );

  useEffect(() => {
    if (!isDirty) return;

    const draft = createOnboardingDraft(step, lifeAreas, reviewedAreaIndices);
    setAutoSaveStatus("saving");
    cancelPendingDraftSave();
    autosaveTimerRef.current = window.setTimeout(() => {
      writeOnboardingDraft(draft);
      setLastSavedAt(new Date());
      setAutoSaveStatus("saved");
      autosaveTimerRef.current = null;
    }, 500);

    return cancelPendingDraftSave;
  }, [cancelPendingDraftSave, isDirty, lifeAreas, reviewedAreaIndices, step]);

  useEffect(() => cancelPendingDraftSave, [cancelPendingDraftSave]);

  const flushDraft = useCallback(() => {
    if (!isDirty) return;
    cancelPendingDraftSave();
    writeOnboardingDraft(createOnboardingDraft(step, lifeAreas, reviewedAreaIndices));
  }, [cancelPendingDraftSave, isDirty, lifeAreas, reviewedAreaIndices, step]);

  useDirtyFormGuard(isDirty, flushDraft);

  const completeAssessment = () => {
    updateWheelOfLife(lifeAreas);
    clearOnboardingDraft();
    cancelPendingDraftSave();
    setAvailableDraft(null);
    setLastSavedAt(null);
    setAutoSaveStatus("saved");
    trackAnalyticsEvent("life_balance_completed", {
      source: "onboarding",
      area_count: lifeAreas.length,
      average_score: Number(averageScore.toFixed(1)),
      weakest_area: getLifeAreaLabel(growthArea.name),
      strongest_area: getLifeAreaLabel(strongestArea.name),
    });
    setIsDirty(false);
    navigate("/life-insight");
  };

  const handleComplete = () => {
    if (!canCompleteAssessment) return;
    completeAssessment();
  };

  const handleDeferAssessment = () => {
    completeAssessment();
  };

  const handleStartAssessment = () => {
    trackAnalyticsEvent("onboarding_started", {
      source: "onboarding",
      returning_user: isReturning,
    });
    trackAnalyticsEvent("life_balance_started", {
      source: "onboarding",
      returning_user: isReturning,
      has_existing_scores: isReturning,
    });
    setStep("assessment");
  };

  const handleResumeDraft = () => {
    if (!availableDraft) return;
    setLifeAreas(availableDraft.lifeAreas.map((area) => ({ ...area })));
    setReviewedAreaIndices(new Set(availableDraft.reviewedAreaIndices));
    setStep(availableDraft.step);
    setIsDirty(true);
    setAvailableDraft(null);
    const resumedAt = new Date(availableDraft.updatedAt);
    setLastSavedAt(Number.isNaN(resumedAt.getTime()) ? null : resumedAt);
  };

  const handleRestartDraft = () => {
    clearOnboardingDraft();
    cancelPendingDraftSave();
    setAvailableDraft(null);
    setStep("welcome");
    setLifeAreas(createDefaultOnboardingLifeAreas());
    setReviewedAreaIndices(new Set());
    setIsDirty(false);
    setLastSavedAt(null);
    setAutoSaveStatus("saved");
  };

  const handleDefer = () => {
    if (reviewedAreaIndices.size > 0) {
      updateWheelOfLife(lifeAreas);
      clearOnboardingDraft();
      cancelPendingDraftSave();
      setAvailableDraft(null);
      setLastSavedAt(null);
      setAutoSaveStatus("saved");
      setIsDirty(false);
      toast.success("Đã lưu phần bạn đã chỉnh. Bạn có thể quay lại rà đủ 8 lĩnh vực bất kỳ lúc nào.");
    } else {
      toast.info("Chưa có điểm nào được chỉnh. Dữ liệu chưa lưu.");
    }
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("onboarding-deferred", "1");
    }
    navigate("/");
  };

  const progressHeader = (
    <div>
      <CoreFlowProgress
        currentStepId="life_balance"
        onExit={() => {
          if (typeof window !== "undefined") {
            window.sessionStorage.setItem("onboarding-deferred", "1");
          }
          navigate("/");
        }}
        className="mb-2"
      />
      <div className="sticky top-2 z-20 flex justify-end">
        <AutoSaveIndicator status={isDirty ? autoSaveStatus : "saved"} lastSavedAt={lastSavedAt} variant="prominent" />
      </div>
    </div>
  );

  const draftBanner = availableDraft ? (
    <InlineStatusMessage tone="warning" prefix="Tiếp tục từ chỗ bạn dừng?">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="leading-6">Bạn có bản nháp Cân bằng cuộc sống chưa hoàn thành.</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg bg-app-warm px-3.5 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-app-warm/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-warm/30"
            onClick={handleResumeDraft}
          >
            Tiếp tục
          </button>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-lg border border-app-line bg-app-surface px-3.5 py-2 text-sm font-medium text-app-ink transition-colors duration-150 hover:bg-app-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-warm/30"
            onClick={handleRestartDraft}
          >
            Bắt đầu lại
          </button>
        </div>
      </div>
    </InlineStatusMessage>
  ) : null;

  if (step === "welcome") {
    return (
      <PageShell maxWidth="xl" className="focus:outline-none">
        <div ref={flowTopRef} tabIndex={-1} className="space-y-6 focus:outline-none">
          {progressHeader}

          {showBreathing ? (
            <div className="surface-raised rounded-2xl border border-app-line bg-app-surface p-6 md:p-8 shadow-sm">
              <ZenBreathingGate onComplete={handleStartAssessment} />
            </div>
          ) : (
            <>
              {isReturning ? (
                <InlineStatusMessage tone="success" prefix="Cập nhật điểm hiện tại.">
                  Điểm cũ đã được tải sẵn, bạn chỉ điều chỉnh phần thay đổi, không tạo lại từ đầu.
                </InlineStatusMessage>
              ) : null}

              {draftBanner}

              <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-stretch">
                <div className="surface-raised rounded-2xl border border-app-line bg-gradient-to-br from-emerald-500/[0.02] via-app-surface to-teal-500/[0.02] p-6 md:p-8 shadow-sm flex flex-col justify-between space-y-8">
                  <div className="space-y-4">
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1 text-xs font-semibold tracking-wider text-emerald-700 dark:text-emerald-300 border border-emerald-100/50 dark:border-emerald-900/30">
                      <Compass className="h-3.5 w-3.5 animate-spin-slow" />
                      LIFE BALANCE STUDIO
                    </div>
                    
                    <h1 className="font-serif text-3xl md:text-4xl font-medium tracking-tight text-app-ink leading-tight">
                      Lắng nghe nhịp điệu <br className="hidden sm:inline" /> cuộc sống của bạn
                    </h1>
                    
                    <p className="text-sm text-app-ink-soft leading-relaxed max-w-xl">
                      Dear Our Future giúp bạn chuyển hóa những ước mơ mơ hồ thành một mục tiêu SMART rõ ràng và kế hoạch 12 tuần thực tế. Dành 3 phút đánh giá 8 khía cạnh để xem cuộc sống của bạn đang tròn hay lệch.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    {JOURNEY_STEPS.map((item, index) => {
                      const Icon = item.icon;

                      return (
                        <div 
                          key={item.title} 
                          className="group rounded-xl border border-app-line/60 bg-app-surface/60 p-4 transition-all duration-300 hover:shadow-md hover:border-app-accent/30 hover:bg-app-surface"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-app-accent-soft text-app-accent group-hover:scale-110 transition-transform">
                            <Icon className="h-4 w-4" aria-hidden="true" />
                          </div>
                          <h2 className="mt-3 text-xs font-semibold text-app-ink flex items-center gap-1">
                            <span className="text-app-accent font-mono text-[10px] opacity-60">0{index + 1}.</span>
                            {item.title.replace(/[^\w\s\dàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/gi, '').trim()}
                          </h2>
                          <p className="mt-1 text-[11px] leading-relaxed text-app-ink-soft">
                            {item.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-app-accent px-6 py-3 text-sm font-medium text-white transition-all duration-200 hover:brightness-105 hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2"
                      onClick={() => setShowBreathing(true)}
                    >
                      <Sparkles className="h-4 w-4" aria-hidden="true" />
                      Tập thở & Bắt đầu
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-app-line bg-app-surface px-6 py-3 text-sm font-medium text-app-ink transition-all duration-200 hover:bg-app-bg hover:shadow-sm active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40 focus-visible:ring-offset-2"
                      onClick={handleStartAssessment}
                    >
                      Bắt đầu nhanh
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-xl px-4 py-3 text-sm font-medium text-app-ink-soft transition-all duration-200 hover:bg-app-bg hover:text-app-ink focus-visible:outline-none focus-visible:ring-2"
                      onClick={handleDefer}
                    >
                      Để sau
                    </button>
                  </div>
                </div>
                
                <div className="hidden lg:flex flex-col items-center justify-center surface-raised rounded-2xl border border-app-line bg-gradient-to-br from-emerald-500/[0.03] to-teal-500/[0.03] p-8 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                  <VisionMapIllustration className="w-full h-auto max-w-[260px] text-app-accent opacity-95 animate-[float_4s_ease-in-out_infinite] relative z-10" />
                  <p className="mt-6 text-xs font-semibold tracking-wider uppercase text-emerald-800/70 dark:text-emerald-300/70 relative z-10">Bản đồ Cân bằng Cuộc sống</p>
                  <p className="mt-1 text-[11px] text-app-ink-muted text-center max-w-[200px] relative z-10">Phác thảo trạng thái của 8 lĩnh vực cuộc sống ngay lập tức.</p>
                </div>
              </div>
            </>
          )}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth="xl" className="focus:outline-none">
      <div ref={flowTopRef} tabIndex={-1} className="space-y-6 focus:outline-none">
        {progressHeader}
        {draftBanner}

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
            <Sparkles className="h-3 w-3 animate-pulse" />
            Bước 1 / 6 · Cân bằng cuộc sống
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-medium tracking-tight text-app-ink">
            Vẽ bản đồ cân bằng hiện tại của bạn
          </h1>
          <p className="text-sm text-app-ink-soft max-w-2xl leading-relaxed">
            Chấm nhanh 8 lĩnh vực để Dear Our Future tìm ra nơi bạn nên ưu tiên trong chu kỳ 12 tuần tiếp theo.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px] lg:items-start">
          <div className="space-y-3 order-2 lg:order-1">
            <div className="space-y-2.5">
              {lifeAreas.map((area, index) => {
                const AreaIcon = getCalmLifeAreaIcon(area.name);
                const areaLabel = getLifeAreaLabel(area.name);
                const isAreaReviewed = reviewedAreaIndices.has(index);
                const colorConfig = getAreaColorConfig(area.name);
                const isActive = activeAreaIndex === index;

                return (
                  // biome-ignore lint/a11y/useSemanticElements: card container behaves as an interactive element
                  <div
                    key={area.name}
                    role="button"
                    tabIndex={0}
                    onClick={() => setActiveAreaIndex(isActive ? null : index)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setActiveAreaIndex(isActive ? null : index);
                      }
                    }}
                    className={`cursor-pointer rounded-xl border transition-all duration-300 overflow-hidden ${
                      isActive 
                        ? "border-app-accent bg-app-surface shadow-app-md ring-1 ring-app-accent/25" 
                        : isAreaReviewed 
                          ? "border-app-line bg-app-surface/90 hover:bg-app-surface hover:border-app-line-strong hover:shadow-app-sm" 
                          : "border-app-line bg-app-surface/40 hover:bg-app-surface/60 hover:border-app-line-strong"
                    }`}
                  >
                    <div className="p-4 flex items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform ${isActive ? "scale-110" : ""} ${colorConfig.bgLight} ${colorConfig.text}`}>
                          <AreaIcon className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h2 className={`text-sm font-semibold truncate ${isActive ? "text-app-ink font-bold" : isAreaReviewed ? "text-app-ink" : "text-app-ink-soft"}`}>
                              {areaLabel}
                            </h2>
                            {isAreaReviewed && (
                              <span className="inline-flex items-center text-[9px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded-full">
                                <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                                Đã rà
                              </span>
                            )}
                          </div>
                          {!isActive && isAreaReviewed && (
                            <p className="text-[10px] text-app-ink-muted truncate max-w-[220px]">
                              {LIFE_AREA_DETAILS[area.name]}
                            </p>
                          )}
                          {!isActive && !isAreaReviewed && (
                            <p className="text-[10px] text-app-ink-muted italic">
                              Chưa đánh giá
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1.5">
                          {isAreaReviewed && (
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${getScaleGuidanceColor(area.score)}`}>
                              {getScaleGuidance(area.score)}
                            </span>
                          )}
                          <span className={`font-serif text-2xl font-bold tabular-nums leading-none ${isAreaReviewed ? "text-app-ink" : "text-app-ink-muted"}`}>
                            {area.score}
                          </span>
                          <span className="text-xs text-app-ink-muted">/10</span>
                        </div>
                        {isActive ? (
                          <ChevronUp className="h-4 w-4 text-app-ink-soft" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-app-ink-muted" />
                        )}
                      </div>
                    </div>

                    {isActive && (
                      // biome-ignore lint/a11y/useKeyWithClickEvents: stop propagation wrapper
                      // biome-ignore lint/a11y/noStaticElementInteractions: stop propagation wrapper
                      <div 
                        className="px-4 pb-4 pt-3 border-t border-app-line/40 bg-app-bg-subtle/30 space-y-4 cursor-default animate-fade-in"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <p className="text-xs text-app-ink-soft leading-relaxed">
                          {LIFE_AREA_DETAILS[area.name] ?? "Một phần quan trọng trong cuộc sống."}
                        </p>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-app-ink-muted font-medium">Kéo thanh trượt để chấm điểm:</span>
                            <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${getScaleGuidanceColor(area.score)}`}>
                              {area.score}/10 — {getScaleGuidance(area.score)}
                            </span>
                          </div>
                          <div className="pt-2 px-1">
                            <Slider
                              value={[area.score]}
                              onValueChange={(value) => handleScoreChangeWrapped(index, value)}
                              min={0}
                              max={10}
                              step={1}
                              trackColor={colorConfig.accent}
                              className="w-full"
                              aria-label={`Điểm ${areaLabel}`}
                            />
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[10px] font-mono text-app-ink-muted">
                            <span>0 (Cần chăm sóc)</span>
                            <span>5 (Ổn định)</span>
                            <span>10 (Đang phát triển)</span>
                          </div>
                        </div>

                        {!isAreaReviewed && (
                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              className="text-[11px] font-semibold text-app-accent hover:underline flex items-center gap-1"
                              onClick={() => handleSkipArea(index)}
                            >
                              Để sau
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {!canCompleteAssessment && (
              <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-3 flex items-start gap-2.5">
                <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  Còn {remainingAreaCount} lĩnh vực chưa được chạm vào. Bạn có thể nhấn từng mục để điều chỉnh hoặc bấm nút chính để tiếp tục với các điểm số mặc định là 5.
                </p>
              </div>
            )}
          </div>

          <div className="order-1 lg:order-2 lg:sticky lg:top-6 space-y-4">
            <div className="surface-raised rounded-2xl border border-app-line bg-gradient-to-br from-app-surface via-app-surface to-app-accent-subtle/10 p-6 shadow-app-md text-center relative overflow-hidden transition-all duration-300">
              <div className="absolute top-0 right-0 w-36 h-36 bg-app-accent/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex items-center justify-between pb-2 border-b border-app-line/60">
                <h3 className="text-xs font-bold uppercase tracking-wider text-app-accent">Bản đồ Cân bằng</h3>
                <span className="inline-flex items-center text-[10px] font-semibold text-app-ink-muted bg-app-bg-subtle px-2 py-0.5 rounded-full">
                  Đã rà soát: {reviewedAreaCount}/8
                </span>
              </div>
              
              <div className="flex items-center justify-center min-h-[290px] my-2">
                <SimpleRadarChart 
                  data={radarData} 
                  height={290} 
                  fill="var(--app-accent)"
                  stroke="var(--app-accent)"
                  fillOpacity={0.15}
                  className="w-full max-w-[340px]" 
                />
              </div>

              <div className="mt-4 pt-4 border-t border-app-line/60 grid grid-cols-2 gap-3 text-left" data-testid="onboarding-assessment-summary">
                <span className="sr-only">Đã rà soát: {reviewedAreaCount}/8 Điểm trung bình</span>
                <div className="px-3 py-2 rounded-xl bg-app-surface border border-app-line shadow-app-sm">
                  <span className="text-[10px] text-app-ink-muted uppercase font-bold tracking-wider">Điểm trung bình</span>
                  <p className="font-serif text-xl font-bold text-app-ink mt-0.5 tabular-nums">
                    {averageScore.toFixed(1)}<span className="text-xs font-normal text-app-ink-muted">/10</span>
                  </p>
                </div>
                <div className="px-3 py-2 rounded-xl bg-app-surface border border-app-line shadow-app-sm">
                  <span className="text-[10px] text-app-ink-muted uppercase font-bold tracking-wider">Đã hoàn thành</span>
                  <p className="font-serif text-xl font-bold text-app-ink mt-0.5 tabular-nums">
                    {Math.round((reviewedAreaCount / 8) * 100)}%
                  </p>
                </div>
                <div className="px-3 py-2 rounded-xl bg-app-surface border border-app-line shadow-app-sm">
                  <span className="text-[10px] text-app-ink-muted uppercase font-bold tracking-wider">Khía cạnh cần tập trung</span>
                  <p className="text-xs font-bold text-app-warm truncate mt-1">
                    {getLifeAreaLabel(growthArea.name)} ({growthArea.score}đ)
                  </p>
                </div>
                <div className="px-3 py-2 rounded-xl bg-app-surface border border-app-line shadow-app-sm">
                  <span className="text-[10px] text-app-ink-muted uppercase font-bold tracking-wider">Khía cạnh mạnh nhất</span>
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 truncate mt-1">
                    {getLifeAreaLabel(strongestArea.name)} ({strongestArea.score}đ)
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 flex items-center justify-center gap-1.5 text-[11px] italic text-app-ink-muted">
                <Sparkles className="h-3.5 w-3.5 text-app-accent opacity-70" />
                <span>“Điểm càng thật, insight càng đúng.”</span>
              </div>
            </div>
          </div>
        </div>

        <footer className="mt-8 border-t border-app-line pt-6">
          <div className="flex flex-col gap-4">
            {!canCompleteAssessment && (
              <div className="flex items-center gap-2 text-xs text-app-ink-muted justify-end">
                <Info className="h-3.5 w-3.5 text-app-ink-muted" />
                <span>Các khía cạnh chưa rà sẽ tự động nhận điểm 5.</span>
              </div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 order-2 sm:order-1">
                <button
                  type="button"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-app-line bg-app-surface px-4 py-2.5 text-xs font-semibold text-app-ink-soft transition-all duration-200 hover:bg-app-bg hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 active:scale-[0.98]"
                  onClick={() => setStep("welcome")}
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  Quay lại
                </button>
                <button
                  type="button"
                  className="text-xs font-semibold text-app-ink-muted hover:text-app-ink hover:underline px-2 py-2"
                  onClick={handleDefer}
                >
                  Để sau
                </button>
              </div>
              <button
                type="button"
                className="order-1 inline-flex items-center justify-center gap-2 rounded-xl bg-app-accent px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:brightness-105 hover:shadow-app-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent sm:order-2"
                onClick={canCompleteAssessment ? handleComplete : handleDeferAssessment}
              >
                Xem Góc nhìn cuộc sống của tôi
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </footer>
      </div>
    </PageShell>
  );
}
