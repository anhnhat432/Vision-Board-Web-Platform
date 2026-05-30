import { useState } from "react";
import {
  ArrowRight,
  CalendarRange,
  Compass,
  HardDrive,
  Lock,
  LogIn,
  RefreshCw,
  Smartphone,
  Sun,
  Target,
  UserPlus,
  Flame,
  Award,
  Clock,
} from "lucide-react";

import { Link } from "react-router";

import { RevealOnScroll } from "@/app/components/motion";
import { trackAnalyticsEvent } from "@/app/utils/analytics";

import { HeroMockupAnimated, type GoalPreviewData } from "./HeroMockupAnimated";

const GOAL_PREVIEWS: GoalPreviewData[] = [
  {
    id: "reading",
    goalTitle: "Đọc 12 cuốn sách trong năm",
    visionIcons: [
      { emoji: "📚", bgClass: "bg-emerald-800/10", borderClass: "border-emerald-800/20" },
      { emoji: "✍️", bgClass: "bg-amber-800/10", borderClass: "border-amber-800/20" },
      { emoji: "🧠", bgClass: "bg-violet-800/10", borderClass: "border-violet-800/20" },
    ],
    visionLabel: "\"Phát triển tri thức\"",
    todayTasks: ["Đọc 30 trang \"Atomic Habits\"", "Ghi 3 dòng phản tư", "Review tuần lúc 21h"],
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
    visionLabel: "\"Tự tin giao tiếp quốc tế\"",
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
    visionLabel: "\"Sức khoẻ bền vững\"",
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
    visionLabel: "\"Sẵn sàng bước vào sự nghiệp\"",
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

const DREAM_CARDS = [
  { emoji: "✈️", label: "Du học Singapore", rotate: "-rotate-[3deg]", bg: "bg-sky-50 dark:bg-sky-950/20" },
  { emoji: "💻", label: "Học lập trình React", rotate: "rotate-[4deg]", bg: "bg-emerald-50 dark:bg-emerald-950/20" },
  { emoji: "🧘", label: "Thư thái tâm trí", rotate: "-rotate-[2deg]", bg: "bg-purple-50 dark:bg-purple-950/20" },
  { emoji: "🏃‍♂️", label: "Chạy bộ 10km", rotate: "rotate-[3deg]", bg: "bg-amber-50 dark:bg-amber-950/20" },
];

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

export function PublicVisitorView({ isDemo, hasLocalData, onStart, onSignIn, onSignUp }: PublicVisitorViewProps) {
  const primaryLabel = "Tạo kế hoạch 12 tuần đầu tiên";
  const heroStartLabel = "Kiến tạo bảng ước mơ ngay";
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
      {/* 1. Hero Section - Vision Board Studio style */}
      <section className="relative -mx-4 overflow-hidden bg-[#fafaf9] dark:bg-neutral-950 px-4 pb-12 pt-10 sm:-mx-6 sm:px-6 md:pt-16 lg:min-h-[85vh] lg:items-center lg:py-24">
        {/* Layered decorative ambient lights */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-12 -top-12 -z-0 h-96 w-96 rounded-full bg-app-accent/5 blur-[120px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 top-1/4 -z-0 h-[500px] w-[500px] rounded-full bg-amber-500/5 blur-[150px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 -z-0 h-2/3 bg-gradient-to-b from-transparent to-neutral-200/20 dark:to-neutral-900/5"
        />

        <div className="relative z-10 grid gap-12 lg:grid-cols-[55fr_45fr] lg:items-center lg:gap-12 max-w-6xl mx-auto">
          <div className="appear-fade-up space-y-8">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-500/5 dark:border-amber-900/30 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-600 dark:text-amber-400 shadow-sm">
                📌 Không gian ước mơ nghệ thuật
              </span>
              
              <h1 className="max-w-2xl font-serif text-4xl font-normal leading-[1.12] tracking-tight text-app-ink md:text-[3.75rem]">
                Vẽ bức tranh ước mơ, <br className="hidden sm:inline" />
                <span className="underline decoration-amber-400/60 decoration-wavy underline-offset-8">ghim chặt tương lai</span> của bạn
              </h1>
              
              <p className="max-w-[48ch] text-sm font-medium leading-relaxed text-neutral-600 dark:text-neutral-400 font-serif italic">
                Nơi những mong muốn không còn là suy nghĩ mơ hồ. Dựng bảng tầm nhìn sống động, đóng gói kế hoạch và để cuộc sống tự tìm về đúng quỹ đạo tốt đẹp.
              </p>
            </div>

            {/* Grid of Polaroid mini visual boards flying light */}
            <div className="flex flex-wrap gap-3 py-1 select-none">
              {DREAM_CARDS.map((card) => (
                <div
                  key={card.label}
                  className={`inline-flex items-center gap-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3.5 py-2 shadow-sm transition-all duration-300 hover:rotate-0 hover:shadow-md ${card.rotate}`}
                >
                  <span className="text-sm shrink-0">{card.emoji}</span>
                  <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{card.label}</span>
                </div>
              ))}
            </div>

            {/* Interactive Goal Preview Chips */}
            <div className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-app-ink-muted">Hình dung mục tiêu của bạn:</p>
              <div className="flex flex-wrap gap-2">
                {PREVIEW_CHIPS.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    aria-pressed={selectedPreviewId === chip.id}
                    onClick={() => handlePreviewSelect(chip.id)}
                    className={`inline-flex items-center rounded-full px-4 py-2 text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg ${
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

            <div className="flex flex-col gap-3.5 sm:flex-row pt-2">
              <button
                type="button"
                onClick={onStart}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-emerald-700 hover:bg-emerald-800 px-7 py-3.5 text-xs font-bold text-white shadow-md transition-all duration-200 hover:-translate-y-px active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
              >
                {heroStartLabel}
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={scrollToHowItWorks}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-7 py-3.5 text-xs font-bold text-neutral-700 dark:text-neutral-300 transition-all duration-200 hover:bg-neutral-50 hover:-translate-y-px active:translate-y-0 focus-visible:outline-none"
              >
                Xem cách hoạt động
              </button>
            </div>

            <div className="pt-1 flex items-center gap-2">
              <p className="text-[10px] font-medium text-app-ink-muted flex items-center gap-1.5">
                <span>✦</span>
                Hoàn thành thiết lập trong 10 phút để nhận bản kế hoạch hành động đầu tiên.
              </p>
            </div>

            <ul className="flex flex-wrap gap-2.5 pt-2">
              <li className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/40 backdrop-blur-sm px-3.5 py-1 text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                <Lock className="h-3.5 w-3.5 text-app-accent" />
                Sử dụng ngay, không bắt buộc đăng ký
              </li>
              <li className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/40 backdrop-blur-sm px-3.5 py-1 text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                <RefreshCw className="h-3.5 w-3.5 text-app-accent animate-spin-slow" />
                Đồng bộ bảo mật đa thiết bị
              </li>
              <li className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 dark:border-neutral-800 bg-white/60 dark:bg-neutral-900/40 backdrop-blur-sm px-3.5 py-1 text-[11px] font-medium text-neutral-600 dark:text-neutral-400">
                <Smartphone className="h-3.5 w-3.5 text-app-accent" />
                Tối ưu cho cả điện thoại & máy tính
              </li>
            </ul>
          </div>

          {/* SaaS Mockup Centerpiece */}
          <div className="flex items-center justify-center">
            <HeroMockupAnimated previewData={selectedPreview} />
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
        className="rounded-3xl border border-neutral-200/80 dark:border-neutral-800 bg-[#fbfbfa]/40 p-6 md:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.005)] max-w-6xl mx-auto"
        aria-labelledby="dashboard-how-it-works-title"
      >
        <div className="flex flex-col gap-2 max-w-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-700 dark:text-amber-500">Kiến tạo tương lai</p>
          <h2 id="dashboard-how-it-works-title" className="font-serif text-2xl font-normal leading-[1.25] text-app-ink sm:text-[2.25rem]">
            Lộ trình 4 bước chuyển mình rực rỡ
          </h2>
        </div>

        {/* Polaroid/Paper Cards Stepper */}
        <div className="relative mt-12 select-none">
          <ol className="relative grid gap-6 sm:grid-cols-2 lg:grid-cols-4 z-10">
            
            {/* Step 1 */}
            <li className="bg-white dark:bg-neutral-950 p-6 rounded-2xl border border-neutral-200/60 dark:border-neutral-900 shadow-md relative -rotate-[1.5deg] space-y-4 hover:rotate-0 duration-300 transition-transform flex flex-col justify-between">
              <span className="absolute -top-3 left-4 text-xl">📌</span>
              <div className="absolute top-4 right-5 text-2xl font-serif font-semibold text-neutral-200 dark:text-neutral-800 select-none">01</div>
              <div className="space-y-3 pt-2">
                <div className="text-[10px] font-bold text-amber-700 dark:text-amber-500 uppercase tracking-wider">Bước 1 · Nhìn nhận</div>
                <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Cân bằng cuộc sống</h4>
                <p className="text-xs text-neutral-500 leading-relaxed font-medium">
                  Đánh giá 8 khía cạnh cốt lõi để nhận diện phần lệch nhịp cần ưu tiên sửa đổi ngay.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-900 flex items-center justify-between text-[9px] font-bold text-app-accent">
                <span>● Radar Chart cuộc sống</span>
                <span>≈3 phút</span>
              </div>
            </li>

            {/* Step 2 */}
            <li className="bg-[#fffde7] text-neutral-800 p-6 rounded-2xl border border-yellow-200/80 shadow-md relative rotate-[2deg] space-y-4 hover:rotate-0 duration-300 transition-transform flex flex-col justify-between">
              <span className="absolute -top-3 left-4 text-xl">📌</span>
              <div className="absolute top-4 right-5 text-2xl font-serif font-semibold text-yellow-300 select-none">02</div>
              <div className="space-y-3 pt-2">
                <div className="text-[10px] font-bold text-yellow-700 uppercase tracking-wider">Bước 2 · Định vị</div>
                <h4 className="text-xs font-bold text-neutral-800">Ghim tầm nhìn trọng tâm</h4>
                <p className="text-xs text-neutral-600 leading-relaxed font-medium">
                  Chọn một lĩnh vực ưu tiên và đóng gói mong muốn thành mục tiêu SMART rõ nét nhất.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-yellow-200/40 flex items-center justify-between text-[9px] font-bold text-yellow-700">
                <span>● 1 mục tiêu sắc nét</span>
                <span>≈5 phút</span>
              </div>
            </li>

            {/* Step 3 */}
            <li className="bg-white dark:bg-neutral-950 p-6 rounded-2xl border border-neutral-200/60 dark:border-neutral-900 shadow-md relative -rotate-[1deg] space-y-4 hover:rotate-0 duration-300 transition-transform flex flex-col justify-between">
              <span className="absolute -top-3 left-4 text-xl">📌</span>
              <div className="absolute top-4 right-5 text-2xl font-serif font-semibold text-neutral-200 dark:text-neutral-800 select-none">03</div>
              <div className="space-y-3 pt-2">
                <div className="text-[10px] font-bold text-amber-700 dark:text-amber-500 uppercase tracking-wider">Bước 3 · Thiết lập</div>
                <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Chuẩn hóa kế hoạch</h4>
                <p className="text-xs text-neutral-500 leading-relaxed font-medium">
                  Xây dựng thói quen tuần lặp lại, mốc checkpoint tuần và kiểm tra rủi ro AI dễ dàng.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-900 flex items-center justify-between text-[9px] font-bold text-app-accent">
                <span>● Bản vẽ 12 tuần chi tiết</span>
                <span>≈5 phút</span>
              </div>
            </li>

            {/* Step 4 */}
            <li className="bg-white dark:bg-neutral-950 p-6 rounded-2xl border border-neutral-200/60 dark:border-neutral-900 shadow-md relative rotate-[1.5deg] space-y-4 hover:rotate-0 duration-300 transition-transform flex flex-col justify-between">
              <span className="absolute -top-3 left-4 text-xl">📌</span>
              <div className="absolute top-4 right-5 text-2xl font-serif font-semibold text-neutral-200 dark:text-neutral-800 select-none">04</div>
              <div className="space-y-3 pt-2">
                <div className="text-[10px] font-bold text-amber-700 dark:text-amber-500 uppercase tracking-wider">Bước 4 · Thực thi</div>
                <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">Hành động mỗi ngày</h4>
                <p className="text-xs text-neutral-500 leading-relaxed font-medium">
                  Mở việc Today làm mỗi sáng, check-in ngày đầy đủ và đánh giá phản tư mỗi cuối tuần.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-900 flex items-center justify-between text-[9px] font-bold text-app-accent">
                <span>● Bảng Today & Kỷ luật</span>
                <span>Hàng ngày 2 phút</span>
              </div>
            </li>

          </ol>
        </div>
      </RevealOnScroll>

      {/* Feature cards Grid */}
      <RevealOnScroll as="section" className="grid gap-6 lg:grid-cols-3 max-w-6xl mx-auto px-4" aria-label="Vì sao chọn Dear Our Future">
        {FEATURE_ROWS.map((feature) => {
          const Icon = feature.icon;

          return (
            <Link
              key={feature.title}
              to={feature.href}
              className="group relative rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/40 dark:bg-neutral-900/20 backdrop-blur-sm p-6 shadow-sm hover:-translate-y-px hover:border-app-accent/35 hover:shadow-md transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
            >
              <div className="flex flex-col gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-app-accent-soft text-app-accent transition-all duration-300 group-hover:bg-app-accent group-hover:text-white">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="space-y-2">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-app-accent/80">{feature.tag}</p>
                  <h2 className="text-sm font-bold text-neutral-800 dark:text-neutral-200 transition-colors duration-200 group-hover:text-app-accent">{feature.title}</h2>
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
        className="max-w-6xl mx-auto px-4"
        aria-labelledby="dashboard-public-cta-title"
      >
        <div className="relative overflow-hidden rounded-3xl border border-neutral-800 bg-emerald-950 text-white p-8 md:p-14 shadow-2xl text-center sm:text-left">
          <div className="pointer-events-none absolute -top-24 -left-24 h-64 w-64 rounded-full bg-emerald-800/10 blur-[80px]" />
          <div className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-amber-500/5 blur-[80px]" />
          
          <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4 max-w-2xl">
              <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-emerald-400 block">Gửi lời chào tới tương lai</span>
              <h2
                id="dashboard-public-cta-title"
                className="font-serif text-3xl font-normal leading-[1.25] text-white sm:text-5xl"
              >
                Kiến tạo phiên bản <br className="hidden sm:inline" /> rực rỡ nhất của bạn
              </h2>
              <p className="text-xs font-normal leading-relaxed text-slate-300">
                Đừng trì hoãn thêm một ngày nào nữa. Dành 10 phút tĩnh lặng thiết lập chu kỳ hành động 12 tuần của bạn ngay hôm nay để thắp sáng bản đồ mục tiêu.
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
