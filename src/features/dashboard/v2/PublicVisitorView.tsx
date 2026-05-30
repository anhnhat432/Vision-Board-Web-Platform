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
  { emoji: "✈️", label: "Du học Singapore", rotate: "-rotate-2", bg: "bg-sky-50 dark:bg-sky-950/20" },
  { emoji: "💻", label: "Học lập trình React", rotate: "rotate-3", bg: "bg-emerald-50 dark:bg-emerald-950/20" },
  { emoji: "🧘", label: "Thư thái tâm trí", rotate: "-rotate-3", bg: "bg-purple-50 dark:bg-purple-950/20" },
  { emoji: "🏃‍♂️", label: "Chạy bộ 10km", rotate: "rotate-2", bg: "bg-amber-50 dark:bg-amber-950/20" },
];

interface PublicVisitorViewProps {
  isDemo: boolean;
  hasLocalData: boolean;
  onStart: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
}

const HOW_IT_WORKS_STEPS = [
  {
    step: "01",
    icon: Compass,
    title: "Chấm điểm cuộc sống",
    description: "Tự đánh giá 8 khía cạnh cốt lõi để nhận diện phần lệch nhịp cần ưu tiên sửa đổi.",
    result: "Bản đồ cân bằng cuộc sống",
    duration: "≈3 phút",
  },
  {
    step: "02",
    icon: Target,
    title: "Chọn một mục tiêu SMART",
    description: "Biến mong muốn mơ hồ thành 1 mục tiêu SMART rõ nét và thực sự khả thi.",
    result: "1 mục tiêu lớn sắc nét",
    duration: "≈5 phút",
  },
  {
    step: "03",
    icon: CalendarRange,
    title: "Dựng kế hoạch 12 tuần",
    description: "Chia nhỏ mục tiêu thành các tactics thói quen tuần, mốc checkpoint và ngày khóa review.",
    result: "Kế hoạch hành động chi tiết",
    duration: "≈5 phút",
  },
  {
    step: "04",
    icon: Sun,
    title: "Hành động & Đánh giá",
    description: "Mở danh sách Today để làm việc mỗi ngày, cuối tuần review để giữ kỷ luật và chỉnh tải.",
    result: "Việc hôm nay & Kỷ luật",
    duration: "Mỗi ngày 1-2 phút",
  },
] as const;

