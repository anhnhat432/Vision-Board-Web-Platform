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
  /** Override the exit button label. Default `"Thoát"`. */
  exitLabel?: string;
  /** Override the accessible label / tooltip for the exit button. */
  exitTooltip?: string;
  /** Optional save badge element rendered left of the exit button. */
  saveBadge?: React.ReactNode;
}

export function CoreFlowProgress({
  currentStepId,
  className = "",
  onExit,
  exitLabel = "Thoát",
  exitTooltip = "Quay lại Trang chính — tiến độ đã nhập tự lưu trên thiết bị này",
  saveBadge,
}: CoreFlowProgressProps) {
  const currentIndex = Math.max(
    0,
    CORE_FLOW_STEPS.findIndex((step) => step.id === currentStepId),
  );
  const currentStep = CORE_FLOW_STEPS[currentIndex];
  const progressValue = ((currentIndex + 1) / CORE_FLOW_STEPS.length) * 100;

  return (
    <section aria-label="Tiến độ đường chính" className={cn("flex flex-col gap-2.5", className)}>
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-[14px] font-semibold text-[#17150F]">
          <span className="font-bold text-[#0C5E3A]">Bước {currentIndex + 1}/{CORE_FLOW_STEPS.length}</span>
          {" "}&nbsp;{currentStep.label}
        </div>
        <div className="flex items-center gap-3.5">
          {saveBadge ?? null}
          {onExit ? (
            <button
              type="button"
              onClick={onExit}
              title={exitTooltip}
              aria-label={exitTooltip}
              className="inline-flex shrink-0 items-center gap-1.5 bg-transparent border-none text-[13px] font-semibold text-[#8C887C] cursor-pointer transition-colors duration-150 hover:text-[#5C574B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C5E3A]/30 rounded-md"
            >
              {exitLabel}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </button>
          ) : null}
        </div>
      </div>

      {/* Progress bar */}
      <div
        role="progressbar"
        aria-label={`Tiến độ đường chính: bước ${currentIndex + 1} trên ${CORE_FLOW_STEPS.length}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progressValue)}
        className="relative h-[6px] overflow-hidden rounded-[999px] bg-[#E4E0D4]"
      >
        <span
          className="dof-prog absolute inset-y-0 left-0 rounded-[999px]"
          style={{
            width: `${progressValue}%`,
            background: "linear-gradient(90deg, #0C5E3A, #16A34A)",
          }}
          aria-hidden="true"
        />
      </div>

      {/* Step labels */}
      <div className="flex justify-between gap-x-1" aria-hidden="true">
        {CORE_FLOW_STEPS.map((step, index) => (
          <span
            key={step.id}
            className={cn(
              "text-[11.5px] font-medium transition-colors duration-200",
              index <= currentIndex ? "font-bold text-[#0C5E3A]" : "text-[#A8A296]",
            )}
          >
            {step.label}
          </span>
        ))}
      </div>

      <p className="sr-only">{currentStep.description}</p>
    </section>
  );
}
