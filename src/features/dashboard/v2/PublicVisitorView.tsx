import { ArrowRight, Check, Compass, HardDrive, Lock, LogIn, Minus, Smartphone, UserPlus } from "lucide-react";
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
  { id: "reading", label: "Đọc sách" },
  { id: "ielts", label: "IELTS 7.0" },
  { id: "gym", label: "Tập gym" },
  { id: "portfolio", label: "Portfolio" },
] as const;

const STEPS = [
  {
    no: "01",
    eyebrow: "Nhìn nhận",
    title: "Cân bằng cuộc sống",
    description: "Chấm điểm 8 khía cạnh để thấy nơi đang lệch nhịp và cần ưu tiên trước.",
    meta: "≈ 3 phút",
  },
  {
    no: "02",
    eyebrow: "Định vị",
    title: "Đặt mục tiêu SMART",
    description: "Chọn một lĩnh vực trọng tâm và đóng gói mong muốn thành mục tiêu đo lường được.",
    meta: "≈ 5 phút",
  },
  {
    no: "03",
    eyebrow: "Thiết lập",
    title: "Kế hoạch 12 tuần",
    description: "Dựng thói quen lặp lại và các mốc checkpoint để đo tiến độ một cách tự nhiên.",
    meta: "≈ 5 phút",
  },
  {
    no: "04",
    eyebrow: "Thực thi",
    title: "Hành động mỗi ngày",
    description: "Mở danh sách việc hôm nay, hoàn thành, và phản tư ngắn vào cuối tuần.",
    meta: "2 phút/ngày",
  },
] as const;

const BEFORE_POINTS = [
  '"Muốn sống khỏe hơn" — mong muốn mơ hồ, không biết bắt đầu từ đâu.',
  "Viết to-do list rồi quên sạch sau vài tuần.",
  "Thiếu nhịp cam kết mỗi ngày và một ngày cố định để nhìn lại.",
] as const;

const AFTER_POINTS = [
  "Một mục tiêu SMART rõ ràng, xuất phát từ bức tranh cuộc sống của bạn.",
  "Lộ trình 12 tuần mạch lạc với chỉ số tiến độ theo dõi được.",
  "Mỗi sáng mở Today, làm vài việc cốt lõi, rồi đóng lại.",
] as const;

const FEATURE_ROWS = [
  {
    tag: "Miễn phí",
    title: "Bắt đầu không tốn xu nào",
    description: "Dữ liệu lưu ngay trên thiết bị, đồng bộ giữa điện thoại và máy tính khi bạn đăng nhập.",
    href: "/life-balance",
    icon: Lock,
  },
  {
    tag: "Đúng thứ tự",
    title: "Không phải trang trắng như Notion",
    description: "Dear Our Future dẫn bạn qua từng bước có cơ sở, không bị rối khi mới bắt đầu.",
    href: "/12-week-setup",
    icon: Compass,
  },
  {
    tag: "Gọn nhẹ",
    title: "Đủ nhẹ cho buổi sáng vội",
    description: "Mở Today, tick xong việc, đóng lại. Không cần học giao diện phức tạp.",
    href: "/12-week-system?tab=today",
    icon: Smartphone,
  },
] as const;

interface PublicVisitorViewProps {
  isDemo: boolean;
  hasLocalData: boolean;
  onStart: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
}

