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
  Flame,
  Key,
  HelpCircle,
  Activity,
  Calendar,
  Wrench,
  Info,
  type LucideIcon,
} from "lucide-react";
import type { PendingSMARTGoal } from "@/lib/smart-goal";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../../../components/ui/collapsible";
import { cn } from "../../../components/ui/utils";
import { getLifeAreaLabel } from "../../../utils/storage";
import type { FeasibilityBottleneck, PlanLoadRecommendation, ResultData, ResultType, WeeklyCapacity } from "../types";

function getPrePlanAction(bottleneck: FeasibilityBottleneck): string {
  switch (bottleneck.axis) {
    case "time":
      return "khóa ít nhất 2 khung giờ cố định trong tuần cho mục tiêu này";
    case "energy":
      return "chọn thời điểm trong ngày bạn còn năng lượng nhất để làm việc chính";
    case "resources":
      return "xác định 1-2 nguồn lực hoặc kỹ năng cần bổ sung ngay tuần đầu";
    case "clarity":
      return "thu hẹp mục tiêu về một kết quả chính duy nhất có thể đo được trong 12 tuần";
    case "obstacle":
      return "viết ra trở ngại chính và quyết định cách xử lý trước khi bắt đầu";
    case "routine":
      return "khóa lịch cố định cho mục tiêu trước khi thêm bất kỳ việc mới nào";
    case "confidence":
      return "chọn một bước nhỏ nhất bạn chắc chắn hoàn thành được trong tuần đầu";
    case "wheel":
      return "cân nhắc củng cố nền tảng lĩnh vực này song song với mục tiêu";
    default:
      return "tinh chỉnh kế hoạch hành động thích ứng";
  }
}

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

function getBottleneckEmpathyText(axis: string): string {
  switch (axis) {
    case "time":
    case "routine":
      return "Cuộc sống bận rộn là điều hoàn toàn bình thường. Chúng ta không cần ép mình làm quá nhiều việc, chỉ cần bảo vệ chặt chẽ 1-2 khung giờ nhỏ cố định mỗi tuần.";
    case "energy":
      return "Sau một ngày làm việc dài, năng lượng đi xuống là phản ứng tự nhiên của cơ thể. Hãy chọn làm việc chính vào khung giờ bạn tỉnh táo nhất hoặc giữ thời lượng cực ngắn.";
    case "resources":
      return "Không ai có đầy đủ mọi thứ khi mới bắt đầu. Việc thiếu hụt kỹ năng ban đầu là cơ hội tuyệt vời để chúng ta thêm bước đệm học hỏi trước khi làm việc lớn.";
    case "clarity":
    case "confidence":
      return "Cảm giác do dự hoặc lo lắng khi đối mặt với mục tiêu mới là hoàn toàn tự nhiên. Hãy tập trung vào những hành động nhỏ nhất để tích lũy niềm tin và chiến thắng sớm.";
    default:
      return "Mọi rào cản đều có thể tháo gỡ nếu chúng ta có phương pháp tiếp cận thông minh và bền bỉ.";
  }
}

function getBottleneckIcon(axis: string): LucideIcon {
  switch (axis) {
    case "time":
      return Calendar;
    case "energy":
      return Flame;
    case "resources":
      return Wrench;
    case "clarity":
      return Target;
    case "obstacle":
      return AlertCircle;
    case "routine":
      return Activity;
    case "confidence":
      return ShieldCheck;
    default:
      return HelpCircle;
  }
}

