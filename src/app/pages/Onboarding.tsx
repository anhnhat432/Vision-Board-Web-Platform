import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  ChevronDown,
  ChevronUp,
  Compass,
  HeartPulse,
  Home,
  Info,
  type LucideIcon,
  Smile,
  Sparkles,
  Sprout,
  Users,
  WalletCards,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { toast } from "sonner";

import { AutoSaveIndicator } from "../components/AutoSaveIndicator";
import { CoreFlowProgress } from "../components/CoreFlowProgress";
import { PageShell } from "../components/PageShell";
import { SimpleRadarChart } from "../components/SimpleRadarChart";
import { InlineStatusMessage } from "../components/states/InlineStatusMessage";
import { Slider } from "../components/ui/slider";
import { cn } from "../components/ui/utils";
import { useDirtyFormGuard } from "../hooks/useDirtyFormGuard";
import { useScrollToTopOnChange } from "../hooks/useScrollToTopOnChange";
import { trackAnalyticsEvent } from "../utils/analytics";
import { hasRealLifeBalance } from "../utils/core-flow-guard";
import { getLifeAreaLabel, getUserData, LIFE_AREAS, type LifeArea, updateWheelOfLife } from "../utils/storage";
import { ZenBreathingGate } from "./Onboarding/components/ZenBreathingGate";

type OnboardingStep = "welcome" | "assessment";

