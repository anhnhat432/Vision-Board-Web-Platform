import { BookOpen, Compass, HelpCircle, LifeBuoy, ListChecks, Sparkles, Target, TrendingUp } from "lucide-react";
import { Eye, PenLine, Scale, Settings as SettingsIcon } from "lucide-react";
import { Images, Palette } from "lucide-react";
import { Link } from "react-router";
import { AppPublicFooter } from "../components/layout/AppPublicFooter";
import { PageBackLink } from "../components/PageBackLink";
import { SCREEN_GUIDES } from "../components/screen-guides";

const SUPPORT_EMAIL = import.meta.env.VITE_BILLING_SUPPORT_EMAIL?.trim() || "support@dearourfuture.com";

interface HelpSection {
  id: string;
  icon: typeof Compass;
  eyebrow: string;
  title: string;
  intro: string;
  steps: { label?: string; text: string }[];
  tip?: string;
  cta?: { label: string; to: string };
}

const HELP_SECTIONS: HelpSection[] = [
  {
    id: "getting-started",
    icon: Compass,
    eyebrow: "Bắt đầu",
    title: "Đi đúng thứ tự để khỏi lạc",
    intro:
      "Website dễ dùng hơn nhiều khi bạn đi theo luồng: hiểu mình, chọn trọng tâm, viết mục tiêu, rồi mới lập kế hoạch 12 tuần.",
    steps: [
      { label: "1. Hiểu mình.", text: "Chấm Cân bằng cuộc sống để biết lĩnh vực nào đang cần ưu tiên." },
      { label: "2. Chọn trọng tâm.", text: "Dựa trên điểm cân bằng, chọn một lĩnh vực để tập trung trong chu kỳ này." },
      {
        label: "3. Viết mục tiêu SMART.",
        text: "Biến trọng tâm thành mục tiêu rõ kết quả, chỉ số, thời gian và lý do.",
      },
      {
        label: "4. Lập kế hoạch 12 tuần.",
        text: "Chia mục tiêu lớn thành các việc lặp lại theo tuần và mốc nhìn lại.",
      },
      { label: "5. Theo dõi tiến độ.", text: "Mỗi ngày mở Hôm nay, cuối tuần nhìn lại để giữ nhịp cả chu kỳ." },
    ],
    tip: "Mọi bản nháp được lưu tự động trên thiết bị, bạn có thể rời giữa chừng và quay lại sau.",
    cta: { label: "Bắt đầu đánh giá", to: "/onboarding" },
  },
  {
    id: "aspirational-vision",
    icon: BookOpen,
    eyebrow: "Tầm nhìn",
    title: SCREEN_GUIDES.aspirationalVision.title,
    intro: "Viết bức tranh dài hạn để các mục tiêu ngắn hạn không bị rời rạc.",
    steps: SCREEN_GUIDES.aspirationalVision.steps,
    tip: SCREEN_GUIDES.aspirationalVision.tip,
    cta: { label: "Viết tầm nhìn", to: "/vision" },
  },
  {
    id: "wheel-of-life",
    icon: TrendingUp,
    eyebrow: "Cân bằng cuộc sống",
    title: SCREEN_GUIDES.lifeBalance.title,
    intro: "Một bài tự đánh giá nhanh giúp bạn tìm ra lĩnh vực cuộc sống nào cần được chăm sóc trước.",
    steps: SCREEN_GUIDES.lifeBalance.steps,
    tip: SCREEN_GUIDES.lifeBalance.tip,
    cta: { label: "Mở Cân bằng cuộc sống", to: "/life-balance" },
  },
  {
    id: "life-insight",
    icon: Eye,
    eyebrow: "Góc nhìn",
    title: SCREEN_GUIDES.lifeInsight.title,
    intro: "Màn này giúp bạn chốt một lĩnh vực trọng tâm trước khi viết mục tiêu, để không ôm quá nhiều thứ cùng lúc.",
    steps: SCREEN_GUIDES.lifeInsight.steps,
    tip: SCREEN_GUIDES.lifeInsight.tip,
    cta: { label: "Chọn trọng tâm", to: "/life-insight" },
  },
  {
    id: "smart-goals",
    icon: Target,
    eyebrow: "Mục tiêu SMART",
    title: SCREEN_GUIDES.smartGoal.title,
    intro: "Phương pháp giúp mục tiêu của bạn rõ ràng, đo được và thực tế.",
    steps: SCREEN_GUIDES.smartGoal.steps,
    tip: SCREEN_GUIDES.smartGoal.tip,
    cta: { label: "Viết mục tiêu SMART", to: "/smart-goal-setup" },
  },
  {
    id: "feasibility-check",
    icon: Scale,
    eyebrow: "Khả thi",
    title: SCREEN_GUIDES.feasibility.title,
    intro: "Màn này giúp bạn kiểm tra mục tiêu có vừa sức với thời gian, năng lượng và nguồn lực hiện tại không.",
    steps: SCREEN_GUIDES.feasibility.steps,
    tip: SCREEN_GUIDES.feasibility.tip,
    cta: { label: "Kiểm tra khả thi", to: "/feasibility" },
  },
  {
    id: "twelve-week-roadmap",
    icon: ListChecks,
    eyebrow: "Kế hoạch 12 tuần",
    title: SCREEN_GUIDES.twelveWeekSetup.title,
    intro: "Một kế hoạch thực thi ngắn, chia mục tiêu thành các hành động theo tuần.",
    steps: SCREEN_GUIDES.twelveWeekSetup.steps,
    tip: SCREEN_GUIDES.twelveWeekSetup.tip,
    cta: { label: "Thiết lập 12 tuần", to: "/12-week-setup" },
  },
  {
    id: "weekly-progress",
    icon: Sparkles,
    eyebrow: "Theo dõi tiến độ",
    title: SCREEN_GUIDES.twelveWeekSystem.title,
    intro: "Bảng tiến độ trực quan giúp bạn giữ động lực bằng cách hoàn thành các việc nhỏ mỗi ngày.",
    steps: SCREEN_GUIDES.twelveWeekSystem.steps,
    tip: SCREEN_GUIDES.twelveWeekSystem.tip,
    cta: { label: "Mở hệ thống 12 tuần", to: "/12-week-system" },
  },
  {
    id: "vision-board-editor",
    icon: Palette,
    eyebrow: "Vision board",
    title: SCREEN_GUIDES.visionBoardEditor.title,
    intro: "Dùng bảng trực quan để neo cảm hứng, mục tiêu và các hình ảnh đại diện cho phiên bản tương lai của bạn.",
    steps: SCREEN_GUIDES.visionBoardEditor.steps,
    tip: SCREEN_GUIDES.visionBoardEditor.tip,
    cta: { label: "Tạo vision board", to: "/vision-board" },
  },
  {
    id: "vision-board-gallery",
    icon: Images,
    eyebrow: "Thư viện",
    title: SCREEN_GUIDES.visionBoardGallery.title,
    intro: "Nơi lưu lại các bảng tầm nhìn theo từng năm để bạn mở lại, chỉnh sửa hoặc tạo bảng mới.",
    steps: SCREEN_GUIDES.visionBoardGallery.steps,
    tip: SCREEN_GUIDES.visionBoardGallery.tip,
    cta: { label: "Mở thư viện", to: "/gallery" },
  },
  {
    id: "reflection-journal",
    icon: PenLine,
    eyebrow: "Nhật ký",
    title: SCREEN_GUIDES.reflectionJournal.title,
    intro: "Dùng nhật ký để ghi lại điều học được, cảm xúc và những điều cần chỉnh sau mỗi tuần hoặc mỗi ngày.",
    steps: SCREEN_GUIDES.reflectionJournal.steps,
    tip: SCREEN_GUIDES.reflectionJournal.tip,
    cta: { label: "Mở nhật ký", to: "/journal" },
  },
  {
    id: "settings-guide",
    icon: SettingsIcon,
    eyebrow: "Cài đặt",
    title: SCREEN_GUIDES.settings.title,
    intro: "Khi cần xuất dữ liệu, kiểm tra đồng bộ, đổi giao diện hoặc xoá dữ liệu, hãy vào màn Cài đặt.",
    steps: SCREEN_GUIDES.settings.steps,
    tip: SCREEN_GUIDES.settings.tip,
    cta: { label: "Mở Cài đặt", to: "/settings" },
  },
];

