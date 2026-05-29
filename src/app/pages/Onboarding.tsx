import { useCallback, useEffect, useRef, useState } from "react";
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
  type LucideIcon,
} from "lucide-react";

import { toast } from "sonner";

import { AutoSaveIndicator } from "../components/AutoSaveIndicator";
import { CoreFlowProgress } from "../components/CoreFlowProgress";
import { PageShell } from "../components/PageShell";
import { EmptyState } from "../components/states/EmptyState";
import { InlineStatusMessage } from "../components/states/InlineStatusMessage";
import { ZenBreathingGate } from "./Onboarding/components/ZenBreathingGate";
import { Slider } from "../components/ui/slider";
import { trackAnalyticsEvent } from "../utils/analytics";
import { hasRealLifeBalance } from "../utils/core-flow-guard";
import { LIFE_AREAS, type LifeArea, getLifeAreaLabel, getUserData, updateWheelOfLife } from "../utils/storage";
import { useScrollToTopOnChange } from "../hooks/useScrollToTopOnChange";
import { useDirtyFormGuard } from "../hooks/useDirtyFormGuard";

type OnboardingStep = "welcome" | "assessment";

type AutoSaveDraftStatus = "idle" | "saving" | "saved";

const JOURNEY_STEPS = [
  {
    icon: Heart,
    title: "Chấm 8 lĩnh vực",
    description: "Nhìn nhanh sức khỏe hiện tại của từng phần trong cuộc sống.",
  },
  {
    icon: Compass,
    title: "Chọn trọng tâm",
    description: "Dữ liệu này mở Góc nhìn cuộc sống để chọn đúng nơi nên ưu tiên.",
  },
  {
    icon: Target,
    title: "Đi tiếp tới mục tiêu SMART",
    description: "Trọng tâm được chuyển thành mục tiêu rõ và kế hoạch 12 tuần.",
  },
] satisfies Array<{ icon: LucideIcon; title: string; description: string }>;

