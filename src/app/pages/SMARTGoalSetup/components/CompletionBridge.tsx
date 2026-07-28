import {
  ArrowRight,
  BarChart3,
  Calendar,
  Check,
  Clock,
  Compass,
  Heart,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/app/components/ui/utils";
import type { SMARTData } from "../types";

interface CompletionBridgeProps {
  smartData: SMARTData;
  focusArea: string;
  onContinue: () => void;
  onCheckFeasibility?: () => void;
}

const STEP_ICONS = [Target, BarChart3, ShieldCheck, Heart, Clock];

function formatSummaryGoal(smartData: SMARTData): string {
  const goal = smartData.specific.goal_statement.trim();
  const metric = smartData.measurable.metric_name.trim();
  const target = smartData.measurable.target_value.trim();
  if (!goal) return "Mục tiêu của bạn";
  let text = goal;
  if (metric && target) text += ` - ${metric}: ${target}`;
  return text;
}

export function CompletionBridge({
  smartData,
  focusArea,
  onContinue,
  onCheckFeasibility,
}: CompletionBridgeProps) {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const [phase, setPhase] = useState<"gathering" | "done">("gathering");
  const [showConfetti, setShowConfetti] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playChime = useCallback(() => {
    try {
      // biome-ignore lint/suspicious/noExplicitAny: webkitAudioContext fallback
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      if (!audioCtxRef.current) audioCtxRef.current = new AudioCtxClass();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(528, now);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 2);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(792, now + 0.15);
      gain2.gain.setValueAtTime(0.06, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 2.4);

      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = "sine";
      osc3.frequency.setValueAtTime(1320, now + 0.3);
      gain3.gain.setValueAtTime(0.03, now + 0.3);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 1.6);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.3);
      osc3.stop(now + 1.8);
    } catch (_e) {
      /* audio not critical */
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPhase("done");
      playChime();
      setShowConfetti(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, [playChime]);

  const weeklyHours = Number(smartData.achievable.weekly_time_commitment_hours) || 0;
  const targetWeeks =
    smartData.timeBound.mode === "weeks" ? Number(smartData.timeBound.target_weeks) || 0 : 0;
  const totalHours = weeklyHours * targetWeeks;
  const summaryGoal = formatSummaryGoal(smartData);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-app-bg/95 backdrop-blur-xl p-4 sm:p-6">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-[24px] border border-app-line bg-app-surface shadow-app-card">
        {/* Soft top gradient */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-40 opacity-40"
          style={{
            background: "radial-gradient(circle at 50% 0%, rgba(16,185,129,0.18), transparent 70%)",
          }}
        />

        <div className="relative flex flex-col items-center px-6 pb-8 pt-10 text-center sm:px-10 sm:pb-10 sm:pt-12">
          <AnimatePresence mode="wait">
            {phase === "gathering" ? (
              <motion.div
                key="gathering"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center gap-5 py-8"
              >
                <div className="relative">
                  <motion.div
                    animate={shouldReduceMotion ? {} : { rotate: 360 }}
                    transition={shouldReduceMotion ? {} : { duration: 8, repeat: Infinity, ease: "linear" }}
                    className="flex h-20 w-20 items-center justify-center rounded-full bg-app-accent-soft/60 text-app-accent"
                  >
                    <Sparkles className="h-8 w-8" aria-hidden="true" />
                  </motion.div>
                  <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-app-accent text-white shadow-sm">
                    <Target className="h-4 w-4" aria-hidden="true" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-extrabold tracking-[-0.02em] text-app-ink sm:text-2xl" style={{ fontFamily: "'Bricolage Grotesque', serif" }}>
                    Đang chuẩn bị mục tiêu...
                  </h2>
                  <p className="text-sm text-app-ink-soft">Chuẩn bị chuyển sang bước tiếp theo của hành trình.</p>
                </div>
                <div className="h-1.5 w-48 overflow-hidden rounded-full bg-app-line">
                  <motion.div
                    className="h-full rounded-full bg-app-accent"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="done"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="flex w-full flex-col items-center gap-6"
              >
                {/* Sticker row */}
                <div className="flex -space-x-2">
                  {STEP_ICONS.map((Icon, index) => (
                    <motion.div
                      key={Icon.displayName ?? String(index)}
                      initial={{ opacity: 0, scale: 0, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: index * 0.07, duration: 0.35 }}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full border-2 border-app-surface bg-app-bg text-app-ink shadow-sm",
                        index === 0 && "z-10",
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </motion.div>
                  ))}
                </div>

                <div className="space-y-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-app-accent/20 bg-app-accent/10 px-3 py-1 text-xs font-semibold text-app-accent">
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    Mục tiêu SMART đã sẵn sàng
                  </span>
                  <h2 className="text-2xl font-extrabold leading-tight tracking-[-0.025em] text-app-ink sm:text-3xl" style={{ fontFamily: "'Bricolage Grotesque', serif" }}>
                    Chúc mừng bạn đã có mục tiêu rõ ràng!
                  </h2>
                  <p className="mx-auto max-w-lg text-sm leading-relaxed text-app-ink-soft">
                    Bạn vừa hoàn thành một mục tiêu SMART về <strong className="text-app-ink">{focusArea}</strong>.
                    Giờ hãy chọn cách tiếp tục hành trình.
                  </p>
                </div>

                {/* Goal card */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="w-full max-w-lg rounded-card border border-app-accent/10 bg-app-accent-soft/30 p-4 text-left shadow-sm sm:p-5"
                >
                  <p className="mb-2 flex items-center gap-1.5 text-[12px] font-extrabold text-app-accent">
                    <Target className="h-3.5 w-3.5" aria-hidden="true" />
                    Mục tiêu của bạn
                  </p>
                  <p className="text-base font-semibold leading-relaxed text-app-ink sm:text-lg">
                    &ldquo;{summaryGoal}&rdquo;
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-xl bg-app-surface/70 p-2.5 text-center">
                      <Clock className="mx-auto h-4 w-4 text-app-accent" aria-hidden="true" />
                      <p className="mt-1 text-xs text-app-ink-muted">Cam kết mỗi tuần</p>
                      <p className="text-sm font-bold text-app-ink">{weeklyHours > 0 ? `${weeklyHours} giờ` : "Chưa có"}</p>
                    </div>
                    <div className="rounded-xl bg-app-surface/70 p-2.5 text-center">
                      <Calendar className="mx-auto h-4 w-4 text-app-accent" aria-hidden="true" />
                      <p className="mt-1 text-xs text-app-ink-muted">Thời gian</p>
                      <p className="text-sm font-bold text-app-ink">
                        {targetWeeks > 0 ? `${targetWeeks} tuần` : "Chưa có"}
                      </p>
                    </div>
                    <div className="col-span-2 rounded-xl bg-app-surface/70 p-2.5 text-center sm:col-span-1">
                      <Compass className="mx-auto h-4 w-4 text-app-accent" aria-hidden="true" />
                      <p className="mt-1 text-xs text-app-ink-muted">Tổng đầu từ</p>
                      <p className="text-sm font-bold text-app-ink">{totalHours > 0 ? `${totalHours} giờ` : "Chưa có"}</p>
                    </div>
                  </div>
                </motion.div>

                {/* Actions */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="flex w-full max-w-lg flex-col gap-3 sm:flex-row"
                >
                  {onCheckFeasibility && (
                    <button
                      type="button"
                      onClick={onCheckFeasibility}
                      className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-control border border-app-line bg-app-surface px-5 py-2.5 text-sm font-semibold text-app-ink transition-all duration-200 hover:bg-app-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40"
                    >
                      Kiểm tra khả thi nâng cao
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onContinue}
                    className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-control bg-app-accent px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(12,94,58,0.3)] transition-all duration-200 hover:shadow-[0_8px_24px_rgba(12,94,58,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40"
                  >
                    Tiếp tục tạo kế hoạch 12 tuần
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </motion.div>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="flex items-center gap-1.5 text-xs text-app-ink-muted"
                >
                  <Check className="h-3.5 w-3.5 text-app-status-success" aria-hidden="true" />
                  Mục tiêu đã được lưu tự động
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {showConfetti && !shouldReduceMotion && (
        <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden" aria-hidden="true">
          {Array.from({ length: 24 }).map(() => {
            const size = 6 + Math.random() * 10;
            const left = Math.random() * 100;
            const delay = Math.random() * 0.5;
            const duration = 1.5 + Math.random() * 1.5;
            const key = `${size}-${left}-${delay}-${duration}`;
            // Festive palette căn chỉnh về Forest Green (thay drift indigo/violet bằng sắc xanh rừng).
            const colors = ["#10b981", "#34d399", "#3a7261", "#5ba590", "#fbbf24", "#f472b6"];
            const color = colors[Math.floor(Math.random() * colors.length)] ?? colors[0];
            return (
              <motion.div
                key={key}
                initial={{ opacity: 1, y: -20, x: `${left}vw`, rotate: 0, scale: 0 }}
                animate={{ opacity: 0, y: "100vh", rotate: 720, scale: 1 }}
                transition={{ delay, duration, ease: "easeOut" }}
                className="absolute top-0 rounded-full"
                style={{ width: size, height: size, backgroundColor: color }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
