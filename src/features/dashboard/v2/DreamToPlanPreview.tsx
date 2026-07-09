import { ArrowRight, Check, Sparkles, Target } from "lucide-react";
import { useEffect, useState } from "react";
import { useReducedMotion } from "@/app/hooks/useReducedMotion";

export interface GoalPreviewData {
  id: string;
  goalTitle: string;
  visionIcons: { emoji: string; bgClass: string; borderClass: string }[];
  visionLabel: string;
  todayTasks: [string, string, string];
  weekLabel: string;
}

const DEFAULT_PREVIEW: GoalPreviewData = {
  id: "ielts",
  goalTitle: "Đạt IELTS 7.0 trước tháng 9",
  visionIcons: [
    { emoji: "🎧", bgClass: "bg-sky-800/10", borderClass: "border-sky-800/20" },
    { emoji: "📝", bgClass: "bg-rose-800/10", borderClass: "border-rose-800/20" },
    { emoji: "🌍", bgClass: "bg-app-accent-soft/50", borderClass: "border-app-accent/20" },
  ],
  visionLabel: '"Tự tin giao tiếp quốc tế"',
  todayTasks: ["Làm 1 bài Listening Practice", "Viết 1 essay Task 2", "Review 50 từ vựng"],
  weekLabel: "Tuần 3/12",
};

interface DreamToPlanPreviewProps {
  previewData?: GoalPreviewData;
}

