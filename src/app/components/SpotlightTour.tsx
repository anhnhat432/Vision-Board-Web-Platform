import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { CSSProperties, KeyboardEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";

export interface SpotlightTourStep {
  id: string;
  targetId: string;
  title: string;
  description: string;
}

interface SpotlightTourProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  steps: SpotlightTourStep[];
}

interface TargetRect {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}

interface TargetRectState {
  targetRect: TargetRect | null;
  targetOffscreen: boolean;
}

const SPOTLIGHT_PADDING = 8;
const TOOLTIP_WIDTH = 414;
const TOOLTIP_GAP = 18;
const TOOLTIP_ESTIMATED_HEIGHT = 230;

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

function escapeSelectorValue(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }

  return value.replace(/["\\]/g, "\\$&");
}

function getTourTarget(targetId: string): HTMLElement | null {
  const byId = document.getElementById(targetId);
  if (byId instanceof HTMLElement) return byId;

  return document.querySelector<HTMLElement>(`[data-tour-id="${escapeSelectorValue(targetId)}"]`);
}

function hasRenderableTourTarget(targetId: string): boolean {
  if (typeof document === "undefined") return false;

  const target = getTourTarget(targetId);
  if (!target) return false;

  const rect = target.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}

function getViewportSize() {
  if (typeof window === "undefined") {
    return {
      height: 768,
      width: 1024,
    };
  }

  return {
    height: window.innerHeight,
    width: window.innerWidth,
  };
}

function isRectOutsideViewport(rect: DOMRect, viewport: ReturnType<typeof getViewportSize>): boolean {
  return rect.bottom <= 0 || rect.top >= viewport.height || rect.right <= 0 || rect.left >= viewport.width;
}

function getPaddedRect(rect: TargetRect): TargetRect {
  const viewport = getViewportSize();
  const top = clamp(rect.top - SPOTLIGHT_PADDING, 8, viewport.height);
  const left = clamp(rect.left - SPOTLIGHT_PADDING, 8, viewport.width);
  const right = clamp(rect.right + SPOTLIGHT_PADDING, 0, viewport.width - 8);
  const bottom = clamp(rect.bottom + SPOTLIGHT_PADDING, 0, viewport.height - 8);

  return {
    top,
    right,
    bottom,
    left,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top),
  };
}

function boundTooltipToViewport(
  style: CSSProperties,
  viewport: ReturnType<typeof getViewportSize>,
  viewportGutter: number,
): CSSProperties {
  const top = typeof style.top === "number" ? style.top : viewportGutter;
  const maxHeight = Math.max(180, viewport.height - top - viewportGutter);

  return {
    ...style,
    maxHeight,
  };
}

