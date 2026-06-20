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
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
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

    return (
      <div
        className={cn(
          "relative rounded-[16px] border border-[rgba(23,21,15,0.08)] dark:border-app-line bg-[#FCFBF6] dark:bg-app-surface p-5 shadow-[0_14px_32px_-26px_rgba(23,21,15,0.4)]",
          isMobile ? "max-w-md mx-auto my-4" : "",
        )}
      >
        <AnimatePresence>
          {isGoldStandard && (
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              className="absolute -top-2.5 -right-2.5 flex items-center gap-1 rounded-full bg-[#9A7B00]/10 text-[#9A7B00] dark:text-[#E7B400] border border-[#D6B228]/30 px-2.5 py-0.5 text-[10px] font-extrabold z-25"
            >
              ★ Chuẩn vàng
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#9A7B00] dark:text-[#E7B400] mb-3 flex items-center gap-1.5 select-none">
          ✦ Bản phác thảo tương lai
        </p>

        <div className="text-[13px] leading-[1.85] text-[#17150F] dark:text-app-ink select-text max-h-[180px] overflow-y-auto pr-1">
          Tôi quyết tâm{" "}
          <span
            className={cn(
              "inline rounded-[6px] px-1 transition-colors duration-200",
              isSpecFilled
                ? "text-[#0C5E3A] font-bold bg-[#EAF5DD]"
                : "text-[#A8A296] dark:text-app-ink-muted border-b border-dashed border-[#A8A296]",
            )}
          >
            {isSpecFilled ? specText : "hành động cụ thể"}
          </span>
          🎯. Tôi sẽ đo lường tiến bộ bằng cách đạt mốc{" "}
          <span
            className={cn(
              "inline rounded-[6px] px-1 transition-colors duration-200",
              isMeasFilled
                ? "text-[#0C5E3A] font-bold bg-[#EDF7E0]"
                : "text-[#A8A296] dark:text-app-ink-muted border-b border-dashed border-[#A8A296]",
            )}
          >
            {isMeasFilled ? `${measTarget} ${measUnit || "đơn vị"}` : "chỉ số"}
          </span>
          📊. Tôi cam kết dành ra{" "}
          <span
            className={cn(
              "inline rounded-[6px] px-1 transition-colors duration-200",
              isAchFilled
                ? "text-[#0C5E3A] font-bold bg-[#EAF5DD]"
                : "text-[#A8A296] dark:text-app-ink-muted border-b border-dashed border-[#A8A296]",
            )}
          >
            {isAchFilled ? `${achHours} giờ mỗi tuần` : "thời gian cam kết"}
          </span>
          ⚡ để thực hiện. Việc này quan trọng vì{" "}
          <span
            className={cn(
              "inline rounded-[6px] px-1 transition-colors duration-200",
              isRelFilled
                ? "text-[#C2410C] font-bold bg-[#FBEAE2]"
                : "text-[#A8A296] dark:text-app-ink-muted border-b border-dashed border-[#A8A296]",
            )}
          >
            {isRelFilled ? relReason : "lý do của bạn"}
          </span>
          ❤️ và hoàn thành trước{" "}
          <span
            className={cn(
              "inline rounded-[6px] px-1 transition-colors duration-200",
              isTimeFilled
                ? "text-[#6D5BD0] font-bold bg-[#ECE9FB]"
                : "text-[#A8A296] dark:text-app-ink-muted border-b border-dashed border-[#A8A296]",
            )}
          >
            {isTimeFilled ? timeDate : "ngày hoàn thành"}
          </span>
          📅.
        </div>

        <div className="mt-4 pt-3 border-t border-[rgba(23,21,15,0.06)] dark:border-app-line flex items-center justify-between text-[10px] font-bold select-none">
          <span className="text-[#5C574B] dark:text-app-ink-soft">★ Dear Our Future</span>
          <span className="text-[#A8A296] dark:text-app-ink-muted flex items-center gap-1">
            ✦ {areaLabel} ✦
          </span>
        </div>
      </div>
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
            className="fixed top-0 left-0 right-0 z-45 bg-white/90 dark:bg-app-surface/90 border-b border-[rgba(23,21,15,0.07)] dark:border-app-line backdrop-blur-md px-4 py-3 shadow-sm flex items-center justify-between gap-3 lg:hidden"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#0C5E3A] mb-0.5 select-none flex items-center gap-1">
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

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_348px] gap-[18px] items-start">
        <div
          className={cn(
            "relative min-w-0 space-y-6 rounded-[22px] border border-[rgba(23,21,15,0.08)] dark:border-app-line bg-white dark:bg-app-surface p-6 sm:p-7 sm:pl-12 shadow-[0_18px_40px_-32px_rgba(23,21,15,0.4)] overflow-hidden transition-all duration-200",
            isPageFlipping && !shouldReduceMotion && "page-flip-effect",
          )}
        >
          <div
            className="absolute left-0 top-0 bottom-0 w-[30px] border-r border-[rgba(23,21,15,0.05)] dark:border-app-line"
            style={{
              backgroundImage: "radial-gradient(circle, #D8D3C5 1.6px, transparent 1.8px)",
              backgroundSize: "22px 17px",
              backgroundPosition: "center 14px",
            }}
            aria-hidden="true"
          />

          <div className="flex items-start justify-between gap-3.5 mb-1">
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#0C5E3A] flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[#0C5E3A]" />
                {STEP_NAMES[step.key]}
              </p>
              <h2
                id="smart-step-title"
                ref={headingRef}
                tabIndex={-1}
                className="mt-1.5 text-[25px] font-extrabold leading-[1.12] tracking-[-0.02em] text-[#17150F] dark:text-app-ink focus:outline-none"
                style={{ fontFamily: "'Bricolage Grotesque', serif" }}
              >
                {step.title}
              </h2>
              <p className="mt-2 text-[13.5px] leading-[1.55] text-[#5C574B] dark:text-app-ink-soft max-w-[52ch]">{step.description}</p>
            </div>
            <span className="inline-flex shrink-0 rounded-full bg-[#EDF7E0] px-2.5 py-0.5 text-xs font-semibold text-[#0C5E3A] border border-[#0C5E3A]/10">
              {stepIndex + 1}/{totalSteps}
            </span>
          </div>

          <div className="relative mt-5">
            <div
              className="absolute top-[22px] left-[10%] right-[10%] h-[3px] bg-[#E4E0D4] rounded-full z-0 overflow-hidden"
              aria-hidden="true"
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  background: "linear-gradient(90deg, #0C5E3A, #16A34A)",
                  width: `${(stepIndex / (totalSteps - 1)) * 100}%`,
                }}
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
                        "flex h-full w-full flex-col items-center gap-2 rounded-[14px] border py-3.5 px-1.5 transition-all duration-150 outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 cursor-pointer hover:-translate-y-0.5",
                        isActive
                          ? "border-[1.5px] border-[#0C5E3A] bg-[#E9F3DF] shadow-[0_8px_20px_-14px_rgba(12,94,58,0.7)]"
                          : isDone
                            ? "border-[#0C5E3A] bg-[#0C5E3A] text-white"
                            : "border border-[rgba(23,21,15,0.1)] dark:border-app-line bg-white dark:bg-app-surface text-[#8C887C] dark:text-app-ink-muted",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-[34px] w-[34px] items-center justify-center rounded-full transition-all duration-300",
                          isActive
                            ? "bg-white dark:bg-app-surface text-[#0C5E3A]"
                            : isDone
                              ? "bg-white/20 text-[#C6F24E]"
                              : "bg-[#F2EFE6] dark:bg-app-bg-subtle text-[#A8A296] dark:text-app-ink-muted",
                        )}
                      >
                        <StepIcon className="h-[17px] w-[17px]" />
                      </span>
                      <span
                        className={cn(
                          "font-extrabold text-[13px] leading-none",
                          isActive
                            ? "text-[#0C5E3A]"
                            : isDone
                              ? "text-white"
                              : "text-[#8C887C] dark:text-app-ink-muted",
                        )}
                        style={{ fontFamily: "'Bricolage Grotesque', serif" }}
                      >
                        {STEP_LETTERS[smartStep.key]}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-semibold truncate",
                          isActive
                            ? "text-[#0C5E3A]"
                            : isDone
                              ? "text-[#EAF6DD]"
                              : "text-[#A8A296] dark:text-app-ink-muted",
                        )}
                      >
                        {STEP_NAMES[smartStep.key]}
                      </span>
                      {isDone ? <span className="sr-only">đã hoàn thành</span> : null}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="my-5 h-px bg-[rgba(23,21,15,0.08)]" aria-hidden="true" />

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
                  <div className="rounded-card border border-app-line bg-app-surface overflow-hidden shadow-sm">
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
              <div className="relative overflow-hidden rounded-[16px] border border-dashed border-[rgba(23,21,15,0.1)] dark:border-app-line bg-[#FBF6EC] dark:bg-app-bg-subtle p-4 space-y-3">
                <button
                  type="button"
                  onClick={() => setIsAiCoachExpanded(!isAiCoachExpanded)}
                  className="w-full flex items-center justify-between pb-2 text-left cursor-pointer focus-visible:ring-2 focus-visible:ring-app-accent/35 focus-visible:outline-none focus-visible:rounded-sm"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-[#C6F24E] animate-[pulse_2s_infinite]" />
                    <span className="text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#9A7B00] dark:text-[#E7B400]">
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
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[rgba(23,21,15,0.06)] dark:border-app-line pb-2.5">
                        <span className="text-[11px] font-bold text-[#5C574B] dark:text-app-ink-soft">Chọn giọng điệu:</span>
                        <div className="flex items-center gap-1.5">
                          {(["empathetic", "pragmatic", "strategic"] as const).map((tone, idx) => {
                            const isActive = selectedTone === tone;
                            const toneLabel =
                              tone === "empathetic" ? "Ấm áp" : tone === "pragmatic" ? "Thực tế" : "Chiến lược";
                            return (
                              <span key={tone} className="flex items-center">
                                {idx > 0 && <span className="mr-1.5 text-[#A8A296] dark:text-app-ink-muted">|</span>}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTone(tone);
                                  }}
                                  className={cn(
                                    "font-bold transition-all duration-150 hover:text-[#9A7B00] dark:text-[#E7B400] cursor-pointer text-[11px] py-1 px-2 focus-visible:ring-1 focus-visible:ring-app-accent/50 focus-visible:outline-none focus-visible:rounded-sm",
                                    isActive
                                      ? "text-[#9A7B00] dark:text-[#E7B400] underline decoration-2 underline-offset-2"
                              : "text-[#A8A296] dark:text-app-ink-muted",
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
                        <p className="text-[12.5px] text-[#5C574B] dark:text-app-ink-soft leading-relaxed italic">{typedCommentText}</p>

                        {typedDraftText && (
                          <div className="relative rounded-[13px] border-l-[3px] border-[#9A7B00] dark:border-[#E7B400] bg-[#FFF8DE] dark:bg-[#2A2410]/50 px-3.5 py-2.5 shadow-none">
                            <p className="text-[12.5px] leading-relaxed text-[#5C574B] dark:text-app-ink-soft select-text italic">
                              "{typedDraftText}"
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
                          className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(154,123,0,0.2)] bg-[#FFF8DE] dark:bg-[#2A2410]/70 hover:bg-[#FFF8DE] dark:bg-[#2A2410] text-[#9A7B00] dark:text-[#E7B400] px-4 py-2 text-[12px] font-bold transition-all duration-150 active:scale-[0.98] cursor-pointer focus-visible:ring-2 focus-visible:ring-app-accent/50 focus-visible:outline-none"
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
              <div className="mt-6 hidden lg:flex lg:flex-row lg:justify-between lg:gap-3 border-t border-[rgba(23,21,15,0.08)] dark:border-app-line pt-5">
                <motion.button
                  whileHover={{ scale: 1.015 }}
                  whileTap={{ scale: 0.985 }}
                  type="button"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[11px] border border-[rgba(23,21,15,0.1)] dark:border-app-line bg-white dark:bg-app-surface px-5 py-2.5 text-[13px] font-semibold text-[#5C574B] dark:text-app-ink-soft transition-all duration-200 hover:bg-[#FAF8F3] dark:hover:bg-app-bg-subtle active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C5E3A]/35 sm:w-auto cursor-pointer"
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
                  onClick={handleFinalSecondaryClick}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[11px] border border-[rgba(23,21,15,0.1)] dark:border-app-line bg-white dark:bg-app-surface px-5 py-2.5 text-[13px] font-semibold text-[#17150F] dark:text-app-ink transition-all duration-200 hover:bg-[#FAF8F3] dark:hover:bg-app-bg-subtle active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C5E3A]/35 sm:w-auto cursor-pointer"
                >
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    {finalSecondaryCtaLabel}
                  </motion.button>
                ) : null}
                <motion.button
                  whileHover={{ scale: 1.015, y: -2 }}
                  whileTap={{ scale: 0.985 }}
                  type="button"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-[11px] bg-[#0C5E3A] px-6 py-2.5 text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(12,94,58,0.3)] hover:shadow-[0_18px_36px_-14px_rgba(12,94,58,0.7)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C5E3A]/35 focus-visible:ring-offset-2 sm:w-auto transition-all duration-200 cursor-pointer"
                  onClick={handleNextClick}
                >
                  {primaryCtaLabel}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </motion.button>
              </div>

              {/* Sticky Bottom CTA cho Mobile */}
              <div className="fixed bottom-0 left-0 right-0 z-40 p-4 border-t border-[rgba(23,21,15,0.08)] dark:border-app-line bg-white/90 dark:bg-app-surface/90 backdrop-blur-md shadow-lg flex flex-col gap-3 lg:hidden">
                <div className="flex justify-between gap-3">
                  <button
                    type="button"
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-[11px] border border-[rgba(23,21,15,0.1)] dark:border-app-line bg-white dark:bg-app-surface py-3 text-[13px] font-semibold text-[#5C574B] dark:text-app-ink-soft transition-all duration-200 hover:bg-[#FAF8F3] dark:hover:bg-app-bg-subtle active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C5E3A]/35 cursor-pointer"
                    onClick={onBack}
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    Quay lại
                  </button>
                  <button
                    type="button"
                    className="flex-[2] inline-flex items-center justify-center gap-2 rounded-[11px] bg-[#0C5E3A] py-3 text-[13px] font-bold text-white shadow-[0_4px_12px_rgba(12,94,58,0.3)] hover:bg-[#16A34A] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C5E3A]/35 transition-all duration-200 cursor-pointer"
                    onClick={handleNextClick}
                  >
                    {primaryCtaLabel}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                {showFinalSecondaryCta ? (
                  <button
                    type="button"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-[11px] border border-[rgba(23,21,15,0.1)] dark:border-app-line bg-white dark:bg-app-surface py-2.5 text-[13px] font-semibold text-[#17150F] dark:text-app-ink transition-all duration-200 hover:bg-[#FAF8F3] dark:hover:bg-app-bg-subtle active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C5E3A]/35 cursor-pointer"
                    onClick={handleFinalSecondaryClick}
                  >
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    {finalSecondaryCtaLabel}
                  </button>
                ) : null}
              </div>

              {currentStepError && (
                <div
                  className="rounded-[13px] border border-[rgba(201,151,0,0.3)] bg-[#FFF8DE] dark:bg-[#2A2410] px-4 py-2.5 text-[#6B5520] dark:text-[#E7B400] text-[12px] flex items-center gap-2 select-none"
                  role="alert"
                >
                  <CircleAlert className="h-3.5 w-3.5 shrink-0 text-[#C99700]" aria-hidden="true" />
                  <span className="font-semibold">{currentStepError}</span>
                </div>
              )}

              {currentStepSoftWarning && (
                <div
                  className="rounded-[14px] border border-[rgba(23,21,15,0.08)] dark:border-app-line bg-[#FAF8F3] dark:bg-app-bg-subtle p-4 text-[#5C574B] dark:text-app-ink-soft animate-[fade-in_0.3s_ease-out]"
                  role="note"
                >
                  <div className="flex items-start gap-2.5">
                    <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-[#9A7B00] dark:text-[#E7B400]" aria-hidden="true" />
                    <div>
                      <p className="text-[13px] font-semibold text-[#17150F] dark:text-app-ink">Gợi ý để mục tiêu rõ hơn</p>
                      <p className="mt-1 text-[12.5px] leading-5">{currentStepSoftWarning}</p>
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
          <div className="rounded-[16px] border border-[rgba(23,21,15,0.08)] dark:border-app-line bg-white dark:bg-app-surface p-5 space-y-4">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16 shrink-0 rounded-full border-2 border-[#E4E0D4] dark:border-app-line bg-white dark:bg-app-surface flex items-center justify-center select-none">
                <span className="absolute top-0.5 text-[7px] font-extrabold text-[#A8A296] dark:text-app-ink-muted">N</span>
                <span className="absolute bottom-0.5 text-[7px] font-extrabold text-[#A8A296] dark:text-app-ink-muted">S</span>
                <motion.div
                  style={{ rotate: shouldReduceMotion ? clarityProgress * 2.7 - 135 : 0 }}
                  animate={shouldReduceMotion ? {} : { rotate: clarityProgress * 2.7 - 135 }}
                  transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
                  className="w-1 h-12 relative flex justify-center z-10"
                >
                  <div className="w-1 h-6 bg-[#0C5E3A] rounded-t-full" />
                  <div className="w-1 h-6 bg-[#C7C2B5] rounded-b-full" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-[#0C5E3A] border border-white z-20" />
                </motion.div>
              </div>

              <div className="space-y-0.5 flex-1">
                <h3 className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#A8A296] dark:text-app-ink-muted">
                  La bàn định hướng (Clarity)
                </h3>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold text-[#17150F] dark:text-app-ink" style={{ fontFamily: "'Bricolage Grotesque', serif" }}>
                    {Math.round(clarityProgress)}%
                  </span>
                  <span className="text-[11px] text-[#A8A296] dark:text-app-ink-muted font-medium">
                    ({clarityDoneCount}/{clarityItems.length} tiêu chí)
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-2 border-t border-[rgba(23,21,15,0.06)] dark:border-app-line pt-3">
              {clarityItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onJumpToStep(item.stepKey)}
                  className={cn(
                    "flex items-center justify-between rounded-[10px] border px-3 py-2.5 text-left transition-all duration-150 text-xs w-full cursor-pointer",
                    item.done
                      ? "border-[rgba(12,94,58,0.15)] bg-[#EDF7E0]/50 text-[#0C5E3A] font-medium"
                      : "border-[rgba(23,21,15,0.06)] dark:border-app-line bg-[#FAF8F3] dark:bg-app-bg-subtle text-[#A8A296] dark:text-app-ink-muted font-medium",
                  )}
                >
                  <span>{item.label}</span>
                  <div
                    className={cn(
                      "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border",
                      item.done
                        ? "border-[#0C5E3A] bg-[#0C5E3A] text-white"
                        : "border-[#A8A296]/30 text-transparent",
                    )}
                  >
                    {item.done ? <Check className="h-2.5 w-2.5" /> : null}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {isAchFilled && (
            <div className="rounded-[16px] border border-[rgba(23,21,15,0.08)] dark:border-app-line bg-white dark:bg-app-surface p-5 space-y-3.5 select-none">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#A8A296] dark:text-app-ink-muted">Ống nghiệm khả thi</span>
                <span className="text-lg font-extrabold text-[#0C5E3A]" style={{ fontFamily: "'Bricolage Grotesque', serif" }}>
                  {feasibilityScore}%
                </span>
              </div>

              <div className="relative h-[9px] w-full rounded-full bg-[#E4E0D4] overflow-hidden">
                <motion.div
                  style={{ width: 0, background: "linear-gradient(90deg, #0C5E3A, #16A34A)" }}
                  animate={{ width: `${feasibilityScore}%` }}
                  transition={{ duration: shouldReduceMotion ? 0 : 0.8, ease: "easeOut" }}
                  className="h-full rounded-full"
                />
              </div>

              <p className="text-[12px] text-[#5C574B] dark:text-app-ink-soft leading-[1.6] font-medium">
                Dành khoảng <span className="font-bold text-[#17150F] dark:text-app-ink">{parsedWeeklyHours} giờ/tuần</span>. Mức độ thời
                gian khả thi giúp bạn tránh kiệt sức và dễ giữ nhịp bền hơn.
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
        <details className="mt-6 group rounded-[16px] border border-[rgba(23,21,15,0.08)] dark:border-app-line bg-white dark:bg-app-surface p-4 transition-all duration-200">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[13px] font-semibold text-[#17150F] dark:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C5E3A] focus-visible:ring-offset-2 rounded-lg p-1 [&::-webkit-details-marker]:hidden">
            <p className="flex items-center gap-2 font-semibold">
              Xem chi tiết nội dung đang viết
              <ChevronDown className="h-4 w-4 text-[#A8A296] dark:text-app-ink-muted transition-transform duration-200 group-open:rotate-180" />
            </p>
          </summary>
          <div className="mt-4 grid gap-3 border-t border-[rgba(23,21,15,0.08)] dark:border-app-line pt-4 sm:grid-cols-2 lg:grid-cols-3">
            {SMART_STEPS.map((stepItem) => (
              <div key={stepItem.key} className="rounded-[11px] border border-[rgba(23,21,15,0.08)] dark:border-app-line bg-[#FAF8F3] dark:bg-app-bg-subtle p-3.5 text-xs">
                <p className="font-extrabold uppercase tracking-wider text-[#0C5E3A] mb-1">{stepItem.label}</p>
                <p className="leading-relaxed text-[#5C574B] dark:text-app-ink-soft">
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
