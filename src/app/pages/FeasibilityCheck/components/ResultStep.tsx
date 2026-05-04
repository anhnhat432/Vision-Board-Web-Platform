import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Compass,
  Gauge,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import type { PendingSMARTGoal } from "@/lib/smart-goal";
import { CoreFlowProgress } from "../../../components/CoreFlowProgress";
import { useReducedMotion } from "../../../components/ui/use-reduced-motion";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card, CardContent } from "../../../components/ui/card";
import { getLifeAreaLabel } from "../../../utils/storage";
import type { PlanLoadRecommendation, ResultData, ResultType, WeeklyCapacity } from "../types";

interface ResultStepProps {
  result: ResultData;
  focusArea: string;
  pendingGoal: PendingSMARTGoal;
  onContinue: () => void;
  onAdjustGoal: () => void;
}

export function ResultStep({ result, focusArea, pendingGoal, onContinue, onAdjustGoal }: ResultStepProps) {
  const prefersReducedMotion = useReducedMotion();
  const iconMap: Record<ResultType, ReactNode> = {
    realistic: <CheckCircle2 className="h-10 w-10 text-white" />,
    challenging: <TrendingUp className="h-10 w-10 text-white" />,
    too_ambitious: <AlertTriangle className="h-10 w-10 text-white" />,
  };

  const styleMap: Record<ResultType, { glow: string; badge: string; title: string; panel: string; meter: string }> = {
    realistic: {
      glow: "bg-gradient-to-br from-emerald-400/24 via-cyan-300/14 to-transparent",
      badge: "border-emerald-200 bg-emerald-50 text-emerald-800",
      title: "border-emerald-200/70 gradient-emerald-title",
      panel: "border-emerald-100/80 gradient-white-emerald",
      meter: "from-emerald-400 via-teal-400 to-cyan-400",
    },
    challenging: {
      glow: "bg-gradient-to-br from-amber-400/24 via-orange-300/14 to-transparent",
      badge: "border-amber-200 bg-amber-50 text-amber-800",
      title: "border-amber-200/70 gradient-amber-title",
      panel: "border-amber-100/80 gradient-white-amber",
      meter: "from-amber-400 via-orange-400 to-rose-400",
    },
    too_ambitious: {
      glow: "bg-gradient-to-br from-rose-400/24 via-orange-300/14 to-transparent",
      badge: "border-rose-200 bg-rose-50 text-rose-800",
      title: "border-rose-200/70 gradient-rose-title",
      panel: "border-rose-100/80 gradient-white-rose",
      meter: "from-rose-400 via-fuchsia-400 to-orange-400",
    },
  };

  const resultCopy: Record<
    ResultType,
    {
      statusLabel: string;
      statusHint: string;
      guideTitle: string;
      guideBody: string;
      highlights: { title: string; description: string; icon: ReactNode }[];
      nextMoves: string[];
      weeklyRhythm: { label: string; detail: string }[];
    }
  > = {
    realistic: {
      statusLabel: "Đủ thực tế để bắt đầu",
      statusHint: "Nền tảng hiện tại đang ủng hộ bạn bước vào một chu kỳ 12 tuần gọn, rõ và giữ được nhịp.",
      guideTitle: "Đi tiếp, nhưng giữ cho tuần đầu thật vừa tay.",
      guideBody:
        "Bạn không cần một kế hoạch thật lớn để thắng. Điều bạn cần là một hệ hành động nhỏ, rõ, đo được và đủ nhẹ để giữ đều qua từng tuần.",
      highlights: [
        {
          title: "Giữ nhịp nhỏ nhưng đều",
          description: "Chọn 2-4 việc chính để lặp lại mỗi tuần, thay vì nhồi quá nhiều việc ngay lúc đầu.",
          icon: <Sparkles className="h-4 w-4" />,
        },
        {
          title: "Khóa lịch nhìn lại ngay",
          description: "Một lịch nhìn lại cố định sẽ giúp bạn không lệch nhịp khi tuần bắt đầu bận hơn.",
          icon: <ShieldCheck className="h-4 w-4" />,
        },
        {
          title: "Ưu tiên cảm giác thắng sớm",
          description: "Tuần đầu nên đủ nhẹ để bạn hoàn thành tốt và tạo đà cho cả chu kỳ.",
          icon: <Target className="h-4 w-4" />,
        },
      ],
      nextMoves: [
        "Chuyển mục tiêu này thành kế hoạch 12 tuần với 2-4 việc chính thật rõ.",
        "Thiết kế tuần đầu thiên về nhịp độ, không phải khối lượng quá lớn.",
        "Giữ một buổi nhìn lại hằng tuần để điều chỉnh trước khi bị trễ nhịp.",
      ],
      weeklyRhythm: [
        {
          label: "Ngay sau kết quả",
          detail: "Chốt kết quả 12 tuần và các việc chính bạn sẽ lặp lại hằng tuần.",
        },
        {
          label: "Tuần 1",
          detail: "Giữ kế hoạch gọn để tạo cảm giác thắng sớm và củng cố niềm tin hành động.",
        },
        {
          label: "Từ tuần 2 trở đi",
          detail: "Duy trì buổi nhìn lại, chỉ tăng độ khó khi bạn đang giữ nhịp ổn định thật sự.",
        },
      ],
    },
    challenging: {
      statusLabel: "Khó nhưng vẫn làm được",
      statusHint:
        "Bạn có thể đạt mục tiêu này nếu thu gọn mục tiêu, làm rõ việc cần làm và nhìn lại mỗi tuần thật nghiêm túc.",
      guideTitle: "Tập trung hơn một chút, bạn sẽ đi được xa hơn.",
      guideBody:
        "Đây là kiểu mục tiêu có sức bật, nhưng không phù hợp nếu triển khai quá rộng. Hãy giữ một hướng chính rõ và bỏ bớt các phần gây nhiễu.",
      highlights: [
        {
          title: "Thu hẹp mục tiêu 12 tuần đầu",
          description: "Chỉ giữ kết quả quan trọng nhất thay vì cố ôm toàn bộ bức tranh ngay lúc này.",
          icon: <Target className="h-4 w-4" />,
        },
        {
          title: "Ưu tiên hành động dẫn dắt",
          description: "Tập trung vào vài việc có thể đo được, thay vì một danh sách dài nhưng mờ hiệu quả.",
          icon: <Gauge className="h-4 w-4" />,
        },
        {
          title: "Dùng buổi nhìn lại để cắt nhiễu",
          description: "Mỗi tuần nên bỏ bớt những việc không còn phục vụ kết quả chính.",
          icon: <Compass className="h-4 w-4" />,
        },
      ],
      nextMoves: [
        "Giữ mục tiêu chính nhưng thu gọn nó về một kết quả duy nhất cho 12 tuần đầu.",
        "Chỉ chọn các việc chính thật sự đo được và có thể lặp lại mỗi tuần.",
        "Đặt buổi nhìn lại hằng tuần để kiểm soát độ nặng, không để kế hoạch phình dần.",
      ],
      weeklyRhythm: [
        {
          label: "Ngay sau kết quả",
          detail: "Chốt một kết quả đủ rõ và bỏ bớt các mục tiêu phụ không cần thiết cho chu kỳ này.",
        },
        {
          label: "Tuần 1-2",
          detail: "Kiểm chứng xem nhịp hành động hiện tại có thực sự vừa với lịch sống của bạn hay chưa.",
        },
        {
          label: "Sau mỗi lần nhìn lại",
          detail: "Nếu đang đuối, giảm tải trước khi tăng tốc. Tính bền quan trọng hơn cảm giác hưng phấn đầu kỳ.",
        },
      ],
    },
    too_ambitious: {
      statusLabel: "Cần thu nhỏ trước khi tăng tốc",
      statusHint:
        "Mục tiêu này đang hơi nặng so với nền hiện tại. Thu nhỏ đúng cách sẽ giúp bạn giữ được động lực và xác suất hoàn thành cao hơn.",
      guideTitle: "Đừng hạ tham vọng, hãy hạ độ nặng của bước đầu.",
      guideBody:
        "Bạn chưa cần từ bỏ mục tiêu lớn. Điều nên làm là biến nó thành một bước đệm vừa tầm hơn, để 12 tuần tới là một chu kỳ thắng được chứ không phải một lời hứa áp lực.",
      highlights: [
        {
          title: "Thu nhỏ kết quả đầu tiên",
          description: "Chọn một phiên bản gần hơn và dễ thắng hơn để làm cột mốc khởi động.",
          icon: <AlertTriangle className="h-4 w-4" />,
        },
        {
          title: "Kéo giãn thời hạn nếu cần",
          description: "Không phải mục tiêu sai, chỉ là thời điểm hoặc tốc độ hiện tại có thể chưa phù hợp.",
          icon: <Gauge className="h-4 w-4" />,
        },
        {
          title: "Dựng mục tiêu bước đệm",
          description: "Một chu kỳ 12 tuần nhỏ nhưng hoàn thành được sẽ tốt hơn một kế hoạch quá tải rồi bỏ dở.",
          icon: <ShieldCheck className="h-4 w-4" />,
        },
      ],
      nextMoves: [
        "Quay lại bước viết mục tiêu nếu cần và giảm độ rộng hoặc áp lực thời gian của mục tiêu hiện tại.",
        "Chọn một bước đệm gần hơn để chu kỳ 12 tuần đầu tiên có khả năng thắng cao hơn.",
        "Sau khi nhịp hành động ổn định, bạn có thể tăng độ khó ở chu kỳ kế tiếp.",
      ],
      weeklyRhythm: [
        {
          label: "Ngay sau kết quả",
          detail: "Xác định phiên bản mục tiêu nhỏ hơn nhưng vẫn đủ ý nghĩa để bạn muốn theo đuổi.",
        },
        {
          label: "Tuần 1",
          detail: "Thiết kế kế hoạch cực gọn để tạo sự ổn định, không tạo thêm áp lực chứng minh bản thân.",
        },
        {
          label: "Sau chu kỳ đầu",
          detail: "Khi đã giữ nhịp tốt, dùng dữ liệu thực để quyết định tăng tốc ở vòng tiếp theo.",
        },
      ],
    },
  };

  const styles = styleMap[result.type];
  const copy = resultCopy[result.type];
  const fitScore = Math.max(0, Math.min(100, Math.round((result.adjustedScore / 20) * 100)));
  const readinessPercent = Math.max(0, Math.min(100, Math.round((result.readinessScore / 20) * 100)));
  const planLoadLabel: Record<PlanLoadRecommendation, string> = {
    lighter: "Nhẹ hơn",
    balanced: "Cân bằng",
    push: "Đẩy nhẹ",
  };
  const capacityLabel: Record<WeeklyCapacity, string> = {
    low: "Ít thời gian",
    medium: "Vừa đủ",
    high: "Khá rộng",
  };

  const scoreCards = [
    {
      label: "Mức phù hợp hiện tại",
      value: `${fitScore}%`,
      note: "Điểm đã tính cả 7 góc nhìn và nền hiện tại của lĩnh vực này.",
      progress: fitScore,
    },
    {
      label: "Phần cần chú ý nhất",
      value: result.bottleneck.label,
      note: result.bottleneck.action,
      progress:
        result.bottleneck.axis === "wheel"
          ? Math.max(0, Math.min(100, result.wheelScore * 10))
          : Math.max(0, Math.min(100, Math.round((result.bottleneck.score / 4) * 100))),
    },
    {
      label: "Mức sẵn sàng tổng",
      value: `${result.readinessScore}/20`,
      note: `${result.diagnosticScore}/${result.maxDiagnosticScore} điểm đánh giá trước khi tính nền lĩnh vực.`,
      progress: readinessPercent,
    },
  ];

  return (
    <div className="app-shell min-h-screen px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pb-6 sm:pt-6 lg:px-8">
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.5 }}
        className="mx-auto w-full max-w-6xl space-y-4 sm:space-y-6"
      >
        <CoreFlowProgress currentStepId="feasibility" />

        <Card className="hero-surface overflow-hidden border-0 text-white">
          <CardContent className="relative p-4 sm:p-6 lg:p-9">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.12),_transparent_24%),linear-gradient(135deg,_rgba(255,255,255,0.08)_0%,_rgba(255,255,255,0)_58%)] opacity-95" />
            <div
              className={`absolute -right-12 top-10 hidden h-72 w-72 rounded-full blur-3xl sm:block ${styles.glow}`}
            />
            <div className="absolute -left-16 bottom-0 hidden h-56 w-56 rounded-full bg-white/8 blur-3xl sm:block" />

            <div className="relative max-w-4xl">
              <div className="space-y-4 sm:space-y-6">
                <div className="flex flex-wrap gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-1.5 text-sm text-white/82">
                    <ShieldCheck className="h-4 w-4" />
                    Kết quả kiểm tra
                  </div>
                  <Badge variant="outline" className="rounded-full border-white/18 bg-white/10 px-4 py-1.5 text-white">
                    <Target className="mr-1 h-3.5 w-3.5" />
                    {getLifeAreaLabel(focusArea)}
                  </Badge>
                </div>

                <div className="space-y-4">
                  <div className={`inline-flex rounded-full border px-4 py-2 text-sm font-semibold ${styles.badge}`}>
                    {copy.statusLabel}
                  </div>
                  <h1 className="max-w-3xl text-2xl font-bold tracking-normal sm:text-4xl lg:text-5xl">
                    {result.title}
                  </h1>
                  <p className="max-w-3xl text-sm leading-7 text-white/84 sm:text-base lg:text-lg">{result.summary}</p>
                </div>

                <div className="rounded-2xl border border-white/14 bg-white/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl sm:hidden">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/58">
                        Mức phù hợp hiện tại
                      </p>
                      <p className="mt-2 text-3xl font-bold text-white">{fitScore}%</p>
                    </div>
                    <div className="rounded-full border border-white/18 bg-white/12 px-3 py-1.5 text-sm font-semibold text-white">
                      {result.wheelScore}/10
                    </div>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/12">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${styles.meter}`}
                      style={{ width: `${fitScore}%` }}
                    />
                  </div>
                  <div className="mt-3 grid gap-2 text-sm leading-6 text-white/74">
                    <p>
                      <span className="font-semibold text-white">Cần chú ý:</span> {result.bottleneck.label}
                    </p>
                    <p>
                      <span className="font-semibold text-white">Độ nặng gợi ý:</span> {planLoadLabel[result.planLoad]}{" "}
                      · {capacityLabel[result.weeklyCapacity]}
                    </p>
                    <p>{result.firstWeekGuidance}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:max-w-xl sm:flex-row">
                  <Button className="bg-white text-slate-950 hover:bg-white/90" onClick={onContinue}>
                    {result.type === "too_ambitious" ? "Tạo kế hoạch 12 tuần nhỏ hơn" : "Tạo kế hoạch 12 tuần"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="border-white/24 bg-white/10 text-white hover:bg-white/16 hover:text-white"
                    onClick={onAdjustGoal}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Sửa mục tiêu
                  </Button>
                </div>

                <div className="hidden gap-4 sm:grid md:grid-cols-3">
                  {scoreCards.map((card) => (
                    <div
                      key={card.label}
                      className="rounded-2xl border border-white/14 bg-white/10 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/58">{card.label}</p>
                      <p
                        className={`mt-3 font-bold text-white ${
                          card.label === "Phần cần chú ý nhất" ? "text-xl leading-7" : "text-3xl"
                        }`}
                      >
                        {card.value}
                      </p>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/12">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${styles.meter}`}
                          style={{ width: `${card.progress}%` }}
                        />
                      </div>
                      <p className="mt-3 text-sm leading-6 text-white/68">{card.note}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className={`overflow-hidden ${styles.panel}`}>
            <CardContent className="space-y-5 p-5 lg:p-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/82 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                  <Compass className="h-3.5 w-3.5" />
                  Hướng đi tiếp theo
                </div>
                <h2 className="mt-4 text-xl font-bold tracking-normal text-slate-900 sm:text-2xl">
                  {result.type === "too_ambitious" ? "Thu nhỏ rồi đi tiếp." : "Đây là hướng nên đi tiếp."}
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{copy.statusHint}</p>
                <p className="mt-3 text-base font-semibold leading-7 text-slate-900">{result.recommendation}</p>

                {result.smartGoalQualityNote ? (
                  <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3">
                    <p className="text-sm leading-6 text-amber-800">{result.smartGoalQualityNote}</p>
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white/82 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Tuần 1 nên thế nào
                      </p>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                        Độ nặng: {planLoadLabel[result.planLoad]}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                        Quỹ thời gian: {capacityLabel[result.weeklyCapacity]}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">{result.firstWeekGuidance}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-white/82 p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-slate-700" />
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Nên làm trước khi tạo kế hoạch
                  </p>
                </div>
                <ol className="mt-3 space-y-2.5">
                  {copy.nextMoves.map((item, index) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                        {index + 1}
                      </span>
                      <p className="text-sm leading-6 text-slate-700">{item}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3 lg:gap-5">
            <Card className={`hidden overflow-hidden lg:block ${styles.title}`}>
              <CardContent className="p-5 lg:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Lĩnh vực trọng tâm</p>
                <p className="mt-3 text-2xl font-bold text-slate-900">{getLifeAreaLabel(focusArea)}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Đây là phần đời sống đang tác động trực tiếp tới độ khả thi của mục tiêu này.
                </p>
              </CardContent>
            </Card>

            <details className="rounded-2xl border border-white/70 bg-white/82 p-4 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.2)] lg:rounded-[28px] lg:p-6">
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
                Xem 7 góc nhìn
              </summary>
              <div className="mt-4 space-y-3">
                {result.axisScores.map((axis) => (
                  <div key={axis.axis} className="rounded-[20px] border border-slate-200 bg-slate-50/80 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">{axis.label}</p>
                      <span className="text-sm font-semibold text-slate-600">
                        {axis.score}/{axis.maxScore}
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${styles.meter}`}
                        style={{ width: `${axis.percent}%` }}
                      />
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{axis.diagnostic}</p>
                  </div>
                ))}
              </div>
            </details>

            <details className="rounded-2xl border border-white/70 bg-white/82 p-4 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.2)] lg:rounded-[28px] lg:p-6">
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
                Xem mục tiêu đã viết
              </summary>
              <div className="mt-4 space-y-4">
                <p className="text-base font-semibold leading-7 text-slate-900">{pendingGoal.specific}</p>
                <div className="space-y-3 text-sm leading-6 text-slate-600">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Thời hạn</p>
                    <p className="mt-1">{pendingGoal.timeBound}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Dấu hiệu hoàn thành
                    </p>
                    <p className="mt-1">{pendingGoal.measurable}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Lý do theo đuổi</p>
                    <p className="mt-1">{pendingGoal.relevant}</p>
                  </div>
                </div>
              </div>
            </details>

            <details className="rounded-2xl border border-white/70 bg-white/82 p-4 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.2)] lg:rounded-[28px] lg:p-6">
              <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
                Xem nhịp triển khai gợi ý
              </summary>
              <div className="mt-4 space-y-4">
                {copy.weeklyRhythm.map((item, index) => (
                  <div key={item.label} className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border border-violet-200 bg-violet-50 text-xs font-semibold text-violet-700">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </div>

          <details className="rounded-2xl border border-white/70 bg-white/82 p-4 shadow-[0_20px_50px_-38px_rgba(15,23,42,0.2)] lg:rounded-[28px] lg:p-6">
            <summary className="cursor-pointer list-none text-sm font-semibold text-slate-900">
              Xem lý do đằng sau kết quả
            </summary>
            <div className="mt-4 space-y-4">
              <h2 className="text-xl font-bold tracking-normal text-slate-900">{copy.guideTitle}</h2>
              <p className="text-sm leading-7 text-slate-600">{copy.guideBody}</p>
              <div className="rounded-[20px] border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Nguyên tắc lập kế hoạch
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">{result.scopeRecommendation}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{result.bottleneck.action}</p>
              </div>
            </div>
          </details>
        </div>
      </motion.div>

      {/* Mobile-only sticky bottom CTA bar — guided path, no bottom-nav conflict.
          Buttons use aria-hidden so screen readers + RTL queries reach the canonical
          in-hero buttons; visual users still see this sticky bar on small viewports. */}
      <div
        aria-hidden="true"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 shadow-[0_-12px_32px_-20px_rgba(15,23,42,0.18)] backdrop-blur-md sm:hidden"
      >
        <div className="flex gap-2">
          <Button
            tabIndex={-1}
            variant="outline"
            className="flex-1 bg-white"
            onClick={onAdjustGoal}
          >
            <ArrowLeft className="h-4 w-4" />
            Sửa
          </Button>
          <Button tabIndex={-1} className="flex-[2]" size="lg" onClick={onContinue}>
            {result.type === "too_ambitious" ? "Tạo kế hoạch nhỏ hơn" : "Tạo kế hoạch 12 tuần"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
