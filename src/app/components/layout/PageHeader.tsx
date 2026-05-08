"use client";

import type * as React from "react";
import { cn } from "../ui/utils";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: React.ReactNode;
  level?: 2 | 3;
  className?: string;
}

/**
 * PageHeader — consistent page-level heading pattern
 *
 * Usage:
 * <PageHeader
 *   eyebrow="Viết mục tiêu"
 *   title="Bước 1: Specific"
 *   description="Viết mục tiêu cụ thể để biết rõ cần đạt được gì."
 *   level={2}
 * />
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  level = 2,
  className,
}: PageHeaderProps) {
  const HeadingTag = level === 2 ? "h2" : "h3";

  return (
    <div className={cn("max-w-3xl space-y-2.5", className)}>
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {eyebrow}
        </p>
      )}
      <HeadingTag className="text-2xl font-bold leading-tight tracking-normal text-foreground sm:text-3xl">
        {title}
      </HeadingTag>
      {description && (
        <p className="text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
          {description}
        </p>
      )}
    </div>
  );
}
