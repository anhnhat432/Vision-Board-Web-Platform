import { Facebook, HardDrive, Instagram, LogIn } from "lucide-react";
import { type CSSProperties, useState } from "react";

import {
  EditorialCard,
  Eyebrow,
  HighlightMark,
  PillButton,
  SectionHeader,
  StatBadge,
} from "@/app/components/ui/editorial";
import { LazyMindfulPlayer } from "@/app/components/ui/lazy-mindful-player";
import { LazyMamCompanion } from "@/app/features/pet/LazyMamCompanion";

import "./PublicVisitorView.css";

interface PublicVisitorViewProps {
  isDemo: boolean;
  hasLocalData: boolean;
  onStart: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
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

const JOURNEY_STEPS = [
  { n: "1", title: "Tầm nhìn", caption: "Bảng ước mơ trực quan", active: false },
  { n: "2", title: "Mục tiêu", caption: "Chuẩn SMART đo được", active: false },
  { n: "3", title: "Kế hoạch", caption: "Lộ trình 12 tuần", active: false },
  { n: "4", title: "Hành động", caption: "Việc Today mỗi sáng", active: true },
] as const;

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

const SECTION: CSSProperties = { maxWidth: 1200, margin: "0 auto" };
const scrollAnchor: CSSProperties = { scrollMarginTop: 84 };

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "auto", block: "start" });
}

