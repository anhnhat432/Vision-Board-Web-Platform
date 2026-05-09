import { ArrowRight, Compass, LogOut } from "lucide-react";

import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
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
}> = [
  {
    id: "life_balance",
    label: "Cân bằng",
    title: "Đánh giá cân bằng",
    description: "Chấm điểm các lĩnh vực quan trọng để biết nên ưu tiên nơi nào trước.",
  },
  {
    id: "life_insight",
    label: "Trọng tâm",
    title: "Chọn trọng tâm",
    description: "Chọn một lĩnh vực đủ quan trọng để hành động.",
  },
  {
    id: "smart_goal",
    label: "Viết mục tiêu",
    title: "Viết mục tiêu rõ",
    description: "Làm rõ kết quả, chỉ số đo, thời gian và lý do.",
  },
  {
    id: "feasibility",
    label: "Kiểm tra",
    title: "Kiểm tra tính thực tế",
    description: "Đo mức sẵn sàng trước khi biến mục tiêu thành kế hoạch 12 tuần.",
  },
  {
    id: "twelve_week_setup",
    label: "Kế hoạch 12 tuần",
    title: "Tạo kế hoạch 12 tuần",
    description: "Chốt kết quả, việc lặp lại, chỉ số và lịch nhìn lại.",
  },
  {
    id: "today",
    label: "Hôm nay",
    title: "Làm việc hôm nay",
    description: "Theo dõi việc cần làm, đánh dấu việc hằng ngày và nhìn lại tuần.",
  },
];

interface CoreFlowProgressProps {
  currentStepId: CoreFlowStepId;
  className?: string;
  /**
   * Optional escape hatch shown next to the step badges. Renders a small
   * "Tạm thoát" button that calls `onExit` so the user can leave the wizard
   * mid-flow (their draft auto-saves locally and they can resume by re-opening
   * the same step from the dashboard). Default `undefined` — no button rendered.
   */
  onExit?: () => void;
  /** Override the exit button label. Default `"Tạm thoát"`. */
  exitLabel?: string;
  /** Override the accessible label / tooltip for the exit button. */
  exitTooltip?: string;
}

export function CoreFlowProgress({
  currentStepId,
  className = "",
  onExit,
  exitLabel = "Tạm thoát",
  exitTooltip = "Quay lại bảng điều khiển — tiến độ đã nhập tự lưu trên trình duyệt này",
}: CoreFlowProgressProps) {
  const currentIndex = Math.max(
    0,
    CORE_FLOW_STEPS.findIndex((step) => step.id === currentStepId),
  );
  const currentStep = CORE_FLOW_STEPS[currentIndex];
  const nextStep = CORE_FLOW_STEPS[currentIndex + 1] ?? null;
  const progressValue = ((currentIndex + 1) / CORE_FLOW_STEPS.length) * 100;
  const progressLabel = Math.round(progressValue);
  const nextActionLabel = nextStep ? `Tiếp: ${nextStep.title}` : "Tiếp tục giữ nhịp";

  return (
    <section
      aria-label="Tiến độ đường chính"
      className={`rounded-[var(--r-control)] border border-slate-200/80 bg-white/92 px-3.5 py-3 shadow-sm sm:px-4 ${className}`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
            <Compass className="mr-2 h-3.5 w-3.5" />
            Đường chính
          </Badge>
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
            Bước {currentIndex + 1}/{CORE_FLOW_STEPS.length}
          </Badge>
          {onExit ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onExit}
              title={exitTooltip}
              aria-label={exitTooltip}
              className="h-7 rounded-[var(--r-pill)] border border-slate-200 bg-white px-2.5 text-[11px] font-medium text-slate-600 shadow-sm hover:bg-slate-50 hover:text-slate-900"
            >
              <LogOut className="mr-1 h-3 w-3" />
              {exitLabel}
            </Button>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                {currentStep.label}
              </p>
              <h2 className="truncate text-sm font-bold tracking-normal text-slate-950 sm:text-base">
                {currentStep.title}
              </h2>
            </div>
            <span className="text-sm font-semibold text-slate-500">{progressLabel}%</span>
          </div>
          <Progress value={progressValue} aria-label={`Tiến độ đường chính: ${progressLabel}%`} />
        </div>

        <div className="rounded-[var(--r-control)] border border-slate-200 bg-slate-50/85 px-3 py-2 lg:w-[280px]">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--r-pill)] bg-white text-slate-700 shadow-sm">
              <ArrowRight className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Tiếp theo</p>
              <p className="truncate text-sm font-semibold text-slate-950">{nextActionLabel}</p>
            </div>
          </div>
        </div>
      </div>
      <p className="sr-only">{currentStep.description}</p>
    </section>
  );
}
