import type { ReactNode } from "react";

import { cn } from "@/app/components/ui/utils";

export type EmptyStateVariant = "card" | "dashed";
export type EmptyStateAlign = "left" | "center";
export type EmptyStateHeadingLevel = 2 | 3 | 4;

interface EmptyStateProps {
  /**
   * Optional leading icon. Rendered inside a neutral rounded-[var(--r-control)] badge. The icon
   * itself should be a lucide-react icon node or any ReactNode.
   */
  icon?: ReactNode;
  /**
   * Optional decorative illustration shown above the icon badge.
   * Use components from src/app/components/illustrations/ for consistent style.
   */
  illustration?: ReactNode;
  /**
   * Small uppercase label shown above the title. Use for short scope hints
   * like "Workspace mới" or "Chu kỳ 12 tuần".
   */
  eyebrow?: ReactNode;
  /**
   * Main heading. Renders at `headingLevel` (default 3) so the component can
   * sit inside any parent section without breaking heading order.
   */
  title: ReactNode;
  /**
   * Short explanation of what's happening and why. Keep to 1-2 sentences —
   * long explanations should live in a linked doc or deeper disclosure.
   */
  description?: ReactNode;
  /**
   * Optional content between description and actions. Useful for a numbered
   * next-steps list or a compact meta preview.
   */
  children?: ReactNode;
  /**
   * Buttons or links. Rendered as a flex cluster; on mobile they stack.
   */
  actions?: ReactNode;
  /**
   * Visual container style.
   * - "card" (default): soft solid card, matches other 12-week surfaces.
   * - "dashed": lighter dashed-border block for empty lists inside a card.
   */
  variant?: EmptyStateVariant;
  /**
   * Text/content alignment. Defaults to `center` — empty states read
   * calmer centered. Use `left` when the state sits alongside dense
   * surrounding content.
   */
  align?: EmptyStateAlign;
  /**
   * Additional utility classes appended to the outer container.
   */
  className?: string;
  /**
   * Wrapper semantic element. Defaults to `div` — set to `section` when
   * the empty state stands on its own (e.g. a page-level block).
   */
  as?: "div" | "section";
  /**
   * Semantic level for the title heading (2, 3, or 4). Defaults to 3.
   */
  headingLevel?: EmptyStateHeadingLevel;
  /**
   * Optional `data-testid` forwarded to the container for targeted tests.
   */
  testId?: string;
}

const CARD_CLASSES =
  "rounded-[var(--r-card)] border border-slate-200/80 bg-white/92 p-5 shadow-lg sm:p-6";
const DASHED_CLASSES = "rounded-[var(--r-control)] border border-dashed border-slate-300 bg-slate-50 px-6 py-8";

export function EmptyState({
  icon,
  illustration,
  eyebrow,
  title,
  description,
  children,
  actions,
  variant = "card",
  align = "center",
  className,
  as = "div",
  headingLevel = 3,
  testId,
}: EmptyStateProps) {
  const variantClass = variant === "dashed" ? DASHED_CLASSES : CARD_CLASSES;
  const alignClass = align === "center" ? "text-center" : "text-left";
  const blockAlignClass = align === "center" ? "mx-auto" : "";
  const actionsLayoutClass =
    align === "center"
      ? "flex flex-col gap-2 sm:flex-row sm:justify-center"
      : "flex flex-col gap-2 sm:flex-row";
  const titleSizeClass =
    variant === "card"
      ? "text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl"
      : "text-base font-semibold text-slate-900";

  const Wrapper = as;
  const HeadingTag = `h${headingLevel}` as "h2" | "h3" | "h4";

  return (
    <Wrapper
      data-testid={testId}
      className={cn("space-y-4", variantClass, alignClass, className)}
    >
      {illustration ? (
        <div className={cn("w-32 max-w-full sm:w-40", blockAlignClass)} aria-hidden="true">
          {illustration}
        </div>
      ) : null}
      {icon ? (
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-[var(--r-pill)] bg-slate-100 text-slate-700",
            blockAlignClass,
          )}
          aria-hidden="true"
        >
          {icon}
        </div>
      ) : null}
      <div className={cn("space-y-2", blockAlignClass, variant === "card" ? "max-w-2xl" : "max-w-lg")}>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{eyebrow}</p>
        ) : null}
        <HeadingTag className={titleSizeClass}>{title}</HeadingTag>
        {description ? (
          <p className="text-sm leading-7 text-slate-600">{description}</p>
        ) : null}
      </div>
      {children ? <div className={blockAlignClass}>{children}</div> : null}
      {actions ? <div className={actionsLayoutClass}>{actions}</div> : null}
    </Wrapper>
  );
}
