import { ArrowRight, Compass, HardDrive, Lock, LogIn, Smartphone, UserPlus } from "lucide-react";
import { useState } from "react";

import { Link } from "react-router";

import { RevealOnScroll } from "@/app/components/motion";
import { trackAnalyticsEvent } from "@/app/utils/analytics";

import { DreamToPlanPreview, type GoalPreviewData } from "./DreamToPlanPreview";

const GOAL_PREVIEWS: GoalPreviewData[] = [
  {
    id: "reading",
    goalTitle: "Đọc 12 cuốn sách trong năm",
    visionIcons: [
      { emoji: "📚", bgClass: "bg-emerald-800/10", borderClass: "border-emerald-800/20" },
      { emoji: "✍️", bgClass: "bg-amber-800/10", borderClass: "border-amber-800/20" },
      { emoji: "🧠", bgClass: "bg-violet-800/10", borderClass: "border-violet-800/20" },
    ],
    visionLabel: '"Phát triển tri thức"',
    todayTasks: ['Đọc 30 trang "Atomic Habits"', "Ghi 3 dòng phản tư", "Review tuần lúc 21h"],
    weekLabel: "Tuần 4/12",
  },
  {
    id: "ielts",
    goalTitle: "Đạt IELTS 7.0 trước tháng 9",
    visionIcons: [
      { emoji: "🎧", bgClass: "bg-sky-800/10", borderClass: "border-sky-800/20" },
      { emoji: "📝", bgClass: "bg-rose-800/10", borderClass: "border-rose-800/20" },
      { emoji: "🌍", bgClass: "bg-emerald-800/10", borderClass: "border-emerald-800/20" },
    ],
    visionLabel: '"Tự tin giao tiếp quốc tế"',
    todayTasks: ["Làm 1 bài Listening Practice", "Viết 1 essay Task 2", "Review 50 từ vựng"],
    weekLabel: "Tuần 3/12",
  },
  {
    id: "gym",
    goalTitle: "Tập gym đều 3 buổi/tuần",
    visionIcons: [
      { emoji: "🏋️", bgClass: "bg-orange-800/10", borderClass: "border-orange-800/20" },
      { emoji: "🥗", bgClass: "bg-green-800/10", borderClass: "border-green-800/20" },
      { emoji: "😴", bgClass: "bg-indigo-800/10", borderClass: "border-indigo-800/20" },
    ],
    visionLabel: '"Sức khoẻ bền vững"',
    todayTasks: ["Tập Upper Body 45 phút", "Uống 2L nước", "Ngủ trước 23h"],
    weekLabel: "Tuần 6/12",
  },
  {
    id: "portfolio",
    goalTitle: "Hoàn thành Portfolio xin việc",
    visionIcons: [
      { emoji: "💻", bgClass: "bg-blue-800/10", borderClass: "border-blue-800/20" },
      { emoji: "📄", bgClass: "bg-amber-800/10", borderClass: "border-amber-800/20" },
      { emoji: "🤝", bgClass: "bg-teal-800/10", borderClass: "border-teal-800/20" },
    ],
    visionLabel: '"Sẵn sàng bước vào sự nghiệp"',
    todayTasks: ["Code 1 feature project", "Viết 1 case study", "Update LinkedIn"],
    weekLabel: "Tuần 2/12",
  },
];

const PREVIEW_CHIPS = [
  { id: "reading", label: "📚 Đọc sách" },
  { id: "ielts", label: "🎧 IELTS 7.0" },
  { id: "gym", label: "🏋️ Gym" },
  { id: "portfolio", label: "💻 Portfolio" },
] as const;

interface PublicVisitorViewProps {
  isDemo: boolean;
  hasLocalData: boolean;
  onStart: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
}

const FEATURE_ROWS = [
  {
    tag: "Miễn phí",
    title: "Bắt đầu không tốn xu nào",
    description: "Dữ liệu lưu trên thiết bị, đồng bộ giữa điện thoại và máy tính khi bạn đăng nhập.",
    href: "/life-balance",
    icon: Lock,
  },
  {
    tag: "Đúng thứ tự",
    title: "Không phải trang trắng như Notion",
    description: "Dear Our Future dẫn bạn qua đúng các bước có nghiên cứu sau lưng, không bị rối khi mới bắt đầu.",
    href: "/12-week-setup",
    icon: Compass,
  },
  {
    tag: "Mobile-ready",
    title: "Đủ nhẹ cho buổi sáng vội",
    description: "Mở Today, tick xong việc, đóng lại. Không cần học UI phức tạp hay setup dài dòng.",
    href: "/today-v2",
    icon: Smartphone,
  },
] as const;

