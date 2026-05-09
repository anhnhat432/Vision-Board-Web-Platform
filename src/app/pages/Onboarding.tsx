import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, BarChart3, Check, Compass, Sparkles } from "lucide-react";

import { CoreFlowProgress } from "../components/CoreFlowProgress";
import { ProductVisual } from "../components/visuals/ProductVisual";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Slider } from "../components/ui/slider";
import { trackAnalyticsEvent } from "../utils/analytics";
import { hasRealLifeBalance } from "../utils/core-flow-guard";
import { LIFE_AREAS, type LifeArea, getLifeAreaLabel, getUserData, updateWheelOfLife } from "../utils/storage";
import { useScrollToTopOnChange } from "../hooks/useScrollToTopOnChange";

type OnboardingStep = "welcome" | "assessment";

const JOURNEY_STEPS = [
  {
    title: "Chấm 8 lĩnh vực",
    description: "Nhìn nhanh sức khỏe hiện tại của từng phần trong cuộc sống.",
  },
  {
    title: "Chọn trọng tâm",
    description: "Dữ liệu này mở Life Insight để chọn đúng nơi nên ưu tiên.",
  },
  {
    title: "Đi tiếp tới SMART Goal",
    description: "Trọng tâm được chuyển thành mục tiêu rõ và kế hoạch 12 tuần.",
  },
];

const FEATURE_PILLS = ["8 lĩnh vực", "Khoảng 3 phút", "Life Insight", "SMART Goal", "12 tuần"];

