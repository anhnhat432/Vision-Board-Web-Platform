import { cn } from "./ui/utils";

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
  /** Optional escape hatch shown next to the progress caption. */
  onExit?: () => void;
  /** Override the exit button label. Default `"Thoát →"`. */
  exitLabel?: string;
  /** Override the accessible label / tooltip for the exit button. */
  exitTooltip?: string;
}

export function CoreFlowProgress({
  currentStepId,
  className = "",
  onExit,
  exitLabel = "Thoát →",
  exitTooltip = "Quay lại Trang chính — tiến độ đã nhập tự lưu trên thiết bị này",
}: CoreFlowProgressProps) {
  const currentIndex = Math.max(
    0,
    CORE_FLOW_STEPS.findIndex((step) => step.id === currentStepId),
  );
  const currentStep = CORE_FLOW_STEPS[currentIndex];
  const progressValue = ((currentIndex + 1) / CORE_FLOW_STEPS.length) * 100;

  return (
    <section aria-label="Tiến độ đường chính" className={cn("mb-6 flex flex-col gap-2", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-ink-muted">
          Bước {currentIndex + 1} / {CORE_FLOW_STEPS.length} · {currentStep.label.toLocaleUpperCase("vi-VN")}
        </p>
        {onExit ? (
          <button
            type="button"
            onClick={onExit}
            title={exitTooltip}
            aria-label={exitTooltip}
            className="shrink-0 rounded-full px-2 py-1 text-[13px] font-medium text-app-ink-muted transition-colors duration-150 hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
          >
            {exitLabel}
          </button>
        ) : null}
      </div>

      <div
        role="progressbar"
        aria-label={`Tiến độ đường chính: bước ${currentIndex + 1} trên ${CORE_FLOW_STEPS.length}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progressValue)}
        className="flex gap-1"
      >
        {CORE_FLOW_STEPS.map((step, index) => (
          <span
            key={step.id}
            className={cn("h-1 flex-1 rounded-full", index <= currentIndex ? "bg-app-accent" : "bg-app-line")}
            aria-hidden="true"
          />
        ))}
      </div>

      <p className="sr-only">{currentStep.description}</p>
    </section>
  );
}
