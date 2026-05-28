import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Compass,
  Gauge,
  ShieldCheck,
  Sparkles,
  Target,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";
import type { PendingSMARTGoal } from "@/lib/smart-goal";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../../../components/ui/collapsible";
import { useBreakpoint } from "../../../hooks/useBreakpoint";
import { getLifeAreaLabel } from "../../../utils/storage";
import type { PlanLoadRecommendation, ResultData, ResultType, WeeklyCapacity } from "../types";

interface ResultStepProps {
  result: ResultData;
  focusArea: string;
  pendingGoal: PendingSMARTGoal;
  onContinue: () => void;
  onAdjustGoal: () => void;
}

interface ResultCopy {
  statusLabel: string;
  statusHint: string;
  guideTitle: string;
  guideBody: string;
  highlights: Array<{ title: string; description: string; icon: LucideIcon }>;
  nextMoves: string[];
  weeklyRhythm: Array<{ label: string; detail: string }>;
}

const RESULT_COPY: Record<ResultType, ResultCopy> = {
  realistic: {
    statusLabel: "Đủ thực tế để bắt đầu",
    statusHint: "Nền tảng hiện tại đủ để bước vào chu kỳ 12 tuần gọn và rõ.",
    guideTitle: "Đi tiếp, nhưng giữ cho tuần đầu thật vừa tay.",
    guideBody: "Không cần kế hoạch lớn. Chỉ cần vài việc nhỏ, rõ, đo được và đủ nhẹ để duy trì đều mỗi tuần.",
    highlights: [
      {
        title: "Nhịp nhỏ nhưng đều",
        description: "Chọn 2-4 việc lặp lại mỗi tuần thay vì nhồi quá nhiều ngay đầu.",
        icon: Sparkles,
      },
      {
        title: "Khóa lịch nhìn lại ngay",
        description: "Lịch nhìn lại cố định giúp không lệch khi tuần bận hơn.",
        icon: ShieldCheck,
      },
      {
        title: "Ưu tiên cảm giác thắng sớm",
        description: "Tuần đầu đủ nhẹ để hoàn thành tốt và tạo đà cho cả chu kỳ.",
        icon: Target,
      },
    ],
    nextMoves: [
      "Chuyển mục tiêu thành kế hoạch 12 tuần với 2-4 việc chính thật rõ.",
      "Thiết kế tuần đầu thiên về duy trì đều, không phải khối lượng lớn.",
      "Giữ một buổi nhìn lại hằng tuần để điều chỉnh trước khi bị trễ.",
    ],
    weeklyRhythm: [
      { label: "Ngay sau kết quả", detail: "Chốt kết quả 12 tuần và việc bạn sẽ lặp lại hằng tuần." },
      { label: "Tuần 1", detail: "Giữ kế hoạch gọn để thắng sớm và tạo đà." },
      { label: "Từ tuần 2 trở đi", detail: "Duy trì buổi nhìn lại, chỉ tăng độ khó khi đang duy trì ổn thật sự." },
    ],
  },
  challenging: {
    statusLabel: "Khó nhưng vẫn làm được",
    statusHint: "Có thể đạt nếu thu gọn mục tiêu, làm rõ việc cần làm và nhìn lại mỗi tuần nghiêm túc.",
    guideTitle: "Tập trung hơn một chút, bạn sẽ đi được xa hơn.",
    guideBody:
      "Mục tiêu có sức bật nhưng không phù hợp nếu triển khai quá rộng. Giữ một hướng chính rõ và bỏ bớt phần gây nhiễu.",
    highlights: [
      {
        title: "Thu hẹp mục tiêu 12 tuần đầu",
        description: "Chỉ giữ kết quả quan trọng nhất, bỏ phần còn lại cho chu kỳ sau.",
        icon: Target,
      },
      {
        title: "Ưu tiên việc đo được",
        description: "Tập trung vài việc đo được, thay vì danh sách dài nhưng mờ hiệu quả.",
        icon: Gauge,
      },
      {
        title: "Dùng buổi nhìn lại để cắt nhiễu",
        description: "Mỗi tuần bỏ bớt việc không phục vụ kết quả chính.",
        icon: Compass,
      },
    ],
    nextMoves: [
      "Thu gọn về một kết quả duy nhất cho 12 tuần đầu.",
      "Chỉ chọn việc thật sự đo được và lặp lại được mỗi tuần.",
      "Đặt buổi nhìn lại hằng tuần để kiểm soát mức tải, không để kế hoạch phình dần.",
    ],
    weeklyRhythm: [
      { label: "Ngay sau kết quả", detail: "Chốt một kết quả đủ rõ, bỏ bớt mục tiêu phụ không cần cho chu kỳ này." },
      { label: "Tuần 1-2", detail: "Kiểm tra xem lịch hành động có thực sự vừa với cuộc sống hằng ngày không." },
      {
        label: "Sau mỗi lần nhìn lại",
        detail: "Đang đuối thì giảm tải trước khi tăng tốc. Bền quan trọng hơn hưng phấn đầu kỳ.",
      },
    ],
  },
  too_ambitious: {
    statusLabel: "Cần thu nhỏ trước khi tăng tốc",
    statusHint:
      "Mục tiêu đang hơi nặng so với nền hiện tại. Thu nhỏ đúng cách giúp giữ động lực và xác suất hoàn thành cao hơn.",
    guideTitle: "Không cần hạ tham vọng — chỉ cần hạ mức tải bước đầu.",
    guideBody:
      "Chưa cần từ bỏ mục tiêu lớn. Biến nó thành bước đệm vừa tầm để 12 tuần tới là chu kỳ thắng được, không phải lời hứa áp lực.",
    highlights: [
      {
        title: "Thu nhỏ kết quả đầu tiên",
        description: "Chọn phiên bản gần hơn, dễ thắng hơn làm cột mốc khởi động.",
        icon: AlertCircle,
      },
      {
        title: "Kéo giãn thời hạn nếu cần",
        description: "Không phải mục tiêu sai — chỉ là tốc độ hoặc thời điểm chưa phù hợp.",
        icon: Gauge,
      },
      {
        title: "Dựng mục tiêu bước đệm",
        description: "Chu kỳ 12 tuần nhỏ mà hoàn thành được tốt hơn kế hoạch quá tải rồi bỏ dở.",
        icon: ShieldCheck,
      },
    ],
    nextMoves: [
      "Quay lại sửa mục tiêu nếu cần — giảm quy mô hoặc kéo dài thời hạn.",
      "Chọn bước đệm gần hơn để chu kỳ 12 tuần đầu có khả năng thắng.",
      "Khi đã duy trì ổn, có thể tăng độ khó ở chu kỳ sau.",
    ],
    weeklyRhythm: [
      { label: "Ngay sau kết quả", detail: "Xác định phiên bản nhỏ hơn nhưng vẫn đủ ý nghĩa để muốn theo đuổi." },
      { label: "Tuần 1", detail: "Thiết kế kế hoạch cực gọn để tạo ổn định, không tạo áp lực chứng minh." },
      { label: "Sau chu kỳ đầu", detail: "Khi đã duy trì tốt, dùng dữ liệu thực để quyết định tăng tốc ở vòng sau." },
    ],
  },
};

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function getScoreLabel(percent: number): string {
  if (percent >= 75) return "Cao";
  if (percent >= 50) return "Trung bình";
  return "Thấp";
}

