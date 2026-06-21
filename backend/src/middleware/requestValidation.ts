import type { Request, RequestHandler } from "express";

import type { BillingCycle } from "../services/billingService";
import { ApiError } from "../utils/apiError";

const OBJECT_ID_REGEX = /^[a-fA-F0-9]{24}$/;
const ORDER_ID_REGEX = /^VB[A-Z0-9]{8}$/;
const WEBHOOK_PROVIDER_REGEX = /^[a-z][a-z0-9_-]{0,31}$/;
const SUPPORTED_BILLING_CYCLES = new Set<BillingCycle>([
  "monthly",
  "quarterly",
  "yearly",
  "lifetime",
  "twelve_week",
]);
const SUPPORTED_CHECKOUT_PLANS = new Set(["PLUS"]);
const MAX_URL_LENGTH = 2048;
const MAX_LOCALE_LENGTH = 20;
const MAX_CLIENT_USER_ID_LENGTH = 128;
const CLIENT_USER_ID_REGEX = /^[A-Za-z0-9._:-]{4,128}$/;
const MAX_COUPON_CODE_LENGTH = 50;
const COUPON_CODE_REGEX = /^[A-Za-z0-9_-]+$/;
const MAX_PROFILE_PATCH_FIELDS = 12;
const MAX_RECEIPT_EMAIL_LENGTH = 254;
const MAX_RECEIPT_NAME_LENGTH = 120;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_CASSO_TRANSACTIONS = 100;
const MAX_CASSO_DESCRIPTION_LENGTH = 512;
const MAX_CASSO_ID_LENGTH = 128;
const MAX_CASSO_SHORT_FIELD_LENGTH = 128;

type BodyRecord = Record<string, unknown>;

function isBodyRecord(value: unknown): value is BodyRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireJsonObjectBody(req: Request): BodyRecord {
  if (!isBodyRecord(req.body)) {
    throw new ApiError(400, "Request body must be a JSON object.", undefined, "invalid_payload");
  }

  return req.body;
}

function ensureOptionalJsonObjectBody(req: Request): BodyRecord {
  if (req.body === undefined) {
    req.body = {};
  }

  return requireJsonObjectBody(req);
}

function normalizeHttpUrl(value: unknown, fieldName: "returnUrl" | "cancelUrl"): string {
  if (typeof value !== "string") {
    throw new ApiError(
      400,
      `${fieldName} is required and must be a valid HTTP/HTTPS URL.`,
      undefined,
      fieldName === "returnUrl" ? "invalid_return_url" : "invalid_cancel_url",
    );
  }

  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_URL_LENGTH) {
    throw new ApiError(
      400,
      `${fieldName} is required and must be a valid HTTP/HTTPS URL.`,
      undefined,
      fieldName === "returnUrl" ? "invalid_return_url" : "invalid_cancel_url",
    );
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Unsupported protocol");
    }
    return url.toString();
  } catch {
    throw new ApiError(
      400,
      `${fieldName} is required and must be a valid HTTP/HTTPS URL.`,
      undefined,
      fieldName === "returnUrl" ? "invalid_return_url" : "invalid_cancel_url",
    );
  }
}

function normalizeOptionalHttpUrl(value: unknown, fieldName: "returnUrl"): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return normalizeHttpUrl(value, fieldName);
}

function normalizeOptionalLocale(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    throw new ApiError(400, "locale must be a string.", undefined, "invalid_locale");
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed.length > MAX_LOCALE_LENGTH) {
    throw new ApiError(400, "locale is too long.", undefined, "invalid_locale");
  }

  return trimmed;
}

function normalizeBillingCycle(value: unknown): BillingCycle {
  if (value === undefined || value === null || value === "") return "twelve_week";
  if (typeof value !== "string") {
    throw new ApiError(400, "billingCycle must be a string.", undefined, "invalid_billing_cycle");
  }

  const normalized = value.trim() as BillingCycle;
  if (!SUPPORTED_BILLING_CYCLES.has(normalized)) {
    throw new ApiError(400, "billingCycle is not supported.", undefined, "invalid_billing_cycle");
  }

  return normalized;
}

function normalizeClientUserId(value: unknown): string {
  if (typeof value !== "string") {
    throw new ApiError(400, "clientUserId is required.", undefined, "invalid_client_user_id");
  }

  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_CLIENT_USER_ID_LENGTH || !CLIENT_USER_ID_REGEX.test(trimmed)) {
    throw new ApiError(400, "clientUserId is invalid.", undefined, "invalid_client_user_id");
  }

  return trimmed;
}

function normalizeOptionalReceiptEmail(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    throw new ApiError(400, "receiptEmail must be a valid email address.", undefined, "invalid_receipt_email");
  }

  const trimmed = value.trim().toLowerCase();
  if (trimmed.length === 0) return undefined;
  if (trimmed.length > MAX_RECEIPT_EMAIL_LENGTH || !EMAIL_REGEX.test(trimmed)) {
    throw new ApiError(400, "receiptEmail must be a valid email address.", undefined, "invalid_receipt_email");
  }

  return trimmed;
}

