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
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { toast } from "sonner";

import { CoreFlowProgress } from "../components/CoreFlowProgress";
import { PageShell } from "../components/PageShell";
import { ScreenGuide } from "../components/ScreenGuide";
import { SCREEN_GUIDES } from "../components/screen-guides";
import { InlineStatusMessage } from "../components/states/InlineStatusMessage";
import { useIsMobile } from "../components/ui/use-mobile";
import { cn } from "../components/ui/utils";
import { useDirtyFormGuard } from "../hooks/useDirtyFormGuard";
import { useScrollToTopOnChange } from "../hooks/useScrollToTopOnChange";
import { trackAnalyticsEvent } from "../utils/analytics";
import { hasRealLifeBalance } from "../utils/core-flow-guard";
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

// Design color palette for the 8 life area wedges — exact from Dear Our Future design
const DESIGN_WEDGE_COLORS: Array<{ stroke: string; fill: string }> = [
  { stroke: "#2563EB", fill: "#D9E5FC" }, // Career
  { stroke: "#E7A400", fill: "#FBEBC2" }, // Finance
  { stroke: "#16A34A", fill: "#CDEBD8" }, // Health
  { stroke: "#7C5CFC", fill: "#E2DAFE" }, // Education
  { stroke: "#E8456B", fill: "#FAD3DE" }, // Relationships
  { stroke: "#0E9F8E", fill: "#C9EDE7" }, // Family
  { stroke: "#EA7A2B", fill: "#FBDEC4" }, // Personal Growth
  { stroke: "#2BA8E0", fill: "#CDE9F8" }, // Leisure
];

function getDesignWedgeColor(_areaName: string, index: number) {
  return DESIGN_WEDGE_COLORS[index] ?? { stroke: "#A8A296", fill: "#F2EFE6" };
}

// Design-specific icon colors + backgrounds from Dear Our Future Clio design
const AREA_DESIGN_ICON_STYLES: Array<{ accent: string; bg: string; border: string }> = [
  { accent: "#2563EB", bg: "#EEF3FE", border: "rgba(37,99,235,0.3)" }, // Career
  { accent: "#E7A400", bg: "#FDF6E3", border: "rgba(231,164,0,0.3)" }, // Finance
  { accent: "#16A34A", bg: "#E9F7EE", border: "rgba(22,163,74,0.3)" }, // Health
  { accent: "#7C5CFC", bg: "#F0EDFE", border: "rgba(124,92,252,0.3)" }, // Education
  { accent: "#E8456B", bg: "#FDEBF0", border: "rgba(232,69,107,0.3)" }, // Relationships
  { accent: "#0E9F8E", bg: "#E5F6F3", border: "rgba(14,159,142,0.3)" }, // Family
  { accent: "#EA7A2B", bg: "#FDF1E7", border: "rgba(234,122,43,0.3)" }, // Personal Growth
  { accent: "#2BA8E0", bg: "#E7F4FC", border: "rgba(43,168,224,0.3)" }, // Leisure
];

function getDesignIconStyle(index: number) {
  return AREA_DESIGN_ICON_STYLES[index] ?? { accent: "#A8A296", bg: "#F2EFE6", border: "rgba(23,21,15,0.1)" };
}