function getTooltipStyle(targetRect: TargetRect | null): CSSProperties {
  const viewport = getViewportSize();
  const viewportGutter = 16;
  const width = Math.min(TOOLTIP_WIDTH, viewport.width - viewportGutter * 2);

  if (!targetRect || viewport.width < 720) {
    const top = targetRect
      ? clamp(targetRect.bottom + TOOLTIP_GAP, viewportGutter, viewport.height - TOOLTIP_ESTIMATED_HEIGHT)
      : clamp(viewport.height * 0.22, viewportGutter, viewport.height - TOOLTIP_ESTIMATED_HEIGHT);

    return boundTooltipToViewport(
      {
        left: viewportGutter,
        maxWidth: width,
        top,
        width,
      },
      viewport,
      viewportGutter,
    );
  }

  const centeredLeft = clamp(
    targetRect.left + targetRect.width / 2 - width / 2,
    viewportGutter,
    viewport.width - width - viewportGutter,
  );
  const centerAlignedTop = clamp(
    targetRect.top + targetRect.height / 2 - TOOLTIP_ESTIMATED_HEIGHT / 2,
    viewportGutter,
    viewport.height - TOOLTIP_ESTIMATED_HEIGHT - viewportGutter,
  );

  if (viewport.width - targetRect.right >= width + TOOLTIP_GAP + viewportGutter) {
    return boundTooltipToViewport(
      {
        left: targetRect.right + TOOLTIP_GAP,
        maxWidth: width,
        top: centerAlignedTop,
        width,
      },
      viewport,
      viewportGutter,
    );
  }

  if (targetRect.left >= width + TOOLTIP_GAP + viewportGutter) {
    return boundTooltipToViewport(
      {
        left: targetRect.left - width - TOOLTIP_GAP,
        maxWidth: width,
        top: centerAlignedTop,
        width,
      },
      viewport,
      viewportGutter,
    );
  }

  if (viewport.height - targetRect.bottom >= TOOLTIP_ESTIMATED_HEIGHT + TOOLTIP_GAP + viewportGutter) {
    return boundTooltipToViewport(
      {
        left: centeredLeft,
        maxWidth: width,
        top: targetRect.bottom + TOOLTIP_GAP,
        width,
      },
      viewport,
      viewportGutter,
    );
  }

  return boundTooltipToViewport(
    {
      left: centeredLeft,
      maxWidth: width,
      top: clamp(targetRect.top - TOOLTIP_ESTIMATED_HEIGHT - TOOLTIP_GAP, viewportGutter, viewport.height),
      width,
    },
    viewport,
    viewportGutter,
  );
}

function useTargetRect(open: boolean, targetId: string | undefined) {
  const [targetState, setTargetState] = useState<TargetRectState>({
    targetRect: null,
    targetOffscreen: false,
  });

  useEffect(() => {
    if (!open || !targetId) {
      setTargetState({ targetRect: null, targetOffscreen: false });
      return undefined;
    }

    const updateTargetRect = () => {
      const target = getTourTarget(targetId);
      if (!target) {
        setTargetState({ targetRect: null, targetOffscreen: false });
        return;
      }

      const rect = target.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        setTargetState({ targetRect: null, targetOffscreen: false });
        return;
      }

      const viewport = getViewportSize();
      if (isRectOutsideViewport(rect, viewport)) {
        setTargetState({ targetRect: null, targetOffscreen: true });
        return;
      }

      setTargetState({
        targetOffscreen: false,
        targetRect: {
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        },
      });
    };

    updateTargetRect();
    const settleTimer = window.setTimeout(updateTargetRect, 360);

    window.addEventListener("resize", updateTargetRect);
    window.addEventListener("scroll", updateTargetRect, true);

    return () => {
      window.clearTimeout(settleTimer);
      window.removeEventListener("resize", updateTargetRect);
      window.removeEventListener("scroll", updateTargetRect, true);
    };
  }, [open, targetId]);

  return {
    targetOffscreen: targetState.targetOffscreen,
    targetRect: targetState.targetRect ? getPaddedRect(targetState.targetRect) : null,
  };
}

