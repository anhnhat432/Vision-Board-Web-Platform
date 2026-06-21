import { Check, Loader2, Tag, X } from "lucide-react";
import { useState, useCallback, useEffect, useId } from "react";
import type { ChangeEvent, KeyboardEvent } from "react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { formatVndAmount, ENV_DISCOUNT_PERCENT } from "@/app/utils/billing-pricing";
import type { DiscountInfo } from "./useCouponValidation";
import { useCouponValidation } from "./useCouponValidation";

export interface BillingDiscountSectionProps {
  originalAmount: number;
  planCode?: string;
  purpose?: "plus_subscription" | "physical_order";
  couponCode?: string;
  onCouponChange?: (discount: DiscountInfo | null) => void;
  saleEvent?: {
    name: string;
    discountPercent?: number;
    discountValue?: number;
    discountType?: "percentage" | "fixed";
    discountAmount?: number;
    finalAmount?: number;
  } | null;
}

function getDiscountAmountFromInfo(discount: DiscountInfo | null, originalAmount: number): number {
  if (!discount) return 0;
  if (Number.isFinite(discount.discountAmount) && discount.discountAmount !== undefined) {
    return Math.max(0, discount.discountAmount);
  }
  if (discount.discountType === "percentage" && Number.isFinite(discount.discountValue)) {
    return Math.round(originalAmount * (discount.discountValue ?? 0) / 100);
  }
  if (discount.discountType === "fixed" && Number.isFinite(discount.discountValue)) {
    return Math.min(discount.discountValue ?? 0, originalAmount);
  }
  if (Number.isFinite(discount.discountPercent)) {
    return Math.round(originalAmount * (discount.discountPercent ?? 0) / 100);
  }
  return 0;
}

function getSaleDiscountAmount(
  saleEvent: BillingDiscountSectionProps["saleEvent"],
  originalAmount: number,
): number {
  if (!saleEvent) return 0;
  if (Number.isFinite(saleEvent.discountAmount) && saleEvent.discountAmount !== undefined) {
    return Math.max(0, saleEvent.discountAmount);
  }
  if (Number.isFinite(saleEvent.discountPercent) && saleEvent.discountPercent) {
    return Math.round(originalAmount * saleEvent.discountPercent / 100);
  }
  if (Number.isFinite(saleEvent.discountValue) && saleEvent.discountValue) {
    return Math.min(saleEvent.discountValue, originalAmount);
  }
  return 0;
}

function getFinalAmount(originalAmount: number, discountAmount: number): number {
  return discountAmount > 0 ? Math.max(originalAmount - discountAmount, 1000) : originalAmount;
}

function getSaleLabel(saleEvent: NonNullable<BillingDiscountSectionProps["saleEvent"]>, saleAmount: number): string {
  if (saleEvent.discountPercent) return `Gi?m ${saleEvent.discountPercent}%`;
  if (saleEvent.discountValue) return `Gi?m ${formatVndAmount(saleEvent.discountValue)}`;
  return `Gi?m ${formatVndAmount(saleAmount)}`;
}

