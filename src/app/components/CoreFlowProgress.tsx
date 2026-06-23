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
  exitTooltip = "Quay lại Trang chính - tiến độ đã nhập tự lưu trên thiết bị này",
  saveBadge,
}: CoreFlowProgressProps) {
  const currentIndex = Math.max(
    0,
    CORE_FLOW_STEPS.findIndex((step) => step.id === currentStepId),
  );
  const currentStep = CORE_FLOW_STEPS[currentIndex];
  const progressValue = ((currentIndex + 1) / CORE_FLOW_STEPS.length) * 100;
  const currentLabel = currentStep.label.toLocaleUpperCase("vi-VN");

  return (
    <section
      aria-label="Tiến độ đường chính"
      className={cn(
        "rounded-card border border-app-line bg-app-surface/85 p-4 shadow-app-sm backdrop-blur sm:p-5",
        className,
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[13px] font-bold leading-5 text-app-ink">
            <span className="text-app-accent">Bước {currentIndex + 1} / {CORE_FLOW_STEPS.length}</span>
            <span className="px-1.5 text-app-ink-muted"> · </span>
            <span className="break-words uppercase tracking-[0.04em] text-app-ink">{currentLabel}</span>
          </p>
          <h2 className="mt-1 font-serif text-lg font-semibold leading-tight text-app-ink sm:text-xl">
            {currentStep.title}
          </h2>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3.5 sm:justify-end">
          {saveBadge ?? null}
          {onExit ? (
            <button
              type="button"
              onClick={onExit}
              title={exitTooltip}
              aria-label={exitTooltip}
              className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-control border border-app-line bg-app-bg-subtle px-3 py-2 text-[13px] font-semibold text-app-ink-soft transition-[background-color,color,border-color,transform] duration-150 hover:border-app-accent/35 hover:bg-app-accent-subtle hover:text-app-ink active:scale-[0.98] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-app-accent/35 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg"
            >
              {exitLabel}
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </button>
          ) : null}
        </div>
      </div>

      <div
        role="progressbar"
        aria-label={`Tiến độ đường chính: bước ${currentIndex + 1} trên ${CORE_FLOW_STEPS.length}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progressValue)}
        className="relative mt-4 h-2 overflow-hidden rounded-pill bg-app-bg-subtle"
      >
        <span
          className="dof-prog absolute inset-y-0 left-0 rounded-pill shadow-[0_0_0_1px_rgba(255,255,255,0.25)_inset] motion-safe:transition-[width] motion-safe:duration-300 motion-reduce:transition-none"
          style={{
            width: `${progressValue}%`,
            background: "linear-gradient(90deg, var(--app-accent), var(--app-status-success))",
          }}
          aria-hidden="true"
        />
      </div>

      <div className="-mx-1 mt-3 flex gap-1 overflow-x-auto px-1 pb-1 sm:justify-between sm:overflow-visible" aria-hidden="true">
        {CORE_FLOW_STEPS.map((step, index) => (
          <span
            key={step.id}
            className={cn(
              "inline-flex min-h-8 shrink-0 items-center rounded-pill border px-2.5 text-[11px] font-semibold transition-colors duration-200 sm:min-h-0 sm:border-0 sm:bg-transparent sm:px-0 sm:text-[11.5px]",
              index < currentIndex && "border-app-accent/15 bg-app-accent-subtle text-app-accent sm:text-app-accent",
              index === currentIndex && "border-app-accent/30 bg-app-accent-soft text-app-accent sm:font-bold",
              index > currentIndex && "border-app-line bg-app-bg-subtle text-app-ink-muted sm:text-app-ink-muted",
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
