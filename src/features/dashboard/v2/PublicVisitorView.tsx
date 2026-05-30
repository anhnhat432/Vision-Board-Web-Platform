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
    <div className="space-y-6">
      <section className="relative -mx-4 overflow-hidden bg-app-bg px-4 pb-2 pt-6 sm:-mx-6 sm:px-6 md:pt-12 lg:min-h-[80vh] lg:items-center lg:py-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 -z-0 h-2/3 bg-gradient-to-b from-transparent to-app-warm-soft/30"
        />
        <div className="relative z-10 grid gap-10 lg:grid-cols-[55fr_45fr] lg:items-center lg:gap-12">
        <div className="appear-fade-up">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-app-accent">
              Dear Our Future · Lập kế hoạch cá nhân 12 tuần
            </p>
            <h1 className="mt-4 max-w-[20ch] font-serif text-4xl font-medium leading-[1.25] tracking-tight text-app-ink md:text-display">
              Đạt mục tiêu lớn sau{" "}
              <span className="relative inline-block">
                <span className="relative z-10">12 tuần</span>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 200 12"
                  preserveAspectRatio="none"
                  className="absolute inset-x-0 -bottom-1 h-2.5 w-full text-app-warm"
                >
                  <path
                    d="M2 8 C 40 2, 80 10, 120 4 S 180 8, 198 5"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              </span>{" "}
              nhờ kế hoạch rõ ràng mỗi ngày.
            </h1>
            <p className="mt-4 max-w-[55ch] text-xs font-semibold leading-relaxed text-app-ink-soft">
              Đừng để mục tiêu chỉ là mong muốn. Chúng tôi dẫn bạn từng bước: Chấm điểm cuộc sống, lập mục tiêu SMART thực tế, và tự động chia thành việc cụ thể hôm nay.
            </p>
            <p className="mt-2 max-w-[50ch] text-xs italic leading-relaxed text-app-ink-muted">
              Dành cho những lúc bạn có nhiều mục tiêu nhưng không biết bắt đầu từ đâu.
            </p>

            <div className="mt-5 space-y-2 border-l-2 border-app-accent/30 pl-4 py-0.5">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-app-accent">Bản kế hoạch của bạn bao gồm:</p>
              <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-semibold text-app-ink-soft">
                <li className="flex items-center gap-1.5">
                  <span className="text-app-accent font-extrabold">✓</span> 1 Mục tiêu SMART thực tế
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-app-accent font-extrabold">✓</span> Kế hoạch chi tiết 12 tuần
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-app-accent font-extrabold">✓</span> Danh sách việc làm hôm nay
                </li>
              </ul>
            </div>

            {/* Interactive Goal Preview Chips */}
            <div className="mt-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-app-ink-muted mb-2">Thử hình dung mục tiêu của bạn:</p>
              <div className="flex flex-wrap gap-2">
                {PREVIEW_CHIPS.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    aria-pressed={selectedPreviewId === chip.id}
                    onClick={() => handlePreviewSelect(chip.id)}
                    className={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg ${
                      selectedPreviewId === chip.id
                        ? "bg-app-accent text-white shadow-md shadow-app-accent/20"
                        : "border border-app-line bg-app-surface text-app-ink-soft hover:border-app-accent/40 hover:text-app-accent"
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={onStart}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-app-accent px-5 py-3 text-sm font-medium text-white shadow-[0_8px_24px_-12px_rgba(47,93,80,0.55)] transition-colors duration-150 hover:bg-app-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg"
              >
                {heroStartLabel}
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={scrollToHowItWorks}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-app-line bg-app-surface px-5 py-3 text-sm font-medium text-app-ink transition-colors duration-150 hover:border-app-accent/40 hover:bg-app-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg"
              >
                Xem cách hoạt động
              </button>
            </div>

            <div className="mt-4">
              <p className="text-[10px] font-semibold text-app-ink-muted flex items-center gap-1">
                <span>⚡</span>
                Bạn sẽ đi qua 4 bước thiết lập trong khoảng 10–15 phút, sau đó nhận ngay việc hôm nay để bắt đầu.
              </p>
            </div>

            <ul className="mt-5 flex flex-wrap gap-2">
              <li className="inline-flex items-center gap-1.5 rounded-full border border-app-line bg-app-surface px-3 py-1 text-xs text-app-ink-soft">
                <Lock className="h-3.5 w-3.5 text-app-accent" />
                Mở trang là dùng được, không cần email
              </li>
              <li className="inline-flex items-center gap-1.5 rounded-full border border-app-line bg-app-surface px-3 py-1 text-xs text-app-ink-soft">
                <RefreshCw className="h-3.5 w-3.5 text-app-accent" />
                Đồng bộ khi sẵn sàng
              </li>
              <li className="inline-flex items-center gap-1.5 rounded-full border border-app-line bg-app-surface px-3 py-1 text-xs text-app-ink-soft">
                <Smartphone className="h-3.5 w-3.5 text-app-accent" />
                Hoạt động trên mobile
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
        className="grid gap-4 sm:grid-cols-2"
        aria-label="So sánh trước và sau"
      >
        <div className="rounded-xl border border-dashed border-app-line bg-app-bg p-5 opacity-75">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-app-ink-muted">😶 Trước</p>
          <h3 className="mt-2 text-sm font-bold text-app-ink">Mục tiêu mơ hồ</h3>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-app-ink-soft">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0 text-app-ink-muted">✗</span>
              "Muốn khoẻ hơn" — không biết bắt đầu từ đâu
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0 text-app-ink-muted">✗</span>
              Viết to-do rồi quên sau 2 tuần
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0 text-app-ink-muted">✗</span>
              Không có ai nhắc hay review tiến độ
            </li>
          </ul>
        </div>
        <div className="rounded-xl border border-app-accent/30 bg-app-accent-soft/20 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-app-accent">🎯 Sau 12 tuần</p>
          <h3 className="mt-2 text-sm font-bold text-app-ink">Kế hoạch hành động rõ ràng</h3>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-app-ink-soft">
            <li className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0 text-app-accent font-bold">✓</span>
              1 mục tiêu SMART cụ thể, đo được
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0 text-app-accent font-bold">✓</span>
              Kế hoạch 12 tuần với checkpoint hàng tuần
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5 shrink-0 text-app-accent font-bold">✓</span>
              Mỗi sáng biết ngay việc cần làm hôm nay
            </li>
          </ul>
        </div>
      </RevealOnScroll>

      <RevealOnScroll
        as="section"
        className="surface-raised rounded-xl border border-app-line bg-app-surface p-5 md:p-6"
        aria-labelledby="dashboard-how-it-works-title"
      >
        <div className="flex flex-col gap-1">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-app-ink-muted">Cách hoạt động</p>
          <h2 id="dashboard-how-it-works-title" className="font-serif text-2xl font-medium leading-8 text-app-ink">
            Từ mục tiêu mơ hồ đến việc hôm nay, trong 4 bước.
          </h2>
        </div>

        <ol className="relative mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS_STEPS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <li
                key={step.step}
                className="relative rounded-xl border border-app-line bg-app-bg p-5 shadow-app-sm hover:-translate-y-0.5 hover:border-app-accent/30 hover:shadow-app-md transition-all duration-300 z-10"
              >
                {/* Connector line for desktop */}
                {idx < HOW_IT_WORKS_STEPS.length - 1 && (
                  <div
                    aria-hidden="true"
                    className="hidden lg:block absolute top-[2.25rem] left-[calc(100%-0.5rem)] w-[calc(100%-1rem)] h-[1px] border-t border-dashed border-app-line z-0"
                  />
                )}
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-app-accent-soft text-app-accent shadow-sm">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-app-accent">
                    Bước {step.step}
                  </span>
                </div>
                <h3 className="mt-4 text-sm font-bold text-app-ink">{step.title}</h3>
                <p className="mt-1.5 text-xs font-semibold leading-relaxed text-app-ink-soft">{step.description}</p>
                <p className="mt-2 text-[10px] font-bold text-app-accent flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-app-accent shrink-0 animate-pulse" />
                  Nhận: {step.result}
                </p>
                <p className="mt-4 inline-block rounded-full bg-app-surface px-2.5 py-1 text-[10px] font-bold text-app-accent">
                  {step.duration}
                </p>
              </li>
            );
          })}
        </ol>
      </RevealOnScroll>

      <RevealOnScroll as="section" className="grid gap-5 lg:grid-cols-3" aria-label="Vì sao chọn Dear Our Future">
        {FEATURE_ROWS.map((feature) => {
          const Icon = feature.icon;

          return (
            <Link
              key={feature.title}
              to={feature.href}
              className="group rounded-xl border border-app-line bg-app-surface p-5 shadow-app-sm hover:-translate-y-0.5 hover:border-app-accent/30 hover:shadow-app-md transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-app-accent-soft text-app-accent transition-all duration-300 group-hover:bg-app-accent group-hover:text-white group-hover:shadow-md group-hover:shadow-app-accent-soft/50">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-app-accent">{feature.tag}</p>
                  <h2 className="text-base font-bold text-app-ink transition-colors duration-200 group-hover:text-app-accent">{feature.title}</h2>
                  <p className="text-xs font-semibold leading-relaxed text-app-ink-soft">{feature.description}</p>
                  <span className="inline-flex items-center gap-0.5 text-xs font-bold text-app-accent transition-transform duration-200 group-hover:translate-x-0.5 mt-2">
                    Tìm hiểu
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
        className="surface-raised rounded-xl border border-app-line bg-app-surface p-5 md:p-6"
        aria-labelledby="dashboard-public-cta-title"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-ink-muted">
              Bắt đầu đúng thứ tự
            </p>
            <h2
              id="dashboard-public-cta-title"
              className="mt-2 font-serif text-3xl font-medium leading-8 text-app-ink"
            >
              Sẵn sàng dựng chu kỳ 12 tuần đầu tiên?
            </h2>
            <p className="mt-2 text-sm leading-6 text-app-ink-soft">
              Đăng ký miễn phí trong 30 giây. Dữ liệu của bạn tự đồng bộ giữa điện thoại và máy tính.
            </p>
          </div>
          <div className="shrink-0 flex flex-col items-center sm:items-end gap-2">
            <button
              type="button"
              onClick={onStart}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-app-accent px-4 py-2.5 text-sm font-medium text-white transition-colors duration-150 hover:bg-app-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
            >
              <UserPlus className="h-4 w-4" />
              {primaryLabel}
            </button>
            <p className="text-[10px] font-semibold text-app-ink-muted">
              ⚡ Đi qua 4 bước (10–15 phút), có việc làm ngay
            </p>
          </div>
        </div>
      </RevealOnScroll>
    </div>
  );
}