export function PublicVisitorView({
  isDemo: _isDemo,
  hasLocalData,
  onStart,
  onSignIn,
  onSignUp,
}: PublicVisitorViewProps) {
  const primaryLabel = "Thiết lập chu kỳ 12 tuần ngay";
  const heroStartLabel = "Thiết lập chu kỳ 12 tuần ngay";
  const [selectedPreviewId, setSelectedPreviewId] = useState(GOAL_PREVIEWS[0].id);
  const selectedPreview = GOAL_PREVIEWS.find((p) => p.id === selectedPreviewId) ?? GOAL_PREVIEWS[0];

  const handlePreviewSelect = (id: string) => {
    setSelectedPreviewId(id);
    trackAnalyticsEvent("landing_goal_preview_selected", { preview_id: id, source: "dashboard" });
  };

  const scrollToHowItWorks = () => {
    document.getElementById("dashboard-how-it-works-title")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-16 md:space-y-24">
      {/* 1. Hero Section - Light-first Editorial style */}
      <section className="relative -mx-4 overflow-hidden bg-gradient-to-b from-[#fafaf9] to-white dark:from-neutral-950 dark:to-neutral-900 px-4 pb-16 pt-8 sm:-mx-6 sm:px-6 md:pt-14 lg:min-h-[80vh] lg:flex lg:items-center lg:py-20">
        {/* Layered decorative ambient lights */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-12 -top-12 -z-0 h-96 w-96 rounded-full bg-app-accent/5 blur-[120px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 top-1/4 -z-0 h-[500px] w-[500px] rounded-full bg-amber-500/5 blur-[150px]"
        />

        <div className="relative z-10 flex flex-col gap-12 lg:gap-16 max-w-6xl mx-auto w-full">
          <div className="grid gap-8 lg:grid-cols-[1fr_400px] lg:items-center">
            <div className="appear-fade-up space-y-6">
              <div className="space-y-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-500/5 dark:border-emerald-900/30 px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400 shadow-3xs">
                  ✨ DEAR OUR FUTURE
                </span>

                <h1 className="max-w-2xl font-serif text-3xl font-semibold leading-[1.15] tracking-tight text-app-ink sm:text-4xl md:text-[3.5rem]">
                  Thiết lập cuộc sống mơ ước qua <br className="hidden sm:inline" />
                  <span className="underline decoration-app-accent/55 decoration-wavy underline-offset-8">
                    kế hoạch 12 tuần
                  </span>{" "}
                  bền bỉ
                </h1>

                {/* Shortened and high impact caption (under 3 lines on mobile) */}
                <p className="max-w-[48ch] text-xs sm:text-sm font-medium leading-relaxed text-neutral-600 dark:text-neutral-400 font-serif italic">
                  Nơi mục tiêu lớn được chia nhỏ thành thói quen kỷ luật mỗi ngày. Đánh giá bánh xe cuộc sống, xây dựng
                  mục tiêu SMART và thực thi dứt khoát.
                </p>
              </div>

              {/* Visual preview journey diagram: Vision -> Goal -> 12-week -> Action */}
              <div className="bg-white/80 dark:bg-neutral-900/80 rounded-2xl border border-neutral-200/60 dark:border-neutral-800 p-4 shadow-3xs backdrop-blur-md max-w-xl">
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-app-ink-muted mb-2.5">
                  Hành trình 5 giây gặt hái kết quả:
                </p>
                <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
                  <div className="p-2 rounded-xl bg-[#fafaf9] dark:bg-neutral-950 border border-neutral-200/50">
                    <div className="text-base mb-1">🎨</div>
                    <div className="font-bold text-neutral-800 dark:text-neutral-200">1. Tầm nhìn</div>
                    <div className="text-[9px] text-neutral-400 font-medium">Bảng ước mơ</div>
                  </div>
                  <div className="p-2 rounded-xl bg-[#fafaf9] dark:bg-neutral-950 border border-neutral-200/50">
                    <div className="text-base mb-1">🎯</div>
                    <div className="font-bold text-neutral-800 dark:text-neutral-200">2. Mục tiêu</div>
                    <div className="text-[9px] text-neutral-400 font-medium">Chuẩn SMART</div>
                  </div>
                  <div className="p-2 rounded-xl bg-[#fafaf9] dark:bg-neutral-950 border border-neutral-200/50">
                    <div className="text-base mb-1">🗓️</div>
                    <div className="font-bold text-neutral-800 dark:text-neutral-200">3. Kế hoạch</div>
                    <div className="text-[9px] text-neutral-400 font-medium">Lộ trình 12 tuần</div>
                  </div>
                  <div className="p-2 rounded-xl bg-app-accent-soft text-app-accent border border-app-accent/15">
                    <div className="text-base mb-1">⚡</div>
                    <div className="font-bold">4. Hành động</div>
                    <div className="text-[9px] text-app-accent/80 font-medium">Việc Today</div>
                  </div>
                </div>
              </div>

              {/* Interactive Goal Preview Chips */}
              <div className="space-y-2.5">
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-app-ink-muted">
                  Chọn xem ví dụ thực tế:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {PREVIEW_CHIPS.map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      aria-pressed={selectedPreviewId === chip.id}
                      onClick={() => handlePreviewSelect(chip.id)}
                      className={`inline-flex items-center rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg cursor-pointer ${
                        selectedPreviewId === chip.id
                          ? "bg-app-accent text-white shadow-sm hover:bg-app-accent-hover"
                          : "border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 hover:border-app-accent/40 hover:text-app-accent hover:-translate-y-px"
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons - Highly visible, min 44px on mobile */}
              <div className="flex flex-col gap-3 sm:flex-row pt-2 max-w-xl">
                <button
                  type="button"
                  onClick={onStart}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-emerald-700 hover:bg-emerald-800 px-8 py-3.5 text-xs font-bold text-white shadow-md transition-all duration-200 hover:-translate-y-px active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/40 cursor-pointer w-full sm:w-auto"
                >
                  {heroStartLabel}
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={scrollToHowItWorks}
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-neutral-200/80 dark:border-neutral-800/80 bg-transparent px-8 py-3.5 text-xs font-bold text-neutral-700 dark:text-neutral-300 transition-all duration-200 hover:bg-neutral-50/50 hover:-translate-y-px active:translate-y-0 active:scale-[0.99] focus-visible:outline-none cursor-pointer w-full sm:w-auto"
                >
                  Xem lộ trình ghim chu kỳ
                </button>
              </div>

              <div className="pt-0.5 flex items-center gap-2">
                <p className="text-[10px] font-medium text-app-ink-muted flex items-center gap-1.5">
                  <span>✦</span>
                  Thiết lập nhanh trong 3 phút để nhận Bánh xe cuộc sống và gợi ý mục tiêu đầu tiên.
                </p>
              </div>
            </div>

            {/* Cozy planning corner generated image asset for public landing */}
            <div className="hidden lg:block relative rounded-3xl border border-neutral-200/80 dark:border-neutral-800/80 overflow-hidden shadow-sm aspect-[4/3] w-full group select-none transition-all duration-300 hover:shadow-md hover:-rotate-[0.5deg]">
              <span className="hidden sm:inline absolute -top-3.5 left-6 text-xl z-20 select-none filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.06)]">
                📌
              </span>
              <img
                src="/study_desk_hero.png"
                alt="Góc học tập & lập kế hoạch ấm áp"
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 dark:brightness-[0.85] dark:contrast-[1.05]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-5">
                <p className="text-xs font-medium text-white/90 italic font-serif leading-relaxed">
                  "Không gian tĩnh tại ghim ước mơ và kiến tạo chu kỳ mới."
                </p>
              </div>
            </div>
          </div>

          {/* SaaS Mockup Centerpiece - Dream-to-Plan Preview */}
          <div className="w-full">
            <DreamToPlanPreview previewData={selectedPreview} />
          </div>
        </div>
      </section>

      {/* Local data restore banner if present */}
      {hasLocalData ? (
        <section
          className="rounded-2xl border border-app-warm-border bg-app-warm-soft/40 p-5 md:p-6 max-w-6xl mx-auto"
          aria-labelledby="dashboard-local-data-title"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-app-warm shadow-sm">
                <HardDrive className="h-4 w-4" />
              </div>
              <div>
                <h2 id="dashboard-local-data-title" className="text-base font-semibold text-app-warm-strong">
                  Có dữ liệu đã lưu trên thiết bị này
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-app-warm-strong/90">
                  Đăng nhập để kiểm tra, sao lưu và nhập dữ liệu này vào tài khoản. Chúng tôi không ghi đè dữ liệu tài
                  khoản nếu chưa có xác nhận của bạn.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={onSignIn}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-app-warm px-4 py-2.5 text-xs font-semibold text-white transition-colors duration-150 hover:bg-app-warm-hover focus-visible:outline-none"
              >
                <LogIn className="h-4 w-4" />
                Đăng nhập để khôi phục
              </button>
              <button
                type="button"
                onClick={onSignUp}
                className="inline-flex items-center justify-center rounded-lg border border-app-warm-border bg-white px-4 py-2.5 text-xs font-semibold text-app-warm-strong transition-colors duration-150 hover:bg-app-warm-soft focus-visible:outline-none"
              >
                Tạo tài khoản mới
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {/* Before → After Clarity Section */}
      <RevealOnScroll
        as="section"
        className="grid gap-6 sm:grid-cols-2 max-w-6xl mx-auto px-4"
        aria-label="So sánh trước và sau"
      >
        <div className="rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 bg-[#fbfbfa]/60 p-6 transition-all duration-300 hover:border-neutral-300">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">
            <span>✕</span> Trước khi sử dụng
          </p>
          <h3 className="mt-3 text-sm font-bold text-neutral-800 dark:text-neutral-200">Mục tiêu mơ hồ</h3>
          <ul className="mt-4 space-y-2.5 text-xs font-medium leading-relaxed text-neutral-500">
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0 text-neutral-400 font-bold">✕</span>
              <span>"Muốn sống khỏe hơn" — ý muốn mơ hồ không biết bắt đầu từ đâu.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0 text-neutral-400 font-bold">✕</span>
              <span>Viết To-do list rồi nhanh chóng quên sạch sau 2 tuần.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0 text-neutral-400 font-bold">✕</span>
              <span>Thiếu nhịp điệu cam kết hàng ngày và ngày khóa review tuần.</span>
            </li>
          </ul>
        </div>

        <div className="relative rounded-2xl border border-emerald-500/15 border-t-2 border-t-emerald-600 bg-emerald-500/5 p-6 shadow-sm transition-all duration-300 hover:shadow-md">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700 border border-emerald-500/10">
            <span>✓</span> Kế hoạch 12 tuần rõ nét
          </p>
          <h3 className="mt-3 text-sm font-bold text-neutral-800 dark:text-neutral-200">Kỷ luật & Trọng tâm</h3>
          <ul className="mt-4 space-y-2.5 text-xs font-medium leading-relaxed text-emerald-800 dark:text-emerald-400">
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0 text-emerald-600 font-bold">✓</span>
              <span>Có 1 mục tiêu SMART xuất phát từ bảng tầm nhìn rực rỡ.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0 text-emerald-600 font-bold">✓</span>
              <span>Chiến thuật 12 tuần chặt chẽ và chỉ số lead hoàn thành.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0 text-emerald-600 font-bold">✓</span>
              <span>Mở danh sách việc Today tinh gọn mỗi sáng và hành động dứt khoát.</span>
            </li>
          </ul>
        </div>
      </RevealOnScroll>

      {/* 4-step Roadmap Section - Vision Board Studio paper cards styled */}
      <RevealOnScroll
        as="section"
        className="rounded-3xl border border-neutral-200/80 dark:border-neutral-800 bg-[#fbfbfa]/40 p-6 md:p-10 shadow-3xs max-w-6xl mx-auto w-full"
        aria-labelledby="dashboard-how-it-works-title"
      >
        <div className="flex flex-col gap-1.5 max-w-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-700 dark:text-emerald-500">
            Kiến tạo tương lai
          </p>
          <h2
            id="dashboard-how-it-works-title"
            className="font-serif text-2xl font-normal leading-[1.25] text-app-ink sm:text-[2.25rem]"
          >
            Lộ trình 4 bước chuyển mình rõ nét
          </h2>
        </div>

        {/* Polaroid/Paper Cards Stepper */}
        <div className="relative mt-10 select-none">
          <ol className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-4 z-10">
            {/* Step 1 */}
            <li className="bg-white dark:bg-neutral-950 p-6 rounded-2xl border border-neutral-200/60 dark:border-neutral-900 shadow-3xs relative -rotate-[1deg] space-y-4 hover:rotate-0 duration-300 transition-transform flex flex-col justify-between">
              <span className="hidden sm:inline absolute -top-3 left-4 text-xl">📌</span>
              <div className="absolute top-4 right-5 text-2xl font-serif font-semibold text-neutral-200 dark:text-neutral-800 select-none">
                01
              </div>
              <div className="space-y-3 pt-2">
                <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-500 uppercase tracking-wider">
                  Bước 1 · Nhìn nhận
                </div>
                <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Cân bằng cuộc sống</h4>
                <p className="text-xs text-neutral-500 leading-relaxed font-medium">
                  Đánh giá 8 khía cạnh cuộc sống để phát hiện điểm lệch nhịp cần cải thiện đầu tiên.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-900 flex items-center justify-between text-[9px] font-bold text-emerald-700">
                <span>● Radar cuộc sống</span>
                <span>≈3 phút</span>
              </div>
            </li>

            {/* Step 2 */}
            <li className="bg-[#fffde7] text-neutral-800 p-6 rounded-2xl border border-yellow-200/80 shadow-3xs relative rotate-[1.5deg] space-y-4 hover:rotate-0 duration-300 transition-transform flex flex-col justify-between">
              <span className="hidden sm:inline absolute -top-3 left-4 text-xl">📌</span>
              <div className="absolute top-4 right-5 text-2xl font-serif font-semibold text-yellow-300 select-none">
                02
              </div>
              <div className="space-y-3 pt-2">
                <div className="text-[10px] font-bold text-yellow-700 uppercase tracking-wider">Bước 2 · Định vị</div>
                <h4 className="text-xs font-bold text-neutral-800">Đặt mục tiêu SMART</h4>
                <p className="text-xs text-neutral-600 leading-relaxed font-medium">
                  Chọn lĩnh vực ưu tiên và đóng gói mong muốn thành mục tiêu SMART đo lường được.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-yellow-200/40 flex items-center justify-between text-[9px] font-bold text-yellow-700">
                <span>● 1 tiêu điểm sắc nét</span>
                <span>≈5 phút</span>
              </div>
            </li>

            {/* Step 3 */}
            <li className="bg-white dark:bg-neutral-950 p-6 rounded-2xl border border-neutral-200/60 dark:border-neutral-900 shadow-3xs relative -rotate-[0.5deg] space-y-4 hover:rotate-0 duration-300 transition-transform flex flex-col justify-between">
              <span className="hidden sm:inline absolute -top-3 left-4 text-xl">📌</span>
              <div className="absolute top-4 right-5 text-2xl font-serif font-semibold text-neutral-200 dark:text-neutral-800 select-none">
                03
              </div>
              <div className="space-y-3 pt-2">
                <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-500 uppercase tracking-wider">
                  Bước 3 · Thiết lập
                </div>
                <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Kế hoạch 12 tuần</h4>
                <p className="text-xs text-neutral-500 leading-relaxed font-medium">
                  Xây dựng thói quen lặp lại (tactics) và checkpoint đo lường tiến độ tự động.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-900 flex items-center justify-between text-[9px] font-bold text-app-accent">
                <span>● Lộ trình 12 tuần</span>
                <span>≈5 phút</span>
              </div>
            </li>

            {/* Step 4 */}
            <li className="bg-white dark:bg-neutral-950 p-6 rounded-2xl border border-neutral-200/60 dark:border-neutral-900 shadow-3xs relative rotate-[1deg] space-y-4 hover:rotate-0 duration-300 transition-transform flex flex-col justify-between">
              <span className="hidden sm:inline absolute -top-3 left-4 text-xl">📌</span>
              <div className="absolute top-4 right-5 text-2xl font-serif font-semibold text-neutral-200 dark:text-neutral-800 select-none">
                04
              </div>
              <div className="space-y-3 pt-2">
                <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-500 uppercase tracking-wider">
                  Bước 4 · Thực thi
                </div>
                <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Hành động mỗi ngày</h4>
                <p className="text-xs text-neutral-500 leading-relaxed font-medium">
                  Mở việc Today mỗi sáng, tick hoàn thành và phản tư ngắn vào cuối tuần.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-900 flex items-center justify-between text-[9px] font-bold text-app-accent">
                <span>● Today & Kỷ luật</span>
                <span>2 phút mỗi ngày</span>
              </div>
            </li>
          </ol>
        </div>
      </RevealOnScroll>

      {/* Feature cards Grid */}
      <RevealOnScroll
        as="section"
        className="grid gap-6 lg:grid-cols-3 max-w-6xl mx-auto px-4 w-full"
        aria-label="Vì sao chọn Dear Our Future"
      >
        {FEATURE_ROWS.map((feature) => {
          const Icon = feature.icon;

          return (
            <Link
              key={feature.title}
              to={feature.href}
              className="group relative rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/40 dark:bg-neutral-900/20 backdrop-blur-sm p-6 shadow-3xs hover:-translate-y-px hover:border-app-accent/35 hover:shadow-2xs transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 cursor-pointer"
            >
              <div className="flex flex-col gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-app-accent-soft text-app-accent transition-all duration-300 group-hover:bg-app-accent group-hover:text-white">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="space-y-2">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-app-accent/80">
                    {feature.tag}
                  </p>
                  <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 transition-colors duration-200 group-hover:text-app-accent">
                    {feature.title}
                  </h2>
                  <p className="text-xs font-semibold leading-relaxed text-neutral-500">{feature.description}</p>
                  <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-app-accent transition-transform duration-200 group-hover:translate-x-0.5 mt-2">
                    Tìm hiểu thêm
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </RevealOnScroll>

      {/* 5. Bottom CTA Section - Vision Board dark studio themed */}
      <RevealOnScroll
        as="section"
        className="max-w-6xl mx-auto px-4 w-full"
        aria-labelledby="dashboard-public-cta-title"
      >
        <div className="relative overflow-hidden rounded-3xl border border-neutral-800 bg-emerald-950 text-white p-8 md:p-14 shadow-2xl text-center sm:text-left">
          <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-emerald-800/10 blur-[80px]" />
          <div className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-amber-500/5 blur-[80px]" />

          <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4 max-w-2xl">
              <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-emerald-400 block">
                Gửi lời chào tới tương lai
              </span>
              <h2
                id="dashboard-public-cta-title"
                className="font-serif text-3xl font-normal leading-[1.25] text-white sm:text-5xl"
              >
                Kiến tạo phiên bản <br className="hidden sm:inline" /> rực rỡ nhất của bạn
              </h2>
              <p className="text-xs font-normal leading-relaxed text-slate-300">
                Dành 10 phút tĩnh lặng thiết lập chu kỳ hành động 12 tuần của bạn ngay hôm nay để thắp sáng bản đồ mục
                tiêu.
              </p>
            </div>

            <div className="shrink-0 flex flex-col items-center lg:items-end gap-3.5">
              <button
                type="button"
                onClick={onStart}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-400 hover:bg-amber-500 px-8 py-4 text-xs font-bold text-neutral-950 shadow-md transition-all duration-200 hover:-translate-y-px active:translate-y-0 focus-visible:outline-none"
              >
                <UserPlus className="h-4 w-4 text-neutral-950" />
                {primaryLabel}
              </button>
              <p className="text-[10px] font-normal text-slate-400 flex items-center gap-1.5">
                <span>✦</span>
                Nhận ngay việc làm hôm nay để khởi động
              </p>
            </div>
          </div>
        </div>
      </RevealOnScroll>
    </div>
  );
}
