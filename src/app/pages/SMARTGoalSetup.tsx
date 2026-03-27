import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Compass,
  Sparkles,
  Target,
} from "lucide-react";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Progress } from "../components/ui/progress";
import { Textarea } from "../components/ui/textarea";
import { APP_STORAGE_KEYS, getLifeAreaLabel } from "../utils/storage";

interface SMARTData {
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  timeBound: string;
}

const SMART_STEPS = [
  {
    key: "specific" as keyof SMARTData,
    label: "Cụ thể",
    title: "Bạn muốn đạt được chính xác điều gì?",
    placeholder:
      "Ví dụ: Tôi muốn được thăng chức lên vị trí Lập trình viên cao cấp và dẫn dắt một dự án quan trọng.",
    description:
      "Mục tiêu càng rõ thì năng lượng hành động càng dễ tập trung. Tránh những câu quá rộng hoặc mơ hồ.",
    coaching: "Hãy mô tả kết quả cuối cùng, không chỉ nói về mong muốn chung chung.",
  },
  {
    key: "measurable" as keyof SMARTData,
    label: "Đo được",
    title: "Bạn sẽ biết mình đang tiến bộ bằng cách nào?",
    placeholder:
      "Ví dụ: Hoàn thành 3 khóa học nâng cao, dẫn dắt 2 tính năng lớn và nhận đánh giá tốt từ quản lý.",
    description:
      "Đặt ra dấu hiệu cụ thể để bạn không phải đoán cảm tính rằng mình có đang đi đúng hướng hay không.",
    coaching: "Hãy nghĩ bằng số lượng, cột mốc, đầu ra hoặc tiêu chí dễ quan sát.",
  },
  {
    key: "achievable" as keyof SMARTData,
    label: "Khả thi",
    title: "Bạn cần những nguồn lực, kỹ năng hay điều kiện nào?",
    placeholder:
      "Ví dụ: cần 5 giờ học mỗi tuần, mentor góp ý định kỳ và thời gian thực hành có lịch cố định.",
    description:
      "Phần này giúp mục tiêu bớt mơ hồ và kéo nó gần hơn với đời sống thật của bạn.",
    coaching: "Nghĩ đến thời gian, kỹ năng, người hỗ trợ và môi trường bạn cần.",
  },
  {
    key: "relevant" as keyof SMARTData,
    label: "Liên quan",
    title: "Tại sao mục tiêu này thực sự quan trọng với bạn?",
    placeholder:
      "Ví dụ: Vì nó gắn trực tiếp với tầm nhìn nghề nghiệp 3 năm tới và mức thu nhập tôi đang hướng đến.",
    description:
      "Khi mục tiêu gắn với một lý do đủ mạnh, bạn sẽ dễ giữ được kỷ luật hơn trong giai đoạn khó.",
    coaching: "Viết theo kiểu: mục tiêu này quan trọng vì...",
  },
  {
    key: "timeBound" as keyof SMARTData,
    label: "Thời hạn",
    title: "Bạn muốn đạt được điều này vào khi nào?",
    placeholder: "Ví dụ: Trong vòng 12 tháng, trước tháng 3 năm 2027.",
    description:
      "Thời hạn tạo ra nhịp. Không cần quá gấp, nhưng cần đủ rõ để buộc bạn ra quyết định.",
    coaching: "Nếu chưa chắc ngày cụ thể, ít nhất hãy đưa ra khung tuần hoặc tháng.",
  },
];

