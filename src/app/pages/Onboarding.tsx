import {
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  ChevronDown,
  ChevronUp,
  Compass,
  HeartPulse,
  Home,
  type LucideIcon,
  Smile,
  Sparkles,
  Sprout,
  Users,
  WalletCards,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { AutoSaveIndicator } from "../components/AutoSaveIndicator";
import { CoreFlowProgress } from "../components/CoreFlowProgress";
import { PageShell } from "../components/PageShell";
import { ScreenGuide } from "../components/ScreenGuide";
import { SCREEN_GUIDES } from "../components/screen-guides";
import { InlineStatusMessage } from "../components/states/InlineStatusMessage";
import { useIsMobile } from "../components/ui/use-mobile";
import { cn } from "../components/ui/utils";
import { useDirtyFormGuard } from "../hooks/useDirtyFormGuard";
import { useSaveStatus } from "../hooks/useSaveStatus";
import { useScrollToTopOnChange } from "../hooks/useScrollToTopOnChange";
import { trackAnalyticsEvent } from "../utils/analytics";
import { hasRealLifeBalance } from "../utils/core-flow-guard";
import { getLifeAreaLabel, getUserData, LIFE_AREAS, type LifeArea, updateWheelOfLife } from "../utils/storage";
import { mergeOnboardingLifeAreas } from "../utils/onboarding-life-areas";
import { ZenBreathingGate } from "./Onboarding/components/ZenBreathingGate";
import { FloatingSparkles } from "./Onboarding/components/FloatingSparkles";
import { HeroSection } from "./Onboarding/components/HeroSection";
import { LifeAtlasWheel } from "./Onboarding/components/LifeAtlasWheel";
import { AreaPickerCard } from "./Onboarding/components/AreaPickerCard";

type OnboardingStep = "welcome" | "assessment";

type AutoSaveDraftStatus = "idle" | "saving" | "saved";

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

const LIFE_AREA_QUESTIONS: Record<string, string> = {
  Career: "Bạn hài lòng bao nhiêu với công việc và hướng đi nghề nghiệp hiện tại?",
  Finance: "Bạn cảm thấy an tâm bao nhiêu với tình hình tài chính hiện tại?",
  Health: "Bạn đánh giá thế nào về sức khỏe thể chất và tinh thần hiện tại?",
  Education: "Bạn hài lòng bao nhiêu với tốc độ học hỏi và phát triển kiến thức?",
  Relationships: "Bạn cảm thấy thế nào về chất lượng các mối quan hệ xung quanh?",
  Family: "Bạn hài lòng bao nhiêu với sự gắn kết và bình yên trong gia đình?",
  "Personal Growth": "Bạn đánh giá thế nào về mức kỷ luật và sự hiểu mình hiện tại?",
  Leisure: "Bạn hài lòng bao nhiêu với thời gian nghỉ ngơi và giải trí?",
};

const LIFE_AREA_SHORT_LABELS: Partial<Record<LifeArea["name"], string>> = {
  Relationships: "Quan hệ",
  "Personal Growth": "Phát triển",
};

interface ScoreAnchor {
  range: string;
  label: string;
  description: string;
}

const SCORE_ANCHORS: ScoreAnchor[] = [
  { range: "1–2", label: "Rất chật vật", description: "Gần như không có hoặc đang rất khó khăn" },
  { range: "3–4", label: "Thiếu ổn định", description: "Có nhưng thiếu động lực hoặc bế tắc" },
  { range: "5–6", label: "Tạm ổn", description: "Chưa tệ nhưng chưa thực sự hài lòng" },
  { range: "7–8", label: "Khá tốt", description: "Đang trên đà tiến triển tích cực" },
  { range: "9–10", label: "Rất tốt", description: "Rất hài lòng, đúng hướng và có năng lượng" },
];

const SCORE_VALUES = Array.from({ length: 11 }, (_, score) => score);

function getActiveScoreAnchor(score: number): ScoreAnchor | null {
  if (score <= 2) return SCORE_ANCHORS[0];
  if (score <= 4) return SCORE_ANCHORS[1];
  if (score <= 6) return SCORE_ANCHORS[2];
  if (score <= 8) return SCORE_ANCHORS[3];
  return SCORE_ANCHORS[4];
}

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

const AREA_DESIGN_ICON_STYLES: Array<{ accent: string; bg: string; border: string }> = [
  { accent: "#2563EB", bg: "#EEF3FE", border: "rgba(37,99,235,0.3)" },
  { accent: "#E7A400", bg: "#FDF6E3", border: "rgba(231,164,0,0.3)" },
  { accent: "#16A34A", bg: "#E9F7EE", border: "rgba(22,163,74,0.3)" },
  { accent: "#7C5CFC", bg: "#F0EDFE", border: "rgba(124,92,252,0.3)" },
  { accent: "#E8456B", bg: "#FDEBF0", border: "rgba(232,69,107,0.3)" },
  { accent: "#0E9F8E", bg: "#E5F6F3", border: "rgba(14,159,142,0.3)" },
  { accent: "#EA7A2B", bg: "#FDF1E7", border: "rgba(234,122,43,0.3)" },
  { accent: "#2BA8E0", bg: "#E7F4FC", border: "rgba(43,168,224,0.3)" },
];

function getDesignIconStyle(index: number) {
  return AREA_DESIGN_ICON_STYLES[index] ?? { accent: "#A8A296", bg: "var(--app-bg)", border: "rgba(23,21,15,0.1)" };
}

function getCalmLifeAreaIcon(areaName: string): LucideIcon {
  return LIFE_AREA_ICON_MAP[areaName] ?? Compass;
}

export const ONBOARDING_DRAFT_STORAGE_KEY = "onboarding_draft";
const ONBOARDING_DRAFT_VERSION = 1;

const createDefaultOnboardingLifeAreas = () => LIFE_AREAS.map((area) => ({ ...area, score: 5 }));

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

    const lifeAreas = mergeOnboardingLifeAreas(parsed.lifeAreas, normalizeDraftScore);
    const reviewedAreaIndices = Array.isArray(parsed.reviewedAreaIndices)
      ? parsed.reviewedAreaIndices.filter(
          (index): index is number => Number.isInteger(index) && index >= 0 && index < lifeAreas.length,
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

function getScoreFeedback(score: number): { emoji: string; text: string; color: string } {
  if (score <= 2) return { emoji: "🌱", text: "Không sao, đây là điểm bắt đầu", color: "var(--app-status-error)" };
  if (score <= 4) return { emoji: "🌿", text: "Còn nhiều chỗ để phát triển", color: "var(--app-status-warning)" };
  if (score <= 6) return { emoji: "🍀", text: "Tạm ổn, có thể tốt hơn", color: "var(--app-status-warning)" };
  if (score <= 8) return { emoji: "🌳", text: "Khá tốt, giữ vững nhé", color: "var(--app-status-success)" };
  return { emoji: "✨", text: "Tuyệt vời!", color: "#16A34A" };
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
  const activeAreaHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const didFocusActiveAreaRef = useRef(false);
  const autosaveTimerRef = useRef<number | null>(null);
  const [showBreathing, setShowBreathing] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isScoreGuideOpen, setIsScoreGuideOpen] = useState(false);
  const [activeAreaIndex, setActiveAreaIndex] = useState<number | null>(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    const listener = (event: MediaQueryListEvent) => setPrefersReducedMotion(event.matches);
    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    void activeAreaIndex;
    if (step !== "assessment") {
      didFocusActiveAreaRef.current = false;
      return;
    }

    if (!didFocusActiveAreaRef.current) {
      didFocusActiveAreaRef.current = true;
      return;
    }

    activeAreaHeadingRef.current?.focus({ preventScroll: true });
  }, [activeAreaIndex, step]);

  useEffect(() => {
    if (!isMobile) {
      setIsScoreGuideOpen(true);
      return;
    }

    setIsScoreGuideOpen(false);
  }, [isMobile]);

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
    navigate("/life-balance?tab=focus");
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

  // Save-status UI cho autosave bản nháp: phân giải qua resolveSaveStatus, giữ
  // "đã lưu" tối thiểu 2s ở lớp UI (Req 13.4, 13.5). Khi chưa có lần lưu nào
  // (mới vào màn hình) hiển thị mặc định "đã lưu cục bộ" như trước.
  const draftSaveStatus = useSaveStatus({
    saving: autoSaveStatus === "saving",
    lastSavedAt,
  });
  const saveBadgeStatus = draftSaveStatus === "idle" ? "saved" : draftSaveStatus;

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
        saveBadge={<AutoSaveIndicator status={saveBadgeStatus} lastSavedAt={lastSavedAt} variant="default" />}
        className="mb-0"
      />
    </div>
  );

  const draftBanner = availableDraft ? (
    <InlineStatusMessage tone="info" prefix="Bản nháp cũ của bạn:">
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-medium leading-6">Bạn có một bản nháp Cân bằng cuộc sống chưa hoàn tất.</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center rounded-pill bg-app-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-app-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2"
            onClick={handleResumeDraft}
          >
            Tiếp tục bản nháp
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center justify-center rounded-pill border border-app-line bg-app-surface px-4 py-2 text-sm font-semibold text-app-ink-soft transition-colors hover:bg-app-bg-subtle hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2"
            onClick={handleRestartDraft}
          >
            Làm lại từ đầu
          </button>
        </div>
      </div>
    </InlineStatusMessage>
  ) : null;

  if (step === "welcome") {
    return (
      <PageShell maxWidth="xl" className="focus:outline-none">
        <motion.div
          initial={{ opacity: 0, x: -15 }}
          animate={{ opacity: 1, x: 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.28, ease: "easeOut" }}
          ref={flowTopRef}
          tabIndex={-1}
          className="dof-stagger relative flex flex-col gap-5 focus:outline-none"
        >
          <FloatingSparkles />
          <ScreenGuide {...SCREEN_GUIDES.onboarding} autoOpen />
          {progressHeader}

          {showBreathing ? (
            <div className="rounded-card border border-app-line bg-app-surface p-5 shadow-app-sm sm:p-6">
              <ZenBreathingGate onComplete={handleStartAssessment} />
            </div>
          ) : (
            <>
              {isReturning ? (
                <div className="flex items-start gap-3 rounded-[14px] border border-app-accent/20 bg-app-accent-subtle px-4 py-3.5 sm:items-center sm:px-[18px]">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0 text-app-accent"
                    aria-hidden="true"
                  >
                    <path d="M21.801 10A10 10 0 1 1 17 3.335" />
                    <path d="m9 11 3 3L22 4" />
                  </svg>
                  <span className="text-[13px] leading-relaxed text-[#3F4A3F]">
                    <strong className="font-semibold text-app-accent">Cập nhật điểm hiện tại.</strong> Điểm cũ đã được
                    tải sẵn, bạn chỉ điều chỉnh phần thay đổi, không tạo lại từ đầu.
                  </span>
                </div>
              ) : null}

              {draftBanner}

              <HeroSection
                onStart={handleStartAssessment}
                onBreathing={() => setShowBreathing(true)}
                onDefer={handleDefer}
                onHelpToggle={() => setIsHelpOpen(!isHelpOpen)}
                isHelpOpen={isHelpOpen}
              >
                <div className="relative">
                  <div className="absolute -inset-4 rounded-full bg-gradient-to-br from-app-accent/10 to-transparent blur-2xl" />
                  <LifeAtlasWheel
                    lifeAreas={lifeAreas}
                    reviewedAreaIndices={reviewedAreaIndices}
                    activeAreaIndex={null}
                    averageScore={averageScore}
                    mode="welcome"
                    className="relative"
                  />
                </div>
              </HeroSection>
            </>
          )}
        </motion.div>
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth="xl" className="focus:outline-none">
      <motion.div
        initial={{ opacity: 0, x: 15 }}
        animate={{ opacity: 1, x: 0 }}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.28, ease: "easeOut" }}
        ref={flowTopRef}
        tabIndex={-1}
        className="dof-stagger flex w-full max-w-full flex-col gap-5 focus:outline-none"
      >
        <ScreenGuide {...SCREEN_GUIDES.onboarding} autoOpen />
        {progressHeader}
        {draftBanner}

        <header className="max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-app-accent">
            <Sparkles className="h-3.5 w-3.5 motion-safe:animate-pulse motion-reduce:animate-none" aria-hidden="true" />
            Bước 1 / 3 · Bánh xe cuộc sống
          </div>
          <h1 className="font-serif text-[28px] font-semibold leading-tight text-app-ink sm:text-4xl">
            Rà 8 lĩnh vực để mở Life Insight
          </h1>
          <p className="max-w-2xl text-[13px] leading-[var(--text-sm--line-height)] text-app-ink-soft sm:text-base sm:leading-6">
            Chấm theo cảm nhận hiện tại. Bản đồ bên cạnh sẽ chỉ ra vùng mạnh và vùng cần chăm sóc đầu tiên.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start">
          <aside className="order-2 lg:sticky lg:top-6 lg:order-2">
            <div className="rounded-card-lg border border-app-line bg-app-surface p-4 shadow-app-md sm:p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-app-accent">Atlas gấp mở</p>
                  <h2 className="mt-1 font-serif text-[20px] font-bold leading-tight tracking-tight text-app-ink sm:text-[21px]">
                    Bản đồ cuộc sống của bạn
                  </h2>
                </div>
                <span className="shrink-0 rounded-pill border border-app-line bg-app-bg-subtle px-3 py-1 text-[11.5px] font-semibold text-app-ink-soft">
                  {reviewedAreaCount}/{lifeAreas.length}
                </span>
              </div>

              <LifeAtlasWheel
                lifeAreas={lifeAreas}
                reviewedAreaIndices={reviewedAreaIndices}
                activeAreaIndex={activeAreaIndex}
                averageScore={averageScore}
                mode="assessment"
                onWedgeClick={(index) => setActiveAreaIndex(index)}
              />

              <div
                data-testid="onboarding-assessment-summary"
                className="mt-4 grid grid-cols-2 gap-2.5 text-left sm:gap-3"
                role="status"
                aria-live="polite"
              >
                <div className="rounded-control border border-app-line bg-app-bg-subtle px-3 py-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-app-ink-muted">Điểm trung bình</span>
                  <p className="mt-1 font-serif text-xl font-bold tabular-nums text-app-ink">
                    {averageScore.toFixed(1)}
                    <span className="text-xs font-normal text-app-ink-muted">/10</span>
                  </p>
                </div>
                <div className="rounded-control border border-app-line bg-app-bg-subtle px-3 py-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-app-ink-muted">Đã rà</span>
                  <p className="mt-1 font-serif text-xl font-bold tabular-nums text-app-ink">
                    {reviewedAreaCount}/{lifeAreas.length}
                  </p>
                </div>
                <div className="rounded-control border border-app-line bg-app-bg-subtle px-3 py-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-app-ink-muted">Cần chăm sóc</span>
                  <p className="mt-1 break-words text-sm font-bold text-[color:var(--color-warning-fg)]">
                    {getLifeAreaLabel(growthArea.name)} ({growthArea.score}đ)
                  </p>
                </div>
                <div className="rounded-control border border-app-line bg-app-bg-subtle px-3 py-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-app-ink-muted">Đang mạnh</span>
                  <p className="mt-1 break-words text-sm font-bold text-[color:var(--color-success-fg)]">
                    {getLifeAreaLabel(strongestArea.name)} ({strongestArea.score}đ)
                  </p>
                </div>
              </div>
            </div>
          </aside>

          <div className="order-1 min-w-0 space-y-4 sm:space-y-[18px] lg:order-1">
            <div className="rounded-card border border-app-line/60 bg-white px-4 py-4 sm:rounded-[20px] sm:px-6 sm:py-[22px]">
              <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.1em] text-app-ink-muted sm:mb-[14px]">
                Chọn lĩnh vực đang rà
              </p>
              <div data-onboarding-area-grid className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-[11px]">
                {lifeAreas.map((area, index) => {
                  const AreaIcon = getCalmLifeAreaIcon(area.name);
                  const isSelected = activeAreaIndex === index;
                  const isReviewed = reviewedAreaIndices.has(index);
                  const designStyle = getDesignIconStyle(index);
                  const label = getLifeAreaLabel(area.name);
                  const compactLabel = LIFE_AREA_SHORT_LABELS[area.name] ?? label;

                  return (
                    <AreaPickerCard
                      key={area.name}
                      area={area}
                      index={index}
                      isSelected={isSelected}
                      isReviewed={isReviewed}
                      icon={AreaIcon}
                      label={label}
                      compactLabel={compactLabel}
                      accent={designStyle.accent}
                      bg={designStyle.bg}
                      onClick={() => setActiveAreaIndex(index)}
                    />
                  );
                })}
              </div>
            </div>

            {(() => {
              const index = activeAreaIndex ?? 0;
              const area = lifeAreas[index];
              if (!area) return null;

              const AreaIcon = getCalmLifeAreaIcon(area.name);
              const areaLabel = getLifeAreaLabel(area.name);
              const designStyle = getDesignIconStyle(index);
              const sliderPct = (area.score / 10) * 100;
              const feedback = getScoreFeedback(area.score);

              return (
                <motion.div
                  key={area.name}
                  initial={prefersReducedMotion ? {} : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="rounded-card border border-app-line/60 bg-white px-4 py-5 sm:rounded-[20px] sm:px-[26px] sm:py-6"
                >
                  <div className="mb-4 flex items-start justify-between gap-3 sm:mb-5 sm:items-center sm:gap-4">
                    <div className="flex min-w-0 items-center gap-3 sm:gap-[14px]">
                      <span
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control sm:h-12 sm:w-12 sm:rounded-[13px]"
                        style={{ background: designStyle.bg, color: designStyle.accent }}
                      >
                        <AreaIcon className="h-5 w-5 sm:h-[22px] sm:w-[22px]" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="mb-[3px] text-[10px] font-bold uppercase tracking-[0.1em] text-app-ink-muted">
                          Lĩnh vực {index + 1} / 8
                        </p>
                        <h2
                          ref={activeAreaHeadingRef}
                          tabIndex={-1}
                          className="text-[20px] font-bold leading-tight -tracking-[0.01em] text-app-ink focus:outline-none sm:text-[22px] sm:leading-none"
                          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                        >
                          {areaLabel}
                        </h2>
                      </div>
                    </div>
                    <div
                      className="shrink-0 rounded-control border border-app-line/60 px-3 py-[9px] text-right sm:rounded-[13px] sm:px-4 sm:py-[11px]"
                      style={{ background: "var(--app-bg-subtle)" }}
                    >
                      <p className="mb-[3px] text-[9.5px] font-bold uppercase tracking-[0.08em] text-app-ink-muted">
                        Điểm hiện tại
                      </p>
                      <p
                        className="text-2xl font-extrabold leading-none"
                        style={{ fontFamily: "'Bricolage Grotesque', sans-serif", color: designStyle.accent }}
                      >
                        {area.score}
                        <span className="text-sm font-bold text-app-ink-muted">/10</span>
                      </p>
                    </div>
                  </div>

                  <div className="mb-5 rounded-[13px] border border-app-line/60 bg-app-bg-subtle p-4 sm:mb-[22px] sm:rounded-[14px] sm:p-[18px_20px]">
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-app-ink-muted sm:mb-[9px]">
                      Câu hỏi đánh giá
                    </p>
                    <p className="mb-1.5 text-[14px] font-bold leading-[var(--text-xs--line-height)] text-app-ink sm:mb-[6px] sm:text-[15px] sm:leading-[var(--text-xl--line-height)]">
                      {LIFE_AREA_QUESTIONS[area.name] ?? "Bạn hài lòng bao nhiêu với khía cạnh này?"}
                    </p>
                    <p className="text-[12.5px] leading-[var(--text-lg--line-height)] text-app-ink-muted">
                      {LIFE_AREA_DETAILS[area.name] ?? "Một phần quan trọng trong cuộc sống của bạn."}
                    </p>
                  </div>

                  <div className="mb-4 flex items-center justify-between rounded-control border border-app-line/40 bg-app-bg-subtle p-3 sm:p-4">
                    <span className="text-2xl" aria-hidden="true">
                      {feedback.emoji}
                    </span>
                    <span className="text-right text-[13px] font-semibold" style={{ color: feedback.color }}>
                      {feedback.text}
                    </span>
                  </div>

                  <p className="mb-3 text-[13px] font-semibold text-app-ink">Chọn điểm theo cảm nhận hiện tại</p>
                  <div
                    data-onboarding-score-grid
                    className="mb-5 grid grid-cols-4 gap-2 sm:mb-[22px] sm:flex sm:flex-wrap sm:gap-[9px]"
                  >
                    {SCORE_VALUES.map((scoreVal) => {
                      const isCurrentScore = area.score === scoreVal;
                      return (
                        <motion.button
                          key={`score-${scoreVal}`}
                          type="button"
                          onClick={() => handleScoreChangeWrapped(index, [scoreVal])}
                          whileTap={prefersReducedMotion ? {} : { scale: 0.9 }}
                          className="dof-num inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-full border font-[inherit] text-[14px] font-bold transition-[transform,background,color] duration-[0.12s] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 sm:h-[42px] sm:min-h-[42px] sm:w-[42px]"
                          style={{
                            borderColor: isCurrentScore ? designStyle.accent : "rgba(23,21,15,0.12)",
                            background: isCurrentScore ? designStyle.accent : "var(--app-bg-subtle)",
                            color: isCurrentScore ? "#fff" : "var(--app-ink-soft)",
                            boxShadow: isCurrentScore ? `0 8px 18px -8px ${designStyle.accent}b3` : "none",
                          }}
                          aria-label={`Chấm ${scoreVal} điểm`}
                          aria-pressed={isCurrentScore}
                        >
                          {scoreVal}
                        </motion.button>
                      );
                    })}
                  </div>

                  <div className="mb-5 space-y-2.5 sm:mb-6">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-app-ink-muted">Mốc tham khảo</p>
                      {isMobile ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded-full border border-app-line/60 bg-app-bg-subtle px-3 py-1.5 text-[11px] font-semibold text-app-ink-soft transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2"
                          onClick={() => setIsScoreGuideOpen((current) => !current)}
                          aria-expanded={isScoreGuideOpen}
                          aria-controls="onboarding-score-guide"
                        >
                          {isScoreGuideOpen ? "Ẩn mốc" : "Xem đủ mốc"}
                          {isScoreGuideOpen ? (
                            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                          )}
                        </button>
                      ) : null}
                    </div>
                    {isMobile ? (
                      <div className="flex items-center gap-[11px] rounded-[11px] border border-app-accent/20 bg-app-accent-subtle p-[11px_14px]">
                        <span className="shrink-0 rounded-[7px] bg-app-accent px-[9px] py-[3px] font-mono text-[11.5px] font-bold text-white">
                          {getActiveScoreAnchor(area.score)?.range}
                        </span>
                        <div className="min-w-0">
                          <span className="text-[13px] font-bold text-app-accent">
                            {getActiveScoreAnchor(area.score)?.label}
                          </span>
                          <span className="mx-1.5 text-app-ink-muted">·</span>
                          <span className="text-[12.5px] text-app-ink-soft">
                            {getActiveScoreAnchor(area.score)?.description}
                          </span>
                        </div>
                      </div>
                    ) : null}
                    <div
                      id="onboarding-score-guide"
                      className={cn("flex-col gap-2", isMobile ? (isScoreGuideOpen ? "flex" : "hidden") : "flex")}
                    >
                      {SCORE_ANCHORS.map((anchor) => {
                        const activeAnchor = getActiveScoreAnchor(area.score);
                        const isActive = activeAnchor === anchor;
                        return (
                          <div
                            key={anchor.range}
                            className="flex items-center gap-[11px] rounded-[11px] border p-[11px_14px]"
                            style={{
                              borderColor: isActive ? "var(--app-accent-border, rgba(12,94,58,0.3))" : "var(--app-line)",
                              background: isActive ? "var(--app-accent-subtle)" : "#fff",
                            }}
                          >
                            <span
                              className="shrink-0 rounded-[7px] px-[9px] py-[3px] font-mono text-[11.5px] font-bold"
                              style={{
                                background: isActive ? "var(--app-accent)" : "var(--app-bg)",
                                color: isActive ? "#fff" : "#8C887C",
                              }}
                            >
                              {anchor.range}
                            </span>
                            <div className="min-w-0">
                              <span
                                className="text-[13px] font-bold"
                                style={{ color: isActive ? "var(--app-accent)" : "var(--app-ink)" }}
                              >
                                {anchor.label}
                              </span>
                              <span className="mx-1.5 text-app-ink-muted">·</span>
                              <span className="text-[12.5px] text-app-ink-muted">{anchor.description}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mb-[11px] flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-app-ink">Hoặc kéo thanh trượt</span>
                    <span
                      className="inline-flex items-center rounded-[999px] border border-[rgba(231,164,0,0.25)] px-[11px] py-1 font-mono text-xs font-semibold"
                      style={{ background: "#FFF8DE", color: "#9A7B00" }}
                    >
                      {area.score}đ · {getActiveScoreAnchor(area.score)?.label}
                    </span>
                  </div>
                  <div className="mb-[22px] flex items-center gap-3 sm:mb-[26px] sm:gap-[14px]">
                    <button
                      type="button"
                      className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-app-line/60 bg-white font-[inherit] text-[20px] font-semibold text-app-ink-soft transition-colors hover:bg-app-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 sm:h-10 sm:w-10"
                      onClick={() => handleScoreChangeWrapped(index, [Math.max(0, area.score - 1)])}
                      aria-label="Giảm 1 điểm"
                    >
                      −
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      value={area.score}
                      onChange={(e) => handleScoreChangeWrapped(index, [parseInt(e.target.value, 10)])}
                      className="dof-range h-2 flex-1 cursor-pointer appearance-none rounded-full"
                      style={{
                        background: `linear-gradient(90deg, ${designStyle.accent} ${sliderPct}%, #E4E0D4 ${sliderPct}%)`,
                      }}
                      aria-label={`Điểm ${areaLabel}`}
                    />
                    <button
                      type="button"
                      className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-app-line/60 bg-white font-[inherit] text-[20px] font-semibold text-app-ink-soft transition-colors hover:bg-app-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 sm:h-10 sm:w-10"
                      onClick={() => handleScoreChangeWrapped(index, [Math.min(10, area.score + 1)])}
                      aria-label="Tăng 1 điểm"
                    >
                      +
                    </button>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-app-line/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[11px] border border-app-line/60 bg-white px-[18px] py-[11px] font-[inherit] text-[13px] font-semibold text-app-ink-soft transition-colors hover:bg-app-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:justify-start"
                      disabled={index === 0}
                      onClick={() => setActiveAreaIndex(index - 1)}
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="m12 19-7-7 7-7" />
                        <path d="M19 12H5" />
                      </svg>
                      Lĩnh vực trước
                    </button>

                    <div className="flex w-full min-w-0 flex-col-reverse gap-2.5 sm:w-auto sm:flex-row sm:items-center sm:gap-[14px]">
                      <button
                        type="button"
                        className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-[11px] border border-app-line/60 bg-white px-4 py-2.5 font-[inherit] text-[13px] font-semibold text-app-ink-muted transition-colors hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 sm:min-h-0 sm:w-auto sm:justify-start sm:rounded-none sm:border-none sm:bg-transparent sm:px-0 sm:py-0"
                        onClick={() => {
                          handleSkipArea(index);
                          if (index < 7) setActiveAreaIndex(index + 1);
                        }}
                      >
                        Bỏ qua
                      </button>

                      <motion.button
                        type="button"
                        whileTap={prefersReducedMotion ? {} : { scale: 0.97 }}
                        className="dof-primary inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-[9px] rounded-[11px] border-none px-[22px] py-3 font-[inherit] text-[13.5px] font-bold text-white transition-[transform,box-shadow] duration-[0.18s] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 sm:min-h-0 sm:w-auto"
                        style={{
                          background: designStyle.accent,
                          boxShadow: `0 12px 26px -14px ${designStyle.accent}cc`,
                        }}
                        onClick={() => {
                          markAreaReviewed(index);
                          if (index < 7) {
                            setActiveAreaIndex(index + 1);
                          } else {
                            completeAssessment();
                          }
                        }}
                      >
                        {index < 7 ? "Rà lĩnh vực tiếp theo" : "Chọn trọng tâm"}
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              );
            })()}

            {!canCompleteAssessment && (
              <div
                role="status"
                aria-live="polite"
                className="flex items-start gap-3 rounded-[14px] border border-app-accent/20 bg-app-accent-subtle p-4"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-0.5 shrink-0 text-app-accent"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
                <p className="text-[13px] font-medium leading-[var(--text-lg--line-height)] text-[#3F4A3F]">
                  Còn <strong className="font-semibold text-app-accent">{remainingAreaCount} khía cạnh</strong> chưa
                  chấm. Bạn có thể chọn trọng tâm với điểm mặc định 5 cho phần còn lại.
                </p>
              </div>
            )}
          </div>
        </div>

        <footer
          data-onboarding-bottom-nav
          className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-3 border-t border-app-line/60 bg-app-bg/80 px-4 py-4 backdrop-blur-sm sm:mx-0 sm:flex-row sm:items-center sm:justify-between sm:gap-[14px] sm:rounded-t-card sm:bg-white/80 sm:px-6"
        >
          <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
            <button
              type="button"
              className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[11px] border border-app-line/60 bg-white px-[18px] py-3 font-[inherit] text-[13px] font-semibold text-app-ink-soft transition-colors hover:bg-app-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 sm:w-auto sm:justify-start"
              onClick={() => setStep("welcome")}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m12 19-7-7 7-7" />
                <path d="M19 12H5" />
              </svg>
              Quay lại chào mừng
            </button>
            <button
              type="button"
              className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-[11px] px-4 py-2.5 font-[inherit] text-[13px] font-semibold text-app-ink-muted transition-colors hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 sm:min-h-0 sm:w-auto sm:justify-start sm:px-0 sm:py-0"
              onClick={handleDefer}
            >
              Để sau
            </button>
          </div>
          <button
            id="btn-complete-onboarding"
            type="button"
            className="dof-primary inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-[9px] rounded-[13px] border-none bg-app-accent px-[26px] py-[13px] font-[inherit] text-[14px] font-bold text-white shadow-[0_14px_30px_-14px_rgba(12,94,58,0.8)] transition-[transform,box-shadow] duration-[0.18s] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 sm:w-auto"
            onClick={canCompleteAssessment ? handleComplete : handleDeferAssessment}
          >
            Chọn trọng tâm
            {!canCompleteAssessment ? <span className="sr-only"> (Dùng điểm mặc định)</span> : null}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </footer>
      </motion.div>
    </PageShell>
  );
}
