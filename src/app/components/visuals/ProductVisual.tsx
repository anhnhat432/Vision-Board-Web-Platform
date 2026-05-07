import {
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Compass,
  Image,
  ListChecks,
  MessageSquareQuote,
  Sparkles,
  Target,
} from "lucide-react";

import { cn } from "../ui/utils";

export type ProductVisualVariant = "moodboard" | "vision" | "balance" | "execution";

interface ProductVisualProps {
  variant?: ProductVisualVariant;
  className?: string;
}

const variantIcon = {
  moodboard: Sparkles,
  vision: Image,
  balance: Compass,
  execution: ListChecks,
} satisfies Record<ProductVisualVariant, typeof Sparkles>;

const EXECUTION_CELLS = Array.from({ length: 12 }, (_, index) => ({
  id: `execution-cell-${index + 1}`,
  className: index < 7 ? "is-done" : index === 7 ? "is-today" : undefined,
}));

export function ProductVisual({ variant = "moodboard", className }: ProductVisualProps) {
  const Icon = variantIcon[variant];

  return (
    <div className={cn("product-visual", `product-visual--${variant}`, className)} aria-hidden="true">
      <div className="product-visual__grid" />
      <div className="product-visual__header">
        <span className="product-visual__mark">
          <Icon className="h-4 w-4" />
        </span>
        <span className="product-visual__signal product-visual__signal--wide" />
        <span className="product-visual__signal" />
      </div>

      {variant === "moodboard" ? <MoodboardVisual /> : null}
      {variant === "vision" ? <VisionVisual /> : null}
      {variant === "balance" ? <BalanceVisual /> : null}
      {variant === "execution" ? <ExecutionVisual /> : null}
    </div>
  );
}

function MoodboardVisual() {
  return (
    <div className="product-visual__body product-visual__body--moodboard">
      <span className="product-visual__photo product-visual__photo--large" />
      <span className="product-visual__photo product-visual__photo--small" />
      <span className="product-visual__note product-visual__note--one" />
      <span className="product-visual__note product-visual__note--two" />
      <span className="product-visual__rail">
        <CircleDot className="h-3.5 w-3.5" />
        <span />
        <CheckCircle2 className="h-3.5 w-3.5" />
      </span>
    </div>
  );
}

function VisionVisual() {
  return (
    <div className="product-visual__body product-visual__body--vision">
      <span className="product-visual__tile product-visual__tile--image" />
      <span className="product-visual__tile product-visual__tile--quote">
        <MessageSquareQuote className="h-5 w-5" />
      </span>
      <span className="product-visual__tile product-visual__tile--icon">
        <Sparkles className="h-5 w-5" />
      </span>
      <span className="product-visual__tile product-visual__tile--goal">
        <Target className="h-5 w-5" />
      </span>
    </div>
  );
}

function BalanceVisual() {
  return (
    <div className="product-visual__body product-visual__body--balance">
      <span className="product-visual__wheel">
        <span />
      </span>
      <span className="product-visual__balance-card product-visual__balance-card--top" />
      <span className="product-visual__balance-card product-visual__balance-card--bottom" />
    </div>
  );
}

function ExecutionVisual() {
  return (
    <div className="product-visual__body product-visual__body--execution">
      <span className="product-visual__calendar">
        {EXECUTION_CELLS.map((cell) => (
          <i key={cell.id} className={cell.className} />
        ))}
      </span>
      <span className="product-visual__task-stack">
        <i />
        <i />
        <i />
      </span>
      <span className="product-visual__review">
        <CalendarDays className="h-4 w-4" />
        <CheckCircle2 className="h-4 w-4" />
      </span>
    </div>
  );
}
