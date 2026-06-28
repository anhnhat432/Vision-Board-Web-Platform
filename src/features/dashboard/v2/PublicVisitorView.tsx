import { lazy, Suspense, type CSSProperties, useCallback, useEffect, useRef, useState } from "react";

import { EditorialCard, Eyebrow, HighlightMark, PillButton } from "@/app/components/ui/editorial";
import { LazyMindfulPlayer } from "@/app/components/ui/lazy-mindful-player";
import { LazyMamCompanion } from "@/app/features/pet/LazyMamCompanion";
import { loadWithChunkReload } from "@/app/utils/chunkLoad";

import "./PublicVisitorView.css";

const PublicVisitorDeferredSections = lazy(async () => {
  const module = await loadWithChunkReload(() => import("./PublicVisitorDeferredSections"));
  return { default: module.PublicVisitorDeferredSections };
});

const PublicVisitorDeferredFooter = lazy(async () => {
  const module = await loadWithChunkReload(() => import("./PublicVisitorDeferredSections"));
  return { default: module.PublicVisitorDeferredFooter };
});

interface PublicVisitorViewProps {
  isDemo: boolean;
  hasLocalData: boolean;
  onStart: () => void;
  onStartIntent?: () => void;
  onAuthIntent?: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
}

const JOURNEY_STEPS = [
  { n: "1", title: "Tầm nhìn", caption: "Bảng ước mơ trực quan", active: false },
  { n: "2", title: "Mục tiêu", caption: "Chuẩn SMART đo được", active: false },
  { n: "3", title: "Kế hoạch", caption: "Lộ trình 12 tuần", active: false },
  { n: "4", title: "Hành động", caption: "Việc Today mỗi sáng", active: true },
] as const;

const SECTION: CSSProperties = { maxWidth: 1200, margin: "0 auto" };

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "auto", block: "start" });
}

function useLandingDeferredSections() {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [shouldLoadDeferredSections, setShouldLoadDeferredSections] = useState(false);
  const loadDeferredSections = useCallback(() => setShouldLoadDeferredSections(true), []);

  useEffect(() => {
    if (shouldLoadDeferredSections || typeof window === "undefined") return undefined;

    let idleHandle: number | null = null;
    let observer: IntersectionObserver | null = null;
    const loadWhenIdle = () => {
      if ("requestIdleCallback" in window) {
        idleHandle = window.requestIdleCallback(loadDeferredSections, { timeout: 2_800 });
        return;
      }

      loadDeferredSections();
    };
    const timerId = window.setTimeout(loadWhenIdle, 1_200);
    const sentinel = sentinelRef.current;

    if (sentinel && "IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting) return;
          loadDeferredSections();
          observer?.disconnect();
        },
        { rootMargin: "900px 0px" },
      );
      observer.observe(sentinel);
    }

    return () => {
      window.clearTimeout(timerId);
      observer?.disconnect();
      if (idleHandle !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleHandle);
      }
    };
  }, [loadDeferredSections, shouldLoadDeferredSections]);

  return { sentinelRef, shouldLoadDeferredSections, loadDeferredSections };
}

function DeferredSectionsFallback() {
  return (
    <div className="dof-deferred-fallback" style={{ ...SECTION, padding: "40px 24px 72px" }} aria-hidden="true">
      <div />
      <div />
      <div />
    </div>
  );
}