export function BillingDiscountSection({
  originalAmount,
  planCode = "PLUS",
  purpose,
  couponCode: externalCouponCode,
  onCouponChange,
  saleEvent,
}: BillingDiscountSectionProps) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const statusId = `${inputId}-status`;
  const [inputValue, setInputValue] = useState(externalCouponCode ?? "");
  const { status, discount, error, validate, reset } = useCouponValidation({ planCode, purpose, originalAmount });

  const handleApply = useCallback(() => {
    validate(inputValue);
  }, [inputValue, validate]);

  useEffect(() => {
    if (status === "valid" && discount?.discountCode) {
      onCouponChange?.(discount);
      return;
    }
    if (status === "idle" || status === "invalid") {
      onCouponChange?.(null);
    }
  }, [status, discount, onCouponChange]);

  const handleClear = useCallback(() => {
    setInputValue("");
    reset();
    onCouponChange?.(null);
  }, [reset, onCouponChange]);

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value.toUpperCase());
      if (status !== "idle") {
        reset();
        onCouponChange?.(null);
      }
    },
    [onCouponChange, reset, status],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleApply();
      }
    },
    [handleApply],
  );

  const effectiveDiscount = status === "valid" ? discount : null;
  const saleAmount = getSaleDiscountAmount(saleEvent, originalAmount);
  const hasSaleEvent = Boolean(saleEvent && saleAmount > 0);
  const saleFinalAmount = saleEvent?.finalAmount ?? getFinalAmount(originalAmount, saleAmount);

  const couponAmount = getDiscountAmountFromInfo(effectiveDiscount, originalAmount);
  const couponFinalAmount = getFinalAmount(originalAmount, couponAmount);
  const discountAmount = Math.max(couponAmount, saleAmount) || null;
  const bestSource = couponAmount >= saleAmount ? (effectiveDiscount ? "coupon" : "sale_event") : "sale_event";

  const finalAmount = getFinalAmount(originalAmount, discountAmount ?? 0);
  const hasDiscount = discountAmount !== null && discountAmount > 0;

  const envPercent = !effectiveDiscount && !hasSaleEvent ? ENV_DISCOUNT_PERCENT : null;
  const envAmount = envPercent ? Math.round(originalAmount * envPercent / 100) : 0;
  const envFinal = getFinalAmount(originalAmount, envAmount);
  const describedBy = [status === "invalid" && error ? errorId : null, status === "valid" ? statusId : null]
    .filter(Boolean)
    .join(" ") || undefined;

  return (
    <div className="rounded-card border border-app-line bg-app-surface p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <Tag className="h-4 w-4 text-app-accent" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-app-ink">M? gi?m gi? / ?u ??i</h3>
      </div>

      {hasSaleEvent && saleEvent && (
        <div className="mb-4 rounded-card border border-app-accent/30 bg-app-accent-soft/40 p-3">
          <p className="flex items-start gap-2 text-sm font-medium text-app-accent">
            <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 break-words">{saleEvent.name}</span>
          </p>
          <p className="mt-1 text-xs text-app-ink-muted">
            {getSaleLabel(saleEvent, saleAmount)} ? c?n {formatVndAmount(saleFinalAmount)}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <label htmlFor={inputId} className="sr-only">
            Nh?p m? gi?m gi?
          </label>
          <Input
            id={inputId}
            placeholder="Nh?p m? gi?m gi?"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={status === "loading"}
            aria-invalid={status === "invalid"}
            aria-describedby={describedBy}
            className={`pr-8 uppercase ${
              status === "valid"
                ? "border-app-status-success/50 focus-visible:ring-app-status-success/30"
                : status === "invalid"
                  ? "border-app-status-error/50 focus-visible:ring-app-status-error/30"
                  : ""
            }`}
          />
          {status === "loading" && (
            <Loader2
              className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-app-ink-muted"
              aria-hidden="true"
            />
          )}
          {status === "valid" && (
            <Check
              className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-app-status-success"
              aria-hidden="true"
            />
          )}
          {status === "invalid" && (
            <X
              className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-app-status-error"
              aria-hidden="true"
            />
          )}
        </div>
        {status === "valid" ? (
          <Button type="button" variant="outline" size="sm" onClick={handleClear} className="shrink-0 sm:w-auto">
            X?a
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={handleApply}
            disabled={!inputValue.trim() || status === "loading"}
            className="shrink-0 sm:w-auto"
          >
            {status === "loading" ? "?ang ki?m tra?" : "?p d?ng"}
          </Button>
        )}
      </div>

      {status === "invalid" && error && (
        <p id={errorId} className="mt-2 text-xs text-app-status-error" aria-live="polite">
          {error}
        </p>
      )}

      {status === "valid" && effectiveDiscount && bestSource === "coupon" && (
        <div id={statusId} className="mt-3 rounded-card border border-app-status-success/30 bg-app-status-success/8 p-3" aria-live="polite">
          <p className="flex items-start gap-2 text-sm font-medium text-app-status-success">
            <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 break-words">{effectiveDiscount.discountName ?? "M? gi?m gi? h?p l?"}</span>
          </p>
          {effectiveDiscount.discountPercent !== undefined && (
            <p className="mt-1 text-xs text-app-ink-muted">
              Gi?m {effectiveDiscount.discountPercent}%
            </p>
          )}
          {couponAmount > 0 && (
            <div className="mt-2 flex flex-wrap items-baseline gap-2">
              <span className="text-sm text-app-ink-muted line-through">
                {formatVndAmount(originalAmount)}
              </span>
              <span className="text-lg font-semibold text-app-status-success">
                {formatVndAmount(couponFinalAmount)}
              </span>
            </div>
          )}
        </div>
      )}

      {status === "valid" && effectiveDiscount && bestSource === "sale_event" && hasSaleEvent && (
        <div id={statusId} className="mt-3 rounded-card border border-app-accent/30 bg-app-accent-soft/40 p-3" aria-live="polite">
          <p className="flex items-start gap-2 text-sm font-medium text-app-accent">
            <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="min-w-0 break-words">{saleEvent?.name} ?ang c? gi? t?t h?n m? v?a nh?p.</span>
          </p>
          <div className="mt-2 flex flex-wrap items-baseline gap-2">
            <span className="text-sm text-app-ink-muted line-through">
              {formatVndAmount(originalAmount)}
            </span>
            <span className="text-lg font-semibold text-app-accent">
              {formatVndAmount(finalAmount)}
            </span>
          </div>
        </div>
      )}

      {hasDiscount && !effectiveDiscount && hasSaleEvent && (
        <div className="mt-3 flex flex-wrap items-baseline gap-2">
          <span className="text-sm text-app-ink-muted line-through">
            {formatVndAmount(originalAmount)}
          </span>
          <span className="text-lg font-semibold text-app-accent">
            {formatVndAmount(finalAmount)}
          </span>
        </div>
      )}

      {envPercent && (
        <div className="mt-3 rounded-card border border-app-accent/30 bg-app-accent-soft/40 p-3">
          <p className="flex items-center gap-2 text-sm font-medium text-app-accent">
            <Check className="h-4 w-4" aria-hidden="true" />
            ?ang c? ?u ??i {envPercent}%
          </p>
          <div className="mt-2 flex flex-wrap items-baseline gap-2">
            <span className="text-sm text-app-ink-muted line-through">
              {formatVndAmount(originalAmount)}
            </span>
            <span className="text-lg font-semibold text-app-accent">
              {formatVndAmount(envFinal)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

