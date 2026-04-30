import { type ReactNode, useEffect, useRef, useState } from "react";
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

import { CoreFlowGateState } from "../components/CoreFlowGateState";
import { CoreFlowProgress } from "../components/CoreFlowProgress";
import { useScrollToTopOnChange } from "../hooks/useScrollToTopOnChange";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Progress } from "../components/ui/progress";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { trackAnalyticsEvent } from "../utils/analytics";
import { getScoredLifeArea, hasRealLifeBalance } from "../utils/core-flow-guard";
import { APP_STORAGE_KEYS, getLifeAreaLabel, getUserData } from "../utils/storage";
import { parsePendingSMARTGoal, parseSmartGoal, type PendingSMARTGoal } from "@/lib/smart-goal";

type FeasibilityAxis = "time" | "energy" | "resources" | "clarity" | "obstacle" | "routine" | "confidence";
type PlanLoadRecommendation = "lighter" | "balanced" | "push";
type WeeklyCapacity = "low" | "medium" | "high";

interface Question {
  id: number;
  axis: FeasibilityAxis;
  axisLabel: string;
  question: string;
  helper: string;
  options: { value: string; label: string; score: number; diagnostic: string }[];
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    axis: "time",
    axisLabel: "Thời gian thật",
    question: "Mỗi tuần bạn có thể dành chính xác bao nhiêu thời gian cho mục tiêu này?",
    helper: "Trả lời theo lịch sống thật. Câu này giúp hệ thống biết tuần đầu nên ít việc hay nhiều việc.",
    options: [
      {
        value: "lt1",
        label: "Dưới 1 giờ mỗi tuần",
        score: 1,
        diagnostic: "Kế hoạch phải rất nhẹ, chỉ nên giữ 1-2 việc chính.",
      },
      { value: "1to3", label: "1-3 giờ mỗi tuần", score: 2, diagnostic: "Kế hoạch nên gọn, ít việc nhưng lặp đều." },
      { value: "3to5", label: "3-5 giờ mỗi tuần", score: 3, diagnostic: "Có đủ chỗ cho một nhịp cân bằng." },
      {
        value: "gt5",
        label: "Hơn 5 giờ mỗi tuần",
        score: 4,
        diagnostic: "Có thể làm nhiều hơn một chút nếu các phần khác cũng ổn.",
      },
    ],
  },
  {
    id: 2,
    axis: "energy",
    axisLabel: "Năng lượng hiện tại",
    question: "Sau một ngày bình thường, bạn còn bao nhiêu năng lượng cho mục tiêu này?",
    helper: "Năng lượng thấp không có nghĩa là mục tiêu sai; nó chỉ nói rằng tuần đầu cần nhẹ và ít ma sát hơn.",
    options: [
      {
        value: "energy_drained",
        label: "Thường đã cạn sức",
        score: 1,
        diagnostic: "Cần giảm việc và chọn khoảng thời gian rất nhỏ.",
      },
      {
        value: "energy_low",
        label: "Còn ít, dễ bỏ nếu ngày bận",
        score: 2,
        diagnostic: "Cần thắng nhỏ sớm để giữ nhịp.",
      },
      {
        value: "energy_stable",
        label: "Còn đủ nếu đã đặt lịch trước",
        score: 3,
        diagnostic: "Có thể đi cân bằng nếu lịch được khóa rõ.",
      },
      {
        value: "energy_high",
        label: "Còn khá tốt và chủ động được",
        score: 4,
        diagnostic: "Có thể giữ nhịp đều và tăng lượng việc từ từ.",
      },
    ],
  },
  {
    id: 3,
    axis: "resources",
    axisLabel: "Nguồn lực / kỹ năng",
    question: "Bạn đã có đủ kỹ năng, công cụ hoặc nguồn lực để bắt đầu chưa?",
    helper: "Nếu chưa đủ nguồn lực, kế hoạch 12 tuần nên có bước chuẩn bị nhỏ trước khi làm việc lớn.",
    options: [
      {
        value: "resources_missing",
        label: "Thiếu khá nhiều, chưa biết bắt đầu từ đâu",
        score: 1,
        diagnostic: "Cần bước đệm học/chuẩn bị trước khi tăng tốc.",
      },
      {
        value: "resources_basic",
        label: "Có nền cơ bản nhưng còn nhiều lỗ hổng",
        score: 2,
        diagnostic: "Kế hoạch nên chừa chỗ cho học và thử nghiệm.",
      },
      {
        value: "resources_mostly_ready",
        label: "Phần lớn đã có, chỉ cần bổ sung dần",
        score: 3,
        diagnostic: "Có thể bắt đầu hành động chính song song với bổ sung.",
      },
      {
        value: "resources_ready",
        label: "Đủ để bắt đầu ngay",
        score: 4,
        diagnostic: "Kế hoạch có thể tập trung nhiều hơn vào làm thật.",
      },
    ],
  },
  {
    id: 4,
    axis: "clarity",
    axisLabel: "Độ rõ mục tiêu",
    question: "Mục tiêu này cảm thấy thực tế và rõ đến mức nào với bạn hiện tại?",
    helper: "Mục tiêu càng rõ về kết quả, con số cần đạt và thời hạn thì càng dễ chia thành việc hằng tuần.",
    options: [
      {
        value: "overwhelming",
        label: "Cảm giác quá lớn và quá sức",
        score: 1,
        diagnostic: "Nên thu nhỏ mục tiêu trước khi tạo kế hoạch.",
      },
      {
        value: "challenging",
        label: "Khó nhưng vẫn có thể chạm tới",
        score: 2,
        diagnostic: "Cần chọn một kết quả 12 tuần hẹp hơn.",
      },
      {
        value: "realistic",
        label: "Thực tế nếu tôi giữ kỷ luật",
        score: 3,
        diagnostic: "Có thể đi tiếp với nhịp cân bằng.",
      },
      {
        value: "very_realistic",
        label: "Rất thực tế và hoàn toàn có thể làm",
        score: 4,
        diagnostic: "Đủ rõ để chuyển sang kế hoạch 12 tuần.",
      },
    ],
  },
  {
    id: 5,
    axis: "obstacle",
    axisLabel: "Trở ngại chính",
    question: "Trở ngại lớn nhất có thể ngăn bạn hoàn thành mục tiêu này là gì?",
    helper: "Câu này giúp hệ thống biết nên giảm việc, chia nhỏ hay thêm bước chuẩn bị.",
    options: [
      {
        value: "motivation",
        label: "Thiếu động lực hoặc dễ mất đà",
        score: 2,
        diagnostic: "Cần thắng nhỏ sớm và một lần nhìn lại ngắn mỗi tuần.",
      },
      { value: "time", label: "Khó quản lý thời gian", score: 2, diagnostic: "Cần giảm số việc và khóa lịch cố định." },
      {
        value: "resources",
        label: "Thiếu nguồn lực hoặc kiến thức",
        score: 2,
        diagnostic: "Cần thêm bước học/chuẩn bị vào tuần đầu.",
      },
      {
        value: "complexity",
        label: "Mục tiêu phức tạp, dễ bị loãng",
        score: 2,
        diagnostic: "Cần tách rõ phần bắt buộc và phần mở rộng.",
      },
      {
        value: "none",
        label: "Hiện chưa thấy trở ngại lớn nào",
        score: 4,
        diagnostic: "Có thể tập trung vào nhịp làm đều.",
      },
    ],
  },
  {
    id: 6,
    axis: "routine",
    axisLabel: "Lịch cố định",
    question: "Bạn đã có chỗ cố định trong lịch để làm mục tiêu này chưa?",
    helper: "Không có lịch cố định thì kế hoạch đẹp vẫn dễ trôi. Câu này giúp hệ thống biết cần giữ nhịp chặt đến đâu.",
    options: [
      {
        value: "rarely",
        label: "Chưa có, thường làm khi nhớ ra",
        score: 1,
        diagnostic: "Kế hoạch phải bắt đầu bằng việc khóa lịch.",
      },
      {
        value: "sometimes",
        label: "Có dự định nhưng hay bị chen ngang",
        score: 2,
        diagnostic: "Cần lịch nhẹ và một lần nhìn lại để kéo lại nhịp.",
      },
      {
        value: "mostly",
        label: "Có vài khung giờ khá ổn trong tuần",
        score: 3,
        diagnostic: "Có thể giữ nhịp cân bằng nếu không thêm quá nhiều việc.",
      },
      {
        value: "always",
        label: "Đã có khung giờ khá cố định",
        score: 4,
        diagnostic: "Nền lịch đủ tốt để triển khai đều hơn.",
      },
    ],
  },
  {
    id: 7,
    axis: "confidence",
    axisLabel: "Tự tin hoàn thành",
    question: "Nếu phải bắt đầu trong tuần này, bạn tự tin hoàn thành tuần đầu ở mức nào?",
    helper: "Câu này giúp chọn tuần đầu nên nhẹ, vừa phải hay hơi thử thách.",
    options: [
      {
        value: "exploring",
        label: "Thấp, tôi còn khá do dự",
        score: 1,
        diagnostic: "Cần thu nhỏ để tạo niềm tin ban đầu.",
      },
      {
        value: "interested",
        label: "Vừa phải, tôi cần kế hoạch thật rõ",
        score: 2,
        diagnostic: "Cần ít việc lặp lại và chỉ số đo đơn giản.",
      },
      {
        value: "ready",
        label: "Khá tự tin nếu tuần đầu vừa sức",
        score: 3,
        diagnostic: "Có thể đi cân bằng với tuần đầu nhẹ.",
      },
      {
        value: "committed",
        label: "Cam kết hoàn toàn và bắt đầu ngay",
        score: 4,
        diagnostic: "Có thể bắt đầu ngay, miễn là không làm kế hoạch phình quá rộng.",
      },
    ],
  },
];

