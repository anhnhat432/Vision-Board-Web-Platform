import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Smile } from "lucide-react";
import { JourneyStepCard } from "./JourneyStepCard";

interface HeroSectionProps {
  onStart: () => void;
  onBreathing: () => void;
  onDefer: () => void;
  onHelpToggle: () => void;
  isHelpOpen: boolean;
  children?: React.ReactNode;
}

const JOURNEY_STEPS = [
  {
    number: "01",
    title: "Đánh giá",
    description: "Rà 8 lĩnh vực để nhìn ra bức tranh thật của cuộc sống.",
  },
  {
    number: "02",
    title: "Trọng tâm",
    description: "Nhận ra nơi cần chăm sóc trước trong 12 tuần tới.",
  },
  {
    number: "03",
    title: "Kế hoạch",
    description: "Biến insight thành hành động rõ ràng từng tuần.",
  },
];

export function HeroSection({
  onStart,
  onBreathing,
  onDefer,
  onHelpToggle: _onHelpToggle,
  children,
}: HeroSectionProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-app-line/40 bg-white p-5 shadow-app-md sm:p-8 lg:p-10">
      <div className="relative z-10">
        <motion.div
          initial={reduceMotion ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-app-accent/20 bg-app-accent/5 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-app-accent sm:mb-8"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-app-accent motion-safe:animate-pulse" />
          Bước 1 / 3 · Atlas cuộc sống · 3 phút
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-10">
          <div className="space-y-6">
            <motion.h1
              initial={reduceMotion ? {} : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="font-serif text-[clamp(28px,4vw,44px)] font-bold leading-[1.08] tracking-tight text-app-ink"
            >
              Bản đồ cuộc sống
của bạn bắt đầu từ đây
            </motion.h1>

            <motion.p
              initial={reduceMotion ? {} : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="max-w-[50ch] text-[14px] leading-[1.6] text-app-ink-soft sm:text-[15px]"
            >
              Rà 8 lĩnh vực để nhìn ra nơi cần chăm sóc đầu tiên, rồi chuyển thành Life Insight rõ ràng cho chặng 12 tuần.
            </motion.p>

            <motion.div
              initial={reduceMotion ? {} : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
            >
              <button
                type="button"
                onClick={onStart}
                className="dof-primary inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[14px] bg-app-accent px-6 py-3 text-[14px] font-bold text-white shadow-[0_10px_24px_-10px_rgba(12,94,58,0.6)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-12px_rgba(12,94,58,0.7)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 sm:min-h-[54px] sm:px-7"
              >
                Mở bản đồ cuộc sống
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={onBreathing}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[14px] border border-app-line bg-white px-5 py-2.5 text-[13.5px] font-semibold text-app-ink transition-colors hover:bg-app-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 sm:min-h-[50px]"
              >
                <Smile className="h-[15px] w-[15px]" aria-hidden="true" />
                Tập thở thư giãn
              </button>

              <button
                type="button"
                onClick={onDefer}
                className="inline-flex min-h-[44px] items-center justify-center rounded-[14px] px-3 py-2 text-[13.5px] font-semibold text-app-ink-muted transition-colors hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent focus-visible:ring-offset-2 sm:min-h-0 sm:justify-start"
              >
                Để sau
              </button>
            </motion.div>
          </div>

          <div className="relative order-first lg:order-last">{children}</div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-3 sm:gap-4 lg:mt-10">
          {JOURNEY_STEPS.map((step, index) => (
            <JourneyStepCard
              key={step.number}
              number={step.number}
              title={step.title}
              description={step.description}
              delay={reduceMotion ? 0 : 0.25 + index * 0.08}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