export function DreamToPlanPreview({ previewData }: DreamToPlanPreviewProps) {
  const data = previewData ?? DEFAULT_PREVIEW;
  const reduced = useReducedMotion();
  const [activeMobileTab, setActiveMobileTab] = useState<"vision" | "smart" | "action">("vision");
  const [cyclePhase, setCyclePhase] = useState(0);

  // Auto animation cycle similar to HeroMockupAnimated
  useEffect(() => {
    void data.id; // Satisfy linter for dependency usage to reset animation on data change
    if (reduced) {
      setCyclePhase(2);
      return;
    }

    const timers: number[] = [];

    setCyclePhase(0); // Phase 0: Initial state, task 2 unchecked, progress 33%

    // Phase 1: Tick task 2 after 1.8s
    timers.push(
      window.setTimeout(() => {
        setCyclePhase(1);
      }, 1800),
    );

    // Phase 2: Update progress to 67% and show streak pop after 3.2s
    timers.push(
      window.setTimeout(() => {
        setCyclePhase(2);
      }, 3200),
    );

    return () => {
      timers.forEach(window.clearTimeout);
    };
  }, [reduced, data.id]); // Re-run animation when preview data changes

  const isTaskTwoCompleted = cyclePhase >= 1;
  const isProgressAdvanced = cyclePhase >= 2;
  const showStreakPop = cyclePhase === 2;

  // Derive static properties for polaroid layouts based on preview content
  const _polaroids = [
    {
      emoji: data.visionIcons[0]?.emoji ?? "💡",
      label:
        data.visionIcons[0]?.emoji === "🎧"
          ? "Listening 8.0"
          : data.visionIcons[0]?.emoji === "📚"
            ? "12 cuốn sách"
            : data.visionIcons[0]?.emoji === "🏋️"
              ? "Tập Upper body"
              : "Tính năng mới",
      rotation: "-rotate-[6deg]",
      bg: "from-rose-50 to-amber-50",
      top: "top-2",
      left: "left-2",
    },
    {
      emoji: data.visionIcons[1]?.emoji ?? "✨",
      label:
        data.visionIcons[1]?.emoji === "📝"
          ? "Writing Task 2"
          : data.visionIcons[1]?.emoji === "✍️"
            ? "3 Dòng phản tư"
            : data.visionIcons[1]?.emoji === "🥗"
              ? "Ăn lành mạnh"
              : "Khám phá",
      rotation: "rotate-[5deg] z-10",
      bg: "from-sky-50 to-teal-50",
      top: "top-6",
      left: "left-24 sm:left-28",
    },
  ];

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 select-none">
      {/* 📱 Mobile Tabs Switcher */}
      <div className="flex md:hidden items-center justify-center p-1 bg-app-bg-subtle rounded-full border border-app-line/60">
        <button
          type="button"
          onClick={() => setActiveMobileTab("vision")}
          className={`flex-1 text-center py-2 px-3 rounded-full text-[11px] font-bold transition-all duration-200 ${
            activeMobileTab === "vision"
              ? "bg-app-accent text-white shadow-xs"
              : "text-app-ink-muted hover:text-app-ink"
          }`}
        >
          🎨 1. Tầm nhìn
        </button>
        <button
          type="button"
          onClick={() => setActiveMobileTab("smart")}
          className={`flex-1 text-center py-2 px-3 rounded-full text-[11px] font-bold transition-all duration-200 ${
            activeMobileTab === "smart"
              ? "bg-app-accent text-white shadow-xs"
              : "text-app-ink-muted hover:text-app-ink"
          }`}
        >
          🎯 2. Chuẩn SMART
        </button>
        <button
          type="button"
          onClick={() => setActiveMobileTab("action")}
          className={`flex-1 text-center py-2 px-3 rounded-full text-[11px] font-bold transition-all duration-200 ${
            activeMobileTab === "action"
              ? "bg-app-accent text-white shadow-xs"
              : "text-app-ink-muted hover:text-app-ink"
          }`}
        >
          ⚡ 3. Việc Today
        </button>
      </div>

      {/* 🚀 Main Preview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch relative">
        {/* Floating Streak Pop Badge */}
        <div
          className={`absolute top-4 right-4 md:right-8 z-30 inline-flex items-center gap-1.5 rounded-full bg-app-surface px-3.5 py-1 text-[10px] font-extrabold text-app-accent shadow-sm border border-app-accent/30 transition-all duration-300 ${
            showStreakPop
              ? "translate-y-0 scale-100 opacity-100"
              : "-translate-y-2 scale-95 opacity-0 pointer-events-none"
          }`}
        >
          <Sparkles className="size-3 text-app-accent" />
          <span>Streak +1 Ngày! 🔥</span>
        </div>

        {/* 🎨 COLUMN 1: Dreamy Vision Board */}
        <div
          className={`md:flex flex-col justify-between rounded-3xl border border-app-line/80 bg-gradient-to-br from-app-surface to-app-surface/40 p-6 shadow-3xs min-h-[380px] md:min-h-0 relative group hover:shadow-2xs transition-all duration-300 ${
            activeMobileTab === "vision" ? "flex" : "hidden"
          }`}
        >
          {/* Subtle grid background */}
          <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#262626_1px,transparent_1px)] [background-size:14px_14px] opacity-40 pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <span className="hidden sm:inline absolute -top-4 -left-2 text-xl filter drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.06)] z-20">
              📌
            </span>
            <div className="space-y-1 pl-4">
              <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-app-accent">
                Bảng tầm nhìn
              </span>
              <h3 className="font-serif text-sm font-semibold text-app-ink">
                1. Ước mơ mơ hồ
              </h3>
            </div>

            {/* Real Vision Board Detail Image */}
            <div className="relative h-44 mt-4 rounded-2xl overflow-hidden border border-app-line/60 shadow-inner transition-all duration-300 group-hover:scale-[1.01]">
              <img
                src="/vision_board_detail.png"
                alt="Bảng tầm nhìn chi tiết"
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover dark:brightness-[0.85] dark:contrast-[1.05]"
              />
              <div className="absolute inset-0 bg-black/5" />
            </div>
          </div>

          <div className="relative z-10 p-3 bg-app-accent-soft/30 dark:bg-app-accent-soft/5 border border-app-accent/15 rounded-xl mt-4">
            <span className="text-[8px] font-extrabold uppercase text-app-accent tracking-wider block">
              Tiếng gọi tâm hồn
            </span>
            <p className="text-[11px] font-serif italic text-app-ink-soft leading-relaxed mt-0.5">
              {data.visionLabel}
            </p>
          </div>
        </div>

        {/* 🎯 COLUMN 2: SMART Goal Card */}
        <div
          className={`md:flex flex-col justify-between rounded-3xl border border-app-line/80 bg-app-surface p-6 shadow-3xs min-h-[380px] md:min-h-0 relative group hover:shadow-2xs transition-all duration-300 ${
            activeMobileTab === "smart" ? "flex" : "hidden"
          }`}
        >
          {/* Subtle warm background glow */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-app-accent/3 via-transparent to-app-accent/2 opacity-80 rounded-3xl" />

          <div className="relative z-10 space-y-4">
            <span className="hidden sm:inline absolute -top-4 -left-2 text-xl filter drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.06)] z-20">
              📌
            </span>
            <div className="space-y-1 pl-4">
              <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-app-energy">
                Tiêu điểm sắc nét
              </span>
              <h3 className="font-serif text-sm font-semibold text-app-ink">
                2. Mục tiêu SMART
              </h3>
            </div>

            {/* Target Display Area */}
            <div className="p-4 bg-app-bg-subtle/70 border border-app-line/60 rounded-2xl space-y-3.5 mt-3">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-app-accent/10 px-2.5 py-0.5 text-[9px] font-bold text-app-accent border border-app-accent/10">
                  {data.weekLabel}
                </span>
                <span className="text-[8px] font-extrabold text-app-ink-muted uppercase tracking-widest">SMART GOAL</span>
              </div>

              <h4 className="text-xs font-bold text-app-ink leading-relaxed flex items-start gap-2">
                <Target className="h-4.5 w-4.5 text-app-accent shrink-0 mt-0.5" />
                <span>{data.goalTitle}</span>
              </h4>

              {/* Progress Slider */}
              <div className="pt-2.5 border-t border-app-line/50">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-bold text-app-ink-muted">Tiến độ chu kỳ</span>
                  <span className="font-extrabold text-app-accent tabular-nums transition-all duration-300">
                    {isProgressAdvanced ? 67 : 33}%
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full rounded-full bg-app-bg-subtle overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-app-accent to-green-600 transition-all duration-500 ease-out"
                    style={{ width: isProgressAdvanced ? "67%" : "33%" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SMART Breakdown Badges */}
          <div className="relative z-10 grid grid-cols-5 gap-1 text-center mt-4">
            {["S", "M", "A", "R", "T"].map((letter, idx) => (
              <div
                key={letter}
                className={`py-1.5 rounded-lg border text-[10px] font-extrabold transition-all duration-300 ${
                  idx < 3
                    ? "bg-app-accent/10 text-app-accent border-app-accent/20"
                    : "bg-app-bg-subtle/50 text-app-ink-muted border-app-line/50"
                }`}
                title={
                  letter === "S"
                    ? "Specific (Cụ thể)"
                    : letter === "M"
                      ? "Measurable (Đo lường được)"
                      : letter === "A"
                        ? "Achievable (Khả thi)"
                        : letter === "R"
                          ? "Relevant (Liên quan)"
                          : "Time-bound (Thời hạn)"
                }
              >
                {letter}
              </div>
            ))}
          </div>
        </div>

        {/* ⚡ COLUMN 3: First-Week Action Plan */}
        <div
          className={`md:flex flex-col justify-between rounded-3xl border border-app-line/80 bg-app-surface p-6 shadow-3xs min-h-[380px] md:min-h-0 relative group hover:shadow-2xs transition-all duration-300 ${
            activeMobileTab === "action" ? "flex" : "hidden"
          }`}
        >
          {/* Simulated notebook vertical line */}
          <div className="absolute left-7 top-0 bottom-0 w-0.5 bg-red-400/15" />

          <div className="relative z-10 space-y-4 pl-4">
            <span className="hidden sm:inline absolute -top-4 -left-6 text-xl filter drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.06)] z-20">
              📌
            </span>
            <div className="space-y-1">
              <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-app-ink-muted font-sans">
                Kỷ luật tự thân
              </span>
              <h3 className="font-serif text-sm font-semibold text-app-ink">
                3. Kế hoạch hành động
              </h3>
            </div>

            {/* Checklist */}
            <div className="space-y-3 pt-3 font-serif">
              {/* Task 1: Always completed */}
              <div className="flex items-start gap-2.5 p-2 bg-app-bg-subtle/40 border border-app-line/30 rounded-xl">
                <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-app-accent text-white shadow-xs mt-0.5">
                  <Check className="h-3 w-3" strokeWidth={3.5} />
                </span>
                <span className="text-[11px] text-app-ink-muted line-through font-medium italic opacity-75 truncate">
                  {data.todayTasks[0]}
                </span>
              </div>

              {/* Task 2: Animates checking in/out */}
              <div
                className={`flex items-start gap-2.5 p-2 rounded-xl border transition-all duration-500 ${
                  isTaskTwoCompleted
                    ? "bg-app-bg-subtle/40 border border-app-line/30"
                    : "bg-app-surface border-app-line shadow-[0_2px_12px_rgba(0,0,0,0.015)]"
                }`}
              >
                <span
                  className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border transition-all duration-500 mt-0.5 ${
                    isTaskTwoCompleted
                      ? "border-transparent bg-app-accent text-white shadow-xs"
                      : "border-app-line-strong bg-app-surface text-transparent"
                  }`}
                >
                  <Check
                    className={`h-3 w-3 transition-transform duration-500 ${
                      isTaskTwoCompleted ? "scale-100" : "scale-50"
                    }`}
                    strokeWidth={3.5}
                  />
                </span>
                <span
                  className={`text-[11px] italic transition-all duration-500 ${
                    isTaskTwoCompleted
                      ? "text-app-ink-muted line-through opacity-75"
                      : "text-app-ink font-bold"
                  }`}
                >
                  {data.todayTasks[1]}
                </span>
              </div>

              {/* Task 3: Uncompleted */}
              <div className="flex items-start gap-2.5 p-2 bg-app-surface border border-app-line rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.015)]">
                <span className="h-4.5 w-4.5 shrink-0 rounded-full border border-app-line-strong bg-app-surface mt-0.5" />
                <span className="text-[11px] font-bold text-app-ink italic truncate">
                  {data.todayTasks[2]}
                </span>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-3 border-t border-app-line/50 flex items-center justify-between text-[9px] font-sans text-app-ink-muted font-bold mt-4">
            <span>● Today Checklist v2</span>
            <span className="text-app-accent font-extrabold">Dành 2 phút mỗi ngày</span>
          </div>
        </div>
      </div>

      {/* 🔗 Direction Indicator Line */}
      <div className="hidden md:flex items-center justify-between px-16 text-app-ink-muted select-none py-1">
        <div className="flex items-center gap-2">
          <div className="h-px w-24 bg-gradient-to-r from-transparent to-app-line" />
          <span className="text-[10px] font-bold text-app-ink-muted uppercase tracking-widest">Từ bảng ước mơ</span>
          <ArrowRight className="size-3 text-app-ink-muted" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-px w-24 bg-gradient-to-r from-transparent to-app-line" />
          <span className="text-[10px] font-bold text-app-ink-muted uppercase tracking-widest">Chuẩn hóa hành động</span>
          <ArrowRight className="size-3 text-app-ink-muted" />
        </div>
      </div>
    </div>
  );
}
