import type { Request, Response } from "express";

import { billingService } from "../services/billingServiceInstance";
import { getPaymentProviderAdapter } from "../services/paymentProviderRegistry";
import { PaymentProviderNotConfiguredError } from "../services/paymentProviderAdapter";
import { ApiError } from "../utils/apiError";
import { successResponse } from "../utils/apiResponse";
import { requireAuthUser } from "./controllerHelpers";

const ALLOWED_PLAN_CODES = new Set(["PLUS"]);

function isValidHttpUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isOriginAllowed(url: string, allowedOrigin: string | undefined): boolean {
  if (!allowedOrigin) return true; // No origin restriction configured
  try {
    return new URL(url).origin === new URL(allowedOrigin).origin;
  } catch {
    return false;
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
  const user = requireAuthUser(req);
  const { planCode, returnUrl, cancelUrl, billingCycle, locale } = req.body ?? {};

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

  try {
    const session = await adapter.createCheckoutSession({
      userId: user.uid,
      planCode: planCode as "PLUS",
      billingCycle: billingCycle ?? "monthly",
      successUrl: returnUrl,
      cancelUrl,
      locale,
      customerEmail: user.email,
    });

    // Verify entitlement is NOT granted at this point
    const snapshot = await billingService.getCurrentEntitlementForUser(user.uid);

    res.status(200).json(
      successResponse({
        checkoutSessionId: session.sessionId,
        checkoutUrl: session.checkoutUrl,
        provider: adapter.providerId,
        expiresAt: session.expiresAt,
        // Explicitly include current entitlement state so frontend
        // can confirm entitlement is unchanged after checkout creation
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
    res.status(200).json(
      successResponse({
        supported: false,
        provider: adapter.providerId,
        message:
          "Provider hiện tại chưa hỗ trợ cổng quản lý thanh toán tự phục vụ. " +
          "Vui lòng liên hệ support@visionboard.app để được hỗ trợ.",
        supportEmail: "support@visionboard.app",
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
      res.status(200).json(
        successResponse({
          supported: false,
          provider: adapter.providerId,
          message:
            "Provider không thể tạo cổng quản lý lúc này. " +
            "Vui lòng liên hệ support@visionboard.app để được hỗ trợ.",
          supportEmail: "support@visionboard.app",
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
