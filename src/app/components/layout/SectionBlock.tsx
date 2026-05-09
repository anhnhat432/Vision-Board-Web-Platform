"use client";

import type React from "react";
import { useId, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../ui/utils";

interface SectionBlockProps extends Omit<React.HTMLAttributes<HTMLElement>, "title" | "onToggle"> {
  title: string;
  eyebrow?: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  density?: "compact" | "default" | "loose";
  headerVisuallyHidden?: boolean;
  collapsible?: boolean;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
  className?: string;
}

/**
 * SectionBlock — wrapper cho grouped content với header + optional collapse
 *
 * Usage:
 * <SectionBlock
 *   title="Cài đặt mục tiêu"
 *   eyebrow="Settings"
 *   collapsible
 * >
 *   {/* Settings content *\/}
 * </SectionBlock>
 */
export function SectionBlock({
  title,
  eyebrow,
  description,
  children,
  density = "default",
  headerVisuallyHidden = false,
  collapsible = false,
  defaultOpen = true,
  isOpen: controlledIsOpen,
  onToggle,
  className,
  ...sectionProps
}: SectionBlockProps) {
  const isControlled = controlledIsOpen !== undefined;
  const sectionId = useId();
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;
  const headingId = `${sectionId}-title`;
  const contentId = `${sectionId}-content`;
  const densityClass = {
    compact: "stack-tight",
    default: "stack-stack",
    loose: "stack-section",
  }[density];
  const contentDensityClass = density === "compact" ? "stack-tight" : "stack-stack";
  const headerDensityClass = density === "loose" ? "stack-stack" : "stack-tight";

  const toggle = () => {
    if (isControlled && onToggle) {
      onToggle(!isOpen);
    } else {
      setInternalIsOpen(!isOpen);
    }
  };

  return (
    <section {...sectionProps} aria-labelledby={headingId} className={cn(headerVisuallyHidden ? null : densityClass, className)}>
      <div className={cn("flex items-start justify-between gap-2", headerVisuallyHidden && "sr-only")}>
        <div className={cn("flex-1", headerDensityClass)}>
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {eyebrow}
            </p>
          )}
          <h2 id={headingId} className="text-lg font-semibold leading-tight tracking-tight text-foreground">
            {title}
          </h2>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {collapsible && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={toggle}
            aria-expanded={isOpen}
            aria-controls={contentId}
          >
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
      {(!collapsible || isOpen) && (
        <div id={contentId} className={contentDensityClass}>
          {children}
        </div>
      )}
    </section>
  );
}
