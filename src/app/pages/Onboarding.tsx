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
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { toast } from "sonner";

import { AutoSaveIndicator } from "../components/AutoSaveIndicator";
import { CoreFlowProgress } from "../components/CoreFlowProgress";
import { PageShell } from "../components/PageShell";
import { ScreenGuide } from "../components/ScreenGuide";
import { SCREEN_GUIDES } from "../components/screen-guides";
import { InlineStatusMessage } from "../components/states/InlineStatusMessage";
import { Slider } from "../components/ui/slider";
import { cn } from "../components/ui/utils";
import { useDirtyFormGuard } from "../hooks/useDirtyFormGuard";
import { useScrollToTopOnChange } from "../hooks/useScrollToTopOnChange";
import { trackAnalyticsEvent } from "../utils/analytics";
import { hasRealLifeBalance } from "../utils/core-flow-guard";
import { getAreaColorConfig } from "../utils/life-area-theme";
import { getLifeAreaLabel, getUserData, LIFE_AREAS, type LifeArea, updateWheelOfLife } from "../utils/storage";
import { mergeOnboardingLifeAreas } from "../utils/onboarding-life-areas";
import { ZenBreathingGate } from "./Onboarding/components/ZenBreathingGate";

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

const JOURNEY_STEPS = [
  { title: "Đánh giá", description: `Chấm ${LIFE_AREAS.length} lĩnh vực đủ thật.` },
  { title: "Trọng tâm", description: "Nhìn ra nơi cần chăm sóc trước." },
  { title: "Kế hoạch", description: "Biến insight thành nhịp 12 tuần." },
];

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

function getScaleGuidance(score: number): string {
  if (score <= 3) return "Cần chăm sóc";
  if (score <= 7) return "Ổn định";
  return "Đang phát triển";
}

function getScaleGuidanceColor(score: number): string {
  if (score <= 3) return "text-[color:var(--color-danger-fg)] bg-[color:var(--color-danger-bg)]";
  if (score <= 7) return "text-[color:var(--color-warning-fg)] bg-[color:var(--color-warning-bg)]";
  return "text-[color:var(--color-success-fg)] bg-[color:var(--color-success-bg)]";
}

