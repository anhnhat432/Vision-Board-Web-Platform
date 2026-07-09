import type { Request, Response } from "express";

import { billingService } from "../services/billingServiceInstance";
import { getPaymentProviderAdapter } from "../services/paymentProviderRegistry";
import { PaymentProviderNotConfiguredError } from "../services/paymentProviderAdapter";
import { resolveDiscountForCheckout, recordCouponUsage, normalizeCouponCode } from "../services/discountService";
import { CouponUsageModel } from "../models/CouponUsageModel";
import { ApiError } from "../utils/apiError";
import { successResponse } from "../utils/apiResponse";
import { requireAuthUser } from "./controllerHelpers";

const ALLOWED_PLAN_CODES = new Set(["PLUS"]);

/**
 * Whether paid checkout is administratively disabled via env kill-switch.
 *
 * When `BILLING_PAID_DISABLED=1` (or `true`/`yes`/`on`):
 * - `/billing/checkout-session` and `/billing/public-checkout-session` return 503
 *   `checkout_disabled` without invoking the payment provider adapter.
 * - The frontend kill-switch (`VITE_BILLING_PAID_CHECKOUT_DISABLED`) provides the
 *   primary UX guard; this is defense-in-depth in case a stale frontend bundle
 *   is still served while ops disable paid checkout.
 *
 * Independent of `BILLING_PROVIDER` so a stale Casso config or a not-yet-ready
 * PayOS adapter cannot leak unsafe checkout to real users.
 */
function isPaidCheckoutDisabled(): boolean {
  const raw = process.env.BILLING_PAID_DISABLED?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

const PAID_CHECKOUT_DISABLED_MESSAGE =
  "Paid checkout is temporarily disabled. Please contact support to upgrade manually.";
const DEFAULT_SUPPORT_EMAIL = "support@dearourfuture.com";

function getBillingSupportEmail(): string {
  return (
    process.env.BILLING_SUPPORT_EMAIL?.trim() ||
    process.env.SUPPORT_EMAIL?.trim() ||
    process.env.VITE_BILLING_SUPPORT_EMAIL?.trim() ||
    DEFAULT_SUPPORT_EMAIL
  );
}

function isValidHttpUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isOriginAllowed(url: string, allowedOrigins: string | undefined): boolean {
  if (!allowedOrigins) return true; // No origin restriction configured
  try {
    const inputOrigin = new URL(url).origin;
    return allowedOrigins
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean)
      .some((origin) => new URL(origin).origin === inputOrigin);
  } catch {
    return false;
  }
}

function getPublicCheckoutUserId(clientUserId: string): string {
  return `public:${clientUserId}`;
}

function getPlusPriceFromEnv(): number {
  return Number.parseInt(process.env.PLUS_PRICE_VND?.trim() ?? "99000", 10);
}

interface DiscountMetadata {
  couponCode?: string;
  discountId?: string;
  discountName?: string;
  discountPercent?: number;
  discountAmount?: number;
  originalAmount: number;
}

function buildAdapterDiscountMetadata(
  appliedDiscount: { source: string; discountCode?: string; discountId?: string; discountName?: string; discountPercent?: number; discountAmount?: number },
  originalAmount: number,
): DiscountMetadata | undefined {
  if (appliedDiscount.source === "none") return undefined;
  return {
    couponCode: appliedDiscount.discountCode,
    discountId: appliedDiscount.discountId,
    discountName: appliedDiscount.discountName,
    discountPercent: appliedDiscount.discountPercent,
    discountAmount: appliedDiscount.discountAmount,
    originalAmount,
  };
}

function buildResponseDiscount(
  appliedDiscount: { source: string; discountName?: string; discountPercent?: number; discountAmount?: number },
  originalAmount: number,
  finalAmount: number,
) {
  if (appliedDiscount.source === "none") return undefined;
  return {
    source: appliedDiscount.source,
    discountName: appliedDiscount.discountName,
    discountPercent: appliedDiscount.discountPercent,
    discountAmount: appliedDiscount.discountAmount,
    originalAmount,
    finalAmount,
  };
}

