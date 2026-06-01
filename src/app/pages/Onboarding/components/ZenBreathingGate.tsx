import { useEffect, useState, useRef } from "react";
import { Sparkles, Sprout, Play } from "lucide-react";

interface ZenBreathingGateProps {
  onComplete: () => void;
}

type BreathPhase = "idle" | "inhale" | "hold" | "exhale" | "completed";

// Bộ tổng hợp tiếng chuông Zen thanh tịnh 528Hz bằng Web Audio API khi hoàn thành hơi thở
const playZenBell528 = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as Record<string, typeof AudioContext>).webkitAudioContext;
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
        return "Hãy chọn tư thế thoải mái, hít một hơi sâu tự nhiên trước khi bắt đầu.";
      case "inhale":
        return "Hít vào thật nhẹ nhàng... Nhận biết luồng sinh khí...";
      case "hold":
        return "Nín thở tĩnh lặng... Lắng nghe sự yên bình bên trong...";
      case "exhale":
        return "Thở ra buông bỏ... Giải phóng mọi áp lực và lo toan...";
      case "completed":
        return "Tâm trí bạn giờ đây đã sẵn sàng và tĩnh tại.";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center transition-all duration-500 animate-[fadeIn_0.4s_ease-out]">
      {/* Biểu tượng Sprout chánh niệm nhỏ mờ */}
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 shadow-inner">
        <Sprout className="h-5 w-5 animate-pulse" />
      </div>

      <h2 className="mt-4 font-serif text-2xl font-medium tracking-tight text-app-ink sm:text-3xl">
        Khai mở nhịp thở tĩnh tâm
      </h2>
      <p className="mt-2.5 max-w-sm text-xs leading-5 text-app-ink-soft">
        Dành ra 10 giây tĩnh lặng điều hòa hơi thở Stoic để gieo hạt mầm tầm nhìn sáng suốt nhất.
      </p>

      {/* Sân khấu vòng tròn thở (Zen Breathing Circle) */}
      <div className="my-10 flex h-48 w-48 items-center justify-center relative">
        {/* Hào quang nền lan tỏa chậm */}
        <div 
          className={`absolute rounded-full bg-emerald-500/5 blur-xl transition-all duration-[3000ms] pointer-events-none ${
            phase === "inhale" ? "h-44 w-44 opacity-80" : phase === "hold" ? "h-48 w-48 opacity-100 scale-105" : "h-36 w-36 opacity-30"
          }`}
        />

        {/* Vòng tròn thở chính thay đổi kích thước mượt mà theo nhịp thở */}
        <div
          className={`relative z-10 flex items-center justify-center rounded-full border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-teal-500/5 shadow-inner transition-all duration-1000 ${
            phase === "idle"
              ? "h-28 w-28 scale-100"
              : phase === "inhale"
                ? "h-40 w-40 bg-emerald-500/20 shadow-emerald-500/15"
                : phase === "hold"
                  ? "h-40 w-40 scale-105 bg-emerald-500/25 ring-8 ring-emerald-500/5 shadow-emerald-500/25 animate-pulse"
                  : phase === "exhale"
                    ? "h-28 w-28 bg-emerald-500/10 shadow-emerald-500/5"
                    : "h-32 w-32 bg-emerald-500/20 ring-4 ring-emerald-500/10 border-emerald-500/40" // completed
          }`}
        >
          {/* Nhãn giây hoặc icon */}
          {phase === "idle" ? (
            <button
              type="button"
              onClick={handleStart}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all"
              aria-label="Bắt đầu bài tập thở"
            >
              <Play className="h-6 w-6 fill-white ml-0.5" />
            </button>
          ) : phase === "completed" ? (
            <Sparkles className="h-8 w-8 text-emerald-600 animate-bounce" />
          ) : (
            <span className="text-xl font-bold font-serif text-emerald-800 dark:text-emerald-300 tabular-nums">
              {secondsLeft}s
            </span>
          )}
        </div>
      </div>

      {/* Hướng dẫn thở chánh niệm */}
      <div className="h-14 max-w-md">
        <p className={`text-sm leading-relaxed font-serif italic text-app-ink transition-all duration-500 ${phase !== "idle" ? "text-emerald-700 dark:text-emerald-400 font-semibold" : "text-app-ink-soft"}`}>
          {getInstructionText()}
        </p>
      </div>

      {phase === "idle" && (
        <button
          type="button"
          onClick={onComplete}
          className="mt-1 text-xs font-semibold text-app-ink-soft underline hover:text-app-ink transition-colors relative py-2 px-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20 rounded-lg after:absolute after:h-[44px] after:min-w-[44px] after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2"
        >
          Vào thẳng chấm điểm
        </button>
      )}

      {/* Thanh tiến trình siêu mỏng ở dưới */}
      {phase !== "idle" && phase !== "completed" && (
        <div className="mt-4 flex flex-col items-center gap-3">
          <div className="w-48 h-[2px] bg-app-line rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 transition-all duration-1000 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <button
            type="button"
            onClick={onComplete}
            className="text-xs text-app-ink-soft underline hover:text-app-ink transition-colors relative py-2 px-4 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20 rounded-lg after:absolute after:h-[44px] after:min-w-[44px] after:top-1/2 after:left-1/2 after:-translate-x-1/2 after:-translate-y-1/2"
          >
            Bỏ qua bài thở
          </button>
        </div>
      )}

      {/* Nút bấm chuyển trang xuất hiện khi completed */}
      {phase === "completed" && (
        <button
          type="button"
          onClick={onComplete}
          className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 hover:from-emerald-500 hover:to-teal-500 hover:scale-[1.03] active:scale-97 transition-all duration-200 animate-[fadeIn_0.5s_ease-out] ring-4 ring-emerald-500/10"
        >
          Khai mở tầm nhìn cuộc sống
          <Sparkles className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
