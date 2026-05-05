import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ArrowRight, BarChart3, Check, Compass, Sparkles } from "lucide-react";

import { CoreFlowProgress } from "../components/CoreFlowProgress";
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
    title: "Chạm đúng điểm cần ưu tiên",
    description: "Nhìn rõ lĩnh vực nào đang cần năng lượng và sự tập trung của bạn ngay lúc này.",
  },
  {
    title: "Biến mong muốn thành hướng đi rõ ràng",
    description: "Từ bánh xe cuộc sống, bạn sẽ đi tiếp vào insight, mục tiêu SMART và hệ 12 tuần.",
  },
  {
    title: "Bắt đầu với nhịp độ bền vững",
    description: "Theo dõi đều đặn thay vì cố gắng quá sức, để tiến bộ có thể duy trì thật lâu.",
  },
];

const FEATURE_PILLS = ["Chấm 8 lĩnh vực", "Chọn một trọng tâm", "Viết SMART Goal", "Dựng chu kỳ 12 tuần"];

export function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [isReturning, setIsReturning] = useState(false);
  const [lifeAreas, setLifeAreas] = useState<LifeArea[]>(LIFE_AREAS.map((area) => ({ ...area, score: 5 })));
  const flowTopRef = useRef<HTMLDivElement | null>(null);

  // Guard: detect returning users and preload their existing wheel scores
  const guardedRef = useRef(false);
  useEffect(() => {
    if (guardedRef.current) return;
    guardedRef.current = true;
    const data = getUserData();
    if (hasRealLifeBalance(data)) {
      setIsReturning(true);
      setLifeAreas(data.currentWheelOfLife);
    }
  }, []);

  const averageScore = lifeAreas.reduce((sum, area) => sum + area.score, 0) / lifeAreas.length;
  const strongestArea = [...lifeAreas].sort((a, b) => b.score - a.score)[0];
  const growthArea = [...lifeAreas].sort((a, b) => a.score - b.score)[0];

  const [isDirty, setIsDirty] = useState(false);

  useScrollToTopOnChange(step, {
    targetRef: flowTopRef,
    focusRef: flowTopRef,
    topOffset: 0,
  });

  const handleScoreChangeWrapped = useCallback((index: number, value: number[]) => {
    setLifeAreas((currentAreas) =>
      currentAreas.map((area, areaIndex) => (areaIndex === index ? { ...area, score: value[0] ?? 1 } : area)),
    );
    setIsDirty(true);
  }, []);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
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

          <Card className="hero-surface flow-surface overflow-hidden glass-surface-gradient-border ambient-glow">
            <CardContent className="relative p-4 sm:p-6 lg:p-7 xl:p-8">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.16),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.1),_transparent_24%)] opacity-90" />

              <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.12fr)_360px]">
                <div className="space-y-5 sm:space-y-6">
                  {isReturning && (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      <span className="font-semibold text-slate-950">Bạn đã hoàn thành onboarding rồi.</span> Điểm số
                      hiện tại của bạn đã được tải sẵn — thay đổi ở bước đánh giá sẽ cập nhật bánh xe hiện tại, không
                      tạo lại từ đầu.
                    </div>
                  )}
                  <div className="space-y-4 sm:space-y-5">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-sm text-slate-600">
                      <Sparkles className="h-4 w-4" />
                      {isReturning ? "Cập nhật bánh xe cuộc sống" : "Khởi động hành trình định hướng cuộc sống"}
                    </div>

                    <div className="space-y-4">
                      <h1 className="max-w-3xl text-2xl font-bold tracking-normal text-slate-950 sm:text-3xl lg:text-4xl gradient-text">
                        {isReturning
                          ? "Điểm số thay đổi? Hãy cập nhật lại để insight bám sát thực tế hơn."
                          : "Tạo một điểm bắt đầu đủ rõ để phần còn lại của hành trình trở nên nhẹ hơn."}
                      </h1>
                      <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base lg:text-lg">
                        {isReturning
                          ? "Điểm số hiện tại của bạn đã được tải sẵn. Chỉ cần điều chỉnh lĩnh vực nào thay đổi rồi lưu lại là xong."
                          : "Chỉ trong vài phút, bạn sẽ nhìn thấy bức tranh hiện tại của mình, chọn ra nơi cần ưu tiên nhất và mở ra một hệ thống phát triển cá nhân có định hướng rõ ràng."}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        ước tính: ~20 phút cho toàn bộ hành trình (SMART → Thực tế → 12 tuần)
                      </p>
                    </div>
                  </div>

                  <div className="hidden flex-wrap gap-3 sm:flex">
                    {FEATURE_PILLS.map((item) => (
                      <div
                        key={item}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600"
                      >
                        {item}
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      className="w-full bg-violet-600 text-white shadow-[0_18px_38px_-28px_rgba(124,58,237,0.55)] hover:bg-violet-700 sm:w-auto"
                      onClick={handleStartAssessment}
                    >
                      Chấm Life Balance
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full border-slate-200 bg-white text-slate-900 hover:bg-slate-50 sm:w-auto"
                      onClick={() => navigate("/")}
                    >
                      Xem bảng điều khiển
                    </Button>
                    <Button
                      variant="ghost"
                      className="w-full text-slate-500 hover:bg-slate-50 sm:w-auto"
                      onClick={() => {
                        localStorage.setItem("onboarding_draft_saved", "true");
                        navigate("/");
                      }}
                    >
                      Lưu nháp và đi tiếp lúc khác
                    </Button>
                  </div>

                  <div className="hidden gap-4 md:grid md:grid-cols-3">
                    {JOURNEY_STEPS.map((item, index) => (
                      <div key={item.title} className="flow-muted p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-sm font-semibold text-slate-700">
                          0{index + 1}
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-slate-950">{item.title}</h3>
                        <p className="mt-2 text-sm leading-7 text-slate-600">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="hidden flow-panel p-5 sm:p-6 xl:block">
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Bạn sẽ nhận được gì
                  </p>

                  <div className="mt-6 space-y-4">
                    {[
                      "Đánh giá 8 lĩnh vực quan trọng để biết mình đang ở đâu.",
                      "Nhận gợi ý ưu tiên từ điểm số thấp nhất và cao nhất.",
                      "Tiếp tục sang flow SMART, feasibility và 12-week mà không bị đứt mạch.",
                      "Lưu lại trạng thái khởi đầu để theo dõi tiến bộ thật sự về sau.",
                    ].map((item) => (
                      <div key={item} className="flow-muted flex items-start gap-3 p-4">
                        <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-slate-700">
                          <Check className="h-4 w-4" />
                        </div>
                        <p className="text-sm leading-7 text-slate-600">{item}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flow-muted mt-6 p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Thời lượng ước tính</p>
                    <div className="mt-3 flex items-end gap-2">
                      <span className="text-4xl font-bold text-slate-950">3</span>
                      <span className="pb-1 text-sm text-slate-500">phút để hoàn thành</span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      Một bước khởi động ngắn, nhưng đủ để tạo ra bức tranh rõ ràng cho cả trải nghiệm phía sau.
                    </p>
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

        <Card className="hero-surface flow-surface overflow-hidden">
          <CardContent className="relative p-4 sm:p-6 lg:p-7">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.1),_transparent_26%)] opacity-90" />

            <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-6">
              <div className="space-y-4 sm:space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-sm text-slate-600">
                  <Compass className="h-4 w-4" />
                  Bước 1/1: Đánh giá bánh xe cuộc sống
                </div>
                {/* Mini progress bar */}
                <div className="mt-3 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-200">
                  <motion.div
                    className="h-full rounded-full bg-slate-900"
                    initial={{ width: 0 }}
                    animate={{ width: `${(lifeAreas.filter((a) => a.score !== 5).length / lifeAreas.length) * 100}%` }}
                    transition={{ type: "spring", stiffness: 200, damping: 30 }}
                  />
                </div>
                <div className="space-y-3">
                  <h1 className="max-w-3xl text-2xl font-bold tracking-normal text-slate-950 sm:text-3xl lg:text-4xl gradient-text">
                    Chấm điểm hiện tại để biết chính xác nơi bạn nên bắt đầu.
                  </h1>
                  <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base lg:text-lg">
                    Mỗi thanh kéo là một góc nhìn về cuộc sống của bạn. Đánh giá từ 1 đến 10, sau đó hệ thống sẽ dùng
                    bức tranh này để mở ra insight cá nhân hóa ở bước tiếp theo.
                  </p>
                </div>
              </div>

              <div className="hidden gap-3 sm:grid sm:grid-cols-3 lg:grid-cols-1">
                {[
                  {
                    label: "Điểm trung bình",
                    value: averageScore.toFixed(1),
                    note: "trên thang 10",
                  },
                  {
                    label: "Điểm mạnh nhất",
                    value: getLifeAreaLabel(strongestArea.name),
                    note: `${strongestArea.score}/10`,
                  },
                  {
                    label: "Cần ưu tiên",
                    value: getLifeAreaLabel(growthArea.name),
                    note: `${growthArea.score}/10`,
                  },
                ].map((item) => (
                  <div key={item.label} className="flow-muted p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-950">{item.value}</p>
                    <p className="mt-1 text-sm text-slate-500">{item.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="flow-panel overflow-hidden">
            <CardContent className="space-y-3 p-4 sm:p-5 lg:p-6">
              <div className="hidden rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600 sm:block">
                Kéo từng lĩnh vực từ <span className="font-semibold text-slate-950">1</span> đến{" "}
                <span className="font-semibold text-slate-950">10</span>. Điểm thấp là nơi cần chú ý, điểm cao là nơi
                đang tạo lực đẩy tốt.
              </div>

              {lifeAreas.map((area, index) => (
                <motion.div
                  key={area.name}
                  initial={{ opacity: 0, x: -18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flow-muted p-3 sm:p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3.5 w-3.5 shrink-0 rounded-full shadow-[0_0_0_5px_rgba(255,255,255,0.82)]"
                        style={{ backgroundColor: area.color }}
                      />
                      <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
                        {getLifeAreaLabel(area.name)}
                      </h3>
                    </div>

                    <div
                      className="min-w-14 rounded-full px-3 py-1.5 text-center text-sm font-semibold text-white shadow-[0_18px_35px_-24px_rgba(15,23,42,0.45)]"
                      style={{ backgroundColor: area.color }}
                    >
                      <AnimatePresence mode="popLayout">
                        <motion.span
                          key={area.score}
                          initial={{ y: -8, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: 8, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          {area.score}/10
                        </motion.span>
                      </AnimatePresence>
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
                    <p className="text-sm text-slate-500">
                      Hệ thống sẽ dùng điểm này để chọn trọng tâm và nối sang SMART Goal.
                    </p>
                  </div>
                </div>

                <div className="mt-5 hidden gap-3 sm:grid sm:grid-cols-3 xl:grid-cols-1">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Trung bình</p>
                    <p className="mt-1 text-xl font-bold text-slate-950">{averageScore.toFixed(1)}</p>
                  </div>
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50/80 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700/70">Mạnh nhất</p>
                    <p className="mt-1 text-sm font-semibold text-emerald-950">
                      {getLifeAreaLabel(strongestArea.name)}
                    </p>
                    <p className="mt-0.5 text-sm text-emerald-800/80">{strongestArea.score}/10</p>
                  </div>
                  <div className="rounded-lg border border-amber-100 bg-amber-50/85 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700/70">Ưu tiên</p>
                    <p className="mt-1 text-sm font-semibold text-amber-950">{getLifeAreaLabel(growthArea.name)}</p>
                    <p className="mt-0.5 text-sm text-amber-900/78">{growthArea.score}/10</p>
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