type ResultType = "realistic" | "challenging" | "too_ambitious";

interface AxisScore {
  axis: FeasibilityAxis;
  label: string;
  score: number;
  maxScore: number;
  percent: number;
  diagnostic: string;
}

interface FeasibilityBottleneck {
  axis: FeasibilityAxis | "wheel";
  label: string;
  score: number;
  action: string;
}

interface ResultData {
  type: ResultType;
  title: string;
  summary: string;
  recommendation: string;
  readinessScore: number;
  adjustedScore: number;
  wheelScore: number;
  diagnosticScore: number;
  maxDiagnosticScore: number;
  axisScores: AxisScore[];
  bottleneck: FeasibilityBottleneck;
  planLoad: PlanLoadRecommendation;
  weeklyCapacity: WeeklyCapacity;
  firstWeekGuidance: string;
  scopeRecommendation: string;
}

interface PendingFeasibilityResult {
  resultType: ResultType;
  resultTitle: string;
  resultSummary: string;
  recommendation: string;
  readinessScore: number;
  adjustedScore: number;
  wheelScore: number;
  diagnosticScore: number;
  maxDiagnosticScore: number;
  axisScores: AxisScore[];
  bottleneck: FeasibilityBottleneck;
  planLoad: PlanLoadRecommendation;
  weeklyCapacity: WeeklyCapacity;
  firstWeekGuidance: string;
  scopeRecommendation: string;
}

