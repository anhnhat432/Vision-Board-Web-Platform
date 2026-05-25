"use client";

import type * as React from "react";
import { cn } from "../ui/utils";
import { Card, CardContent, CardDescription, CardHeader } from "../ui/card";

type PrimaryActionCardTone = "primary" | "violet" | "emerald" | "amber";
type PrimaryActionCardDensity = "compact" | "default";
type PrimaryActionCardTitleAs = "h1" | "h2" | "h3" | "h4";

interface PrimaryActionCardProps extends Omit<React.ComponentPropsWithoutRef<"div">, "title"> {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children?: React.ReactNode;
  hero?: boolean;
  tone?: PrimaryActionCardTone;
  density?: PrimaryActionCardDensity;
  eyebrow?: string;
  icon?: React.ReactNode;
  eyebrowClassName?: string;
  titleAs?: PrimaryActionCardTitleAs;
  titleClassName?: string;
  descriptionClassName?: string;
  headerClassName?: string;
  contentClassName?: string;
  actionClassName?: string;
  /**
   * Add a soft, breathing brand glow around the card to emphasise it
   * as the most important action on the page. Uses the route tone
   * tokens so it matches whichever page it sits on.
   */
  glow?: boolean;
  /**
   * Animate the card on first mount. Useful for hero cards that should
   * draw attention without being jarring. Respects reduced-motion.
   */
  appear?: boolean;
}

const toneClass: Record<PrimaryActionCardTone, string> = {
  primary: "border-app-accent/40",
  violet: "border-app-warm-border",
  emerald: "border-emerald-200",
  amber: "border-app-warm-border",
};

const eyebrowClass: Record<PrimaryActionCardTone, string> = {
  primary: "text-app-accent",
  violet: "text-app-warm-strong",
  emerald: "text-emerald-700",
  amber: "text-app-warm-strong",
};

const densityClass: Record<PrimaryActionCardDensity, string> = {
  compact: "gap-4 p-4 sm:p-5",
  default: "gap-4 p-5 sm:p-6",
};

/**
 * PrimaryActionCard — hero card với border-2 border-primary
 *
 * Usage:
 * <PrimaryActionCard
 *   title="Việc quan trọng nhất hôm nay"
 *   description="Chỉ cần xong việc này là hôm nay đã đủ."
 *   action={<Button>Lưu check-in</Button>}
 *   hero
 * />
 */
export function PrimaryActionCard({
  title,
  description,
  action,
  children,
  hero = false,
  tone = "primary",
  density = "default",
  eyebrow,
  icon,
  eyebrowClassName,
  titleAs = "h3",
  titleClassName,
  descriptionClassName,
  headerClassName,
  contentClassName,
  actionClassName,
  glow = false,
  appear = false,
  className,
  ...cardProps
}: PrimaryActionCardProps) {
  const Title = titleAs;

  return (
    <Card
      className={cn(
        "surface-raised rounded-2xl bg-app-surface",
        toneClass[tone],
        densityClass[density],
        hero && "surface-elevated",
        glow && "brand-glow-pulse",
        appear && "appear-fade-up",
        className,
      )}
      {...cardProps}
    >
      <CardHeader className={cn("p-0", headerClassName)}>
        {eyebrow && (
          <p
            className={cn(
              "flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]",
              eyebrowClass[tone],
              eyebrowClassName,
            )}
          >
            {icon}
            {eyebrow}
          </p>
        )}
        <Title data-slot="card-title" className={cn("font-serif text-lg font-medium leading-tight tracking-normal text-app-ink", titleClassName)}>
          {title}
        </Title>
        {description && <CardDescription className={descriptionClassName}>{description}</CardDescription>}
      </CardHeader>
      {children && <CardContent className={cn("p-0", contentClassName)}>{children}</CardContent>}
      {action && <div className={actionClassName}>{action}</div>}
    </Card>
  );
}
