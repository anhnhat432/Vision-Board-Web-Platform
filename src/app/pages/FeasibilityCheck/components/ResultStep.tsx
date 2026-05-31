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
import { cn } from "../../../components/ui/utils";
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
    statusLabel: "Mục tiêu này ổn, bước tiếp theo là chia nhỏ theo tuần",
    statusHint: "Nền tảng của bạn rất vững vàng, sẵn sàng để bắt đầu kế hoạch 12 tuần.",
    guideTitle: "Hãy đi tiếp và giữ cho tuần đầu tiên thật nhẹ nhàng.",
    guideBody: "Bạn không cần lập một kế hoạch quá vĩ mô. Hãy bắt đầu bằng vài việc nhỏ, cụ thể, đo lường được và duy trì đều đặn.",
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
    statusLabel: "Có thể làm được, nhưng cần điều chỉnh nhịp",
    statusHint: "Mục tiêu đầy cảm hứng! Chỉ cần tinh chỉnh quỹ thời gian và các bước đi một chút là bạn sẽ làm được.",
    guideTitle: "Tập trung hơn một chút, bạn sẽ đi được xa và bền bỉ hơn.",
    guideBody:
      "Mục tiêu có sức bật rất tốt nhưng có thể hơi rộng lúc này. Hãy giữ một hướng đi chính và tạm thời gác lại những điều phụ.",
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
    statusLabel: "Mục tiêu này cần thu nhỏ một chút để dễ hoàn thành hơn",
    statusHint:
      "Chúng mình khuyên bạn nên điều chỉnh để có một khởi đầu nhẹ nhàng và bền vững.",
    guideTitle: "Không cần hạ thấp ước mơ — chỉ cần chia nhỏ chặng đường.",
    guideBody:
      "Hãy giữ ước mơ lớn, nhưng biến 12 tuần này thành một bước đệm vừa tầm để bạn có một hành trình đầy tự tin và chiến thắng.",
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
      value: readinessPercent >= 75 ? "Sẵn sàng ✨" : readinessPercent >= 50 ? "Khá ổn 🌱" : "Cần lưu ý 🌊",
      note: `Điểm số: ${result.readinessScore}/20 (${result.diagnosticScore}/${result.maxDiagnosticScore} điểm gốc).`,
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
          <div className="relative flex shrink-0 flex-col items-center justify-center text-center sm:w-48 gap-4">
            <div className="relative flex flex-col items-center justify-center w-28 h-40 rounded-[20px] border-4 border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/60 overflow-hidden shadow-inner group/container">
              <style>{`
                @keyframes wave-flow {
                  0% { transform: translateX(0); }
                  100% { transform: translateX(-50%); }
                }
                .wave-anim-1 {
                  animation: wave-flow 3s linear infinite;
                }
                .wave-anim-2 {
                  animation: wave-flow 5.5s linear infinite;
                }
              `}</style>
              {/* Nắp chai hoặc cực pin nhỏ phía trên */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-2 bg-slate-400 dark:bg-slate-600 rounded-b" />
              
              {/* Lớp nước/năng lượng dâng vơi */}
              <div 
                className={cn(
                  "absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-out overflow-hidden",
                  scorePercent >= 75 ? "bg-gradient-to-t from-emerald-500 to-teal-400" :
                  scorePercent >= 50 ? "bg-gradient-to-t from-amber-500 to-yellow-400" :
                  "bg-gradient-to-t from-rose-500 to-red-400"
                )}
                style={{ height: `${scorePercent}%` }}
              >
                {/* Sóng nước nhấp nhô chuyển động (Wave animation) */}
                <div className="absolute top-0 left-0 right-0 h-4 overflow-hidden -mt-2">
                  <svg 
                    viewBox="0 0 120 28" 
                    className="absolute left-0 w-[200%] h-full fill-current text-white/20 wave-anim-1"
                    role="img"
                  >
                    <title>Sóng nước 1</title>
                    <path d="M0 15 Q 30 0, 60 15 T 120 15 T 180 15 T 240 15 L 240 28 L 0 28 Z" />
                  </svg>
                  <svg 
                    viewBox="0 0 120 28" 
                    className="absolute left-0 w-[200%] h-full fill-current text-white/10 wave-anim-2 opacity-80"
                    role="img"
                  >
                    <title>Sóng nước 2</title>
                    <path d="M0 15 Q 30 25, 60 15 T 120 15 T 180 15 T 240 15 L 240 28 L 0 28 Z" />
                  </svg>
                </div>
              </div>
              
              {/* Chỉ số hiển thị chìm bên trong bể */}
              <div className="relative z-10 flex flex-col items-center justify-center p-2 text-center pointer-events-none mix-blend-difference">
                <span className="font-serif text-3xl font-black text-white leading-none">
                  {scorePercent}%
                </span>
                <span className="mt-1.5 text-[8px] font-extrabold uppercase tracking-widest text-white/95">
                  DUNG LƯỢNG
                </span>
              </div>
            </div>
            <div>
              <p className="text-sm font-extrabold text-indigo-500 dark:text-indigo-400">{statusLabel}</p>
              <p className="mt-0.5 text-xs text-slate-450 dark:text-slate-500 font-medium">Mức độ khả thi</p>
            </div>
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
          <div className="rounded-2xl border border-white/20 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/30 p-5 md:p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-indigo-500" aria-hidden="true" />
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-500/80 dark:text-indigo-400/80">
                Hướng đi tiếp theo
              </p>
            </div>
            <h3 className="mt-4 font-serif text-2xl font-bold text-slate-900 dark:text-white">{copy.guideTitle}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-350 font-medium">{copy.guideBody}</p>
            <div className="mt-5 rounded-xl border border-indigo-500/10 bg-indigo-50/50 dark:bg-indigo-950/20 p-4">
              <p className="text-sm font-bold text-indigo-700 dark:text-indigo-400">Lời khuyên Tuần 1</p>
              <p className="mt-1.5 text-sm leading-relaxed text-indigo-600 dark:text-indigo-300">{result.firstWeekGuidance}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-indigo-500 text-white px-3 py-1 text-xs font-bold shadow-sm">
                  Mức tải: {PLAN_LOAD_LABEL[result.planLoad]}
                </span>
                <span className="rounded-full border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-900 px-3 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  Quỹ thời gian: {CAPACITY_LABEL[result.weeklyCapacity]}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {scoreCards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-white/20 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/30 p-5 transition-all duration-300 hover:bg-white/60 dark:hover:bg-slate-900/50 hover:shadow-md">
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">{card.label}</p>
                <p className="mt-2 text-2xl font-extrabold leading-none text-slate-800 dark:text-white tracking-tight">{card.value}</p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800 shadow-inner" aria-hidden="true">
                  <div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-indigo-600 transition-all duration-1000" style={{ width: `${card.progress}%` }} />
                </div>
                <p className="mt-3 text-xs leading-relaxed text-slate-500 font-medium">{card.note}</p>
              </div>
            ))}
          </div>

          <details className="group rounded-2xl border border-white/20 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/30 p-5 transition-all duration-300 hover:bg-white/60 dark:hover:bg-slate-900/50 [&::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between list-none text-sm font-bold text-slate-800 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg p-1">
              <span>Xem 7 góc nhìn</span>
              <ChevronDown className="h-5 w-5 text-slate-400 transition-transform duration-300 group-open:rotate-180" />
            </summary>
            <div className="mt-4 border-t border-slate-200/50 dark:border-slate-800 pt-5 grid gap-4">
              {result.axisScores.map((axis) => (
                <div key={axis.axis} className="rounded-xl border border-white/30 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{axis.label}</p>
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                      {axis.score}/{axis.maxScore}
                    </span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800 shadow-inner" aria-hidden="true">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${getAxisBarClass(axis.percent)}`}
                      style={{ width: `${axis.percent}%` }}
                    />
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400 font-medium">{axis.diagnostic}</p>
                </div>
              ))}
            </div>
          </details>

          <details className="group rounded-2xl border border-white/20 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/30 p-5 transition-all duration-300 hover:bg-white/60 dark:hover:bg-slate-900/50 [&::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between list-none text-sm font-bold text-slate-800 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg p-1">
              <span>Xem mục tiêu đã viết</span>
              <ChevronDown className="h-5 w-5 text-slate-400 transition-transform duration-300 group-open:rotate-180" />
            </summary>
            <div className="mt-4 border-t border-slate-200/50 dark:border-slate-800 pt-5 space-y-4">
              <p className="text-sm font-bold leading-relaxed text-slate-800 dark:text-slate-200 p-4 rounded-xl bg-white/60 dark:bg-slate-900/60 shadow-sm border border-white/30 dark:border-slate-800">{pendingGoal.specific}</p>
              <div className="grid gap-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Thời hạn</p>
                  <p className="font-medium text-slate-800 dark:text-slate-200">{pendingGoal.timeBound}</p>
                </div>
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Dấu hiệu hoàn thành</p>
                  <p className="font-medium text-slate-800 dark:text-slate-200">{pendingGoal.measurable}</p>
                </div>
                <div>
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">Lý do theo đuổi</p>
                  <p className="font-medium text-slate-800 dark:text-slate-200">{pendingGoal.relevant}</p>
                </div>
              </div>
            </div>
          </details>

          <details className="group rounded-2xl border border-white/20 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/30 p-5 transition-all duration-300 hover:bg-white/60 dark:hover:bg-slate-900/50 [&::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between list-none text-sm font-bold text-slate-800 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg p-1">
              <span>Xem nhịp triển khai gợi ý</span>
              <ChevronDown className="h-5 w-5 text-slate-400 transition-transform duration-300 group-open:rotate-180" />
            </summary>
            <div className="mt-4 border-t border-slate-200/50 dark:border-slate-800 pt-5 grid gap-4">
              {copy.weeklyRhythm.map((item, index) => (
                <div key={item.label} className="flex gap-4 p-4 rounded-xl bg-white/50 dark:bg-slate-900/50 border border-white/30 dark:border-slate-800">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.label}</p>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400 font-medium">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </details>

          <details className="group rounded-2xl border border-white/20 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/30 p-5 transition-all duration-300 hover:bg-white/60 dark:hover:bg-slate-900/50 [&::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer items-center justify-between list-none text-sm font-bold text-slate-800 dark:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg p-1">
              <span>Xem lý do đằng sau kết quả</span>
              <ChevronDown className="h-5 w-5 text-slate-400 transition-transform duration-300 group-open:rotate-180" />
            </summary>
            <div className="mt-4 border-t border-slate-200/50 dark:border-slate-800 pt-5 space-y-5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" aria-hidden="true" />
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Nên làm trước khi tạo kế hoạch</p>
              </div>
              <ol className="grid gap-3">
                {copy.nextMoves.map((item, index) => (
                  <li key={item} className="flex gap-4 p-3 rounded-xl hover:bg-white/40 dark:hover:bg-slate-900/40 transition-colors">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {index + 1}
                    </span>
                    <span className="text-sm leading-relaxed text-slate-600 dark:text-slate-400 font-medium">{item}</span>
                  </li>
                ))}
              </ol>
              <div className="rounded-xl border border-white/30 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 p-4">
                <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
                  Nguyên tắc lập kế hoạch
                </p>
                <p className="text-sm font-bold leading-relaxed text-slate-800 dark:text-slate-200">{result.scopeRecommendation}</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400 font-medium">{result.bottleneck.action}</p>
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
          Điều chỉnh mục tiêu
        </button>
        <button
          type="button"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-app-accent px-4 py-2.5 text-sm font-medium text-white transition-all duration-150 hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 sm:w-auto"
          onClick={onContinue}
        >
          {result.type === "realistic" ? "Tiếp tục với mục tiêu này" : "Tạo kế hoạch 12 tuần"}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