export function PublicVisitorView({
  isDemo: _isDemo,
  hasLocalData,
  onStart,
  onStartIntent,
  onAuthIntent,
  onSignIn,
  onSignUp,
}: PublicVisitorViewProps) {
  const { sentinelRef, shouldLoadDeferredSections, loadDeferredSections } = useLandingDeferredSections();
  const [pendingScrollId, setPendingScrollId] = useState<string | null>(null);
  const handleDeferredScroll = useCallback(
    (id: "how" | "why") => {
      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView({ behavior: "auto", block: "start" });
        return;
      }

      setPendingScrollId(id);
      loadDeferredSections();
    },
    [loadDeferredSections],
  );
  const handleDeferredSectionsReady = useCallback(() => {
    if (!pendingScrollId || typeof window === "undefined") return;

    window.requestAnimationFrame(() => {
      scrollToId(pendingScrollId);
      setPendingScrollId(null);
    });
  }, [pendingScrollId]);

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
          className="dof-topbar"
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
            className="dof-brand"
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
            <span
              className="dof-display dof-brand-name"
              style={{ fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em" }}
            >
              Dear Our Future
            </span>
          </button>
          <nav className="dof-nav" style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <span className="dof-nav-anchors" style={{ display: "flex", alignItems: "center", gap: 22 }}>
              <button
                type="button"
                onClick={() => handleDeferredScroll("how")}
                onFocus={loadDeferredSections}
                onPointerEnter={loadDeferredSections}
                style={navLinkStyle}
                className="dof-navlink"
              >
                Cách hoạt động
              </button>
              <button
                type="button"
                onClick={() => handleDeferredScroll("why")}
                onFocus={loadDeferredSections}
                onPointerEnter={loadDeferredSections}
                style={navLinkStyle}
                className="dof-navlink"
              >
                Vì sao
              </button>
            </span>
            <span className="dof-nav-actions" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {/* Âm thanh tập trung — tính năng sẵn có của app, giữ trên landing */}
              <span className="dof-mindful-slot">
                <LazyMindfulPlayer />
              </span>
              <button
                type="button"
                onClick={onSignIn}
                onFocus={onAuthIntent}
                onPointerDown={onAuthIntent}
                onPointerEnter={onAuthIntent}
                onTouchStart={onAuthIntent}
                style={navLinkStyle}
                className="dof-navlink"
              >
                Đăng nhập
              </button>
              <button
                type="button"
                className="dof-signup-pill"
                onClick={onSignUp}
                onFocus={onAuthIntent}
                onPointerDown={onAuthIntent}
                onPointerEnter={onAuthIntent}
                onTouchStart={onAuthIntent}
                style={signupPillStyle}
              >
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
                thành <HighlightMark>kế hoạch</HighlightMark>
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
                <PillButton
                  size="lg"
                  onClick={onStart}
                  onFocus={onStartIntent}
                  onPointerDown={onStartIntent}
                  onPointerEnter={onStartIntent}
                  onTouchStart={onStartIntent}
                >
                  Thiết lập chu kỳ 12 tuần ngay →
                </PillButton>
                <PillButton
                  variant="outline"
                  size="lg"
                  onClick={() => handleDeferredScroll("how")}
                  onFocus={loadDeferredSections}
                  onPointerEnter={loadDeferredSections}
                >
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
          <EditorialCard tone="ink" className="dof-up mt-[52px]" style={{ animationDelay: ".2s" }}>
            <Eyebrow tone="muted" style={{ color: "var(--app-highlight)", marginBottom: 18 }}>
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
                        background: step.active
                          ? "var(--app-highlight)"
                          : "color-mix(in srgb, var(--app-highlight) 18%, transparent)",
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
                  aria-hidden="true"
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
                    fontSize: 17,
                    fontWeight: 800,
                  }}
                >
                  D
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

        <div ref={sentinelRef} className="dof-deferred-sentinel" aria-hidden="true" />
        {shouldLoadDeferredSections ? (
          <Suspense fallback={<DeferredSectionsFallback />}>
            <PublicVisitorDeferredSections
              onStart={onStart}
              onStartIntent={onStartIntent}
              onReady={handleDeferredSectionsReady}
            />
          </Suspense>
        ) : null}
      </main>
      {shouldLoadDeferredSections ? (
        <Suspense fallback={null}>
          <PublicVisitorDeferredFooter />
        </Suspense>
      ) : null}
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