function getWheelPenalty(score: number): number {
  if (score <= 3) return 3;
  if (score <= 5) return 2;
  if (score <= 7) return 1;
  return 0;
}

function getSelectedOption(answers: Record<number, string>, question: Question) {
  const answer = answers[question.id];
  return question.options.find((choice) => choice.value === answer) ?? question.options[0];
}

function getBottleneckAction(axis: FeasibilityAxis | "wheel"): string {
  switch (axis) {
    case "time":
      return "Giảm số việc, khóa ít khung giờ cố định và tránh làm tuần đầu quá dày.";
    case "energy":
      return "Thiết kế tuần đầu nhẹ hơn, ưu tiên bước nhỏ dễ hoàn thành sau ngày bận.";
    case "resources":
      return "Thêm một bước chuẩn bị hoặc học nhanh trước khi yêu cầu đầu ra lớn.";
    case "clarity":
      return "Thu hẹp mục tiêu 12 tuần để chỉ còn một kết quả chính có thể đo được.";
    case "obstacle":
      return "Biến trở ngại chính thành nguyên tắc khi lập kế hoạch, không chỉ là ghi chú cảnh báo.";
    case "routine":
      return "Khóa khung giờ cố định trước, rồi mới tăng số lượng việc cần làm.";
    case "confidence":
      return "Tạo một tuần đầu dễ hoàn thành để tăng niềm tin trước khi nâng độ khó.";
    case "wheel":
      return "Giữ mục tiêu nhỏ hơn vì nền hiện tại của lĩnh vực này còn chưa vững.";
  }
}