export function ResultStep({ result, focusArea, pendingGoal, onContinue, onAdjustGoal }: ResultStepProps) {
  const windowWidth = typeof window !== "undefined" ? window.innerWidth : 1024;
  const isDesktop = windowWidth >= 768;
  const copy = RESULT_COPY[result.type];
  const scorePercent = clampPercent(Math.round((result.adjustedScore / 20) * 100));
  const readinessPercent = clampPercent(Math.round((result.readinessScore / 20) * 100));
  const bottleneckPercent =
    result.bottleneck.axis === "wheel"
      ? clampPercent(result.wheelScore * 10)
      : clampPercent(Math.round((result.bottleneck.score / 4) * 100));
  const statusLabel = getScoreLabel(scorePercent);
  const showRiskWarning = result.type !== "realistic" || Boolean(result.smartGoalQualityNote);

  // Custom visual feedback for each feasibility result type
  const resultHeaderCopy = {
    realistic: {
      answer: "Có, mục tiêu rất thực tế! 🎉",
      desc: "Nền tảng của bạn cực kỳ vững vàng. Đây là thời điểm hoàn hảo để chuyển ý tưởng thành hành động thực tế.",
      cardBg: "from-emerald-500/10 via-teal-500/5 to-emerald-500/10 dark:from-emerald-950/20 dark:via-teal-950/10 dark:to-emerald-950/20 border-emerald-500/30",
      textClass: "text-emerald-700 dark:text-emerald-400",
      icon: CheckCircle2,
    },
    challenging: {
      answer: "Khả thi nếu đi đúng hướng! 🌱",
      desc: "Mục tiêu rất đầy cảm hứng! Bạn chỉ cần tinh chỉnh nhẹ nhịp độ và phân bổ lại quỹ thời gian để đảm bảo đi được đường dài.",
      cardBg: "from-amber-500/10 via-yellow-500/5 to-amber-500/10 dark:from-amber-950/20 dark:via-yellow-950/10 dark:to-amber-950/20 border-amber-500/30",
      textClass: "text-amber-700 dark:text-amber-400",
      icon: Compass,
    },
    too_ambitious: {
      answer: "Cần tinh chỉnh một chút để chắc thắng! 🧗",
      desc: "Ước mơ lớn luôn tuyệt vời! Hãy thu nhỏ quy mô chặng 12 tuần này để tích lũy những chiến thắng nhỏ đầu tiên trước khi tăng tốc.",
      cardBg: "from-rose-500/10 via-orange-500/5 to-rose-500/10 dark:from-rose-950/20 dark:via-orange-950/10 dark:to-rose-950/20 border-rose-500/30",
      textClass: "text-rose-700 dark:text-rose-400",
      icon: AlertCircle,
    },
  }[result.type];

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

  const ActionIcon = resultHeaderCopy.icon;
  const BlockerIcon = getBottleneckIcon(result.bottleneck.axis);

  return (
    <section
      className="mt-8 relative overflow-hidden rounded-3xl border border-white/20 dark:border-slate-800/40 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl shadow-2xl p-6 sm:p-8 md:p-10 group"
      aria-labelledby="feasibility-result-title"
    >
      {/* Premium Background Glow effects */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none transition-all duration-1000 group-hover:bg-indigo-500/20" />
      <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-full blur-3xl pointer-events-none transition-all duration-1000 group-hover:bg-emerald-500/20" />

      {/* ── KHU VỰC 1: Mục tiêu có thực tế không? ── */}
      <div className="relative z-10 space-y-6">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-indigo-500 dark:text-indigo-400">Kết quả đánh giá khả thi</p>
          <span className="w-fit rounded-full bg-indigo-50/80 dark:bg-indigo-950/40 px-3.5 py-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-150/30 shadow-sm">
            {getLifeAreaLabel(focusArea)}
          </span>
        </div>

        {/* Hero Banner Khẳng định tính thực tế */}
        <div className={cn(
          "rounded-2xl border p-6 bg-gradient-to-br shadow-md flex gap-4 items-start transition-all duration-300 hover:shadow-lg",
          resultHeaderCopy.cardBg
        )}>
          <div className={cn("p-3 rounded-xl bg-white dark:bg-slate-900 shadow-sm shrink-0", resultHeaderCopy.textClass)}>
            <ActionIcon className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <h2
              id="feasibility-result-title"
              className={cn("font-serif text-2xl sm:text-3xl font-bold tracking-tight", resultHeaderCopy.textClass)}
            >
              {resultHeaderCopy.answer}
            </h2>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-350 font-medium">
              {resultHeaderCopy.desc}
            </p>
          </div>
        </div>

        {/* Thang đo khả thi trực quan (Visual score gauge block) */}
        <div className="rounded-2xl border border-white/10 dark:border-slate-850/40 bg-slate-50/40 dark:bg-slate-950/20 p-6 backdrop-blur-[2px]">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="relative flex shrink-0 flex-col items-center justify-center text-center sm:w-48 gap-4">
              <div className="relative flex flex-col items-center justify-center w-28 h-40 rounded-[20px] border-4 border-slate-350 dark:border-slate-700 bg-slate-100 dark:bg-slate-900/60 overflow-hidden shadow-inner group/container">
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
                <p className={cn("text-base font-extrabold", resultHeaderCopy.textClass)}>{statusLabel}</p>
                <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">Mức độ khả thi</p>
              </div>
            </div>
            
            <div className="min-w-0 flex-1 space-y-5">
              <div className="rounded-xl bg-indigo-500/5 p-4 border border-indigo-500/10 shadow-sm text-sm font-semibold leading-relaxed text-indigo-700 dark:text-indigo-400">
                {result.summary}
              </div>
              
              <div className="space-y-3">
                {/* Premium Multi-Color Gradient Progress Track */}
                <div className="relative h-3.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800/60 shadow-inner border border-slate-200/10" aria-hidden="true">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 transition-all duration-1000 ease-out relative"
                    style={{ width: `${scorePercent}%` }}
                  >
                    {/* Floating Indicator Bubble */}
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,1)] animate-ping" />
                  </div>
                  <span className="absolute left-[25%] top-0 h-full w-px bg-slate-200/30 dark:bg-slate-700/30" />
                  <span className="absolute left-[50%] top-0 h-full w-px bg-slate-200/30 dark:bg-slate-700/30" />
                  <span className="absolute left-[75%] top-0 h-full w-px bg-slate-200/30 dark:bg-slate-700/30" />
                </div>
                <div className="flex justify-between text-[10px] font-extrabold text-slate-450 dark:text-slate-500 uppercase tracking-widest">
                  <span>Cần rất nhẹ (0-5)</span>
                  <span>Vừa sức (5-7.5)</span>
                  <span>Lý tưởng (7.5-10)</span>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-slate-650 dark:text-slate-350 font-medium">
                {result.recommendation}
              </p>
            </div>
          </div>
        </div>

        {/* ── KHU VỰC 2: Trở ngại lớn nhất là gì? ── */}
        <div className={cn(
          "rounded-2xl border p-5.5 relative overflow-hidden transition-all duration-300 hover:shadow-md",
          result.type === "too_ambitious" 
            ? "border-rose-200/30 bg-rose-500/5 text-rose-800 dark:text-rose-300"
            : result.type === "challenging"
              ? "border-amber-200/30 bg-amber-500/5 text-amber-800 dark:text-amber-300"
              : "border-indigo-200/30 bg-indigo-500/5 text-indigo-800 dark:text-indigo-300"
        )}>
          <div className="flex gap-4 items-start relative z-10">
            <div className={cn(
              "p-2.5 rounded-xl bg-white dark:bg-slate-900 shadow-sm shrink-0",
              result.type === "too_ambitious" ? "text-rose-500" : result.type === "challenging" ? "text-amber-500" : "text-indigo-500"
            )}>
              <BlockerIcon className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-bold text-[15px] uppercase tracking-wider flex items-center gap-2">
                Trở ngại lớn nhất: <span className="underline decoration-2 underline-offset-4">{result.bottleneck.label}</span>
              </h3>
              <p className="text-sm leading-relaxed text-slate-650 dark:text-slate-300 font-semibold italic">
                "{getBottleneckEmpathyText(result.bottleneck.axis)}"
              </p>
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-200 font-bold mt-2">
                👉 Lời khuyên thiết thực: {result.bottleneck.action}
              </p>
            </div>
          </div>
        </div>

        {/* ── KHU VỰC 3: Tôi nên thay đổi điều gì? ── */}
        <div className="space-y-4">
          <h3 className="text-xs font-extrabold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Điều chỉnh đề xuất cho kế hoạch</h3>
          
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Thẻ 1: Hành động trước lập kế hoạch */}
            <div className="rounded-2xl border border-white/20 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/30 p-5 hover:scale-[1.03] hover:-translate-y-0.5 hover:bg-white/80 dark:hover:bg-slate-900/80 hover:shadow-lg transition-all duration-300 flex flex-col gap-3 group/card cursor-pointer">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 group-hover/card:bg-indigo-500 group-hover/card:text-white transition-all duration-300 shadow-sm shrink-0">
                <Key className="h-4.5 w-4.5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-extrabold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">Hành động ưu tiên</h4>
                <p className="text-sm font-bold text-slate-850 dark:text-white leading-relaxed capitalize">
                  {result.bottleneck.axis === "wheel" 
                    ? "Cân bằng lại nền tảng lĩnh vực ưu tiên" 
                    : `Hãy ${result.bottleneck.axis === "time" ? "khóa thời gian" : result.bottleneck.axis === "routine" ? "cố định lịch" : result.bottleneck.axis === "resources" ? "bổ sung công cụ" : "tinh chỉnh mục tiêu"}`}
                </p>
                <p className="text-xs leading-relaxed text-slate-550 dark:text-slate-400 font-medium">
                  Hành động thực tế: Cần {result.bottleneck.axis === "wheel" ? "giữ mục tiêu nhỏ vừa sức" : getPrePlanAction(result.bottleneck)} để tháo gỡ điểm nghẽn.
                </p>
              </div>
            </div>

            {/* Thẻ 2: Lời khuyên tuần đầu tiên */}
            <div className="rounded-2xl border border-white/20 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/30 p-5 hover:scale-[1.03] hover:-translate-y-0.5 hover:bg-white/80 dark:hover:bg-slate-900/80 hover:shadow-lg transition-all duration-300 flex flex-col gap-3 group/card cursor-pointer">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 group-hover/card:bg-indigo-500 group-hover/card:text-white transition-all duration-300 shadow-sm shrink-0">
                <Sparkles className="h-4.5 w-4.5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-extrabold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">Tuần khởi động (Tuần 1)</h4>
                <p className="text-sm font-bold text-slate-850 dark:text-white leading-relaxed">
                  Thiết lập khởi đầu thắng lợi sớm
                </p>
                <p className="text-xs leading-relaxed text-slate-550 dark:text-slate-400 font-medium">
                  {result.firstWeekGuidance}
                </p>
              </div>
            </div>

            {/* Thẻ 3: Khuyến nghị quy mô */}
            <div className="rounded-2xl border border-white/20 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/30 p-5 hover:scale-[1.03] hover:-translate-y-0.5 hover:bg-white/80 dark:hover:bg-slate-900/80 hover:shadow-lg transition-all duration-300 flex flex-col gap-3 group/card cursor-pointer">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 group-hover/card:bg-indigo-500 group-hover/card:text-white transition-all duration-300 shadow-sm shrink-0">
                <Target className="h-4.5 w-4.5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-extrabold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest">Quy mô & Mức tải</h4>
                <p className="text-sm font-bold text-slate-850 dark:text-white leading-relaxed">
                  Mức tải đề xuất: {PLAN_LOAD_LABEL[result.planLoad]}
                </p>
                <p className="text-xs leading-relaxed text-slate-550 dark:text-slate-400 font-medium">
                  {result.scopeRecommendation}
                </p>
              </div>
            </div>
          </div>
        </div>

        {showRiskWarning && result.smartGoalQualityNote ? (
          <div className="rounded-2xl border border-amber-200/30 bg-amber-500/5 p-4.5 text-amber-850 dark:text-amber-300">
            <div className="flex gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />
              <div className="space-y-1">
                <p className="font-bold text-sm">Lời khuyên tinh chỉnh SMART Goal</p>
                <p className="text-xs sm:text-sm leading-relaxed text-slate-500 dark:text-slate-400 font-semibold">
                  {result.smartGoalQualityNote}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Collapsible phân tích chi tiết phụ trợ */}
        <Collapsible
          key={isDesktop ? "feasibility-details-desktop" : "feasibility-details-mobile"}
          defaultOpen={false}
          className="mt-6 border-t border-slate-200/30 dark:border-slate-800/40 pt-5"
        >
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="inline-flex w-full items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/50 px-5 py-3 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-150 shadow-sm focus:outline-none"
            >
              <span className="flex items-center gap-2">
                <Info className="h-4.5 w-4.5 text-indigo-500" />
                Xem phân tích chi tiết & 7 khía cạnh
              </span>
              <ChevronDown className="h-5 w-5 text-slate-400 transition-transform duration-200" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-5 space-y-5 data-[state=closed]:hidden">
            <div className="rounded-2xl border border-white/20 dark:border-slate-800/40 bg-white/40 dark:bg-slate-900/30 p-5 md:p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <Compass className="h-5 w-5 text-indigo-500" aria-hidden="true" />
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-500/80 dark:text-indigo-400/80">
                  Hướng đi tiếp theo
                </p>
              </div>
              <h3 className="mt-4 font-serif text-2xl font-bold text-slate-900 dark:text-white">{copy.guideTitle}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-650 dark:text-slate-350 font-medium">{copy.guideBody}</p>
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
                <div className="grid gap-4 text-sm leading-relaxed text-slate-650 dark:text-slate-400">
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
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-550 dark:text-slate-400 font-medium">{item.detail}</p>
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
                      <span className="text-sm leading-relaxed text-slate-550 dark:text-slate-400 font-medium">{item}</span>
                    </li>
                  ))}
                </ol>
                <div className="rounded-xl border border-white/30 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 p-4">
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
                    Nguyên tắc lập kế hoạch
                  </p>
                  <p className="text-sm font-bold leading-relaxed text-slate-800 dark:text-slate-200">{result.scopeRecommendation}</p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-550 dark:text-slate-400 font-medium">{result.bottleneck.action}</p>
                </div>
              </div>
            </details>
          </CollapsibleContent>
        </Collapsible>

        {/* ── KHU VỰC 4: Bật đèn xanh & CTA Tiếp tục ── */}
        <div className="mt-10 pt-8 border-t border-slate-200/40 dark:border-slate-800/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 relative z-10">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">Đã sẵn sàng hành động?</h4>
            <p className="text-xs text-slate-500 dark:text-slate-450 font-medium">Bất kể mức độ khả thi, hãy biến mục tiêu của bạn thành kế hoạch 12 tuần thích nghi.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto shrink-0">
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 px-6 py-3.5 text-sm font-bold text-slate-700 dark:text-slate-200 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800 hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 sm:w-auto"
              onClick={onAdjustGoal}
            >
              <ArrowLeft className="h-4.5 w-4.5" aria-hidden="true" />
              Tinh chỉnh mục tiêu ✏️
            </button>
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-550 hover:from-indigo-500 hover:to-indigo-500 hover:shadow-indigo-600/20 px-7 py-3.5 text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-indigo-600/15 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 sm:w-auto"
              onClick={onContinue}
            >
              Bắt đầu lập Kế hoạch 12 tuần ngay 🚀
              <ArrowRight className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
