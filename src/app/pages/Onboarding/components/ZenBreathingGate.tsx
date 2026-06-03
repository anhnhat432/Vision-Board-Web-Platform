import { Play, Sparkles, Sprout } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ZenBreathingGateProps {
  onComplete: () => void;
}

type BreathPhase = "idle" | "inhale" | "hold" | "exhale" | "completed";

const playZenBell528 = () => {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as Record<string, typeof AudioContext>).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = "sine";
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
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const listener = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    if (phase === "idle" || phase === "completed") return;

    timerRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => {
        const nextSec = prev - 1;
        const currentProgress = ((10 - nextSec) / 10) * 100;
        setProgress(currentProgress);

        if (nextSec >= 7) {
          setPhase("inhale");
        } else if (nextSec >= 5) {
          setPhase("hold");
        } else if (nextSec > 0) {
          setPhase("exhale");
        } else {
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

  const getInstructionText = () => {
    switch (phase) {
      case "idle":
        return "Nếu cần, dành 10 giây để vào nhịp trước khi chấm điểm.";
      case "inhale":
        return "Hít vào nhẹ. Chuẩn bị nhìn lại hiện tại của bạn.";
      case "hold":
        return "Giữ nhịp. Không cần hoàn hảo, chỉ cần đủ thật.";
      case "exhale":
        return "Thở ra. Chọn điểm bắt đầu rõ ràng hơn.";
      case "completed":
        return "Bạn đã sẵn sàng mở bản đồ cuộc sống.";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 text-center transition-all duration-500 motion-safe:animate-[fadeIn_0.4s_ease-out] motion-reduce:transition-none">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-app-accent-soft text-app-accent shadow-inner">
        <Sprout className="h-5 w-5 motion-safe:animate-pulse motion-reduce:animate-none" />
      </div>

      <h2 className="mt-4 font-serif text-2xl font-medium tracking-tight text-app-ink sm:text-3xl">
        Vào nhịp trước khi chấm điểm
      </h2>
      <p className="mt-2.5 max-w-sm text-sm leading-6 text-app-ink-soft">
        Bài thở này là tùy chọn. Bạn có thể bỏ qua và đi thẳng vào Atlas cuộc sống.
      </p>

      <div className="relative my-10 flex h-48 w-48 items-center justify-center">
        <div
          className={`pointer-events-none absolute rounded-full bg-app-accent-soft blur-xl transition-all duration-[3000ms] motion-reduce:transition-none ${
            prefersReducedMotion
              ? "h-36 w-36 opacity-50"
              : phase === "inhale"
                ? "h-44 w-44 opacity-80"
                : phase === "hold"
                  ? "h-48 w-48 scale-105 opacity-100"
                  : "h-36 w-36 opacity-30"
          }`}
        />

        <div
          className={`relative z-10 flex items-center justify-center rounded-full border border-app-line bg-app-surface shadow-inner transition-all duration-1000 motion-reduce:transition-none ${
            prefersReducedMotion
              ? "h-32 w-32 opacity-100"
              : phase === "idle"
                ? "h-28 w-28 scale-100"
                : phase === "inhale"
                  ? "h-40 w-40 bg-app-accent-soft"
                  : phase === "hold"
                    ? "h-40 w-40 scale-105 bg-app-accent-soft ring-8 ring-app-accent-soft motion-safe:animate-pulse"
                    : phase === "exhale"
                      ? "h-28 w-28 bg-app-accent-soft"
                      : "h-32 w-32 border-app-accent bg-app-accent-soft ring-4 ring-app-accent-soft"
          }`}
        >
          {phase === "idle" ? (
            <button
              type="button"
              onClick={handleStart}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-app-accent text-white shadow-app-sm transition-transform hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 motion-reduce:transition-none motion-reduce:hover:scale-100"
              aria-label="Bắt đầu bài tập thở"
            >
              <Play className="ml-0.5 h-6 w-6 fill-white" />
            </button>
          ) : phase === "completed" ? (
            <Sparkles className={`h-8 w-8 text-app-accent ${prefersReducedMotion ? "" : "animate-bounce"}`} />
          ) : (
            <span className="font-serif text-xl font-bold tabular-nums text-app-accent">{secondsLeft}s</span>
          )}
        </div>
      </div>

      <div className="h-16 max-w-md">
        <p
          className={`text-sm leading-6 text-app-ink transition-all duration-500 motion-reduce:transition-none ${
            phase !== "idle" ? "font-semibold text-app-accent" : "text-app-ink-soft"
          }`}
        >
          {getInstructionText()}
        </p>
      </div>

      {phase === "idle" && (
        <button
          type="button"
          onClick={onComplete}
          className="relative mt-1 rounded-control px-4 py-2 text-sm font-semibold text-app-ink-soft underline transition-colors hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 after:absolute after:left-1/2 after:top-1/2 after:h-11 after:min-w-11 after:-translate-x-1/2 after:-translate-y-1/2"
        >
          Vào thẳng Atlas cuộc sống
        </button>
      )}

      {phase !== "idle" && phase !== "completed" && (
        <div className="mt-4 flex flex-col items-center gap-3">
          <div className="h-0.5 w-48 overflow-hidden rounded-full bg-app-line">
            <div
              className="h-full bg-app-accent transition-all duration-1000 ease-linear motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
          <button
            type="button"
            onClick={onComplete}
            className="relative rounded-control px-4 py-2 text-sm text-app-ink-soft underline transition-colors hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 after:absolute after:left-1/2 after:top-1/2 after:h-11 after:min-w-11 after:-translate-x-1/2 after:-translate-y-1/2"
          >
            Bỏ qua bài thở
          </button>
        </div>
      )}

      {phase === "completed" && (
        <button
          type="button"
          onClick={onComplete}
          className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-pill bg-app-accent px-6 py-3 text-sm font-semibold text-white shadow-app-sm transition-colors hover:bg-app-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 motion-safe:animate-[fadeIn_0.5s_ease-out] motion-reduce:transition-none"
        >
          Mở bản đồ cuộc sống
          <Sparkles className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