function normalizeOptionalReceiptName(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    throw new ApiError(400, "receiptName must be a string.", undefined, "invalid_receipt_name");
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  return trimmed.slice(0, MAX_RECEIPT_NAME_LENGTH);
}

function normalizeOptionalCouponCode(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    throw new ApiError(400, "couponCode must be a string.", undefined, "invalid_coupon_code");
  }

  const trimmed = value.trim().toUpperCase();
  if (trimmed.length === 0) return undefined;
  if (trimmed.length > MAX_COUPON_CODE_LENGTH || !COUPON_CODE_REGEX.test(trimmed)) {
    throw new ApiError(400, "couponCode contains invalid characters.", undefined, "invalid_coupon_code");
  }

  return trimmed;
}

function normalizeStringField(
  body: BodyRecord,
  fieldName: string,
  maxLength: number,
): void {
  const value = body[fieldName];
  if (value === undefined || value === null) return;
  if (typeof value !== "string") {
    throw new ApiError(400, `${fieldName} must be a string.`, undefined, "invalid_payload");
  }

  body[fieldName] = value.trim().slice(0, maxLength);
}

function validateFiniteNumber(value: unknown, label: string): number {
  const parsed = typeof value === "string" ? Number(value.trim()) : value;
  if (typeof parsed !== "number" || !Number.isFinite(parsed)) {
    throw new ApiError(400, `${label} must be a finite number.`, undefined, "invalid_payload");
  }

  return parsed;
}

function validateOptionalStringLikeId(value: unknown, label: string): string | number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string" && typeof value !== "number") {
    throw new ApiError(400, `${label} must be a string or number.`, undefined, "invalid_payload");
  }

  if (String(value).trim().length > MAX_CASSO_ID_LENGTH) {
    throw new ApiError(400, `${label} is too long.`, undefined, "invalid_payload");
  }

  return typeof value === "string" ? value.trim() : value;
}

function validateOptionalShortString(value: unknown, label: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    throw new ApiError(400, `${label} must be a string.`, undefined, "invalid_payload");
  }

  const trimmed = value.trim();
  if (trimmed.length > MAX_CASSO_SHORT_FIELD_LENGTH) {
    throw new ApiError(400, `${label} is too long.`, undefined, "invalid_payload");
  }

  return trimmed;
}

function sanitizeCassoTransaction(value: unknown, index: number): BodyRecord {
  if (!isBodyRecord(value)) {
    throw new ApiError(400, `data[${index}] must be an object.`, undefined, "invalid_payload");
  }

  const transaction: BodyRecord = { ...value };

  const id = validateOptionalStringLikeId(transaction.id, `data[${index}].id`);
  if (id !== undefined) transaction.id = id;

  const tid = validateOptionalShortString(transaction.tid, `data[${index}].tid`);
  if (tid !== undefined) transaction.tid = tid;

  const reference = validateOptionalShortString(transaction.reference, `data[${index}].reference`);
  if (reference !== undefined) transaction.reference = reference;

  const bankSubAccountId = validateOptionalShortString(
    transaction.bank_sub_acc_id,
    `data[${index}].bank_sub_acc_id`,
  );
  if (bankSubAccountId !== undefined) transaction.bank_sub_acc_id = bankSubAccountId;

  const when = validateOptionalShortString(transaction.when, `data[${index}].when`);
  if (when !== undefined) transaction.when = when;

  if (transaction.description !== undefined && transaction.description !== null) {
    if (typeof transaction.description !== "string") {
      throw new ApiError(400, `data[${index}].description must be a string.`, undefined, "invalid_payload");
    }
    const description = transaction.description.trim();
    if (description.length > MAX_CASSO_DESCRIPTION_LENGTH) {
      throw new ApiError(400, `data[${index}].description is too long.`, undefined, "invalid_payload");
    }
    transaction.description = description;
  }

  if (transaction.amount !== undefined && transaction.amount !== null) {
    transaction.amount = validateFiniteNumber(transaction.amount, `data[${index}].amount`);
  }

  return transaction;
}

export const validateJsonObjectBody: RequestHandler = (req, _res, next) => {
  requireJsonObjectBody(req);
  next();
};

export const validateOptionalJsonObjectBody: RequestHandler = (req, _res, next) => {
  ensureOptionalJsonObjectBody(req);
  next();
};

export function validateObjectIdParam(paramName: string, label = paramName): RequestHandler {
  return (req, _res, next) => {
    const value = req.params[paramName];
    if (typeof value !== "string" || !OBJECT_ID_REGEX.test(value.trim())) {
      throw new ApiError(400, `${label} must be a valid ObjectId.`, undefined, "invalid_object_id");
    }

    req.params[paramName] = value.trim();
    next();
  };
}

