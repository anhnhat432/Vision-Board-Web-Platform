import { type CSSProperties, useEffect, useState } from "react";

import { FacebookIcon, InstagramIcon, TikTokIcon } from "@/app/components/layout/SocialIcons";
import { EditorialCard, Eyebrow, PillButton, SectionHeader, StatBadge } from "@/app/components/ui/editorial";
import { LazyMamCompanion } from "@/app/features/pet/LazyMamCompanion";

interface PublicVisitorDeferredSectionsProps {
  onStart: () => void;
  onStartIntent?: () => void;
  onReady?: () => void;
}

interface GoalPreview {
  id: string;
  chipLabel: string;
  title: string;
  vision: string;
  icons: string[];
  week: string;
  tasks: string[];
}

const SECTION: CSSProperties = { maxWidth: 1200, margin: "0 auto" };
const FOOTER_TRUST_LINKS = [
  { label: "Điều khoản dịch vụ", href: "/terms" },
  { label: "Chính sách bảo mật", href: "/privacy" },
  { label: "Chính sách hoàn tiền", href: "/refund-policy" },
  { label: "Liên hệ", href: "/contact" },
] as const;
const scrollAnchor: CSSProperties = { scrollMarginTop: 84 };

const GOAL_PREVIEWS: GoalPreview[] = [
  {
    id: "reading",
    chipLabel: "📚 Đọc sách",
    title: "Đọc 12 cuốn sách / năm",
    vision: "“Phát triển tri thức”",
    icons: ["📚", "✍️", "🧠"],
    week: "Tuần 4/12",
    tasks: ['Đọc 30 trang "Atomic Habits"', "Ghi 3 dòng phản tư", "Review tuần lúc 21h"],
  },
  {
    id: "ielts",
    chipLabel: "🎧 IELTS 7.0",
    title: "Đạt IELTS 7.0 trước tháng 9",
    vision: "“Tự tin giao tiếp quốc tế”",
    icons: ["🎧", "📝", "🌍"],
    week: "Tuần 3/12",
    tasks: ["Làm 1 bài Listening", "Viết 1 essay Task 2", "Review 50 từ vựng"],
  },
  {
    id: "gym",
    chipLabel: "🏋️ Gym",
    title: "Tập gym đều 3 buổi/tuần",
    vision: "“Sức khoẻ bền vững”",
    icons: ["🏋️", "🥗", "😴"],
    week: "Tuần 6/12",
    tasks: ["Tập Upper Body 45 phút", "Uống 2L nước", "Ngủ trước 23h"],
  },
  {
    id: "portfolio",
    chipLabel: "💻 Portfolio",
    title: "Hoàn thành Portfolio xin việc",
    vision: "“Sẵn sàng vào sự nghiệp”",
    icons: ["💻", "📄", "🤝"],
    week: "Tuần 2/12",
    tasks: ["Code 1 feature project", "Viết 1 case study", "Update LinkedIn"],
  },
];

const ROADMAP_STEPS = [
  {
    num: "01",
    tone: "light" as const,
    glyph: "◎",
    eyebrow: "Bước 1 · Nhìn nhận",
    title: "Cân bằng cuộc sống",
    body: "Đánh giá 8 khía cạnh cuộc sống để phát hiện điểm lệch nhịp cần cải thiện đầu tiên.",
    footLeft: "● Radar cuộc sống",
    footRight: "≈3 phút",
  },
  {
    num: "02",
    tone: "amber" as const,
    glyph: "◆",
    eyebrow: "Bước 2 · Định vị",
    title: "Đặt mục tiêu SMART",
    body: "Chọn lĩnh vực ưu tiên và đóng gói mong muốn thành mục tiêu SMART đo lường được.",
    footLeft: "● 1 tiêu điểm sắc nét",
    footRight: "≈5 phút",
  },
  {
    num: "03",
    tone: "light" as const,
    glyph: "▤",
    eyebrow: "Bước 3 · Thiết lập",
    title: "Kế hoạch 12 tuần",
    body: "Xây dựng thói quen lặp lại (tactics) và checkpoint đo lường tiến độ tự động.",
    footLeft: "● Lộ trình 12 tuần",
    footRight: "≈5 phút",
  },
  {
    num: "04",
    tone: "dark" as const,
    glyph: "⚡",
    eyebrow: "Bước 4 · Thực thi",
    title: "Hành động mỗi ngày",
    body: "Mở việc Today mỗi sáng, tick hoàn thành và phản tư ngắn vào cuối tuần.",
    footLeft: "● Today & Kỷ luật",
    footRight: "2 phút/ngày",
  },
];