export function SpotlightTour({ open, onOpenChange, title, description, steps }: SpotlightTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetMissing, setTargetMissing] = useState(false);
  const primaryActionRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (open) {
      setCurrentStep(0);
      setTargetMissing(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || currentStep < steps.length) return;
    setCurrentStep(0);
  }, [currentStep, open, steps.length]);

  const step = steps[currentStep];
  const { targetOffscreen, targetRect } = useTargetRect(open, step?.targetId);
  const tooltipStyle = useMemo(() => getTooltipStyle(targetRect), [targetRect]);
  const totalSteps = steps.length;
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep >= totalSteps - 1;

  const closeTour = useCallback(() => onOpenChange(false), [onOpenChange]);

  useEffect(() => {
    if (!open || !step || typeof document === "undefined") {
      setTargetMissing(false);
      return undefined;
    }

    setTargetMissing(false);

    const settleTimer = window.setTimeout(() => {
      if (hasRenderableTourTarget(step.targetId)) {
        setTargetMissing(false);
        return;
      }

      const nextAvailableStepIndex = steps.findIndex(
        (candidate, index) => index > currentStep && hasRenderableTourTarget(candidate.targetId),
      );

      if (nextAvailableStepIndex >= 0) {
        setTargetMissing(false);
        setCurrentStep(nextAvailableStepIndex);
        return;
      }

      setTargetMissing(true);
    }, 650);

    return () => window.clearTimeout(settleTimer);
  }, [currentStep, open, step, steps]);

  const handleNext = useCallback(() => {
    if (!isLastStep) {
      setCurrentStep((prev) => prev + 1);
      return;
    }

    closeTour();
  }, [closeTour, isLastStep]);

  const handlePrev = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const handleScrollToTarget = useCallback(() => {
    if (!step?.targetId) return;

    const target = getTourTarget(step.targetId);
    if (!target) return;

    target.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "center",
      inline: "nearest",
    });

    const refreshDelay = prefersReducedMotion() ? 80 : 420;
    window.setTimeout(() => window.dispatchEvent(new Event("scroll")), refreshDelay);
  }, [step?.targetId]);

  const handleTourKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Escape") {
        closeTour();
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        handleNext();
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        handlePrev();
      }
    },
    [closeTour, handleNext, handlePrev],
  );

  if (!open || !step || typeof document === "undefined") return null;

  const overlayPanels: Array<{ key: string; style: CSSProperties }> = targetRect
    ? [
        { key: "top", style: { height: targetRect.top, left: 0, top: 0, width: "100%" } },
        {
          key: "left",
          style: { height: targetRect.height, left: 0, top: targetRect.top, width: targetRect.left },
        },
        {
          key: "right",
          style: {
            height: targetRect.height,
            left: targetRect.right,
            right: 0,
            top: targetRect.top,
          },
        },
        {
          key: "bottom",
          style: { bottom: 0, left: 0, top: targetRect.bottom, width: "100%" },
        },
      ]
    : [{ key: "full", style: { inset: 0 } }];

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} modal>
      <DialogPrimitive.Portal>
        <div className="fixed inset-0 z-[80]" aria-live="polite">
          {overlayPanels.map((panel) => (
            <div
              key={panel.key}
              aria-hidden="true"
              className="fixed bg-app-ink/8 backdrop-blur-[1px] dark:bg-black/24"
              style={panel.style}
            />
          ))}

          {targetRect ? (
            <div
              aria-hidden="true"
              className="pointer-events-none fixed rounded-[18px] border border-app-line/85 bg-app-surface/8 shadow-[0_0_0_9999px_rgba(15,23,42,0.03),0_0_0_2px_rgba(91,165,144,0.06),0_12px_32px_rgba(15,23,42,0.10)] dark:border-app-line/70 dark:bg-white/4 dark:shadow-[0_0_0_9999px_rgba(0,0,0,0.14),0_0_0_2px_rgba(91,165,144,0.08),0_12px_32px_rgba(0,0,0,0.22)]"
              style={{
                height: targetRect.height,
                left: targetRect.left,
                top: targetRect.top,
                width: targetRect.width,
              }}
            />
          ) : null}

          <DialogPrimitive.Content
            aria-describedby={`spotlight-tour-description-${step.id}`}
            aria-labelledby={`spotlight-tour-title-${step.id}`}
            className="fixed max-h-[calc(100vh-2rem)] overflow-y-auto rounded-[22px] border border-app-line bg-app-surface/95 text-app-ink shadow-app-lg ring-1 ring-app-line/70 backdrop-blur-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/30"
            onEscapeKeyDown={(event) => {
              event.preventDefault();
              closeTour();
            }}
            onInteractOutside={(event) => event.preventDefault()}
            onKeyDown={handleTourKeyDown}
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              primaryActionRef.current?.focus();
            }}
            style={tooltipStyle}
          >
            <div className="flex items-start gap-4 border-b border-app-line bg-gradient-to-br from-app-accent-subtle/55 via-app-surface to-app-bg-subtle/80 px-4 py-4 sm:px-5">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-accent">{title}</p>
                {isFirstStep ? <p className="mt-1 text-xs leading-5 text-app-ink-muted">{description}</p> : null}
                <DialogPrimitive.Title asChild>
                  <h2
                    id={`spotlight-tour-title-${step.id}`}
                    className="mt-2 font-serif text-lg font-semibold leading-6 text-app-ink"
                  >
                    {step.title}
                  </h2>
                </DialogPrimitive.Title>
                <DialogPrimitive.Description asChild>
                  <p id={`spotlight-tour-description-${step.id}`} className="mt-3 text-sm leading-6 text-app-ink-soft">
                    {step.description}
                  </p>
                </DialogPrimitive.Description>
              </div>
              <DialogPrimitive.Close asChild>
                <button
                  type="button"
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-app-line bg-app-surface/80 text-base font-semibold text-app-ink-muted transition hover:bg-app-bg hover:text-app-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/35"
                  aria-label="Đóng hướng dẫn"
                >
                  ×
                </button>
              </DialogPrimitive.Close>
            </div>

            {targetRect ? (
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-app-line bg-app-bg/45 px-4 py-3 text-xs leading-5 text-app-ink-soft sm:px-5">
                <span>
                  Đang làm nổi bật: <span className="font-semibold text-app-ink">{step.title}</span>
                </span>
                <button
                  type="button"
                  onClick={handleScrollToTarget}
                  className="rounded-full border border-app-line bg-app-surface px-3 py-1 text-xs font-semibold text-app-accent transition hover:border-app-accent/20 hover:bg-app-accent-subtle/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/20"
                >
                  Đưa tôi đến đây
                </button>
              </div>
            ) : targetOffscreen ? (
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-app-line bg-app-bg-subtle px-4 py-3 text-xs leading-5 text-app-ink-soft sm:px-5">
                <span>
                  Khu vực này nằm ở phần khác của trang. Mình sẽ không tự kéo màn hình để tránh làm bạn bị lệch nhịp.
                </span>
                <button
                  type="button"
                  onClick={handleScrollToTarget}
                  className="rounded-full border border-app-line bg-app-surface px-3 py-1 text-xs font-semibold text-app-accent transition hover:border-app-accent/20 hover:bg-app-accent-subtle/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-accent/20"
                >
                  Đưa tôi tới khu vực này
                </button>
              </div>
            ) : targetMissing ? (
              <div className="border-b border-app-line bg-app-bg-subtle px-4 py-3 text-xs leading-5 text-app-ink-soft sm:px-5">
                Khu vực này hiện chưa xuất hiện trên màn hình của bạn. Hãy bấm{" "}
                <span className="font-semibold text-app-ink">Tiếp tục</span> để xem điểm hướng dẫn kế tiếp.
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
              <span className="text-xs font-medium text-app-ink-muted">
                {currentStep + 1} / {totalSteps}
              </span>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={closeTour}
                  className="border-app-line bg-app-surface text-app-ink-soft hover:bg-app-bg hover:text-app-ink"
                >
                  Bỏ qua hướng dẫn
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePrev}
                  disabled={isFirstStep}
                  className={cn(
                    "border-app-line bg-app-surface text-app-ink-soft hover:bg-app-bg hover:text-app-ink",
                    isFirstStep && "cursor-not-allowed opacity-45",
                  )}
                >
                  Quay lại
                </Button>
                <Button
                  ref={primaryActionRef}
                  type="button"
                  size="sm"
                  onClick={handleNext}
                  className="bg-app-accent text-white shadow-app-sm hover:bg-app-accent-hover"
                >
                  {isLastStep ? "Hoàn tất" : "Tiếp tục"}
                </Button>
              </div>
            </div>
          </DialogPrimitive.Content>
        </div>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
