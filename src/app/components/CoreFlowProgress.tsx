import { ArrowRight, Compass } from "lucide-react";

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
      <CardContent className="p-3.5 sm:p-4">
        <div className="grid gap-3 lg:grid-cols-[auto_minmax(0,1fr)_minmax(220px,300px)] lg:items-center">
          <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-start">
            <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
              <Compass className="mr-2 h-3.5 w-3.5" />
              Đường chính
            </Badge>
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
              Bước {currentIndex + 1}/{CORE_FLOW_STEPS.length}
            </Badge>
          </div>

          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-base font-bold tracking-normal text-slate-950 sm:text-lg">{currentStep.title}</h2>
              <p className="text-sm leading-6 text-slate-600">{currentStep.description}</p>
            </div>
            <Progress value={progressValue} aria-label={`Tiến độ đường chính: ${Math.round(progressValue)}%`} />
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/85 px-3 py-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-slate-700 shadow-sm">
                <ArrowRight className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Tiếp theo</p>
                <p className="truncate text-sm font-semibold text-slate-950">{nextActionLabel}</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
