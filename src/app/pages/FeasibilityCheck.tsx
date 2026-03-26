import { ReactNode, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
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
import { toast } from "sonner";

import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Progress } from "../components/ui/progress";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { APP_STORAGE_KEYS, getLifeAreaLabel, getUserData } from "../utils/storage";

interface Question {
  id: number;
  question: string;
  options: { value: string; label: string; score: number }[];
}

interface PendingSMARTGoal {
  focusArea: string;
  specific: string;
  measurable: string;
  achievable: string;
  relevant: string;
  timeBound: string;
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    question: "Mỗi tuần bạn có thể dành chính xác bao nhiêu thời gian cho mục tiêu này?",
    options: [
      { value: "lt1", label: "Dưới 1 giờ mỗi tuần", score: 1 },
      { value: "1to3", label: "1-3 giờ mỗi tuần", score: 2 },
      { value: "3to5", label: "3-5 giờ mỗi tuần", score: 3 },
      { value: "gt5", label: "Hơn 5 giờ mỗi tuần", score: 4 },
    ],
  },
  {
    id: 2,
    question: "Mục tiêu này cảm thấy thực tế đến mức nào với bạn hiện tại?",
    options: [
      { value: "overwhelming", label: "Cảm giác quá lớn và quá sức", score: 1 },
      { value: "challenging", label: "Khó nhưng vẫn có thể chạm tới", score: 2 },
      { value: "realistic", label: "Thực tế nếu tôi giữ kỷ luật", score: 3 },
      { value: "very_realistic", label: "Rất thực tế và hoàn toàn có thể làm", score: 4 },
    ],
  },
  {
    id: 3,
    question: "Trở ngại lớn nhất có thể ngăn bạn hoàn thành mục tiêu này là gì?",
    options: [
      { value: "motivation", label: "Thiếu động lực hoặc dễ mất đà", score: 1 },
      { value: "time", label: "Khó quản lý thời gian", score: 2 },
      { value: "resources", label: "Thiếu nguồn lực hoặc kiến thức", score: 2 },
      { value: "none", label: "Hiện chưa thấy trở ngại lớn nào", score: 4 },
    ],
  },
  {
    id: 4,
    question: "Bạn thường duy trì những thói quen phát triển bản thân ổn định đến mức nào?",
    options: [
      { value: "rarely", label: "Hiếm khi theo đến cùng", score: 1 },
      { value: "sometimes", label: "Có cố gắng nhưng hay mất nhịp", score: 2 },
      { value: "mostly", label: "Khá kiên trì, đôi lúc chệch nhịp", score: 3 },
      { value: "always", label: "Rất kỷ luật và duy trì tốt", score: 4 },
    ],
  },
  {
    id: 5,
    question: "Bạn cam kết biến mục tiêu này thành hiện thực đến mức nào?",
    options: [
      { value: "exploring", label: "Mới chỉ đang cân nhắc", score: 1 },
      { value: "interested", label: "Quan tâm nhưng chưa cấp bách", score: 2 },
      { value: "ready", label: "Sẵn sàng bắt đầu sớm", score: 3 },
      { value: "committed", label: "Cam kết hoàn toàn và bắt đầu ngay", score: 4 },
    ],
  },
];

type ResultType = "realistic" | "challenging" | "too_ambitious";

interface ResultData {
  type: ResultType;
  title: string;
  summary: string;
  recommendation: string;
  readinessScore: number;
  adjustedScore: number;
  wheelScore: number;
}

interface PendingFeasibilityResult {
  resultType: ResultType;
  resultTitle: string;
  resultSummary: string;
  recommendation: string;
  readinessScore: number;
  adjustedScore: number;
  wheelScore: number;
}

function getWheelPenalty(score: number): number {
  if (score <= 3) return 3;
  if (score <= 5) return 2;
  if (score <= 7) return 1;
  return 0;
}