const JOURNEY_STEPS = [
  { number: "01", title: "Đánh giá", description: `Chấm ${LIFE_AREAS.length} lĩnh vực đủ thật.` },
  { number: "02", title: "Trọng tâm", description: "Nhìn ra nơi cần chăm sóc trước." },
  { number: "03", title: "Kế hoạch", description: "Biến insight thành nhịp 12 tuần." },
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
      className="relative overflow-hidden rounded-[22px] border border-app-line bg-app-surface p-4 shadow-app-md sm:p-6 lg:p-7"
    >
      <div className="relative space-y-4 sm:space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-app-accent">Atlas gấp mở</p>
            <h2 className="mt-1 font-serif text-[20px] font-bold leading-tight tracking-tight text-app-ink sm:text-[21px]">
              Bản đồ cuộc sống của bạn
            </h2>
          </div>
          <span className="shrink-0 rounded-pill border border-app-line bg-app-bg-subtle px-3 py-1 text-[11.5px] font-semibold text-app-ink-soft">
            {showPreview ? `${areaCount} vùng` : `${reviewedAreaCount}/${areaCount}`}
          </span>
        </div>

        <div className="relative mx-auto aspect-square w-full max-w-[320px] rounded-[18px] border border-app-line bg-app-bg-subtle p-3 sm:max-w-[360px] sm:p-3.5">
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
            <circle cx="140" cy="140" r="122" fill="var(--app-surface)" stroke="rgba(23,21,15,0.07)" strokeWidth="1" />
            {[54, 84, 114].map((radius) => (
              <circle
                key={radius}
                cx="140"
                cy="140"
                r={radius}
                fill="none"
                stroke="rgba(23,21,15,0.07)"
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
                  stroke="rgba(23,21,15,0.07)"
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
              const wedgeColor = getDesignWedgeColor(area.name, index);
              const outerRadius = 42 + scoreRatio * 72;
              const labelPoint = polarPoint(140, 140, 134, index * segmentAngle);

              return (
                <g key={area.name} className="dof-wheel-grp">
                  <path
                    d={buildAtlasWedgePath(startAngle, endAngle, 28, outerRadius)}
                    fill={wedgeColor.fill}
                    fillOpacity={visible ? (isActive ? 0.7 : 0.55) : 0.12}
                    stroke={wedgeColor.stroke}
                    strokeOpacity={visible ? 0.9 : 0.25}
                    strokeWidth={isActive ? 2.5 : 1.5}
                    strokeLinejoin="round"
                    className="motion-safe:transition-all motion-reduce:transition-none"
                  />
                  <circle
                    cx={labelPoint.x}
                    cy={labelPoint.y}
                    r={isActive ? 5 : 4.5}
                    fill={visible ? wedgeColor.stroke : "rgba(23,21,15,0.15)"}
                    className="motion-safe:transition-all motion-reduce:transition-none"
                  />
                </g>
              );
            })}
            <circle cx="140" cy="140" r="24" fill="var(--app-surface)" stroke="var(--app-line)" strokeWidth="1" />
            <text
              x="140"
              y="136"
              fill="#A8A296"
              fontSize="10"
              fontWeight="700"
              letterSpacing="0.12em"
              textAnchor="middle"
              fontFamily="'Be Vietnam Pro', sans-serif"
            >
              LIFE
            </text>
            <text
              x="140"
              y="155"
              fill="#0C5E3A"
              fontSize="22"
              fontWeight="800"
              textAnchor="middle"
              fontFamily="'Bricolage Grotesque', sans-serif"
            >
              {averageScore.toFixed(1)}
            </text>
            <g className="dof-pin motion-safe:transition-transform motion-reduce:transition-none">
              <line
                x1={pinPoint.x}
                x2={pinPoint.x + 10}
                y1={pinPoint.y + 6}
                y2={pinPoint.y + 20}
                stroke="#17150F"
                strokeLinecap="round"
                strokeWidth="2"
              />
              <path
                d={`M${pinPoint.x} ${pinPoint.y + 14} C${pinPoint.x - 7} ${pinPoint.y + 4} ${pinPoint.x - 10} ${pinPoint.y} ${pinPoint.x - 10} ${pinPoint.y - 5} A10 10 0 1 1 ${pinPoint.x + 10} ${pinPoint.y - 5} C${pinPoint.x + 10} ${pinPoint.y} ${pinPoint.x + 7} ${pinPoint.y + 4} ${pinPoint.x} ${pinPoint.y + 14} Z`}
                fill="#0C5E3A"
                stroke="#fff"
                strokeWidth="2"
                strokeLinejoin="round"
              />
              <circle cx={pinPoint.x} cy={pinPoint.y - 5} r="3.6" fill="#fff" />
            </g>
          </svg>
        </div>

        {showPreview ? (
          <div className="grid gap-2.5 sm:grid-cols-3 sm:gap-3">
            <div className="group rounded-[14px] border border-app-line bg-app-bg-subtle p-3.5 transition-[transform,border-color] duration-150 hover:-translate-y-0.5 hover:border-app-accent/30">
              <strong className="block text-[13px] font-bold text-app-ink">{`1. Rà ${areaCount} vùng`}</strong>
              <span className="mt-1 block text-[11.5px] leading-relaxed text-app-ink-muted">Chọn điểm đủ thật.</span>
            </div>
            <div className="group rounded-[14px] border border-app-line bg-app-bg-subtle p-3.5 transition-[transform,border-color] duration-150 hover:-translate-y-0.5 hover:border-app-accent/30">
              <strong className="block text-[13px] font-bold text-app-ink">2. Thấy Insight</strong>
              <span className="mt-1 block text-[11.5px] leading-relaxed text-app-ink-muted">
                Biết nơi nên chăm sóc trước.
              </span>
            </div>
            <div className="group rounded-[14px] border border-app-line bg-app-bg-subtle p-3.5 transition-[transform,border-color] duration-150 hover:-translate-y-0.5 hover:border-app-accent/30">
              <strong className="block text-[13px] font-bold text-app-ink">3. Lập kế hoạch</strong>
              <span className="mt-1 block text-[11.5px] leading-relaxed text-app-ink-muted">Đi tiếp 12 tuần.</span>
            </div>
          </div>
        ) : (
          <div
            className="grid grid-cols-2 gap-2.5 text-left sm:gap-3"
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
              <p className="mt-1 font-serif text-xl font-bold tabular-nums text-app-ink">
                {reviewedAreaCount}/{areaCount}
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
  const [_lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [_autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveDraftStatus>("saved");
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
        saveBadge={
          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[#7A6E5E] bg-white border border-[rgba(23,21,15,0.1)] px-3 py-1.5 rounded-[999px]">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#16A34A"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21.801 10A10 10 0 1 1 17 3.335" />
              <path d="m9 11 3 3L22 4" />
            </svg>
            Đã lưu cục bộ
          </span>
        }
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
        <div ref={flowTopRef} tabIndex={-1} className="dof-stagger flex flex-col gap-5 focus:outline-none">
          <ScreenGuide {...SCREEN_GUIDES.onboarding} autoOpen />
          {progressHeader}

          {showBreathing ? (
            <div className="rounded-card border border-app-line bg-app-surface p-5 shadow-app-sm sm:p-6">
              <ZenBreathingGate onComplete={handleStartAssessment} />
            </div>
          ) : (
            <>
              {isReturning ? (
                <div className="flex items-start gap-3 rounded-[14px] border border-[rgba(12,94,58,0.18)] bg-[#EDF7E0] px-4 py-3.5 sm:items-center sm:px-[18px]">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#0C5E3A"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0"
                    aria-hidden="true"
                  >
                    <path d="M21.801 10A10 10 0 1 1 17 3.335" />
                    <path d="m9 11 3 3L22 4" />
                  </svg>
                  <span className="text-[13px] leading-relaxed text-[#3F4A3F]">
                    <strong className="font-semibold text-[#0C5E3A]">Cập nhật điểm hiện tại.</strong> Điểm cũ đã được
                    tải sẵn, bạn chỉ điều chỉnh phần thay đổi, không tạo lại từ đầu.
                  </span>
                </div>
              ) : null}

              {draftBanner}

              <section className="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-5">
                {/* LEFT: intro card */}
                <div className="space-y-5 rounded-[22px] border border-[rgba(23,21,15,0.08)] bg-white p-5 sm:space-y-[22px] sm:p-8">
                  <span className="inline-flex items-center gap-2 rounded-[999px] bg-[#EDF7E0] px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-[#0C5E3A]">
                    Bước 1 / 3 · Atlas cuộc sống · 3 phút
                  </span>
                  <div className="space-y-3 sm:space-y-[13px]">
                    <h1
                      className="text-[clamp(26px,2.6vw,34px)] font-extrabold leading-[1.08] text-[#17150F] sm:leading-[1.06]"
                      style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                    >
                      Mở bản đồ cuộc sống 12 tuần của bạn
                    </h1>
                    <p className="max-w-[46ch] text-[14px] leading-[1.55] text-[#5C574B]">
                      Rà 8 lĩnh vực để nhìn ra nơi cần chăm sóc đầu tiên, rồi chuyển thành Life Insight rõ ràng.
                    </p>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-3 sm:gap-3">
                    {JOURNEY_STEPS.map((item) => (
                      <div
                        key={item.title}
                        className="group rounded-[14px] border border-[rgba(23,21,15,0.08)] bg-[#FAF8F3] p-3.5 transition-[transform,border-color] duration-[0.15s] hover:-translate-y-0.5 hover:!border-[rgba(12,94,58,0.3)] sm:p-[15px]"
                      >
                        <span
                          className="text-[13px] font-semibold text-[#0C5E3A]"
                          style={{ fontFamily: "'JetBrains Mono', monospace" }}
                        >
                          {item.number}
                        </span>
                        <h2 className="mt-2 text-[13.5px] font-bold leading-snug text-[#17150F]">{item.title}</h2>
                        <p className="mt-1 text-[11.5px] leading-[1.45] text-[#7A6E5E]">{item.description}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-[13px] border border-[rgba(23,21,15,0.1)] bg-white">
                    <button
                      type="button"
                      className="flex min-h-[50px] w-full items-center justify-between gap-3 rounded-[13px] px-[17px] py-[15px] text-left text-[13.5px] font-semibold text-[#17150F] transition-colors hover:bg-[#FAF8F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C5E3A] focus-visible:ring-offset-2"
                      onClick={() => setIsHelpOpen(!isHelpOpen)}
                      aria-expanded={isHelpOpen}
                      aria-controls="onboarding-journey-help"
                    >
                      <span>Life Insight sẽ được tạo thế nào?</span>
                      {isHelpOpen ? (
                        <ChevronUp className="h-[17px] w-[17px] shrink-0 text-[#8C887C]" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="h-[17px] w-[17px] shrink-0 text-[#8C887C]" aria-hidden="true" />
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
                          <p className="px-4 pb-4 text-[12.5px] leading-relaxed text-[#5C574B]">
                            Sau khi bạn chấm 8 lĩnh vực, hệ thống so sánh với chu kỳ trước, tìm ra vùng tụt điểm nhất và
                            đề xuất 1 hành động ưu tiên — đó chính là Life Insight để bắt đầu chu kỳ 12 tuần.
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                    <button
                      type="button"
                      className="dof-primary inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[13px] bg-[#0C5E3A] px-6 py-3 text-[14px] font-bold text-white shadow-[0_14px_30px_-14px_rgba(12,94,58,0.8)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C5E3A] focus-visible:ring-offset-2 sm:min-h-[50px] sm:w-auto sm:py-3.5"
                      onClick={handleStartAssessment}
                    >
                      Mở bản đồ cuộc sống
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[13px] border border-[rgba(23,21,15,0.14)] bg-white px-5 py-3 text-[13.5px] font-semibold text-[#17150F] transition-colors hover:bg-[#FAF8F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C5E3A] focus-visible:ring-offset-2 sm:min-h-[50px] sm:w-auto sm:py-3.5"
                      onClick={() => setShowBreathing(true)}
                    >
                      <Smile className="h-[15px] w-[15px]" aria-hidden="true" />
                      Tập thở thư giãn
                    </button>
                    <button
                      type="button"
                      className="inline-flex min-h-[44px] w-full items-center justify-center rounded-[13px] px-2 py-2.5 text-[13.5px] font-semibold text-[#8C887C] transition-colors hover:text-[#5C574B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C5E3A] focus-visible:ring-offset-2 sm:w-auto sm:justify-start sm:py-3"
                      onClick={handleDefer}
                    >
                      Để sau
                    </button>
                  </div>
                </div>

                {/* RIGHT: wheel card */}
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
      <div
        ref={flowTopRef}
        tabIndex={-1}
        className="dof-stagger flex w-full max-w-full flex-col gap-5 focus:outline-none"
      >
        <ScreenGuide {...SCREEN_GUIDES.onboarding} autoOpen />
        {progressHeader}
        {draftBanner}

        <header className="space-y-2 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-app-accent">
            <Sparkles className="h-3.5 w-3.5 motion-safe:animate-pulse motion-reduce:animate-none" aria-hidden="true" />
            Bước 1 / 3 · Bánh xe cuộc sống
          </div>
          <h1 className="font-serif text-[28px] font-semibold leading-tight text-app-ink sm:text-4xl">
            Rà 8 lĩnh vực để mở Life Insight
          </h1>
          <p className="max-w-2xl text-[13px] leading-[1.55] text-app-ink-soft sm:text-base sm:leading-6">
            Chấm theo cảm nhận hiện tại. Bản đồ bên cạnh sẽ chỉ ra vùng mạnh và vùng cần chăm sóc đầu tiên.
          </p>
        </header>

        <div className="grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-start">
          <aside className="order-2 lg:sticky lg:top-6 lg:order-2">
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

          <div className="order-1 min-w-0 space-y-4 sm:space-y-[18px] lg:order-1">
            {/* ---- AREA PICKER (Clio design) ---- */}
            <div className="rounded-[18px] border border-[rgba(23,21,15,0.08)] bg-white px-4 py-4 sm:rounded-[20px] sm:px-6 sm:py-[22px]">
              <p className="mb-3 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#A8A296] sm:mb-[14px]">
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
                    <button
                      key={area.name}
                      type="button"
                      onClick={() => setActiveAreaIndex(index)}
                      className="dof-areachip cursor-pointer rounded-[12px] p-2.5 text-left font-[inherit] transition-[transform,border-color,background] duration-[0.15s] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C5E3A] focus-visible:ring-offset-2 sm:rounded-[14px] sm:p-[13px_14px]"
                      style={{
                        border: `1.5px solid ${isSelected ? designStyle.accent : "rgba(23,21,15,0.1)"}`,
                        background: isSelected ? designStyle.bg : "#fff",
                      }}
                      aria-pressed={isSelected}
                    >
                      <span
                        className="mb-2 flex h-7 w-7 items-center justify-center rounded-[8px] sm:mb-[10px] sm:h-[30px] sm:w-[30px] sm:rounded-[9px]"
                        style={{ background: designStyle.bg, color: designStyle.accent }}
                      >
                        <AreaIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      </span>
                      <span className="block text-[11.5px] font-bold leading-tight text-[#17150F] sm:text-[12.5px]">
                        <span className="sm:hidden">{index + 1}. {compactLabel}</span>
                        <span className="hidden sm:inline">
                          {index + 1}. {label}
                        </span>
                      </span>
                      <span className="mt-1 block text-[10.5px] leading-snug text-[#8C887C] sm:text-[11px]">
                        {isReviewed ? `Đã rà · ${area.score}đ` : "Chưa rà"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ---- RATING CARD (Clio design) ---- */}
            {(() => {
              const index = activeAreaIndex ?? 0;
              const area = lifeAreas[index];
              if (!area) return null;

              const AreaIcon = getCalmLifeAreaIcon(area.name);
              const areaLabel = getLifeAreaLabel(area.name);
              const designStyle = getDesignIconStyle(index);
              const sliderPct = (area.score / 10) * 100;
              const sliderBadge =
                area.score <= 2
                  ? "Rất thấp"
                  : area.score <= 4
                    ? "Thấp"
                    : area.score <= 6
                      ? "Tạm ổn"
                      : area.score <= 8
                        ? "Ổn định"
                        : "Rất tốt";

              return (
                <div className="rounded-[18px] border border-[rgba(23,21,15,0.08)] bg-white px-4 py-5 sm:rounded-[20px] sm:px-[26px] sm:py-6">
                  {/* Header: icon + name + score */}
                  <div className="mb-4 flex items-start justify-between gap-3 sm:mb-5 sm:items-center sm:gap-4">
                    <div className="flex min-w-0 items-center gap-3 sm:gap-[14px]">
                      <span
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] sm:h-12 sm:w-12 sm:rounded-[13px]"
                        style={{ background: designStyle.bg, color: designStyle.accent }}
                      >
                        <AreaIcon className="h-5 w-5 sm:h-[22px] sm:w-[22px]" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="mb-[3px] text-[10px] font-bold uppercase tracking-[0.1em] text-[#A8A296]">
                          Lĩnh vực {index + 1} / 8
                        </p>
                        <h2
                          ref={activeAreaHeadingRef}
                          tabIndex={-1}
                          className="text-[20px] font-bold leading-tight -tracking-[0.01em] text-[#17150F] focus:outline-none sm:text-[22px] sm:leading-none"
                          style={{ fontFamily: "'Bricolage Grotesque', sans-serif" }}
                        >
                          {areaLabel}
                        </h2>
                      </div>
                    </div>
                    <div
                      className="shrink-0 rounded-[12px] border border-[rgba(23,21,15,0.08)] px-3 py-[9px] text-right sm:rounded-[13px] sm:px-4 sm:py-[11px]"
                      style={{ background: "#FAF8F3" }}
                    >
                      <p className="mb-[3px] text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#A8A296]">
                        Điểm hiện tại
                      </p>
                      <p
                        className="text-2xl font-extrabold leading-none"
                        style={{ fontFamily: "'Bricolage Grotesque', sans-serif", color: designStyle.accent }}
                      >
                        {area.score}
                        <span className="text-sm font-bold text-[#A8A296]">/10</span>
                      </p>
                    </div>
                  </div>

                  {/* Question card */}
                  <div
                    className="mb-5 rounded-[13px] border border-[rgba(23,21,15,0.07)] p-4 sm:mb-[22px] sm:rounded-[14px] sm:p-[18px_20px]"
                    style={{ background: "#FAF8F3" }}
                  >
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#A8A296] sm:mb-[9px]">
                      Câu hỏi đánh giá
                    </p>
                    <p className="mb-1.5 text-[14px] font-bold leading-[1.45] text-[#17150F] sm:mb-[6px] sm:text-[15px] sm:leading-[1.4]">
                      {LIFE_AREA_QUESTIONS[area.name] ?? "Bạn hài lòng bao nhiêu với khía cạnh này?"}
                    </p>
                    <p className="text-[12.5px] leading-[1.5] text-[#7A6E5E]">
                      {LIFE_AREA_DETAILS[area.name] ?? "Một phần quan trọng trong cuộc sống của bạn."}
                    </p>
                  </div>

                  {/* Number buttons 0-10 */}
                  <p className="mb-3 text-[13px] font-semibold text-[#17150F]">Chọn điểm theo cảm nhận hiện tại</p>
                  <div data-onboarding-score-grid className="mb-5 grid grid-cols-4 gap-2 sm:mb-[22px] sm:flex sm:flex-wrap sm:gap-[9px]">
                    {SCORE_VALUES.map((scoreVal) => {
                      const isCurrentScore = area.score === scoreVal;
                      return (
                        <button
                          key={`score-${scoreVal}`}
                          type="button"
                          onClick={() => handleScoreChangeWrapped(index, [scoreVal])}
                          className="dof-num inline-flex h-[42px] w-full cursor-pointer items-center justify-center rounded-full border font-[inherit] text-[14px] font-bold transition-[transform,background,color] duration-[0.12s] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C5E3A] focus-visible:ring-offset-2 sm:w-[42px]"
                          style={{
                            borderColor: isCurrentScore ? designStyle.accent : "rgba(23,21,15,0.12)",
                            background: isCurrentScore ? designStyle.accent : "#FAF8F3",
                            color: isCurrentScore ? "#fff" : "#5C574B",
                            boxShadow: isCurrentScore ? `0 8px 18px -8px ${designStyle.accent}b3` : "none",
                          }}
                          aria-label={`Chấm ${scoreVal} điểm`}
                          aria-pressed={isCurrentScore}
                        >
                          {scoreVal}
                        </button>
                      );
                    })}
                  </div>

                  {/* Reference bands */}
                  <div className="mb-5 space-y-2.5 sm:mb-6">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#A8A296]">Mốc tham khảo</p>
                      {isMobile ? (
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(23,21,15,0.08)] bg-[#FAF8F3] px-3 py-1.5 text-[11px] font-semibold text-[#5C574B] transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C5E3A] focus-visible:ring-offset-2"
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
                      <div className="flex items-center gap-[11px] rounded-[11px] border border-[rgba(12,94,58,0.18)] bg-[#EDF7E0] p-[11px_14px]">
                        <span className="shrink-0 rounded-[7px] bg-[#0C5E3A] px-[9px] py-[3px] font-['JetBrains_Mono',monospace] text-[11.5px] font-bold text-white">
                          {getActiveScoreAnchor(area.score)?.range}
                        </span>
                        <div className="min-w-0">
                          <span className="text-[13px] font-bold text-[#0C5E3A]">
                            {getActiveScoreAnchor(area.score)?.label}
                          </span>
                          <span className="mx-1.5 text-[#76927E]">·</span>
                          <span className="text-[12.5px] text-[#5C6E61]">
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
                              borderColor: isActive ? "rgba(12,94,58,0.3)" : "rgba(23,21,15,0.08)",
                              background: isActive ? "#EDF7E0" : "#fff",
                            }}
                          >
                            <span
                              className="shrink-0 rounded-[7px] px-[9px] py-[3px] font-['JetBrains_Mono',monospace] text-[11.5px] font-bold"
                              style={{
                                background: isActive ? "#0C5E3A" : "#F2EFE6",
                                color: isActive ? "#fff" : "#8C887C",
                              }}
                            >
                              {anchor.range}
                            </span>
                            <div className="min-w-0">
                              <span
                                className="text-[13px] font-bold"
                                style={{ color: isActive ? "#0C5E3A" : "#17150F" }}
                              >
                                {anchor.label}
                              </span>
                              <span className="mx-1.5 text-[#8C887C]">·</span>
                              <span className="text-[12.5px] text-[#8C887C]">{anchor.description}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Slider with -/+ buttons */}
                  <div className="mb-[11px] flex items-center justify-between">
                    <span className="text-[13px] font-semibold text-[#17150F]">Hoặc kéo thanh trượt</span>
                    <span
                      className="inline-flex items-center rounded-[999px] border border-[rgba(231,164,0,0.25)] px-[11px] py-1 font-['JetBrains_Mono',monospace] text-xs font-semibold"
                      style={{ background: "#FFF8DE", color: "#9A7B00" }}
                    >
                      {area.score}đ · {sliderBadge}
                    </span>
                  </div>
                  <div className="mb-[22px] flex items-center gap-3 sm:mb-[26px] sm:gap-[14px]">
                    <button
                      type="button"
                      className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[rgba(23,21,15,0.14)] bg-white font-[inherit] text-[20px] font-semibold text-[#5C574B]"
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
                      className="dof-range flex-1 cursor-pointer"
                      style={{
                        background: `linear-gradient(90deg, ${designStyle.accent} ${sliderPct}%, #E4E0D4 ${sliderPct}%)`,
                      }}
                      aria-label={`Điểm ${areaLabel}`}
                    />
                    <button
                      type="button"
                      className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[rgba(23,21,15,0.14)] bg-white font-[inherit] text-[20px] font-semibold text-[#5C574B]"
                      onClick={() => handleScoreChangeWrapped(index, [Math.min(10, area.score + 1)])}
                      aria-label="Tăng 1 điểm"
                    >
                      +
                    </button>
                  </div>

                  {/* Area prev/next navigation */}
                  <div className="flex flex-col gap-3 border-t border-[rgba(23,21,15,0.08)] pt-5 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      type="button"
                      className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[11px] border border-[rgba(23,21,15,0.14)] bg-white px-[18px] py-[11px] font-[inherit] text-[13px] font-semibold text-[#5C574B] transition-colors hover:bg-[#FAF8F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C5E3A] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto sm:justify-start"
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
                        className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-[11px] border border-[rgba(23,21,15,0.12)] bg-white px-4 py-2.5 font-[inherit] text-[13px] font-semibold text-[#8C887C] transition-colors hover:text-[#5C574B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C5E3A] focus-visible:ring-offset-2 sm:min-h-0 sm:w-auto sm:justify-start sm:rounded-none sm:border-none sm:bg-transparent sm:px-0 sm:py-0"
                        onClick={() => {
                          handleSkipArea(index);
                          if (index < 7) setActiveAreaIndex(index + 1);
                        }}
                      >
                        Bỏ qua
                      </button>

                      <button
                        type="button"
                        className="dof-primary inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-[9px] rounded-[11px] border-none px-[22px] py-3 font-[inherit] text-[13.5px] font-bold text-white transition-[transform,box-shadow] duration-[0.18s] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C5E3A] focus-visible:ring-offset-2 sm:min-h-0 sm:w-auto"
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
                        {index < 7 ? (
                          <>
                            Rà lĩnh vực tiếp theo
                            <svg
                              width="15"
                              height="15"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M5 12h14" />
                              <path d="m12 5 7 7-7 7" />
                            </svg>
                          </>
                        ) : (
                          <>
                            Chọn trọng tâm
                            <svg
                              width="15"
                              height="15"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              aria-hidden="true"
                            >
                              <path d="M5 12h14" />
                              <path d="m12 5 7 7-7 7" />
                            </svg>
                          </>
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
                className="flex items-start gap-3 rounded-[14px] border border-[rgba(12,94,58,0.18)] bg-[#EDF7E0] p-4"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0C5E3A"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-0.5 shrink-0"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
                <p className="text-[13px] font-medium leading-[1.5] text-[#3F4A3F]">
                  Còn <strong className="font-semibold text-[#0C5E3A]">{remainingAreaCount} khía cạnh</strong> chưa
                  chấm. Bạn có thể chọn trọng tâm với điểm mặc định 5 cho phần còn lại.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ---- BOTTOM NAV (Clio design) ---- */}
        <footer data-onboarding-bottom-nav className="flex flex-col gap-3 border-t border-[rgba(23,21,15,0.08)] pt-[18px] sm:flex-row sm:items-center sm:justify-between sm:gap-[14px]">
          <div className="flex w-full flex-col gap-2.5 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
            <button
              type="button"
              className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[11px] border border-[rgba(23,21,15,0.14)] bg-white px-[18px] py-3 font-[inherit] text-[13px] font-semibold text-[#5C574B] transition-colors hover:bg-[#FAF8F3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C5E3A] focus-visible:ring-offset-2 sm:w-auto sm:justify-start"
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
              className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-[11px] border border-[rgba(23,21,15,0.12)] bg-white px-4 py-2.5 font-[inherit] text-[13px] font-semibold text-[#8C887C] transition-colors hover:text-[#5C574B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C5E3A] focus-visible:ring-offset-2 sm:min-h-0 sm:w-auto sm:justify-start sm:rounded-none sm:border-none sm:bg-transparent sm:px-0 sm:py-0"
              onClick={handleDefer}
            >
              Để sau
            </button>
          </div>
          <button
            id="btn-complete-onboarding"
            type="button"
            className="dof-primary inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-[9px] rounded-[13px] border-none bg-[#0C5E3A] px-[26px] py-[13px] font-[inherit] text-[14px] font-bold text-white shadow-[0_14px_30px_-14px_rgba(12,94,58,0.8)] transition-[transform,box-shadow] duration-[0.18s] hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C5E3A] focus-visible:ring-offset-2 sm:w-auto"
            onClick={canCompleteAssessment ? handleComplete : handleDeferAssessment}
          >
            Chọn trọng tâm
            {!canCompleteAssessment ? <span className="sr-only"> (Dùng điểm mặc định)</span> : null}
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </button>
        </footer>
      </div>
    </PageShell>
  );
}