export function PublicVisitorView({
  isDemo: _isDemo,
  hasLocalData,
  onStart,
  onSignIn,
  onSignUp,
}: PublicVisitorViewProps) {
  const [selectedPreviewId, setSelectedPreviewId] = useState(GOAL_PREVIEWS[0].id);
  const selectedPreview = GOAL_PREVIEWS.find((p) => p.id === selectedPreviewId) ?? GOAL_PREVIEWS[0];

  const handlePreviewSelect = (id: string) => {
    setSelectedPreviewId(id);
    trackAnalyticsEvent("landing_goal_preview_selected", { preview_id: id, source: "dashboard" });
  };

  const scrollToHowItWorks = () => {
    document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-20 md:space-y-28">
      {/* ── Hero ── */}
      <section className="relative -mx-4 px-4 pt-10 pb-4 sm:-mx-6 sm:px-6 md:pt-16">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          <div className="appear-fade-up">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-accent">Dear Our Future</p>

            <h1 className="mt-5 font-serif text-[2.4rem] font-medium leading-[1.08] tracking-tight text-app-ink sm:text-5xl md:text-[3.6rem]">
              Cuộc sống mơ ước,
              <br className="hidden sm:inline" /> bắt đầu từ một{" "}
              <span className="italic text-app-accent">kế hoạch 12 tuần</span>.
            </h1>

            <p className="mt-6 max-w-[46ch] text-sm leading-relaxed text-app-ink-soft sm:text-base">
              Bạn có nhiều mục tiêu nhưng không biết bắt đầu từ đâu, và hay bỏ cuộc sau vài tuần? Dear Our Future biến
              mong muốn mơ hồ thành việc cụ thể mỗi ngày — và giúp bạn đi hết chặng.
            </p>

            <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={onStart}
                className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-app-accent px-7 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-app-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg"
              >
                Bắt đầu miễn phí
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <button
                type="button"
                onClick={scrollToHowItWorks}
                className="inline-flex items-center text-sm font-semibold text-app-ink-soft underline-offset-4 transition-colors hover:text-app-ink hover:underline focus-visible:outline-none"
              >
                Xem cách hoạt động
              </button>
            </div>

            <p className="mt-5 text-xs text-app-ink-muted">Miễn phí · Thiết lập trong 3 phút</p>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-[1.75rem] border border-app-line shadow-[0_28px_64px_-32px_rgba(15,40,30,0.35)]">
              <img
                src="/study_desk_hero.png"
                alt="Góc học tập và lập kế hoạch"
                className="aspect-[4/3] w-full object-cover dark:brightness-90"
              />
            </div>
            <div className="absolute -bottom-5 left-5 right-8 rounded-2xl border border-app-line bg-app-surface px-4 py-3 shadow-md sm:right-12">
              <p className="font-serif text-sm italic leading-relaxed text-app-ink-soft">
                "Một góc yên để nhìn lại mục tiêu và bắt đầu chu kỳ mới."
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Local data restore banner ── */}
      {hasLocalData ? (
        <section
          className="mx-auto max-w-6xl rounded-2xl border border-app-status-warning/30 bg-app-status-warning/10 p-5 md:p-6"
          aria-labelledby="dashboard-local-data-title"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-app-surface text-app-status-warning shadow-sm">
                <HardDrive className="h-4 w-4" />
              </div>
              <div>
                <h2 id="dashboard-local-data-title" className="text-base font-semibold text-app-status-warning">
                  Có dữ liệu đã lưu trên thiết bị này
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-app-ink-soft">
                  Đăng nhập để kiểm tra, sao lưu và nhập dữ liệu này vào tài khoản. Chúng tôi không ghi đè dữ liệu tài
                  khoản nếu chưa có xác nhận của bạn.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={onSignIn}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-app-status-warning px-4 py-2.5 text-xs font-semibold text-white transition-colors duration-150 hover:bg-app-status-warning/90 focus-visible:outline-none"
              >
                <LogIn className="h-4 w-4" />
                Đăng nhập để khôi phục
              </button>
              <button
                type="button"
                onClick={onSignUp}
                className="inline-flex items-center justify-center rounded-lg border border-app-status-warning/30 bg-app-surface px-4 py-2.5 text-xs font-semibold text-app-status-warning transition-colors duration-150 hover:bg-app-status-warning/10 focus-visible:outline-none"
              >
                Tạo tài khoản mới
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {/* ── Product preview ── */}
      <RevealOnScroll as="section" className="mx-auto max-w-6xl px-4" aria-label="Xem thử một mục tiêu thật">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-accent">Xem thử</p>
            <h2 className="mt-2 font-serif text-2xl font-medium leading-tight text-app-ink sm:text-3xl">
              Một mục tiêu thật trông như thế nào
            </h2>
          </div>
          <div className="flex flex-wrap gap-2" role="tablist" aria-label="Chọn ví dụ mục tiêu">
            {PREVIEW_CHIPS.map((chip) => {
              const active = selectedPreviewId === chip.id;
              return (
                <button
                  key={chip.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => handlePreviewSelect(chip.id)}
                  className={`inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg ${
                    active
                      ? "bg-app-accent text-white"
                      : "border border-app-line bg-app-surface text-app-ink-soft hover:border-app-accent/40 hover:text-app-accent"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </div>
        <DreamToPlanPreview previewData={selectedPreview} />
      </RevealOnScroll>

      {/* ── How it works ── */}
      <RevealOnScroll as="section" id="how-it-works" className="mx-auto max-w-6xl px-4" aria-labelledby="how-it-works-title">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-app-accent">Cách hoạt động</p>
          <h2
            id="how-it-works-title"
            className="mt-2 font-serif text-2xl font-medium leading-tight text-app-ink sm:text-[2.1rem]"
          >
            Bốn bước, từ mong muốn đến hành động
          </h2>
        </div>

        <ol className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-app-line bg-app-line sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <li key={step.no} className="flex flex-col gap-3 bg-app-surface p-6">
              <span className="font-serif text-3xl font-medium text-neutral-300 dark:text-neutral-700">
                {step.no}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-app-accent">{step.eyebrow}</span>
              <h3 className="font-serif text-lg font-medium text-app-ink">{step.title}</h3>
              <p className="text-sm leading-relaxed text-app-ink-soft">{step.description}</p>
              <span className="mt-auto pt-3 text-xs font-medium text-app-ink-muted">{step.meta}</span>
            </li>
          ))}
        </ol>
      </RevealOnScroll>

      {/* ── Before / After ── */}
      <RevealOnScroll as="section" className="mx-auto grid max-w-6xl gap-6 px-4 sm:grid-cols-2" aria-label="So sánh trước và sau">
        <div className="rounded-2xl border border-app-line bg-app-bg-subtle p-6 md:p-7">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-app-ink-muted">Trước</span>
          <h3 className="mt-2 font-serif text-xl font-medium text-app-ink">Mục tiêu còn mơ hồ</h3>
          <ul className="mt-5 space-y-3.5">
            {BEFORE_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3 text-sm leading-relaxed text-app-ink-soft">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-app-line text-app-ink-muted">
                  <Minus className="h-3 w-3" />
                </span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-app-accent/25 bg-app-accent-soft/40 p-6 md:p-7">
          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-app-accent">Sau 12 tuần</span>
          <h3 className="mt-2 font-serif text-xl font-medium text-app-ink">Kỷ luật và trọng tâm</h3>
          <ul className="mt-5 space-y-3.5">
            {AFTER_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3 text-sm leading-relaxed text-app-ink">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-app-accent text-white">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </RevealOnScroll>

      {/* ── Feature cards ── */}
      <RevealOnScroll
        as="section"
        className="mx-auto grid max-w-6xl gap-5 px-4 lg:grid-cols-3"
        aria-label="Vì sao chọn Dear Our Future"
      >
        {FEATURE_ROWS.map((feature) => {
          const Icon = feature.icon;
          return (
            <Link
              key={feature.title}
              to={feature.href}
              className="group rounded-2xl border border-app-line bg-app-surface p-6 transition-colors hover:border-app-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-app-accent-soft text-app-accent transition-colors group-hover:bg-app-accent group-hover:text-white">
                <Icon className="h-5 w-5" />
              </div>
              <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-app-accent/80">
                {feature.tag}
              </p>
              <h3 className="mt-1.5 font-serif text-lg font-medium text-app-ink">{feature.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-app-ink-soft">{feature.description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-app-accent transition-transform group-hover:translate-x-0.5">
                Tìm hiểu thêm
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          );
        })}
      </RevealOnScroll>

      {/* ── Closing CTA ── */}
      <RevealOnScroll as="section" className="mx-auto max-w-6xl px-4" aria-labelledby="closing-cta-title">
        <div className="overflow-hidden rounded-3xl bg-emerald-950 px-8 py-12 text-center md:px-14 md:py-16 lg:text-left">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="mx-auto max-w-xl lg:mx-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-400">
                Gửi lời chào tới tương lai
              </p>
              <h2 id="closing-cta-title" className="mt-3 font-serif text-3xl font-medium leading-tight text-white sm:text-[2.6rem]">
                Bắt đầu chu kỳ 12 tuần của bạn
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-emerald-100/70">
                Dành vài phút thiết lập lộ trình hành động ngay hôm nay. Hoàn toàn miễn phí.
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-center gap-3 lg:items-end">
              <button
                type="button"
                onClick={onStart}
                className="group inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-semibold text-emerald-950 shadow-sm transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                <UserPlus className="h-4 w-4" />
                Thiết lập chu kỳ 12 tuần
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <p className="text-xs text-emerald-100/60">Nhận ngay việc làm hôm nay để khởi động</p>
            </div>
          </div>
        </div>
      </RevealOnScroll>
    </div>
  );
}
