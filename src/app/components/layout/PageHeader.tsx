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
    <div className={cn("max-w-3xl space-y-3", className)}>
      {eyebrow && (
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-app-accent" />
          {eyebrow}
        </p>
      )}
      <HeadingTag className="text-2xl font-bold leading-[1.1] tracking-[-0.018em] text-foreground sm:text-3xl">
        {title}
      </HeadingTag>
      {description && (
        <p className="text-[15px] leading-relaxed tracking-tight text-muted-foreground sm:text-base">
          {description}
        </p>
      )}
    </div>
  );
}