type AutoSaveDraftStatus = "idle" | "saving" | "saved";

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
        bgLight: "bg-blue-50/60 dark:bg-blue-950/20",
        text: "text-blue-600 dark:text-blue-450",
        border: "border-blue-100 dark:border-blue-900/30",
        accent: "#3b82f6",
        glow: "shadow-blue-500/10 dark:shadow-blue-500/20",
      };
    case "Finance":
      return {
        bgLight: "bg-amber-50/60 dark:bg-amber-950/20",
        text: "text-amber-600 dark:text-amber-450",
        border: "border-amber-100 dark:border-amber-900/30",
        accent: "#f59e0b",
        glow: "shadow-amber-500/10 dark:shadow-amber-500/20",
      };
    case "Health":
      return {
        bgLight: "bg-emerald-50/60 dark:bg-emerald-950/20",
        text: "text-emerald-600 dark:text-emerald-450",
        border: "border-emerald-100 dark:border-emerald-900/30",
        accent: "#10b981",
        glow: "shadow-emerald-500/10 dark:shadow-emerald-500/20",
      };
    case "Education":
      return {
        bgLight: "bg-indigo-50/60 dark:bg-indigo-950/20",
        text: "text-indigo-600 dark:text-indigo-450",
        border: "border-indigo-100 dark:border-indigo-900/30",
        accent: "#6366f1",
        glow: "shadow-indigo-500/10 dark:shadow-indigo-500/20",
      };
    case "Relationships":
      return {
        bgLight: "bg-rose-50/60 dark:bg-rose-950/20",
        text: "text-rose-600 dark:text-rose-450",
        border: "border-rose-100 dark:border-rose-900/30",
        accent: "#f43f5e",
        glow: "shadow-rose-500/10 dark:shadow-rose-500/20",
      };
    case "Family":
      return {
        bgLight: "bg-teal-50/60 dark:bg-teal-950/20",
        text: "text-teal-600 dark:text-teal-450",
        border: "border-teal-100 dark:border-teal-900/30",
        accent: "#14b8a6",
        glow: "shadow-teal-500/10 dark:shadow-teal-500/20",
      };
    case "Personal Growth":
      return {
        bgLight: "bg-orange-50/60 dark:bg-orange-950/20",
        text: "text-orange-600 dark:text-orange-450",
        border: "border-orange-100 dark:border-orange-900/30",
        accent: "#f97316",
        glow: "shadow-orange-500/10 dark:shadow-orange-500/20",
      };
    case "Leisure":
      return {
        bgLight: "bg-sky-50/60 dark:bg-sky-950/20",
        text: "text-sky-600 dark:text-sky-450",
        border: "border-sky-100 dark:border-sky-900/30",
        accent: "#0ea5e9",
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

const LIFE_AREA_QUESTIONS: Record<string, string[]> = {
  Career: [
    "Bạn có thấy công việc hiện tại có ý nghĩa và tiến triển tốt?",
    "Môi trường làm việc có giúp bạn học hỏi và phát triển kỹ năng?",
    "Mức độ hài lòng với vị trí và lộ trình nghề nghiệp hiện tại?",
  ],
  Finance: [
    "Thu nhập hiện tại có đáp ứng tốt các nhu cầu thiết yếu?",
    "Bạn có cảm giác an tâm với quỹ dự phòng và các khoản tiết kiệm?",
    "Kế hoạch tài chính dài hạn của bạn có rõ ràng không?",
  ],
  Health: [
    "Mức năng lượng hằng ngày của bạn có đủ để làm việc hiệu quả?",
    "Chế độ ăn uống, giấc ngủ và tập luyện có đang được duy trì tốt?",
    "Sức khỏe tinh thần của bạn có đang ở trạng thái cân bằng?",
  ],
  Education: [
    "Bạn có đang chủ động học hỏi thêm kiến thức mới hoặc kỹ năng mới?",
    "Có dành thời gian đọc sách hay tham gia các khóa học nâng cấp bản thân?",
    "Khả năng thích nghi trước các xu hướng mới có tốt không?",
  ],
  Relationships: [
    "Bạn bè xung quanh có đem lại nguồn năng lượng tích cực không?",
    "Mối quan hệ yêu đương/đối tác có thấu hiểu và sẻ chia tốt?",
    "Mức độ gắn kết với các cộng đồng hoặc hội nhóm của bạn?",
  ],
  Family: [
    "Thời gian bạn dành cho gia đình có chất lượng không?",
    "Mức độ thấu hiểu, yêu thương và giúp đỡ lẫn nhau giữa các thành viên?",
    "Bạn có cảm giác bình yên và điểm tựa vững chắc mỗi khi về nhà?",
  ],
  "Personal Growth": [
    "Bạn có thấu hiểu điểm mạnh, điểm yếu và các giá trị cốt lõi của mình?",
    "Mức độ duy trì các thói quen tốt và kỷ luật với chính mình?",
    "Bạn có đang sống đúng với định hướng và lý tưởng cá nhân?",
  ],
  Leisure: [
    "Bạn có thời gian nghỉ ngơi trọn vẹn, tách biệt khỏi công việc?",
    "Có đang duy trì các sở thích, đam mê cá nhân lành mạnh?",
    "Khoảng trống thời gian để tái tạo năng lượng có đủ không?",
  ],
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
  if (score <= 3) return "text-rose-600 dark:text-rose-450 bg-rose-50/70 dark:bg-rose-950/20";
  if (score <= 7) return "text-amber-600 dark:text-amber-450 bg-amber-50/70 dark:bg-amber-950/20";
  return "text-emerald-600 dark:text-emerald-450 bg-emerald-50/70 dark:bg-emerald-950/20";
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
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isRadarExpanded, setIsRadarExpanded] = useState(false);
  const [activeAreaIndex, setActiveAreaIndex] = useState<number | null>(0);
  const [isQuestionsOpen, setIsQuestionsOpen] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: close questions when active area changes
  useEffect(() => {
    setIsQuestionsOpen(false);
  }, [activeAreaIndex]);

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
    <InlineStatusMessage
      tone="info"
      prefix="Bản nháp cũ của bạn:"
      className="bg-neutral-50 dark:bg-neutral-900 border-neutral-200/80 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between w-full">
        <p className="leading-relaxed text-xs font-semibold">
          Bạn có một bản nháp khảo sát Cân bằng cuộc sống chưa hoàn tất.
        </p>
        <div className="flex flex-row gap-2">
          <button
            type="button"
            className="inline-flex min-h-9 items-center justify-center rounded-full bg-emerald-700 hover:bg-emerald-800 px-4 py-1 text-xs font-bold text-white transition-all duration-200 active:scale-[0.98] cursor-pointer"
            onClick={handleResumeDraft}
          >
            Tiếp tục
          </button>
          <button
            type="button"
            className="inline-flex min-h-9 items-center justify-center rounded-full border border-neutral-200 bg-white px-4 py-1 text-xs font-semibold text-neutral-600 hover:bg-neutral-50 active:scale-[0.98] cursor-pointer"
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

              <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-stretch animate-fade-in w-full">
                <div className="surface-raised rounded-3xl border border-neutral-200/60 dark:border-neutral-800 bg-gradient-to-br from-emerald-50/40 via-white to-amber-50/15 dark:from-emerald-950/10 dark:via-neutral-900/30 dark:to-neutral-950 p-6 md:p-10 shadow-3xs flex flex-col justify-between space-y-6">
                  <div className="space-y-5">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-700 dark:text-emerald-400">
                        Bước 1 / 3 · Đánh giá Bánh xe cuộc sống · ≈2 phút
                      </span>
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 px-3 py-0.5 text-[10px] font-bold tracking-wider text-emerald-700 dark:text-emerald-300 border border-emerald-100/50 dark:border-emerald-900/30 w-fit mt-1">
                        <Compass className="h-3.5 w-3.5 animate-spin-slow" />
                        LIFE BALANCE STUDIO
                      </div>
                    </div>

                    <h1 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight text-app-ink leading-tight">
                      Thiết kế cuộc sống 12 tuần của bạn
                    </h1>

                    <p className="text-xs sm:text-sm font-medium leading-relaxed text-neutral-600 dark:text-neutral-400 font-serif italic max-w-xl">
                      Dành 2 phút rà soát 8 khía cạnh cốt lõi để tìm ra lĩnh vực lệch nhịp ưu tiên thay đổi ngay lập
                      tức.
                    </p>
                  </div>

                  {/* Phần lộ trình ngắn gọn 10 giây tóm tắt */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      className="flex lg:hidden items-center justify-between w-full bg-neutral-100 hover:bg-neutral-200/80 border border-neutral-200 rounded-xl px-4 py-3 text-xs font-bold text-neutral-700 transition-colors cursor-pointer"
                      onClick={() => setIsHelpOpen(!isHelpOpen)}
                    >
                      <span className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-app-accent animate-pulse" />
                        Xem nhanh app sẽ làm gì
                      </span>
                      {isHelpOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>

                    <div
                      className={cn(
                        "bg-[#fafaf9] rounded-2xl border border-neutral-200/60 p-5 space-y-4 shadow-3xs transition-all duration-200",
                        isHelpOpen ? "block animate-fade-in" : "hidden lg:block",
                      )}
                    >
                      <h3 className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5 border-b border-neutral-200 pb-2">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
                        Hành trình bứt phá (10 giây tóm tắt)
                      </h3>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                            1. Ứng dụng giúp gì?
                          </span>
                          <p className="text-xs text-neutral-600 leading-normal font-semibold">
                            Biến mục tiêu lớn thành hành động nhỏ thực tế trong chu kỳ 12 tuần.
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                            2. Bạn cần làm gì lúc này?
                          </span>
                          <p className="text-xs text-neutral-600 leading-normal font-semibold">
                            Chấm điểm 8 khía cạnh để phác thảo <strong>Bản đồ Cân bằng Cuộc sống</strong> (3 phút).
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                            3. Lộ trình còn bao nhiêu bước?
                          </span>
                          <p className="text-xs text-neutral-600 leading-normal font-semibold">
                            Gồm 3 chặng ngắn gọn: <strong>Đánh giá</strong> ➔ <strong>Chọn trọng tâm</strong> ➔{" "}
                            <strong>Lên kế hoạch</strong>.
                          </p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] uppercase font-bold text-neutral-400 block">
                            4. Nhận được gì khi hoàn thành?
                          </span>
                          <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold leading-normal">
                            Bản đồ bánh xe cuộc sống trực quan & Kế hoạch hành động 12 tuần được cá nhân hóa.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Nút bấm CTA chính và phụ phản hồi linh hoạt */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center pt-2">
                    <button
                      type="button"
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-emerald-700 hover:bg-emerald-800 px-8 py-3.5 text-xs font-bold text-white shadow-md transition-all duration-200 hover:-translate-y-px active:scale-[0.99] focus-visible:outline-none cursor-pointer w-full sm:w-auto"
                      onClick={handleStartAssessment}
                    >
                      Bắt đầu rà 8 lĩnh vực (3 phút)
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-full border border-neutral-200 bg-white px-6 py-3 text-xs font-bold text-neutral-700 transition-all duration-200 hover:bg-neutral-50 active:scale-[0.99] focus-visible:outline-none cursor-pointer bg-app-accent"
                      onClick={() => setShowBreathing(true)}
                    >
                      <Sparkles className="h-3.5 w-3.5 text-app-accent" aria-hidden="true" />
                      Tập thở thư giãn
                    </button>

                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2.5 text-[11px] font-bold text-neutral-550 hover:text-neutral-750 focus-visible:outline-none cursor-pointer"
                      onClick={handleDefer}
                    >
                      Để sau
                    </button>
                  </div>
                </div>

                <div className="hidden lg:flex flex-col items-center justify-center surface-raised rounded-3xl border border-neutral-200 bg-gradient-to-br from-emerald-500/[0.03] to-teal-500/[0.03] p-8 shadow-3xs hover:shadow-2xs transition-shadow relative overflow-hidden">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                  <div className="w-full max-w-[260px] rounded-2xl overflow-hidden border border-emerald-250/20 shadow-sm relative z-10 animate-[float_4s_ease-in-out_infinite]">
                    <img 
                      src="/life_balance_checkin.png" 
                      alt="Khảo sát Bánh xe cuộc sống và tự phản tư" 
                      className="w-full h-auto object-cover aspect-[4/3]"
                      loading="lazy"
                    />
                  </div>
                  <p className="mt-6 text-xs font-semibold tracking-wider uppercase text-emerald-800/70 dark:text-emerald-300/70 relative z-10">
                    Bản đồ Cân bằng Cuộc sống
                  </p>
                  <p className="mt-1 text-[11px] text-app-ink-muted text-center max-w-[200px] relative z-10">
                    Phác thảo trạng thái của 8 lĩnh vực cuộc sống ngay lập tức.
                  </p>
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
      <div ref={flowTopRef} tabIndex={-1} className="space-y-6 focus:outline-none w-full max-w-full overflow-hidden">
        {progressHeader}
        {draftBanner}

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-emerald-400">
            <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            Đánh giá Bánh xe cuộc sống (Bước 1/3) · ≈2 phút còn lại
          </div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold tracking-tight text-app-ink">
            Đánh giá mức độ hài lòng của bạn
          </h1>
          <p className="text-xs sm:text-sm text-app-ink-soft max-w-2xl leading-relaxed">
            Dành 15 giây cho mỗi khía cạnh. Sự trung thực lúc này sẽ giúp bạn thiết kế mục tiêu 12 tuần chính xác nhất.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px] lg:items-start w-full">
          <div className="space-y-6 order-1 lg:order-1 min-w-0">
            {/* Thanh điều hướng tiến trình 8 khía cạnh (Step Indicator) */}
            <div className="bg-app-surface border border-app-line rounded-2xl p-4 shadow-app-sm w-full max-w-full overflow-hidden">
              <p className="text-[10px] font-bold uppercase tracking-wider text-app-ink-muted mb-3 text-center sm:text-left">
                Chuyển nhanh giữa các lĩnh vực:
              </p>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none snap-x">
                {lifeAreas.map((area, index) => {
                  const AreaIcon = getCalmLifeAreaIcon(area.name);
                  const isSelected = activeAreaIndex === index;
                  const isReviewed = reviewedAreaIndices.has(index);
                  const colorConfig = getAreaColorConfig(area.name);
                  const label = getLifeAreaLabel(area.name);

                  return (
                    <button
                      key={area.name}
                      type="button"
                      onClick={() => setActiveAreaIndex(index)}
                      className={cn(
                        "relative flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 outline-none shrink-0 border select-none snap-start focus-visible:ring-2 focus-visible:ring-app-accent/30",
                        "after:absolute after:h-[44px] after:min-w-[44px] after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2",
                        isSelected ? "shadow-sm scale-[1.02] font-bold" : "hover:bg-app-bg-subtle/60",
                      )}
                      style={
                        isSelected
                          ? {
                              backgroundColor: colorConfig.accent,
                              borderColor: colorConfig.accent,
                              color: "#FFFFFF",
                            }
                          : {
                              borderColor: isReviewed ? "rgba(16, 185, 129, 0.25)" : "var(--app-line)",
                              backgroundColor: isReviewed ? "var(--green-050)" : "var(--app-surface)",
                              color: isReviewed ? "var(--app-status-success)" : "var(--app-ink-soft)",
                            }
                      }
                      title={label}
                    >
                      <AreaIcon className="h-4 w-4 shrink-0" />
                      <span className="text-xs font-semibold tracking-tight">
                        {index + 1}. {label}
                      </span>
                      {isReviewed && (
                        <>
                          <span className="sr-only">Đã rà</span>
                          <span
                            className={cn(
                              "flex h-4 min-w-4 items-center justify-center rounded-full text-[10px] font-extrabold px-1 shrink-0",
                              isSelected ? "bg-white text-app-accent" : "bg-emerald-500 text-white",
                            )}
                            style={isSelected ? { color: colorConfig.accent } : {}}
                          >
                            {area.score}
                          </span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Thẻ hiển thị khía cạnh hiện tại (Active Wizard Card) */}
            {(() => {
              const index = activeAreaIndex ?? 0;
              const area = lifeAreas[index];
              if (!area) return null;

              const AreaIcon = getCalmLifeAreaIcon(area.name);
              const areaLabel = getLifeAreaLabel(area.name);
              const colorConfig = getAreaColorConfig(area.name);

              return (
                <div
                  className="rounded-2xl border bg-app-surface p-6 md:p-8 space-y-6 transition-all duration-300 shadow-app-md animate-fade-in"
                  style={{ borderColor: colorConfig.accent, boxShadow: `0 12px 36px -12px ${colorConfig.accent}12` }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-app-line/45 pb-4">
                    <div className="flex items-center gap-4">
                      <div
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white shadow-md animate-pulse-slow"
                        style={{ backgroundColor: colorConfig.accent }}
                      >
                        <AreaIcon className="h-7 w-7" />
                      </div>
                      <div>
                        <span
                          className="text-[11px] font-bold uppercase tracking-widest"
                          style={{ color: colorConfig.accent }}
                        >
                          LĨNH VỰC {index + 1} / 8
                        </span>
                        <h2 className="text-2xl font-serif font-bold text-app-ink mt-0.5">{areaLabel}</h2>
                      </div>
                    </div>

                    <div className="flex items-baseline gap-1.5 self-start sm:self-center bg-app-bg-subtle px-3 py-1.5 rounded-xl border border-app-line/60">
                      <span className="text-[11px] text-app-ink-muted font-bold uppercase">Điểm hiện tại:</span>
                      <span
                        className="font-serif text-3xl font-extrabold tabular-nums leading-none"
                        style={{ color: colorConfig.accent }}
                      >
                        {area.score}
                      </span>
                      <span className="text-xs text-app-ink-muted font-semibold">/ 10</span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-app-bg-subtle/30 p-4 border border-app-line/20 space-y-3">
                    <p className="text-xs sm:text-sm text-app-ink-soft leading-relaxed font-semibold">
                      {LIFE_AREA_DETAILS[area.name] ?? "Một phần quan trọng trong cuộc sống của bạn."}
                    </p>

                    {/* Progressive Disclosure: Nút Collapsible câu hỏi gợi ý */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setIsQuestionsOpen((prev) => !prev)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100/80 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700/20 cursor-pointer"
                      >
                        {isQuestionsOpen ? "Ẩn câu hỏi gợi ý ▲" : "Gợi ý câu hỏi tự vấn ▼"}
                      </button>

                      {isQuestionsOpen && (
                        <ul className="mt-3 pl-5 list-disc space-y-1.5 bg-white dark:bg-neutral-900 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-3 text-[11px] text-neutral-600 dark:text-neutral-400 animate-fade-in shadow-3xs">
                          {(LIFE_AREA_QUESTIONS[area.name] ?? []).map((q) => (
                            <li key={q} className="leading-relaxed font-medium">
                              {q}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* Phần điều chỉnh điểm */}
                  <div className="space-y-4 pt-2">
                    {/* Bong bóng chọn điểm cho màn hình cảm ứng & desktop tiện lợi */}
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-app-ink-muted">Chấm điểm nhanh (0 - 10):</span>
                      <div className="flex flex-wrap gap-2 justify-start sm:justify-between py-1">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((scoreVal) => {
                          const isCurrentScore = area.score === scoreVal;
                          return (
                            <button
                              key={scoreVal}
                              type="button"
                              onClick={() => handleScoreChangeWrapped(index, [scoreVal])}
                              className={cn(
                                "flex h-11 w-11 items-center justify-center rounded-full border text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-app-accent/30 outline-none",
                                isCurrentScore
                                  ? "text-white scale-110 shadow-sm"
                                  : "bg-app-bg hover:bg-app-bg-subtle text-app-ink-soft border-app-line",
                              )}
                              style={
                                isCurrentScore
                                  ? { backgroundColor: colorConfig.accent, borderColor: colorConfig.accent }
                                  : {}
                              }
                              aria-label={`Chấm ${scoreVal} điểm`}
                            >
                              {scoreVal}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Slider ẩn/nhỏ gọn để hỗ trợ phím điều hướng & test */}
                    <div className="space-y-2 pt-2 border-t border-app-line/20">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-app-ink-muted">Hoặc kéo thanh trượt:</span>
                        <span
                          className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold",
                            getScaleGuidanceColor(area.score),
                          )}
                        >
                          {area.score}đ — {getScaleGuidance(area.score)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 py-1">
                        <button
                          type="button"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-app-line bg-app-surface text-sm font-bold text-app-ink hover:bg-app-bg hover:border-app-accent/35 active:scale-95 transition-all select-none outline-none cursor-pointer"
                          onClick={() => handleScoreChangeWrapped(index, [Math.max(0, area.score - 1)])}
                          aria-label="Giảm 1 điểm"
                        >
                          −
                        </button>

                        <div className="grow px-1">
                          <Slider
                            value={[area.score]}
                            onValueChange={(value) => handleScoreChangeWrapped(index, value)}
                            min={0}
                            max={10}
                            step={1}
                            trackColor={colorConfig.accent}
                            className="w-full cursor-pointer"
                            aria-label={`Điểm ${areaLabel}`}
                          />
                        </div>

                        <button
                          type="button"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-app-line bg-app-surface text-sm font-bold text-app-ink hover:bg-app-bg hover:border-app-accent/35 active:scale-95 transition-all select-none outline-none cursor-pointer"
                          onClick={() => handleScoreChangeWrapped(index, [Math.min(10, area.score + 1)])}
                          aria-label="Tăng 1 điểm"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between text-[11px] sm:text-xs font-semibold text-app-ink-muted/80 uppercase tracking-wider px-1">
                      <span className="flex items-center gap-1">😢 Cần chăm sóc (0-3)</span>
                      <span className="flex items-center gap-1">😐 Ổn định (4-7)</span>
                      <span className="flex items-center gap-1">😊 Phát triển (8-10)</span>
                    </div>
                  </div>

                  {/* Nút điều hướng chân Active Card */}
                  <div className="pt-6 border-t border-app-line/40 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      className="inline-flex min-h-11 sm:min-h-12 items-center justify-center gap-1.5 rounded-full border border-app-line bg-app-surface px-5 py-2.5 text-xs font-semibold text-app-ink-soft hover:bg-app-bg hover:text-app-ink active:scale-[0.97] transition-all disabled:opacity-40 cursor-pointer"
                      disabled={index === 0}
                      onClick={() => setActiveAreaIndex(index - 1)}
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Lĩnh vực trước
                    </button>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2.5 text-xs font-semibold text-app-ink-muted hover:text-app-ink hover:underline transition-colors cursor-pointer"
                        onClick={() => {
                          handleSkipArea(index);
                          if (index < 7) {
                            setActiveAreaIndex(index + 1);
                          }
                        }}
                      >
                        Bỏ qua
                      </button>

                      <button
                        type="button"
                        className="inline-flex min-h-11 sm:min-h-12 items-center justify-center gap-1.5 rounded-full bg-app-accent px-6 py-2.5 text-xs font-bold text-white transition-all hover:bg-app-accent-hover active:scale-[0.97] shadow-md cursor-pointer"
                        style={{ backgroundColor: colorConfig.accent }}
                        onClick={() => {
                          markAreaReviewed(index);
                          if (index < 7) {
                            setActiveAreaIndex(index + 1);
                          } else {
                            completeAssessment();
                          }
                        }}
                      >
                        {index < 7 ? (
                          <>
                            Lĩnh vực tiếp theo
                            <ArrowRight className="h-3.5 w-3.5" />
                          </>
                        ) : (
                          "Xem insight của tôi"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {!canCompleteAssessment && (
              <div className="bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-4 flex items-start gap-2.5 shadow-3xs">
                <Info className="h-4 w-4 text-neutral-400 shrink-0 mt-0.5" />
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed font-medium">
                  Còn <strong>{remainingAreaCount} khía cạnh</strong> chưa đánh giá. Bạn có thể nhấn chọn từng mục phía
                  trên để điều chỉnh hoặc nhấn nút <strong>"Xem insight của tôi"</strong> ở cuối trang để tiếp tục sử
                  dụng mức điểm trung bình mặc định (5).
                </p>
              </div>
            )}
          </div>

          <div className="order-2 lg:order-2 lg:sticky lg:top-6 space-y-4">
            {/* Trên Desktop: Luôn hiển thị đầy đủ bản đồ Radar và Summary */}
            <div className="hidden lg:block surface-raised rounded-2xl border border-app-line bg-gradient-to-br from-app-surface via-app-surface to-app-accent-subtle/10 p-6 shadow-app-md text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-36 h-36 bg-app-accent/5 rounded-full blur-3xl pointer-events-none" />

              <div className="flex items-center justify-between pb-2 border-b border-app-line/60">
                <h3 className="text-xs font-bold uppercase tracking-wider text-app-accent">Bản đồ Cân bằng</h3>
                <span className="inline-flex items-center text-xs font-semibold text-app-ink-muted bg-app-bg-subtle px-2 py-0.5 rounded-full">
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

              <div
                className="mt-4 pt-4 border-t border-app-line/60 grid grid-cols-2 gap-3 text-left"
                data-testid="onboarding-assessment-summary"
              >
                <span className="sr-only">Đã rà soát: {reviewedAreaCount}/8 Điểm trung bình</span>
                <div className="px-3 py-2 rounded-xl bg-app-surface border border-app-line shadow-app-sm hover:shadow-app-md transition-shadow">
                  <span className="text-[11px] text-app-ink-muted uppercase font-bold tracking-wider">
                    Điểm trung bình
                  </span>
                  <p className="font-serif text-xl font-bold text-app-ink mt-0.5 tabular-nums">
                    {averageScore.toFixed(1)}
                    <span className="text-xs font-normal text-app-ink-muted">/10</span>
                  </p>
                </div>
                <div className="px-3 py-2 rounded-xl bg-app-surface border border-app-line shadow-app-sm hover:shadow-app-md transition-shadow">
                  <span className="text-[11px] text-app-ink-muted uppercase font-bold tracking-wider">
                    Đã hoàn thành
                  </span>
                  <p className="font-serif text-xl font-bold text-app-ink mt-0.5 tabular-nums">
                    {Math.round((reviewedAreaCount / 8) * 100)}%
                  </p>
                </div>
                <div className="px-3 py-2 rounded-xl bg-app-surface border border-app-line shadow-app-sm hover:shadow-app-md transition-shadow">
                  <span className="text-[11px] text-app-ink-muted uppercase font-bold tracking-wider">
                    Khía cạnh cần tập trung
                  </span>
                  <p className="text-xs font-bold text-app-warm truncate mt-1">
                    {getLifeAreaLabel(growthArea.name)} ({growthArea.score}đ)
                  </p>
                </div>
                <div className="px-3 py-2 rounded-xl bg-app-surface border border-app-line shadow-app-sm hover:shadow-app-md transition-shadow">
                  <span className="text-[11px] text-app-ink-muted uppercase font-bold tracking-wider">
                    Khía cạnh mạnh nhất
                  </span>
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-450 truncate mt-1">
                    {getLifeAreaLabel(strongestArea.name)} ({strongestArea.score}đ)
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 flex items-center justify-center gap-1.5 text-xs italic text-app-ink-muted">
                <Sparkles className="h-3.5 w-3.5 text-app-accent opacity-70" />
                <span>“Điểm càng thật, insight càng đúng.”</span>
              </div>
            </div>

            {/* Trên Mobile: Thiết kế dạng Collapsible/Accordion để giải phóng diện tích màn hình */}
            <div className="block lg:hidden surface-raised rounded-2xl border border-app-line bg-gradient-to-br from-app-surface via-app-surface to-app-accent-subtle/5 p-4 shadow-sm relative overflow-hidden transition-all duration-300 w-full max-w-full">
              <button
                type="button"
                className="flex items-center justify-between w-full text-left cursor-pointer"
                onClick={() => setIsRadarExpanded(!isRadarExpanded)}
              >
                <div className="space-y-0.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-app-accent flex items-center gap-1.5">
                    📊 Bản đồ Cân bằng & Thống kê
                  </h3>
                  <p className="text-xs text-app-ink-soft">
                    Đã rà soát: <strong className="text-app-accent">{reviewedAreaCount}/8</strong> · Trung bình:{" "}
                    <strong className="text-app-accent">{averageScore.toFixed(1)}đ</strong>
                  </p>
                </div>
                <div className="flex items-center gap-1.5 bg-app-bg-subtle hover:bg-app-bg px-2.5 py-1.5 rounded-lg border border-app-line text-xs font-semibold text-app-ink transition-colors">
                  {isRadarExpanded ? (
                    <>
                      Thu gọn
                      <ChevronUp className="h-3.5 w-3.5 text-app-ink-muted" />
                    </>
                  ) : (
                    <>
                      Xem bản đồ
                      <ChevronDown className="h-3.5 w-3.5 text-app-ink-muted" />
                    </>
                  )}
                </div>
              </button>

              {isRadarExpanded && (
                <div className="mt-4 pt-4 border-t border-app-line/60 animate-fade-in space-y-4">
                  <div className="flex items-center justify-center min-h-[260px] my-1">
                    <SimpleRadarChart 
                      data={radarData} 
                      height={260} 
                      fill="var(--app-accent)"
                      stroke="var(--app-accent)"
                      fillOpacity={0.15}
                      className="w-full max-w-[280px]" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-left" data-testid="onboarding-assessment-summary-mobile">
                    <div className="px-2.5 py-1.5 rounded-lg bg-app-surface border border-app-line shadow-3xs">
                      <span className="text-[10px] text-app-ink-muted uppercase font-bold tracking-wider">Điểm TB</span>
                      <p className="font-serif text-sm font-bold text-app-ink mt-0.5">
                        {averageScore.toFixed(1)}
                        <span className="text-[10px] font-normal text-app-ink-muted">/10</span>
                      </p>
                    </div>
                    <div className="px-2.5 py-1.5 rounded-lg bg-app-surface border border-app-line shadow-3xs">
                      <span className="text-[10px] text-app-ink-muted uppercase font-bold tracking-wider">
                        Tiến trình
                      </span>
                      <p className="font-serif text-sm font-bold text-app-ink mt-0.5">
                        {Math.round((reviewedAreaCount / 8) * 100)}%
                      </p>
                    </div>
                    <div className="px-2.5 py-1.5 rounded-lg bg-app-surface border border-app-line shadow-3xs">
                      <span className="text-[10px] text-app-ink-muted uppercase font-bold tracking-wider">
                        Cần tập trung
                      </span>
                      <p className="text-xs font-bold text-app-warm truncate mt-0.5">
                        {getLifeAreaLabel(growthArea.name)} ({growthArea.score}đ)
                      </p>
                    </div>
                    <div className="px-2.5 py-1.5 rounded-lg bg-app-surface border border-app-line shadow-3xs">
                      <span className="text-[10px] text-app-ink-muted uppercase font-bold tracking-wider">
                        Mạnh nhất
                      </span>
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-450 truncate mt-0.5">
                        {getLifeAreaLabel(strongestArea.name)} ({strongestArea.score}đ)
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <footer className="mt-8 border-t border-app-line pt-6">
          <div className="flex flex-col gap-4">
            {!canCompleteAssessment && (
              <div className="flex items-center gap-2 text-xs text-neutral-450 justify-end font-medium">
                <Info className="h-3.5 w-3.5 text-neutral-450" />
                <span>Các khía cạnh chưa đánh giá sẽ nhận mức điểm trung bình mặc định (5).</span>
              </div>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 order-2 sm:order-1 justify-center sm:justify-start">
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-app-line bg-app-surface px-5 py-2.5 text-xs font-bold text-app-ink-soft transition-all duration-200 hover:bg-app-bg hover:text-app-ink active:scale-[0.97] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-app-accent/35 cursor-pointer"
                  onClick={() => setStep("welcome")}
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  Quay lại chào mừng
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center justify-center rounded-full px-4 py-2.5 text-xs font-bold text-neutral-500 hover:text-neutral-700 transition-colors focus-visible:outline-none cursor-pointer"
                  onClick={handleDefer}
                >
                  Để sau
                </button>
              </div>
              <button
                id="btn-complete-onboarding"
                type="button"
                className="order-1 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-emerald-700 hover:bg-emerald-800 px-8 py-3 text-xs font-bold text-white transition-all duration-200 hover:shadow-md active:scale-[0.97] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-emerald-700/35 shadow-sm sm:order-2 cursor-pointer"
                onClick={canCompleteAssessment ? handleComplete : handleDeferAssessment}
              >
                {canCompleteAssessment ? "Xem insight của tôi" : "Xem insight của tôi (Dùng điểm mặc định)"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </footer>
      </div>
    </PageShell>
  );
}
