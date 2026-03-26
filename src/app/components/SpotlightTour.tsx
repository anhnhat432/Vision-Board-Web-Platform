import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Compass, X } from "lucide-react";

import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

export interface SpotlightTourStep {
  id: string;
  title: string;
  description: string;
  targetId?: string;
}

interface SpotlightTourProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  steps: SpotlightTourStep[];
  onStepChange?: (step: SpotlightTourStep, index: number) => void;
}

interface HighlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface PanelPosition {
  mode: "centered" | "desktop";
  top?: number;
  left?: number;
  width: number;
}

function getHighlightRect(targetId?: string): HighlightRect | null {
  if (!targetId || typeof window === "undefined") return null;

  const element = document.querySelector<HTMLElement>(`[data-tour-id="${targetId}"]`);
  if (!element) return null;

  const rect = element.getBoundingClientRect();
  const padding = 12;

  return {
    top: Math.max(rect.top - padding, 16),
    left: Math.max(rect.left - padding, 16),
    width: Math.max(rect.width + padding * 2, 0),
    height: Math.max(rect.height + padding * 2, 0),
  };
}

function getPanelPosition(
  highlightRect: HighlightRect | null,
  viewportWidth: number,
  viewportHeight: number,
): PanelPosition {
  const safeMargin = 24;
  const centeredWidth = Math.min(560, Math.max(320, viewportWidth - safeMargin * 2));

  if (!highlightRect || viewportWidth < 1024) {
    return {
      mode: "centered",
      width: centeredWidth,
    };
  }

  const desktopWidth = Math.min(460, Math.max(380, viewportWidth - safeMargin * 2));
  const gap = 28;
  const panelHeightBudget = Math.min(420, Math.max(320, viewportHeight - safeMargin * 2));
  const top = Math.min(
    Math.max(highlightRect.top, safeMargin),
    Math.max(safeMargin, viewportHeight - panelHeightBudget - safeMargin),
  );

  const rightSideLeft = highlightRect.left + highlightRect.width + gap;
  if (rightSideLeft + desktopWidth <= viewportWidth - safeMargin) {
    return {
      mode: "desktop",
      top,
      left: rightSideLeft,
      width: desktopWidth,
    };
  }

  const leftSideLeft = highlightRect.left - gap - desktopWidth;
  if (leftSideLeft >= safeMargin) {
    return {
      mode: "desktop",
      top,
      left: leftSideLeft,
      width: desktopWidth,
    };
  }

  return {
    mode: "desktop",
    top: Math.min(
      Math.max(highlightRect.top + highlightRect.height + gap, safeMargin),
      Math.max(safeMargin, viewportHeight - panelHeightBudget - safeMargin),
    ),
    left: Math.min(
      Math.max(highlightRect.left + highlightRect.width / 2 - desktopWidth / 2, safeMargin),
      viewportWidth - desktopWidth - safeMargin,
    ),
    width: desktopWidth,
  };
}

export function SpotlightTour({
  open,
  onOpenChange,
  title,
  description,
  steps,
  onStepChange,
}: SpotlightTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);
  const currentStep = steps[stepIndex] ?? null;

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open || !currentStep) return;
    onStepChange?.(currentStep, stepIndex);
  }, [currentStep, onStepChange, open, stepIndex]);

  useEffect(() => {
    if (!open || !currentStep) {
      setHighlightRect(null);
      return;
    }

    if (typeof window === "undefined") return;

    const updateRect = () => {
      setHighlightRect(getHighlightRect(currentStep.targetId));
    };

    const scrollToTarget = window.setTimeout(() => {
      if (currentStep.targetId) {
        const element = document.querySelector<HTMLElement>(`[data-tour-id="${currentStep.targetId}"]`);
        element?.scrollIntoView({
          behavior: "smooth",
          block: window.innerWidth >= 1024 ? "nearest" : "center",
          inline: "nearest",
        });
      }

      window.setTimeout(updateRect, 160);
    }, 40);

    const handleViewportChange = () => updateRect();
    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);

    return () => {
      window.clearTimeout(scrollToTarget);
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [currentStep, open]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }

      if (event.key === "ArrowRight" && stepIndex < steps.length - 1) {
        setStepIndex((current) => Math.min(current + 1, steps.length - 1));
      }

      if (event.key === "ArrowLeft" && stepIndex > 0) {
        setStepIndex((current) => Math.max(current - 1, 0));
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onOpenChange, open, stepIndex, steps.length]);

  const progressLabel = useMemo(() => `${stepIndex + 1}/${steps.length}`, [stepIndex, steps.length]);
  const viewportWidth = typeof window === "undefined" ? 0 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 0 : window.innerHeight;
  const panelPosition = getPanelPosition(highlightRect, viewportWidth, viewportHeight);
  const isDesktopFloating = panelPosition.mode === "desktop";

  if (!open || !currentStep) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className={`fixed inset-0 z-[120] ${
        isDesktopFloating ? "p-0" : "flex items-end justify-center p-4 sm:items-center sm:p-6"
      }`}
    >
      <div className="absolute inset-0 bg-slate-950/56 backdrop-blur-[2px]" />

      {highlightRect && (
        <div
          className="pointer-events-none absolute rounded-[28px] border-2 border-sky-300/90 bg-transparent shadow-[0_0_0_9999px_rgba(2,6,23,0.56),0_0_0_8px_rgba(125,211,252,0.18),0_36px_90px_-38px_rgba(14,165,233,0.62)] transition-all duration-300"
          style={{
            top: `${highlightRect.top}px`,
            left: `${highlightRect.left}px`,
            width: `${highlightRect.width}px`,
            height: `${highlightRect.height}px`,
          }}
        />
      )}

      <Card
        className={`relative z-[121] border-0 bg-white/97 shadow-[0_36px_90px_-42px_rgba(15,23,42,0.42)] backdrop-blur-xl ${
          isDesktopFloating ? "absolute max-h-[calc(100vh-3rem)] overflow-y-auto" : "w-full max-w-lg"
        }`}
        style={
          isDesktopFloating
            ? {
                top: `${panelPosition.top}px`,
                left: `${panelPosition.left}px`,
                width: `${panelPosition.width}px`,
              }
            : { maxWidth: `${panelPosition.width}px` }
        }
      >
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-700">
                  <Compass className="mr-2 h-3.5 w-3.5" />
                  Tour từng bước
                </Badge>
                <Badge variant="outline" className="border-slate-200 bg-white text-slate-700">
                  {progressLabel}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">{title}</p>
                {description && <p className="mt-2 text-sm leading-7 text-slate-600">{description}</p>}
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} aria-label="Đóng tour">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50/90 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Bước hiện tại</p>
            <h3 className="mt-2 text-xl font-bold text-slate-950">{currentStep.title}</h3>
            <p className="mt-2 text-sm leading-7 text-slate-600">{currentStep.description}</p>
            {!highlightRect && currentStep.targetId && (
              <p className="mt-3 text-xs text-slate-500">
                Nếu chưa thấy vùng đang được nói tới, tour sẽ giữ bước này và thử bám lại khi màn hình ổn định hơn.
              </p>
            )}
          </div>

          <div className="flex flex-wrap justify-between gap-3">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStepIndex((current) => Math.max(current - 1, 0))}
                disabled={stepIndex === 0}
              >
                <ArrowLeft className="h-4 w-4" />
                Quay lại
              </Button>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Để sau
              </Button>
            </div>

            {stepIndex < steps.length - 1 ? (
              <Button onClick={() => setStepIndex((current) => Math.min(current + 1, steps.length - 1))}>
                Tiếp theo
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={() => onOpenChange(false)}>Xong rồi</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