function getWeeklyCapacity(answers: Record<number, string>): WeeklyCapacity {
  const timeAnswer = answers[1];
  if (timeAnswer === "lt1" || timeAnswer === "1to3") return "low";
  if (timeAnswer === "3to5") return "medium";
  return "high";
}

function getPlanLoadRecommendation(input: {
  adjustedScore: number;
  bottleneck: FeasibilityBottleneck;
  weeklyCapacity: WeeklyCapacity;
}): PlanLoadRecommendation {
  if (input.adjustedScore <= 10 || input.weeklyCapacity === "low") return "lighter";
  if (input.bottleneck.score <= 2 && input.bottleneck.axis !== "wheel") return "lighter";
  if (input.adjustedScore >= 17 && input.weeklyCapacity === "high") return "push";
  return "balanced";
}

function buildPlanGuidance(input: {
  resultType: ResultType;
  bottleneck: FeasibilityBottleneck;
  planLoad: PlanLoadRecommendation;
  weeklyCapacity: WeeklyCapacity;
}) {
  if (input.resultType === "too_ambitious") {
    return {
      firstWeekGuidance:
        "Tuần 1 chỉ nên có 1-2 hành động bắt buộc, ưu tiên tạo nhịp thắng nhỏ thay vì chứng minh năng lực.",
      scopeRecommendation: "Thu nhỏ mục tiêu 12 tuần hoặc kéo dài thời hạn trước khi tăng độ khó.",
    };
  }

  if (input.planLoad === "lighter") {
    return {
      firstWeekGuidance: `Tuần 1 nên nhẹ hơn vì phần cần chú ý nhất là ${input.bottleneck.label.toLowerCase()}.`,
      scopeRecommendation: "Giữ 2 việc chính, bỏ bớt phần mở rộng cho đến khi nhịp ổn định.",
    };
  }

  if (input.planLoad === "push") {
    return {
      firstWeekGuidance: "Tuần 1 có thể thử thách hơn một chút, nhưng vẫn cần nhìn lại sớm để tránh ôm quá nhiều.",
      scopeRecommendation: "Có thể dùng 3-4 việc lặp lại nếu mỗi việc có lịch rõ và đo được.",
    };
  }

  return {
    firstWeekGuidance: "Tuần 1 nên cân bằng: đủ rõ để tiến lên, đủ nhẹ để không mất nhịp.",
    scopeRecommendation: "Giữ một kết quả chính, 2-3 việc lặp lại và một buổi nhìn lại cố định.",
  };
}

