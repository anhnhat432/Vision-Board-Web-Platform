import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, BarChart3, Check, Compass, Heart, Sparkles, Target } from "lucide-react";

import { toast } from "sonner";

import { AutoSaveIndicator } from "../components/AutoSaveIndicator";
import { CoreFlowProgress } from "../components/CoreFlowProgress";
import { LifeBalanceWheelIllustration, WelcomeIllustration, getLifeAreaIcon } from "../components/illustrations";
import { PageShell } from "../components/PageShell";
import { ProductVisual } from "../components/visuals/ProductVisual";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Slider } from "../components/ui/slider";
import { useReducedMotion } from "../components/ui/use-reduced-motion";
import { InlineStatusMessage } from "../components/states/InlineStatusMessage";
import { trackAnalyticsEvent } from "../utils/analytics";
import { hasRealLifeBalance } from "../utils/core-flow-guard";
import { LIFE_AREAS, type LifeArea, getLifeAreaLabel, getUserData, updateWheelOfLife } from "../utils/storage";
import { useScrollToTopOnChange } from "../hooks/useScrollToTopOnChange";

type OnboardingStep = "welcome" | "assessment";

const JOURNEY_STEPS = [
  {
    icon: Heart,
    title: "Chấm 8 lĩnh vực",
    description: "Nhìn nhanh sức khỏe hiện tại của từng phần trong cuộc sống.",
    iconClass:
      "bg-gradient-to-br from-rose-100 to-pink-100 text-rose-600 dark:from-rose-950/50 dark:to-pink-950/40 dark:text-rose-200",
  },
  {
    icon: Compass,
    title: "Chọn trọng tâm",
    description: "Dữ liệu này mở Góc nhìn cuộc sống để chọn đúng nơi nên ưu tiên.",
    iconClass:
      "bg-gradient-to-br from-violet-100 to-fuchsia-100 text-violet-700 dark:from-violet-950/50 dark:to-fuchsia-950/40 dark:text-violet-200",
  },
  {
    icon: Target,
    title: "Đi tiếp tới mục tiêu SMART",
    description: "Trọng tâm được chuyển thành mục tiêu rõ và kế hoạch 12 tuần.",
    iconClass:
      "bg-gradient-to-br from-emerald-100 to-teal-100 text-emerald-700 dark:from-emerald-950/50 dark:to-teal-950/40 dark:text-emerald-200",
  },
];

const FEATURE_PILLS = ["8 lĩnh vực", "Khoảng 3 phút", "Góc nhìn cuộc sống", "mục tiêu SMART", "12 tuần"];
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
  return Math.min(10, Math.max(1, Math.round(value)));
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

function createOnboardingDraft(step: OnboardingStep, lifeAreas: LifeArea[], reviewedAreaIndices: Set<number>): OnboardingDraft {
  return {
    version: ONBOARDING_DRAFT_VERSION,
    completed: false,
    step,
    lifeAreas: lifeAreas.map((area) => ({ ...area })),
    reviewedAreaIndices: [...reviewedAreaIndices],
    updatedAt: new Date().toISOString(),
  };
}

