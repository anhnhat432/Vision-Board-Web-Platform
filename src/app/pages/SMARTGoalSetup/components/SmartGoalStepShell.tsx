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

  const prevValidRef = useRef(isCurrentStepValid);
  const prevGoldRef = useRef(false);

  const isGoldStandard = clarityDoneCount === clarityItems.length;

  // Lắng nghe trạng thái hoàn thành hợp lệ một bước để phát âm thanh chánh niệm
  useEffect(() => {
    if (!prevValidRef.current && isCurrentStepValid) {
      playMindfulStepSuccess();
    }
    prevValidRef.current = isCurrentStepValid;
  }, [isCurrentStepValid]);

  // Lắng nghe trạng thái chuẩn Vàng để kích hoạt pháo hoa giấy Confetti
  useEffect(() => {
    if (!prevGoldRef.current && isGoldStandard) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 2600);
      return () => clearTimeout(timer);
    }
    prevGoldRef.current = isGoldStandard;
  }, [isGoldStandard]);

  // Lắng nghe hành vi cuộn để ghim mini-preview trên thiết bị di động
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

  // Cấu hình xoay 3D vật lý đàn hồi Spring mượt mà từ Framer Motion
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 90, damping: 20 });
  const mouseYSpring = useSpring(y, { stiffness: 90, damping: 20 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["4.5deg", "-4.5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-4.5deg", "4.5deg"]);

  const glareX = useTransform(mouseXSpring, [-0.5, 0.5], ["20%", "80%"]);
  const glareY = useTransform(mouseYSpring, [-0.5, 0.5], ["20%", "80%"]);

  const glareBg = useTransform([glareX, glareY], ([gX, gY]) => {
    return `radial-gradient(circle at ${gX} ${gY}, rgba(255,255,255,0.22) 0%, transparent 60%)`;
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

  // Trích xuất các trường từ smartGoalStarter cho gọn
  const goalStr = smartGoalStarter.specificGoalStatement;
  const metric = smartGoalStarter.metricName;
  const baseVal = smartGoalStarter.baselineValue;
  const targetVal = smartGoalStarter.targetValue;
  const hoursVal = smartGoalStarter.weeklyHours;
  const motivationReasonStr = smartGoalStarter.motivationReason;
  const weeksVal = smartGoalStarter.targetWeeks;

  // Lấy câu gợi ý AI Coach và text cốt lõi đi kèm
  const getPersonaData = (tone: "empathetic" | "pragmatic" | "strategic") => {
    const cleanMetric = metric.toLowerCase();
    
    if (step.key === "specific") {
      if (tone === "empathetic") {
        return {
          coachMessage: `Bạn đang hướng tới một tầm nhìn rất ý nghĩa đấy. Hãy bắt đầu nhẹ nhàng nhưng đầy cam kết: “${goalStr}”`,
          coreText: goalStr,
        };
      }
      if (tone === "pragmatic") {
        const pragmaticGoal = goalStr
          .replace("Hoàn thành một kết quả quan trọng trong 12 tuần để cải thiện lĩnh vực đang ưu tiên và có bằng chứng rõ ràng về tiến bộ.", "Thực hiện cam kết hành động 12 tuần để cải thiện lĩnh vực ưu tiên và ghi nhận tiến bộ rõ ràng.")
          .replace("Hoàn thành một dự án nổi bật trong 12 tuần để có bằng chứng rõ ràng khi trao đổi về bước tiến nghề nghiệp.", "Hoàn thành 1 dự án trọng điểm trong 12 tuần để chứng minh năng lực và thăng tiến nghề nghiệp.")
          .replace("Xây dựng quỹ dự phòng đầu tiên trong 12 tuần để tài chính cá nhân ổn hơn và giảm áp lực khi có việc phát sinh.", "Tích lũy quỹ dự phòng khẩn cấp trong 12 tuần nhằm ổn định tài chính cá nhân trước các sự cố phát sinh.")
          .replace("Duy trì 3 buổi vận động mỗi tuần trong 12 tuần để cơ thể khỏe hơn, ngủ tốt hơn và có nhiều năng lượng hơn.", "Duy trì tập thể dục 3 buổi mỗi tuần trong 12 tuần nhằm nâng cao thể lực và năng lượng làm việc.")
          .replace("Hoàn thành một lộ trình học 12 tuần để nắm chắc một kỹ năng mới và có sản phẩm nhỏ chứng minh kết quả học.", "Hoàn thành lộ trình học kỹ năng mới trong 12 tuần và tự làm 1 sản phẩm thực tế để ứng dụng.")
          .replace("Duy trì ít nhất 2 lần chủ động kết nối mỗi tuần trong 12 tuần để các mối quan hệ quan trọng gần gũi hơn.", "Chủ động kết nối với những người quan trọng 2 lần mỗi tuần trong 12 tuần để gia tăng sự gắn kết.")
          .replace("Duy trì 2 khoảng thời gian chất lượng với gia đình mỗi tuần trong 12 tuần để kết nối gần hơn và bớt bị cuốn vào việc riêng.", "Dành riêng 2 khoảng thời gian chất lượng cho gia đình mỗi tuần trong 12 tuần, gác lại công việc riêng.")
          .replace("Duy trì một thói quen phát triển bản thân trong 12 tuần để hiểu mình hơn và có nhịp cải thiện đều mỗi tuần.", "Thực hiện thói quen phát triển bản thân đều đặn mỗi tuần trong 12 tuần để nâng cao nhận thức cá nhân.")
          .replace("Duy trì 2 khoảng nghỉ chất lượng mỗi tuần trong 12 tuần để phục hồi năng lượng và không để cuộc sống chỉ xoay quanh việc phải làm.", "Lên lịch và thực hiện 2 khoảng nghỉ chất lượng mỗi tuần trong 12 tuần nhằm phục hồi năng lượng tối ưu.");
        return {
          coachMessage: `Vào thẳng hành động thực tế nào. Hãy điền ngắn gọn, rõ việc cần làm: “${pragmaticGoal}”`,
          coreText: pragmaticGoal,
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
        .replace("Duy trì 2 khoảng nghỉ chất lượng mỗi tuần trong 12 tuần để phục hồi năng lượng và không để cuộc sống chỉ xoay quanh việc phải làm.", "Quản trị năng lượng bằng 2 khoảng nghỉ sâu mỗi tuần trong 12 tuần, ngăn chặn rủi ro kiệt sức.");
      return {
        coachMessage: `Phân tích chiến lược cho thấy đây là lộ trình tối ưu nhất. Hãy tham khảo cấu trúc mục tiêu: “${strategicGoal}”`,
        coreText: strategicGoal,
      };
    }
    
    if (step.key === "measurable") {
      if (tone === "empathetic") {
        return {
          coachMessage: `Số liệu là tấm gương giúp bạn tự quan sát nhẹ nhàng: Hãy đo lường bằng cách đạt mốc ${targetVal} ${cleanMetric} (khởi điểm từ mốc ${baseVal}). Chúc bạn có những bước đi thảnh thơi!`,
          coreText: "",
        };
      }
      if (tone === "pragmatic") {
        return {
          coachMessage: `Đo lường cụ thể để kiểm soát kết quả tốt nhất. Chỉ tiêu hành động: Đạt mốc ${targetVal} ${cleanMetric} (bắt đầu từ mốc ${baseVal}).`,
          coreText: "",
        };
      }
      return {
        coachMessage: `KPI đo lường hiệu suất dẫn dắt (leading indicator): Thiết lập chỉ số đạt ${targetVal} ${cleanMetric} với mốc cơ sở hiện tại là ${baseVal}.`,
        coreText: "",
      };
    }

    if (step.key === "achievable") {
      if (tone === "empathetic") {
        return {
          coachMessage: `Nuôi dưỡng thói quen bền bỉ tốt hơn là ép mình quá sức. Hãy dành ra khoảng ${hoursVal} giờ mỗi tuần để thích nghi từ từ bạn nhé.`,
          coreText: "",
        };
      }
      if (tone === "pragmatic") {
        return {
          coachMessage: `Cam kết dành ra đúng ${hoursVal} giờ mỗi tuần để hành động thực tế. Hãy chuẩn bị trước các nguồn lực cần thiết để sẵn sàng thực hiện.`,
          coreText: "",
        };
      }
      return {
        coachMessage: `Để tối ưu hóa tính khả thi, phân bổ quỹ thời gian biểu là ${hoursVal} giờ/tuần. Việc chuẩn bị nguồn lực hỗ trợ sẽ giảm thiểu 40% rủi ro từ bỏ.`,
        coreText: "",
      };
    }

    if (step.key === "relevant") {
      const cleanReason = motivationReasonStr.replace("Tôi muốn mục tiêu này vì ", "");
      if (tone === "empathetic") {
        return {
          coachMessage: `Lý do sâu sắc từ trái tim sẽ tiếp thêm sức mạnh cho bạn: “${motivationReasonStr}”. Hãy cảm nhận xem điều này đã thực sự chạm tới ước muốn của bạn chưa.`,
          coreText: motivationReasonStr,
        };
      }
      if (tone === "pragmatic") {
        const pragmaticReason = `Động lực thực tế: ${cleanReason.charAt(0).toUpperCase() + cleanReason.slice(1)}`;
        return {
          coachMessage: `Tập trung vào giá trị thực tế nhất lúc này: “${pragmaticReason}”`,
          coreText: pragmaticReason,
        };
      }
      const strategicReason = `Căn chỉnh trục phát triển: ${cleanReason.charAt(0).toUpperCase() + cleanReason.slice(1)}`;
      return {
        coachMessage: `Định hình tầm nhìn chiến lược và căn chỉnh giá trị: “${strategicReason}”`,
        coreText: strategicReason,
      };
    }

    if (step.key === "timeBound") {
      if (tone === "empathetic") {
        return {
          coachMessage: `Tạo một nhịp điệu thời gian vừa vặn với cuộc sống của bạn: Hãy theo dõi tiến trình trong ${weeksVal} tuần trước khi chốt kết quả. 12 tuần là khoảng thời gian hoàn hảo để chứng kiến sự chuyển hóa nhẹ nhàng.`,
          coreText: "",
        };
      }
      if (tone === "pragmatic") {
        return {
          coachMessage: `Đặt mốc thời gian rõ ràng để tập trung kỷ luật tối đa: Cam kết hoàn thành trong vòng ${weeksVal} tuần tới. Đừng trì hoãn thêm nữa.`,
          coreText: "",
        };
      }
      return {
        coachMessage: `Thiết lập mốc thời gian kết thúc chiến dịch 12 tuần. Đây là điểm rơi phong độ lý tưởng để chúng ta đánh giá hiệu suất tổng thể của bạn.`,
        coreText: "",
      };
    }

    return {
      coachMessage: starterPreview,
      coreText: starterPreview,
    };
  };

  const { coachMessage, coreText: coreTextToApply } = getPersonaData(selectedTone);

  // Hook hiệu ứng gõ chữ sinh động
  const useTypingEffect = (text: string, speed = 8) => {
    const [displayedText, setDisplayedText] = useState("");

    useEffect(() => {
      setDisplayedText("");
      if (!text) return;
      
      let i = 0;
      const timer = setInterval(() => {
        setDisplayedText((prev) => prev + text.charAt(i));
        i++;
        if (i >= text.length) {
          clearInterval(timer);
        }
      }, speed);

      return () => clearInterval(timer);
    }, [text, speed]);

    return displayedText;
  };

  const typedCoachText = useTypingEffect(coachMessage, 10);

  // Tính toán nhanh độ khả thi
  const calculateFeasibilityScore = () => {
    const hours = Number.parseFloat(smartData.achievable.weekly_time_commitment_hours) || 0;
    if (hours === 0) return 0;
    if (hours >= 2 && hours <= 8) return 95; // Tối ưu cho người bận rộn
    if (hours > 8 && hours <= 15) return 80; // Hơi nặng nhưng khả thi
    if (hours > 15 && hours <= 25) return 60; // Nặng, cần nỗ lực lớn
    return 40; // Quá tải, nguy cơ thất bại cao
  };

  const feasibilityScore = calculateFeasibilityScore();

  const handleApplyTransformedStarter = () => {
    onApplyStarter(coreTextToApply);
  };

  return (
    <section
      className="rounded-[20px] border border-app-line bg-app-surface p-5 sm:p-7 shadow-[0_8px_30px_rgb(0,0,0,0.02)]"
      aria-labelledby="smart-step-title"
    >
      {/* Pháo hoa giấy Confetti */}
      {showConfetti && <ConfettiCanvas />}

      {/* Sticky Mini-Preview Header trên Mobile/Scroll */}
      <AnimatePresence>
        {showStickyMini && (
          <motion.div
            initial={{ y: -65, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -65, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="fixed top-0 left-0 right-0 z-40 bg-white/85 dark:bg-slate-900/85 border-b border-app-line backdrop-blur-md px-4 py-3 shadow-md flex items-center justify-between gap-3"
          >
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-app-accent mb-0.5 select-none flex items-center gap-1">
                <span>🎯</span> Mục tiêu hiện tại (Live Preview)
              </p>
              <p className="text-xs truncate font-serif italic text-slate-700 dark:text-slate-350 leading-normal">
                Tôi quyết tâm {isSpecFilled ? specText : "..."} 🎯. Đo lường: {isMeasFilled ? `${measTarget} ${measUnit}` : "..."} 📊. Dành ra {isAchFilled ? `${achHours} giờ/tuần` : "..."} ⚡. Lý do: {isRelFilled ? relReason : "..."} ❤️. Thời hạn: {isTimeFilled ? timeDate : "..."} 📅.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-app-accent-soft px-2.5 py-0.5 text-[10px] font-bold text-app-accent">
              Bước {stepIndex + 1}/{totalSteps}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

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

      {/* Stepper dòng chảy năng lượng */}
      <div className="relative mt-7">
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
                    "flex h-full w-full flex-col items-center gap-1.5 rounded-[16px] border p-2.5 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2",
                    isActive
                      ? "border-app-accent bg-app-accent-soft text-app-accent shadow-[0_4px_12px_rgba(var(--color-accent-rgb),0.12)] scale-[1.03]"
                      : isDone
                        ? "border-app-accent/30 bg-app-accent text-white hover:bg-app-accent hover:scale-[1.02]"
                        : "border-app-line bg-app-bg text-app-ink-muted hover:bg-app-accent-soft/30 hover:text-app-accent disabled:cursor-default"
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

      {/* Tấm thẻ Live Preview 3D Glassmorphism Spring Physics */}
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className="group relative mb-7 rounded-2xl border border-white/25 dark:border-white/5 bg-gradient-to-br from-white/70 to-white/40 dark:from-slate-900/60 dark:to-slate-900/30 p-6 sm:p-7 shadow-[0_10px_35px_rgba(31,38,135,0.04)] hover:shadow-[0_12px_45px_rgba(31,38,135,0.08)] overflow-hidden backdrop-blur-xl transition-shadow duration-300 select-none"
      >
        {/* Vòng tròn màu trừu tượng tạo chiều sâu kính mờ Glassmorphism */}
        <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-emerald-400/10 dark:bg-emerald-500/5 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-700" />
        <div className="absolute -top-10 -right-10 w-44 h-44 bg-indigo-400/10 dark:bg-indigo-500/5 rounded-full blur-3xl pointer-events-none group-hover:scale-110 transition-transform duration-700" />
        <div className="absolute top-1/2 left-1/3 w-32 h-32 bg-purple-400/5 dark:bg-purple-500/3 rounded-full blur-3xl pointer-events-none" />

        {/* Lớp bóng chiếu sáng 3D Glare bằng Spring */}
        <motion.div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background: glareBg,
          }}
        />
        
        {/* Huy hiệu mục tiêu chuẩn Vàng */}
        <AnimatePresence>
          {isGoldStandard ? (
            <motion.div
              initial={{ scale: 0, rotate: -15 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              className="absolute top-3 right-4 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 px-3.5 py-1 text-[10px] font-extrabold text-slate-900 shadow-md shadow-amber-500/20 select-none animate-[pulse_2.2s_infinite] z-20 border border-yellow-300/30"
            >
              <span>🏆 Chuẩn Vàng</span>
            </motion.div>
          ) : (
            <div className="absolute top-3.5 right-4 flex items-center gap-1.5 text-xs text-app-accent/80 font-bold select-none pointer-events-none z-20">
              <span>🔮 Thẻ Bài Tương Lai</span>
            </div>
          )}
        </AnimatePresence>

        <p className="text-[10px] font-extrabold uppercase tracking-[0.25em] text-app-accent/70 mb-4 flex items-center gap-1.5 select-none pointer-events-none">
          <span>✨</span> MỤC TIÊU CỦA BẠN (LIVE PREVIEW)
        </p>

        <div className="text-base sm:text-[18px] leading-loose text-slate-800 dark:text-slate-100 font-serif tracking-wide select-text relative z-20">
          Tôi quyết tâm{" "}
          <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-lg transition-all duration-300 mx-1 text-[15px] sm:text-[16.5px]",
            isSpecFilled
              ? "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-350 font-semibold border border-emerald-500/20 shadow-[0_2px_8px_rgba(16,185,129,0.08)]"
              : "text-app-ink-muted/50 italic border border-dashed border-app-line bg-app-bg/40 animate-[pulse_2.0s_infinite]"
          )}>
            {isSpecFilled ? specText : "hành động cụ thể"}
          </span>
          <span className="text-xs opacity-75 ml-1 select-none">🎯</span>. 
          Tôi sẽ đo lường tiến bộ bằng cách đạt mốc{" "}
          <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-lg transition-all duration-300 mx-1 text-[15px] sm:text-[16.5px]",
            isMeasFilled
              ? "bg-blue-500/10 dark:bg-blue-500/20 text-blue-700 dark:text-blue-350 font-semibold border border-blue-500/20 shadow-[0_2px_8px_rgba(59,130,246,0.08)]"
              : "text-app-ink-muted/50 italic border border-dashed border-app-line bg-app-bg/40 animate-[pulse_2.0s_infinite]"
          )}>
            {isMeasFilled ? `${measTarget} ${measUnit || "đơn vị"}` : "chỉ số mục tiêu"}
          </span>
          <span className="text-xs opacity-75 ml-1 select-none">📊</span>. 
          Tôi cam kết dành ra{" "}
          <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-lg transition-all duration-300 mx-1 text-[15px] sm:text-[16.5px]",
            isAchFilled
              ? "bg-amber-500/10 dark:bg-amber-500/20 text-amber-700 dark:text-amber-350 font-semibold border border-amber-500/20 shadow-[0_2px_8px_rgba(245,158,11,0.08)]"
              : "text-app-ink-muted/50 italic border border-dashed border-app-line bg-app-bg/40 animate-[pulse_2.0s_infinite]"
          )}>
            {isAchFilled ? `${achHours} giờ mỗi tuần` : "thời gian cam kết"}
          </span>
          <span className="text-xs opacity-75 ml-1 select-none">⚡</span> để hành động. 
          Việc này rất quan trọng vì{" "}
          <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-lg transition-all duration-300 mx-1 text-[15px] sm:text-[16.5px]",
            isRelFilled
              ? "bg-rose-500/10 dark:bg-rose-500/20 text-rose-700 dark:text-rose-350 font-semibold border border-rose-500/20 shadow-[0_2px_8px_rgba(244,63,94,0.08)]"
              : "text-app-ink-muted/50 italic border border-dashed border-app-line bg-app-bg/40 animate-[pulse_2.0s_infinite]"
          )}>
            {isRelFilled ? relReason : "lý do sâu sắc của bạn"}
          </span>
          <span className="text-xs opacity-75 ml-1 select-none">❤️</span> và thời hạn hoàn thành trước{" "}
          <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-lg transition-all duration-300 mx-1 text-[15px] sm:text-[16.5px]",
            isTimeFilled
              ? "bg-purple-500/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-350 font-semibold border border-purple-500/20 shadow-[0_2px_8px_rgba(168,85,247,0.08)]"
              : "text-app-ink-muted/50 italic border border-dashed border-app-line bg-app-bg/40 animate-[pulse_2.0s_infinite]"
          )}>
            {isTimeFilled ? timeDate : "ngày hoàn thành"}
          </span>
          <span className="text-xs opacity-75 ml-1 select-none">📅</span>.
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={stepIndex}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-5"
        >
          {children}

          {/* AI Coach Hub - Giao diện Cố vấn Holographic Tương lai */}
          <div className="relative overflow-hidden rounded-[24px] border border-teal-500/15 dark:border-teal-900/30 bg-gradient-to-br from-teal-500/5 via-app-surface/95 to-indigo-500/5 dark:from-teal-950/10 dark:via-slate-900/80 dark:to-indigo-950/10 p-5 sm:p-6 shadow-[0_12px_40px_rgba(13,148,136,0.03)] transition-all duration-300 hover:shadow-[0_12px_45px_rgba(13,148,136,0.06)] hover:border-teal-500/25">
            {/* Background glowing decor */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex gap-4 items-start min-w-0 flex-1">
                {/* Mindfulness Orb phát sáng nhịp thở */}
                <div className="flex-shrink-0 relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-teal-400 via-emerald-400 to-indigo-500 text-white shadow-lg shadow-teal-500/20 border border-teal-300/30 dark:border-teal-700/20 transition-transform duration-300 hover:scale-105 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-teal-500/20 via-emerald-500/20 to-indigo-500/20 animate-pulse blur-sm" />
                    <Sparkles className="h-5.5 w-5.5 text-white relative z-10 animate-[spin_10s_linear_infinite]" />
                  </div>
                  {/* Chỉ báo hoạt động */}
                  <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white dark:bg-slate-900 shadow-sm" aria-hidden="true">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  </span>
                </div>

                {/* Nội dung bong bóng AI */}
                <div className="space-y-3 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-teal-600 dark:text-teal-400">
                      Cố vấn mục tiêu AI
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 dark:bg-emerald-400/5 px-2 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-500/10">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                      Trực tuyến
                    </span>
                  </div>

                  <div className="relative bg-white/60 dark:bg-slate-900/65 border border-teal-500/10 rounded-2xl rounded-tl-none p-4 shadow-sm text-sm text-slate-800 dark:text-slate-200">
                    {/* Đuôi bong bóng thoại */}
                    <div className="absolute -left-2 top-0 w-2 h-2 bg-white/60 dark:bg-slate-900/65 border-l border-t border-teal-500/10 rotate-45 transform origin-top-right hidden sm:block" />
                    
                    <p className="font-serif italic text-[14.5px] leading-relaxed text-slate-700 dark:text-slate-350 min-h-[44px]">
                      “{typedCoachText}”
                    </p>
                    
                    <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 select-none border-t border-teal-500/5 pt-2">
                      <Sparkles className="h-3.5 w-3.5 text-teal-500 animate-pulse" />
                      <span>Gợi ý chánh niệm giúp bạn nhanh chóng điền chuẩn xác.</span>
                    </div>

                    {/* Thanh đo sức mạnh mục tiêu thời gian thực */}
                    <div className="mt-4 pt-3 border-t border-teal-500/10 grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-slate-500 dark:text-slate-400">Độ rõ nét (Clarity)</span>
                          <span className="text-teal-600 dark:text-teal-400">{Math.round(clarityProgress)}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-teal-400 to-indigo-500 transition-all duration-500" style={{ width: `${clarityProgress}%` }} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-slate-500 dark:text-slate-400">Khả thi (Feasibility)</span>
                          <span className="text-emerald-600 dark:text-emerald-400">{feasibilityScore}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-500 bg-gradient-to-r",
                              feasibilityScore >= 80 ? "from-emerald-400 to-teal-500" :
                              feasibilityScore >= 60 ? "from-amber-400 to-emerald-500" : "from-rose-400 to-amber-550"
                            )} 
                            style={{ width: `${feasibilityScore}%` }} 
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bảng điều khiển Giọng điệu cố vấn + Nút áp dụng gợi ý */}
              <div className="flex flex-col gap-3 shrink-0 w-full sm:w-48">
                {/* Lựa chọn giọng điệu */}
                <div className="bg-slate-100/60 dark:bg-slate-900/60 p-2.5 rounded-xl border border-app-line">
                  <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 select-none">
                    Giọng điệu Cố vấn:
                  </span>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedTone("empathetic")}
                      className={cn(
                        "py-1 text-[10px] font-bold rounded-lg border transition-all duration-205",
                        selectedTone === "empathetic"
                          ? "bg-teal-500 text-white border-teal-500 shadow-sm"
                          : "bg-white dark:bg-slate-800 border-app-line text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                      )}
                      title="Đồng cảm & Chánh niệm"
                    >
                      ✨
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTone("pragmatic")}
                      className={cn(
                        "py-1 text-[10px] font-bold rounded-lg border transition-all duration-205",
                        selectedTone === "pragmatic"
                          ? "bg-teal-500 text-white border-teal-500 shadow-sm"
                          : "bg-white dark:bg-slate-800 border-app-line text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                      )}
                      title="Thực tế & Hành động"
                    >
                      ⚡
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTone("strategic")}
                      className={cn(
                        "py-1 text-[10px] font-bold rounded-lg border transition-all duration-205",
                        selectedTone === "strategic"
                          ? "bg-teal-500 text-white border-teal-500 shadow-sm"
                          : "bg-white dark:bg-slate-800 border-app-line text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                      )}
                      title="Chiến lược & Phân tích"
                    >
                      🧠
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  className="relative overflow-hidden inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 px-4 py-3 text-xs font-bold text-white shadow-md shadow-teal-500/10 transition-all duration-200 hover:shadow-lg hover:shadow-teal-500/20 active:scale-[0.97] group/shimmer"
                  onClick={handleApplyTransformedStarter}
                  aria-label={`Dùng gợi ý cho bước ${step.label}`}
                >
                  {/* Shimmer effect reflection */}
                  <span className="absolute inset-0 w-1/2 h-full bg-white/20 transform -skew-x-12 -translate-x-full group-hover/shimmer:animate-[shimmer_1.5s_ease-in-out_infinite]" />
                  
                  <Sparkles className="h-3.5 w-3.5 relative z-10 animate-[pulse_1.5s_infinite]" />
                  <span className="relative z-10">Sử dụng gợi ý này</span>
                </button>
              </div>
            </div>
          </div>

          <details className="group rounded-[16px] border border-app-line bg-app-surface p-4 transition-all duration-200 shadow-sm">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 rounded-lg p-1 [&::-webkit-details-marker]:hidden">
              <div className="space-y-1">
                <p className="flex items-center gap-2 font-semibold">
                  Kiểm tra độ rõ của mục tiêu (Clarity)
                  <ChevronDown className="h-4 w-4 text-app-ink-muted transition-transform duration-200 group-open:rotate-180" />
                </p>
                <p className="text-xs font-normal text-app-ink-muted">
                  {clarityDoneCount}/{clarityItems.length} tiêu chí đã hoàn thành
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-2 w-28 overflow-hidden rounded-full bg-app-line" aria-hidden="true">
                  <div className="h-full rounded-full bg-app-accent transition-all duration-305" style={{ width: `${clarityProgress}%` }} />
                </div>
                <span className="text-xs font-bold text-app-accent">{Math.round(clarityProgress)}%</span>
              </div>
            </summary>
            <div className="mt-4 grid gap-3 border-t border-app-line pt-4 sm:grid-cols-2">
              {clarityItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onJumpToStep(item.stepKey)}
                  className={cn(
                    "group/btn flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-all duration-200",
                    item.done
                      ? "border-app-accent/20 bg-app-accent-soft/30 hover:border-app-accent hover:bg-app-accent-soft/60 shadow-sm"
                      : "border-app-line bg-app-bg hover:border-app-ink-muted hover:bg-app-surface"
                  )}
                >
                  <div className={cn(
                    "mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border transition-all duration-200",
                    item.done
                      ? "border-app-accent bg-app-accent text-white"
                      : "border-app-ink-muted/30 text-transparent group-hover/btn:border-app-ink-muted"
                  )}>
                    {item.done ? <Check className="h-3 w-3" /> : <div className="h-1.5 w-1.5 rounded-full bg-app-ink-muted/30" />}
                  </div>
                  <div className="space-y-0.5">
                    <span className="block text-sm font-semibold text-app-ink group-hover/btn:text-app-accent transition-colors duration-150">{item.label}</span>
                    <span className="block text-xs leading-normal text-app-ink-soft">{item.detail}</span>
                  </div>
                </button>
              ))}
            </div>
          </details>

          {showReview ? (
            <>
              <ReviewStep
                clarityDoneCount={clarityDoneCount}
                clarityItemCount={clarityItems.length}
                summaryRows={summaryRows}
                onJumpToStep={onJumpToStep}
              />
              {qualityFeedback ? (
                <QualityFeedbackPanel
                  level={qualityFeedback.level}
                  overallScore={qualityFeedback.overallScore}
                  warnings={qualityFeedback.warnings}
                  suggestions={qualityFeedback.suggestions}
                  canProceedToFeasibility={qualityFeedback.canProceedToFeasibility}
                />
              ) : null}
            </>
          ) : null}

          {currentStepError ? (
            <div
              className="rounded-xl border border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-bg)] p-4 text-[color:var(--color-warning-fg)] shadow-sm animate-[shake_0.5s_ease-in-out]"
              role="alert"
            >
              <div className="flex items-start gap-2.5">
                <CircleAlert className="mt-0.5 h-4.5 w-4.5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold">Cần hoàn tất bước này</p>
                  <p className="mt-1 text-sm leading-5 opacity-90">{currentStepError}</p>
                </div>
              </div>
            </div>
          ) : null}
          {currentStepSoftWarning ? (
            <div className="rounded-xl border border-app-line bg-app-bg p-4 text-app-ink-soft shadow-sm" role="note">
              <div className="flex items-start gap-2.5">
                <Lightbulb className="mt-0.5 h-4.5 w-4.5 shrink-0 text-app-accent" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-app-ink">Gợi ý để mục tiêu rõ hơn</p>
                  <p className="mt-1 text-sm leading-5">{currentStepSoftWarning}</p>
                </div>
              </div>
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>

      <div className="mt-7 flex flex-col-reverse gap-3 border-t border-app-line pt-5 sm:flex-row sm:justify-between">
        <button
          type="button"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-app-line bg-app-surface px-5 py-2.5 text-sm font-medium text-app-ink transition-all duration-150 hover:bg-app-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 sm:w-auto"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Quay lại
        </button>
        <button
          type="button"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-app-accent px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-app-accent/15 transition-all duration-150 hover:brightness-105 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 sm:w-auto"
          onClick={onNext}
          disabled={!isCurrentStepValid}
        >
          {stepIndex < totalSteps - 1 ? "Tiếp" : "Hoàn thành"}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
