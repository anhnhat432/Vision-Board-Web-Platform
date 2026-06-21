import { CouponUsageModel } from "../models/CouponUsageModel";
import { DiscountModel, type DiscountDocument, type DiscountAppliesTo } from "../models/DiscountModel";

export interface DiscountInfo {
  valid: boolean;
  discountPercent?: number;
  discountAmount?: number;
  discountValue?: number;
  discountType?: "percentage" | "fixed";
  discountCode?: string;
  discountId?: string;
  discountName?: string;
  minAmount?: number;
  originalAmount?: number;
  finalAmount?: number;
  reason?: string;
}

export interface AppliedDiscount {
  source: "coupon" | "sale_event" | "env_fallback" | "none";
  discountPercent?: number;
  discountAmount?: number;
  discountType?: "percentage" | "fixed";
  discountCode?: string;
  discountId?: string;
  discountName?: string;
}

function getEnvDiscountPercent(): number | null {
  const raw = process.env.DISCOUNT_PERCENT?.trim();
  if (!raw) return null;
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) && value > 0 && value <= 100 ? value : null;
}

function isDateActive(startsAt: Date, endsAt: Date | null | undefined, now: Date): boolean {
  if (now < startsAt) return false;
  if (endsAt && now > endsAt) return false;
  return true;
}

function mapAppliesTo(purpose?: string): DiscountAppliesTo {
  if (purpose === "physical_order") return "physical_order";
  return "PLUS";
}

export async function getActiveSaleEvent(
  purpose?: string,
): Promise<DiscountDocument | null> {
  const now = new Date();
  const appliesTo = purpose ? mapAppliesTo(purpose) : undefined;

  const filter: Record<string, unknown> = {
    type: "sale_event",
    active: true,
    startsAt: { $lte: now },
  };

  if (appliesTo) {
    filter.appliesTo = appliesTo;
  }

  const candidates = await DiscountModel.find(filter)
    .sort({ discountValue: -1 })
    .lean<DiscountDocument[]>();

  return candidates.find((s) => isDateActive(s.startsAt, s.endsAt, now)) ?? null;
}

function calculateDiscountAmount(
  originalAmount: number,
  discountType: "percentage" | "fixed",
  discountValue: number,
): number {
  if (discountType === "percentage") {
    return Math.round(originalAmount * discountValue / 100);
  }
  return Math.min(discountValue, originalAmount);
}

export function resolveBestDiscount(
  coupon: AppliedDiscount | null,
  sale: AppliedDiscount | null,
): AppliedDiscount {
  if (!coupon && !sale) return { source: "none" };
  if (!coupon) return sale!;
  if (!sale) return coupon;

  const couponAmount = coupon.discountAmount ?? 0;
  const saleAmount = sale.discountAmount ?? 0;
  return couponAmount >= saleAmount ? coupon : sale;
}

export function calculateDiscountedAmount(
  originalAmount: number,
  discount: AppliedDiscount,
): { finalAmount: number; discountAmount: number } {
  if (discount.source === "none" || !discount.discountAmount) {
    return { finalAmount: originalAmount, discountAmount: 0 };
  }

  const finalAmount = Math.max(originalAmount - discount.discountAmount, 0);
  return { finalAmount, discountAmount: discount.discountAmount };
}

export async function validateCoupon(
  code: string,
  planCode: string,
  purpose?: string,
  userId?: string,
): Promise<DiscountInfo> {
  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) {
    return { valid: false, reason: "Vui lòng nhập mã giảm giá." };
  }

  const discount = await DiscountModel.findOne({
    type: "coupon",
    code: normalizedCode,
    active: true,
  }).lean<DiscountDocument>();

  if (!discount) {
    return { valid: false, reason: "Mã giảm giá không tồn tại hoặc đã hết hạn." };
  }

  const now = new Date();
  if (!isDateActive(discount.startsAt, discount.endsAt, now)) {
    return { valid: false, reason: "Mã giảm giá đã hết hạn." };
  }

  const appliesTo = mapAppliesTo(purpose);
  if (!discount.appliesTo.includes(appliesTo)) {
    return {
      valid: false,
      reason: "Mã giảm giá không áp dụng cho sản phẩm này.",
    };
  }

  if (discount.maxUses !== null && discount.maxUses !== undefined && discount.usedCount >= discount.maxUses) {
    return { valid: false, reason: "Mã giảm giá đã hết lượt sử dụng." };
  }

  if (userId) {
    const existingUsage = await CouponUsageModel.findOne({
      discountId: discount._id,
      userId,
    }).lean();

    if (existingUsage) {
      return { valid: false, reason: "Bạn đã sử dụng mã giảm giá này rồi." };
    }
  }

  return {
    valid: true,
    discountPercent: discount.discountType === "percentage" ? discount.discountValue : undefined,
    discountType: discount.discountType,
    discountValue: discount.discountValue,
    discountCode: discount.code,
    discountId: String(discount._id),
    discountName: discount.name,
    minAmount: discount.minAmount ?? undefined,
  };
}