async function recordCouponUsageIfNeeded(
  appliedDiscount: { source: string; discountId?: string; discountCode?: string },
  userId: string,
  req: Request,
): Promise<void> {
  if (appliedDiscount.source !== "coupon" || !appliedDiscount.discountId || !appliedDiscount.discountCode) return;

  const reservationId = `reserve_${Date.now()}_${userId}`;
  const usageRecorded = await recordCouponUsage(
    appliedDiscount.discountId,
    appliedDiscount.discountCode,
    userId,
    reservationId,
  );

  if (!usageRecorded) {
    throw new ApiError(429, "Mã giảm giá đã hết lượt sử dụng. Vui lòng thử lại.", undefined, "coupon_exhausted");
  }

  (req as Request & { _couponReservation?: { discountId: string; userId: string; reservationId: string } })._couponReservation = {
    discountId: appliedDiscount.discountId,
    userId,
    reservationId,
  };
}

async function updateCouponUsageOrderId(sessionId: string, req: Request): Promise<void> {
  const reservation = (req as Request & { _couponReservation?: { discountId: string; userId: string; reservationId: string } })._couponReservation;
  if (!reservation) return;

  try {
    await CouponUsageModel.updateOne(
      { discountId: reservation.discountId, userId: reservation.userId, orderId: reservation.reservationId },
      { orderId: sessionId },
    );
  } catch {
    // Non-critical: the usage was already recorded; orderId is best-effort
  }
}

/**
 * GET /api/billing/entitlement
 *
 * Returns the authenticated user's current entitlement snapshot.
 * This is the server-authoritative source of truth for real mode.
 * No provider secrets or raw payment data are exposed.
 */
export async function getEntitlement(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const snapshot = await billingService.getCurrentEntitlementForUser(user.uid);
  const subscription = await billingService.getSubscriptionForUser(user.uid);

  res.status(200).json(
    successResponse({
      planCode: snapshot.planCode,
      status: snapshot.status,
      entitlements: snapshot.activeKeys,
      source: snapshot.source,
      currentPeriodEnd: subscription?.currentPeriodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
      resolvedAt: snapshot.resolvedAt,
    }),
  );
}

/**
 * POST /api/billing/checkout-session
 *
 * Creates a checkout session via the active payment provider adapter.
 * Returns a checkoutUrl for the frontend to redirect to.
 *
 * IMPORTANT: This endpoint does NOT grant entitlements.
 * Entitlements are only granted when a verified webhook event
 * (or manual admin action) confirms payment completion.
 */
