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
  primary: "border-primary",
  violet: "border-violet-300",
  emerald: "border-emerald-300",
  amber: "border-amber-300",
};

const eyebrowClass: Record<PrimaryActionCardTone, string> = {
  primary: "text-primary",
  violet: "text-violet-700",
  emerald: "text-emerald-700",
  amber: "text-amber-700",
};

const densityClass: Record<PrimaryActionCardDensity, string> = {
  compact: "gap-[var(--space-stack)] p-[var(--space-stack)]",
  default: "gap-[var(--space-stack)] p-[var(--space-loose)]",
};

/**
 * PrimaryActionCard — hero card với border-2 border-primary
 *
 * Usage:
 * <PrimaryActionCard
 *   title="Việc quan trọng nhất hôm nay"
 *   description="Chỉ cần xong việc này là hôm nay đã đủ."
 *   action={<Button className="gradient-brand">Lưu check-in</Button>}
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
        "rounded-[var(--r-card)] border bg-card shadow-sm",
        toneClass[tone],
        densityClass[density],
        hero && "shadow-[var(--shadow-3)]",
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
        <Title data-slot="card-title" className={cn("leading-tight tracking-normal", titleClassName)}>
          {title}
        </Title>
        {description && <CardDescription className={descriptionClassName}>{description}</CardDescription>}
      </CardHeader>
      {children && <CardContent className={cn("p-0", contentClassName)}>{children}</CardContent>}
      {action && (
        <div className={actionClassName}>
          {action}
        </div>
      )}
    </Card>
  );
}
