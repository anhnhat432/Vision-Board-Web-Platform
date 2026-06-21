import type { Request, Response } from "express";

import { CouponUsageModel } from "../models/CouponUsageModel";
import { DiscountModel } from "../models/DiscountModel";
import type { DiscountAppliesTo, DiscountType, DiscountValueType } from "../models/DiscountModel";
import { getActiveSaleEvent, validateCoupon } from "../services/discountService";
import { ApiError } from "../utils/apiError";
import { successResponse } from "../utils/apiResponse";

const VALID_DISCOUNT_TYPES: DiscountType[] = ["coupon", "sale_event"];
const VALID_DISCOUNT_VALUE_TYPES: DiscountValueType[] = ["percentage", "fixed"];
const VALID_APPLIES_TO: DiscountAppliesTo[] = ["PLUS", "physical_order"];
const MAX_DISCOUNT_NAME_LENGTH = 200;
const MAX_DISCOUNT_CODE_LENGTH = 50;

async function listDiscounts(req: Request, res: Response): Promise<void> {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const type = typeof req.query.type === "string" ? req.query.type.trim() : undefined;
  const active = req.query.active !== undefined ? req.query.active !== "false" : undefined;
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit ?? "20"), 10) || 20));

  const filter: Record<string, unknown> = {};

  if (q) {
    const regex = { $regex: q, $options: "i" };
    filter.$or = [{ code: regex }, { name: regex }];
  }

  if (type && VALID_DISCOUNT_TYPES.includes(type as DiscountType)) {
    filter.type = type;
  }

  if (active !== undefined) {
    filter.active = active;
  }

  const total = await DiscountModel.countDocuments(filter);
  const items = await DiscountModel.find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  res.status(200).json(
    successResponse({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }),
  );
}

async function createDiscount(req: Request, res: Response): Promise<void> {
  const body = req.body ?? {};

  const type = body.type;
  if (!type || !VALID_DISCOUNT_TYPES.includes(type)) {
    throw new ApiError(400, "type must be 'coupon' or 'sale_event'.", undefined, "invalid_discount_type");
  }

  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  if (!code || code.length > MAX_DISCOUNT_CODE_LENGTH) {
    throw new ApiError(400, "code is required and must be <= 50 characters.", undefined, "invalid_code");
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name || name.length > MAX_DISCOUNT_NAME_LENGTH) {
    throw new ApiError(400, "name is required and must be <= 200 characters.", undefined, "invalid_name");
  }

  const discountType = body.discountType;
  if (!discountType || !VALID_DISCOUNT_VALUE_TYPES.includes(discountType)) {
    throw new ApiError(400, "discountType must be 'percentage' or 'fixed'.", undefined, "invalid_discount_type");
  }

  const discountValue = Number(body.discountValue);
  if (!Number.isFinite(discountValue) || discountValue < 0) {
    throw new ApiError(400, "discountValue must be a non-negative number.", undefined, "invalid_discount_value");
  }

  if (discountType === "percentage" && discountValue > 100) {
    throw new ApiError(400, "Percentage discount cannot exceed 100%.", undefined, "invalid_discount_value");
  }

  const startsAt = body.startsAt ? new Date(body.startsAt) : new Date();
  if (isNaN(startsAt.getTime())) {
    throw new ApiError(400, "startsAt must be a valid date.", undefined, "invalid_starts_at");
  }

  const endsAt = body.endsAt ? new Date(body.endsAt) : undefined;
  if (endsAt !== undefined && isNaN(endsAt.getTime())) {
    throw new ApiError(400, "endsAt must be a valid date.", undefined, "invalid_ends_at");
  }

  const minAmount = body.minAmount !== undefined && body.minAmount !== null ? Number(body.minAmount) : undefined;
  if (minAmount !== undefined && (!Number.isFinite(minAmount) || minAmount < 0)) {
    throw new ApiError(400, "minAmount must be a non-negative number.", undefined, "invalid_min_amount");
  }

  const maxUses = body.maxUses !== undefined && body.maxUses !== null ? Number(body.maxUses) : undefined;
  if (maxUses !== undefined && (!Number.isFinite(maxUses) || maxUses < 1)) {
    throw new ApiError(400, "maxUses must be >= 1.", undefined, "invalid_max_uses");
  }

  let appliesTo: DiscountAppliesTo[] = ["PLUS", "physical_order"];
  if (Array.isArray(body.appliesTo)) {
    appliesTo = body.appliesTo.filter((v: unknown) => VALID_APPLIES_TO.includes(v as DiscountAppliesTo));
    if (appliesTo.length === 0) {
      appliesTo = ["PLUS", "physical_order"];
    }
  }

  const existing = await DiscountModel.findOne({ code });
  if (existing) {
    throw new ApiError(409, `Discount code "${code}" already exists.`, undefined, "duplicate_code");
  }

  const createdBy = typeof body.createdBy === "string" ? body.createdBy.trim().slice(0, 254) : undefined;

  const discount = await DiscountModel.create({
    type,
    code,
    name,
    discountType,
    discountValue,
    minAmount,
    maxUses,
    startsAt,
    endsAt,
    appliesTo,
    active: body.active !== false,
    createdBy,
  });

  res.status(201).json(successResponse(discount.toObject()));
}

