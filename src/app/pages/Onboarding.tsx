import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  Compass,
  Sparkles,
  Target,
} from "lucide-react";

import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Slider } from "../components/ui/slider";
import { LIFE_AREAS, type LifeArea, getLifeAreaLabel, getUserData, updateWheelOfLife } from "../utils/storage";

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

const FEATURE_PILLS = [
  "Bánh xe cuộc sống trực quan",
  "Insight ưu tiên hành động",
  "Goal tracking rõ tiến độ",
  "Bảng tầm nhìn truyền cảm hứng",
];

export function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState<OnboardingStep>("welcome");
  const [isReturning, setIsReturning] = useState(false);
  const [lifeAreas, setLifeAreas] = useState<LifeArea[]>(
    LIFE_AREAS.map((area) => ({ ...area, score: 5 })),
  );

  // Guard: detect returning users and preload their existing wheel scores
  const guardedRef = useRef(false);
  useEffect(() => {
    if (guardedRef.current) return;
    guardedRef.current = true;
    const data = getUserData();
    if (data.onboardingCompleted && data.currentWheelOfLife.length > 0) {
      setIsReturning(true);
      setLifeAreas(data.currentWheelOfLife);
    }
  }, []);

  const averageScore =
    lifeAreas.reduce((sum, area) => sum + area.score, 0) / lifeAreas.length;
  const strongestArea = [...lifeAreas].sort((a, b) => b.score - a.score)[0];
  const growthArea = [...lifeAreas].sort((a, b) => a.score - b.score)[0];

  const handleScoreChange = (index: number, value: number[]) => {
    const updated = [...lifeAreas];
    updated[index] = { ...updated[index], score: value[0] };
    setLifeAreas(updated);
  };

  const [isDirty, setIsDirty] = useState(false);

  const handleScoreChangeWrapped = useCallback((index: number, value: number[]) => {
    handleScoreChange(index, value);
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
    setIsDirty(false);
    navigate("/life-insight");
  };

  if (step === "welcome") {
    return (
      <div className="app-shell min-h-screen px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="mx-auto max-w-6xl"
        >
          <Card className="hero-surface overflow-hidden border-0 text-white">
            <CardContent className="relative p-8 lg:p-10 xl:p-12">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.16),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.1),_transparent_24%)] opacity-90" />

              <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.12fr)_360px]">
                <div className="space-y-8">
                  {isReturning && (
                    <div className="rounded-[20px] border border-white/20 bg-white/12 px-4 py-3 text-sm text-white/84 backdrop-blur-xl">
                      <span className="font-semibold text-white">Bạn đã hoàn thành onboarding rồi.</span>{" "}
                      Điểm số hiện tại của bạn đã được tải sẵn — thay đổi ở bước đánh giá sẽ cập nhật bánh xe hiện tại, không tạo lại từ đầu.
                    </div>
                  )}
                  <div className="space-y-5">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-1.5 text-sm text-white/82 backdrop-blur-xl">
                      <Sparkles className="h-4 w-4" />
                      {isReturning ? "Cập nhật bánh xe cuộc sống" : "Khởi động hành trình định hướng cuộc sống"}
                    </div>

                    <div className="space-y-4">
                      <h1 className="max-w-3xl text-4xl font-bold tracking-[-0.05em] lg:text-5xl">
                        {isReturning
                          ? "Điểm số thay đổi? Hãy cập nhật lại để insight bám sát thực tế hơn."
                          : "Tạo một điểm bắt đầu đủ rõ để phần còn lại của hành trình trở nên nhẹ hơn."}
                      </h1>
                      <p className="max-w-2xl text-base leading-8 text-white/82 lg:text-lg">
                        {isReturning
                          ? "Điểm số hiện tại của bạn đã được tải sẵn. Chỉ cần điều chỉnh lĩnh vực nào thay đổi rồi lưu lại là xong."
                          : "Chỉ trong vài phút, bạn sẽ nhìn thấy bức tranh hiện tại của mình, chọn ra nơi cần ưu tiên nhất và mở ra một hệ thống phát triển cá nhân có định hướng rõ ràng."}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {FEATURE_PILLS.map((item) => (
                      <div
                        key={item}
                        className="rounded-full border border-white/18 bg-white/12 px-4 py-2 text-sm text-white/82 backdrop-blur-xl"
                      >
                        {item}
                      </div>
                    ))}
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    {JOURNEY_STEPS.map((item, index) => (
                      <div
                        key={item.title}
                        className="rounded-[26px] border border-white/14 bg-black/10 p-5 backdrop-blur-2xl"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/12 text-sm font-semibold">
                          0{index + 1}
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-white">{item.title}</h3>
                        <p className="mt-2 text-sm leading-7 text-white/72">{item.description}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      className="hero-cta border-white/18 bg-white text-slate-900 hover:bg-white/92"
                      onClick={() => setStep("assessment")}
                    >
                      Bắt đầu đánh giá
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      className="border-white/18 bg-white/12 text-white hover:bg-white/18 hover:text-white"
                      onClick={() => navigate("/")}
                    >
                      Xem bảng điều khiển
                    </Button>
                  </div>
                </div>

                <div className="rounded-[32px] border border-white/14 bg-white/12 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl">
                  <p className="text-sm font-semibold uppercase tracking-[0.24em] text-white/62">
                    Bạn sẽ nhận được gì
                  </p>

                  <div className="mt-6 space-y-4">
                    {[
                      "Đánh giá 8 lĩnh vực quan trọng để biết mình đang ở đâu.",
                      "Nhận gợi ý ưu tiên từ điểm số thấp nhất và cao nhất.",
                      "Tiếp tục sang flow SMART, feasibility và 12-week mà không bị đứt mạch.",
                      "Lưu lại trạng thái khởi đầu để theo dõi tiến bộ thật sự về sau.",
                    ].map((item) => (
                      <div
                        key={item}
                        className="flex items-start gap-3 rounded-[22px] border border-white/10 bg-black/10 p-4"
                      >
                        <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/14">
                          <Check className="h-4 w-4" />
                        </div>
                        <p className="text-sm leading-7 text-white/78">{item}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 rounded-[24px] border border-white/10 bg-black/12 p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/55">
                      Thời lượng ước tính
                    </p>
                    <div className="mt-3 flex items-end gap-2">
                      <span className="text-4xl font-bold">3</span>
                      <span className="pb-1 text-sm text-white/62">phút để hoàn thành</span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-white/72">
                      Một bước khởi động ngắn, nhưng đủ để tạo ra bức tranh rõ ràng cho cả
                      trải nghiệm phía sau.
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
    <div className="app-shell min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
        className="mx-auto max-w-6xl space-y-6"
      >
        <Card className="hero-surface overflow-hidden border-0 text-white">
          <CardContent className="relative p-8 lg:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.1),_transparent_26%)] opacity-90" />

            <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="space-y-5">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-1.5 text-sm text-white/82">
                  <Compass className="h-4 w-4" />
                  Bước 1/1: Đánh giá bánh xe cuộc sống
                </div>
                {/* Mini progress bar */}
                <div className="mt-3 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/20">
                  <motion.div
                    className="h-full rounded-full bg-white/80"
                    initial={{ width: 0 }}
                    animate={{ width: `${(lifeAreas.filter((a) => a.score !== 5).length / lifeAreas.length) * 100}%` }}
                    transition={{ type: "spring", stiffness: 200, damping: 30 }}
                  />
                </div>
                <div className="space-y-3">
                  <h1 className="max-w-3xl text-4xl font-bold tracking-[-0.05em] lg:text-5xl">
                    Chấm điểm hiện tại để biết chính xác nơi bạn nên bắt đầu.
                  </h1>
                  <p className="max-w-2xl text-base leading-8 text-white/82 lg:text-lg">
                    Mỗi thanh kéo là một góc nhìn về cuộc sống của bạn. Đánh giá từ 1 đến 10,
                    sau đó hệ thống sẽ dùng bức tranh này để mở ra insight cá nhân hóa ở bước tiếp theo.
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
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
                  <div
                    key={item.label}
                    className="rounded-[24px] border border-white/14 bg-black/12 p-4 backdrop-blur-2xl"
                  >
                    <p className="text-xs uppercase tracking-[0.18em] text-white/56">{item.label}</p>
                    <p className="mt-2 text-2xl font-bold text-white">{item.value}</p>
                    <p className="mt-1 text-sm text-white/68">{item.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="overflow-hidden">
            <CardContent className="space-y-4 p-6 lg:p-7">
              {lifeAreas.map((area, index) => (
                <motion.div
                  key={area.name}
                  initial={{ opacity: 0, x: -18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="rounded-[26px] border border-white/70 bg-white/66 p-5 shadow-[0_18px_42px_-30px_rgba(15,23,42,0.3)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-4 w-4 rounded-full shadow-[0_0_0_6px_rgba(255,255,255,0.82)]"
                        style={{ backgroundColor: area.color }}
                      />
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                          {getLifeAreaLabel(area.name)}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {area.score <= 4
                            ? "Đang cần thêm sự chăm sóc và ưu tiên."
                            : area.score <= 7
                              ? "Đã có nền tảng, vẫn còn nhiều dư địa để nâng lên."
                              : "Đây là một khu vực đang tạo lực đẩy tốt cho bạn."}
                        </p>
                      </div>
                    </div>

                    <div
                      className="rounded-full px-4 py-2 text-sm font-semibold text-white shadow-[0_18px_35px_-24px_rgba(15,23,42,0.45)]"
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

                  <div className="mt-5 space-y-3">
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
                    <div className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                      <span>Cần chú ý</span>
                      <span>Xuất sắc</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-6 xl:sticky xl:top-28">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Snapshot hiện tại
                    </p>
                    <h3 className="mt-3 text-3xl font-bold text-slate-900">
                      {averageScore.toFixed(1)}
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">
                      Điểm trung bình cho bức tranh cuộc sống hiện tại của bạn.
                    </p>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-violet-50 text-violet-700">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="rounded-[22px] border border-emerald-100 bg-emerald-50/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700/70">
                      Điểm mạnh nhất
                    </p>
                    <p className="mt-2 text-lg font-semibold text-emerald-950">
                      {getLifeAreaLabel(strongestArea.name)}
                    </p>
                    <p className="mt-1 text-sm text-emerald-800/80">{strongestArea.score}/10</p>
                  </div>

                  <div className="rounded-[22px] border border-amber-100 bg-amber-50/85 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700/70">
                      Nên ưu tiên tiếp theo
                    </p>
                    <p className="mt-2 text-lg font-semibold text-amber-950">
                      {getLifeAreaLabel(growthArea.name)}
                    </p>
                    <p className="mt-1 text-sm text-amber-900/78">{growthArea.score}/10</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[20px] bg-violet-50 text-violet-700">
                    <Target className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Sau bước này sẽ có gì?</h3>
                    <p className="text-sm text-slate-500">
                      Bạn sẽ sang trang insight để xác định hướng ưu tiên rõ hơn.
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {[
                    "Phát hiện lĩnh vực cần tập trung nhất hiện tại.",
                    "Nhận cầu nối sang mục tiêu SMART và hệ 12 tuần.",
                    "Lưu lại mốc khởi đầu để so sánh tiến bộ về sau.",
                  ].map((item) => (
                    <div
                      key={item}
                      className="flex items-start gap-3 rounded-[20px] border border-white/70 bg-white/70 p-4"
                    >
                      <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-violet-700">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      <p className="text-sm leading-7 text-slate-600">{item}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-col gap-3">
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