export function Onboarding() {
  const navigate = useNavigate();
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
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const handleComplete = () => {
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
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="mx-auto w-full max-w-6xl space-y-4 sm:space-y-5"
        >
          <CoreFlowProgress currentStepId="life_balance" />

          <Card className="flow-surface overflow-hidden border border-slate-200/80 bg-white/94 shadow-sm">
            <CardContent className="relative p-4 sm:p-6 lg:p-7 xl:p-8">
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_360px]">
                <div className="space-y-5">
                  {isReturning && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
                      <span className="font-semibold">Cập nhật điểm hiện tại.</span> Điểm cũ đã được tải sẵn,
                      bạn chỉ điều chỉnh phần thay đổi, không tạo lại từ đầu.
                    </div>
                  )}

                  <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-sm font-semibold text-violet-700">
                    <Sparkles className="h-4 w-4" />
                    Bước 1: Life Balance
                  </div>

                  <div className="space-y-3">
                    <h1 className="max-w-3xl text-2xl font-bold tracking-normal text-slate-950 sm:text-3xl lg:text-4xl">
                      {isReturning
                        ? "Cập nhật lại 8 lĩnh vực để insight bám sát cuộc sống hiện tại hơn."
                        : "Bắt đầu bằng 8 lĩnh vực để biết nên ưu tiên điều gì trước."}
                    </h1>
                    <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base lg:text-lg">
                      Chỉ khoảng 3 phút để chấm điểm hiện tại. Kết quả sẽ nối thẳng sang Life Insight, SMART Goal
                      và kế hoạch 12 tuần, nên bạn không phải đoán bước tiếp theo.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {FEATURE_PILLS.map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600"
                      >
                        {item}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button
                      className="w-full bg-violet-600 text-white shadow-lg hover:bg-violet-700 sm:w-auto"
                      onClick={handleStartAssessment}
                    >
                      Bắt đầu chấm 8 lĩnh vực
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full text-slate-500 hover:bg-slate-50 sm:w-auto"
                      onClick={() => {
                        localStorage.setItem("onboarding_draft_saved", "true");
                        navigate("/");
                      }}
                    >
                      Lưu nháp và quay lại sau
                    </Button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    {JOURNEY_STEPS.map((item, index) => (
                      <div key={item.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-sm font-semibold text-slate-700 shadow-sm">
                          0{index + 1}
                        </div>
                        <h3 className="mt-3 text-base font-semibold text-slate-950">{item.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="hidden rounded-2xl border border-slate-200 bg-slate-50/80 p-5 xl:block">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Bạn sẽ nhận được gì</p>
                  <ProductVisual variant="moodboard" className="mt-5 min-h-[210px]" />
                  <div className="mt-5 space-y-3">
                    {[
                      "Điểm trung bình để đọc mặt bằng hiện tại.",
                      "Lĩnh vực thấp nhất để mở Life Insight.",
                      "Lĩnh vực mạnh nhất để biết phần đang tạo lực đỡ.",
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3">
                        <Check className="mt-0.5 h-4 w-4 text-emerald-600" />
                        <p className="text-sm leading-6 text-slate-600">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div
      ref={flowTopRef}
      tabIndex={-1}
      className="flow-shell min-h-screen px-4 py-4 focus:outline-none sm:px-6 sm:py-6 lg:px-8"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
        className="mx-auto w-full max-w-6xl space-y-4 sm:space-y-5"
      >
        <CoreFlowProgress currentStepId="life_balance" />

        <Card className="flow-surface overflow-hidden border border-slate-200/80 bg-white/94 shadow-sm">
          <CardContent className="p-4 sm:p-6 lg:p-7">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-sm text-slate-600">
                  <Compass className="h-4 w-4" />
                  Chấm 8 lĩnh vực
                </div>
                <h1 className="max-w-3xl text-2xl font-bold tracking-normal text-slate-950 sm:text-3xl lg:text-4xl">
                  Chấm điểm hiện tại để biết chính xác nơi bạn nên bắt đầu.
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                  Kéo từng lĩnh vực từ 1 đến 10. Summary bên cạnh cập nhật ngay để bạn thấy tín hiệu trước khi lưu.
                </p>
              </div>

              <div
                data-testid="onboarding-assessment-summary"
                className="rounded-xl border border-slate-200 bg-slate-50/85 p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Tín hiệu đang hiện ra</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-slate-500">Điểm trung bình</p>
                    <p className="mt-1 text-xl font-bold text-slate-950">{averageScore.toFixed(1)}/10</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-slate-500">Đã rà soát</p>
                    <p className="mt-1 text-xl font-bold text-slate-950">
                      {reviewedAreaCount}/{lifeAreas.length}
                    </p>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-amber-700">Ưu tiên</p>
                    <p className="mt-1 font-semibold text-amber-950">{getLifeAreaLabel(growthArea.name)}</p>
                    <p className="text-sm text-amber-800">{growthArea.score}/10</p>
                  </div>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-emerald-700">Mạnh nhất</p>
                    <p className="mt-1 font-semibold text-emerald-950">{getLifeAreaLabel(strongestArea.name)}</p>
                    <p className="text-sm text-emerald-800">{strongestArea.score}/10</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {remainingAreaCount === 0
                    ? "Bánh xe đã sẵn sàng để lưu và mở Life Insight."
                    : `Còn ${remainingAreaCount} lĩnh vực nên rà lại trước khi lưu.`}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="flow-panel overflow-hidden">
            <CardContent className="space-y-3 p-5 sm:p-6">
              {lifeAreas.map((area, index) => (
                <motion.div
                  key={area.name}
                  initial={{ opacity: 0, x: -18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3.5 w-3.5 shrink-0 rounded-full ring-4 ring-slate-100"
                        style={{ backgroundColor: area.color }}
                      />
                      <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
                        {getLifeAreaLabel(area.name)}
                      </h3>
                    </div>

                    <div
                      className="min-w-14 rounded-full px-3 py-1.5 text-center text-sm font-semibold text-white shadow-sm"
                      style={{ backgroundColor: area.color }}
                    >
                      {area.score}/10
                    </div>
                  </div>

                  <div className="mt-3">
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
                </motion.div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-5 xl:sticky xl:top-28">
            <Card className="flow-panel">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Sẵn sàng sang Life Insight</h3>
                    <p className="text-sm leading-6 text-slate-500">
                      Điểm này sẽ được lưu trên trình duyệt và dùng để chọn trọng tâm tiếp theo.
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3">
                  <Button variant="outline" onClick={() => setStep("welcome")}>
                    <ArrowLeft className="h-4 w-4" />
                    Quay lại giới thiệu
                  </Button>
                  <Button onClick={handleComplete}>
                    Hoàn thành đánh giá
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