export async function createCheckoutSession(req: Request, res: Response): Promise<void> {
  if (isPaidCheckoutDisabled()) {
    throw new ApiError(503, PAID_CHECKOUT_DISABLED_MESSAGE, undefined, "checkout_disabled");
  }

  const user = requireAuthUser(req);
  const { planCode, returnUrl, cancelUrl, billingCycle, locale, receiptEmail, receiptName, couponCode } = req.body ?? {};

  // Validate planCode
  if (!planCode || typeof planCode !== "string" || !ALLOWED_PLAN_CODES.has(planCode)) {
    throw new ApiError(400, `Invalid planCode. Allowed: ${[...ALLOWED_PLAN_CODES].join(", ")}.`, undefined, "invalid_plan_code");
  }

  // Validate URLs
  if (!isValidHttpUrl(returnUrl)) {
    throw new ApiError(400, "returnUrl is required and must be a valid HTTP/HTTPS URL.", undefined, "invalid_return_url");
  }
  if (!isValidHttpUrl(cancelUrl)) {
    throw new ApiError(400, "cancelUrl is required and must be a valid HTTP/HTTPS URL.", undefined, "invalid_cancel_url");
  }

  // Origin safety check
  const frontendOrigin = process.env.FRONTEND_ORIGIN?.trim();
  if (frontendOrigin) {
    if (!isOriginAllowed(returnUrl, frontendOrigin)) {
      throw new ApiError(400, "returnUrl origin does not match allowed frontend origin.", undefined, "origin_mismatch");
    }
    if (!isOriginAllowed(cancelUrl, frontendOrigin)) {
      throw new ApiError(400, "cancelUrl origin does not match allowed frontend origin.", undefined, "origin_mismatch");
    }
  }

  const adapter = getPaymentProviderAdapter();
  if (!adapter.isConfigured) {
    const error = new PaymentProviderNotConfiguredError(adapter.providerId);
    throw new ApiError(503, error.message, undefined, "provider_not_configured");
  }

  const originalAmount = getPlusPriceFromEnv();
  const normalizedCouponCode = normalizeCouponCode(couponCode);
  if (couponCode !== undefined && couponCode !== null && !normalizedCouponCode) {
    throw new ApiError(400, "Mã giảm giá không hợp lệ.", undefined, "invalid_coupon_code");
  }

  const { finalAmount, appliedDiscount, discountInfo } = await resolveDiscountForCheckout(
    originalAmount,
    planCode as "PLUS",
    "plus_subscription",
    normalizedCouponCode,
    user.uid,
  );

  if (discountInfo && !discountInfo.valid) {
    throw new ApiError(400, discountInfo.reason ?? "Mã giảm giá không hợp lệ.", undefined, "invalid_coupon");
  }

  try {
    await recordCouponUsageIfNeeded(appliedDiscount, user.uid, req);

    const session = await adapter.createCheckoutSession({
      userId: user.uid,
      planCode: planCode as "PLUS",
      billingCycle: billingCycle ?? "twelve_week",
      successUrl: returnUrl,
      cancelUrl,
      locale,
      customerEmail: user.email,
      receiptEmail: typeof receiptEmail === "string" ? receiptEmail : user.email,
      receiptName: typeof receiptName === "string" ? receiptName : user.name,
      amount: finalAmount,
      discount: buildAdapterDiscountMetadata(appliedDiscount, originalAmount),
    });

    await updateCouponUsageOrderId(session.sessionId, req);

    // Verify entitlement is NOT granted at this point
    const snapshot = await billingService.getCurrentEntitlementForUser(user.uid);

    res.status(200).json(
      successResponse({
        checkoutSessionId: session.sessionId,
        checkoutUrl: session.checkoutUrl,
        provider: adapter.providerId,
        expiresAt: session.expiresAt,
        discount: buildResponseDiscount(appliedDiscount, originalAmount, finalAmount),
        currentEntitlement: {
          planCode: snapshot.planCode,
          status: snapshot.status,
          entitlements: snapshot.activeKeys,
        },
      }),
    );
  } catch (error) {
    if (error instanceof PaymentProviderNotConfiguredError) {
      throw new ApiError(503, error.message, undefined, "provider_not_configured");
    }
    throw error;
  }
}

/**
 * POST /api/billing/public-checkout-session
 *
 * Creates a local-first checkout session for visitors who are not signed in.
 * Entitlements are still only granted after a verified provider event; the
 * frontend unlocks the local device after polling a completed order.
 */