function buildResult(answers: Record<number, string>, wheelScore: number): ResultData {
  const axisScores: AxisScore[] = QUESTIONS.map((question) => {
    const option = getSelectedOption(answers, question);
    return {
      axis: question.axis,
      label: question.axisLabel,
      score: option.score,
      maxScore: 4,
      percent: Math.round((option.score / 4) * 100),
      diagnostic: option.diagnostic,
    };
  });

  const diagnosticScore = axisScores.reduce((sum, item) => sum + item.score, 0);
  const maxDiagnosticScore = QUESTIONS.length * 4;
  const readinessScore = Math.round((diagnosticScore / maxDiagnosticScore) * 20);
  const wheelPenalty = getWheelPenalty(wheelScore);
  const adjustedScore = readinessScore - wheelPenalty;
  const weakestAxis = [...axisScores].sort((a, b) => a.score - b.score)[0];
  const bottleneck =
    wheelScore <= 4 && wheelScore / 10 < weakestAxis.score / weakestAxis.maxScore
      ? {
          axis: "wheel" as const,
          label: "Nền lĩnh vực hiện tại",
          score: wheelScore,
          action: getBottleneckAction("wheel"),
        }
      : {
          axis: weakestAxis.axis,
          label: weakestAxis.label,
          score: weakestAxis.score,
          action: getBottleneckAction(weakestAxis.axis),
        };
  const weeklyCapacity = getWeeklyCapacity(answers);

  const resultType: ResultType =
    adjustedScore >= 15 ? "realistic" : adjustedScore >= 10 ? "challenging" : "too_ambitious";
  const planLoad = getPlanLoadRecommendation({ adjustedScore, bottleneck, weeklyCapacity });
  const guidance = buildPlanGuidance({ resultType, bottleneck, planLoad, weeklyCapacity });

  const resultCopy: Record<ResultType, Pick<ResultData, "title" | "summary" | "recommendation">> = {
    realistic: {
      title: "Mục tiêu này đủ thực tế nếu giữ đúng độ nặng.",
      summary: `Đánh giá dựa trên ${QUESTIONS.length} góc nhìn cho thấy bạn có thể bắt đầu. Phần cần chú ý nhất là ${bottleneck.label.toLowerCase()}, nên kế hoạch 12 tuần cần xử lý phần này ngay từ tuần đầu.`,
      recommendation:
        planLoad === "push"
          ? "Bạn có thể thử thách hơn một chút, nhưng vẫn cần nhìn lại sớm để không mở rộng quá tay."
          : "Bạn có thể đi tiếp sang kế hoạch 12 tuần với nhịp rõ, ít việc và nhìn lại đều.",
    },
    challenging: {
      title: "Mục tiêu này làm được, nhưng phải xử lý đúng phần yếu nhất.",
      summary: `Kết quả không chỉ dựa vào cảm giác chung. Phần yếu nhất hiện tại là ${bottleneck.label.toLowerCase()}, nên nếu bỏ qua nó thì kế hoạch 12 tuần rất dễ dày lên nhưng khó giữ.`,
      recommendation:
        "Nên thu hẹp mục tiêu, chọn ít việc chính hơn và biến phần cần chú ý nhất thành nguyên tắc cho tuần đầu.",
    },
    too_ambitious: {
      title: "Mục tiêu này cần thu nhỏ trước khi tạo kế hoạch 12 tuần.",
      summary: `Một vài nền tảng hiện tại chưa đủ chắc, đặc biệt là ${bottleneck.label.toLowerCase()}. Nếu giữ nguyên độ rộng, rủi ro lớn nhất là bắt đầu hăng nhưng mất nhịp sớm.`,
      recommendation:
        "Hãy chọn phiên bản nhỏ hơn của mục tiêu, giữ tuần đầu rất nhẹ và chỉ tăng độ khó khi phần nhìn lại hằng tuần cho thấy bạn giữ được nhịp.",
    },
  };

  return {
    type: resultType,
    ...resultCopy[resultType],
    readinessScore,
    adjustedScore: Math.max(0, adjustedScore),
    wheelScore,
    diagnosticScore,
    maxDiagnosticScore,
    axisScores,
    bottleneck,
    planLoad,
    weeklyCapacity,
    firstWeekGuidance: guidance.firstWeekGuidance,
    scopeRecommendation: guidance.scopeRecommendation,
  };
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
  const wheelPercent = Math.max(0, Math.min(100, Math.round((result.wheelScore / 10) * 100)));
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
    <div className="app-shell min-h-screen px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
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

              <div className="hidden rounded-[34px] border border-white/14 bg-white/12 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/58">Mức độ phù hợp</p>
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

        <div className="space-y-5">
          <Card className={`hidden overflow-hidden sm:block ${styles.panel}`}>
            <CardContent className="p-5 lg:p-6">
              <div>
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/82 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
                    <Compass className="h-3.5 w-3.5" />
                    Hướng đi tiếp theo
                  </div>
                  <h2 className="mt-4 text-2xl font-bold tracking-normal text-slate-900">
                    {result.type === "too_ambitious" ? "Thu nhỏ rồi đi tiếp." : "Đây là hướng nên đi tiếp."}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{copy.statusHint}</p>
                  <p className="mt-3 text-base font-semibold leading-7 text-slate-900">{result.recommendation}</p>
                </div>
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
            <div className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div>
                <h2 className="text-xl font-bold tracking-normal text-slate-900">{copy.guideTitle}</h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">{copy.guideBody}</p>
                <div className="mt-4 rounded-[20px] border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Nguyên tắc lập kế hoạch
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-900">{result.scopeRecommendation}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{result.bottleneck.action}</p>
                </div>
              </div>
              <div className="space-y-3">
                {copy.nextMoves.map((item, index) => (
                  <div key={item} className="flex gap-3 rounded-[20px] border border-slate-200 bg-slate-50/80 p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl gradient-violet-blue-icon text-xs font-semibold text-violet-700">
                      {index + 1}
                    </div>
                    <p className="text-sm leading-6 text-slate-600">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </details>
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
  const questionTopRef = useRef<HTMLDivElement | null>(null);
  const questionHeadingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    if (hasGuardedRef.current) return;
    hasGuardedRef.current = true;

    const storedFocusArea = localStorage.getItem(APP_STORAGE_KEYS.selectedFocusArea);
    const draft = localStorage.getItem(APP_STORAGE_KEYS.pendingSmartGoal);
    const data = getUserData();

    if (!hasRealLifeBalance(data)) {
      toast.info("Vui lòng hoàn thành Life Balance trước khi kiểm tra tính khả thi.");
      setIsInitializing(false);
      navigate("/onboarding");
      return;
    }

    if (!storedFocusArea || !draft) {
      toast.info("Vui lòng hoàn thành bước viết mục tiêu trước.");
      setIsInitializing(false);
      navigate("/smart-goal-setup");
      return;
    }

    let parsedDraft: unknown;
    try {
      parsedDraft = JSON.parse(draft);
    } catch {
      toast.info("Bản nháp mục tiêu của bạn không hợp lệ. Vui lòng kiểm tra lại.");
      setIsInitializing(false);
      navigate("/smart-goal-setup");
      return;
    }

    const normalizedSmartGoal = parseSmartGoal(parsedDraft, storedFocusArea);
    if (normalizedSmartGoal) {
      localStorage.setItem(APP_STORAGE_KEYS.pendingSmartGoal, JSON.stringify(normalizedSmartGoal));
    }

    const normalizedPendingGoal = parsePendingSMARTGoal(normalizedSmartGoal ?? parsedDraft, storedFocusArea);

    if (!normalizedPendingGoal) {
      toast.info("Bản nháp mục tiêu của bạn chưa hoàn chỉnh. Vui lòng hoàn thành nó.");
      setIsInitializing(false);
      navigate("/smart-goal-setup");
      return;
    }

    const areaData = getScoredLifeArea(data, storedFocusArea);

    if (!areaData) {
      toast.info("Vui lòng hoàn thành phần góc nhìn cuộc sống trước.");
      setIsInitializing(false);
      navigate("/life-insight");
      return;
    }

    setFocusArea(storedFocusArea);
    setWheelScore(areaData.score);
    setPendingGoal(normalizedPendingGoal);
    setIsInitializing(false);
  }, [navigate]);

  useScrollToTopOnChange(currentStep, {
    targetRef: questionTopRef,
    focusRef: questionHeadingRef,
    enabled: !isInitializing && Boolean(pendingGoal && wheelScore !== null && !result),
  });

  if (isInitializing) {
    return (
      <CoreFlowGateState
        currentStepId="feasibility"
        eyebrow="Kiểm tra"
        title="Đang chuẩn bị phần kiểm tra tính khả thi"
        description="Mình đang đọc lại mục tiêu và dữ liệu chọn trọng tâm trước khi bắt đầu đánh giá."
        loading
      />
    );
  }

  if (!pendingGoal || wheelScore === null) {
    return (
      <CoreFlowGateState
        currentStepId="smart_goal"
        eyebrow="Kiểm tra"
        title="Thiếu dữ liệu để mở bài đánh giá"
        description="Không tìm thấy đủ thông tin mục tiêu hoặc điểm trọng tâm. Mở lại bước viết mục tiêu để tiếp tục."
        actionLabel="Quay lại viết mục tiêu"
        onAction={() => navigate("/smart-goal-setup")}
      />
    );
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

    setResult(buildResult(answers, wheelScore));
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
      diagnosticScore: result.diagnosticScore,
      maxDiagnosticScore: result.maxDiagnosticScore,
      axisScores: result.axisScores,
      bottleneck: result.bottleneck,
      planLoad: result.planLoad,
      weeklyCapacity: result.weeklyCapacity,
      firstWeekGuidance: result.firstWeekGuidance,
      scopeRecommendation: result.scopeRecommendation,
    };

    localStorage.setItem(APP_STORAGE_KEYS.pendingFeasibilityResult, JSON.stringify(pendingFeasibilityResult));
    localStorage.setItem(APP_STORAGE_KEYS.pendingFeasibilityAnswers, JSON.stringify(answers));
    trackAnalyticsEvent("feasibility_completed", {
      focus_area: focusArea,
      result_type: result.type,
      readiness_score: result.readinessScore,
      adjusted_score: result.adjustedScore,
      bottleneck_axis: result.bottleneck.axis,
      plan_load: result.planLoad,
      weekly_capacity: result.weeklyCapacity,
      answer_count: Object.keys(answers).length,
    });

    toast.success("Đã kiểm tra tính thực tế", {
      description: "Tiếp tục thiết kế kế hoạch 12 tuần cho mục tiêu của bạn.",
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
        <CoreFlowProgress currentStepId="feasibility" />

        <Card className="hero-surface overflow-hidden border-0 text-white">
          <CardContent className="relative p-5 sm:p-6 lg:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.12),_transparent_24%)] opacity-90" />

            <div className="relative max-w-4xl">
              <div className="space-y-5 sm:space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-1.5 text-sm text-white/82">
                  <Compass className="h-4 w-4" />
                  Kiểm tra tính thực tế
                </div>

                <div className="space-y-4">
                  <h1 className="max-w-3xl text-3xl font-bold tracking-normal sm:text-4xl lg:text-5xl">
                    Kiểm tra xem mục tiêu này có thực tế với bạn ở thời điểm hiện tại hay không.
                  </h1>
                  <p className="max-w-2xl text-base leading-8 text-white/82 lg:text-lg">
                    Đây không phải là bài kiểm tra để ngăn bạn lại. Nó giúp bạn biết nên giữ nguyên, chia nhỏ hay điều
                    chỉnh mục tiêu để hành trình phía sau bền vững hơn.
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

              <div className="hidden rounded-[32px] border border-white/14 bg-white/12 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl">
                <div className="flex items-center justify-between text-sm text-white/72">
                  <span>
                    Câu hỏi {currentStep + 1} / {totalSteps}
                  </span>
                  <span>{Math.round(progressPercentage)}%</span>
                </div>
                <Progress value={progressPercentage} className="mt-3 h-2.5 bg-white/20" />

                <div className="mt-6 rounded-[24px] border border-white/10 bg-black/12 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/55">Mục tiêu đã viết</p>
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

        <div ref={questionTopRef} className="mx-auto max-w-4xl">
          <Card className="overflow-hidden">
            <CardContent className="p-5 sm:p-6 lg:p-7">
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="rounded-[28px] gradient-violet-pink p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-500">
                    {currentQuestion.axisLabel} · Câu hỏi {currentStep + 1}/{totalSteps}
                  </p>
                  <h2
                    ref={questionHeadingRef}
                    tabIndex={-1}
                    className="mt-3 text-2xl font-bold text-slate-900 focus:outline-none sm:text-3xl"
                  >
                    {currentQuestion.question}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{currentQuestion.helper}</p>
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
                        {selectedAnswer === option.value && <CheckCircle2 className="h-5 w-5 text-violet-600" />}
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

          <div className="hidden">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Mục đích của bài này</p>
                <div className="mt-5 space-y-3">
                  {[
                    "Trả lời theo lịch sống thật, không theo phiên bản lý tưởng.",
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
