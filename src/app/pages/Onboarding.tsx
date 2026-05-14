import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, BarChart3, Check, Compass, Heart, Sparkles, Target } from "lucide-react";

import { toast } from "sonner";

import { CoreFlowProgress } from "../components/CoreFlowProgress";
import { LifeBalanceWheelIllustration, WelcomeIllustration, getLifeAreaIcon } from "../components/illustrations";
import { ProductVisual } from "../components/visuals/ProductVisual";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Slider } from "../components/ui/slider";
import { useReducedMotion } from "../components/ui/use-reduced-motion";
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

function OnboardingPageMotion({ children }: { children: ReactNode }) {
  const prefersReducedMotion = useReducedMotion();
  const className = "mx-auto w-full max-w-6xl stack-stack sm:stack-stack";

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
  const [lifeAreas, setLifeAreas] = useState<LifeArea[]>(LIFE_AREAS.map((area) => ({ ...area, score: 5 })));
  const [reviewedAreaIndices, setReviewedAreaIndices] = useState<Set<number>>(new Set());
  const [isDirty, setIsDirty] = useState(false);
  const flowTopRef = useRef<HTMLDivElement | null>(null);

  const guardedRef = useRef(false);
  useEffect(() => {
    if (guardedRef.current) return;
    guardedRef.current = true;
    const data = getUserData();
    if (hasRealLifeBalance(data)) {
      setIsReturning(true);
      setLifeAreas(data.currentWheelOfLife);
      setReviewedAreaIndices(new Set(data.currentWheelOfLife.map((_, index) => index)));
    }
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

  if (step === "welcome") {
    return (
      <div
        ref={flowTopRef}
        tabIndex={-1}
        className="flow-shell min-h-screen px-4 py-4 focus:outline-none sm:px-6 sm:py-6 lg:px-8 page-enter"
      >
        <OnboardingPageMotion>
          <CoreFlowProgress currentStepId="life_balance" />

          <Card className="flow-surface surface-aurora ring-soft-glow overflow-hidden border border-slate-200/80 bg-white/94 shadow-xl shadow-slate-900/5 dark:shadow-black/30">
            <CardContent className="relative p-4 sm:p-6 lg:p-7 xl:p-8">
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_360px]">
                <div className="stack-stack">
                  {isReturning && (
                    <div className="rounded-[var(--r-control)] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
                      <span className="font-semibold">Cập nhật điểm hiện tại.</span> Điểm cũ đã được tải sẵn,
                      bạn chỉ điều chỉnh phần thay đổi, không tạo lại từ đầu.
                    </div>
                  )}

                  <div className="inline-flex items-center gap-2 rounded-[var(--r-pill)] border border-violet-200 bg-violet-50 px-4 py-1.5 text-sm font-semibold text-violet-700">
                    <Sparkles className="h-4 w-4" />
                    Bước 1: Cân bằng cuộc sống
                  </div>

                  <div className="stack-tight">
                    <h1 className="max-w-3xl text-3xl font-semibold leading-[1.15] tracking-tight text-slate-950 sm:text-4xl md:text-5xl">
                      {isReturning ? "Cập nhật lại " : "Bắt đầu bằng "}
                      <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                        8 lĩnh vực
                      </span>
                      {isReturning
                        ? " để góc nhìn bám sát cuộc sống hiện tại hơn."
                        : " để biết nên ưu tiên điều gì trước."}
                    </h1>
                    <p className="max-w-2xl text-sm leading-relaxed text-slate-700 sm:text-base dark:text-slate-300">
                      Chỉ khoảng 3 phút để chấm điểm hiện tại. Kết quả sẽ nối thẳng sang Góc nhìn cuộc sống, mục tiêu SMART
                      và kế hoạch 12 tuần, nên bạn không phải đoán bước tiếp theo.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {FEATURE_PILLS.map((item) => (
                      <span
                        key={item}
                        className="rounded-[var(--r-pill)] border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600"
                      >
                        {item}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      className="w-full bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30 hover:from-violet-700 hover:to-fuchsia-700 sm:w-auto"
                      onClick={handleStartAssessment}
                    >
                      Bắt đầu chấm 8 lĩnh vực
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full text-slate-500 hover:bg-slate-50 sm:w-auto"
                      onClick={() => {
                        updateWheelOfLife(lifeAreas);
                        setIsDirty(false);
                        toast.success("Đã lưu 8 lĩnh vực, bạn có thể quay lại bất kỳ lúc nào.");
                        navigate("/");
                      }}
                    >
                      Lưu và quay lại sau
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
                          className="rounded-[var(--r-tile)] border border-violet-100/80 bg-white/82 p-4 shadow-sm dark:border-violet-400/15 dark:bg-slate-900/60"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-slate-400">
                              Bước 0{index + 1}
                            </span>
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-[var(--r-control)] shadow-sm ${item.iconClass}`}
                            >
                              <Icon className="h-5 w-5" />
                            </div>
                          </div>
                          <h3 className="mt-[var(--space-inline)] text-base font-semibold text-slate-950">
                            {item.title}
                          </h3>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                <div className="hidden rounded-[var(--r-card)] border border-slate-200 bg-slate-50/80 p-5 xl:block">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Bạn sẽ nhận được gì</p>
                  <WelcomeIllustration className="mt-[var(--space-stack)] w-full text-violet-500" />
                  <LifeBalanceWheelIllustration className="mx-auto mt-2 w-48 text-fuchsia-500 opacity-80" />
                  <ProductVisual variant="moodboard" className="mt-[var(--space-stack)] min-h-[210px]" />
                  <div className="mt-[var(--space-stack)] stack-tight">
                    {[
                      "Điểm trung bình để đọc mặt bằng hiện tại.",
                      "Lĩnh vực thấp nhất để mở Góc nhìn cuộc sống.",
                      "Lĩnh vực mạnh nhất để biết phần đang tạo lực đỡ.",
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-3 rounded-[var(--r-control)] border border-slate-200 bg-white p-3">
                        <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                        <p className="text-sm leading-6 text-slate-600">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </OnboardingPageMotion>
      </div>
    );
  }

  return (
    <div
      ref={flowTopRef}
      tabIndex={-1}
      className="flow-shell min-h-screen px-4 py-4 focus:outline-none sm:px-6 sm:py-6 lg:px-8"
    >
      <OnboardingPageMotion>
        <CoreFlowProgress currentStepId="life_balance" />

        <Card className="flow-surface surface-aurora ring-soft-glow overflow-hidden border border-slate-200/80 bg-white/94 shadow-xl shadow-slate-900/5 dark:shadow-black/30">
          <CardContent className="p-4 sm:p-6 lg:p-7">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="stack-tight">
                <div className="inline-flex items-center gap-2 rounded-[var(--r-pill)] border border-slate-200 bg-slate-50 px-4 py-1.5 text-sm text-slate-600">
                  <Compass className="h-4 w-4" />
                  Chấm 8 lĩnh vực
                </div>
                <h1 className="max-w-3xl text-3xl font-semibold leading-[1.15] tracking-tight text-slate-950 sm:text-4xl md:text-5xl">
                  Chấm điểm hiện tại để biết chính xác{" "}
                  <span className="bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                    nơi bạn nên bắt đầu
                  </span>
                  .
                </h1>
                <p className="max-w-2xl text-sm leading-relaxed text-slate-700 sm:text-base dark:text-slate-300">
                  Kéo từng lĩnh vực từ 1 đến 10. Tóm tắt bên cạnh cập nhật ngay để bạn thấy tín hiệu trước khi lưu.
                </p>
              </div>

              <div
                data-testid="onboarding-assessment-summary"
                className="relative overflow-hidden rounded-[var(--r-tile)] border border-slate-200 bg-slate-50/85 p-4"
              >
                <LifeBalanceWheelIllustration className="pointer-events-none absolute -right-10 -top-10 hidden w-36 text-violet-500 opacity-20 lg:block" />
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Tín hiệu đang hiện ra</p>
                <div className="mt-[var(--space-inline)] grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-[var(--r-control)] border border-slate-200 bg-white p-3">
                    <p className="text-slate-500">Điểm trung bình</p>
                    <p className="mt-1 text-xl font-bold text-slate-950">{averageScore.toFixed(1)}/10</p>
                  </div>
                  <div className="rounded-[var(--r-control)] border border-slate-200 bg-white p-3">
                    <p className="text-slate-500">Đã rà soát</p>
                    <p className="mt-1 text-xl font-bold text-slate-950">
                      {reviewedAreaCount}/{lifeAreas.length}
                    </p>
                  </div>
                  <div className="rounded-[var(--r-control)] border border-amber-200/70 bg-gradient-to-br from-amber-50 to-orange-50 p-3 dark:border-amber-400/20 dark:from-amber-950/40 dark:to-orange-950/35">
                    <p className="text-amber-700">Ưu tiên</p>
                    <p className="mt-1 font-semibold text-amber-950">{getLifeAreaLabel(growthArea.name)}</p>
                    <p className="text-sm text-amber-800">{growthArea.score}/10</p>
                  </div>
                  <div className="rounded-[var(--r-control)] border border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-teal-50 p-3 dark:border-emerald-400/20 dark:from-emerald-950/40 dark:to-teal-950/35">
                    <p className="text-emerald-700">Mạnh nhất</p>
                    <p className="mt-1 font-semibold text-emerald-950">{getLifeAreaLabel(strongestArea.name)}</p>
                    <p className="text-sm text-emerald-800">{strongestArea.score}/10</p>
                  </div>
                </div>
                <p className="mt-[var(--space-inline)] text-sm leading-6 text-slate-600">
                  {remainingAreaCount === 0
                    ? "Bánh xe đã sẵn sàng để lưu và mở Góc nhìn cuộc sống."
                    : `Còn ${remainingAreaCount} lĩnh vực nên rà lại trước khi lưu.`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="flow-panel overflow-hidden">
            <CardContent className="stack-tight p-5 sm:p-6">
              {lifeAreas.map((area, index) => {
                const AreaIcon = getLifeAreaIcon(area.name);

                return (
                  <div
                    key={area.name}
                    className="card-hover-lift rounded-[var(--r-tile)] border border-slate-200 bg-white p-3 shadow-sm sm:p-4 dark:border-slate-700 dark:bg-slate-900/70"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <AreaIcon className="h-6 w-6 shrink-0" style={{ color: area.color }} />
                        <div
                          className="h-3.5 w-3.5 shrink-0 rounded-[var(--r-pill)] ring-4 ring-slate-100"
                          style={{ backgroundColor: area.color }}
                        />
                        <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
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
            <Card className="flow-panel">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[var(--r-control)] bg-violet-50 text-violet-700">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Sẵn sàng sang Góc nhìn cuộc sống</h3>
                    <p className="text-sm leading-6 text-slate-500">
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
                    <p className="rounded-[var(--r-control)] border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-800">
                      Còn {remainingAreaCount} lĩnh vực cần rà trước khi lưu.
                    </p>
                  ) : null}
                  <Button
                    className="bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/30 hover:from-violet-700 hover:to-fuchsia-700 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={handleComplete}
                    disabled={!canCompleteAssessment}
                  >
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
  );
}