export const validateOrderIdParam: RequestHandler = (req, _res, next) => {
  const rawOrderId = req.params.orderId;
  const normalizedOrderId = typeof rawOrderId === "string" ? rawOrderId.trim().toUpperCase() : "";

  if (!ORDER_ID_REGEX.test(normalizedOrderId)) {
    throw new ApiError(400, "orderId không hợp lệ.", undefined, "invalid_order_id");
  }

  req.params.orderId = normalizedOrderId;
  next();
};

export const validateWebhookProviderParam: RequestHandler = (req, _res, next) => {
  const rawProvider = req.params.provider;
  const provider = typeof rawProvider === "string" ? rawProvider.trim().toLowerCase() : "";

  if (!WEBHOOK_PROVIDER_REGEX.test(provider)) {
    throw new ApiError(400, "Invalid webhook provider parameter.", undefined, "invalid_provider");
  }

  req.params.provider = provider;
  next();
};

export const validateCheckoutSessionInput: RequestHandler = (req, _res, next) => {
  const body = requireJsonObjectBody(req);
  const planCode = typeof body.planCode === "string" ? body.planCode.trim().toUpperCase() : "";

  if (!SUPPORTED_CHECKOUT_PLANS.has(planCode)) {
    throw new ApiError(400, "Invalid planCode. Allowed: PLUS.", undefined, "invalid_plan_code");
  }

  req.body = {
    ...body,
    planCode,
    returnUrl: normalizeHttpUrl(body.returnUrl, "returnUrl"),
    cancelUrl: normalizeHttpUrl(body.cancelUrl, "cancelUrl"),
    billingCycle: normalizeBillingCycle(body.billingCycle),
    locale: normalizeOptionalLocale(body.locale),
    receiptEmail: normalizeOptionalReceiptEmail(body.receiptEmail),
    receiptName: normalizeOptionalReceiptName(body.receiptName),
    couponCode: normalizeOptionalCouponCode(body.couponCode),
  };

  next();
};

export const validatePublicCheckoutSessionInput: RequestHandler = (req, _res, next) => {
  const body = requireJsonObjectBody(req);
  const planCode = typeof body.planCode === "string" ? body.planCode.trim().toUpperCase() : "";

  if (!SUPPORTED_CHECKOUT_PLANS.has(planCode)) {
    throw new ApiError(400, "Invalid planCode. Allowed: PLUS.", undefined, "invalid_plan_code");
  }

  req.body = {
    ...body,
    planCode,
    returnUrl: normalizeHttpUrl(body.returnUrl, "returnUrl"),
    cancelUrl: normalizeHttpUrl(body.cancelUrl, "cancelUrl"),
    billingCycle: normalizeBillingCycle(body.billingCycle),
    locale: normalizeOptionalLocale(body.locale),
    clientUserId: normalizeClientUserId(body.clientUserId),
    receiptEmail: normalizeOptionalReceiptEmail(body.receiptEmail),
    receiptName: normalizeOptionalReceiptName(body.receiptName),
    couponCode: normalizeOptionalCouponCode(body.couponCode),
  };

  next();
};

export const validateCustomerPortalInput: RequestHandler = (req, _res, next) => {
  const body = ensureOptionalJsonObjectBody(req);
  req.body = {
    ...body,
    returnUrl: normalizeOptionalHttpUrl(body.returnUrl, "returnUrl"),
  };
  next();
};

export const validateProfilePatchInput: RequestHandler = (req, _res, next) => {
  const body = requireJsonObjectBody(req);

  if (Object.keys(body).length > MAX_PROFILE_PATCH_FIELDS) {
    throw new ApiError(400, "Profile update payload has too many fields.", undefined, "invalid_payload");
  }

  normalizeStringField(body, "displayName", 100);
  normalizeStringField(body, "avatarUrl", 500);
  normalizeStringField(body, "locale", 10);
  normalizeStringField(body, "onboardingCompletedAt", 64);
  normalizeStringField(body, "termsAcceptedAt", 64);

  next();
};

export const validateCassoWebhookPayload: RequestHandler = (req, _res, next) => {
  const body = requireJsonObjectBody(req);
  const errorCode = typeof body.error === "string" ? Number(body.error.trim()) : body.error;

  if (typeof errorCode !== "number" || !Number.isFinite(errorCode)) {
    throw new ApiError(400, "Casso payload error code must be a number.", undefined, "invalid_payload");
  }
  body.error = errorCode;

  if (body.data !== undefined) {
    const transactions = Array.isArray(body.data) ? body.data : [body.data];

    if (transactions.length > MAX_CASSO_TRANSACTIONS) {
      throw new ApiError(400, "Casso payload contains too many transactions.", undefined, "invalid_payload");
    }

    body.data = transactions.map(sanitizeCassoTransaction);
  }

  next();
};