const FAQ_ITEMS: { question: string; answer: string; link?: string; linkLabel?: string }[] = [
  {
    question: "Tôi nên làm gì đầu tiên?",
    answer:
      "Chấm Cân bằng cuộc sống trước. Đây là điểm khởi đầu để app gợi ý trọng tâm và giúp bạn viết mục tiêu sát thực tế.",
  },
  {
    question: "Tôi có bắt buộc phải đăng nhập không?",
    answer:
      "Bạn vẫn dùng được luồng cơ bản trên thiết bị này. Đăng nhập giúp đồng bộ và giữ dữ liệu liền mạch giữa nhiều thiết bị.",
  },
  {
    question: "12-Week Year là gì?",
    answer: "Là cách lập kế hoạch trong 12 tuần thay vì cả năm, để mỗi tuần đều có hành động cụ thể và dễ giữ nhịp.",
  },
  {
    question: "Dữ liệu của tôi có an toàn khi mất mạng không?",
    answer: "Có. Dữ liệu được lưu trên thiết bị trước, và sẽ tự đồng bộ lại lên tài khoản khi có mạng.",
  },
  {
    question: "Tôi cần thêm trợ giúp về thanh toán?",
    answer: "Xem trang Hỏi đáp thanh toán hoặc liên hệ email hỗ trợ kèm mã đơn hàng.",
    link: "/billing/faq",
    linkLabel: "Hỏi đáp thanh toán",
  },
];