const FEATURE_CARDS = [
  {
    icon: "🔒",
    tag: "Miễn phí",
    title: "Bắt đầu không tốn xu nào",
    body: "Dữ liệu lưu trên thiết bị, đồng bộ giữa điện thoại và máy tính khi bạn đăng nhập.",
  },
  {
    icon: "🧭",
    tag: "Đúng thứ tự",
    title: "Không rối như trang trắng",
    body: "Dear Our Future dẫn bạn qua đúng các bước có nghiên cứu sau lưng, không bị rối khi mới bắt đầu.",
  },
  {
    icon: "📱",
    tag: "Mobile-ready",
    title: "Đủ nhẹ cho buổi sáng vội",
    body: "Mở Today, tick xong việc, đóng lại. Không cần học UI phức tạp hay setup dài dòng.",
  },
];

const BEFORE_ITEMS = [
  '"Muốn sống khỏe hơn" — mong muốn mơ hồ, không biết bắt đầu từ đâu.',
  "Viết To-do list rồi nhanh chóng quên sạch sau 2 tuần.",
  "Thiếu nhịp cam kết hằng ngày và ngày khóa review tuần.",
];

const AFTER_ITEMS = [
  "Có 1 mục tiêu SMART xuất phát từ bảng tầm nhìn.",
  "Chiến thuật 12 tuần chặt chẽ với chỉ số lead hoàn thành.",
  "Mở việc Today tinh gọn mỗi sáng và hành động dứt khoát.",
];

function GoalPreviewSection() {
  const [selectedId, setSelectedId] = useState(GOAL_PREVIEWS[0].id);
  const goal = GOAL_PREVIEWS.find((preview) => preview.id === selectedId) ?? GOAL_PREVIEWS[0];

  const handleSelect = (id: string) => {
    setSelectedId(id);
    void import("@/app/utils/analytics").then(({ trackAnalyticsEvent }) => {
      trackAnalyticsEvent("landing_goal_preview_selected", { preview_id: id, source: "dashboard" });
    });
  };

  return (
    <section className="dof-defer-section" style={{ ...SECTION, padding: "40px 24px" }}>
      <SectionHeader
        eyebrow="Xem ví dụ thực tế"
        title="Một mục tiêu, một lộ trình rõ ràng"
        align="center"
        className="mb-[30px]"
      />
      <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 10, marginBottom: 30 }}>
        {GOAL_PREVIEWS.map((preview) => {
          const active = preview.id === selectedId;
          return (
            <button
              key={preview.id}
              type="button"
              aria-pressed={active}
              onClick={() => handleSelect(preview.id)}
              style={{
                border: active ? "none" : "1px solid rgba(23,21,15,0.14)",
                background: active ? "var(--app-accent)" : "var(--app-surface)",
                color: active ? "#fff" : "var(--app-ink-soft)",
                fontSize: 13.5,
                fontWeight: 600,
                padding: "10px 18px",
                borderRadius: 999,
                cursor: "pointer",
                transition: "background-color .16s ease, border-color .16s ease, color .16s ease",
              }}
            >
              {preview.chipLabel}
            </button>
          );
        })}
      </div>
      <EditorialCard
        className="dof-preview-card max-w-[880px] mx-auto"
        style={{ boxShadow: "0 24px 50px -28px rgba(23,21,15,0.3)" }}
      >
        <div className="dof-preview-left">
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--app-ink-soft)",
              marginBottom: 14,
            }}
          >
            Tầm nhìn của bạn
          </div>
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            {goal.icons.map((icon, index) => (
              <span
                // biome-ignore lint/suspicious/noArrayIndexKey: emoji set ổn định theo mục tiêu
                key={`${goal.id}-${index}`}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: "var(--app-bg-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 24,
                }}
              >
                {icon}
              </span>
            ))}
          </div>
          <div
            className="dof-display"
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "var(--app-accent)",
              fontStyle: "italic",
              lineHeight: 1.3,
            }}
          >
            {goal.vision}
          </div>
          <div
            style={{
              marginTop: 20,
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "var(--app-accent)",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              padding: "8px 14px",
              borderRadius: 999,
            }}
          >
            🎯 {goal.title}
          </div>
        </div>
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <LazyMamCompanion
                initialEvent="welcomeBack"
                className="dof-landing-mascot"
                compact
                animated={false}
                deferMs={6200}
              />
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--app-ink-soft)",
                }}
              >
                Việc hôm nay
              </div>
            </div>
            <StatBadge>{goal.week}</StatBadge>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {goal.tasks.map((task) => (
              <div
                key={task}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: "var(--app-bg)",
                  border: "1px solid rgba(23,21,15,0.06)",
                  borderRadius: 13,
                  padding: "13px 15px",
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 7,
                    border: "2px solid var(--app-accent)",
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--app-accent)",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  ✓
                </span>
                <span style={{ fontSize: 14, fontWeight: 500, color: "var(--app-ink)" }}>{task}</span>
              </div>
            ))}
          </div>
        </div>
      </EditorialCard>
    </section>
  );
}