function getAxisBarClass(percent: number): string {
  if (percent >= 75) return "bg-app-accent";
  if (percent >= 50) return "bg-app-ink-soft";
  return "bg-app-warm";
}

const PLAN_LOAD_LABEL: Record<PlanLoadRecommendation, string> = {
  lighter: "Nhẹ hơn",
  balanced: "Cân bằng",
  push: "Đẩy nhẹ",
};

const CAPACITY_LABEL: Record<WeeklyCapacity, string> = {
  low: "Ít thời gian",
  medium: "Vừa đủ",
  high: "Khá rộng",
};

export function ResultStep({ result, focusArea, pendingGoal, onContinue, onAdjustGoal }: ResultStepProps) {
  const isDesktop = useBreakpoint();
  const copy = RESULT_COPY[result.type];
  const scorePercent = clampPercent(Math.round((result.adjustedScore / 20) * 100));
  const scoreOutOfTen = Math.max(0, Math.min(10, Math.round(scorePercent / 10)));
  const readinessPercent = clampPercent(Math.round((result.readinessScore / 20) * 100));
  const bottleneckPercent =
    result.bottleneck.axis === "wheel"
      ? clampPercent(result.wheelScore * 10)
      : clampPercent(Math.round((result.bottleneck.score / 4) * 100));
  const statusLabel = getScoreLabel(scorePercent);
  const showRiskWarning = result.type !== "realistic" || Boolean(result.smartGoalQualityNote);

  const scoreCards = [
    {
      label: "Mức sẵn sàng tổng",
      value: `${result.readinessScore}/20`,
      note: `${result.diagnosticScore}/${result.maxDiagnosticScore} điểm trước khi tính nền lĩnh vực.`,
      progress: readinessPercent,
    },
    {
      label: "Phần cần chú ý nhất",
      value: result.bottleneck.label,
      note: result.bottleneck.action,
      progress: bottleneckPercent,
    },
    {
      label: "Mức tải gợi ý",
      value: PLAN_LOAD_LABEL[result.planLoad],
      note: `Quỹ thời gian: ${CAPACITY_LABEL[result.weeklyCapacity]}.`,
      progress: scorePercent,
    },
  ];

  return (
    <section
      className="mt-6 surface-raised rounded-2xl border border-app-line bg-app-surface p-5 sm:p-6 shadow-sm"
      aria-labelledby="feasibility-result-title"
    >
      <div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-accent">Kết quả kiểm tra</p>
          <span className="w-fit rounded-full bg-app-accent-soft px-3 py-1 text-xs font-semibold text-app-accent">
            {getLifeAreaLabel(focusArea)}
          </span>
        </div>
        <h2
          id="feasibility-result-title"
          className="mt-2 font-serif text-3xl font-medium leading-8 tracking-[-0.01em] text-app-ink"
        >
          {copy.statusLabel}
        </h2>
        <p className="mt-2 text-sm leading-6 text-app-ink-soft">{result.summary}</p>
      </div>

      {/* Visual score gauge block */}
      <div className="mt-6 rounded-2xl border border-app-line bg-gradient-to-br from-app-surface to-app-bg p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="relative flex shrink-0 flex-col items-center justify-center text-center sm:w-48">
            <div className="relative flex items-center justify-center h-32 w-32">
              <div className="absolute inset-0 rounded-full bg-app-accent/5 blur-md" />
              <svg className="absolute inset-0 w-full h-full transform -rotate-90" role="img" aria-label="Biểu đồ tiến trình độ khả thi">
                <title>Biểu đồ tiến trình độ khả thi</title>
                <circle
                  cx="64"
                  cy="64"
                  r="52"
                  className="stroke-app-line/60"
                  strokeWidth="6"
                  fill="transparent"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="52"
                  className="stroke-app-accent transition-all duration-1000 ease-out"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 52}
                  strokeDashoffset={2 * Math.PI * 52 - (scorePercent / 100) * (2 * Math.PI * 52)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="relative flex flex-col items-center justify-center">
                <span className="font-serif text-5xl font-bold leading-none text-app-ink tracking-tight">{scoreOutOfTen}</span>
                <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-app-ink-muted/80">Điểm số</span>
              </div>
            </div>
            <p className="mt-3 text-sm font-bold text-app-accent">{statusLabel}</p>
            <p className="mt-0.5 text-xs text-app-ink-muted">Mức độ khả thi</p>
          </div>
          
          <div className="min-w-0 flex-1 space-y-4">
            <div className="rounded-xl bg-app-accent-soft/20 p-4 border border-app-accent/10">
              <p className="text-sm font-semibold leading-relaxed text-app-ink">{copy.statusHint}</p>
            </div>
            
            <div className="space-y-2">
              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-app-line/60" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-app-accent/40 via-app-accent/80 to-app-accent transition-all duration-500"
                  style={{ width: `${scorePercent}%` }}
                />
                <span className="absolute left-[25%] top-0 h-full w-px bg-app-ink-muted/30" />
                <span className="absolute left-[50%] top-0 h-full w-px bg-app-ink-muted/30" />
                <span className="absolute left-[75%] top-0 h-full w-px bg-app-ink-muted/30" />
              </div>
              <div className="flex justify-between text-[11px] font-semibold text-app-ink-muted">
                <span>Cần nhẹ (0-5)</span>
                <span>Vừa sức (5-7.5)</span>
                <span>Sẵn sàng (7.5-10)</span>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-app-ink-soft">{result.recommendation}</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3.5">
        {copy.highlights.map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.title} className="flex gap-3.5 rounded-xl border border-app-line bg-app-bg p-4 transition-all duration-200 hover:shadow-sm">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-app-accent-soft text-app-accent">
                <Icon className="h-4.5 w-4.5" aria-hidden="true" />
              </div>
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-app-ink">{item.title}</p>
                <p className="text-xs leading-relaxed text-app-ink-soft">{item.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {showRiskWarning ? (
        <div className="mt-6 rounded-xl border border-amber-300/40 bg-amber-500/5 p-4 text-amber-850 dark:text-amber-300">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <div>
              <p className="font-semibold text-sm">Có vài trở ngại cần lưu ý</p>
              <p className="mt-1 text-sm leading-relaxed text-app-ink-soft">
                {result.smartGoalQualityNote ?? result.bottleneck.action}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <Collapsible
        key={isDesktop ? "feasibility-details-desktop" : "feasibility-details-mobile"}
        defaultOpen={isDesktop}
        className="mt-6"
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-app-line bg-app-surface px-4 py-2.5 text-sm font-medium text-app-ink transition-colors duration-150 hover:bg-app-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 sm:w-auto"
          >
            {isDesktop ? "Phân tích chi tiết" : "Mở chi tiết"}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4 space-y-4 data-[state=closed]:hidden">
          <div className="rounded-xl border border-app-line bg-app-bg p-4 md:p-5">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-app-accent" aria-hidden="true" />
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-ink-muted">
                Hướng đi tiếp theo
              </p>
            </div>
            <h3 className="mt-3 font-serif text-xl font-medium text-app-ink">{copy.guideTitle}</h3>
            <p className="mt-2 text-sm leading-6 text-app-ink-soft">{copy.guideBody}</p>
            <div className="mt-4 rounded-xl border border-app-line bg-app-surface p-3.5">
              <p className="text-sm font-bold text-app-ink">Lời khuyên Tuần 1</p>
              <p className="mt-1 text-sm leading-6 text-app-ink-soft">{result.firstWeekGuidance}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-app-accent-soft px-3 py-1 text-xs font-bold text-app-accent">
                  Mức tải: {PLAN_LOAD_LABEL[result.planLoad]}
                </span>
                <span className="rounded-full border border-app-line bg-app-surface px-3 py-1 text-xs font-semibold text-app-ink-muted">
                  Quỹ thời gian: {CAPACITY_LABEL[result.weeklyCapacity]}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {scoreCards.map((card) => (
              <div key={card.label} className="rounded-xl border border-app-line bg-app-surface p-4.5 shadow-sm transition-all duration-200 hover:shadow-md">
                <p className="text-xs font-bold uppercase tracking-wider text-app-ink-muted">{card.label}</p>
                <p className="mt-2 text-2xl font-bold leading-none text-app-ink">{card.value}</p>
                <div className="mt-3.5 h-2 overflow-hidden rounded-full bg-app-line/60" aria-hidden="true">
                  <div className="h-full rounded-full bg-gradient-to-r from-app-accent/60 to-app-accent" style={{ width: `${card.progress}%` }} />
                </div>
                <p className="mt-3 text-xs leading-normal text-app-ink-muted">{card.note}</p>
              </div>
            ))}
          </div>

          <details className="group rounded-xl border border-app-line bg-app-surface p-4.5 transition-all duration-200 [&::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between list-none text-sm font-semibold text-app-ink focus:outline-none">
              <span>Xem 7 góc nhìn</span>
              <ChevronDown className="h-4.5 w-4.5 text-app-ink-muted transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <div className="mt-4 border-t border-app-line/60 pt-4 grid gap-3">
              {result.axisScores.map((axis) => (
                <div key={axis.axis} className="rounded-lg border border-app-line bg-app-bg p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium text-app-ink">{axis.label}</p>
                    <span className="text-xs font-medium text-app-ink-muted">
                      {axis.score}/{axis.maxScore}
                    </span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-app-line" aria-hidden="true">
                    <div
                      className={`h-full rounded-full ${getAxisBarClass(axis.percent)}`}
                      style={{ width: `${axis.percent}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs leading-5 text-app-ink-muted">{axis.diagnostic}</p>
                </div>
              ))}
            </div>
          </details>

          <details className="group rounded-xl border border-app-line bg-app-surface p-4.5 transition-all duration-200 [&::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between list-none text-sm font-semibold text-app-ink focus:outline-none">
              <span>Xem mục tiêu đã viết</span>
              <ChevronDown className="h-4.5 w-4.5 text-app-ink-muted transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <div className="mt-4 border-t border-app-line/60 pt-4 space-y-3">
              <p className="text-sm font-medium leading-6 text-app-ink">{pendingGoal.specific}</p>
              <div className="grid gap-3 text-sm leading-6 text-app-ink-soft">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-ink-muted">Thời hạn</p>
                  <p className="mt-1">{pendingGoal.timeBound}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-ink-muted">
                    Dấu hiệu hoàn thành
                  </p>
                  <p className="mt-1">{pendingGoal.measurable}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-ink-muted">
                    Lý do theo đuổi
                  </p>
                  <p className="mt-1">{pendingGoal.relevant}</p>
                </div>
              </div>
            </div>
          </details>

          <details className="group rounded-xl border border-app-line bg-app-surface p-4.5 transition-all duration-200 [&::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between list-none text-sm font-semibold text-app-ink focus:outline-none">
              <span>Xem nhịp triển khai gợi ý</span>
              <ChevronDown className="h-4.5 w-4.5 text-app-ink-muted transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <div className="mt-4 border-t border-app-line/60 pt-4 grid gap-3">
              {copy.weeklyRhythm.map((item, index) => (
                <div key={item.label} className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-app-accent-soft text-xs font-medium text-app-accent">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-app-ink">{item.label}</p>
                    <p className="mt-1 text-xs leading-5 text-app-ink-muted">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </details>

          <details className="group rounded-xl border border-app-line bg-app-surface p-4.5 transition-all duration-200 [&::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between list-none text-sm font-semibold text-app-ink focus:outline-none">
              <span>Xem lý do đằng sau kết quả</span>
              <ChevronDown className="h-4.5 w-4.5 text-app-ink-muted transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <div className="mt-4 border-t border-app-line/60 pt-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-app-accent" aria-hidden="true" />
                <p className="text-sm font-medium text-app-ink">Nên làm trước khi tạo kế hoạch</p>
              </div>
              <ol className="grid gap-2">
                {copy.nextMoves.map((item, index) => (
                  <li key={item} className="flex gap-3 text-sm leading-6 text-app-ink-soft">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-app-accent-soft text-xs font-medium text-app-accent">
                      {index + 1}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
              <div className="rounded-lg border border-app-line bg-app-bg p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-ink-muted">
                  Nguyên tắc lập kế hoạch
                </p>
                <p className="mt-2 text-sm font-medium leading-6 text-app-ink">{result.scopeRecommendation}</p>
                <p className="mt-1 text-xs leading-5 text-app-ink-muted">{result.bottleneck.action}</p>
              </div>
            </div>
          </details>
        </CollapsibleContent>
      </Collapsible>

      <div className="mt-8 flex flex-col-reverse gap-3 border-t border-app-line pt-5 sm:flex-row sm:justify-between">
        <button
          type="button"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-app-line bg-app-surface px-4 py-2.5 text-sm font-medium text-app-ink transition-colors duration-150 hover:bg-app-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 sm:w-auto"
          onClick={onAdjustGoal}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Sửa mục tiêu
        </button>
        <button
          type="button"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-app-accent px-4 py-2.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-app-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 sm:w-auto"
          onClick={onContinue}
        >
          Tiếp tục → Kế hoạch 12 tuần
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