export function SMARTGoalSetup() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [focusArea, setFocusArea] = useState<string>("");
  const [smartData, setSmartData] = useState<SMARTData>({
    specific: "",
    measurable: "",
    achievable: "",
    relevant: "",
    timeBound: "",
  });

  useEffect(() => {
    const area = localStorage.getItem(APP_STORAGE_KEYS.selectedFocusArea);
    const fallbackArea = area || "Personal Growth";
    setFocusArea(fallbackArea);

    const draft = localStorage.getItem(APP_STORAGE_KEYS.pendingSmartGoal);
    if (!draft) return;

    try {
      const parsed = JSON.parse(draft);
      const parsedFocusArea =
        typeof parsed.focusArea === "string" && parsed.focusArea.trim().length > 0
          ? parsed.focusArea
          : "";

      if (area && parsedFocusArea && parsedFocusArea !== area) {
        return;
      }

      if (!area && parsedFocusArea) {
        setFocusArea(parsedFocusArea);
      }

      setSmartData({
        specific: typeof parsed.specific === "string" ? parsed.specific : "",
        measurable: typeof parsed.measurable === "string" ? parsed.measurable : "",
        achievable: typeof parsed.achievable === "string" ? parsed.achievable : "",
        relevant: typeof parsed.relevant === "string" ? parsed.relevant : "",
        timeBound: typeof parsed.timeBound === "string" ? parsed.timeBound : "",
      });
    } catch {
      // Ignore malformed drafts.
    }
  }, []);

  const currentStepData = SMART_STEPS[currentStep];
  const totalSteps = SMART_STEPS.length;
  const progressPercentage = ((currentStep + 1) / totalSteps) * 100;
  const completedCount = useMemo(
    () => SMART_STEPS.filter((step) => smartData[step.key].trim().length > 0).length,
    [smartData],
  );

  const handleInputChange = (value: string) => {
    setSmartData({
      ...smartData,
      [currentStepData.key]: value,
    });
  };

  const handleGoToFeasibility = () => {
    localStorage.setItem(
      APP_STORAGE_KEYS.pendingSmartGoal,
      JSON.stringify({
        focusArea,
        specific: smartData.specific,
        measurable: smartData.measurable,
        achievable: smartData.achievable,
        relevant: smartData.relevant,
        timeBound: smartData.timeBound,
      }),
    );

    navigate("/feasibility");
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
      return;
    }

    handleGoToFeasibility();
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      return;
    }

    navigate("/life-insight");
  };

  const isCurrentStepValid = smartData[currentStepData.key].trim().length > 0;

  return (
    <div className="app-shell min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto w-full max-w-7xl space-y-6"
      >
        <Card className="hero-surface overflow-hidden border-0 text-white">
          <CardContent className="relative p-8 lg:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.12),_transparent_24%)] opacity-90" />

            <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_360px]">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-1.5 text-sm text-white/82">
                  <Compass className="h-4 w-4" />
                  Mục tiêu SMART
                </div>

                <div className="space-y-4">
                  <h1 className="max-w-3xl text-4xl font-bold tracking-[-0.05em] lg:text-5xl">
                    Chúng ta sẽ biến insight vừa có thành một mục tiêu đủ rõ để bắt đầu hành động.
                  </h1>
                  <p className="max-w-2xl text-base leading-8 text-white/82 lg:text-lg">
                    SMART không phải chỉ để viết cho đẹp. Nó giúp mục tiêu của bạn trở nên rõ hơn,
                    thực tế hơn và dễ mang sang bước đánh giá khả thi cũng như hệ 12 tuần phía sau.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Badge variant="outline" className="rounded-full border-white/18 bg-white/12 px-4 py-2 text-white">
                    <Target className="mr-1 h-3.5 w-3.5" />
                    Liên kết với: {getLifeAreaLabel(focusArea)}
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-white/18 bg-white/12 px-4 py-2 text-white">
                    <Sparkles className="mr-1 h-3.5 w-3.5" />
                    Hoàn thành: {completedCount}/{totalSteps}
                  </Badge>
                </div>
              </div>

              <div className="rounded-[32px] border border-white/14 bg-white/12 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl">
                <div className="flex items-center justify-between text-sm text-white/72">
                  <span>Bước {currentStep + 1} / {totalSteps}</span>
                  <span>{Math.round(progressPercentage)}%</span>
                </div>
                <Progress value={progressPercentage} className="mt-3 h-2.5 bg-white/20" />

                <div className="mt-6 space-y-3">
                  {SMART_STEPS.map((step, index) => {
                    const done = smartData[step.key].trim().length > 0;
                    const active = index === currentStep;

                    return (
                      <div
                        key={step.key}
                        className={`rounded-[22px] border px-4 py-3 transition-all ${
                          active
                            ? "border-white/22 bg-white/14"
                            : done
                              ? "border-white/10 bg-black/10"
                              : "border-white/8 bg-black/6"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                              active
                                ? "hero-cta bg-white text-slate-900"
                                : done
                                  ? "bg-white/18 text-white"
                                  : "bg-white/8 text-white/60"
                            }`}
                          >
                            {done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-white">{step.label}</p>
                            <p className="text-xs text-white/62">{step.title}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Card className="overflow-hidden">
            <CardContent className="p-6 lg:p-7">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="rounded-[28px] gradient-violet-pink p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-500">
                    {currentStepData.label}
                  </p>
                  <h2 className="mt-3 text-3xl font-bold text-slate-900">{currentStepData.title}</h2>
                  <p className="mt-3 text-base leading-7 text-slate-600">{currentStepData.description}</p>
                  <div className="mt-4 rounded-[22px] border border-white/70 bg-white/72 px-4 py-3 text-sm text-slate-600">
                    {currentStepData.coaching}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="smart-step-input" className="text-base">
                    Câu trả lời của bạn
                  </Label>
                  <Textarea
                    id="smart-step-input"
                    placeholder={currentStepData.placeholder}
                    value={smartData[currentStepData.key]}
                    onChange={(event) => handleInputChange(event.target.value)}
                    className="min-h-[180px] resize-none text-base leading-7"
                  />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button variant="outline" className="flex-1" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4" />
                    Quay lại
                  </Button>
                  <Button className="flex-1" onClick={handleNext} disabled={!isCurrentStepValid}>
                    {currentStep < totalSteps - 1
                      ? "Tiếp theo"
                      : "Tiếp theo: kiểm tra tính khả thi"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            </CardContent>
          </Card>

          <div className="space-y-6 xl:sticky xl:top-28">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Bản nháp hiện tại
                </p>

                <div className="mt-5 space-y-3">
                  {SMART_STEPS.map((step) => (
                    <div
                      key={step.key}
                      className="rounded-[22px] border border-white/70 bg-white/72 p-4"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        {step.label}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        {smartData[step.key].trim() || "Chưa có nội dung cho phần này."}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