export async function resolveDiscountForCheckout(
  originalAmount: number,
  planCode: string,
  purpose?: string,
  couponCode?: string,
  userId?: string,
): Promise<{ appliedDiscount: AppliedDiscount; finalAmount: number; discountInfo?: DiscountInfo }> {
  const sale = await getActiveSaleEvent(purpose);
  const envPercent = getEnvDiscountPercent();

  let saleApplied: AppliedDiscount | null = null;
  if (sale) {
    const discountAmount = calculateDiscountAmount(originalAmount, sale.discountType, sale.discountValue);
    saleApplied = {
      source: "sale_event",
      discountPercent: sale.discountType === "percentage" ? sale.discountValue : undefined,
      discountAmount,
      discountType: sale.discountType,
      discountCode: sale.code,
      discountId: String(sale._id),
      discountName: sale.name,
    };
  } else if (envPercent) {
    const discountAmount = calculateDiscountAmount(originalAmount, "percentage", envPercent);
    saleApplied = {
      source: "env_fallback",
      discountPercent: envPercent,
      discountAmount,
      discountType: "percentage",
    };
  }

  let couponApplied: AppliedDiscount | null = null;
  let discountInfo: DiscountInfo | undefined;

  if (couponCode) {
    const validation = await validateCoupon(couponCode, planCode, purpose, userId);
    if (validation.valid && validation.discountType && validation.discountValue !== undefined) {
      const minAmount = validation.minAmount ?? 0;
      if (originalAmount < minAmount) {
        discountInfo = {
          valid: false,
          reason: `Đơn hàng tối thiểu ${minAmount.toLocaleString("vi-VN")} ₫ để áp dụng mã này.`,
        };
        couponApplied = null;
      } else {
        const discountAmount = calculateDiscountAmount(originalAmount, validation.discountType, validation.discountValue);

        if (originalAmount - discountAmount < 1000) {
          discountInfo = {
            valid: false,
            reason: "Số tiền sau giảm không được thấp hơn 1.000 ₫.",
          };
          couponApplied = null;
        } else {
          couponApplied = {
            source: "coupon",
            discountPercent: validation.discountType === "percentage" ? validation.discountValue : undefined,
            discountAmount,
            discountType: validation.discountType,
            discountCode: validation.discountCode,
            discountId: validation.discountId,
            discountName: validation.discountName,
          };

          discountInfo = {
            valid: true,
            discountPercent: validation.discountType === "percentage" ? validation.discountValue : undefined,
            discountAmount,
            discountType: validation.discountType,
            discountCode: validation.discountCode,
            discountId: validation.discountId,
            discountName: validation.discountName,
            originalAmount,
            finalAmount: originalAmount - discountAmount,
          };
        }
      }
    } else {
      discountInfo = validation;
    }
  }

  const best = resolveBestDiscount(couponApplied, saleApplied);
  const { finalAmount, discountAmount } = calculateDiscountedAmount(originalAmount, best);

  const finalAmountSafe = Math.max(finalAmount, 1000);

  return {
    appliedDiscount: { ...best, discountAmount },
    finalAmount: finalAmountSafe,
    discountInfo,
  };
}

export async function recordCouponUsage(
  discountId: string,
  code: string,
  userId: string,
  orderId: string,
): Promise<boolean> {
  try {
    const updated = await DiscountModel.findOneAndUpdate(
      {
        _id: discountId,
        type: "coupon",
        active: true,
        $expr: {
          $cond: {
            if: { $eq: ["$maxUses", null] },
            then: true,
            else: { $gt: ["$maxUses", "$usedCount"] },
          },
        },
      },
      { $inc: { usedCount: 1 } },
      { new: false },
    );

    if (!updated) {
      return false;
    }

    await CouponUsageModel.create({
      discountId,
      code,
      userId,
      orderId,
    });

    return true;
  } catch {
    return false;
  }
}