const FEATURE_PILLS = ["8 lĩnh vực", "3 phút", "Góc nhìn cuộc sống", "mục tiêu SMART", "12 tuần"];

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
            <div className="surface-raised rounded-2xl border border-app-line bg-app-surface p-6 md:p-8">
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

              <EmptyState
                as="section"
                align="left"
                headingLevel={1}
                icon={<Compass className="h-6 w-6" aria-hidden="true" />}
                eyebrow="BẮT ĐẦU · CÂN BẰNG CUỘC SỐNG"
                title="Cùng xem bức tranh hiện tại của bạn."
                description="Chấm 8 lĩnh vực để chọn đúng nơi cần ưu tiên. Mất khoảng 3 phút."
                actions={
                  <>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-app-accent px-5 py-3 text-sm font-medium text-white transition-all duration-150 hover:brightness-105 hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2"
                      onClick={() => setShowBreathing(true)}
                    >
                      Bắt đầu chấm điểm
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-lg px-5 py-3 text-sm font-medium text-app-ink-soft transition-all duration-150 hover:bg-app-bg hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40 focus-visible:ring-offset-2"
                      onClick={handleDefer}
                    >
                      Để sau
                    </button>
                  </>
                }
              >
                <div className="grid gap-4 md:grid-cols-3">
                  {JOURNEY_STEPS.map((item) => {
                    const Icon = item.icon;

                    return (
                      <article key={item.title} className="group surface-raised rounded-xl border border-app-line bg-app-surface p-5 transition-all duration-300 hover:shadow-md hover:border-app-accent/30">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-app-accent-soft text-app-accent">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </div>
                        <h2 className="mt-3 text-sm font-medium text-app-ink">{item.title}</h2>
                        <p className="mt-1 text-sm leading-relaxed text-app-ink-soft">{item.description}</p>
                      </article>
                    );
                  })}
                </div>

                <div className="mt-6 flex flex-wrap gap-2">
                  {FEATURE_PILLS.map((item) => (
                    <span
                      key={item}
                      className="rounded-full border border-app-line bg-app-bg px-3 py-1 text-xs font-medium text-app-ink-soft"
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </EmptyState>
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

        <section
          className="surface-raised rounded-xl border border-app-line bg-app-surface p-5 md:p-8"
          aria-labelledby="onboarding-assessment-title"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-ink-muted">
            BƯỚC 1 / 6 · CÂN BẰNG CUỘC SỐNG
          </p>
          <h1
            id="onboarding-assessment-title"
            className="mt-3 max-w-3xl font-serif text-3xl font-medium leading-tight tracking-tight text-app-ink"
          >
            Chấm 8 lĩnh vực của bạn
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-app-ink-soft">
            Mỗi lĩnh vực 0 đến 10. 0 = rất kém, 10 = rất tốt. Không cần đúng tuyệt đối — đây là cảm nhận hiện tại.
          </p>

          <div
            data-testid="onboarding-assessment-summary"
            className="mt-6 grid gap-3 rounded-card border border-app-line bg-app-bg p-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <div className="rounded-lg border border-app-line bg-app-surface p-3">
              <p className="text-xs text-app-ink-muted">Điểm trung bình</p>
              <p className="mt-1 font-serif text-3xl font-medium text-app-ink tabular-nums">
                {averageScore.toFixed(1)}/10
              </p>
            </div>
            <div className="rounded-lg border border-app-line bg-app-surface p-3">
              <p className="text-xs text-app-ink-muted">Đã rà soát</p>
              <p className="mt-1 font-serif text-3xl font-medium text-app-ink tabular-nums">
                {reviewedAreaCount}/{lifeAreas.length}
              </p>
            </div>
            <div className="rounded-lg border border-app-line bg-app-surface p-3">
              <p className="text-xs text-app-ink-muted">Ưu tiên</p>
              <p className="mt-1 text-sm font-medium text-app-ink">{getLifeAreaLabel(growthArea.name)}</p>
              <p className="mt-1 text-xs text-app-ink-muted">{growthArea.score}/10</p>
            </div>
            <div className="rounded-lg border border-app-line bg-app-surface p-3">
              <p className="text-xs text-app-ink-muted">Mạnh nhất</p>
              <p className="mt-1 text-sm font-medium text-app-ink">{getLifeAreaLabel(strongestArea.name)}</p>
              <p className="mt-1 text-xs text-app-ink-muted">{strongestArea.score}/10</p>
            </div>
          </div>
        </section>

        <section className="space-y-3" aria-label="8 lĩnh vực cuộc sống">
          {lifeAreas.map((area, index) => {
            const AreaIcon = getCalmLifeAreaIcon(area.name);
            const areaLabel = getLifeAreaLabel(area.name);
            const isAreaReviewed = reviewedAreaIndices.has(index);

            return (
              <article key={area.name} className="surface-raised rounded-xl border border-app-line bg-app-surface p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-app-accent-soft text-app-accent">
                      <AreaIcon className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-medium text-app-ink">{areaLabel}</h2>
                        {isAreaReviewed ? (
                          <span className="rounded-full bg-app-accent-soft px-2 py-0.5 text-xs font-medium text-app-accent">
                            Đã rà
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs leading-5 text-app-ink-muted">
                        {LIFE_AREA_DETAILS[area.name] ?? "Một phần quan trọng trong bức tranh hiện tại của bạn."}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <p className="font-serif text-3xl font-medium leading-none text-app-ink tabular-nums">{area.score}</p>
                    {!isAreaReviewed ? (
                      <button
                        type="button"
                        className="rounded-full border border-app-line bg-app-surface px-3 py-1 text-xs font-medium text-app-ink-soft transition-colors duration-150 hover:bg-app-bg hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
                        onClick={() => handleSkipArea(index)}
                      >
                        Để sau
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4">
                  <Slider
                    value={[area.score]}
                    onValueChange={(value) => handleScoreChangeWrapped(index, value)}
                    min={0}
                    max={10}
                    step={1}
                    className="w-full"
                    aria-label={`Điểm ${areaLabel}`}
                  />
                  <div className="mt-2 flex items-center justify-between text-xs text-app-ink-muted">
                    <span>0</span>
                    <span>10</span>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        {!canCompleteAssessment ? (
          <InlineStatusMessage tone="warning">
            Còn {remainingAreaCount} lĩnh vực chưa rà. Bạn có thể bấm "Để sau" ở từng lĩnh vực hoặc đi tiếp
            với điểm mặc định.
          </InlineStatusMessage>
        ) : null}

        <footer className="mt-8 flex flex-col gap-3 border-t border-app-line pt-6">
          <p className="text-xs text-app-ink-muted">Bước 1 / 6 · Cân bằng</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              className="order-2 inline-flex items-center justify-center gap-2 rounded-lg border border-app-line bg-app-surface px-4 py-2.5 text-sm font-medium text-app-ink transition-all duration-150 hover:bg-app-bg hover:shadow-sm active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40 focus-visible:ring-offset-2 sm:order-1"
              onClick={() => setStep("welcome")}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Quay lại welcome
            </button>
            <button
              type="button"
              className="order-1 inline-flex items-center justify-center gap-2 rounded-lg bg-app-accent px-4 py-2.5 text-sm font-medium text-white transition-all duration-150 hover:brightness-105 hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 sm:order-2"
              onClick={canCompleteAssessment ? handleComplete : handleDeferAssessment}
            >
              {canCompleteAssessment ? "Tiếp → Chọn trọng tâm" : "Để sau"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </footer>
      </div>
    </PageShell>
  );
}