function polarPoint(cx: number, cy: number, radius: number, angleDegrees: number) {
  const angle = ((angleDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

function buildAtlasWedgePath(startAngle: number, endAngle: number, innerRadius: number, outerRadius: number) {
  const center = 140;
  const outerStart = polarPoint(center, center, outerRadius, startAngle);
  const outerEnd = polarPoint(center, center, outerRadius, endAngle);
  const innerEnd = polarPoint(center, center, innerRadius, endAngle);
  const innerStart = polarPoint(center, center, innerRadius, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

function LifeAtlasPanel({
  lifeAreas,
  reviewedAreaIndices,
  activeAreaIndex,
  averageScore,
  strongestArea,
  growthArea,
  mode,
  summaryTestId,
}: {
  lifeAreas: LifeArea[];
  reviewedAreaIndices: Set<number>;
  activeAreaIndex: number | null;
  averageScore: number;
  strongestArea: LifeArea;
  growthArea: LifeArea;
  mode: "welcome" | "assessment";
  summaryTestId?: string;
}) {
  const reviewedAreaCount = reviewedAreaIndices.size;
  const showPreview = mode === "welcome";
  const areaCount = lifeAreas.length;
  const segmentAngle = 360 / areaCount;
  const growthAreaIndex = Math.max(
    0,
    lifeAreas.findIndex((area) => area.name === growthArea.name),
  );
  const pinPoint = polarPoint(140, 140, 108, growthAreaIndex * segmentAngle);

  return (
    <section
      aria-label={`Bản đồ cuộc sống ${areaCount} vùng`}
      className="relative overflow-hidden rounded-card border border-app-line bg-app-surface p-4 shadow-app-md sm:p-5"
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(0,0,0,0.035),transparent)] opacity-40 dark:opacity-20" />
      <div className="relative space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-app-accent">Atlas gấp mở</p>
            <h2 className="mt-1 font-serif text-2xl font-semibold leading-tight text-app-ink">
              Bản đồ cuộc sống của bạn
            </h2>
          </div>
          <span className="shrink-0 rounded-pill border border-app-line bg-app-bg-subtle px-3 py-1 text-xs font-semibold text-app-ink-soft">
            {showPreview ? `${areaCount} vùng` : `${reviewedAreaCount}/${areaCount}`}
          </span>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-[360px] rounded-[28px] border border-app-line bg-app-bg-subtle p-3 shadow-app-sm">
          <svg
            role="img"
            aria-label={`Atlas cuộc sống gồm ${areaCount} vùng, vùng đã chấm được tô rõ hơn`}
            className={cn(
              "h-full w-full",
              !showPreview && !reviewedAreaIndices.size && "opacity-85",
              !showPreview && "motion-safe:transition-opacity motion-reduce:transition-none",
            )}
            viewBox="0 0 280 280"
          >
            <title>{`Atlas cuộc sống ${areaCount} vùng`}</title>
            <circle cx="140" cy="140" r="122" fill="var(--app-surface)" stroke="var(--app-line)" strokeWidth="1" />
            {[54, 84, 114].map((radius) => (
              <circle
                key={radius}
                cx="140"
                cy="140"
                r={radius}
                fill="none"
                stroke="var(--app-line)"
                strokeDasharray="4 7"
                strokeWidth="1"
              />
            ))}
            {lifeAreas.map((_, index) => {
              const angle = index * segmentAngle;
              const start = polarPoint(140, 140, 28, angle);
              const end = polarPoint(140, 140, 124, angle);
              return (
                <line
                  key={angle}
                  x1={start.x}
                  x2={end.x}
                  y1={start.y}
                  y2={end.y}
                  stroke="var(--app-line)"
                  strokeDasharray={index % 2 === 0 ? "8 5" : "3 6"}
                  strokeWidth="1"
                />
              );
            })}
            {lifeAreas.map((area, index) => {
              const scoreRatio = Math.max(0.08, Math.min(area.score / 10, 1));
              const half = segmentAngle * (20 / 45);
              const startAngle = index * segmentAngle - half;
              const endAngle = index * segmentAngle + half;
              const isReviewed = reviewedAreaIndices.has(index);
              const isActive = activeAreaIndex === index;
              const visible = showPreview || isReviewed || isActive;
              const accent = getAreaColorConfig(area.name).accent;
              const outerRadius = 42 + scoreRatio * 72;
              const labelPoint = polarPoint(140, 140, 134, index * segmentAngle);

              return (
                <g key={area.name}>
                  <path
                    d={buildAtlasWedgePath(startAngle, endAngle, 28, outerRadius)}
                    fill={accent}
                    fillOpacity={visible ? (isActive ? 0.34 : 0.22) : 0.07}
                    stroke={accent}
                    strokeOpacity={visible ? 0.8 : 0.2}
                    strokeWidth={isActive ? 2.5 : 1.5}
                    className="motion-safe:transition-all motion-reduce:transition-none"
                  />
                  <circle
                    cx={labelPoint.x}
                    cy={labelPoint.y}
                    r={isActive ? 5 : 3.5}
                    fill={visible ? accent : "var(--app-line)"}
                    className="motion-safe:transition-all motion-reduce:transition-none"
                  />
                </g>
              );
            })}
            <circle cx="140" cy="140" r="24" fill="var(--app-surface)" stroke="var(--app-line)" strokeWidth="1" />
            <text x="140" y="134" fill="var(--app-ink-muted)" fontSize="11" fontWeight="700" textAnchor="middle">
              LIFE
            </text>
            <text x="140" y="151" fill="var(--app-accent)" fontSize="18" fontWeight="700" textAnchor="middle">
              {averageScore.toFixed(1)}
            </text>
            <g className="motion-safe:transition-transform motion-reduce:transition-none">
              <line
                x1={pinPoint.x}
                x2={pinPoint.x + 10}
                y1={pinPoint.y + 6}
                y2={pinPoint.y + 20}
                stroke="var(--app-ink)"
                strokeLinecap="round"
                strokeWidth="2"
              />
              <circle cx={pinPoint.x} cy={pinPoint.y} r="9" fill="var(--app-accent)" />
              <circle cx={pinPoint.x} cy={pinPoint.y} r="3" fill="var(--app-surface)" />
            </g>
          </svg>
        </div>

        {showPreview ? (
          <div className="grid gap-2 text-sm text-app-ink-soft sm:grid-cols-3">
            <div className="rounded-control border border-app-line bg-app-bg-subtle px-3 py-2">
              <strong className="block text-app-ink">{`1. Rà ${areaCount} vùng`}</strong>
              Chọn điểm đủ thật.
            </div>
            <div className="rounded-control border border-app-line bg-app-bg-subtle px-3 py-2">
              <strong className="block text-app-ink">2. Thấy insight</strong>
              Biết nơi nên chăm trước.
            </div>
            <div className="rounded-control border border-app-line bg-app-bg-subtle px-3 py-2">
              <strong className="block text-app-ink">3. Lập kế hoạch</strong>
              Đi tiếp 12 tuần.
            </div>
          </div>
        ) : (
          <div
            className="grid grid-cols-2 gap-3 text-left"
            data-testid={summaryTestId}
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
              <p className="mt-1 font-serif text-xl font-bold tabular-nums text-app-ink">{reviewedAreaCount}/{areaCount}</p>
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
        )}
      </div>
    </section>
  );
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
  const [activeAreaIndex, setActiveAreaIndex] = useState<number | null>(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

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
        <ScreenGuide {...SCREEN_GUIDES.onboarding} autoOpen />
        <div ref={flowTopRef} tabIndex={-1} className="space-y-6 focus:outline-none">
          {progressHeader}

          {showBreathing ? (
            <div className="rounded-card border border-app-line bg-app-surface p-5 shadow-app-sm sm:p-6">
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

              <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
                <div className="space-y-6 rounded-card border border-app-line bg-app-surface p-5 shadow-app-sm sm:p-7 lg:p-8">
                  <div className="space-y-4">
                    <span className="inline-flex rounded-pill bg-app-accent-soft px-3 py-1 text-xs font-semibold uppercase tracking-wide text-app-accent">
                      Bước 1 / 3 · Atlas cuộc sống · 3 phút
                    </span>
                    <div className="space-y-3">
                      <h1 className="font-serif text-3xl font-semibold leading-tight text-app-ink sm:text-4xl lg:text-5xl">
                        Mở bản đồ cuộc sống 12 tuần của bạn
                      </h1>
                      <p className="max-w-2xl text-sm leading-6 text-app-ink-soft sm:text-base">
                        Rà 8 lĩnh vực để nhìn ra nơi cần chăm sóc đầu tiên, rồi chuyển thành Life Insight rõ ràng.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {JOURNEY_STEPS.map((item, index) => (
                      <div key={item.title} className="rounded-control border border-app-line bg-app-bg-subtle p-3">
                        <span className="text-xs font-semibold text-app-accent">0{index + 1}</span>
                        <h2 className="mt-1 text-base font-semibold leading-snug text-app-ink">{item.title}</h2>
                        <p className="mt-1 text-sm leading-5 text-app-ink-soft">{item.description}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-control border border-app-line bg-app-bg-subtle p-3">
                    <button
                      type="button"
                      className="flex min-h-11 w-full items-center justify-between gap-3 text-left text-sm font-semibold text-app-ink transition-colors hover:text-app-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2"
                      onClick={() => setIsHelpOpen(!isHelpOpen)}
                      aria-expanded={isHelpOpen}
                      aria-controls="onboarding-journey-help"
                    >
                      <span>Life Insight sẽ được tạo thế nào?</span>
                      {isHelpOpen ? (
                        <ChevronUp className="h-4 w-4 shrink-0" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" />
                      )}
                    </button>
                    <AnimatePresence initial={false}>
                      {isHelpOpen && (
                        <motion.div
                          id="onboarding-journey-help"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.18, ease: "easeOut" }}
                          className="overflow-hidden"
                        >
                          <p className="pt-3 text-sm leading-6 text-app-ink-soft">
                            Điểm số chỉ là cảm nhận hiện tại, không phải phán xét. Sau khi rà xong, màn tiếp theo sẽ gợi
                            ý một trọng tâm để bạn viết mục tiêu 12 tuần.
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-pill bg-app-accent px-6 py-3 text-sm font-semibold text-white shadow-app-sm transition-colors hover:bg-app-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 sm:w-auto"
                      onClick={handleStartAssessment}
                    >
                      Mở bản đồ cuộc sống
                      <span className="sr-only"> - Bắt đầu rà 8 lĩnh vực</span>
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="inline-flex min-h-12 items-center justify-center rounded-pill border border-app-line bg-app-surface px-5 py-3 text-sm font-semibold text-app-ink-soft transition-colors hover:bg-app-bg-subtle hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2"
                      onClick={() => setShowBreathing(true)}
                    >
                      Tập thở thư giãn
                    </button>
                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center justify-center rounded-pill px-4 py-2.5 text-sm font-semibold text-app-ink-muted transition-colors hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2"
                      onClick={handleDefer}
                    >
                      Để sau
                    </button>
                  </div>
                </div>

                <LifeAtlasPanel
                  lifeAreas={lifeAreas}
                  reviewedAreaIndices={reviewedAreaIndices}
                  activeAreaIndex={activeAreaIndex}
                  averageScore={averageScore}
                  strongestArea={strongestArea}
                  growthArea={growthArea}
                  mode="welcome"
                />
              </section>
            </>
          )}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth="xl" className="focus:outline-none">
      <ScreenGuide {...SCREEN_GUIDES.onboarding} autoOpen />
      <div ref={flowTopRef} tabIndex={-1} className="w-full max-w-full space-y-6 focus:outline-none">
        {progressHeader}
        {draftBanner}

        <header className="space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-app-accent">
            <Sparkles className="h-3.5 w-3.5 motion-safe:animate-pulse motion-reduce:animate-none" aria-hidden="true" />
            Bước 1 / 3 · Bánh xe cuộc sống
          </div>
          <h1 className="font-serif text-3xl font-semibold leading-tight text-app-ink sm:text-4xl">
            Rà 8 lĩnh vực để mở Life Insight
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-app-ink-soft sm:text-base">
            Chấm theo cảm nhận hiện tại. Bản đồ bên cạnh sẽ chỉ ra vùng mạnh và vùng cần chăm sóc đầu tiên.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start">
          <aside className="order-1 lg:sticky lg:top-6 lg:order-2">
            <LifeAtlasPanel
              lifeAreas={lifeAreas}
              reviewedAreaIndices={reviewedAreaIndices}
              activeAreaIndex={activeAreaIndex}
              averageScore={averageScore}
              strongestArea={strongestArea}
              growthArea={growthArea}
              mode="assessment"
              summaryTestId="onboarding-assessment-summary"
            />
          </aside>

          <div className="order-2 min-w-0 space-y-5 lg:order-1">
            <div className="rounded-card border border-app-line bg-app-surface p-4 shadow-app-sm">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-app-ink-muted">
                Chọn lĩnh vực đang rà
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
                        "min-h-12 rounded-control border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2",
                        isSelected
                          ? "border-app-accent bg-app-accent-soft text-app-accent"
                          : "border-app-line bg-app-surface text-app-ink-soft hover:bg-app-bg-subtle hover:text-app-ink",
                      )}
                      style={isSelected ? { borderColor: colorConfig.accent, color: colorConfig.accent } : undefined}
                      aria-pressed={isSelected}
                    >
                      <span className="flex items-center gap-2">
                        <AreaIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                        <span className="min-w-0 text-xs font-semibold leading-5">
                          {index + 1}. {label}
                        </span>
                      </span>
                      {isReviewed ? (
                        <span className="mt-1 inline-flex rounded-pill bg-app-bg-subtle px-2 py-0.5 text-xs font-semibold text-app-status-success">
                          Đã rà · {area.score}đ
                        </span>
                      ) : null}
                    </button>
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
              const colorConfig = getAreaColorConfig(area.name);

              return (
                <div className="rounded-card border border-app-line bg-app-surface p-5 shadow-app-sm motion-safe:animate-fade-in motion-reduce:animate-none sm:p-6 lg:p-7">
                  <div className="flex flex-col gap-4 border-b border-app-line pb-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-control bg-app-accent-soft text-app-accent"
                        style={{ color: colorConfig.accent }}
                      >
                        <AreaIcon className="h-7 w-7" aria-hidden="true" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wide text-app-ink-muted">
                          Lĩnh vực {index + 1} / 8
                        </span>
                        <h2
                          ref={activeAreaHeadingRef}
                          tabIndex={-1}
                          className="mt-1 font-serif text-2xl font-semibold leading-tight text-app-ink focus:outline-none sm:text-3xl"
                        >
                          {areaLabel}
                        </h2>
                      </div>
                    </div>

                    <div className="rounded-control border border-app-line bg-app-bg-subtle px-3 py-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-app-ink-muted">
                        Điểm hiện tại
                      </span>
                      <p
                        className="mt-1 font-serif text-3xl font-semibold leading-none tabular-nums"
                        style={{ color: colorConfig.accent }}
                      >
                        {area.score}
                        <span className="text-sm font-normal text-app-ink-muted">/10</span>
                      </p>
                    </div>
                  </div>

                  {/* Câu hỏi chính - hiển thị trực tiếp */}
                  <div className="mt-5 rounded-control border border-app-line bg-app-bg-subtle p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-app-ink-muted">Câu hỏi đánh giá</p>
                    <p className="mt-2 text-sm font-semibold leading-6 text-app-ink">
                      {LIFE_AREA_QUESTIONS[area.name] ?? "Bạn hài lòng bao nhiêu với khía cạnh này?"}
                    </p>
                    <p className="mt-1.5 text-xs leading-5 text-app-ink-muted">
                      {LIFE_AREA_DETAILS[area.name] ?? "Một phần quan trọng trong cuộc sống của bạn."}
                    </p>
                  </div>

                  <div className="mt-6 space-y-5">
                    <div className="space-y-3">
                      <span className="text-sm font-semibold text-app-ink">Chọn điểm theo cảm nhận hiện tại</span>
                      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:flex lg:flex-wrap">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((scoreVal) => {
                          const isCurrentScore = area.score === scoreVal;
                          return (
                            <button
                              key={scoreVal}
                              type="button"
                              onClick={() => handleScoreChangeWrapped(index, [scoreVal])}
                              className={cn(
                                "flex h-12 w-12 items-center justify-center rounded-full border text-sm font-semibold transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 motion-reduce:transition-none",
                                isCurrentScore
                                  ? "border-app-accent bg-app-accent text-white shadow-app-sm motion-safe:scale-105"
                                  : "border-app-line bg-app-bg-subtle text-app-ink-soft hover:bg-app-accent-subtle hover:text-app-ink",
                              )}
                              style={
                                isCurrentScore
                                  ? { backgroundColor: colorConfig.accent, borderColor: colorConfig.accent }
                                  : undefined
                              }
                              aria-label={`Chấm ${scoreVal} điểm`}
                              aria-pressed={isCurrentScore}
                            >
                              {scoreVal}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Mốc neo thang điểm - hiển thị luôn */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-app-ink-muted">Mốc tham khảo</p>
                      <div className="grid gap-1.5">
                        {SCORE_ANCHORS.map((anchor) => {
                          const activeAnchor = getActiveScoreAnchor(area.score);
                          const isActive = activeAnchor === anchor;
                          return (
                            <div
                              key={anchor.range}
                              className={cn(
                                "flex items-center gap-3 rounded-control border px-3 py-2 text-xs transition-colors",
                                isActive
                                  ? "border-app-accent/40 bg-app-accent-soft"
                                  : "border-app-line bg-app-bg-subtle",
                              )}
                            >
                              <span
                                className={cn(
                                  "shrink-0 rounded-pill px-2 py-0.5 font-bold tabular-nums",
                                  isActive ? "bg-app-accent text-white" : "bg-app-surface text-app-ink-muted",
                                )}
                              >
                                {anchor.range}
                              </span>
                              <div className="min-w-0">
                                <span
                                  className={cn("font-semibold", isActive ? "text-app-accent" : "text-app-ink-soft")}
                                >
                                  {anchor.label}
                                </span>
                                <span className="mx-1.5 text-app-ink-muted">·</span>
                                <span className="text-app-ink-muted">{anchor.description}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="hidden space-y-2 border-t border-app-line pt-4 md:block">
                      <div className="flex items-center justify-between gap-3 text-sm font-semibold">
                        <span className="text-app-ink-muted">Hoặc kéo thanh trượt</span>
                        <span
                          className={cn(
                            "inline-flex items-center rounded-pill px-3 py-1 text-xs font-semibold",
                            getScaleGuidanceColor(area.score),
                          )}
                        >
                          {area.score}đ · {getScaleGuidance(area.score)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 py-1">
                        <button
                          type="button"
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-app-line bg-app-surface text-sm font-semibold text-app-ink transition-colors hover:bg-app-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2"
                          onClick={() => handleScoreChangeWrapped(index, [Math.max(0, area.score - 1)])}
                          aria-label="Giảm 1 điểm"
                        >
                          -
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
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-app-line bg-app-surface text-sm font-semibold text-app-ink transition-colors hover:bg-app-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2"
                          onClick={() => handleScoreChangeWrapped(index, [Math.min(10, area.score + 1)])}
                          aria-label="Tăng 1 điểm"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-col gap-3 border-t border-app-line pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-pill border border-app-line bg-app-surface px-5 py-2.5 text-sm font-semibold text-app-ink-soft transition-colors hover:bg-app-bg-subtle hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={index === 0}
                      onClick={() => setActiveAreaIndex(index - 1)}
                    >
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                      Lĩnh vực trước
                    </button>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        type="button"
                        className="inline-flex min-h-11 items-center justify-center rounded-pill px-5 py-2.5 text-sm font-semibold text-app-ink-muted transition-colors hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2"
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
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-pill bg-app-accent px-6 py-3 text-sm font-semibold text-white shadow-app-sm transition-colors hover:bg-app-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2"
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
                            Rà lĩnh vực tiếp theo
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                          </>
                        ) : (
                          "Chọn trọng tâm"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}

            {!canCompleteAssessment && (
              <div
                role="status"
                aria-live="polite"
                className="flex items-start gap-3 rounded-card border border-app-line bg-app-bg-subtle p-4 shadow-app-sm"
              >
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-app-ink-muted" aria-hidden="true" />
                <p className="text-sm font-medium leading-6 text-app-ink-soft">
                  Còn <strong>{remainingAreaCount} khía cạnh</strong> chưa chấm. Bạn có thể chọn trọng tâm với điểm mặc
                  định 5 cho phần còn lại.
                </p>
              </div>
            )}
          </div>
        </div>

        <footer className="mt-8 border-t border-app-line pt-6">
          <div className="flex flex-col gap-4">
            {!canCompleteAssessment && (
              <p className="text-center text-sm font-medium leading-6 text-app-ink-soft sm:text-right">
                Khía cạnh chưa chấm sẽ dùng điểm mặc định 5.
              </p>
            )}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="order-2 flex flex-col gap-2 sm:order-1 sm:flex-row sm:items-center">
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-pill border border-app-line bg-app-surface px-5 py-2.5 text-sm font-semibold text-app-ink-soft transition-colors hover:bg-app-bg-subtle hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2"
                  onClick={() => setStep("welcome")}
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Quay lại chào mừng
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center justify-center rounded-pill px-5 py-2.5 text-sm font-semibold text-app-ink-muted transition-colors hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2"
                  onClick={handleDefer}
                >
                  Để sau
                </button>
              </div>
              <button
                id="btn-complete-onboarding"
                type="button"
                className="order-1 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-pill bg-app-accent px-6 py-3 text-sm font-semibold text-white shadow-app-sm transition-colors hover:bg-app-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 sm:order-2 sm:w-auto"
                onClick={canCompleteAssessment ? handleComplete : handleDeferAssessment}
              >
                Chọn trọng tâm
                {!canCompleteAssessment ? <span className="sr-only"> (Dùng điểm mặc định)</span> : null}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </footer>
      </div>
    </PageShell>
  );
}