function BeforeAfterSection() {
  return (
    <section
      className="dof-defer-section"
      style={{ ...SECTION, padding: "48px 24px" }}
      aria-label="So sánh trước và sau"
    >
      <div className="dof-two-col">
        <EditorialCard tone="muted">
          <Eyebrow
            tone="muted"
            className="mb-0"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              background: "var(--app-bg-subtle)",
              color: "var(--app-ink-soft)",
              padding: "6px 12px",
              borderRadius: 999,
              letterSpacing: "0.1em",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            ✕ Trước khi dùng
          </Eyebrow>
          <h3
            className="dof-display"
            style={{ fontSize: 24, fontWeight: 700, margin: "16px 0 18px", color: "var(--app-ink)" }}
          >
            Mục tiêu mơ hồ
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {BEFORE_ITEMS.map((item) => (
              <div
                key={item}
                style={{ display: "flex", gap: 12, fontSize: 14.5, lineHeight: 1.5, color: "var(--app-ink-soft)" }}
              >
                <span style={{ color: "var(--app-ink-soft)", fontWeight: 700 }}>✕</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </EditorialCard>
        <EditorialCard tone="accent" style={{ boxShadow: "0 24px 50px -28px rgba(12,94,58,0.6)" }}>
          <Eyebrow
            tone="muted"
            className="mb-0"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              background: "var(--app-highlight)",
              color: "var(--app-ink)",
              padding: "6px 12px",
              borderRadius: 999,
              letterSpacing: "0.1em",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            ✓ Kế hoạch 12 tuần rõ nét
          </Eyebrow>
          <h3 className="dof-display" style={{ fontSize: 24, fontWeight: 700, margin: "16px 0 18px", color: "#fff" }}>
            Kỷ luật &amp; Trọng tâm
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {AFTER_ITEMS.map((item) => (
              <div
                key={item}
                style={{ display: "flex", gap: 12, fontSize: 14.5, lineHeight: 1.5, color: "var(--app-accent-soft)" }}
              >
                <span style={{ color: "var(--app-highlight)", fontWeight: 700 }}>✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </EditorialCard>
      </div>
    </section>
  );
}

function RoadmapSection() {
  return (
    <section id="how" className="dof-defer-section" style={{ ...SECTION, padding: "48px 24px", ...scrollAnchor }}>
      <SectionHeader eyebrow="Lộ trình của bạn" title="Bốn bước chuyển mình rõ nét" className="mb-[34px]" />
      <div className="dof-quad-grid">
        {ROADMAP_STEPS.map((step) => {
          const dark = step.tone === "dark";
          const amber = step.tone === "amber";
          const cardBg = dark ? "var(--app-ink)" : amber ? "#FFFCE8" : "var(--app-surface)";
          const cardBorder = dark ? "none" : amber ? "1px solid rgba(214,178,40,0.35)" : "1px solid var(--app-line)";
          const numColor = dark ? "rgba(255,255,255,0.1)" : amber ? "#F0E4A8" : "#EAE5DA";
          const glyphBg = dark ? "var(--app-highlight)" : amber ? "#E7B400" : "var(--app-accent)";
          const glyphColor = dark ? "var(--app-ink)" : amber ? "#fff" : "var(--app-highlight)";
          const eyebrowColor = dark ? "var(--app-highlight)" : amber ? "#6B5E2E" : "var(--app-accent)";
          const bodyColor = dark ? "#A8A89C" : amber ? "#6B5E2E" : "var(--app-ink-soft)";
          const footColor = dark ? "var(--app-highlight)" : amber ? "#6B5E2E" : "var(--app-accent)";
          const footBorder = dark
            ? "1px solid rgba(255,255,255,0.1)"
            : amber
              ? "1px solid rgba(214,178,40,0.25)"
              : "1px solid rgba(23,21,15,0.07)";

          return (
            <div
              key={step.num}
              style={{
                background: cardBg,
                border: cardBorder,
                borderRadius: 20,
                padding: 24,
                position: "relative",
                color: dark ? "#fff" : undefined,
              }}
            >
              <div
                className="dof-display"
                style={{
                  fontSize: 40,
                  fontWeight: 800,
                  color: numColor,
                  lineHeight: 1,
                  position: "absolute",
                  top: 18,
                  right: 20,
                }}
              >
                {step.num}
              </div>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: glyphBg,
                  color: glyphColor,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  marginBottom: 34,
                }}
              >
                {step.glyph}
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: eyebrowColor,
                  marginBottom: 7,
                }}
              >
                {step.eyebrow}
              </div>
              <h4
                className="dof-display"
                style={{ fontSize: 18, fontWeight: 700, margin: "0 0 8px", color: dark ? "#fff" : "var(--app-ink)" }}
              >
                {step.title}
              </h4>
              <p style={{ fontSize: 13.5, lineHeight: 1.55, color: bodyColor, margin: "0 0 16px" }}>{step.body}</p>
              <div
                style={{
                  borderTop: footBorder,
                  paddingTop: 12,
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 12,
                  fontWeight: 600,
                  color: footColor,
                }}
              >
                <span>{step.footLeft}</span>
                <span>{step.footRight}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function WhySection() {
  return (
    <section
      id="why"
      className="dof-defer-section"
      style={{ ...SECTION, padding: "48px 24px", ...scrollAnchor }}
      aria-label="Vì sao chọn Dear Our Future"
    >
      <SectionHeader
        eyebrow="Vì sao chọn Dear Our Future"
        title="Không phải trang trắng — là người dẫn đường"
        className="mb-[34px]"
      />
      <div className="dof-tri-grid">
        {FEATURE_CARDS.map((feature) => (
          <EditorialCard key={feature.title} tone="surface" style={{ borderRadius: 20, padding: 28 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 13,
                background: "#EDF7E0",
                color: "var(--app-accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                marginBottom: 20,
              }}
            >
              {feature.icon}
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--app-accent)",
                marginBottom: 8,
              }}
            >
              {feature.tag}
            </div>
            <h3
              className="dof-display"
              style={{ fontSize: 19, fontWeight: 700, margin: "0 0 10px", color: "var(--app-ink)" }}
            >
              {feature.title}
            </h3>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: "var(--app-ink-soft)", margin: 0 }}>{feature.body}</p>
          </EditorialCard>
        ))}
      </div>
    </section>
  );
}

function CtaSection({ onStart, onStartIntent }: Pick<PublicVisitorDeferredSectionsProps, "onStart" | "onStartIntent">) {
  return (
    <section id="cta" className="dof-defer-section" style={{ ...SECTION, padding: "48px 24px 72px", ...scrollAnchor }}>
      <EditorialCard tone="accent" padding="lg" className="!p-14 overflow-hidden" style={{ borderRadius: 28 }}>
        <div
          style={{
            position: "absolute",
            top: -40,
            right: -30,
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "color-mix(in srgb, var(--app-highlight) 16%, transparent)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -60,
            left: "30%",
            width: 160,
            height: 160,
            borderRadius: "50%",
            background: "color-mix(in srgb, var(--app-energy) 14%, transparent)",
          }}
        />
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            flexWrap: "wrap",
            gap: 32,
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ maxWidth: "30ch" }}>
            <Eyebrow tone="muted" style={{ color: "var(--app-highlight)", marginBottom: 14 }}>
              Gửi lời chào tới tương lai
            </Eyebrow>
            <h2
              className="dof-display dof-cta-title"
              style={{ fontWeight: 800, lineHeight: 1, letterSpacing: "-0.03em", margin: "0 0 14px" }}
            >
              Bắt đầu chu kỳ 12 tuần của bạn
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.55, color: "#D6E4CE", margin: 0 }}>
              Dành vài phút thiết lập lộ trình hành động 12 tuần ngay hôm nay.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <PillButton
              variant="highlight"
              size="lg"
              onClick={onStart}
              onFocus={onStartIntent}
              onPointerDown={onStartIntent}
              onPointerEnter={onStartIntent}
              onTouchStart={onStartIntent}
            >
              Thiết lập chu kỳ 12 tuần ngay →
            </PillButton>
            <p
              style={{
                fontSize: 12.5,
                color: "#D6E4CE",
                textAlign: "center",
                margin: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--app-highlight)" }} />
              Nhận ngay việc làm hôm nay để khởi động
            </p>
          </div>
        </div>
      </EditorialCard>
    </section>
  );
}

