"use client";

import type * as React from "react";
import { cn } from "../ui/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

interface PrimaryActionCardProps {
  title: string;
  description?: string;
  action: React.ReactNode;
  children?: React.ReactNode;
  hero?: boolean;
  className?: string;
}

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
  className,
}: PrimaryActionCardProps) {
  return (
    <Card
      className={cn(
        "border-2 border-primary",
        hero && "hero-surface",
        className
      )}
    >
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      {children && <CardContent>{children}</CardContent>}
      {action && (
        <div className="px-5 pb-5 sm:px-7 sm:pb-7">
          {action}
        </div>
      )}
    </Card>
  );
}