function buildResult(readinessScore: number, wheelScore: number): ResultData {
  const wheelPenalty = getWheelPenalty(wheelScore);
  const adjustedScore = readinessScore - wheelPenalty;

  if (adjustedScore >= 15) {
    return {
      type: "realistic",
      title: "Mục tiêu này khá phù hợp với bạn ở thời điểm hiện tại.",
      summary:
        "Độ sẵn sàng của bạn và bối cảnh cuộc sống hiện tại đang cho thấy đây là một mục tiêu đủ thực tế để bắt đầu.",
      recommendation:
        "Bạn có thể tiến tới bước thiết kế hệ 12 tuần và giữ nhịp đều ngay từ đầu.",
      readinessScore,
      adjustedScore,
      wheelScore,
    };
  }

  if (adjustedScore >= 10) {
    return {
      type: "challenging",
      title: "Mục tiêu này có tính thách thức cao nhưng vẫn khả thi.",
      summary:
        "Bạn có thể đạt được mục tiêu này nếu chia nhỏ đủ tốt và giữ được sự nhất quán trong 12 tuần tới.",
      recommendation:
        "Nên tập trung vào một số hành động dẫn dắt cốt lõi và review hằng tuần thật nghiêm túc.",
      readinessScore,
      adjustedScore,
      wheelScore,
    };
  }

  return {
    type: "too_ambitious",
    title: "Mục tiêu này có thể đang hơi quá sức vào thời điểm hiện tại.",
    summary:
      "Dựa trên độ sẵn sàng và điểm bánh xe cuộc sống của bạn, mục tiêu này có rủi ro cao nếu bắt đầu với quy mô như hiện tại.",
    recommendation:
      "Hãy thu nhỏ phạm vi, kéo dài thời hạn hoặc chọn một bước đệm gần hơn trước khi tăng tốc.",
    readinessScore,
    adjustedScore,
    wheelScore,
  };
}

function isPendingSMARTGoal(value: unknown): value is PendingSMARTGoal {
  if (!value || typeof value !== "object") return false;
  const draft = value as Record<string, unknown>;

  return (
    typeof draft.focusArea === "string" &&
    typeof draft.specific === "string" &&
    typeof draft.measurable === "string" &&
    typeof draft.achievable === "string" &&
    typeof draft.relevant === "string" &&
    typeof draft.timeBound === "string"
  );
}

interface FeasibilityResultViewProps {
  result: ResultData;
  focusArea: string;
  pendingGoal: PendingSMARTGoal;
  onContinue: () => void;
  onAdjustGoal: () => void;
}