export async function createPublicCheckoutSession(req: Request, res: Response): Promise<void> {
  if (isPaidCheckoutDisabled()) {
    throw new ApiError(503, PAID_CHECKOUT_DISABLED_MESSAGE, undefined, "checkout_disabled");
  }

  const { planCode, returnUrl, cancelUrl, billingCycle, locale, clientUserId, receiptEmail, receiptName, couponCode } = req.body ?? {};

  if (!planCode || typeof planCode !== "string" || !ALLOWED_PLAN_CODES.has(planCode)) {
    throw new ApiError(
      400,
      `Invalid planCode. Allowed: ${[...ALLOWED_PLAN_CODES].join(", ")}.`,
      undefined,
      "invalid_plan_code",
    );
  }

  if (!isValidHttpUrl(returnUrl)) {
    throw new ApiError(400, "returnUrl is required and must be a valid HTTP/HTTPS URL.", undefined, "invalid_return_url");
  }
  if (!isValidHttpUrl(cancelUrl)) {
    throw new ApiError(400, "cancelUrl is required and must be a valid HTTP/HTTPS URL.", undefined, "invalid_cancel_url");
  }
  if (typeof clientUserId !== "string" || !clientUserId.trim()) {
    throw new ApiError(400, "clientUserId is required.", undefined, "invalid_client_user_id");
  }

  const frontendOrigin = process.env.FRONTEND_ORIGIN?.trim();
  if (frontendOrigin) {
    if (!isOriginAllowed(returnUrl, frontendOrigin)) {
      throw new ApiError(400, "returnUrl origin does not match allowed frontend origin.", undefined, "origin_mismatch");
    }
    if (!isOriginAllowed(cancelUrl, frontendOrigin)) {
      throw new ApiError(400, "cancelUrl origin does not match allowed frontend origin.", undefined, "origin_mismatch");
    }
  }

  const adapter = getPaymentProviderAdapter();
  if (!adapter.isConfigured) {
    const error = new PaymentProviderNotConfiguredError(adapter.providerId);
    throw new ApiError(503, error.message, undefined, "provider_not_configured");
  }

  const originalAmount = getPlusPriceFromEnv();
  const normalizedCouponCode = normalizeCouponCode(couponCode);
  if (couponCode !== undefined && couponCode !== null && !normalizedCouponCode) {
    throw new ApiError(400, "Mã giảm giá không hợp lệ.", undefined, "invalid_coupon_code");
  }
  if (normalizedCouponCode) {
    throw new ApiError(
      400,
      "Bạn cần đăng nhập để sử dụng mã giảm giá.",
      undefined,
      "coupon_requires_login",
    );
  }

  const publicUserId = getPublicCheckoutUserId(clientUserId.trim());

  const { finalAmount, appliedDiscount, discountInfo } = await resolveDiscountForCheckout(
    originalAmount,
    planCode as "PLUS",
    "plus_subscription",
    normalizedCouponCode,
    publicUserId,
  );

  if (discountInfo && !discountInfo.valid) {
    throw new ApiError(400, discountInfo.reason ?? "Mã giảm giá không hợp lệ.", undefined, "invalid_coupon");
  }

  try {
    await recordCouponUsageIfNeeded(appliedDiscount, publicUserId, req);

    const session = await adapter.createCheckoutSession({
      userId: publicUserId,
      planCode: planCode as "PLUS",
      billingCycle: billingCycle ?? "twelve_week",
      successUrl: returnUrl,
      cancelUrl,
      locale,
      receiptEmail: typeof receiptEmail === "string" ? receiptEmail : undefined,
      receiptName: typeof receiptName === "string" ? receiptName : undefined,
      amount: finalAmount,
      discount: buildAdapterDiscountMetadata(appliedDiscount, originalAmount),
    });

    await updateCouponUsageOrderId(session.sessionId, req);

    res.status(200).json(
      successResponse({
        checkoutSessionId: session.sessionId,
        checkoutUrl: session.checkoutUrl,
        provider: adapter.providerId,
        expiresAt: session.expiresAt,
        discount: buildResponseDiscount(appliedDiscount, originalAmount, finalAmount),
      }),
    );
  } catch (error) {
    if (error instanceof PaymentProviderNotConfiguredError) {
      throw new ApiError(503, error.message, undefined, "provider_not_configured");
    }
    throw error;
  }
}

/**
 * POST /api/billing/orders/:orderId/claim
 *
 * Allows a signed-in user to claim a public-checkout order that was paid
 * while they were not signed in. The authenticated user's email must match
 * the order's receiptEmail. Transfers the PaymentOrder and any
 * BillingSubscription from the public: userId to the Firebase uid.
 *
 * Auth + verified email required.
 */
