"use client";

import type * as React from "react";
import { cn } from "../ui/utils";
import { Badge } from "../ui/badge";

interface StatusRowProps {
  icon?: React.ReactNode;
  text: string;
  badge?: {
    label: string;
    variant?: "default" | "secondary" | "destructive" | "success" | "warning" | "info" | "outline";
  };
  className?: string;
}

/**
 * StatusRow — inline status với icon + text + optional badge
 *
 * Usage:
 * <StatusRow
 *   icon={<AlertTriangle className="text-amber-500" />}
 *   text="Review đến hạn hôm nay"
 *   badge={{ label: "Cần xem lại", variant: "warning" }}
 * />
 */
export function StatusRow({ icon, text, badge, className }: StatusRowProps) {
  return (
    <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
      {icon && <span className="h-4 w-4 shrink-0">{icon}</span>}
      <span className="flex-1">{text}</span>
      {badge && (
        <Badge variant={badge.variant ?? "outline"} className="h-5 text-xs shrink-0">
          {badge.label}
        </Badge>
      )}
    </div>
  );
}
