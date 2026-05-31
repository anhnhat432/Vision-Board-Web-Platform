import type { ReactNode, RefObject } from "react";
import { useRef, useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Lightbulb,
  Sparkles,
  ChevronDown,
  Target,
  BarChart3,
  ShieldCheck,
  Heart,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "motion/react";

import type { QualityLevel } from "@/lib/smart-goal/quality";
import { cn } from "@/app/components/ui/utils";

import { QualityFeedbackPanel } from "./QualityFeedbackPanel";
import { ReviewStep } from "./ReviewStep";
import { SMART_STEPS } from "../constants";
import { formatStepDraft } from "../helpers";
import type { GoalClarityItem, SMARTData, SmartGoalSummaryRow, SmartStepDefinition, SmartStepKey } from "../types";
import type { SmartGoalStarter } from "../../../utils/smart-goal-starters";

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

// Tổng hợp chuông ngân chánh niệm tần số 639Hz (hoà hợp, kết nối)
const playMindfulStepSuccess = () => {
  try {
    const AudioCtxClass = window.AudioContext || (window as unknown as Record<string, typeof AudioContext>).webkitAudioContext;
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
function useTypingEffect(text: string, speed = 6) {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
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
  }, [text, speed]);

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
}: SmartGoalStepShellProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [showStickyMini, setShowStickyMini] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [selectedTone, setSelectedTone] = useState<"empathetic" | "pragmatic" | "strategic">("empathetic");
  const [isCoachExpanded, setIsCoachExpanded] = useState(false);

  const prevValidRef = useRef(isCurrentStepValid);
  const prevGoldRef = useRef(false);

  const isGoldStandard = clarityDoneCount === clarityItems.length;

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

  const goalStr = smartGoalStarter.specificGoalStatement;
  const metric = smartGoalStarter.metricName;
  const baseVal = smartGoalStarter.baselineValue;
  const targetVal = smartGoalStarter.targetValue;
  const hoursVal = smartGoalStarter.weeklyHours;
  const motivationReasonStr = smartGoalStarter.motivationReason;
  const weeksVal = smartGoalStarter.targetWeeks;

  const getPersonaData = (tone: "empathetic" | "pragmatic" | "strategic"): {
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
        .replace("Hoàn thành một kết quả quan trọng trong 12 tuần để cải thiện lĩnh vực đang ưu tiên và có bằng chứng rõ ràng về tiến bộ.", "Thực hiện cam kết hành động 12 tuần để cải thiện lĩnh vực ưu tiên và ghi nhận tiến bộ rõ ràng.")
        .replace("Hoàn thành một dự án nổi bật trong 12 tuần để có bằng chứng rõ ràng khi trao đổi về bước tiến nghề nghiệp.", "Hoàn thành 1 dự án trọng điểm trong 12 tuần để chứng minh năng lực và thăng tiến nghề nghiệp.")
        .replace("Xây dựng quỹ dự phòng đầu tiên trong 12 tuần để tài chính cá nhân ổn hơn và giảm áp lực khi có việc phát sinh.", "Tích lũy quỹ dự phòng khẩn cấp trong 12 tuần nhằm ổn định tài chính cá nhân trước các sự cố phát sinh.")
        .replace("Duy trì 3 buổi vận động mỗi tuần trong 12 tuần để cơ thể khỏe hơn, ngủ tốt hơn và có nhiều năng lượng hơn.", "Duy trì tập thể dục 3 buổi mỗi tuần trong 12 tuần nhằm nâng cao thể lực và năng lượng làm việc.")
        .replace("Hoàn thành một lộ trình học 12 tuần để nắm chắc một kỹ năng mới và có sản phẩm nhỏ chứng minh kết quả học.", "Hoàn thành lộ trình học kỹ năng mới trong 12 tuần và tự làm 1 sản phẩm thực tế để ứng dụng.")
        .replace("Duy trì ít nhất 2 lần chủ động kết nối mỗi tuần trong 12 tuần để các mối quan hệ quan trọng gần gũi hơn.", "Chủ động kết nối với những người quan trọng 2 lần mỗi tuần trong 12 tuần để gia tăng sự gắn kết.")
        .replace("Duy trì 2 khoảng thời gian chất lượng với gia đình mỗi tuần trong 12 tuần để kết nối gần hơn và bớt bị cuốn vào việc riêng.", "Dành riêng 2 khoảng thời gian chất lượng cho gia đình mỗi tuần trong 12 tuần, gác lại công việc riêng.")
        .replace("Duy trì một thói quen phát triển bản thân trong 12 tuần để hiểu mình hơn và có nhịp cải thiện đều mỗi tuần.", "Thực hiện thói quen phát triển bản thân đều đặn mỗi tuần trong 12 tuần để nâng cao nhận thức cá nhân.")
        .replace("Duy trì 2 khoảng nghỉ chất lượng mỗi tuần trong 12 tuần để phục hồi năng lượng và không để cuộc sống chỉ xoay quanh việc riêng.", "Lên lịch và thực hiện 2 khoảng nghỉ chất lượng mỗi tuần trong 12 tuần nhằm phục hồi năng lượng tối ưu.");

      if (tone === "pragmatic") {
        return {
          coachComment: "Vào thẳng hành động thực tế nào. Hãy điền ngắn gọn, rõ việc cần làm:",
          goalDraft: pragmaticGoal,
          coreTextToApply: pragmaticGoal,
        };
      }
      const strategicGoal = goalStr
        .replace("Hoàn thành một kết quả quan trọng trong 12 tuần để cải thiện lĩnh vực đang ưu tiên và có bằng chứng rõ ràng về tiến bộ.", "Thực thi chiến lược 12 tuần nhằm tối ưu hóa lĩnh vực ưu tiên và tạo chỉ số tiến trình rõ nét.")
        .replace("Hoàn thành một dự án nổi bật trong 12 tuần để có bằng chứng rõ ràng khi trao đổi về bước tiến nghề nghiệp.", "Xây dựng dự án trọng điểm trong 12 tuần, tạo đòn bẩy thăng tiến nghề nghiệp rõ rệt.")
        .replace("Xây dựng quỹ dự phòng đầu tiên trong 12 tuần để tài chính cá nhân ổn hơn và giảm áp lực khi có việc phát sinh.", "Tối ưu hóa phân bổ dòng tiền và thiết lập quỹ dự phòng 12 tuần nhằm bảo vệ an toàn tài chính lâu dài.")
        .replace("Duy trì 3 buổi vận động mỗi tuần trong 12 tuần để cơ thể khỏe hơn, ngủ tốt hơn và có nhiều năng lượng hơn.", "Xây dựng thói quen vận động 3 buổi/tuần trong 12 tuần nhằm tái tạo năng lượng thể chất và tinh thần tối đa.")
        .replace("Hoàn thành một lộ trình học 12 tuần để nắm chắc một kỹ năng mới và có sản phẩm nhỏ chứng minh kết quả học.", "Làm chủ kỹ năng mới thông qua lộ trình học 12 tuần và đóng gói kết quả dưới dạng sản phẩm kiểm chứng.")
        .replace("Duy trì ít nhất 2 lần chủ động kết nối mỗi tuần trong 12 tuần để các mối quan hệ quan trọng gần gũi hơn.", "Hệ thống hóa lịch kết nối chất lượng 2 lần/tuần trong 12 tuần nhằm tối ưu hóa các mối quan hệ cốt lõi.")
        .replace("Duy trì 2 khoảng thời gian chất lượng với gia đình mỗi tuần trong 12 tuần để kết nối gần hơn và bớt bị cuốn vào việc riêng.", "Thiết lập ranh giới công việc, dành 2 buổi sinh hoạt gia đình chất lượng mỗi tuần trong 12 tuần.")
        .replace("Duy trì một thói quen phát triển bản thân trong 12 tuần để hiểu mình hơn và có nhịp cải thiện đều mỗi tuần.", "Chuẩn hóa quy trình tự phản tỉnh và thực hiện thói quen phát triển bản thân mỗi tuần trong 12 tuần.")
        .replace("Duy trì 2 khoảng nghỉ chất lượng mỗi tuần trong 12 tuần để phục hồi năng lượng và không để cuộc sống chỉ xoay quanh việc riêng.", "Quản trị năng lượng bằng 2 khoảng nghỉ sâu mỗi tuần trong 12 tuần, ngăn chặn rủi ro kiệt sức.");
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
        coachComment: "KPI đo lường hiệu suất dẫn dắt (leading indicator) tối ưu cho bạn:",
        goalDraft: `Thiết lập chỉ số đạt ${targetVal} ${cleanMetric} với mốc cơ sở hiện tại là ${baseVal}.`,
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
        coachComment: "Để tối ưu hóa tính khả thi và giảm thiểu 40% rủi ro từ bỏ, định mức chiến lược:",
        goalDraft: `Phân bổ quỹ thời gian biểu là ${hoursVal} giờ/tuần cùng với việc chuẩn bị nguồn lực hỗ trợ đầy đủ.`,
        coreTextToApply: "",
      };
    }

    if (step.key === "relevant") {
      const cleanReason = motivationReasonStr.replace("Tôi muốn mục tiêu này vì ", "");
      if (tone === "empathetic") {
        return {
          coachComment: "Lý do sâu sắc từ trái tim sẽ tiếp thêm sức mạnh cho bạn. Hãy cảm nhận xem điều này đã thực sự chạm tới ước muốn của bạn chưa:",
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
      
      const strategicReason = `Căn chỉnh trục phát triển: ${cleanReason.charAt(0).toUpperCase() + cleanReason.slice(1)}`;
      return {
        coachComment: "Định hình tầm nhìn chiến lược và căn chỉnh hệ giá trị phát triển cốt lõi:",
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
        coachComment: "Thiết lập mốc thời gian kết thúc chiến dịch. Đây là điểm rơi phong độ lý tưởng để đánh giá:",
        goalDraft: `Cam kết hoàn thành trong vòng ${weeksVal} tuần để đánh giá hiệu suất tổng thể của bạn.`,
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

  const typedCommentText = useTypingEffect(coachComment, 6);
  const typedDraftText = useTypingEffect(goalDraft, 6);

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
        targetElement.focus({ preventScroll: true });

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
      <motion.div
        ref={isMobile ? undefined : cardRef}
        onMouseMove={isMobile ? undefined : handleMouseMove}
        onMouseLeave={isMobile ? undefined : handleMouseLeave}
        style={isMobile ? {} : {
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className={cn(
          "group relative rounded-sm p-5 sm:p-6 shadow-[0_12px_30px_rgba(0,0,0,0.05),0_2px_8px_rgba(0,0,0,0.02)] select-none border-[10px] border-white dark:border-slate-800 bg-[#faf6ee] dark:bg-[#1a1c17] transition-all duration-300 transform",
          isMobile ? "max-w-md mx-auto my-4 rotate-[0.5deg]" : "rotate-[1deg] hover:rotate-0"
        )}
      >
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-28 h-5.5 bg-yellow-100/40 dark:bg-yellow-950/20 border-b border-yellow-250/10 shadow-[0_1px_2px_rgba(0,0,0,0.02)] rotate-[-1.5deg] z-10 backdrop-blur-[0.5px]" />
        
        <AnimatePresence>
          {isGoldStandard && (
            <motion.div
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              className="absolute -top-3.5 -right-3 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 px-3 py-1 text-[9px] font-extrabold text-slate-900 shadow-md animate-[pulse_2.2s_infinite] z-25 border border-yellow-200/20"
            >
              <span>🏆 Chuẩn Vàng</span>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-[9px] font-extrabold uppercase tracking-[0.25em] text-amber-800/60 dark:text-amber-500/60 mb-3 flex items-center gap-1.5 select-none pointer-events-none">
          <span>✨</span> BẢN PHÁC THẢO TƯƠNG LAI
        </p>

        <div className="text-[14px] sm:text-[15px] leading-loose text-slate-850 dark:text-slate-200 font-serif tracking-wide select-text relative z-20">
          Tôi quyết tâm{" "}
          <span className={cn("inline-flex items-center px-1 rounded transition-colors duration-200",
            isSpecFilled
              ? "text-teal-800 dark:text-teal-300 font-bold bg-teal-500/5"
              : "text-slate-400 dark:text-slate-500 italic border-b border-dashed border-slate-300 bg-slate-500/5 animate-[pulse_2.0s_infinite]"
          )}>
            {isSpecFilled ? specText : "hành động cụ thể"}
          </span>
          <span className="text-xs opacity-75 ml-1 select-none">🎯</span>. 
          Tôi sẽ đo lường tiến bộ bằng cách đạt mốc{" "}
          <span className={cn("inline-flex items-center px-1 rounded transition-colors duration-200",
            isMeasFilled
              ? "text-blue-800 dark:text-blue-300 font-bold bg-blue-500/5"
              : "text-slate-400 dark:text-slate-500 italic border-b border-dashed border-slate-300 bg-slate-500/5 animate-[pulse_2.0s_infinite]"
          )}>
            {isMeasFilled ? `${measTarget} ${measUnit || "đơn vị"}` : "chỉ số"}
          </span>
          <span className="text-xs opacity-75 ml-1 select-none">📊</span>. 
          Tôi cam kết dành ra{" "}
          <span className={cn("inline-flex items-center px-1 rounded transition-colors duration-200",
            isAchFilled
              ? "text-amber-800 dark:text-amber-300 font-bold bg-amber-500/5"
              : "text-slate-400 dark:text-slate-500 italic border-b border-dashed border-slate-300 bg-slate-500/5 animate-[pulse_2.0s_infinite]"
          )}>
            {isAchFilled ? `${achHours} giờ mỗi tuần` : "thời gian cam kết"}
          </span>
          <span className="text-xs opacity-75 ml-1 select-none">⚡</span> để thực hiện. 
          Việc này quan trọng vì{" "}
          <span className={cn("inline-flex items-center px-1 rounded transition-colors duration-200",
            isRelFilled
              ? "text-rose-800 dark:text-rose-350 font-bold bg-rose-500/5"
              : "text-slate-400 dark:text-slate-500 italic border-b border-dashed border-slate-300 bg-slate-500/5 animate-[pulse_2.0s_infinite]"
          )}>
            {isRelFilled ? relReason : "lý do của bạn"}
          </span>
          <span className="text-xs opacity-75 ml-1 select-none">❤️</span> và hoàn thành trước{" "}
          <span className={cn("inline-flex items-center px-1 rounded transition-colors duration-200",
            isTimeFilled
              ? "text-purple-800 dark:text-purple-300 font-bold bg-purple-500/5"
              : "text-slate-400 dark:text-slate-500 italic border-b border-dashed border-slate-300 bg-slate-500/5 animate-[pulse_2.0s_infinite]"
          )}>
            {isTimeFilled ? timeDate : "ngày hoàn thành"}
          </span>
          <span className="text-xs opacity-75 ml-1 select-none">📅</span>.
        </div>

        {!isMobile && (
          <motion.div
            className="absolute inset-0 pointer-events-none z-10"
            style={{
              background: glareBg,
            }}
          />
        )}

        <div className="border-t border-amber-900/10 dark:border-slate-700/30 pt-3 mt-4 flex items-center justify-between text-[10px] text-slate-450 dark:text-slate-500 font-sans tracking-wide">
          <span>Dear Our Future</span>
          <span className="font-serif italic text-amber-800/60 dark:text-amber-500/60 flex items-center gap-0.5 select-none">
            <span>✦</span> {areaLabel} <span>✦</span>
          </span>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="w-full animate-[fade-in_0.3s_ease-out]">
      {showConfetti && <ConfettiCanvas />}

      <AnimatePresence>
        {showStickyMini && (
          <motion.div
            initial={{ y: -65, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -65, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed top-0 left-0 right-0 z-45 bg-white/90 dark:bg-slate-900/90 border-b border-app-line backdrop-blur-md px-4 py-3 shadow-md flex items-center justify-between gap-3 lg:hidden"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-app-accent mb-0.5 select-none flex items-center gap-1">
                <span>🎯</span> Live Preview
              </p>
              <p className="text-xs truncate font-serif italic text-slate-700 dark:text-slate-300 leading-normal">
                Quyết tâm {isSpecFilled ? specText : "..."} 🎯. Đo lường: {isMeasFilled ? `${measTarget} ${measUnit}` : "..."} 📊.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-app-accent-soft px-2.5 py-0.5 text-[10px] font-bold text-app-accent">
              Bước {stepIndex + 1}/{totalSteps}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-[1.18fr_0.82fr] gap-6 lg:gap-8 items-start">
        <div className="space-y-6 rounded-[20px] border border-app-line bg-app-surface p-5 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
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
            <div className="absolute top-[22px] left-[10%] right-[10%] h-[3px] bg-app-line rounded-full z-0 overflow-hidden" aria-hidden="true">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-app-accent transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]"
                style={{ width: `${(stepIndex / (totalSteps - 1)) * 100}%` }}
              />
            </div>

            <ol aria-label={`Bước ${stepIndex + 1} trên ${totalSteps}`} className="relative z-10 grid grid-cols-5 gap-2">
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
                            : "border-app-line bg-app-bg text-app-ink-muted hover:bg-app-accent-soft/30 hover:text-app-accent active:scale-[0.97] disabled:cursor-default"
                      )}
                    >
                      <span className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300",
                        isActive
                          ? "bg-app-accent text-white shadow-[0_0_8px_rgba(var(--color-accent-rgb),0.4)]"
                          : isDone
                            ? "bg-white/20 text-white"
                            : "bg-app-surface text-app-ink-muted border border-app-line"
                      )}>
                        <StepIcon className="h-4 w-4" />
                      </span>
                      <span className="text-[10px] font-bold tracking-widest uppercase">{STEP_LETTERS[smartStep.key]}</span>
                      <span className="hidden truncate text-xs font-semibold sm:block">{STEP_NAMES[smartStep.key]}</span>
                      {isDone ? <span className="sr-only">đã hoàn thành</span> : null}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          <div className="my-6 h-px bg-app-line" aria-hidden="true" />

          <div className="block lg:hidden">
            {renderPolaroidCard(true)}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={stepIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-5"
            >
              {children}

              <div className="relative overflow-hidden rounded-[20px] border border-teal-500/15 dark:border-teal-900/30 bg-gradient-to-br from-teal-500/[0.03] via-app-surface/98 to-indigo-500/[0.02] dark:from-teal-950/15 dark:via-slate-900/90 dark:to-indigo-950/15 shadow-[0_10px_35px_rgba(13,148,136,0.03)] transition-all duration-300">
                <button
                  type="button"
                  onClick={() => setIsCoachExpanded(!isCoachExpanded)}
                  className="w-full flex items-center justify-between p-4.5 text-left border-b border-teal-500/5 select-none focus:outline-none cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-400 to-indigo-500 text-white shadow-sm border border-white/10 overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-teal-400 opacity-60 animate-[pulse_3s_ease-in-out_infinite]" />
                      <Sparkles className="h-4.5 w-4.5 text-white relative z-10 animate-[spin_10s_linear_infinite]" />
                    </div>
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-teal-600 dark:text-teal-400 block mb-0.5">
                        Cố vấn mục tiêu AI
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        {isCoachExpanded ? "Đang chuẩn bị ý kiến tư vấn chánh niệm" : "Bấm để xem phân tích và gợi ý nhanh"}
                      </p>
                    </div>
                  </div>
                  
                  <span className={cn(
                    "text-[11px] px-2.5 py-1 rounded-full font-bold transition-all duration-205 flex items-center gap-1 border border-teal-500/10",
                    isCoachExpanded ? "text-slate-500 bg-slate-100/50 dark:bg-slate-800" : "text-teal-600 bg-teal-50 dark:bg-teal-950/40"
                  )}>
                    {isCoachExpanded ? "Thu gọn ✦" : "Xem gợi ý ✦"}
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isCoachExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="p-5 space-y-4 border-t border-teal-500/5">
                        <div className="relative bg-white/70 dark:bg-slate-900/60 border border-teal-500/5 rounded-2xl rounded-tl-none p-4 shadow-[0_1px_2px_rgba(0,0,0,0.015)] text-sm text-slate-800 dark:text-slate-200">
                          <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400 leading-relaxed mb-3 select-none">
                            {typedCommentText}
                          </p>

                          {typedDraftText && (
                            <div className="relative my-3 rounded-xl border-l-[3px] border-emerald-500/80 bg-emerald-500/[0.03] dark:bg-emerald-500/[0.06] px-4 py-3">
                              <p className="font-serif italic text-[14.5px] leading-relaxed text-slate-800 dark:text-slate-100 select-text">
                                “{typedDraftText}”
                              </p>
                            </div>
                          )}

                          <div className="mt-3 text-[10px] text-slate-450 dark:text-slate-550 flex items-center gap-1.5 select-none pt-2 border-t border-teal-500/5">
                            <Sparkles className="h-3 w-3 text-teal-400" />
                            <span>Gợi ý chánh niệm giúp bạn tinh chỉnh chính xác.</span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between border-t border-teal-500/5 pt-4">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none">
                              Giọng điệu:
                            </span>
                            <div className="flex bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200/50 dark:border-slate-850">
                              {(["empathetic", "pragmatic", "strategic"] as const).map((tone) => {
                                const isActive = selectedTone === tone;
                                const toneLabel = tone === "empathetic" ? "Ấm áp" : tone === "pragmatic" ? "Thực tế" : "Chiến lược";
                                return (
                                  <button
                                    key={tone}
                                    type="button"
                                    onClick={() => setSelectedTone(tone)}
                                    className={cn(
                                      "px-2.5 py-1 text-[10px] font-bold rounded-md transition-all duration-200 cursor-pointer",
                                      isActive 
                                        ? "bg-white dark:bg-slate-800 text-teal-600 dark:text-teal-400 shadow-sm" 
                                        : "text-slate-450 dark:text-slate-550 hover:text-slate-700"
                                    )}
                                  >
                                    {toneLabel}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={handleApplyTransformedStarter}
                            className="relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all duration-200 active:scale-[0.98] group/shimmer w-full sm:w-auto cursor-pointer"
                            aria-label={`Dùng gợi ý cho bước ${step.label}`}
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Sử dụng gợi ý này</span>
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {currentStepError && (
                <div
                  className="rounded-xl border border-rose-200/60 dark:border-rose-900/30 bg-rose-50/30 dark:bg-rose-950/15 px-4 py-2.5 text-rose-600 dark:text-rose-400 text-xs shadow-sm flex items-center gap-2"
                  role="alert"
                >
                  <CircleAlert className="h-4 w-4 shrink-0 text-rose-500" aria-hidden="true" />
                  <span className="font-semibold">{currentStepError}</span>
                </div>
              )}

              {currentStepSoftWarning && (
                <div className="rounded-xl border border-app-line bg-app-bg p-4 text-app-ink-soft shadow-sm animate-[fade-in_0.3s_ease-out]" role="note">
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

          <div className="mt-6 flex flex-col-reverse gap-3 border-t border-app-line pt-5 sm:flex-row sm:justify-between">
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-app-line bg-app-surface px-5 py-2.5 text-sm font-medium text-app-ink-soft transition-all duration-200 hover:bg-app-bg hover:text-app-ink active:scale-[0.97] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-app-accent/35 sm:w-auto cursor-pointer"
              onClick={onBack}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Quay lại
            </button>
            <button
              type="button"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-app-accent px-6 py-2.5 text-sm font-bold text-white shadow-app-sm hover:bg-app-accent-hover hover:shadow-app-md disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-app-accent/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-bg)] sm:w-auto transition-all duration-200 cursor-pointer"
              onClick={onNext}
              disabled={!isCurrentStepValid}
            >
              {stepIndex < totalSteps - 1 ? "Tiếp tục" : "Kiểm tra độ khả thi"}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="hidden lg:block lg:sticky lg:top-6 space-y-6">
          {renderPolaroidCard(false)}

          <div className="rounded-2xl border border-app-line bg-app-surface p-5 shadow-sm space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-app-ink">Kiểm tra độ rõ mục tiêu (Clarity)</h3>
              <div className="flex items-center justify-between text-xs text-app-ink-muted">
                <span>{clarityDoneCount}/{clarityItems.length} tiêu chí hoàn thành</span>
                <span className="font-bold text-app-accent">{Math.round(clarityProgress)}%</span>
              </div>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-app-line" aria-hidden="true">
              <div className="h-full rounded-full bg-app-accent transition-all duration-305" style={{ width: `${clarityProgress}%` }} />
            </div>

            <div className="grid gap-2 pt-2">
              {clarityItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onJumpToStep(item.stepKey)}
                  className={cn(
                    "group/btn flex items-center justify-between rounded-xl border px-3 py-2 text-left transition-all duration-200 text-xs w-full cursor-pointer",
                    item.done
                      ? "border-app-accent/15 bg-app-accent-soft/20 text-app-accent"
                      : "border-app-line bg-app-bg text-app-ink-soft hover:border-app-ink-muted"
                  )}
                >
                  <span className="font-medium group-hover/btn:underline">{item.label}</span>
                  <div className={cn(
                    "flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border",
                    item.done ? "border-app-accent bg-app-accent text-white" : "border-app-ink-muted/30 text-transparent"
                  )}>
                    {item.done ? <Check className="h-2.5 w-2.5" /> : null}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {isAchFilled && (
            <div className="rounded-2xl border border-teal-500/10 bg-teal-500/[0.02] p-4.5 shadow-sm space-y-2 select-none">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-500">Độ khả thi ước tính</span>
                <span className="text-teal-600 font-extrabold">{feasibilityScore}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800/80 overflow-hidden">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-500 bg-gradient-to-r shadow-sm",
                    feasibilityScore >= 80 ? "from-emerald-400 to-teal-500" :
                    feasibilityScore >= 60 ? "from-amber-400 to-emerald-500" : 
                    "from-rose-400 to-amber-500"
                  )} 
                  style={{ width: `${feasibilityScore}%` }} 
                />
              </div>
              <p className="text-[10px] text-slate-400 leading-normal">
                Dựa trên cam kết thời gian ({parsedWeeklyHours} giờ/tuần). Bạn có thể chỉnh lại bất cứ lúc nào.
              </p>
            </div>
          )}

          {showReview && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
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