const FIRST_RUN_FLOW = [
  "Chấm điểm cuộc sống",
  "Chọn mục tiêu chính",
  "Chia kế hoạch 12 tuần",
  "Mở Today để làm việc hôm nay",
] as const;

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
  const heroStartLabel = "Tạo kế hoạch 12 tuần đầu tiên";
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
    <div className="space-y-12 md:space-y-20">
      <section className="relative -mx-4 overflow-hidden bg-app-bg px-4 pb-12 pt-10 sm:-mx-6 sm:px-6 md:pt-16 lg:min-h-[85vh] lg:items-center lg:py-24">
        {/* Layered decorative gradient blobs for premium visual depth */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-12 -top-12 -z-0 h-96 w-96 rounded-full bg-app-accent/10 blur-[120px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 top-1/4 -z-0 h-[500px] w-[500px] rounded-full bg-app-warm/5 blur-[150px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 -z-0 h-2/3 bg-gradient-to-b from-transparent to-app-warm-soft/15"
        />
        <div className="relative z-10 grid gap-12 lg:grid-cols-[55fr_45fr] lg:items-center lg:gap-12">
        <div className="appear-fade-up">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-app-accent/80">
              Dear Our Future · Lập kế hoạch cá nhân 12 tuần
            </p>
            <h1 className="mt-4 max-w-[18ch] font-serif text-4xl font-medium leading-[1.18] tracking-tight text-app-ink md:text-[3.25rem]">
              Đạt mục tiêu lớn sau{" "}
              <span className="relative inline-block text-app-accent font-bold">
                <span className="relative z-10">12 tuần</span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 200 12"
                  preserveAspectRatio="none"
                  className="absolute inset-x-0 -bottom-2 h-2.5 w-full text-app-accent/20"
                >
                  <path
                    d="M2 8 C 40 2, 80 10, 120 4 S 180 8, 198 5"
                    stroke="currentColor"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              </span>{" "}
              nhờ kế hoạch rõ ràng mỗi ngày.
            </h1>
            <p className="mt-4 max-w-[50ch] text-sm font-normal leading-relaxed text-app-ink-soft/90">
              Đừng để mục tiêu chỉ là mong muốn mơ hồ. Chúng tôi dẫn dắt bạn qua lộ trình bài bản khoa học: Tự chấm điểm bánh xe cuộc sống, lập mục tiêu SMART thực tế và chia nhỏ thành hành động cụ thể cho từng ngày.
            </p>
            <p className="mt-2.5 max-w-[50ch] text-xs font-normal leading-relaxed text-app-ink-muted/70">
              Bắt đầu thiết kế tương lai của bạn một cách rõ nét và có nhịp điệu.
            </p>

            {/* Visual Polaroid Goal Cards (Vision Board atmosphere) */}
            <div className="mt-8 flex flex-wrap gap-3 py-1">
              {DREAM_CARDS.map((card) => (
                <div
                  key={card.label}
                  className={`inline-flex items-center gap-2 rounded-xl border border-app-line/50 bg-app-surface px-3.5 py-2 shadow-[0_4px_12px_rgba(0,0,0,0.015)] transition-all duration-300 hover:border-app-accent/30 hover:shadow-app-xs ${card.rotate} hover:rotate-0`}
                >
                  <span className="text-sm shrink-0">{card.emoji}</span>
                  <span className="text-xs font-medium text-app-ink-soft">{card.label}</span>
                </div>
              ))}
            </div>

            {/* Interactive Goal Preview Chips */}
            <div className="mt-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-app-ink-muted/80 mb-2">Hình dung mục tiêu của bạn:</p>
              <div className="flex flex-wrap gap-2">
                {PREVIEW_CHIPS.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    aria-pressed={selectedPreviewId === chip.id}
                    onClick={() => handlePreviewSelect(chip.id)}
                    className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg ${
                      selectedPreviewId === chip.id
                        ? "bg-app-accent text-white shadow-sm hover:bg-app-accent-hover"
                        : "border border-app-line/60 bg-app-surface text-app-ink-soft hover:border-app-accent/40 hover:text-app-accent hover:-translate-y-px"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={onStart}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-app-accent px-5 py-3 text-sm font-medium text-white shadow-[0_4px_14px_rgba(47,93,80,0.15)] transition-all duration-200 hover:bg-app-accent-hover hover:shadow-[0_6px_20px_rgba(47,93,80,0.22)] hover:-translate-y-px active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg"
              >
                {heroStartLabel}
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={scrollToHowItWorks}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-app-line/65 bg-app-surface px-5 py-3 text-sm font-medium text-app-ink transition-all duration-200 hover:border-app-accent/35 hover:-translate-y-px active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg"
              >
                Xem cách hoạt động
              </button>
            </div>

            <div className="mt-4">
              <p className="text-[10px] font-medium text-app-ink-muted/80 flex items-center gap-1.5">
                <span>✦</span>
                Hoàn thành thiết lập trong 10 phút để nhận bản kế hoạch hành động đầu tiên.
              </p>
            </div>

            <ul className="mt-8 flex flex-wrap gap-2">
              <li className="inline-flex items-center gap-1.5 rounded-full border border-app-line/50 bg-app-surface/40 backdrop-blur-sm px-3 py-1 text-[11px] font-medium text-app-ink-soft">
                <Lock className="h-3 w-3 text-app-accent/80" />
                Sử dụng ngay, không bắt buộc đăng ký
              </li>
              <li className="inline-flex items-center gap-1.5 rounded-full border border-app-line/50 bg-app-surface/40 backdrop-blur-sm px-3 py-1 text-[11px] font-medium text-app-ink-soft">
                <RefreshCw className="h-3 w-3 text-app-accent/80" />
                Đồng bộ bảo mật đa thiết bị
              </li>
              <li className="inline-flex items-center gap-1.5 rounded-full border border-app-line/50 bg-app-surface/40 backdrop-blur-sm px-3 py-1 text-[11px] font-medium text-app-ink-soft">
                <Smartphone className="h-3 w-3 text-app-accent/80" />
                Tối ưu cho cả điện thoại & máy tính
              </li>
            </ul>
          </div>
        </div>

        {/* Mockup preview card */}
        <HeroMockupAnimated previewData={selectedPreview} />
        </div>
      </section>


      {hasLocalData ? (
        <section
          className="surface-raised rounded-xl border border-app-warm-border bg-app-warm-soft p-5 md:p-6"
          aria-labelledby="dashboard-local-data-title"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-app-surface text-app-warm">
                <HardDrive className="h-4 w-4" />
              </div>
              <div>
                <h2 id="dashboard-local-data-title" className="text-base font-semibold text-app-warm-strong">
                  Có dữ liệu đã lưu trên thiết bị này
                </h2>
                <p className="mt-1 text-sm leading-6 text-app-warm-strong">
                  Đăng nhập để kiểm tra, sao lưu và nhập dữ liệu này vào tài khoản. Chúng tôi không ghi đè dữ liệu tài
                  khoản nếu chưa có xác nhận của bạn.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={onSignIn}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-app-warm px-3.5 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-app-warm-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-warm/30"
              >
                <LogIn className="h-4 w-4" />
                Đăng nhập để khôi phục
              </button>
              <button
                type="button"
                onClick={onSignUp}
                className="inline-flex items-center justify-center rounded-lg border border-app-warm-border bg-app-surface px-3.5 py-2 text-sm font-medium text-app-warm-strong transition-colors duration-150 hover:bg-app-warm-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-warm/30"
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
        className="grid gap-6 sm:grid-cols-2"
        aria-label="So sánh trước và sau"
      >
        <div className="rounded-xl border border-dashed border-app-line/80 bg-app-bg/60 p-6 transition-all duration-300 hover:border-app-ink-muted/30">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-app-line/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-app-ink-muted">
            <span>😶</span> Trước
          </p>
          <h3 className="mt-3 text-sm font-bold text-app-ink">Mục tiêu mơ hồ</h3>
          <ul className="mt-4 space-y-2.5 text-xs font-semibold leading-relaxed text-app-ink-soft">
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0 text-app-ink-muted font-bold">✕</span>
              <span>"Muốn khoẻ hơn" — không biết bắt đầu từ đâu</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0 text-app-ink-muted font-bold">✕</span>
              <span>Viết to-do rồi quên sau 2 tuần</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0 text-app-ink-muted font-bold">✕</span>
              <span>Không có ai nhắc hay review tiến độ</span>
            </li>
          </ul>
        </div>
        <div className="relative rounded-xl border border-app-accent/15 border-t-2 border-t-app-accent bg-app-accent-soft/15 p-6 shadow-[0_10px_30px_-10px_rgba(47,93,80,0.05)] transition-all duration-300 hover:shadow-[0_12px_36px_-10px_rgba(47,93,80,0.08)]">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-app-accent-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-app-accent border border-app-accent/10">
            <span>🎯</span> Sau 12 tuần
          </p>
          <h3 className="mt-3 text-sm font-bold text-app-ink">Kế hoạch hành động rõ ràng</h3>
          <ul className="mt-4 space-y-2.5 text-xs font-semibold leading-relaxed text-app-ink-soft">
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0 text-app-accent font-extrabold">✓</span>
              <span>1 mục tiêu SMART cụ thể, đo được</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0 text-app-accent font-extrabold">✓</span>
              <span>Kế hoạch 12 tuần với checkpoint hàng tuần</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 shrink-0 text-app-accent font-extrabold">✓</span>
              <span>Mỗi sáng biết ngay việc cần làm hôm nay</span>
            </li>
          </ul>
        </div>
      </RevealOnScroll>

      <RevealOnScroll
        as="section"
        className="surface-raised rounded-2xl border border-app-line/75 bg-app-surface/50 p-6 md:p-10 shadow-[0_4px_20px_rgba(0,0,0,0.01)]"
        aria-labelledby="dashboard-how-it-works-title"
      >
        <div className="flex flex-col gap-2.5 max-w-2xl">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-app-accent/80">Hành trình 12 tuần</p>
          <h2 id="dashboard-how-it-works-title" className="font-serif text-3xl font-medium leading-[1.25] text-app-ink sm:text-[2.25rem]">
            Đóng gói ước mơ mơ hồ thành chu kỳ hành động, trong 4 bước.
          </h2>
        </div>

        <div className="relative mt-12">
          {/* Connecting line for desktop */}
          <div aria-hidden="true" className="hidden lg:block absolute top-[44px] left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-app-accent/20 to-transparent z-0" />
          
          <ol className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4 z-10">
            {HOW_IT_WORKS_STEPS.map((step) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.step}
                  className="group relative flex flex-col items-center lg:items-start text-center lg:text-left rounded-2xl border border-app-line bg-white/45 dark:bg-neutral-900/25 backdrop-blur-sm p-6 shadow-[0_4px_20px_rgba(0,0,0,0.015)] hover:-translate-y-0.5 hover:border-app-accent/30 hover:shadow-[0_8px_24px_rgba(47,93,80,0.03)] transition-all duration-300"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-app-accent-soft text-app-accent group-hover:bg-app-accent group-hover:text-white transition-all duration-300 shadow-sm border border-app-accent/5">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="absolute top-4 right-6 text-3xl font-serif font-semibold text-app-accent/15 select-none transition-colors duration-300 group-hover:text-app-accent/25">
                    {step.step}
                  </div>
                  <h3 className="mt-5 text-sm font-bold text-app-ink group-hover:text-app-accent transition-colors duration-200">{step.title}</h3>
                  <p className="mt-2 text-xs font-medium leading-relaxed text-app-ink-soft/90">{step.description}</p>
                  
                  <div className="mt-4 pt-3 border-t border-app-line/45 w-full flex items-center justify-between">
                    <span className="text-[10px] font-medium text-app-accent flex items-center gap-1.5">
                      <span className="h-1 w-1 rounded-full bg-app-accent shrink-0 animate-pulse" />
                      {step.result}
                    </span>
                    <span className="rounded-full bg-app-bg px-2.5 py-0.5 text-[9px] font-medium text-app-ink-muted border border-app-line/45">
                      {step.duration}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </RevealOnScroll>

      <RevealOnScroll as="section" className="grid gap-6 lg:grid-cols-3" aria-label="Vì sao chọn Dear Our Future">
        {FEATURE_ROWS.map((feature) => {
          const Icon = feature.icon;

          return (
            <Link
              key={feature.title}
              to={feature.href}
              className="group relative rounded-2xl border border-app-line bg-white/40 dark:bg-neutral-900/20 backdrop-blur-sm p-6 shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:-translate-y-px hover:border-app-accent/35 hover:shadow-[0_10px_28px_-8px_rgba(47,93,80,0.04)] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
            >
              <div className="flex flex-col gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-app-accent-soft text-app-accent transition-all duration-300 group-hover:bg-app-accent group-hover:text-white">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="space-y-2">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-app-accent/80">{feature.tag}</p>
                  <h2 className="text-base font-bold text-app-ink transition-colors duration-200 group-hover:text-app-accent">{feature.title}</h2>
                  <p className="text-xs font-medium leading-relaxed text-app-ink-soft/90">{feature.description}</p>
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

      <RevealOnScroll
        as="section"
        className="relative overflow-hidden rounded-[20px] border border-app-accent/15 bg-gradient-to-br from-app-ink via-app-ink to-emerald-950/80 p-8 md:p-12 shadow-[0_12px_36px_rgba(47,93,80,0.1)] text-white"
        aria-labelledby="dashboard-public-cta-title"
      >
        <div className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-app-accent/10 blur-[80px]" />
        <div className="pointer-events-none absolute -top-16 -left-16 h-64 w-64 rounded-full bg-app-warm/5 blur-[80px]" />
        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3 max-w-2xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-app-accent/80">
              Bắt đầu đúng thứ tự
            </p>
            <h2
              id="dashboard-public-cta-title"
              className="font-serif text-3xl font-normal leading-[1.25] text-white sm:text-4xl"
            >
              Sẵn sàng dựng chu kỳ 12 tuần đầu tiên?
            </h2>
            <p className="text-xs font-normal leading-relaxed text-slate-300">
              Thiết lập nhanh chóng trong 10 phút. Toàn bộ dữ liệu của bạn sẽ được mã hóa và tự động đồng bộ an toàn giữa các thiết bị cá nhân.
            </p>
          </div>
          <div className="shrink-0 flex flex-col items-center lg:items-end gap-3">
            <button
              type="button"
              onClick={onStart}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-medium text-app-ink shadow-md hover:bg-slate-50 transition-all duration-200 hover:-translate-y-px active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            >
              <UserPlus className="h-4 w-4 text-app-accent" />
              {primaryLabel}
            </button>
            <p className="text-[10px] font-normal text-slate-400 flex items-center gap-1.5">
              <span>✦</span>
              Nhận ngay việc làm hôm nay để bắt đầu
            </p>
          </div>
        </div>
      </RevealOnScroll>
    </div>
  );
}

