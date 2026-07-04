import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Check, HelpCircle, Lightbulb } from "lucide-react";

import { hasCompletedFirstRunGuidance, hasSeenNewUserGuide } from "../utils/new-user-guide";
import { SCREEN_GUIDE_SEEN_STORAGE_PREFIX } from "../utils/storage-constants";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "./ui/sheet";
import { useIsMobile } from "./ui/use-mobile";
import { cn } from "./ui/utils";

export const SCREEN_GUIDE_EVENT = "screen-guide-start";
const PENDING_SCREEN_GUIDE_TTL_MS = 8_000;

/**
 * Context that lets the app shell tell per-page ScreenGuide components that a
 * global "Hướng dẫn" trigger already exists (e.g. in the top bar or sidebar).
 * When true, ScreenGuide hides its own "Cách dùng màn này" button to avoid
 * showing two near-identical help triggers on the same screen.
 */
export const ScreenGuideContext = createContext(false);

export interface ScreenGuideStep {
  /** Short action-oriented instruction. Keep to one sentence. */
  text: string;
  /** Optional emphasis label rendered before the text. */
  label?: string;
}

interface ScreenGuideProps {
  /** Stable id used to persist the seen state per screen. */
  screenId: string;
  /** Short panel title, e.g. "Cach dung man nay". */
  title: string;
  /** Optional one-line intro under the title. */
  intro?: string;
  /** Ordered list of guidance steps. */
  steps: ScreenGuideStep[];
  /** Optional reassuring tip shown at the bottom. */
  tip?: string;
  /** Optional next step CTA shown in the panel footer. */
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  /**
   * When true, auto-open once the first time a new user lands on the screen.
   * Defaults to false so most screens keep a quiet, on-demand trigger and
   * avoid popup fatigue across the journey.
   */
  autoOpen?: boolean;
}

interface ScreenGuideEventDetail {
  screenId?: string;
  force?: boolean;
}

interface PendingScreenGuideRequest {
  force?: boolean;
  requestedAt: number;
}

function storageKey(screenId: string): string {
  return `${SCREEN_GUIDE_SEEN_STORAGE_PREFIX}${screenId}`;
}

function hasSeenGuide(screenId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(storageKey(screenId)) === "true";
  } catch {
    return false;
  }
}

function markGuideSeen(screenId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(screenId), "true");
  } catch {
    // Ignore storage failures - guidance is non-critical UX.
  }
}

const pendingScreenGuideRequests = new Map<string, PendingScreenGuideRequest>();
let lastScreenGuideLauncher: HTMLElement | null = null;

function rememberScreenGuideLauncher(): void {
  if (typeof document === "undefined") return;

  const activeElement = document.activeElement;
  lastScreenGuideLauncher = activeElement instanceof HTMLElement ? activeElement : null;
}

function rememberPendingScreenGuide(screenId: string, options: { force?: boolean }): void {
  pendingScreenGuideRequests.set(screenId, { ...options, requestedAt: Date.now() });
}

function consumePendingScreenGuide(screenId: string): { force?: boolean } | null {
  const pendingRequest = pendingScreenGuideRequests.get(screenId);
  if (!pendingRequest) return null;

  pendingScreenGuideRequests.delete(screenId);
  if (Date.now() - pendingRequest.requestedAt > PENDING_SCREEN_GUIDE_TTL_MS) return null;

  return { force: pendingRequest.force };
}

export function startScreenGuide(screenId: string, options: { force?: boolean } = {}): void {
  if (typeof window === "undefined") return;

  rememberPendingScreenGuide(screenId, options);
  rememberScreenGuideLauncher();
  window.dispatchEvent(
    new CustomEvent<ScreenGuideEventDetail>(SCREEN_GUIDE_EVENT, {
      detail: { screenId, ...options },
    }),
  );
}

/**
 * On-demand, action-oriented guidance for a workflow screen.
 *
 * Renders a compact, unobtrusive "Hướng dẫn nhanh" trigger that never pushes
 * the page content down. New users get a single auto-open the first time they
 * land on the screen; after that the guidance stays one click away and a
 * subtle dot reminds returning users it is there.
 */
