import { useEffect, useState, useRef } from "react";
import { Sparkles, Sprout, Play } from "lucide-react";

interface ZenBreathingGateProps {
  onComplete: () => void;
}

type BreathPhase = "idle" | "inhale" | "hold" | "exhale" | "completed";

// Bộ tổng hợp tiếng chuông Zen thanh tịnh 528Hz bằng Web Audio API khi hoàn thành hơi thở
const playZenBell528 = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "sine";
    // Tần số Solfeggio 528Hz phục hồi và chánh niệm
    osc.frequency.setValueAtTime(528, ctx.currentTime);

    gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 3.0);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 3.0);
  } catch (e) {
    console.warn("Web Audio Context not initialized yet", e);
  }
};

export function ZenBreathingGate({ onComplete }: ZenBreathingGateProps) {
  const [phase, setPhase] = useState<BreathPhase>("idle");
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<number | null>(null);

  // Vòng lặp quản lý nhịp thở 10 giây
  useEffect(() => {
    if (phase === "idle" || phase === "completed") return;

    timerRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => {
        const nextSec = prev - 1;
        
        // Quản lý tiến trình phần trăm (10 giây tổng cộng)
        const currentProgress = ((10 - nextSec) / 10) * 100;
        setProgress(currentProgress);

        // Xác định giai đoạn thở dựa trên giây hiện tại
        // Hít vào: 10s -> 7s (4 giây đầu)
        // Giữ hơi: 6s -> 5s (2 giây tiếp)
        // Thở ra: 4s -> 1s (4 giây cuối)
        if (nextSec >= 7) {
          setPhase("inhale");
        } else if (nextSec >= 5) {
          setPhase("hold");
        } else if (nextSec > 0) {
          setPhase("exhale");
        } else {
          // Hoàn thành
          if (timerRef.current) clearInterval(timerRef.current);
          setPhase("completed");
          setProgress(100);
          playZenBell528();
          return 0;
        }

        return nextSec;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase]);

  const handleStart = () => {
    setPhase("inhale");
    setSecondsLeft(10);
    setProgress(0);
  };

  // Lấy lời hướng dẫn cho từng nhịp thở
  const getInstructionText = () => {
    switch (phase) {
      case "idle":
        return "Hãy chọn tư thế thật thoải mái, hít một hơi sâu tự nhiên trước khi bắt đầu lắng đọng.";
      case "inhale":
        return "Hít vào thật nhẹ nhàng... Nhận biết luồng năng lượng tích cực...";
      case "hold":
        return "Tĩnh lặng giữ hơi thở... Cảm nhận sự bình yên trọn vẹn...";
      case "exhale":
        return "Thở ra buông bỏ... Giải phóng mọi lo toan và áp lực...";
      case "completed":
        return "Tâm trí bạn giờ đây đã sẵn sàng và tĩnh tại.";
    }
  };

  // Lấy màu sắc chủ đạo dựa trên giai đoạn thở
  const getThemeColorClass = () => {
    switch (phase) {
      case "inhale":
        return "from-mood-sky to-mood-lavender text-mood-sky";
      case "hold":
        return "from-mood-lavender to-mood-rose text-mood-lavender";
      case "exhale":
        return "from-mood-rose to-mood-amber text-mood-rose";
      case "completed":
        return "from-mood-mint to-mood-sky text-mood-mint";
      default:
        return "from-mood-sky to-mood-sky text-mood-sky";
    }
  };

  const getOverlayScale = () => {
    if (phase === "inhale") return "scale-110 opacity-70";
    if (phase === "hold") return "scale-125 opacity-100";
    if (phase === "exhale") return "scale-95 opacity-40";
    if (phase === "completed") return "scale-105 opacity-80";
    return "scale-100 opacity-30";
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center transition-all duration-500 animate-[fadeIn_0.4s_ease-out]">
      {/* Biểu tượng Sprout chánh niệm nhỏ mờ */}
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-mood-lavender-soft text-mood-lavender shadow-inner animate-[pulse_3s_infinite]">
        <Sprout className="h-5 w-5" />
      </div>

      <h2 className="mt-4 font-serif text-2xl font-medium tracking-tight text-app-ink sm:text-3xl">
        Khai mở nhịp thở tĩnh tâm
      </h2>
      <p className="mt-2.5 max-w-sm text-xs leading-5 text-app-ink-soft">
        Dành ra 10 giây tĩnh lặng điều hòa hơi thở để gieo hạt mầm cho tầm nhìn sáng suốt nhất của bạn.
      </p>

      {/* Sân khấu vòng tròn thở (Zen Breathing Circle) */}
      <div className="my-10 flex h-48 w-48 items-center justify-center relative">
        {/* Hào quang nền lan tỏa đa sắc mượt mà */}
        <div 
          className={`absolute rounded-full bg-gradient-to-tr from-mood-sky/15 via-mood-lavender/15 to-mood-rose/10 blur-2xl transition-all duration-[2500ms] ease-out pointer-events-none w-44 h-44 ${getOverlayScale()}`}
        />

        {/* Vòng tròn thở chính thay đổi kích thước mượt mà theo nhịp thở */}
        <div
          className={`relative z-10 flex items-center justify-center rounded-full border border-white/20 bg-gradient-to-br shadow-lg backdrop-blur-md transition-all duration-1000 ${
            phase === "idle"
              ? "h-28 w-28 scale-100 from-mood-sky/10 to-mood-lavender/5"
              : phase === "inhale"
                ? "h-40 w-40 from-mood-sky/20 to-mood-lavender/15 shadow-mood-sky/10"
                : phase === "hold"
                  ? "h-40 w-40 scale-105 from-mood-lavender/25 to-mood-rose/20 ring-8 ring-mood-lavender-soft/30 shadow-mood-lavender/15 animate-pulse"
                  : phase === "exhale"
                    ? "h-28 w-28 from-mood-rose/15 to-mood-amber/10 shadow-mood-rose/5"
                    : "h-32 w-32 from-mood-mint/20 to-mood-sky/15 ring-4 ring-mood-mint-soft/30 border-mood-mint/30 shadow-mood-mint/10 animate-[bounce_1s_infinite_alternate]" // completed
          }`}
        >
          {/* Nhãn giây hoặc icon */}
          {phase === "idle" ? (
            <button
              type="button"
              onClick={handleStart}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-r from-mood-sky to-mood-lavender text-white shadow-md shadow-mood-sky/20 hover:scale-[1.06] active:scale-95 transition-all duration-200"
              aria-label="Bắt đầu bài tập thở"
            >
              <Play className="h-6 w-6 fill-white ml-0.5" />
            </button>
          ) : phase === "completed" ? (
            <Sparkles className="h-8 w-8 text-mood-mint animate-[spin_4s_linear_infinite]" />
          ) : (
            <span className="text-2xl font-bold font-serif text-app-ink tabular-nums animate-[pulse_1s_infinite]">
              {secondsLeft}s
            </span>
          )}
        </div>
      </div>

      {/* Hướng dẫn thở chánh niệm */}
      <div className="h-14 max-w-md">
        <p className={`text-sm leading-relaxed font-serif italic transition-all duration-500 ${phase !== "idle" ? "text-app-ink font-medium" : "text-app-ink-soft"}`}>
          {getInstructionText()}
        </p>
      </div>

      {/* Thanh tiến trình siêu mỏng ở dưới */}
      {phase !== "idle" && phase !== "completed" && (
        <div className="mt-4 w-48 h-[3px] bg-app-line rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${getThemeColorClass()} transition-all duration-1000 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Nút bấm chuyển trang xuất hiện khi completed */}
      {phase === "completed" && (
        <button
          type="button"
          onClick={onComplete}
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-mood-mint to-mood-sky px-6 py-3 text-sm font-medium text-white shadow-md shadow-mood-mint/25 hover:scale-[1.03] active:scale-95 transition-all duration-200 animate-[fadeIn_0.5s_ease-out] ring-4 ring-mood-mint-soft/50"
        >
          Khai mở tầm nhìn cuộc sống
          <Sparkles className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
