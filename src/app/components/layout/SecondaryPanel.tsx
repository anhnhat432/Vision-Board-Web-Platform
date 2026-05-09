"use client";

import type React from "react";
import { useState } from "react";
import { cn } from "../ui/utils";

interface SecondaryPanelProps {
  icon?: React.ReactNode;
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onToggle?: (open: boolean) => void;
  className?: string;
}

/**
 * SecondaryPanel — muted panel cho insights, hints, rescue nudges
 *
 * Usage:
 * <SecondaryPanel
 *   icon={<Lightbulb className="text-violet-500" />}
 *   title="Gợi ý điền nhanh"
 *   collapsible
 * >
 *   <p>Thử dùng mục tiêu mẫu để bắt đầu nhanh hơn.</p>
 * </SecondaryPanel>
 */
export function SecondaryPanel({
  icon,
  title,
  children,
  collapsible = false,
  defaultOpen = true,
  isOpen: controlledIsOpen,
  onToggle,
  className,
}: SecondaryPanelProps) {
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

  const headerContent = (
    <>
      <div className="flex items-start gap-2 flex-1">
        {icon && <span className="mt-0.5 h-4 w-4 shrink-0">{icon}</span>}
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {collapsible && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {isOpen ? "Thu gọn" : "Xem thêm"}
            </p>
          )}
        </div>
      </div>
      {collapsible && (
        <span className="text-muted-foreground">
          {isOpen ? "−" : "+"}
        </span>
      )}
    </>
  );

  return (
    <div
      className={cn(
        "rounded-[var(--r-tile)] border border-muted bg-muted/90 p-4",
        className
      )}
    >
      {collapsible ? (
        <button
          type="button"
          className="flex w-full items-start justify-between gap-2 text-left"
          onClick={toggle}
          aria-expanded={isOpen}
        >
          {headerContent}
        </button>
      ) : (
        <div className="flex items-start justify-between gap-2">
          {headerContent}
        </div>
      )}
      {(!collapsible || isOpen) && (
        <div className="mt-3 text-sm text-muted-foreground">
          {children}
        </div>
      )}
    </div>
  );
}