function FooterSection() {
  return (
    <footer className="dof-defer-section" style={{ borderTop: "1px solid var(--app-line)", padding: "40px 24px" }}>
      <div
        style={{
          ...SECTION,
          display: "flex",
          flexWrap: "wrap",
          gap: 20,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            className="dof-display"
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: "var(--app-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--app-highlight)",
              fontWeight: 800,
              fontSize: 16,
              transform: "rotate(-6deg)",
            }}
          >
            D
          </span>
          <span style={{ fontSize: 13.5, color: "var(--app-ink-soft)", fontWeight: 500, maxWidth: "42ch" }}>
            Một chỗ tĩnh để lập kế hoạch 12 tuần, nhìn lại tuần sống và sống có chủ đích hơn mỗi ngày.
          </span>
        </div>
        <nav
          aria-label="Liên kết pháp lý và hỗ trợ"
          style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "10px 14px" }}
        >
          {FOOTER_TRUST_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              style={{ fontSize: 12.5, color: "var(--app-ink-soft)", fontWeight: 600, textDecoration: "none" }}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
          <a
            href="https://www.tiktok.com/@dofexe201"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="TikTok"
            className="dof-social-link"
          >
            <span className="sr-only">TikTok</span>
            <TikTokIcon size={18} />
          </a>
          <a
            href="https://www.instagram.com/dearourfuture"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="dof-social-link"
          >
            <span className="sr-only">Instagram</span>
            <InstagramIcon size={18} />
          </a>
          <a
            href="https://www.facebook.com/profile.php?id=61589773962146"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="dof-social-link"
          >
            <span className="sr-only">Facebook</span>
            <FacebookIcon size={18} />
          </a>
          <span style={{ fontSize: 12.5, color: "var(--app-ink-soft)" }}>
            © 2026 Dear Our Future · local-first 12-Week Year
          </span>
        </div>
      </div>
    </footer>
  );
}

export function PublicVisitorDeferredSections({ onStart, onStartIntent, onReady }: PublicVisitorDeferredSectionsProps) {
  useEffect(() => {
    onReady?.();
  }, [onReady]);

  return (
    <>
      <GoalPreviewSection />
      <BeforeAfterSection />
      <RoadmapSection />
      <WhySection />
      <CtaSection onStart={onStart} onStartIntent={onStartIntent} />
    </>
  );
}

export function PublicVisitorDeferredFooter() {
  return <FooterSection />;
}
