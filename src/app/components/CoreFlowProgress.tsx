import { ArrowRight, CheckCircle2, Circle, Compass } from "lucide-react";

import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Progress } from "./ui/progress";

export type CoreFlowStepId =
  | "life_balance"
  | "life_insight"
  | "smart_goal"
  | "feasibility"
  | "twelve_week_setup"
  | "today";

const CORE_FLOW_STEPS: Array<{
  id: CoreFlowStepId;
  label: string;
  title: string;
  description: string;
  nextAction: string;
}> = [
  {
    id: "life_balance",
    label: "Life Balance",
    title: "Đánh giá cân bằng",
    description: "Chấm điểm các lĩnh vực quan trọng để biết mình nên ưu tiên nơi nào trước.",
    nextAction: "Chọn một lĩnh vực trọng tâm ở Life Insight.",
  },
  {
    id: "life_insight",
    label: "Life Insight",
    title: "Chọn trọng tâm",
    description: "Nhìn vào dữ liệu vừa đánh giá và chọn một lĩnh vực đủ quan trọng để hành động.",
    nextAction: "Viết mục tiêu đó theo cấu trúc SMART.",
  },
  {
    id: "smart_goal",
    label: "SMART Goal",
    title: "Viết mục tiêu rõ",
    description: "Làm rõ kết quả, chỉ số đo, thời gian và lý do để mục tiêu không còn mơ hồ.",
    nextAction: "Kiểm tra xem mục tiêu có khả thi với lịch sống hiện tại không.",
  },
  {
    id: "feasibility",
    label: "Feasibility",
    title: "Kiểm tra khả thi",
    description: "Đo mức sẵn sàng trước khi biến mục tiêu thành kế hoạch 12 tuần.",
    nextAction: "Nếu mục tiêu đủ hợp lý, dựng hệ 12 tuần để bắt đầu.",
  },
  {
    id: "twelve_week_setup",
    label: "12-Week Setup",
    title: "Dựng hệ 12 tuần",
    description: "Chốt outcome, tactic, metric và lịch review để biết mỗi tuần cần làm gì.",
    nextAction: "Vào dashboard Hôm nay để thực thi tuần đầu tiên.",
  },
  {
    id: "today",
    label: "Today",
    title: "Làm việc hôm nay",
    description: "Theo dõi việc cần làm, check-in hằng ngày và review tuần để giữ nhịp.",
    nextAction: "Tiếp tục tick việc, cập nhật metric và review cuối tuần.",
  },
];

interface CoreFlowProgressProps {
  currentStepId: CoreFlowStepId;
  className?: string;
}

export function CoreFlowProgress({ currentStepId, className = "" }: CoreFlowProgressProps) {
  const currentIndex = Math.max(
    0,
    CORE_FLOW_STEPS.findIndex((step) => step.id === currentStepId),
  );
  const currentStep = CORE_FLOW_STEPS[currentIndex];
  const nextStep = CORE_FLOW_STEPS[currentIndex + 1] ?? null;
  const progressValue = ((currentIndex + 1) / CORE_FLOW_STEPS.length) * 100;
  const nextActionLabel = nextStep ? `Tiếp: ${nextStep.title}` : "Tiếp tục giữ nhịp";

  return (
    <Card
      className={`border border-slate-200/80 bg-white/92 shadow-[0_18px_44px_-36px_rgba(15,23,42,0.3)] ${className}`}
    >
      <CardContent className="p-3.5 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] lg:items-center">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
                <Compass className="mr-2 h-3.5 w-3.5" />
                <span className="hidden sm:inline">Đường chính cho người mới</span>
                <span className="sm:hidden">Đường chính</span>
              </Badge>
              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                Bước {currentIndex + 1}/{CORE_FLOW_STEPS.length}
              </Badge>
            </div>

            <div>
              <h2 className="text-lg font-bold tracking-normal text-slate-950 sm:text-xl">{currentStep.title}</h2>
              <p className="mt-1 max-w-3xl text-sm leading-7 text-slate-600">{currentStep.description}</p>
            </div>

            <div className="space-y-2">
              <Progress value={progressValue} aria-label={`Tiến độ đường chính: ${Math.round(progressValue)}%`} />
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/85 px-3 py-2 text-sm text-slate-600 sm:hidden">
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-500" />
                <span className="min-w-0 truncate font-medium text-slate-800">{nextActionLabel}</span>
              </div>
              <div className="hidden flex-wrap gap-2 sm:flex">
                {CORE_FLOW_STEPS.map((step, index) => {
                  const isDone = index < currentIndex;
                  const isCurrent = index === currentIndex;

                  return (
                    <div
                      key={step.id}
                      className={`inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
                        isCurrent
                          ? "border-slate-300 bg-slate-950 text-white"
                          : isDone
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-slate-200 bg-slate-50 text-slate-500"
                      }`}
                      aria-current={isCurrent ? "step" : undefined}
                    >
                      {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3 w-3" />}
                      <span className="truncate">{step.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="hidden rounded-lg border border-slate-200 bg-slate-50/85 p-4 sm:block">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Nên làm gì tiếp?</p>
            <div className="mt-3 flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm">
                <ArrowRight className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-950">
                  {nextStep ? `Tiếp theo: ${nextStep.title}` : "Tiếp tục giữ nhịp"}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{currentStep.nextAction}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
