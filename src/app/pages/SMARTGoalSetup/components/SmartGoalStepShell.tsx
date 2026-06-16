import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  CircleAlert,
  Clock,
  Heart,
  Lightbulb,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import type { ReactNode, RefObject } from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/app/components/ui/utils";
import type { QualityLevel } from "@/lib/smart-goal/quality";
import type { SmartGoalStarter } from "../../../utils/smart-goal-starters";
import { SMART_STEPS } from "../constants";
import { formatStepDraft } from "../helpers";
import type { GoalClarityItem, SMARTData, SmartGoalSummaryRow, SmartStepDefinition, SmartStepKey } from "../types";
import { QualityFeedbackPanel } from "./QualityFeedbackPanel";
import { ReviewStep } from "./ReviewStep";

interface QualityFeedbackData {
  level: QualityLevel;
  overallScore: number;
  warnings: string[];
  suggestions: string[];
  canProceedToFeasibility: boolean;
}

interface SmartGoalStepShellProps {
  stepIndex: number;
  totalSteps: number;
  step: SmartStepDefinition;
  headingRef: RefObject<HTMLHeadingElement | null>;
  children: ReactNode;
  starterPreview: string;
  clarityItems: GoalClarityItem[];
  clarityDoneCount: number;
  clarityProgress: number;
  summaryRows: SmartGoalSummaryRow[];
  showReview: boolean;
  currentStepError: string | null;
  currentStepSoftWarning: string | null;
  isCurrentStepValid: boolean;
  qualityFeedback: QualityFeedbackData | null;
  smartData: SMARTData;
  smartGoalStarter: SmartGoalStarter;
  onApplyStarter: (transformedText?: string) => void;
  onJumpToStep: (stepKey: SmartStepKey) => void;
  onBack: () => void;
  onNext: () => void;
  finalPrimaryCtaLabel?: string;
  finalSecondaryCtaLabel?: string;
  onFinalSecondaryAction?: () => void;
}

const STEP_NAMES: Record<SmartStepKey, string> = {
  specific: "Specific",
  measurable: "Measurable",
  achievable: "Achievable",
  relevant: "Relevant",
  timeBound: "Time-bound",
};

const STEP_LETTERS: Record<SmartStepKey, string> = {
  specific: "S",
  measurable: "M",
  achievable: "A",
  relevant: "R",
  timeBound: "T",
};

const STEP_ICONS: Record<SmartStepKey, typeof Target> = {
  specific: Target,
  measurable: BarChart3,
  achievable: ShieldCheck,
  relevant: Heart,
  timeBound: Clock,
};

const STEP_CTA_LABELS: Record<SmartStepKey, string> = {
  specific: "Lưu mục tiêu cụ thể",
  measurable: "Xác nhận chỉ số đo",
  achievable: "Thiết lập thời gian cam kết",
  relevant: "Xác nhận động lực này",
  timeBound: "Kiểm tra độ khả thi",
};

// Tổng hợp chuông ngân chánh niệm tần số 639Hz (hoà hợp, kết nối)
const playMindfulStepSuccess = () => {
  try {
    const AudioCtxClass =
      window.AudioContext || (window as unknown as Record<string, typeof AudioContext>).webkitAudioContext;
    if (!AudioCtxClass) return;
    const ctx = new AudioCtxClass();

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(639, ctx.currentTime); // Tần số Solfeggio 639Hz

    gainNode.gain.setValueAtTime(0.03, ctx.currentTime); // Âm lượng siêu nhẹ nhàng, dịu tai
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2); // Ngân vang nhẹ trong 1.2s

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 1.2);
  } catch (_e) {
    // Bỏ qua nếu bị chặn phát
  }
};

// Canvas hiệu ứng pháo hoa giấy Confetti vẽ trực tiếp bằng JS
function ConfettiCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);
    handleResize();

    const colors = ["#fbbf24", "#34d399", "#60a5fa", "#f472b6", "#a78bfa", "#f87171"];
    const particles = Array.from({ length: 65 }).map(() => ({
      x: Math.random() * canvas.width,
      y: -10 - Math.random() * 20,
      vx: (Math.random() - 0.5) * 3,
      vy: 2.5 + Math.random() * 3.5,
      size: 4 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)] ?? "#fbbf24",
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 8,
    }));

    let animId: number;
    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let active = false;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.rotationSpeed;

        if (p.y < canvas.height + 20) {
          active = true;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      }

      if (active) {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-50 pointer-events-none w-full h-full" />;
}

// Hook hiệu ứng gõ chữ sinh động
function useTypingEffect(text: string, speed = 6, shouldReduce = false) {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    if (shouldReduce) {
      setDisplayedText(text);
      return;
    }

    setDisplayedText("");
    if (!text) return;

    let index = 0;
    let currentText = "";

    const timer = setInterval(() => {
      if (index < text.length) {
        currentText += text.charAt(index);
        setDisplayedText(currentText);
        index++;
      } else {
        clearInterval(timer);
      }
    }, speed);

    return () => {
      clearInterval(timer);
    };
  }, [text, speed, shouldReduce]);

  return displayedText;
}

