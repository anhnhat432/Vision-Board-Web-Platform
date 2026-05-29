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
      className="mt-6 relative overflow-hidden rounded-3xl border border-white/20 dark:border-slate-800/40 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-2xl p-6 sm:p-8 group"
      aria-labelledby="feasibility-result-title"
    >
      {/* Premium Background Glow effects */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none transition-all duration-1000 group-hover:bg-indigo-500/20" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-3xl pointer-events-none transition-all duration-1000 group-hover:bg-emerald-500/20" />

      <div className="relative z-10">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-indigo-500 dark:text-indigo-400">Kết quả kiểm tra</p>
          <span className="w-fit rounded-full bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-150/30">
            {getLifeAreaLabel(focusArea)}
          </span>
        </div>
        <h2
          id="feasibility-result-title"
          className="mt-3 font-serif text-3xl font-bold leading-9 tracking-tight text-slate-900 dark:text-white"
        >
          {copy.statusLabel}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-350">{result.summary}</p>
      </div>

      {/* Visual score gauge block */}
      <div className="mt-6 relative z-10 rounded-2xl border border-white/10 dark:border-slate-850/40 bg-slate-50/40 dark:bg-slate-950/20 p-5 sm:p-6 backdrop-blur-[2px]">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="relative flex shrink-0 flex-col items-center justify-center text-center sm:w-48">
            <div className="relative flex items-center justify-center h-32 w-32 drop-shadow-[0_0_15px_rgba(99,102,241,0.25)] dark:drop-shadow-[0_0_20px_rgba(99,102,241,0.35)]">
              <svg className="absolute inset-0 w-full h-full transform -rotate-90" role="img" aria-label="Biểu đồ tiến trình độ khả thi">
                <title>Biểu đồ tiến trình độ khả thi</title>
                <circle
                  cx="64"
                  cy="64"
                  r="52"
                  className="stroke-slate-200/60 dark:stroke-slate-800/60"
                  strokeWidth="6"
                  fill="transparent"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="52"
                  className="stroke-indigo-500 dark:stroke-indigo-400 transition-all duration-1000 ease-out"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={2 * Math.PI * 52}
                  strokeDashoffset={2 * Math.PI * 52 - (scorePercent / 100) * (2 * Math.PI * 52)}
                  strokeLinecap="round"
                />
              </svg>
              <div className="relative flex flex-col items-center justify-center">
                <span className="font-serif text-5.5xl font-extrabold leading-none bg-gradient-to-br from-slate-900 to-indigo-950 dark:from-white dark:to-indigo-200 bg-clip-text text-transparent tracking-tight">{scoreOutOfTen}</span>
                <span className="mt-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">Điểm số</span>
              </div>
            </div>
            <p className="mt-3 text-sm font-extrabold text-indigo-500 dark:text-indigo-400">{statusLabel}</p>
            <p className="mt-0.5 text-xs text-slate-450 dark:text-slate-500 font-medium">Mức độ khả thi</p>
          </div>
          
          <div className="min-w-0 flex-1 space-y-4">
            <div className="rounded-xl bg-indigo-500/5 p-4 border border-indigo-500/10">
              <p className="text-sm font-bold leading-relaxed text-indigo-600 dark:text-indigo-400">{copy.statusHint}</p>
            </div>
            
            <div className="space-y-3">
              {/* Premium Multi-Color Gradient Progress Track */}
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800/60 shadow-inner" aria-hidden="true">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 transition-all duration-1000 ease-out relative"
                  style={{ width: `${scorePercent}%` }}
                >
                  {/* Floating Indicator Bubble */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,1)] animate-ping" />
                </div>
                <span className="absolute left-[25%] top-0 h-full w-px bg-slate-200/50 dark:bg-slate-700/50" />
                <span className="absolute left-[50%] top-0 h-full w-px bg-slate-200/50 dark:bg-slate-700/50" />
                <span className="absolute left-[75%] top-0 h-full w-px bg-slate-200/50 dark:bg-slate-700/50" />
              </div>
              <div className="flex justify-between text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <span>Cần nhẹ (0-5)</span>
                <span>Vừa sức (5-7.5)</span>
                <span>Sẵn sàng (7.5-10)</span>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-350">{result.recommendation}</p>
          </div>
        </div>
      </div>

      {/* Grid Highlights cards - 3 columns on Desktop, beautifully designed Glass cards */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3 relative z-10">
        {copy.highlights.map((item) => {
          const Icon = item.icon;

          return (
            <div 
              key={item.title} 
              className="flex flex-col sm:items-center sm:text-center gap-3.5 rounded-2xl border border-white/20 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/30 p-5 hover:scale-[1.03] hover:-translate-y-0.5 hover:bg-white/80 dark:hover:bg-slate-900/80 hover:shadow-lg transition-all duration-300 group/card cursor-pointer"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 group-hover/card:bg-indigo-500 group-hover/card:text-white transition-all duration-300 shadow-sm">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-855 dark:text-white tracking-wide">{item.title}</p>
                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-medium">{item.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {showRiskWarning ? (
        <div className="mt-6 rounded-2xl border border-amber-200/30 bg-amber-500/5 p-4 text-amber-850 dark:text-amber-300 relative z-10">
          <div className="flex gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />
            <div>
              <p className="font-bold text-sm">Có vài trở ngại cần lưu ý</p>
              <p className="mt-1 text-xs sm:text-sm leading-relaxed text-slate-500 dark:text-slate-400 font-medium">
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
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-app-line bg-app-surface px-4 py-2.5 text-sm font-medium text-app-ink transition-all duration-150 hover:bg-app-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 sm:w-auto"
          >
            {isDesktop ? "Phân tích chi tiết" : "Mở chi tiết"}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4 space-y-4 data-[state=closed]:hidden">
          <div className="rounded-[14px] border border-app-line bg-app-bg p-4 md:p-5">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-app-accent" aria-hidden="true" />
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-ink-muted">
                Hướng đi tiếp theo
              </p>
            </div>
            <h3 className="mt-3 font-serif text-xl font-medium text-app-ink">{copy.guideTitle}</h3>
            <p className="mt-2 text-sm leading-6 text-app-ink-soft">{copy.guideBody}</p>
            <div className="mt-4 rounded-[14px] border border-app-line bg-app-surface p-3.5">
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
              <div key={card.label} className="rounded-[14px] border border-app-line bg-app-surface p-4.5 transition-all duration-200">
                <p className="text-xs font-bold uppercase tracking-wider text-app-ink-muted">{card.label}</p>
                <p className="mt-2 text-2xl font-bold leading-none text-app-ink">{card.value}</p>
                <div className="mt-3.5 h-2 overflow-hidden rounded-full bg-app-line/60" aria-hidden="true">
                  <div className="h-full rounded-full bg-app-accent" style={{ width: `${card.progress}%` }} />
                </div>
                <p className="mt-3 text-xs leading-normal text-app-ink-muted">{card.note}</p>
              </div>
            ))}
          </div>

          <details className="group rounded-[14px] border border-app-line bg-app-surface p-4.5 transition-all duration-200 [&::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between list-none text-sm font-semibold text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 rounded-lg p-1">
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

          <details className="group rounded-[14px] border border-app-line bg-app-surface p-4.5 transition-all duration-200 [&::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between list-none text-sm font-semibold text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 rounded-lg p-1">
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

          <details className="group rounded-[14px] border border-app-line bg-app-surface p-4.5 transition-all duration-200 [&::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between list-none text-sm font-semibold text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 rounded-lg p-1">
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

          <details className="group rounded-[14px] border border-app-line bg-app-surface p-4.5 transition-all duration-200 [&::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between list-none text-sm font-semibold text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 rounded-lg p-1">
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
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-app-line bg-app-surface px-4 py-2.5 text-sm font-medium text-app-ink transition-all duration-150 hover:bg-app-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 sm:w-auto"
          onClick={onAdjustGoal}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Sửa mục tiêu
        </button>
        <button
          type="button"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-app-accent px-4 py-2.5 text-sm font-medium text-white transition-all duration-150 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 sm:w-auto"
          onClick={onContinue}
        >
          Tiếp tục → Kế hoạch 12 tuần
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
