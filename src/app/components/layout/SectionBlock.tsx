import { Button } from "../ui/button";
"use client";

import type React from "react";
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "../ui/utils";

interface SectionBlockProps {
  title: string;
  eyebrow?: string;
  description?: React.ReactNode;
  children: React.ReactNode;
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
  collapsible = false,
  defaultOpen = true,
  isOpen: controlledIsOpen,
  onToggle,
  className,
}: SectionBlockProps) {
  const isControlled = controlledIsOpen !== undefined;
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const toggle = () => {
    if (isControlled && onToggle) {
      onToggle(!isOpen);
    } else {
      setInternalIsOpen(!isOpen);
    }
  };

  return (
    <section className={cn("space-y-4", className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-1">
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {eyebrow}
            </p>
          )}
          <h3 className="text-lg font-semibold leading-tight tracking-tight text-foreground">
            {title}
          </h3>
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
            aria-controls="section-content"
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
        <div id="section-content" className="space-y-4">
          {children}
        </div>
      )}
    </section>
  );
}