export function SmartGoalStepShell({
  stepIndex,
  totalSteps,
  step,
  headingRef,
  children,
  starterPreview,
  clarityItems,
  clarityDoneCount,
  clarityProgress,
  summaryRows,
  showReview,
  currentStepError,
  currentStepSoftWarning,
  isCurrentStepValid,
  qualityFeedback,
  smartData,
  smartGoalStarter,
  onApplyStarter,
  onJumpToStep,
  onBack,
  onNext,
  finalPrimaryCtaLabel,
  finalSecondaryCtaLabel,
  onFinalSecondaryAction,
}: SmartGoalStepShellProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const shouldReduceMotion = useReducedMotion() ?? false;
  const [showStickyMini, setShowStickyMini] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [selectedTone, setSelectedTone] = useState<"empathetic" | "pragmatic" | "strategic">("empathetic");
  const [isAiCoachExpanded, setIsAiCoachExpanded] = useState(false);
  const [isPolaroidExpanded, setIsPolaroidExpanded] = useState(false);
  const [isPageFlipping, setIsPageFlipping] = useState(false);

  useEffect(() => {
    if (stepIndex !== undefined) {
      setIsPageFlipping(true);
      const timer = setTimeout(() => setIsPageFlipping(false), 220);
      return () => clearTimeout(timer);
    }
  }, [stepIndex]);

  useEffect(() => {
    if (window.innerWidth >= 1024) {
      setIsAiCoachExpanded(true);
    }
  }, []);

  const prevValidRef = useRef(isCurrentStepValid);
  const prevGoldRef = useRef(false);

  const isGoldStandard = clarityDoneCount === clarityItems.length;

  const focusInvalidCurrentStep = () => {
    setTimeout(() => {
      const stepInputs: Record<SmartStepKey, string> = {
        specific: "#smart-specific",
        measurable: "#smart-metric-name",
        achievable: "#smart-weekly-hours-slider, #smart-weekly-hours-input",
        relevant: "#smart-relevant-reason",
        timeBound: "#smart-target-weeks-slider, #smart-target-date",
      };

      const targetSelector = stepInputs[step.key];
      const targetElement = targetSelector ? (document.querySelector(targetSelector) as HTMLElement) : null;

      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth", block: "center" });

        const isMobileDevice = window.innerWidth < 1024;
        if (!isMobileDevice) {
          targetElement.focus({ preventScroll: true });
        }

        targetElement.classList.add("animate-shake");
        setTimeout(() => {
          targetElement.classList.remove("animate-shake");
        }, 450);
      }
    }, 50);
  };

  const handleValidatedAction = (action: () => void) => {
    if (!isCurrentStepValid) {
      onNext();
      focusInvalidCurrentStep();
      return;
    }
    action();
  };

  const handleNextClick = () => handleValidatedAction(onNext);
  const handleFinalSecondaryClick = () => handleValidatedAction(onFinalSecondaryAction ?? onNext);

  useEffect(() => {
    if (!prevValidRef.current && isCurrentStepValid) {
      playMindfulStepSuccess();
    }
    prevValidRef.current = isCurrentStepValid;
  }, [isCurrentStepValid]);

  useEffect(() => {
    if (!prevGoldRef.current && isGoldStandard) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 2600);
      return () => clearTimeout(timer);
    }
    prevGoldRef.current = isGoldStandard;
  }, [isGoldStandard]);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 280) {
        setShowStickyMini(true);
      } else {
        setShowStickyMini(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleWizardJump = (index: number) => {
    const nextStep = SMART_STEPS[index];
    if (nextStep) {
      onJumpToStep(nextStep.key);
    }
  };

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 90, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 90, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["4.5deg", "-4.5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-4.5deg", "4.5deg"]);

  const glareX = useTransform(mouseXSpring, [-0.5, 0.5], ["20%", "80%"]);
  const glareY = useTransform(mouseYSpring, [-0.5, 0.5], ["20%", "80%"]);

  const glareBg = useTransform([glareX, glareY], ([gX, gY]) => {
    return `radial-gradient(circle at ${gX} ${gY}, rgba(255,255,255,0.15) 0%, transparent 60%)`;
  });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const relativeX = (e.clientX - rect.left) / rect.width - 0.5;
    const relativeY = (e.clientY - rect.top) / rect.height - 0.5;

    x.set(relativeX);
    y.set(relativeY);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const specText = smartData.specific.goal_statement.trim();
  const measTarget = smartData.measurable.target_value.trim();
  const measUnit = smartData.measurable.metric_name.trim();
  const achHours = smartData.achievable.weekly_time_commitment_hours.trim();
  const relReason = smartData.relevant.motivation_reason.trim();
  const timeDate =
    smartData.timeBound.mode === "date"
      ? smartData.timeBound.target_date.trim()
      : smartData.timeBound.target_weeks.trim()
        ? `trong ${smartData.timeBound.target_weeks.trim()} tuần`
        : "";

  const isSpecFilled = specText.length > 0;
  const isMeasFilled = measTarget.length > 0;
  const isAchFilled = achHours.length > 0;
  const isRelFilled = relReason.length > 0;
  const isTimeFilled = timeDate.length > 0;

  // Tự động mở rộng Polaroid panel trên mobile khi người dùng bắt đầu có nội dung nhập liệu
  const hasSomeContent = isSpecFilled || isMeasFilled || isAchFilled || isRelFilled || isTimeFilled;
  const prevHasSomeContent = useRef(hasSomeContent);

  useEffect(() => {
    if (!prevHasSomeContent.current && hasSomeContent && window.innerWidth < 1024) {
      setIsPolaroidExpanded(true);
    }
    prevHasSomeContent.current = hasSomeContent;
  }, [hasSomeContent]);

  const goalStr = smartGoalStarter.specificGoalStatement;
  const metric = smartGoalStarter.metricName;
  const baseVal = smartGoalStarter.baselineValue;
  const targetVal = smartGoalStarter.targetValue;
  const hoursVal = smartGoalStarter.weeklyHours;
  const motivationReasonStr = smartGoalStarter.motivationReason;
  const weeksVal = smartGoalStarter.targetWeeks;
  const isFinalStep = stepIndex === totalSteps - 1;
  const primaryCtaLabel = isFinalStep && finalPrimaryCtaLabel ? finalPrimaryCtaLabel : STEP_CTA_LABELS[step.key];
  const showFinalSecondaryCta = isFinalStep && finalSecondaryCtaLabel && onFinalSecondaryAction;

  const getPersonaData = (
    tone: "empathetic" | "pragmatic" | "strategic",
  ): {
    coachComment: string;
    goalDraft: string;
    coreTextToApply: string;
  } => {
    const cleanMetric = metric.toLowerCase();

    if (step.key === "specific") {
      if (tone === "empathetic") {
        return {
          coachComment: "Bạn đang hướng tới một tầm nhìn rất ý nghĩa đấy. Hãy bắt đầu nhẹ nhàng nhưng đầy cam kết:",
          goalDraft: goalStr,
          coreTextToApply: goalStr,
        };
      }
      const pragmaticGoal = goalStr
        .replace(
          "Hoàn thành một kết quả quan trọng trong 12 tuần để cải thiện lĩnh vực đang ưu tiên và có bằng chứng rõ ràng về tiến bộ.",
          "Thực hiện cam kết hành động 12 tuần để cải thiện lĩnh vực ưu tiên và ghi nhận tiến bộ rõ ràng.",
        )
        .replace(
          "Hoàn thành một dự án nổi bật trong 12 tuần để có bằng chứng rõ ràng khi trao đổi về bước tiến nghề nghiệp.",
          "Hoàn thành 1 dự án trọng điểm trong 12 tuần để chứng minh năng lực và thăng tiến nghề nghiệp.",
        )
        .replace(
          "Xây dựng quỹ dự phòng đầu tiên trong 12 tuần để tài chính cá nhân ổn hơn và giảm áp lực khi có việc phát sinh.",
          "Tích lũy quỹ dự phòng khẩn cấp trong 12 tuần nhằm ổn định tài chính cá nhân trước các sự cố phát sinh.",
        )
        .replace(
          "Duy trì 3 buổi vận động mỗi tuần trong 12 tuần để cơ thể khỏe hơn, ngủ tốt hơn và có nhiều năng lượng hơn.",
          "Duy trì tập thể dục 3 buổi mỗi tuần trong 12 tuần nhằm nâng cao thể lực và năng lượng làm việc.",
        )
        .replace(
          "Hoàn thành một lộ trình học 12 tuần để nắm chắc một kỹ năng mới và có sản phẩm nhỏ chứng minh kết quả học.",
          "Hoàn thành lộ trình học kỹ năng mới trong 12 tuần và tự làm 1 sản phẩm thực tế để ứng dụng.",
        )
        .replace(
          "Duy trì ít nhất 2 lần chủ động kết nối mỗi tuần trong 12 tuần để các mối quan hệ quan trọng gần gũi hơn.",
          "Chủ động kết nối với những người quan trọng 2 lần mỗi tuần trong 12 tuần để gia tăng sự gắn kết.",
        )
        .replace(
          "Duy trì 2 khoảng thời gian chất lượng với gia đình mỗi tuần trong 12 tuần để kết nối gần hơn và bớt bị cuốn vào việc riêng.",
          "Dành riêng 2 khoảng thời gian chất lượng cho gia đình mỗi tuần trong 12 tuần, gác lại công việc riêng.",
        )
        .replace(
          "Duy trì một thói quen phát triển bản thân trong 12 tuần để hiểu mình hơn và có nhịp cải thiện đều mỗi tuần.",
          "Thực hiện thói quen phát triển bản thân đều đặn mỗi tuần trong 12 tuần để nâng cao nhận thức cá nhân.",
        )
        .replace(
          "Duy trì 2 khoảng nghỉ chất lượng mỗi tuần trong 12 tuần để phục hồi năng lượng và không để cuộc sống chỉ xoay quanh việc riêng.",
          "Lên lịch và thực hiện 2 khoảng nghỉ chất lượng mỗi tuần trong 12 tuần nhằm phục hồi năng lượng tối ưu.",
        );

      if (tone === "pragmatic") {
        return {
          coachComment: "Vào thẳng hành động thực tế nào. Hãy điền ngắn gọn, rõ việc cần làm:",
          goalDraft: pragmaticGoal,
          coreTextToApply: pragmaticGoal,
        };
      }
      const strategicGoal = goalStr
        .replace(
          "Hoàn thành một kết quả quan trọng trong 12 tuần để cải thiện lĩnh vực đang ưu tiên và có bằng chứng rõ ràng về tiến bộ.",
          "Thực thi chiến lược 12 tuần nhằm tối ưu hóa lĩnh vực ưu tiên và tạo chỉ số tiến trình rõ nét.",
        )
        .replace(
          "Hoàn thành một dự án nổi bật trong 12 tuần để có bằng chứng rõ ràng khi trao đổi về bước tiến nghề nghiệp.",
          "Xây dựng dự án trọng điểm trong 12 tuần, tạo đòn bẩy thăng tiến nghề nghiệp rõ rệt.",
        )
        .replace(
          "Xây dựng quỹ dự phòng đầu tiên trong 12 tuần để tài chính cá nhân ổn hơn và giảm áp lực khi có việc phát sinh.",
          "Tối ưu hóa phân bổ dòng tiền và thiết lập quỹ dự phòng 12 tuần nhằm bảo vệ an toàn tài chính lâu dài.",
        )
        .replace(
          "Duy trì 3 buổi vận động mỗi tuần trong 12 tuần để cơ thể khỏe hơn, ngủ tốt hơn và có nhiều năng lượng hơn.",
          "Xây dựng thói quen vận động 3 buổi/tuần trong 12 tuần nhằm tái tạo năng lượng thể chất và tinh thần tối đa.",
        )
        .replace(
          "Hoàn thành một lộ trình học 12 tuần để nắm chắc một kỹ năng mới và có sản phẩm nhỏ chứng minh kết quả học.",
          "Làm chủ kỹ năng mới thông qua lộ trình học 12 tuần và đóng gói kết quả dưới dạng sản phẩm kiểm chứng.",
        )
        .replace(
          "Duy trì ít nhất 2 lần chủ động kết nối mỗi tuần trong 12 tuần để các mối quan hệ quan trọng gần gũi hơn.",
          "Hệ thống hóa lịch kết nối chất lượng 2 lần/tuần trong 12 tuần nhằm tối ưu hóa các mối quan hệ cốt lõi.",
        )
        .replace(
          "Duy trì 2 khoảng thời gian chất lượng với gia đình mỗi tuần trong 12 tuần để kết nối gần hơn và bớt bị cuốn vào việc riêng.",
          "Thiết lập ranh giới công việc, dành 2 buổi sinh hoạt gia đình chất lượng mỗi tuần trong 12 tuần.",
        )
        .replace(
          "Duy trì một thói quen phát triển bản thân trong 12 tuần để hiểu mình hơn và có nhịp cải thiện đều mỗi tuần.",
          "Chuẩn hóa quy trình tự phản tỉnh và thực hiện thói quen phát triển bản thân mỗi tuần trong 12 tuần.",
        )
        .replace(
          "Duy trì 2 khoảng nghỉ chất lượng mỗi tuần trong 12 tuần để phục hồi năng lượng và không để cuộc sống chỉ xoay quanh việc riêng.",
          "Quản trị năng lượng bằng 2 khoảng nghỉ sâu mỗi tuần trong 12 tuần, ngăn chặn rủi ro kiệt sức.",
        );
      return {
        coachComment: "Phân tích chiến lược cho thấy đây là lộ trình tối ưu nhất. Hãy tham khảo cấu trúc mục tiêu:",
        goalDraft: strategicGoal,
        coreTextToApply: strategicGoal,
      };
    }

    if (step.key === "measurable") {
      if (tone === "empathetic") {
        return {
          coachComment: "Số liệu là tấm gương giúp bạn tự quan sát nhẹ nhàng. Chúc bạn có những bước đi thảnh thơi!",
          goalDraft: `Hãy đo lường bằng cách đạt mốc ${targetVal} ${cleanMetric} (khởi điểm từ mốc ${baseVal}).`,
          coreTextToApply: "",
        };
      }
      if (tone === "pragmatic") {
        return {
          coachComment: "Đo lường cụ thể để kiểm soát kết quả tốt nhất. Chỉ tiêu hành động:",
          goalDraft: `Đạt mốc ${targetVal} ${cleanMetric} (bắt đầu từ mốc ${baseVal}).`,
          coreTextToApply: "",
        };
      }
      return {
        coachComment: "Chỉ số định hướng giúp bạn dễ dàng theo dõi tiến độ mỗi tuần:",
        goalDraft: `Đặt mốc cần đạt là ${targetVal} ${cleanMetric} (với mốc cơ sở hiện tại là ${baseVal}).`,
        coreTextToApply: "",
      };
    }

    if (step.key === "achievable") {
      if (tone === "empathetic") {
        return {
          coachComment: "Nuôi dưỡng thói quen bền bỉ tốt hơn là ép mình quá sức. Bạn nên bắt đầu chậm rãi:",
          goalDraft: `Dành ra khoảng ${hoursVal} giờ mỗi tuần để thích nghi từ từ bạn nhé.`,
          coreTextToApply: "",
        };
      }
      if (tone === "pragmatic") {
        return {
          coachComment: "Tập trung phân bổ thời gian kỷ luật tối đa. Hãy cam kết:",
          goalDraft: `Dành ra đúng ${hoursVal} giờ mỗi tuần để hành động thực tế. Hãy chuẩn bị trước các nguồn lực cần thiết để sẵn sàng thực hiện.`,
          coreTextToApply: "",
        };
      }
      return {
        coachComment: "Để giữ nhịp độ hành động đều đặn và tránh bị quá tải, thời gian gợi ý cho bạn là:",
        goalDraft: `Phân bổ quỹ thời gian biểu là ${hoursVal} giờ/tuần cùng với việc chuẩn bị nguồn lực hỗ trợ đầy đủ.`,
        coreTextToApply: "",
      };
    }

    if (step.key === "relevant") {
      const cleanReason = motivationReasonStr.replace("Tôi muốn mục tiêu này vì ", "");
      if (tone === "empathetic") {
        return {
          coachComment:
            "Lý do sâu sắc từ trái tim sẽ tiếp thêm sức mạnh cho bạn. Hãy cảm nhận xem điều này đã thực sự chạm tới ước muốn của bạn chưa:",
          goalDraft: motivationReasonStr,
          coreTextToApply: motivationReasonStr,
        };
      }

      const pragmaticReason = `Động lực thực tế: ${cleanReason.charAt(0).toUpperCase() + cleanReason.slice(1)}`;
      if (tone === "pragmatic") {
        return {
          coachComment: "Tập trung vào giá trị thực tế nhất cho cuộc sống của bạn lúc này:",
          goalDraft: pragmaticReason,
          coreTextToApply: pragmaticReason,
        };
      }

      const strategicReason = `Định hướng phát triển: ${cleanReason.charAt(0).toUpperCase() + cleanReason.slice(1)}`;
      return {
        coachComment: "Tìm ra động lực sâu sắc giúp bạn giữ cam kết đến cùng:",
        goalDraft: strategicReason,
        coreTextToApply: strategicReason,
      };
    }

    if (step.key === "timeBound") {
      if (tone === "empathetic") {
        return {
          coachComment: "Tạo một nhịp điệu thời gian vừa vặn và không gây áp lực cho cuộc sống:",
          goalDraft: `Theo dõi tiến trình trong ${weeksVal} tuần trước khi chốt kết quả. 12 tuần là khoảng thời gian hoàn hảo để chứng kiến sự chuyển hóa nhẹ nhàng.`,
          coreTextToApply: "",
        };
      }
      if (tone === "pragmatic") {
        return {
          coachComment: "Đặt mốc thời gian rõ ràng để tập trung kỷ luật tối đa, không trì hoãn:",
          goalDraft: `Cam kết hoàn thành trong vòng ${weeksVal} tuần tới.`,
          coreTextToApply: "",
        };
      }
      return {
        coachComment: "Đặt mốc thời gian hoàn thành rõ ràng để tập trung hành động:",
        goalDraft: `Cam kết hoàn thành trong vòng ${weeksVal} tuần để tổng kết và ghi nhận sự tiến bộ của bạn.`,
        coreTextToApply: "",
      };
    }

    return {
      coachComment: "Gợi ý cấu trúc mục tiêu cho bước này của bạn:",
      goalDraft: starterPreview,
      coreTextToApply: starterPreview,
    };
  };

  const { coachComment, goalDraft, coreTextToApply } = getPersonaData(selectedTone);

  const typedCommentText = useTypingEffect(coachComment, 6, shouldReduceMotion);
  const typedDraftText = useTypingEffect(goalDraft, 6, shouldReduceMotion);

  const parsedWeeklyHours = Number.parseFloat(smartData.achievable.weekly_time_commitment_hours) || 0;

  const calculateFeasibilityScore = () => {
    const hours = parsedWeeklyHours;
    if (hours === 0) return 0;
    if (hours >= 2 && hours <= 8) return 95;
    if (hours > 8 && hours <= 15) return 80;
    if (hours > 15 && hours <= 25) return 60;
    return 40;
  };

  const feasibilityScore = calculateFeasibilityScore();

  const handleApplyTransformedStarter = () => {
    onApplyStarter(coreTextToApply);

    setTimeout(() => {
      const stepInputs: Record<SmartStepKey, string> = {
        specific: "#smart-specific",
        measurable: "#smart-metric-name",
        achievable: "#smart-weekly-hours-slider",
        relevant: "#smart-relevant-reason",
        timeBound: "#smart-target-weeks-slider, #smart-target-date",
      };

      const targetSelector = stepInputs[step.key];
      const targetElement = targetSelector ? (document.querySelector(targetSelector) as HTMLElement) : null;

      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth", block: "center" });

        const isMobileDevice = window.innerWidth < 1024;
        if (!isMobileDevice) {
          targetElement.focus({ preventScroll: true });
        }

        const originalTransition = targetElement.style.transition;
        const originalBorderColor = targetElement.style.borderColor;
        const originalBoxShadow = targetElement.style.boxShadow;

        targetElement.style.transition = "all 0.25s ease-in-out";
        targetElement.style.borderColor = "rgb(20, 184, 166)"; // Teal-500
        targetElement.style.boxShadow = "0 0 0 4px rgba(20, 184, 166, 0.35)";

        setTimeout(() => {
          targetElement.style.borderColor = originalBorderColor;
          targetElement.style.boxShadow = originalBoxShadow;
          setTimeout(() => {
            targetElement.style.transition = originalTransition;
          }, 250);
        }, 1200);
      } else if (headingRef?.current) {
        headingRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        headingRef.current.focus({ preventScroll: true });
      }
    }, 80);
  };

  const renderPolaroidCard = (isMobile = false) => {
    const areaLabel = smartGoalStarter.specificGoalStatement ? "trọng tâm" : "mục tiêu";
    const bgStyle = hasSomeContent
      ? "bg-[#FCFAF7] dark:bg-[#25221C]"
      : "bg-gradient-to-tr from-[#FCEDE5] via-[#FAF6F0] to-[#E8F0EC] dark:from-[#2E201A] dark:via-[#211F25] dark:to-[#192E28]";

    return (
      <motion.div
        ref={isMobile ? undefined : cardRef}
        onMouseMove={isMobile || shouldReduceMotion ? undefined : handleMouseMove}
        onMouseLeave={isMobile || shouldReduceMotion ? undefined : handleMouseLeave}
        style={
          isMobile || shouldReduceMotion
            ? {}
            : {
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
              }
        }
        className={cn(
          "group relative rounded-sm p-5 sm:p-6 shadow-[4px_10px_30px_rgba(44,38,33,0.08)] select-none border-[12px] border-b-[44px] border-white dark:border-[#2B2923] transition-all duration-300 transform",
          bgStyle,
          isMobile
            ? "max-w-md mx-auto my-4 rotate-[0.5deg]"
            : "rotate-[1deg] hover:rotate-0 hover:shadow-[6px_14px_36px_rgba(44,38,33,0.12)]",
        )}
      >
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-28 h-5.5 bg-app-accent-soft/40 dark:bg-app-accent-soft/20 border-b border-app-line shadow-[0_1px_2px_rgba(0,0,0,0.02)] rotate-[-1.5deg] z-10 backdrop-blur-[0.5px]" />

        <AnimatePresence>
          {isGoldStandard && (
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              className="absolute -top-3.5 -right-3 flex items-center gap-1 rounded-full bg-app-status-warning/15 text-app-status-warning border border-app-status-warning/30 px-3 py-1 text-[10px] font-extrabold shadow-md animate-[pulse_2.2s_infinite] z-25"
            >
              <span>🏆 Chuẩn Vàng</span>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-app-ink-muted mb-3 flex items-center gap-1.5 select-none pointer-events-none">
          <span>✨</span> BẢN PHÁC THẢO TƯƠNG LAI
        </p>

        <div className="text-[14px] sm:text-[15px] leading-relaxed text-app-ink font-serif tracking-wide select-text relative z-20 max-h-[180px] overflow-y-auto pr-1 scrollbar-none">
          Tôi quyết tâm{" "}
          <span
            className={cn(
              "inline-flex items-center px-1 rounded transition-colors duration-200",
              isSpecFilled
                ? "text-teal-800 dark:text-teal-300 font-bold bg-teal-500/5"
                : "text-app-ink-muted italic border-b border-dashed border-app-line bg-app-bg animate-[pulse_2.0s_infinite]",
            )}
          >
            {isSpecFilled ? specText : "hành động cụ thể"}
          </span>
          <span className="text-xs opacity-75 ml-1 select-none">🎯</span>. Tôi sẽ đo lường tiến bộ bằng cách đạt mốc{" "}
          <span
            className={cn(
              "inline-flex items-center px-1 rounded transition-colors duration-200",
              isMeasFilled
                ? "text-blue-800 dark:text-blue-300 font-bold bg-blue-500/5"
                : "text-app-ink-muted italic border-b border-dashed border-app-line bg-app-bg animate-[pulse_2.0s_infinite]",
            )}
          >
            {isMeasFilled ? `${measTarget} ${measUnit || "đơn vị"}` : "chỉ số"}
          </span>
          <span className="text-xs opacity-75 ml-1 select-none">📊</span>. Tôi cam kết dành ra{" "}
          <span
            className={cn(
              "inline-flex items-center px-1 rounded transition-colors duration-200",
              isAchFilled
                ? "text-amber-800 dark:text-amber-300 font-bold bg-amber-50/5"
                : "text-app-ink-muted italic border-b border-dashed border-app-line bg-app-bg animate-[pulse_2.0s_infinite]",
            )}
          >
            {isAchFilled ? `${achHours} giờ mỗi tuần` : "thời gian cam kết"}
          </span>
          <span className="text-xs opacity-75 ml-1 select-none">⚡</span> để thực hiện. Việc này quan trọng vì{" "}
          <span
            className={cn(
              "inline-flex items-center px-1 rounded transition-colors duration-200",
              isRelFilled
                ? "text-rose-800 dark:text-rose-350 font-bold bg-rose-50/5"
                : "text-app-ink-muted italic border-b border-dashed border-app-line bg-app-bg animate-[pulse_2.0s_infinite]",
            )}
          >
            {isRelFilled ? relReason : "lý do của bạn"}
          </span>
          <span className="text-xs opacity-75 ml-1 select-none">❤️</span> và hoàn thành trước{" "}
          <span
            className={cn(
              "inline-flex items-center px-1 rounded transition-colors duration-200",
              isTimeFilled
                ? "text-purple-800 dark:text-purple-300 font-bold bg-purple-500/5"
                : "text-app-ink-muted italic border-b border-dashed border-app-line bg-app-bg animate-[pulse_2.0s_infinite]",
            )}
          >
            {isTimeFilled ? timeDate : "ngày hoàn thành"}
          </span>
          <span className="text-xs opacity-75 ml-1 select-none">📅</span>.
        </div>

        {!isMobile && !shouldReduceMotion && (
          <motion.div
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              background: glareBg,
            }}
          />
        )}

        <div className="absolute -bottom-9 left-2 right-2 flex items-center justify-between text-[10px] font-serif italic tracking-wide select-none px-1.5 z-20">
          <a
            href="https://deerflow.tech"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline opacity-80 hover:opacity-100 transition-opacity font-bold text-[#5C3A2E] dark:text-[#A39B8C]"
          >
            ✦ Deerflow
          </a>
          <span className="font-bold text-[#5C3A2E] dark:text-[#A39B8C] flex items-center gap-0.5">
            <span>✦</span> {areaLabel} <span>✦</span>
          </span>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="w-full animate-[fade-in_0.3s_ease-out]">
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-4px); }
          40%, 80% { transform: translateX(4px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
        .sketchbook-paper {
          background-image: linear-gradient(var(--app-line) 1px, transparent 1px);
          background-size: 100% 2.5rem;
          line-height: 2.5rem;
        }
        .vintage-washi {
          position: absolute;
          width: 80px;
          height: 22px;
          background-color: rgba(224, 212, 196, 0.45);
          backdrop-filter: blur(0.5px);
          border: 1px dashed rgba(44, 38, 33, 0.12);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.01);
          z-index: 25;
          pointer-events: none;
        }
        .vintage-washi-top-left {
          top: -6px;
          left: -12px;
          transform: rotate(-10deg);
        }
        .vintage-washi-top-right {
          top: -6px;
          right: -12px;
          transform: rotate(10deg);
        }
        .notebook-spiral {
          background-image: radial-gradient(circle, var(--app-line-strong) 4px, transparent 4.5px);
          background-size: 8px 24px;
          width: 8px;
          height: calc(100% - 32px);
          position: absolute;
          left: 14px;
          top: 16px;
          opacity: 0.65;
          z-index: 10;
          pointer-events: none;
        }
        .page-flip-effect {
          transform: perspective(1000px) rotateY(-4deg) translateX(1px);
          opacity: 0.95;
        }
      `}</style>
      {showConfetti && !shouldReduceMotion && <ConfettiCanvas />}

      <AnimatePresence>
        {showStickyMini && (
          <motion.div
            initial={{ y: -65, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -65, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed top-0 left-0 right-0 z-45 bg-app-surface/90 border-b border-app-line backdrop-blur-md px-4 py-3 shadow-md flex items-center justify-between gap-3 lg:hidden"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-app-accent mb-0.5 select-none flex items-center gap-1">
                <span>🎯</span> Live Preview
              </p>
              <p className="text-xs truncate font-serif italic text-app-ink-soft leading-normal">
                Quyết tâm {isSpecFilled ? specText : "..."} 🎯. Đo lường:{" "}
                {isMeasFilled ? `${measTarget} ${measUnit}` : "..."} 📊.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-app-accent-soft px-2.5 py-0.5 text-[10px] font-bold text-app-accent">
              Bước {stepIndex + 1}/{totalSteps}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-[1.18fr_0.82fr] gap-6 lg:gap-8 items-start">
        <div
          className={cn(
            "min-w-0 space-y-6 rounded-card border border-[#E8E3D9] bg-[#FDFBF9] dark:bg-[#23211B] p-5 sm:p-7 sm:pl-12 relative shadow-[4px_4px_20px_rgba(44,38,33,0.05)] overflow-hidden transition-all duration-200 transform-gpu",
            isPageFlipping && !shouldReduceMotion && "page-flip-effect",
          )}
        >
          {/* Lò xo gáy sổ tay cổ điển */}
          <div className="hidden sm:block notebook-spiral" aria-hidden="true" />

          {/* Băng dính Washi trang trí vintage */}
          <div className="vintage-washi vintage-washi-top-left" aria-hidden="true" />
          <div className="vintage-washi vintage-washi-top-right" aria-hidden="true" />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-app-accent flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-app-accent animate-pulse" />
                Bước {stepIndex + 1}: {STEP_NAMES[step.key]}
              </p>
              <h2
                id="smart-step-title"
                ref={headingRef}
                tabIndex={-1}
                className="mt-2 font-serif text-2xl sm:text-3xl font-medium leading-8 text-app-ink focus:outline-none"
              >
                {step.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-app-ink-soft">{step.description}</p>
            </div>
            <span className="inline-flex w-fit rounded-full bg-app-accent-soft px-3 py-1 text-xs font-bold text-app-accent shadow-sm border border-app-accent/10">
              {stepIndex + 1}/{totalSteps}
            </span>
          </div>

          <div className="relative mt-4">
            <div
              className="absolute top-[22px] left-[10%] right-[10%] h-[3px] bg-app-line rounded-full z-0 overflow-hidden"
              aria-hidden="true"
            >
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-app-accent transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]"
                style={{ width: `${(stepIndex / (totalSteps - 1)) * 100}%` }}
              />
            </div>

            <ol
              aria-label={`Bước ${stepIndex + 1} trên ${totalSteps}`}
              className="relative z-10 grid grid-cols-5 gap-2"
            >
              {SMART_STEPS.map((smartStep, index) => {
                const isActive = index === stepIndex;
                const isDone = index < stepIndex;
                const canJump = index <= stepIndex;
                const StepIcon = STEP_ICONS[smartStep.key];

                return (
                  <li key={smartStep.key} aria-current={isActive ? "step" : undefined}>
                    <button
                      type="button"
                      disabled={!canJump}
                      onClick={() => handleWizardJump(index)}
                      className={cn(
                        "flex h-full w-full flex-col items-center gap-1.5 rounded-[16px] border p-2.5 transition-all duration-205 outline-none focus-visible:ring-3 focus-visible:ring-app-accent/30 cursor-pointer",
                        isActive
                          ? "border-app-accent bg-app-accent-soft text-app-accent scale-[1.03] shadow-sm"
                          : isDone
                            ? "border-app-accent/30 bg-app-accent text-white hover:bg-app-accent hover:scale-[1.02] active:scale-[0.97]"
                            : "border-app-line bg-app-bg text-app-ink-muted hover:bg-app-accent-soft/30 hover:text-app-accent active:scale-[0.97] disabled:cursor-default",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300",
                          isActive
                            ? "bg-app-accent text-white shadow-[0_0_8px_rgba(var(--color-accent-rgb),0.4)]"
                            : isDone
                              ? "bg-white/20 text-white"
                              : "bg-app-surface text-app-ink-muted border border-app-line",
                        )}
                      >
                        <StepIcon className="h-4 w-4" />
                      </span>
                      <span className="text-[10px] font-bold tracking-widest uppercase">
                        {STEP_LETTERS[smartStep.key]}
                      </span>
                      <span className="hidden truncate text-xs font-semibold sm:block">
                        {STEP_NAMES[smartStep.key]}
                      </span>
                      {isDone ? <span className="sr-only">đã hoàn thành</span> : null}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="my-6 h-px bg-app-line" aria-hidden="true" />

          <AnimatePresence mode="wait">
            <motion.div
              key={stepIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-5"
            >
              {/* Polaroid Live Preview hiển thị ở trên cùng trên mobile dưới dạng collapsible */}
              <div className="block lg:hidden select-none mb-3">
                {step.key === "timeBound" ? (
                  renderPolaroidCard(true)
                ) : (
                  <div className="rounded-xl border border-app-line bg-app-surface overflow-hidden shadow-sm">
                    <button
                      type="button"
                      onClick={() => setIsPolaroidExpanded(!isPolaroidExpanded)}
                      className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-app-ink-soft hover:bg-app-bg transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:outline-none"
                    >
                      <span className="flex items-center gap-2">
                        📸 <span>Bản phác thảo Polaroid {isSpecFilled ? "(Đã cập nhật)" : "(Chưa có nội dung)"}</span>
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-app-ink-muted transition-transform duration-200",
                          isPolaroidExpanded && "rotate-180",
                        )}
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {isPolaroidExpanded && (
                        <motion.div
                          initial="collapsed"
                          animate="open"
                          exit="collapsed"
                          variants={{
                            open: { opacity: 1, height: "auto" },
                            collapsed: { opacity: 0, height: 0 },
                          }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                          className="overflow-hidden border-t border-app-line p-3 bg-app-bg/30"
                        >
                          {renderPolaroidCard(true)}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {children}

              {/* Cố vấn mục tiêu AI tích hợp sẵn, hiển thị nhẹ nhàng */}
              <div className="relative overflow-hidden rounded-card border border-dashed border-app-line bg-[#FAF7F2]/45 dark:bg-[#1E1D18]/25 p-4 space-y-3 shadow-none">
                <button
                  type="button"
                  onClick={() => setIsAiCoachExpanded(!isAiCoachExpanded)}
                  className="w-full flex items-center justify-between border-b border-app-line pb-2 text-left cursor-pointer focus-visible:ring-2 focus-visible:ring-app-accent/35 focus-visible:outline-none focus-visible:rounded-sm"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-app-accent animate-[pulse_2s_infinite]" />
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-app-accent">
                      Cố vấn mục tiêu AI ·{" "}
                      {selectedTone === "empathetic"
                        ? "Ấm áp"
                        : selectedTone === "pragmatic"
                          ? "Thực tế"
                          : "Chiến lược"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-app-ink-muted hidden sm:inline">
                      {isAiCoachExpanded ? "Thu gọn gợi ý" : "Xem gợi ý"}
                    </span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-app-ink-muted transition-transform duration-200",
                        isAiCoachExpanded && "rotate-180",
                      )}
                    />
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isAiCoachExpanded && (
                    <motion.div
                      initial="collapsed"
                      animate="open"
                      exit="collapsed"
                      variants={{
                        open: { opacity: 1, height: "auto" },
                        collapsed: { opacity: 0, height: 0 },
                      }}
                      transition={{ duration: 0.2, ease: "easeInOut" }}
                      className="space-y-3 overflow-hidden pt-1"
                    >
                      {/* Selector chọn giọng điệu nhỏ gọn */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-app-line/40 pb-2.5">
                        <span className="text-[10px] font-bold text-app-ink-soft">Chọn giọng điệu:</span>
                        <div className="flex items-center gap-1.5 text-app-ink-muted">
                          {(["empathetic", "pragmatic", "strategic"] as const).map((tone, idx) => {
                            const isActive = selectedTone === tone;
                            const toneLabel =
                              tone === "empathetic" ? "Ấm áp" : tone === "pragmatic" ? "Thực tế" : "Chiến lược";
                            return (
                              <span key={tone} className="flex items-center">
                                {idx > 0 && <span className="mr-1.5 opacity-40">|</span>}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTone(tone);
                                  }}
                                  className={cn(
                                    "font-bold transition-all duration-150 hover:text-app-accent cursor-pointer text-[10px] py-1 px-2 focus-visible:ring-1 focus-visible:ring-app-accent/50 focus-visible:outline-none focus-visible:rounded-sm",
                                    isActive
                                      ? "text-app-accent underline decoration-2 underline-offset-2"
                                      : "text-app-ink-muted",
                                  )}
                                >
                                  {toneLabel}
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <p className="text-xs text-app-ink-soft leading-relaxed italic">{typedCommentText}</p>

                        {typedDraftText && (
                          <div className="relative rounded-lg border-l-2 border-[#D97756] bg-[#FCEDE5]/35 dark:bg-[#3A2820]/30 px-3.5 py-2.5 shadow-none">
                            <p className="font-serif italic text-sm leading-relaxed text-[#5C3A2E] dark:text-[#F8D5C2] select-text">
                              “{typedDraftText}”
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApplyTransformedStarter();
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-app-accent/20 bg-app-accent-soft/30 hover:bg-app-accent-soft/50 text-app-accent px-3 py-1.5 text-[11px] font-bold transition-all duration-150 active:scale-[0.98] cursor-pointer focus-visible:ring-2 focus-visible:ring-app-accent/50 focus-visible:outline-none"
                          aria-label={`Dùng gợi ý cho bước ${step.label}`}
                        >
                          <Sparkles className="h-3 w-3" />
                          Dùng gợi ý này
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Nút điều hướng tĩnh cho Desktop */}
              <div className="mt-6 hidden lg:flex lg:flex-row lg:justify-between lg:gap-3 border-t border-app-line pt-5">
                <motion.button
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  type="button"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-app-line bg-app-surface px-5 py-2.5 text-sm font-medium text-app-ink-soft transition-all duration-200 hover:bg-app-bg hover:text-app-ink active:scale-[0.97] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-app-accent/35 sm:w-auto cursor-pointer font-sans"
                  onClick={onBack}
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                  Quay lại
                </motion.button>
                {showFinalSecondaryCta ? (
                  <motion.button
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.985 }}
                    type="button"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-app-line bg-app-surface px-5 py-2.5 text-sm font-bold text-app-ink transition-all duration-200 hover:bg-app-bg hover:text-app-accent active:scale-[0.97] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-app-accent/35 sm:w-auto cursor-pointer font-sans"
                    onClick={handleFinalSecondaryClick}
                  >
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    {finalSecondaryCtaLabel}
                  </motion.button>
                ) : null}
                <motion.button
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  type="button"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-app-accent px-6 py-2.5 text-sm font-bold text-white shadow-app-sm hover:bg-app-accent-hover hover:shadow-app-md active:scale-[0.97] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-app-accent/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg)] sm:w-auto transition-all duration-200 cursor-pointer font-sans"
                  onClick={handleNextClick}
                >
                  {primaryCtaLabel}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </motion.button>
              </div>

              {/* Sticky Bottom CTA cho Mobile */}
              <div className="fixed bottom-0 left-0 right-0 z-40 p-4 border-t border-app-line bg-app-surface/90 backdrop-blur-md shadow-lg flex flex-col gap-3 lg:hidden">
                <div className="flex justify-between gap-3">
                  <button
                    type="button"
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-app-line bg-app-surface py-3 text-sm font-medium text-app-ink-soft transition-all duration-200 hover:bg-app-bg active:scale-[0.97] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-app-accent/35 cursor-pointer font-sans"
                    onClick={onBack}
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Quay lại
                  </button>
                  <button
                    type="button"
                    className="flex-[2] inline-flex items-center justify-center gap-2 rounded-xl bg-app-accent py-3 text-sm font-bold text-white shadow-app-sm hover:bg-app-accent-hover active:scale-[0.97] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-app-accent/35 transition-all duration-200 cursor-pointer font-sans"
                    onClick={handleNextClick}
                  >
                    {primaryCtaLabel}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                {showFinalSecondaryCta ? (
                  <button
                    type="button"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-app-line bg-app-surface py-2.5 text-sm font-bold text-app-ink transition-all duration-200 hover:bg-app-bg active:scale-[0.97] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-app-accent/35 cursor-pointer font-sans"
                    onClick={handleFinalSecondaryClick}
                  >
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    {finalSecondaryCtaLabel}
                  </button>
                ) : null}
              </div>

              {currentStepError && (
                <div
                  className="rounded-xl border border-rose-200/20 bg-rose-50/50 dark:bg-rose-950/10 px-4 py-2 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 select-none"
                  role="alert"
                >
                  <CircleAlert className="h-3.5 w-3.5 shrink-0 text-rose-500" aria-hidden="true" />
                  <span className="font-semibold">{currentStepError}</span>
                </div>
              )}

              {currentStepSoftWarning && (
                <div
                  className="rounded-xl border border-app-line bg-app-bg p-4 text-app-ink-soft shadow-sm animate-[fade-in_0.3s_ease-out]"
                  role="note"
                >
                  <div className="flex items-start gap-2.5">
                    <Lightbulb className="mt-0.5 h-4.5 w-4.5 shrink-0 text-app-accent" aria-hidden="true" />
                    <div>
                      <p className="text-sm font-semibold text-app-ink">Gợi ý để mục tiêu rõ hơn</p>
                      <p className="mt-1 text-sm leading-5">{currentStepSoftWarning}</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="hidden lg:block lg:sticky lg:top-6 space-y-6">
          {renderPolaroidCard(false)}

          {/* Đã loại bỏ ảnh minh họa tĩnh để tối giản hóa thiết kế theo docs/DESIGN.md */}

          {/* Clarity Compass */}
          <div className="rounded-2xl border border-[#E8E3D9] bg-[#FCFAF7] dark:bg-[#25221C] p-5 shadow-[2px_4px_16px_rgba(44,38,33,0.02)] space-y-4">
            <div className="flex items-center gap-3.5">
              {/* Compass SVG */}
              <div className="relative w-16 h-16 shrink-0 rounded-full border border-[#E8E3D9] bg-app-surface flex items-center justify-center shadow-inner select-none pointer-events-none">
                {/* Các vạch la bàn */}
                <div className="absolute inset-1 rounded-full border border-dashed border-[#E8E3D9]/60 opacity-60" />
                {/* Hướng Bắc Nam */}
                <span className="absolute top-0.5 text-[7px] font-bold text-app-ink-muted">N</span>
                <span className="absolute bottom-0.5 text-[7px] font-bold text-app-ink-muted">S</span>

                {/* Kim la bàn */}
                <motion.div
                  style={{ rotate: shouldReduceMotion ? clarityProgress * 2.7 - 135 : 0 }}
                  animate={shouldReduceMotion ? {} : { rotate: clarityProgress * 2.7 - 135 }}
                  transition={{ type: "spring", stiffness: 80, damping: 15 }}
                  className="w-1 h-12 relative flex justify-center z-10"
                >
                  {/* Kim nhọn phía trên (đỏ gạch ấm) */}
                  <div className="w-1 h-6 bg-[#D97756] rounded-t-full shadow-sm" />
                  {/* Kim nhọn phía dưới (mực sẫm) */}
                  <div className="w-1 h-6 bg-app-ink-muted rounded-b-full" />
                  {/* Tâm đồng */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-amber-600 border border-white shadow-sm z-20" />
                </motion.div>
              </div>

              <div className="space-y-1 flex-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-app-ink-soft">
                  La bàn Định Hướng (Clarity)
                </h3>
                <div className="flex items-baseline gap-1.5">
                  <span className="font-serif text-2xl font-bold text-app-accent">{Math.round(clarityProgress)}%</span>
                  <span className="text-[10px] text-app-ink-muted font-medium">
                    ({clarityDoneCount}/{clarityItems.length} tiêu chí vàng)
                  </span>
                </div>
              </div>
            </div>

            {/* Các tiêu chí click chuyển step */}
            <div className="grid gap-2 border-t border-[#E8E3D9]/60 pt-3">
              {clarityItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onJumpToStep(item.stepKey)}
                  className={cn(
                    "group/btn flex items-center justify-between rounded-xl border px-3 py-2 text-left transition-all duration-200 text-xs w-full cursor-pointer",
                    item.done
                      ? "border-app-accent/15 bg-app-accent-soft/20 text-app-accent"
                      : "border-app-line bg-app-bg text-app-ink-soft hover:border-app-ink-muted",
                  )}
                >
                  <span className="font-medium group-hover/btn:underline">{item.label}</span>
                  <div
                    className={cn(
                      "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border",
                      item.done
                        ? "border-app-accent bg-app-accent text-white"
                        : "border-app-ink-muted/30 text-transparent",
                    )}
                  >
                    {item.done ? <Check className="h-2.5 w-2.5" /> : null}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {isAchFilled && (
            <div className="rounded-2xl border border-[#E8E3D9] bg-[#FCFAF7] dark:bg-[#25221C] p-5 shadow-[2px_4px_16px_rgba(44,38,33,0.02)] space-y-3.5 select-none">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-app-ink-soft">Ống nghiệm Khả thi</span>
                <span className="font-serif text-lg font-bold text-teal-600">{feasibilityScore}%</span>
              </div>

              {/* Ống nghiệm thủy tinh */}
              <div className="relative h-6 w-full rounded-full border-2 border-app-line-strong bg-app-bg-subtle p-[2px] overflow-hidden shadow-inner flex items-center">
                {/* Vạch chia độ của ống nghiệm */}
                <div
                  className="absolute inset-0 z-10 pointer-events-none opacity-20 dark:opacity-30"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(90deg, transparent, transparent 14px, #4A4A4A 14px, #4A4A4A 15px)",
                  }}
                />

                <motion.div
                  style={{ width: 0 }}
                  animate={{ width: `${feasibilityScore}%` }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.8, ease: "easeOut" }}
                  className={cn(
                    "h-full rounded-full bg-gradient-to-r transition-colors duration-500 shadow-[0_0_8px_rgba(20,184,166,0.35)] relative overflow-hidden",
                    feasibilityScore >= 80
                      ? "from-emerald-400 to-teal-500"
                      : feasibilityScore >= 60
                        ? "from-amber-400 to-emerald-500"
                        : "from-rose-400 to-amber-500",
                  )}
                >
                  {/* Bọt khí chuyển động nhẹ */}
                  {!shouldReduceMotion && (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.2)_0%,transparent_70%)] animate-[pulse_2s_infinite]" />
                  )}
                </motion.div>
              </div>

              <p className="text-[11px] text-app-ink-muted leading-relaxed font-medium">
                Dành khoảng <span className="font-bold text-app-ink">{parsedWeeklyHours} giờ/tuần</span>. Mức độ thời
                gian khả thi giúp bạn tránh kiệt sức và dễ giữ nhịp bền bỉ hơn.
              </p>
            </div>
          )}

          {showReview && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <ReviewStep
                clarityDoneCount={clarityDoneCount}
                clarityItemCount={clarityItems.length}
                summaryRows={summaryRows}
                onJumpToStep={onJumpToStep}
              />
              {qualityFeedback && (
                <QualityFeedbackPanel
                  level={qualityFeedback.level}
                  overallScore={qualityFeedback.overallScore}
                  warnings={qualityFeedback.warnings}
                  suggestions={qualityFeedback.suggestions}
                  canProceedToFeasibility={qualityFeedback.canProceedToFeasibility}
                />
              )}
            </motion.div>
          )}
        </div>
      </div>

      {!showReview && (
        <details className="mt-6 group rounded-[16px] border border-app-line bg-app-surface p-4 transition-all duration-200 shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 rounded-lg p-1 [&::-webkit-details-marker]:hidden">
            <p className="flex items-center gap-2 font-semibold">
              Xem chi tiết nội dung đang viết
              <ChevronDown className="h-4 w-4 text-app-ink-muted transition-transform duration-200 group-open:rotate-180" />
            </p>
          </summary>
          <div className="mt-4 grid gap-3 border-t border-app-line pt-4 sm:grid-cols-2 lg:grid-cols-3">
            {SMART_STEPS.map((stepItem) => (
              <div key={stepItem.key} className="rounded-xl border border-app-line bg-app-bg p-3.5 text-xs">
                <p className="font-extrabold uppercase tracking-wider text-app-accent mb-1">{stepItem.label}</p>
                <p className="leading-relaxed text-app-ink-soft">
                  {formatStepDraft(stepItem.key, smartData) || "Chưa có nội dung..."}
                </p>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