function OnboardingPageMotion({ children }: { children: ReactNode }) {
  const prefersReducedMotion = useReducedMotion();
  const className = "stack-stack";

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Onboarding() {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [isReturning, setIsReturning] = useState(false);
  const [lifeAreas, setLifeAreas] = useState<LifeArea[]>(createDefaultOnboardingLifeAreas);
  const [reviewedAreaIndices, setReviewedAreaIndices] = useState<Set<number>>(new Set());
  const [isDirty, setIsDirty] = useState(false);
  const [availableDraft, setAvailableDraft] = useState<OnboardingDraft | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const flowTopRef = useRef<HTMLDivElement | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

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

  const handleScoreChangeWrapped = useCallback((index: number, value: number[]) => {
    setLifeAreas((currentAreas) =>
      currentAreas.map((area, areaIndex) => (areaIndex === index ? { ...area, score: value[0] ?? 1 } : area)),
    );
    setReviewedAreaIndices((current) => {
      const next = new Set(current);
      next.add(index);
      return next;
    });
    setIsDirty(true);
  }, []);

  useEffect(() => {
    if (!isDirty) return;

    const draft = createOnboardingDraft(step, lifeAreas, reviewedAreaIndices);
    cancelPendingDraftSave();
    autosaveTimerRef.current = window.setTimeout(() => {
      writeOnboardingDraft(draft);
      setLastSavedAt(new Date());
      autosaveTimerRef.current = null;
    }, 500);

    return cancelPendingDraftSave;
  }, [cancelPendingDraftSave, isDirty, lifeAreas, reviewedAreaIndices, step]);

  useEffect(() => cancelPendingDraftSave, [cancelPendingDraftSave]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const handleComplete = () => {
    if (!canCompleteAssessment) return;
    updateWheelOfLife(lifeAreas);
    clearOnboardingDraft();
    cancelPendingDraftSave();
    setAvailableDraft(null);
    setLastSavedAt(null);
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
  };

  const draftBanner = availableDraft ? (
    <InlineStatusMessage tone="warning" prefix="Tiếp tục từ chỗ bạn dừng?">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="leading-6">Bạn có bản nháp Cân bằng cuộc sống chưa hoàn thành.</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button size="sm" onClick={handleResumeDraft}>
            Tiếp tục
          </Button>
          <Button size="sm" variant="outline" onClick={handleRestartDraft}>
            Bắt đầu lại
          </Button>
        </div>
      </div>
    </InlineStatusMessage>
  ) : null;

  if (step === "welcome") {
    return (
      <PageShell maxWidth="xl" outerClassName="page-enter" className="focus:outline-none">
        <div ref={flowTopRef} tabIndex={-1} className="focus:outline-none">
          <OnboardingPageMotion>
            <CoreFlowProgress currentStepId="life_balance" />

            <Card>
              <CardContent className="relative p-5 sm:p-7 lg:p-8">
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_320px]">
                  <div className="stack-stack">
                    {isReturning && (
                      <InlineStatusMessage tone="success" prefix="Cập nhật điểm hiện tại.">
                        Điểm cũ đã được tải sẵn, bạn chỉ điều chỉnh phần thay đổi, không tạo lại từ đầu.
                      </InlineStatusMessage>
                    )}

                    {draftBanner}

                    <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5 text-[color:var(--tone-shell-secondary)]" aria-hidden="true" />
                      Bước 1 · Cân bằng cuộc sống
                    </p>

                    <div className="stack-tight">
                      <h1 className="max-w-3xl text-3xl font-bold leading-[1.1] tracking-[-0.018em] text-foreground sm:text-4xl">
                        {isReturning ? "Cập nhật lại " : "Bắt đầu bằng "}
                        <span className="text-gradient-vibrant">8 lĩnh vực</span>
                        {isReturning
                          ? " để góc nhìn bám sát cuộc sống hiện tại hơn."
                          : " để biết nên ưu tiên điều gì trước."}
                      </h1>
                      <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
                        Chỉ khoảng 3 phút để chấm điểm hiện tại. Kết quả sẽ nối thẳng sang Góc nhìn cuộc sống, mục tiêu SMART
                        và kế hoạch 12 tuần, nên bạn không phải đoán bước tiếp theo.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {FEATURE_PILLS.map((item) => (
                        <span
                          key={item}
                          className="rounded-[var(--r-pill)] border border-[color:var(--border)] bg-[color:var(--muted)] px-3 py-1.5 text-xs font-semibold text-muted-foreground"
                        >
                          {item}
                        </span>
                      ))}
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button glow className="w-full sm:w-auto" onClick={handleStartAssessment}>
                        Bắt đầu chấm 8 lĩnh vực
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full sm:w-auto"
                        onClick={() => {
                          if (reviewedAreaIndices.size > 0) {
                            updateWheelOfLife(lifeAreas);
                            clearOnboardingDraft();
                            cancelPendingDraftSave();
                            setAvailableDraft(null);
                            setIsDirty(false);
                            toast.success("Đã lưu phần bạn đã chỉnh. Bạn có thể quay lại rà đủ 8 lĩnh vực bất kỳ lúc nào.");
                          } else {
                            toast.info("Chưa có điểm nào được chỉnh. Dữ liệu chưa lưu.");
                          }
                          navigate("/");
                        }}
                      >
                        Quay lại sau
                      </Button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-3">
                      {JOURNEY_STEPS.map((item, index) => {
                        const Icon = item.icon;

                        return (
                          <motion.div
                            key={item.title}
                            initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
                            animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                            transition={{ duration: 0.32, delay: index * 0.06, ease: "easeOut" }}
                            className="rounded-[var(--r-tile)] border border-[color:var(--border)] bg-card p-4 shadow-[var(--shadow-1)]"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                                Bước 0{index + 1}
                              </span>
                              <div
                                className={`flex h-10 w-10 items-center justify-center rounded-[var(--r-control)] shadow-sm ${item.iconClass}`}
                              >
                                <Icon className="h-5 w-5" />
                              </div>
                            </div>
                            <h3 className="mt-[var(--space-inline)] text-base font-semibold text-foreground">
                              {item.title}
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="hidden rounded-[var(--r-card)] border border-[color:var(--border)] bg-[color:var(--muted)] p-5 xl:block">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Bạn sẽ nhận được gì
                    </p>
                    <WelcomeIllustration className="mt-[var(--space-stack)] w-full text-[color:var(--tone-shell-primary)]" />
                    <LifeBalanceWheelIllustration className="mx-auto mt-2 w-48 text-[color:var(--tone-shell-secondary)] opacity-80" />
                    <ProductVisual variant="moodboard" className="mt-[var(--space-stack)] min-h-[210px]" />
                    <div className="mt-[var(--space-stack)] stack-tight">
                      {[
                        "Điểm trung bình để đọc mặt bằng hiện tại.",
                        "Lĩnh vực thấp nhất để mở Góc nhìn cuộc sống.",
                        "Lĩnh vực mạnh nhất để biết phần đang tạo lực đỡ.",
                      ].map((item) => (
                        <div
                          key={item}
                          className="flex items-start gap-3 rounded-[var(--r-control)] border border-[color:var(--border)] bg-card p-3"
                        >
                          <Check className="mt-0.5 h-4 w-4 text-[color:var(--color-success-fg)]" />
                          <p className="text-sm leading-6 text-muted-foreground">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </OnboardingPageMotion>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth="xl" className="focus:outline-none">
      <div ref={flowTopRef} tabIndex={-1} className="focus:outline-none">
        <OnboardingPageMotion>
          <CoreFlowProgress currentStepId="life_balance" />
          {draftBanner}

          <Card>
            <CardContent className="p-5 sm:p-7">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="stack-tight">
                  <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    <Compass className="h-3.5 w-3.5 text-[color:var(--tone-shell-secondary)]" aria-hidden="true" />
                    Chấm 8 lĩnh vực
                  </p>
                  <h1 className="max-w-3xl text-3xl font-bold leading-[1.1] tracking-[-0.018em] text-foreground sm:text-4xl">
                    Chấm điểm hiện tại để biết chính xác{" "}
                    <span className="text-gradient-vibrant">nơi bạn nên bắt đầu</span>.
                  </h1>
                  <p className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
                    Kéo từng lĩnh vực từ 1 đến 10. Tóm tắt bên cạnh cập nhật ngay để bạn thấy tín hiệu trước khi lưu.
                  </p>
                </div>

                <div
                  data-testid="onboarding-assessment-summary"
                  className="relative overflow-hidden rounded-[var(--r-tile)] border border-[color:var(--border)] bg-[color:var(--muted)] p-4"
                >
                  <LifeBalanceWheelIllustration className="pointer-events-none absolute -right-10 -top-10 hidden w-36 text-[color:var(--tone-shell-primary)] opacity-15 lg:block" />
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Tín hiệu đang hiện ra
                    </p>
                    <AutoSaveIndicator lastSavedAt={lastSavedAt} />
                  </div>
                  <div className="mt-[var(--space-inline)] grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-[var(--r-control)] border border-[color:var(--border)] bg-card p-3">
                      <p className="text-muted-foreground">Điểm trung bình</p>
                      <p className="mt-1 text-xl font-bold text-foreground">{averageScore.toFixed(1)}/10</p>
                    </div>
                    <div className="rounded-[var(--r-control)] border border-[color:var(--border)] bg-card p-3">
                      <p className="text-muted-foreground">Đã rà soát</p>
                      <p className="mt-1 text-xl font-bold text-foreground">
                        {reviewedAreaCount}/{lifeAreas.length}
                      </p>
                    </div>
                    <div className="rounded-[var(--r-control)] border border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-bg)] p-3">
                      <p className="text-[color:var(--color-warning-fg)]">Ưu tiên</p>
                      <p className="mt-1 font-semibold text-[color:var(--color-warning-fg)]">
                        {getLifeAreaLabel(growthArea.name)}
                      </p>
                      <p className="text-sm text-[color:var(--color-warning-fg)] opacity-90">{growthArea.score}/10</p>
                    </div>
                    <div className="rounded-[var(--r-control)] border border-[color:var(--color-success-border)] bg-[color:var(--color-success-bg)] p-3">
                      <p className="text-[color:var(--color-success-fg)]">Mạnh nhất</p>
                      <p className="mt-1 font-semibold text-[color:var(--color-success-fg)]">
                        {getLifeAreaLabel(strongestArea.name)}
                      </p>
                      <p className="text-sm text-[color:var(--color-success-fg)] opacity-90">{strongestArea.score}/10</p>
                    </div>
                  </div>
                  <p className="mt-[var(--space-inline)] text-sm leading-6 text-muted-foreground">
                    {remainingAreaCount === 0
                      ? "Bánh xe đã sẵn sàng để lưu và mở Góc nhìn cuộc sống."
                      : `Còn ${remainingAreaCount} lĩnh vực nên rà lại trước khi lưu.`}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <Card>
              <CardContent className="stack-tight p-5 sm:p-7">
                {lifeAreas.map((area, index) => {
                  const AreaIcon = getLifeAreaIcon(area.name);

                  return (
                    <div
                      key={area.name}
                      className="card-hover-lift tap-scale rounded-[var(--r-tile)] border border-[color:var(--border)] bg-card p-3 shadow-[var(--shadow-1)] sm:p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <AreaIcon className="h-6 w-6 shrink-0" style={{ color: area.color }} />
                          <div
                            className="h-3.5 w-3.5 shrink-0 rounded-[var(--r-pill)] ring-4 ring-[color:var(--muted)]"
                            style={{ backgroundColor: area.color }}
                          />
                          <h3 className="text-base font-semibold text-foreground sm:text-lg">
                            {getLifeAreaLabel(area.name)}
                          </h3>
                        </div>

                        <div
                          className="min-w-14 rounded-[var(--r-pill)] px-3 py-1.5 text-center text-sm font-semibold text-white shadow-sm"
                          style={{ backgroundColor: area.color }}
                        >
                          {area.score}/10
                        </div>
                      </div>

                      <div className="mt-[var(--space-inline)]">
                        <Slider
                          value={[area.score]}
                          onValueChange={(value) => handleScoreChangeWrapped(index, value)}
                          min={1}
                          max={10}
                          step={1}
                          className="w-full"
                          trackColor={area.color}
                          aria-label={`Điểm ${getLifeAreaLabel(area.name)}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            <div className="stack-stack xl:sticky xl:top-28">
              <Card>
                <CardContent className="p-5 sm:p-7">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[var(--r-control)] bg-[color:var(--muted)] text-[color:var(--tone-shell-primary)]">
                      <BarChart3 className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">Sẵn sàng sang Góc nhìn cuộc sống</h3>
                      <p className="text-sm leading-6 text-muted-foreground">
                        Rà đủ 8 lĩnh vực trước khi lưu để dữ liệu phản ánh đúng cuộc sống hiện tại.
                      </p>
                    </div>
                  </div>

                  <div className="mt-[var(--space-stack)] flex flex-col gap-3">
                    <Button variant="outline" onClick={() => setStep("welcome")}>
                      <ArrowLeft className="h-4 w-4" />
                      Quay lại giới thiệu
                    </Button>
                    {!canCompleteAssessment ? (
                      <InlineStatusMessage tone="warning">
                        Còn {remainingAreaCount} lĩnh vực cần rà trước khi lưu.
                      </InlineStatusMessage>
                    ) : null}
                    <Button glow={canCompleteAssessment} onClick={handleComplete} disabled={!canCompleteAssessment}>
                      Hoàn thành đánh giá
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </OnboardingPageMotion>
      </div>
    </PageShell>
  );
}