export function HelpCenterPage() {
  return (
    <div className="bg-app-bg">
      <div className="mx-auto max-w-3xl space-y-section px-4 py-8 sm:px-6">
        <PageBackLink fallback="/" className="mb-2" />
        <header className="surface-raised overflow-hidden rounded-card border border-app-line bg-app-surface p-card-pad sm:p-7">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-pill bg-app-accent-soft text-app-accent">
              <LifeBuoy className="h-6 w-6" />
            </div>
            <div className="min-w-0 space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-app-accent">Dear Our Future</span>
              <h1 className="font-serif text-3xl font-medium tracking-tight text-app-ink">Trung tâm trợ giúp</h1>
              <p className="text-sm leading-7 text-app-ink-soft">
                Hướng dẫn ngắn gọn giúp bạn biến mục tiêu thành kế hoạch hành động 12 tuần rõ ràng.
              </p>
            </div>
          </div>

          <nav aria-label="Mục lục trợ giúp" className="mt-5 flex flex-wrap gap-2 border-t border-app-line pt-5">
            {HELP_SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-app-line bg-app-bg px-3 py-1.5 text-xs font-medium text-app-ink-soft transition-colors hover:border-app-accent/40 hover:text-app-accent"
              >
                <section.icon className="h-3.5 w-3.5" />
                {section.eyebrow}
              </a>
            ))}
            <a
              href="#faq"
              className="inline-flex items-center gap-1.5 rounded-full border border-app-line bg-app-bg px-3 py-1.5 text-xs font-medium text-app-ink-soft transition-colors hover:border-app-accent/40 hover:text-app-accent"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              Hỏi đáp
            </a>
          </nav>
        </header>

        {HELP_SECTIONS.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="surface-raised scroll-mt-24 space-y-4 rounded-card border border-app-line bg-app-surface p-card-pad sm:p-7"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-app-accent-soft text-app-accent">
                <section.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-accent">{section.eyebrow}</p>
                <h2 className="font-serif text-xl font-medium text-app-ink">{section.title}</h2>
              </div>
            </div>

            <p className="text-sm leading-7 text-app-ink-soft">{section.intro}</p>

            <ol className="space-y-2.5">
              {section.steps.map((step, index) => (
                <li key={`${section.id}-${step.text}`} className="flex gap-3 text-sm leading-7 text-app-ink-soft">
                  <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-app-bg text-xs font-semibold text-app-ink-muted">
                    {index + 1}
                  </span>
                  <span>
                    {step.label ? <span className="font-semibold text-app-ink">{step.label} </span> : null}
                    {step.text}
                  </span>
                </li>
              ))}
            </ol>

            {section.tip ? (
              <p className="rounded-control border border-app-line bg-app-bg px-4 py-3 text-sm leading-6 text-app-ink-soft">
                <span className="font-semibold text-app-ink">Mẹo: </span>
                {section.tip}
              </p>
            ) : null}

            {section.cta ? (
              <Link
                to={section.cta.to}
                className="inline-flex min-h-11 items-center justify-center rounded-control bg-app-accent px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-app-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
              >
                {section.cta.label}
              </Link>
            ) : null}
          </section>
        ))}

        <section
          id="faq"
          className="surface-raised scroll-mt-24 space-y-4 rounded-card border border-app-line bg-app-surface p-card-pad sm:p-7"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-app-accent-soft text-app-accent">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-accent">Hỏi đáp</p>
              <h2 className="font-serif text-xl font-medium text-app-ink">Câu hỏi thường gặp</h2>
            </div>
          </div>

          <dl className="space-y-4">
            {FAQ_ITEMS.map((item) => (
              <div key={item.question} className="rounded-control border border-app-line bg-app-bg p-4">
                <dt className="flex items-start gap-2 text-sm font-semibold text-app-ink">
                  <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-app-accent" />
                  {item.question}
                </dt>
                <dd className="mt-2 pl-6 text-sm leading-7 text-app-ink-soft">
                  {item.answer}
                  {item.link ? (
                    <>
                      {" "}
                      <Link
                        to={item.link}
                        className="font-medium text-app-accent underline underline-offset-2 hover:text-app-ink"
                      >
                        {item.linkLabel}
                      </Link>
                    </>
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>

          <p className="text-sm leading-7 text-app-ink-soft">
            Vẫn cần trợ giúp? Liên hệ{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-medium text-app-accent underline underline-offset-2 hover:text-app-ink"
            >
              {SUPPORT_EMAIL}
            </a>
            .
          </p>
        </section>
      </div>

      <AppPublicFooter />
    </div>
  );
}