async function updateDiscount(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const body = req.body ?? {};

  const discount = await DiscountModel.findById(id);
  if (!discount) {
    throw new ApiError(404, "Discount not found.", undefined, "not_found");
  }

  if (body.code !== undefined) {
    const newCode = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    if (!newCode || newCode.length > MAX_DISCOUNT_CODE_LENGTH) {
      throw new ApiError(400, "code must be a non-empty string <= 50 chars.", undefined, "invalid_code");
    }
    const existing = await DiscountModel.findOne({ code: newCode, _id: { $ne: id } });
    if (existing) {
      throw new ApiError(409, `Discount code "${newCode}" already exists.`, undefined, "duplicate_code");
    }
    discount.code = newCode;
  }

  if (body.name !== undefined) {
    const newName = typeof body.name === "string" ? body.name.trim() : "";
    if (!newName || newName.length > MAX_DISCOUNT_NAME_LENGTH) {
      throw new ApiError(400, "name must be a non-empty string <= 200 chars.", undefined, "invalid_name");
    }
    discount.name = newName;
  }

  if (body.discountType !== undefined) {
    if (!VALID_DISCOUNT_VALUE_TYPES.includes(body.discountType)) {
      throw new ApiError(400, "discountType must be 'percentage' or 'fixed'.", undefined, "invalid_discount_type");
    }
    discount.discountType = body.discountType;
  }

  if (body.discountValue !== undefined) {
    const val = Number(body.discountValue);
    if (!Number.isFinite(val) || val < 0) {
      throw new ApiError(400, "discountValue must be a non-negative number.", undefined, "invalid_discount_value");
    }
    if (discount.discountType === "percentage" && val > 100) {
      throw new ApiError(400, "Percentage discount cannot exceed 100%.", undefined, "invalid_discount_value");
    }
    discount.discountValue = val;
  }

  if (body.startsAt !== undefined) {
    const date = new Date(body.startsAt);
    if (isNaN(date.getTime())) {
      throw new ApiError(400, "startsAt must be a valid date.", undefined, "invalid_starts_at");
    }
    discount.startsAt = date;
  }

  if (body.endsAt !== undefined) {
    discount.endsAt = body.endsAt ? new Date(body.endsAt) : null;
    if (discount.endsAt && isNaN(discount.endsAt.getTime())) {
      throw new ApiError(400, "endsAt must be a valid date.", undefined, "invalid_ends_at");
    }
  }

  if (body.minAmount !== undefined) {
    if (body.minAmount !== null) {
      const val = Number(body.minAmount);
      if (!Number.isFinite(val) || val < 0) {
        throw new ApiError(400, "minAmount must be a non-negative number.", undefined, "invalid_min_amount");
      }
      discount.minAmount = val;
    } else {
      discount.minAmount = null;
    }
  }

  if (body.maxUses !== undefined) {
    if (body.maxUses !== null) {
      const val = Number(body.maxUses);
      if (!Number.isFinite(val) || val < 1) {
        throw new ApiError(400, "maxUses must be >= 1.", undefined, "invalid_max_uses");
      }
      discount.maxUses = val;
    } else {
      discount.maxUses = null;
    }
  }

  if (Array.isArray(body.appliesTo)) {
    const filtered = body.appliesTo.filter((v: unknown) => VALID_APPLIES_TO.includes(v as DiscountAppliesTo));
    discount.appliesTo = filtered.length > 0 ? filtered : ["PLUS", "physical_order"];
  }

  if (body.active !== undefined) {
    discount.active = Boolean(body.active);
  }

  discount.updatedAt = new Date();
  await discount.save();

  res.status(200).json(successResponse(discount.toObject()));
}

async function deleteDiscount(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const discount = await DiscountModel.findById(id);
  if (!discount) {
    throw new ApiError(404, "Discount not found.", undefined, "not_found");
  }

  discount.active = false;
  discount.updatedAt = new Date();
  await discount.save();

  res.status(200).json(successResponse({ id, active: false }, "Discount deactivated."));
}

async function getCouponUsages(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit ?? "20"), 10) || 20));

  const discount = await DiscountModel.findById(id);
  if (!discount) {
    throw new ApiError(404, "Discount not found.", undefined, "not_found");
  }

  const total = await CouponUsageModel.countDocuments({ discountId: id });
  const items = await CouponUsageModel.find({ discountId: id })
    .sort({ usedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();

  res.status(200).json(
    successResponse({
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }),
  );
}

async function getActiveSaleEventInfo(_req: Request, res: Response): Promise<void> {
  const sale = await getActiveSaleEvent();
  if (!sale) {
    res.status(200).json(successResponse({ active: false }));
    return;
  }

  res.status(200).json(
    successResponse({
      active: true,
      id: String(sale._id),
      code: sale.code,
      name: sale.name,
      discountType: sale.discountType,
      discountValue: sale.discountValue,
      startsAt: sale.startsAt,
      endsAt: sale.endsAt,
    }),
  );
}

async function validateCouponHandler(req: Request, res: Response): Promise<void> {
  const body = req.body ?? {};
  const rawCode = typeof body.code === "string" ? body.code.trim() : "";

  if (!rawCode) {
    throw new ApiError(400, "code is required.", undefined, "invalid_code");
  }

  const MAX_COUPON_CODE = 50;
  const COUPON_REGEX = /^[A-Za-z0-9_-]+$/;

  if (rawCode.length > MAX_COUPON_CODE || !COUPON_REGEX.test(rawCode)) {
    throw new ApiError(400, "Mã giảm giá không hợp lệ.", undefined, "invalid_coupon_code");
  }

  const code = rawCode.toUpperCase();
  const planCode = typeof body.planCode === "string" ? body.planCode.trim() : "PLUS";
  const purpose = typeof body.purpose === "string" ? body.purpose.trim() : undefined;

  const userId = req.user?.uid;
  const result = await validateCoupon(code, planCode, purpose, userId);

  if (!result.valid) {
    result.reason = "Mã giảm giá không hợp lệ hoặc đã hết hạn.";
  }

  res.status(200).json(successResponse(result));
}

export {
  listDiscounts,
  createDiscount,
  updateDiscount,
  deleteDiscount,
  getCouponUsages,
  getActiveSaleEventInfo,
  validateCouponHandler,
};