export async function claimPublicOrder(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const { orderId } = req.params;

  if (!orderId || typeof orderId !== "string" || orderId.length < 4) {
    throw new ApiError(400, "orderId không hợp lệ.", undefined, "invalid_order_id");
  }

  const { PaymentOrderModel } = await import("../models/PaymentOrderModel");
  const normalizedOrderId = orderId.trim().toUpperCase();

  const order = await PaymentOrderModel.findOne({ orderId: normalizedOrderId });

  if (!order) {
    throw new ApiError(404, "Không tìm thấy đơn hàng.", undefined, "order_not_found");
  }

  const isPublicOrder = order.userId.startsWith("public:");
  const isAlreadyLinkedToCurrentUser = order.userId === user.uid;

  if (!isPublicOrder && !isAlreadyLinkedToCurrentUser) {
    throw new ApiError(
      400,
      "Đơn hàng này đã được liên kết với một tài khoản hoặc không phải đơn công khai.",
      undefined,
      "order_already_claimed",
    );
  }

  if (order.status !== "completed") {
    throw new ApiError(
      400,
      "Đơn hàng chưa được thanh toán. Vui lòng hoàn tất thanh toán trước.",
      undefined,
      "order_not_completed",
    );
  }

  if (order.purpose === "physical_order") {
    throw new ApiError(
      400,
      "Đơn hàng vật lý không hỗ trợ liên kết tự động.",
      undefined,
      "physical_order_not_claimable",
    );
  }

  const orderEmail = order.receiptEmail?.trim().toLowerCase();
  if (!orderEmail) {
    throw new ApiError(
      400,
      `Không thể tự động liên kết đơn hàng này vì đơn chưa có email nhận biên lai. Vui lòng liên hệ ${getBillingSupportEmail()} để được hỗ trợ.`,
      undefined,
      "claim_email_required",
    );
  }

  const userEmail = user.email?.trim().toLowerCase();
  if (!userEmail || orderEmail !== userEmail) {
    throw new ApiError(
      403,
      "Email tài khoản không khớp với email nhận biên lai của đơn hàng. Vui lòng liên hệ hỗ trợ.",
      undefined,
      "email_mismatch",
    );
  }

  const oldUserId = order.userId;
  const newUserId = user.uid;

  if (isAlreadyLinkedToCurrentUser) {
    const snapshot = await billingService.getCurrentEntitlementForUser(newUserId);
    res.status(200).json(
      successResponse({
        claimed: true,
        alreadyClaimed: true,
        orderId: normalizedOrderId,
        previousUserId: oldUserId,
        migratedSubscriptions: 0,
        currentEntitlement: {
          planCode: snapshot.planCode,
          status: snapshot.status,
          entitlements: snapshot.activeKeys,
        },
      }),
    );
    return;
  }

  // Migrate the exact subscription created for this payment before relinking the order.
  const { BillingSubscriptionModel } = await import("../models/BillingSubscriptionModel");
  const subResult = await BillingSubscriptionModel.updateMany(
    { provider: order.provider, providerSubscriptionId: normalizedOrderId },
    { $set: { userId: newUserId } },
  );

  const matchedSubscriptions = Number(
    (subResult as { matchedCount?: number; modifiedCount?: number }).matchedCount ?? subResult.modifiedCount ?? 0,
  );
  if (matchedSubscriptions < 1) {
    throw new ApiError(
      409,
      "Không tìm thấy gói Plus đã xác nhận cho đơn hàng này. Vui lòng liên hệ hỗ trợ.",
      undefined,
      "subscription_not_found",
    );
  }

  order.userId = newUserId;
  await order.save();

  const snapshot = await billingService.getCurrentEntitlementForUser(newUserId);

  res.status(200).json(
    successResponse({
      claimed: true,
      orderId: normalizedOrderId,
      previousUserId: oldUserId,
      migratedSubscriptions: subResult.modifiedCount,
      currentEntitlement: {
        planCode: snapshot.planCode,
        status: snapshot.status,
        entitlements: snapshot.activeKeys,
      },
    }),
  );
}

/**
 * POST /api/billing/customer-portal
 *
 * Creates a customer portal session via the active payment provider adapter.
 * Returns a portalUrl for the frontend to redirect to, or instructions
 * if the provider does not support self-service portals.
 *
 * Auth required. Does NOT modify entitlements.
 */