export function PublicVisitorView({
  isDemo: _isDemo,
  hasLocalData,
  onStart,
  onSignIn,
  onSignUp,
}: PublicVisitorViewProps) {
  const [selectedId, setSelectedId] = useState(GOAL_PREVIEWS[0].id);
  const goal = GOAL_PREVIEWS.find((g) => g.id === selectedId) ?? GOAL_PREVIEWS[0];

  const handleSelect = (id: string) => {
    setSelectedId(id);
    void import("@/app/utils/analytics").then(({ trackAnalyticsEvent }) => {
      trackAnalyticsEvent("landing_goal_preview_selected", { preview_id: id, source: "dashboard" });
    });
  };

  return (
    <div className="dof-landing">
      {/* HEADER */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "var(--app-bg)",
          borderBottom: "1px solid var(--app-line)",
        }}
      >
        <div
          style={{
            ...SECTION,
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 16,
          }}
        >
          <button
            type="button"
            onClick={() => scrollToId("top")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              padding: 0,
              color: "var(--app-ink)",
            }}
            aria-label="Về đầu trang Dear Our Future"
          >
            <span
              className="dof-display"
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                background: "var(--app-accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--app-highlight)",
                fontWeight: 800,
                fontSize: 18,
                transform: "rotate(-6deg)",
              }}
            >
              D
            </span>
            <span className="dof-display" style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em" }}>
              Dear Our Future
            </span>
          </button>
          <nav style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <span className="dof-nav-anchors" style={{ display: "flex", alignItems: "center", gap: 22 }}>
              <button type="button" onClick={() => scrollToId("how")} style={navLinkStyle} className="dof-navlink">
                Cách hoạt động
              </button>
              <button type="button" onClick={() => scrollToId("why")} style={navLinkStyle} className="dof-navlink">
                Vì sao
              </button>
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* Âm thanh tập trung — tính năng sẵn có của app, giữ trên landing */}
              <LazyMindfulPlayer />
              <button type="button" onClick={onSignIn} style={navLinkStyle} className="dof-navlink">
                Đăng nhập
              </button>
              <button type="button" onClick={onSignUp} style={signupPillStyle}>
                Đăng ký
              </button>
            </span>
          </nav>
        </div>
      </header>

      <span id="top" />

      <main>
        {/* HERO */}
        <section style={{ ...SECTION, padding: "56px 24px 40px" }}>
          <div
            className="dof-up"
            style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22, flexWrap: "wrap" }}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                background: "var(--app-accent)",
                color: "var(--app-highlight)",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                padding: "7px 14px",
                borderRadius: 999,
              }}
            >
              ★ Dear Our Future
            </span>
            <span style={{ fontSize: 13, color: "var(--app-ink-soft)", fontWeight: 500 }}>
              Dành cho người trẻ có hoài bão nhưng dễ mất đà.
            </span>
          </div>

          <div className="dof-hero-grid">
            <div className="dof-up" style={{ animationDelay: ".06s" }}>
              <h1
                className="dof-display dof-hero-title"
                style={{ fontWeight: 800, lineHeight: 0.98, letterSpacing: "-0.035em", margin: "0 0 24px" }}
              >
                Biến ước mơ
                <br />
                thành{" "}
                <HighlightMark>kế hoạch</HighlightMark>
                <br />
                <span style={{ color: "var(--app-accent)" }}>12 tuần bền bỉ.</span>
              </h1>
              <p
                style={{
                  maxWidth: "48ch",
                  fontSize: 16.5,
                  lineHeight: 1.6,
                  color: "var(--app-ink-soft)",
                  margin: "0 0 30px",
                  fontWeight: 400,
                }}
              >
                Có nhiều mục tiêu nhưng không biết bắt đầu từ đâu, và thường bỏ cuộc sau vài tuần? Dear Our Future biến
                mong muốn mơ hồ thành việc làm cụ thể mỗi ngày — theo lộ trình 12 tuần có cơ sở khoa học.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "center", marginBottom: 26 }}>
                <PillButton size="lg" onClick={onStart}>
                  Thiết lập chu kỳ 12 tuần ngay →
                </PillButton>
                <PillButton variant="outline" size="lg" onClick={() => scrollToId("how")}>
                  Xem lộ trình
                </PillButton>
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--app-ink-soft)",
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  margin: 0,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--app-energy)" }} />
                Thiết lập trong 3 phút — nhận ngay Bánh xe cuộc sống & gợi ý mục tiêu đầu tiên.
              </p>
            </div>

            <div className="dof-up dof-hero-art" style={{ animationDelay: ".14s", position: "relative" }}>
              <div style={{ position: "absolute", top: 16, right: 16, zIndex: 3 }}>
                <LazyMamCompanion
                  initialEvent="welcomeBack"
                  className="dof-landing-mascot"
                  compact
                  animated={false}
                  deferMs={6200}
                />
              </div>
              <div
                className="dof-float"
                style={{
                  ["--r" as string]: "-2.5deg",
                  position: "relative",
                  background: "var(--app-surface)",
                  transform: "rotate(-2.5deg)",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: -13,
                    left: "50%",
                    transform: "translateX(-50%) rotate(3deg)",
                    width: 92,
                    height: 26,
                    background: "color-mix(in srgb, var(--app-highlight) 70%, transparent)",
                    border: "1px dashed color-mix(in srgb, var(--app-accent) 40%, transparent)",
                  }}
                />
                <picture>
                  <source srcSet="/study_desk_hero.webp" type="image/webp" />
                  <img
                    src="/study_desk_hero.png"
                    alt="Góc lập kế hoạch"
                    width={960}
                    height={960}
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                    style={{ width: "100%", height: 300, objectFit: "cover", borderRadius: 3, display: "block" }}
                  />
                </picture>
                <p
                  className="dof-display"
                  style={{ fontSize: 15, fontWeight: 600, color: "var(--app-ink)", margin: "12px 4px 2px" }}
                >
                  "Một góc yên để bắt đầu chu kỳ mới."
                </p>
              </div>
              <div
                style={{
                  position: "absolute",
                  bottom: 34,
                  right: -26,
                  background: "var(--app-energy)",
                  color: "#fff",
                  padding: "12px 16px",
                  borderRadius: 14,
                  transform: "rotate(-7deg)",
                  boxShadow: "0 12px 24px -8px rgba(255,92,62,0.6)",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.9, letterSpacing: "0.04em" }}>TUẦN</div>
                <div className="dof-display" style={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }}>
                  04 / 12
              </div>
              </div>
            </div>
          </div>

          {/* JOURNEY STRIP */}
          <EditorialCard
            tone="ink"
            className="dof-up mt-[52px]"
            style={{ animationDelay: ".2s" }}
          >
            <Eyebrow
              tone="muted"
              style={{ color: "var(--app-highlight)", marginBottom: 18 }}
            >
              Hành trình 4 bước gặt hái kết quả
            </Eyebrow>
            <div className="dof-journey-grid">
              {JOURNEY_STEPS.map((step) => (
                <div key={step.n} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div
                    className="dof-display"
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: step.active ? "var(--app-highlight)" : "#fff",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 7,
                        background: step.active ? "var(--app-highlight)" : "color-mix(in srgb, var(--app-highlight) 18%, transparent)",
                        color: step.active ? "var(--app-ink)" : "var(--app-highlight)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                      }}
                    >
                      {step.n}
                    </span>
                    {step.title}
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--app-ink-muted)" }}>{step.caption}</div>
                </div>
              ))}
            </div>
          </EditorialCard>
        </section>

        {/* LOCAL DATA RESTORE BANNER */}
        {hasLocalData ? (
          <section style={{ ...SECTION, padding: "0 24px 8px" }} aria-labelledby="dof-local-data-title">
            <div
              style={{
                background: "var(--app-surface)",
                border: "1px solid color-mix(in srgb, var(--app-energy) 35%, transparent)",
                borderRadius: 18,
                padding: "20px 22px",
                display: "flex",
                flexWrap: "wrap",
                gap: 16,
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", gap: 14, alignItems: "flex-start", minWidth: 0 }}>
                <span
                  style={{
                    display: "flex",
                    width: 38,
                    height: 38,
                    flexShrink: 0,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 11,
                    background: "color-mix(in srgb, var(--app-energy) 12%, transparent)",
                    color: "var(--app-energy)",
                  }}
                >
                  <HardDrive size={18} />
                </span>
                <div>
                  <h2
                    id="dof-local-data-title"
                    style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "var(--app-ink)" }}
                  >
                    Có dữ liệu đã lưu trên thiết bị này
                  </h2>
                  <p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: 1.5, color: "var(--app-ink-soft)" }}>
                    Đăng nhập để kiểm tra, sao lưu và nhập dữ liệu này vào tài khoản. Chúng tôi không ghi đè dữ liệu tài
                    khoản nếu chưa có xác nhận của bạn.
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={onSignIn}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    border: "none",
                    cursor: "pointer",
                    background: "var(--app-energy)",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                    padding: "11px 18px",
                    borderRadius: 999,
                  }}
                >
                  <LogIn size={16} />
                  Đăng nhập để khôi phục
                </button>
                <button
                  type="button"
                  onClick={onSignUp}
                  style={{
                    border: "1.5px solid color-mix(in srgb, var(--app-energy) 40%, transparent)",
                    cursor: "pointer",
                    background: "var(--app-surface)",
                    color: "var(--app-energy)",
                    fontSize: 13,
                    fontWeight: 600,
                    padding: "11px 18px",
                    borderRadius: 999,
                  }}
                >
                  Tạo tài khoản mới
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {/* INTERACTIVE GOAL PREVIEW */}
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
                    transition: "all .2s",
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
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
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

        {/* BEFORE / AFTER */}
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
                  background: "rgba(23,21,15,0.07)",
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
                    <span style={{ color: "#A8A296", fontWeight: 700 }}>✕</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </EditorialCard>
            <EditorialCard
              tone="accent"
              style={{ boxShadow: "0 24px 50px -28px rgba(12,94,58,0.6)" }}
            >
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
              <h3
                className="dof-display"
                style={{ fontSize: 24, fontWeight: 700, margin: "16px 0 18px", color: "#fff" }}
              >
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

        {/* ROADMAP */}
        <section id="how" className="dof-defer-section" style={{ ...SECTION, padding: "48px 24px", ...scrollAnchor }}>
          <SectionHeader
            eyebrow="Lộ trình của bạn"
            title="Bốn bước chuyển mình rõ nét"
            className="mb-[34px]"
          />
          <div className="dof-quad-grid">
            {ROADMAP_STEPS.map((step) => {
              const dark = step.tone === "dark";
              const amber = step.tone === "amber";
              const cardBg = dark ? "var(--app-ink)" : amber ? "#FFFCE8" : "var(--app-surface)";
              const cardBorder = dark
                ? "none"
                : amber
                  ? "1px solid rgba(214,178,40,0.35)"
                  : "1px solid var(--app-line)";
              const numColor = dark ? "rgba(255,255,255,0.1)" : amber ? "#F0E4A8" : "#EAE5DA";
              const glyphBg = dark ? "var(--app-highlight)" : amber ? "#E7B400" : "var(--app-accent)";
              const glyphColor = dark ? "var(--app-ink)" : amber ? "#fff" : "var(--app-highlight)";
              const eyebrowColor = dark ? "var(--app-highlight)" : amber ? "#9A7B00" : "var(--app-accent)";
              const bodyColor = dark ? "#A8A89C" : amber ? "#6B5E2E" : "var(--app-ink-soft)";
              const footColor = dark ? "var(--app-highlight)" : amber ? "#9A7B00" : "var(--app-accent)";
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
                    style={{
                      fontSize: 18,
                      fontWeight: 700,
                      margin: "0 0 8px",
                      color: dark ? "#fff" : "var(--app-ink)",
                    }}
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

        {/* WHY / FEATURES */}
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
                <p style={{ fontSize: 14, lineHeight: 1.55, color: "var(--app-ink-soft)", margin: 0 }}>
                  {feature.body}
                </p>
              </EditorialCard>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section
          id="cta"
          className="dof-defer-section"
          style={{ ...SECTION, padding: "48px 24px 72px", ...scrollAnchor }}
        >
          <EditorialCard
            tone="accent"
            padding="lg"
            className="!p-14 overflow-hidden"
            style={{ borderRadius: 28 }}
          >
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
                <PillButton variant="highlight" size="lg" onClick={onStart}>
                  Thiết lập chu kỳ 12 tuần ngay →
                </PillButton>
                <p
                  style={{
                    fontSize: 12.5,
                    color: "#9CB89A",
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
      </main>

      {/* FOOTER */}
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
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <a
              href="https://www.tiktok.com/@dofexe201"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="TikTok"
              style={{ color: "#A8A296", display: "flex", transition: "color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--app-accent)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#A8A296")}
            >
              <span className="sr-only">TikTok</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M19.5 6.5a5 5 0 0 1-3.5-1.5V15a5 5 0 1 1-5-5v3a2 2 0 1 0 2 2V2h3a5 5 0 0 0 3.5 3.5z" />
              </svg>
            </a>
            <a
              href="https://www.instagram.com/dearourfuture"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              style={{ color: "#A8A296", display: "flex", transition: "color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--app-accent)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#A8A296")}
            >
              <span className="sr-only">Instagram</span>
              <Instagram size={18} />
            </a>
            <a
              href="https://www.facebook.com/profile.php?id=61589773962146"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              style={{ color: "#A8A296", display: "flex", transition: "color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--app-accent)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#A8A296")}
            >
              <span className="sr-only">Facebook</span>
              <Facebook size={18} />
            </a>
            <span style={{ fontSize: 12.5, color: "#A8A296" }}>© 2026 Dear Our Future · local-first 12-Week Year</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

const navLinkStyle: CSSProperties = {
  border: "none",
  background: "transparent",
  cursor: "pointer",
  padding: 0,
  color: "var(--app-ink-soft)",
  fontSize: 13.5,
  fontWeight: 500,
};

const signupPillStyle: CSSProperties = {
  border: "none",
  cursor: "pointer",
  background: "var(--app-accent)",
  color: "#fff",
  fontSize: 13,
  fontWeight: 600,
  padding: "10px 18px",
  borderRadius: 999,
};