export function ScreenGuide({
  screenId,
  title,
  intro,
  steps,
  tip,
  action,
  className,
  autoOpen = false,
}: ScreenGuideProps) {
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState(() => hasSeenGuide(screenId));
  const hasShellTrigger = useContext(ScreenGuideContext);
  const isMobile = useIsMobile();
  const hiddenTriggerRef = useRef<HTMLSpanElement | null>(null);

  const openGuide = useCallback(
    (force = false) => {
      const alreadySeen = hasSeenGuide(screenId);
      setSeen(alreadySeen);
      if (alreadySeen && !force) return;

      if (!alreadySeen) {
        markGuideSeen(screenId);
        setSeen(true);
      }

      setOpen(true);
    },
    [screenId],
  );

  useEffect(() => {
    if (autoOpen && !hasSeenNewUserGuide() && !hasCompletedFirstRunGuidance() && !hasSeenGuide(screenId)) {
      const timer = window.setTimeout(() => openGuide(false), 450);
      return () => window.clearTimeout(timer);
    }

    setSeen(hasSeenGuide(screenId));
    return undefined;
  }, [screenId, autoOpen, openGuide]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleGuideStart = (event: Event) => {
      const detail = (event as CustomEvent<ScreenGuideEventDetail>).detail;
      if (detail?.screenId === screenId) {
        consumePendingScreenGuide(screenId);
        openGuide(Boolean(detail.force));
      }
    };

    window.addEventListener(SCREEN_GUIDE_EVENT, handleGuideStart);
    const pendingRequest = consumePendingScreenGuide(screenId);
    if (pendingRequest) {
      openGuide(Boolean(pendingRequest.force));
    }

    return () => window.removeEventListener(SCREEN_GUIDE_EVENT, handleGuideStart);
  }, [openGuide, screenId]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (next && !seen) {
        markGuideSeen(screenId);
        setSeen(true);
        return;
      }
      if (!next && !seen) {
        markGuideSeen(screenId);
        setSeen(true);
      }
    },
    [screenId, seen],
  );

  const handleGotIt = useCallback(() => {
    markGuideSeen(screenId);
    setSeen(true);
    setOpen(false);
  }, [screenId]);

  const handleCloseAutoFocus = useCallback(
    (event: Event) => {
      if (!hasShellTrigger) return;

      const launcher = lastScreenGuideLauncher;
      if (!launcher?.isConnected || launcher === hiddenTriggerRef.current) return;

      event.preventDefault();
      launcher.focus({ preventScroll: true });
    },
    [hasShellTrigger],
  );

  if (steps.length === 0) return null;

  const renderVisibleTrigger = () => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="relative min-h-11 gap-1.5 border border-app-line bg-app-surface px-4 text-app-ink-soft shadow-3xs hover:bg-app-bg hover:text-app-ink active:scale-[0.97]"
      aria-label={`Hướng dẫn nhanh: ${title}`}
    >
      <HelpCircle className="size-4" aria-hidden="true" />
      Cách dùng màn này
      {!seen ? (
        <span className="absolute -right-0.5 -top-0.5 flex size-2">
          <span className="absolute inline-flex size-full rounded-full bg-app-accent/70 motion-safe:animate-ping" />
          <span className="relative inline-flex size-2 rounded-full bg-app-accent" />
        </span>
      ) : null}
    </Button>
  );

  const renderGuideBody = (surface: "popover" | "sheet") => (
    <>
      <div className={cn("space-y-3 p-4", surface === "sheet" && "max-h-[62dvh] overflow-y-auto px-5 pb-4 pt-5")}>
        <div className="flex items-start gap-2.5">
          <span
            className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-app-line bg-app-bg/60 text-app-accent"
            aria-hidden="true"
          >
            <Lightbulb className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0 space-y-1 pr-8 sm:pr-0">
            {surface === "sheet" ? (
              <SheetTitle className="font-serif text-lg font-semibold leading-snug text-app-ink text-wrap-balance">
                {title}
              </SheetTitle>
            ) : (
              <h2 className="font-serif text-base font-medium leading-snug text-app-ink text-wrap-balance">{title}</h2>
            )}
            {intro ? (
              surface === "sheet" ? (
                <SheetDescription className="max-w-[60ch] text-sm leading-relaxed text-app-ink-muted">
                  {intro}
                </SheetDescription>
              ) : (
                <p className="max-w-[60ch] text-sm leading-relaxed text-app-ink-muted">{intro}</p>
              )
            ) : null}
          </div>
        </div>
        <ol className="space-y-2.5">
          {steps.map((step, index) => (
            <li key={step.text} className="flex gap-2.5 text-sm leading-relaxed text-app-ink-soft">
              <span
                className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-app-accent/12 text-xs font-semibold text-app-accent"
                aria-hidden="true"
              >
                {index + 1}
              </span>
              <span className="min-w-0 [overflow-wrap:anywhere]">
                {step.label ? <strong className="font-semibold text-app-ink">{step.label} </strong> : null}
                {step.text}
              </span>
            </li>
          ))}
        </ol>
        {tip ? (
          <p className="rounded-lg bg-app-bg/60 px-3 py-2 text-xs leading-relaxed text-app-ink-muted">{tip}</p>
        ) : null}
      </div>
      <div
        className={cn(
          "flex flex-col gap-2 border-t border-app-line px-4 py-2.5 sm:flex-row sm:justify-end",
          surface === "sheet" && "bg-app-surface/95 px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-3",
        )}
      >
        {action ? (
          <Button type="button" variant="outline" size="sm" className="min-h-11 gap-1.5 px-4" onClick={action.onClick}>
            {action.label}
          </Button>
        ) : null}
        <Button type="button" size="sm" className="min-h-11 gap-1.5 px-4" onClick={handleGotIt}>
          <Check className="size-4" aria-hidden="true" />
          Tôi đã hiểu
        </Button>
      </div>
    </>
  );

  return (
    <div className={cn("flex justify-end", className)}>
      {isMobile ? (
        <Sheet open={open} onOpenChange={handleOpenChange}>
          {!hasShellTrigger ? (
            <SheetTrigger asChild>{renderVisibleTrigger()}</SheetTrigger>
          ) : (
            /* Invisible anchor so the sheet still has a DOM trigger element,
             * but the user sees only the shell "Hướng dẫn" button (top bar / sidebar). */
            <SheetTrigger asChild>
              <span ref={hiddenTriggerRef} aria-hidden="true" className="hidden" />
            </SheetTrigger>
          )}
          <SheetContent
            side="bottom"
            className="max-h-[88dvh] gap-0 overflow-hidden rounded-t-[1.5rem] border-app-line bg-app-surface p-0 shadow-app-lg"
            onCloseAutoFocus={handleCloseAutoFocus}
          >
            {renderGuideBody("sheet")}
          </SheetContent>
        </Sheet>
      ) : (
        <Popover open={open} onOpenChange={handleOpenChange}>
          {!hasShellTrigger ? (
            <PopoverTrigger asChild>{renderVisibleTrigger()}</PopoverTrigger>
          ) : (
            /* Invisible anchor so the popover still has a DOM trigger element,
             * but the user sees only the shell "Hướng dẫn" button (top bar / sidebar). */
            <PopoverTrigger asChild>
              <span ref={hiddenTriggerRef} aria-hidden="true" className="hidden" />
            </PopoverTrigger>
          )}
          <PopoverContent
            align="end"
            sideOffset={8}
            className="w-[min(22rem,calc(100vw-2rem))] border-app-line bg-app-surface p-0 shadow-app-lg"
            role="dialog"
            aria-label={title}
            onCloseAutoFocus={handleCloseAutoFocus}
          >
            {renderGuideBody("popover")}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