export async function createCustomerPortal(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const { returnUrl } = req.body ?? {};

  const adapter = getPaymentProviderAdapter();
  const subscription = await billingService.getSubscriptionForUser(user.uid);

  // If no subscription exists, user has nothing to manage
  if (!subscription || subscription.planCode === "FREE") {
    res.status(200).json(
      successResponse({
        supported: false,
        message: "Bạn chưa có gói premium nào để quản lý.",
      }),
    );
    return;
  }

  // Determine return URL
  const resolvedReturnUrl =
    isValidHttpUrl(returnUrl) ? returnUrl : process.env.FRONTEND_ORIGIN?.trim() || "";

  // Check if adapter supports customer portal
  if (!adapter.createCustomerPortalSession) {
    const supportEmail = getBillingSupportEmail();
    res.status(200).json(
      successResponse({
        supported: false,
        provider: adapter.providerId,
        message:
          "Provider hiện tại chưa hỗ trợ cổng quản lý thanh toán tự phục vụ. " +
          `Vui lòng liên hệ ${supportEmail} để được hỗ trợ.`,
        supportEmail,
      }),
    );
    return;
  }

  try {
    const result = await adapter.createCustomerPortalSession({
      userId: user.uid,
      providerCustomerId: subscription.providerCustomerId ?? "",
      returnUrl: resolvedReturnUrl,
    });

    if (!result) {
      const supportEmail = getBillingSupportEmail();
      res.status(200).json(
        successResponse({
          supported: false,
          provider: adapter.providerId,
          message:
            "Provider không thể tạo cổng quản lý lúc này. " +
            `Vui lòng liên hệ ${supportEmail} để được hỗ trợ.`,
          supportEmail,
        }),
      );
      return;
    }

    res.status(200).json(
      successResponse({
        supported: true,
        portalUrl: result.portalUrl,
        provider: adapter.providerId,
        message: "Đã tạo liên kết tới cổng quản lý thanh toán.",
      }),
    );
  } catch (error) {
    if (error instanceof PaymentProviderNotConfiguredError) {
      throw new ApiError(503, error.message, undefined, "provider_not_configured");
    }
    throw error;
  }
}

/**
 * POST /api/billing/subscription/cancel
 *
 * Marks the user's subscription to cancel at the end of the current period.
 * Does NOT immediately remove entitlements — the user keeps access until
 * currentPeriodEnd, at which point a webhook event will finalize cancellation.
 *
 * This is a "cancel at period end" soft cancel, not an immediate termination.
 * Auth required.
 */
export async function cancelSubscription(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const subscription = await billingService.getSubscriptionForUser(user.uid);

  if (!subscription || subscription.planCode === "FREE") {
    throw new ApiError(400, "Không có gói premium nào để hủy.", undefined, "no_active_subscription");
  }

  if (subscription.status === "canceled") {
    const snapshot = await billingService.getCurrentEntitlementForUser(user.uid);
    res.status(200).json(
      successResponse({
        status: "already_canceled",
        message: "Gói đã được hủy trước đó.",
        currentEntitlement: {
          planCode: snapshot.planCode,
          status: snapshot.status,
          entitlements: snapshot.activeKeys,
          currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
          cancelAtPeriodEnd: subscription.cancelAtPeriodEnd ?? false,
        },
      }),
    );
    return;
  }

  if (subscription.cancelAtPeriodEnd) {
    const snapshot = await billingService.getCurrentEntitlementForUser(user.uid);
    res.status(200).json(
      successResponse({
        status: "already_pending_cancel",
        message: "Gói đã được đặt hủy cuối kỳ. Bạn vẫn giữ quyền Plus cho đến khi hết chu kỳ.",
        currentEntitlement: {
          planCode: snapshot.planCode,
          status: snapshot.status,
          entitlements: snapshot.activeKeys,
          currentPeriodEnd: subscription.currentPeriodEnd?.toISOString() ?? null,
          cancelAtPeriodEnd: true,
        },
      }),
    );
    return;
  }

  // Mark cancel at period end via billing service
  await billingService.markCancelAtPeriodEnd(user.uid);

  const snapshot = await billingService.getCurrentEntitlementForUser(user.uid);
  const updatedSub = await billingService.getSubscriptionForUser(user.uid);

  res.status(200).json(
    successResponse({
      status: "pending_cancel",
      message:
        "Gói sẽ được hủy cuối kỳ. Bạn vẫn giữ đầy đủ quyền Plus cho đến khi hết chu kỳ hiện tại.",
      currentEntitlement: {
        planCode: snapshot.planCode,
        status: snapshot.status,
        entitlements: snapshot.activeKeys,
        currentPeriodEnd: updatedSub?.currentPeriodEnd?.toISOString() ?? null,
        cancelAtPeriodEnd: true,
      },
    }),
  );
}