function FeasibilityResultView({
  result,
  focusArea,
  pendingGoal,
  onContinue,
  onAdjustGoal,
}: FeasibilityResultViewProps) {
  const iconMap: Record<ResultType, ReactNode> = {
    realistic: <CheckCircle2 className="h-10 w-10 text-white" />,
    challenging: <TrendingUp className="h-10 w-10 text-white" />,
    too_ambitious: <AlertTriangle className="h-10 w-10 text-white" />,
  };

  const styleMap: Record<
    ResultType,
    { glow: string; badge: string; title: string; panel: string; meter: string }
  > = {
    realistic: {
      glow: "bg-gradient-to-br from-emerald-400/24 via-cyan-300/14 to-transparent",
      badge: "border-emerald-200 bg-emerald-50 text-emerald-800",
      title: "border-emerald-200/70 bg-[linear-gradient(135deg,_rgba(236,253,245,0.92)_0%,_rgba(240,253,250,0.88)_100%)]",
      panel: "border-emerald-100/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(236,253,245,0.88)_100%)]",
      meter: "from-emerald-400 via-teal-400 to-cyan-400",
    },
    challenging: {
      glow: "bg-gradient-to-br from-amber-400/24 via-orange-300/14 to-transparent",
      badge: "border-amber-200 bg-amber-50 text-amber-800",
      title: "border-amber-200/70 bg-[linear-gradient(135deg,_rgba(255,251,235,0.94)_0%,_rgba(255,247,237,0.9)_100%)]",
      panel: "border-amber-100/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(255,251,235,0.88)_100%)]",
      meter: "from-amber-400 via-orange-400 to-rose-400",
    },
    too_ambitious: {
      glow: "bg-gradient-to-br from-rose-400/24 via-orange-300/14 to-transparent",
      badge: "border-rose-200 bg-rose-50 text-rose-800",
      title: "border-rose-200/70 bg-[linear-gradient(135deg,_rgba(255,241,242,0.94)_0%,_rgba(255,247,237,0.9)_100%)]",
      panel: "border-rose-100/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(255,241,242,0.88)_100%)]",
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
          description: "Chọn 2-4 lead action cốt lõi, lặp lại mỗi tuần thay vì nhồi quá nhiều việc ngay lúc đầu.",
          icon: <Sparkles className="h-4 w-4" />,
        },
        {
          title: "Khóa lịch review ngay",
          description: "Một khung review cố định sẽ giúp bạn không lệch nhịp khi tuần bắt đầu bận hơn.",
          icon: <ShieldCheck className="h-4 w-4" />,
        },
        {
          title: "Ưu tiên cảm giác thắng sớm",
          description: "Tuần đầu nên đủ nhẹ để bạn hoàn thành tốt và tạo đà cho cả chu kỳ.",
          icon: <Target className="h-4 w-4" />,
        },
      ],
      nextMoves: [
        "Chuyển mục tiêu này thành hệ 12 tuần với 2-4 lead action thật rõ.",
        "Thiết kế tuần đầu thiên về nhịp độ, không phải khối lượng quá lớn.",
        "Giữ một buổi review hàng tuần để điều chỉnh trước khi bị trễ nhịp.",
      ],
      weeklyRhythm: [
        {
          label: "Ngay sau kết quả",
          detail: "Chốt outcome 12 tuần và các hành động dẫn dắt bạn sẽ lặp lại hằng tuần.",
        },
        {
          label: "Tuần 1",
          detail: "Giữ kế hoạch gọn để tạo cảm giác thắng sớm và củng cố niềm tin hành động.",
        },
        {
          label: "Từ tuần 2 trở đi",
          detail: "Duy trì review, chỉ tăng tải khi bạn đang giữ nhịp ổn định thật sự.",
        },
      ],
    },
    challenging: {
      statusLabel: "Khó nhưng vẫn làm được",
      statusHint: "Bạn có thể đạt mục tiêu này nếu giảm độ rộng, tăng độ rõ và giữ review tuần thật nghiêm túc.",
      guideTitle: "Tập trung hơn một chút, bạn sẽ đi được xa hơn.",
      guideBody:
        "Đây là kiểu mục tiêu có sức bật, nhưng không phù hợp nếu triển khai quá rộng. Hãy đổi nó thành một hệ có trục chính rõ và bớt các phần gây nhiễu.",
      highlights: [
        {
          title: "Thu hẹp phạm vi 12 tuần đầu",
          description: "Chỉ giữ phần outcome quan trọng nhất thay vì cố ôm toàn bộ bức tranh ngay lúc này.",
          icon: <Target className="h-4 w-4" />,
        },
        {
          title: "Ưu tiên hành động dẫn dắt",
          description: "Tập trung vào vài việc có thể đo được, thay vì một danh sách dài nhưng mờ hiệu quả.",
          icon: <Gauge className="h-4 w-4" />,
        },
        {
          title: "Dùng review để cắt nhiễu",
          description: "Mỗi tuần nên bỏ bớt những việc không còn phục vụ outcome chính.",
          icon: <Compass className="h-4 w-4" />,
        },
      ],
      nextMoves: [
        "Giữ mục tiêu chính nhưng thu gọn nó về một outcome duy nhất cho 12 tuần đầu.",
        "Chỉ chọn các lead action thật sự đo được và có thể lặp lại mỗi tuần.",
        "Đặt review tuần như một cơ chế kiểm soát tải, không để kế hoạch phình dần.",
      ],
      weeklyRhythm: [
        {
          label: "Ngay sau kết quả",
          detail: "Chốt một outcome đủ sắc và bỏ bớt các mục tiêu phụ không cần thiết cho chu kỳ này.",
        },
        {
          label: "Tuần 1-2",
          detail: "Kiểm chứng xem nhịp hành động hiện tại có thực sự vừa với lịch sống của bạn hay chưa.",
        },
        {
          label: "Sau mỗi review",
          detail: "Nếu đang đuối, giảm tải trước khi tăng tốc. Tính bền quan trọng hơn cảm giác hưng phấn đầu kỳ.",
        },
      ],
    },
    too_ambitious: {
      statusLabel: "Cần thu nhỏ trước khi tăng tốc",
      statusHint: "Mục tiêu này đang hơi nặng so với nền hiện tại. Thu nhỏ đúng cách sẽ giúp bạn giữ được động lực và xác suất hoàn thành cao hơn.",
      guideTitle: "Đừng hạ tham vọng, hãy hạ độ nặng của bước đầu.",
      guideBody:
        "Bạn chưa cần từ bỏ mục tiêu lớn. Điều nên làm là biến nó thành một bước đệm vừa tầm hơn, để 12 tuần tới là một chu kỳ thắng được chứ không phải một lời hứa áp lực.",
      highlights: [
        {
          title: "Thu nhỏ outcome đầu tiên",
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
        "Quay lại SMART nếu cần và giảm độ rộng hoặc áp lực thời gian của mục tiêu hiện tại.",
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
  const wheelPercent = Math.max(0, Math.min(100, Math.round((result.wheelScore / 10) * 100)));
  const readinessPercent = Math.max(0, Math.min(100, Math.round((result.readinessScore / 20) * 100)));

  const scoreCards = [
    {
      label: "Độ phù hợp hiện tại",
      value: `${fitScore}%`,
      note: "Điểm tổng hợp từ mức sẵn sàng và bối cảnh cuộc sống hiện tại.",
      progress: fitScore,
    },
    {
      label: "Điểm bánh xe cuộc sống",
      value: `${result.wheelScore}/10`,
      note: "Mức nền hiện tại của lĩnh vực bạn đang chọn làm trọng tâm.",
      progress: wheelPercent,
    },
    {
      label: "Độ sẵn sàng hành động",
      value: `${result.readinessScore}/20`,
      note: "Mức cam kết, khả năng duy trì và độ sẵn sàng để giữ nhịp.",
      progress: readinessPercent,
    },
  ];

  return (
    <div className="app-shell min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto w-full max-w-6xl space-y-6"
      >
        <Card className="hero-surface overflow-hidden border-0 text-white">
          <CardContent className="relative p-8 lg:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.12),_transparent_24%),linear-gradient(135deg,_rgba(255,255,255,0.08)_0%,_rgba(255,255,255,0)_58%)] opacity-95" />
            <div className={`absolute -right-12 top-10 h-72 w-72 rounded-full blur-3xl ${styles.glow}`} />
            <div className="absolute -left-16 bottom-0 h-56 w-56 rounded-full bg-white/8 blur-3xl" />

            <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.1fr)_360px]">
              <div className="space-y-6">
                <div className="flex flex-wrap gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-1.5 text-sm text-white/82">
                    <ShieldCheck className="h-4 w-4" />
                    Feasibility Result
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
                  <h1 className="max-w-3xl text-4xl font-bold tracking-[-0.05em] lg:text-5xl">
                    {result.title}
                  </h1>
                  <p className="max-w-3xl text-base leading-8 text-white/84 lg:text-lg">{result.summary}</p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {scoreCards.map((card) => (
                    <div
                      key={card.label}
                      className="rounded-[28px] border border-white/14 bg-white/10 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/58">
                        {card.label}
                      </p>
                      <p className="mt-3 text-3xl font-bold text-white">{card.value}</p>
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

              <div className="rounded-[34px] border border-white/14 bg-white/12 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/58">
                      Mức độ phù hợp
                    </p>
                    <p className="mt-2 text-4xl font-bold text-white">{fitScore}%</p>
                    <p className="mt-2 text-sm leading-7 text-white/72">{copy.statusHint}</p>
                  </div>
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-[24px] border border-white/16 bg-white/12">
                    <div className={`absolute inset-2 rounded-[18px] blur-2xl ${styles.glow}`} />
                    <div className="relative">{iconMap[result.type]}</div>
                  </div>
                </div>

                <div className="mt-6 rounded-[28px] border border-white/12 bg-black/10 p-5">
                  <div className="space-y-4">
                    {[
                      { label: "Điểm phù hợp", value: `${fitScore}%`, progress: fitScore },
                      { label: "Nền hiện tại", value: `${result.wheelScore}/10`, progress: wheelPercent },
                      { label: "Sẵn sàng hành động", value: `${result.readinessScore}/20`, progress: readinessPercent },
                    ].map((row) => (
                      <div key={row.label} className="space-y-2">
                        <div className="flex items-center justify-between text-sm text-white/74">
                          <span>{row.label}</span>
                          <span className="font-semibold text-white">{row.value}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-white/10">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${styles.meter}`}
                            style={{ width: `${row.progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 rounded-[24px] border border-white/12 bg-white/8 p-4 text-sm leading-7 text-white/74">
                  {result.recommendation}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <Card className="overflow-hidden border-white/70 bg-white/82">
              <CardContent className="p-6 lg:p-7">
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)]">
                  <div className="space-y-5">
                    <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">
                      <Sparkles className="h-3.5 w-3.5" />
                      Điều kết quả này đang nói với bạn
                    </div>
                    <div className="space-y-3">
                      <h2 className="text-2xl font-bold tracking-[-0.04em] text-slate-900 lg:text-[2rem]">
                        {copy.guideTitle}
                      </h2>
                      <p className="text-base leading-8 text-slate-600">{copy.guideBody}</p>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-3">
                      {copy.highlights.map((highlight) => (
                        <div
                          key={highlight.title}
                          className="rounded-[24px] border border-white/80 bg-white/82 p-4 shadow-[0_20px_50px_-34px_rgba(15,23,42,0.22)]"
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,_rgba(109,40,217,0.12)_0%,_rgba(59,130,246,0.14)_100%)] text-violet-700">
                            {highlight.icon}
                          </div>
                          <p className="mt-4 text-base font-semibold text-slate-900">{highlight.title}</p>
                          <p className="mt-2 text-sm leading-6 text-slate-600">{highlight.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={`rounded-[30px] border p-5 shadow-[0_26px_70px_-42px_rgba(15,23,42,0.28)] ${styles.title}`}>
                    <div className="flex items-center gap-2 text-slate-700">
                      <Target className="h-4 w-4" />
                      <p className="text-xs font-semibold uppercase tracking-[0.18em]">Bản chụp mục tiêu hiện tại</p>
                    </div>

                    <p className="mt-4 text-xl font-semibold leading-9 text-slate-900">{pendingGoal.specific}</p>

                    <div className="mt-5 space-y-3">
                      <div className="rounded-[22px] border border-white/80 bg-white/76 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Thời hạn</p>
                        <p className="mt-2 text-sm font-medium leading-6 text-slate-700">{pendingGoal.timeBound}</p>
                      </div>
                      <div className="rounded-[22px] border border-white/80 bg-white/76 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Dấu hiệu hoàn thành</p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">{pendingGoal.measurable}</p>
                      </div>
                      <div className="rounded-[22px] border border-white/80 bg-white/76 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Lý do mục tiêu này đáng theo đuổi</p>
                        <p className="mt-2 text-sm leading-6 text-slate-700">{pendingGoal.relevant}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-3">
              <Card className={`overflow-hidden ${styles.title}`}>
                <CardContent className="p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Lĩnh vực trọng tâm
                  </p>
                  <p className="mt-3 text-2xl font-bold text-slate-900">{getLifeAreaLabel(focusArea)}</p>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Đây là phần đời sống đang tác động trực tiếp tới độ khả thi của mục tiêu này.
                  </p>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-white/70 bg-white/82">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-slate-700">
                    <Gauge className="h-4 w-4 text-violet-600" />
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Khuyến nghị chính
                    </p>
                  </div>
                  <p className="mt-3 text-lg font-semibold leading-8 text-slate-900">{result.recommendation}</p>
                </CardContent>
              </Card>

              <Card className="overflow-hidden border-white/70 bg-white/82">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 text-slate-700">
                    <TrendingUp className="h-4 w-4 text-violet-600" />
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Tâm thế nên giữ
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    Kế hoạch tốt là kế hoạch bạn có thể giữ nhịp. Mục tiêu lớn vẫn có thể đạt được, miễn là bước đầu được thiết kế đúng tải.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="space-y-6">
            <Card className={`overflow-hidden ${styles.panel}`}>
              <CardContent className="p-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/82 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
                  <Compass className="h-3.5 w-3.5" />
                  Hướng đi tiếp theo
                </div>

                <h2 className="mt-4 text-2xl font-bold tracking-[-0.04em] text-slate-900">
                  {result.type === "too_ambitious" ? "Thu nhỏ rồi đi tiếp." : "Đây là hướng nên đi tiếp."}
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{copy.statusHint}</p>

                <div className="mt-6 space-y-3">
                  {copy.nextMoves.map((item, index) => (
                    <div
                      key={item}
                      className="flex gap-3 rounded-[24px] border border-white/80 bg-white/84 p-4 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.22)]"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,_rgba(109,40,217,0.14)_0%,_rgba(59,130,246,0.16)_100%)] text-sm font-semibold text-violet-700">
                        {index + 1}
                      </div>
                      <p className="text-sm leading-7 text-slate-600">{item}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex flex-col gap-3">
                  <Button onClick={onContinue}>
                    {result.type === "too_ambitious" ? "Dựng hệ 12 tuần nhỏ hơn" : "Dựng hệ 12 tuần"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={onAdjustGoal}>
                    <ArrowLeft className="h-4 w-4" />
                    Điều chỉnh mục tiêu SMART
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-white/70 bg-white/82">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-slate-700">
                  <ShieldCheck className="h-4 w-4 text-violet-600" />
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Nhịp triển khai gợi ý
                  </p>
                </div>

                <div className="mt-5 space-y-4">
                  {copy.weeklyRhythm.map((item, index) => (
                    <div key={item.label} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-200 bg-violet-50 text-sm font-semibold text-violet-700">
                          0{index + 1}
                        </div>
                        {index < copy.weeklyRhythm.length - 1 ? (
                          <div className="mt-2 h-full w-px bg-[linear-gradient(180deg,_rgba(109,40,217,0.35)_0%,_rgba(109,40,217,0)_100%)]" />
                        ) : null}
                      </div>

                      <div className="rounded-[24px] border border-white/70 bg-white/78 p-4">
                        <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                        <p className="mt-2 text-sm leading-7 text-slate-600">{item.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function FeasibilityCheck() {
  const navigate = useNavigate();
  const hasGuardedRef = useRef(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [focusArea, setFocusArea] = useState<string>("");
  const [wheelScore, setWheelScore] = useState<number | null>(null);
  const [pendingGoal, setPendingGoal] = useState<PendingSMARTGoal | null>(null);
  const [result, setResult] = useState<ResultData | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    if (hasGuardedRef.current) return;
    hasGuardedRef.current = true;

    const storedFocusArea = localStorage.getItem(APP_STORAGE_KEYS.selectedFocusArea);
    const draft = localStorage.getItem(APP_STORAGE_KEYS.pendingSmartGoal);

    if (!storedFocusArea || !draft) {
      toast.info("Vui lòng hoàn thành mục tiêu SMART của bạn trước.");
      navigate("/smart-goal-setup");
      return;
    }

    let parsedDraft: unknown;
    try {
      parsedDraft = JSON.parse(draft);
    } catch {
      toast.info("Bản nháp mục tiêu SMART của bạn không hợp lệ. Vui lòng kiểm tra lại.");
      navigate("/smart-goal-setup");
      return;
    }

    if (!isPendingSMARTGoal(parsedDraft)) {
      toast.info("Bản nháp mục tiêu SMART của bạn chưa hoàn chỉnh. Vui lòng hoàn thành nó.");
      navigate("/smart-goal-setup");
      return;
    }

    const data = getUserData();
    const areaData = data.currentWheelOfLife.find((area) => area.name === storedFocusArea);

    if (!areaData) {
      toast.info("Vui lòng hoàn thành phần góc nhìn cuộc sống trước.");
      navigate("/life-insight");
      return;
    }

    setFocusArea(storedFocusArea);
    setWheelScore(areaData.score);
    setPendingGoal({
      ...parsedDraft,
      focusArea: parsedDraft.focusArea || storedFocusArea,
    });
    setIsInitializing(false);
  }, [navigate]);

  if (isInitializing || !pendingGoal || wheelScore === null) {
    return null;
  }

  const currentQuestion = QUESTIONS[currentStep];
  const totalSteps = QUESTIONS.length;
  const progressPercentage = ((currentStep + 1) / totalSteps) * 100;
  const selectedAnswer = answers[currentQuestion.id];

  const handleAnswerChange = (value: string) => {
    setAnswers({ ...answers, [currentQuestion.id]: value });
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      return;
    }

    navigate("/smart-goal-setup");
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
      return;
    }

    const readinessScore = QUESTIONS.reduce((sum, question) => {
      const answer = answers[question.id];
      const option = question.options.find((choice) => choice.value === answer);
      return sum + (option?.score || 0);
    }, 0);

    setResult(buildResult(readinessScore, wheelScore));
  };

  const handleContinueToPlan = () => {
    if (!result) return;

    const pendingFeasibilityResult: PendingFeasibilityResult = {
      resultType: result.type,
      resultTitle: result.title,
      resultSummary: result.summary,
      recommendation: result.recommendation,
      readinessScore: result.readinessScore,
      adjustedScore: result.adjustedScore,
      wheelScore: result.wheelScore,
    };

    localStorage.setItem(APP_STORAGE_KEYS.pendingFeasibilityResult, JSON.stringify(pendingFeasibilityResult));
    localStorage.setItem(APP_STORAGE_KEYS.pendingFeasibilityAnswers, JSON.stringify(answers));

    toast.success("Đã kiểm tra tính khả thi", {
      description: "Tiếp tục thiết kế hệ 12 tuần cho mục tiêu của bạn.",
    });

    navigate("/12-week-setup");
  };

  const handleAdjustGoal = () => {
    navigate("/smart-goal-setup");
  };

  if (result) {
    return (
      <FeasibilityResultView
        result={result}
        focusArea={focusArea}
        pendingGoal={pendingGoal}
        onContinue={handleContinueToPlan}
        onAdjustGoal={handleAdjustGoal}
      />
    );
  }

  return (
    <div className="app-shell min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mx-auto w-full max-w-7xl space-y-6"
      >
        <Card className="hero-surface overflow-hidden border-0 text-white">
          <CardContent className="relative p-8 lg:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.12),_transparent_24%)] opacity-90" />

            <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_360px]">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-1.5 text-sm text-white/82">
                  <Compass className="h-4 w-4" />
                  Feasibility Assessment
                </div>

                <div className="space-y-4">
                  <h1 className="max-w-3xl text-4xl font-bold tracking-[-0.05em] lg:text-5xl">
                    Kiểm tra xem mục tiêu này có thực tế với bạn ở thời điểm hiện tại hay không.
                  </h1>
                  <p className="max-w-2xl text-base leading-8 text-white/82 lg:text-lg">
                    Đây không phải là bài kiểm tra để ngăn bạn lại. Nó giúp bạn biết nên giữ nguyên,
                    chia nhỏ hay điều chỉnh mục tiêu để hành trình phía sau bền vững hơn.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Badge variant="outline" className="rounded-full border-white/18 bg-white/12 px-4 py-2 text-white">
                    <Target className="mr-1 h-3.5 w-3.5" />
                    {getLifeAreaLabel(focusArea)}
                  </Badge>
                  <Badge variant="outline" className="rounded-full border-white/18 bg-white/12 px-4 py-2 text-white">
                    <Sparkles className="mr-1 h-3.5 w-3.5" />
                    Điểm hiện tại: {wheelScore}/10
                  </Badge>
                </div>
              </div>

              <div className="rounded-[32px] border border-white/14 bg-white/12 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl">
                <div className="flex items-center justify-between text-sm text-white/72">
                  <span>Câu hỏi {currentStep + 1} / {totalSteps}</span>
                  <span>{Math.round(progressPercentage)}%</span>
                </div>
                <Progress value={progressPercentage} className="mt-3 h-2.5 bg-white/20" />

                <div className="mt-6 rounded-[24px] border border-white/10 bg-black/12 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/55">Mục tiêu SMART</p>
                  <p className="mt-2 text-lg font-semibold text-white">{pendingGoal.specific}</p>
                </div>
                <div className="mt-4 rounded-[24px] border border-white/10 bg-black/12 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/55">Khung thời gian</p>
                  <p className="mt-2 text-sm font-semibold text-white">{pendingGoal.timeBound}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="overflow-hidden">
            <CardContent className="p-6 lg:p-7">
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="rounded-[28px] bg-[linear-gradient(135deg,_rgba(245,243,255,0.95)_0%,_rgba(252,231,243,0.78)_100%)] p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-500">
                    Câu hỏi {currentStep + 1}
                  </p>
                  <h2 className="mt-3 text-3xl font-bold text-slate-900">{currentQuestion.question}</h2>
                </div>

                <RadioGroup value={selectedAnswer} onValueChange={handleAnswerChange} className="space-y-3">
                  {currentQuestion.options.map((option, index) => (
                    <motion.div
                      key={option.value}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Label
                        htmlFor={option.value}
                        className={`flex cursor-pointer items-center gap-4 rounded-[24px] border px-5 py-4 transition-all ${
                          selectedAnswer === option.value
                            ? "border-violet-300 bg-violet-50/90 shadow-[0_18px_36px_-28px_rgba(109,40,217,0.35)]"
                            : "border-white/70 bg-white/72 hover:border-violet-200"
                        }`}
                      >
                        <RadioGroupItem value={option.value} id={option.value} />
                        <div className="flex-1">
                          <p className="text-base font-medium text-slate-800">{option.label}</p>
                        </div>
                        {selectedAnswer === option.value && (
                          <CheckCircle2 className="h-5 w-5 text-violet-600" />
                        )}
                      </Label>
                    </motion.div>
                  ))}
                </RadioGroup>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button variant="outline" className="flex-1" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4" />
                    Quay lại
                  </Button>
                  <Button className="flex-1" onClick={handleNext} disabled={!selectedAnswer}>
                    {currentStep < totalSteps - 1 ? "Tiếp theo" : "Hoàn thành đánh giá"}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            </CardContent>
          </Card>

          <div className="space-y-6 xl:sticky xl:top-28">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Mục đích của bài này
                </p>
                <div className="mt-5 space-y-3">
                  {[
                    "Biết mục tiêu hiện tại đang vừa sức hay quá tải.",
                    "Nhìn rõ độ sẵn sàng trước khi bước vào system 12 tuần.",
                    "Giảm rủi ro đặt mục tiêu nghe hay nhưng khó duy trì.",
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-[20px] border border-white/70 bg-white/72 px-4 py-3 text-sm leading-7 text-slate-600"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
