import { Check, Loader2, Tag, X } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
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
  } | null;
}

export function BillingDiscountSection({
  originalAmount,
  planCode = "PLUS",
  purpose,
  couponCode: externalCouponCode,
  onCouponChange,
  saleEvent,
}: BillingDiscountSectionProps) {
  const [inputValue, setInputValue] = useState(externalCouponCode ?? "");
  const { status, discount, error, validate, reset } = useCouponValidation({ planCode, purpose });

  const handleApply = useCallback(() => {
    validate(inputValue);
  }, [inputValue, validate]);

  useEffect(() => {
    if (status === "valid" && discount?.discountCode) {
      onCouponChange?.(discount);
    }
  }, [status, discount, onCouponChange]);

  const handleClear = useCallback(() => {
    setInputValue("");
    reset();
    onCouponChange?.(null);
  }, [reset, onCouponChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleApply();
      }
    },
    [handleApply],
  );

  const effectiveDiscount = status === "valid" ? discount : null;
  const hasSaleEvent = saleEvent && (saleEvent.discountPercent || saleEvent.discountValue);

  const couponAmount = effectiveDiscount?.discountAmount ?? 0;
  const saleAmount = saleEvent?.discountPercent
    ? Math.round(originalAmount * saleEvent.discountPercent / 100)
    : saleEvent?.discountValue
      ? Math.min(saleEvent.discountValue, originalAmount)
      : 0;

  const discountAmount = Math.max(couponAmount, saleAmount) || null;
  const bestSource = couponAmount >= saleAmount ? (effectiveDiscount ? "coupon" : "sale_event") : "sale_event";

  const finalAmount = discountAmount ? Math.max(originalAmount - discountAmount, 1000) : originalAmount;
  const hasDiscount = discountAmount !== null && discountAmount > 0;

  const envPercent = !effectiveDiscount && !hasSaleEvent ? ENV_DISCOUNT_PERCENT : null;
  const envAmount = envPercent ? Math.round(originalAmount * envPercent / 100) : 0;
  const envFinal = envAmount ? Math.max(originalAmount - envAmount, 1000) : originalAmount;

  return (
    <div className="rounded-card border border-app-line bg-app-surface p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-4">
        <Tag className="h-4 w-4 text-app-accent" />
        <h3 className="text-sm font-semibold text-app-ink">Mã giảm giá / Ưu đãi</h3>
      </div>

      {hasSaleEvent && (
        <div className="mb-4 rounded-card border border-app-accent/30 bg-app-accent-soft/40 p-3">
          <p className="flex items-center gap-2 text-sm font-medium text-app-accent">
            <Check className="h-4 w-4" />
            {saleEvent.name}
          </p>
          {saleEvent.discountPercent && (
            <p className="mt-1 text-xs text-app-ink-muted">
              Giảm {saleEvent.discountPercent}% — còn {formatVndAmount(finalAmount)}
            </p>
          )}
          {saleEvent.discountValue && !saleEvent.discountPercent && (
            <p className="mt-1 text-xs text-app-ink-muted">
              Giảm {formatVndAmount(saleEvent.discountValue)} — còn {formatVndAmount(finalAmount)}
            </p>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            placeholder="Nhập mã giảm giá"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value.toUpperCase())}
            onKeyDown={handleKeyDown}
            disabled={status === "loading"}
            className={`pr-8 uppercase ${
              status === "valid"
                ? "border-app-status-success/50 focus-visible:ring-app-status-success/30"
                : status === "invalid"
                  ? "border-app-status-error/50 focus-visible:ring-app-status-error/30"
                  : ""
            }`}
          />
          {status === "loading" && (
            <Loader2 className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-app-ink-muted" />
          )}
          {status === "valid" && (
            <Check className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-app-status-success" />
          )}
          {status === "invalid" && (
            <X className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-app-status-error" />
          )}
        </div>
        {status === "valid" || (inputValue && status !== "loading") ? (
          <Button variant="outline" size="sm" onClick={handleClear} className="shrink-0">
            Xóa
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleApply}
            disabled={!inputValue.trim() || status === "loading"}
            className="shrink-0"
          >
            {status === "loading" ? "Đang kiểm tra…" : "Áp dụng"}
          </Button>
        )}
      </div>

      {status === "invalid" && error && (
        <p className="mt-2 text-xs text-app-status-error">{error}</p>
      )}

      {status === "valid" && effectiveDiscount && bestSource === "coupon" && (
        <div className="mt-3 rounded-card border border-app-status-success/30 bg-app-status-success/8 p-3">
          <p className="flex items-center gap-2 text-sm font-medium text-app-status-success">
            <Check className="h-4 w-4" />
            {effectiveDiscount.discountName ?? "Mã giảm giá hợp lệ"}
          </p>
          {effectiveDiscount.discountPercent !== undefined && (
            <p className="mt-1 text-xs text-app-ink-muted">
              Giảm {effectiveDiscount.discountPercent}%
            </p>
          )}
          {effectiveDiscount.discountAmount && (
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-sm text-app-ink-muted line-through">
                {formatVndAmount(originalAmount)}
              </span>
              <span className="text-lg font-semibold text-app-status-success">
                {formatVndAmount(finalAmount)}
              </span>
            </div>
          )}
        </div>
      )}

      {status === "valid" && effectiveDiscount && bestSource === "sale_event" && hasSaleEvent && (
        <div className="mt-3 rounded-card border border-app-accent/30 bg-app-accent-soft/40 p-3">
          <p className="flex items-center gap-2 text-sm font-medium text-app-accent">
            <Check className="h-4 w-4" />
            {saleEvent?.name} (áp dụng thay mã giảm giá)
          </p>
          <div className="mt-2 flex items-baseline gap-2">
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
        <div className="mt-3 flex items-baseline gap-2">
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
            <Check className="h-4 w-4" />
            Đang có ưu đãi {envPercent}%
          </p>
          <div className="mt-2 flex items-baseline gap-2">
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
