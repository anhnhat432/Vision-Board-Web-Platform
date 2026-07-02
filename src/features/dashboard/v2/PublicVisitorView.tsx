import { lazy, Suspense, type CSSProperties, useCallback, useEffect, useRef, useState } from "react";

import { EditorialCard, Eyebrow, HighlightMark, PillButton } from "@/app/components/ui/editorial";
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

const MindfulPlayer = lazy(async () => {
  const module = await loadWithChunkReload(() => import("@/app/components/ui/mindful-player"));
  return { default: module.MindfulPlayer };
});

const BACKGROUND_DEFERRED_LOAD_MS = 8_400;
const DEFERRED_SECTION_ROOT_MARGIN = "96px 0px";
const LANDING_WIDGET_DEFER_MS = 14_000;
const LANDING_MASCOT_DEFER_MS = 16_000;

interface NavigatorWithConnection extends Navigator {
  connection?: {
    effectiveType?: string;
    saveData?: boolean;
  };
}

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

function shouldAvoidBackgroundHydration(): boolean {
  if (typeof window === "undefined") return true;

  const connection = (window.navigator as NavigatorWithConnection).connection;
  if (connection?.saveData) return true;
  if (connection?.effectiveType === "slow-2g" || connection?.effectiveType === "2g") return true;

  return window.navigator.hardwareConcurrency <= 4;
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
    const sentinel = sentinelRef.current;
    const canObserveSentinel = Boolean(sentinel && "IntersectionObserver" in window);
    const shouldAutoHydrate = !canObserveSentinel && !shouldAvoidBackgroundHydration();
    const timerId = shouldAutoHydrate ? window.setTimeout(loadWhenIdle, BACKGROUND_DEFERRED_LOAD_MS) : null;

    if (sentinel && canObserveSentinel) {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting) return;
          loadDeferredSections();
          observer?.disconnect();
        },
        { rootMargin: DEFERRED_SECTION_ROOT_MARGIN },
      );
      observer.observe(sentinel);
    }

    return () => {
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
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

function MindfulPlayerFallback({ onWarmLoad }: { onWarmLoad?: () => void }) {
  return (
    <span
      aria-hidden="true"
      className="h-9 w-9 shrink-0 rounded-full border border-app-line bg-app-surface"
      onPointerDown={onWarmLoad}
      onPointerEnter={onWarmLoad}
      onTouchStart={onWarmLoad}
    />
  );
}

function LandingMindfulPlayerSlot() {
  const [shouldLoad, setShouldLoad] = useState(false);
  const warmLoad = useCallback(() => setShouldLoad(true), []);

  useEffect(() => {
    if (shouldLoad || shouldAvoidBackgroundHydration()) return undefined;

    let idleHandle: number | null = null;
    const timerId = window.setTimeout(() => {
      if ("requestIdleCallback" in window) {
        idleHandle = window.requestIdleCallback(warmLoad, { timeout: 1_800 });
        return;
      }

      warmLoad();
    }, LANDING_WIDGET_DEFER_MS);

    return () => {
      window.clearTimeout(timerId);
      if (idleHandle !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleHandle);
      }
    };
  }, [shouldLoad, warmLoad]);

  if (!shouldLoad) {
    return <MindfulPlayerFallback onWarmLoad={warmLoad} />;
  }

  return (
    <Suspense fallback={<MindfulPlayerFallback />}>
      <MindfulPlayer />
    </Suspense>
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
          background: "color-mix(in srgb, var(--app-bg) 92%, var(--app-surface))",
          borderBottom: "1px solid var(--app-line)",
          backdropFilter: "saturate(110%) blur(10px)",
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
                color: "var(--app-bg)",
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
                <LandingMindfulPlayerSlot />
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
        <section className="dof-hero-section" style={{ ...SECTION }}>
          <div
            className="dof-up dof-hero-kicker"
            style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22, flexWrap: "wrap" }}
          >
            <span
              className="dof-kicker-pill"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                background: "var(--app-accent-soft)",
                border: "1px solid color-mix(in srgb, var(--app-accent) 22%, transparent)",
                color: "var(--app-accent)",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                padding: "7px 14px",
                borderRadius: "var(--app-radius-control)",
              }}
            >
              <span aria-hidden="true" className="dof-kicker-dot" />
              Dear Our Future
            </span>
            <span style={{ fontSize: 13, color: "var(--app-ink-soft)", fontWeight: 500 }}>
              Dành cho người trẻ có hoài bão nhưng dễ mất đà.
            </span>
          </div>

          <div className="dof-hero-grid">
            <div className="dof-up" style={{ animationDelay: ".06s" }}>
              <h1
                className="dof-display dof-hero-title"
                style={{ fontWeight: 760, lineHeight: 1.02, letterSpacing: "-0.02em", margin: "0 0 24px" }}
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
              <div className="dof-hero-actions">
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
                  className="dof-hero-secondary-cta"
                  onClick={() => handleDeferredScroll("how")}
                  onFocus={loadDeferredSections}
                  onPointerEnter={loadDeferredSections}
                >
                  Xem lộ trình
                </PillButton>
              </div>
              <p
                className="dof-hero-note"
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
                  deferMs={LANDING_MASCOT_DEFER_MS}
                />
              </div>
              <div
                className="dof-float"
                style={{
                  ["--r" as string]: "-1.2deg",
                  position: "relative",
                  background: "var(--app-surface)",
                  transform: "rotate(-1.2deg)",
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
                    background: "color-mix(in srgb, var(--app-highlight) 52%, transparent)",
                    border: "1px dashed color-mix(in srgb, var(--app-accent) 30%, transparent)",
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
                    style={{
                      width: "100%",
                      height: 300,
                      objectFit: "cover",
                      borderRadius: 6,
                      display: "block",
                      outline: "1px solid color-mix(in srgb, var(--app-line) 80%, transparent)",
                      outlineOffset: -1,
                    }}
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
                  background: "var(--app-surface)",
                  color: "var(--app-accent)",
                  border: "1px solid color-mix(in srgb, var(--app-accent) 24%, transparent)",
                  padding: "12px 16px",
                  borderRadius: "var(--app-radius-card)",
                  transform: "rotate(-3deg)",
                  boxShadow: "var(--app-shadow-md)",
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
          <EditorialCard tone="surface" className="dof-up dof-journey-card" style={{ animationDelay: ".2s" }}>
            <Eyebrow tone="accent" style={{ marginBottom: 18 }}>
              Hành trình 4 bước gặt hái kết quả
            </Eyebrow>
            <div className="dof-journey-grid">
              {JOURNEY_STEPS.map((step) => (
                <div key={step.n} className={`dof-journey-step ${step.active ? "is-active" : ""}`}>
                  <div
                    className="dof-display dof-journey-step-title"
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
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
                  <div className="dof-journey-caption">{step.caption}</div>
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
                borderRadius: "var(--app-radius-card)",
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
  borderRadius: "var(--app-radius-control)",
};
