"use client";

import type { ReactNode } from "react";
import { Card, CardContent } from "../ui/card";
import { cn } from "../ui/utils";

export type PageHeroAlign = "left" | "center";
export type PageHeroTitleLevel = 1 | 2;
export type PageHeroDensity = "default" | "compact";

interface PageHeroProps {
  /**
   * Optional uppercase label that sits above the title. Use a short scope
   * hint like "Tổng quan" or "Vision board". Renders with the brand gradient
   * dot for visual anchoring.
   */
  eyebrow?: ReactNode;
  /** Optional icon shown left of the eyebrow (lucide-react icon node). */
  eyebrowIcon?: ReactNode;
  /**
   * Main heading. Renders as `h1` by default — pages that already render
   * an `h1` elsewhere should pass `titleAs={2}` to keep document outline.
   */
  title: ReactNode;
  /**
   * Optional control of heading level (1 or 2). Defaults to 1. The visual
   * size stays the same regardless of semantic level.
   */
  titleAs?: PageHeroTitleLevel;
  /** Short description (1–2 sentences). */
  description?: ReactNode;
  /**
   * Primary CTA. Render with `<Button>` default variant for consistent
   * brand gradient + glow.
   */
  primaryCta?: ReactNode;
  /**
   * Secondary action. Render with `<Button variant="outline">` or
   * `variant="ghost"` for a quieter surface.
   */
  secondaryCta?: ReactNode;
  /**
   * Optional aside slot (image, illustration, stat). Renders right of
   * the text on `xl` screens, below on smaller. Hidden on `< sm` to
   * keep mobile clean.
   */
  aside?: ReactNode;
  /** Visual density. Compact reduces padding for repeat-context pages. */
  density?: PageHeroDensity;
  /** Text alignment. Defaults to `left`. Use `center` for empty workspaces. */
  align?: PageHeroAlign;
  /** Container className passed to the outer `<Card>` element. */
  className?: string;
  /** Extra className for the inner content wrapper. */
  contentClassName?: string;
  /** Forwarded `data-testid` for stable test selectors. */
  testId?: string;
  /** Forwarded `data-tour-id` so SpotlightTour can target the hero. */
  tourId?: string;
}

const DENSITY_CLASS: Record<PageHeroDensity, string> = {
  default: "p-5 sm:p-7 lg:p-8",
  compact: "p-4 sm:p-5 lg:p-6",
};

/**
 * PageHero — light, calm hero for standard product pages.
 *
 * Use this for Dashboard, GoalTracker, ReflectionJournal, Achievements,
 * VisionBoardGallery, BillingPlan, Settings overview etc. The wizard funnel
 * pages should use `WizardHero` instead.
 *
 * Compose with `<PageHeader>` only when you do not need a card (i.e. very
 * dense control-style pages like Settings).
 */
export function PageHero({
  eyebrow,
  eyebrowIcon,
  title,
  titleAs = 1,
  description,
  primaryCta,
  secondaryCta,
  aside,
  density = "default",
  align = "left",
  className,
  contentClassName,
  testId,
  tourId,
}: PageHeroProps) {
  const Heading = titleAs === 1 ? "h1" : "h2";
  const alignClass = align === "center" ? "text-center" : "text-left";
  const actionsLayoutClass =
    align === "center"
      ? "flex flex-col gap-2 sm:flex-row sm:justify-center"
      : "flex flex-col gap-2 sm:flex-row sm:items-center";
  const heroExtraProps: Record<string, string> = {};
  if (testId) heroExtraProps["data-testid"] = testId;
  if (tourId) heroExtraProps["data-tour-id"] = tourId;

  return (
    <Card
      className={cn("relative overflow-hidden border border-app-line bg-app-surface", className)}
      {...heroExtraProps}
    >
      <CardContent className={cn(DENSITY_CLASS[density], "relative", contentClassName)}>
        <div className={cn("grid items-start gap-5", aside ? "xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]" : "")}>
          <div className={cn("min-w-0 space-y-3", alignClass)}>
            {eyebrow ? (
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-app-ink-muted">
                {eyebrowIcon ? (
                  <span aria-hidden="true" className="text-app-accent">
                    {eyebrowIcon}
                  </span>
                ) : (
                  <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-app-accent" />
                )}
                {eyebrow}
              </p>
            ) : null}
            <Heading
              data-slot="page-hero-title"
              className="text-3xl font-bold tracking-tight text-app-ink sm:text-4xl lg:text-5xl"
            >
              {title}
            </Heading>
            {description ? (
              <p className="max-w-prose text-base leading-relaxed tracking-tight text-app-ink-muted sm:text-base">
                {description}
              </p>
            ) : null}
            {(primaryCta || secondaryCta) && (
              <div className={cn("pt-2", actionsLayoutClass)}>
                {primaryCta}
                {secondaryCta}
              </div>
            )}
          </div>
          {aside ? <div className="hidden min-w-0 sm:block">{aside}</div> : null}
        </div>
      </CardContent>
    </Card>
  );
}
