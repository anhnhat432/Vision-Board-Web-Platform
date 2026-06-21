import type { Request, Response } from "express";

import { orderService } from "../services/orderService";
import { recordCouponUsage } from "../services/discountService";
import { getPaymentProviderAdapter } from "../services/paymentProviderRegistry";
import { ApiError } from "../utils/apiError";
import { successResponse } from "../utils/apiResponse";
import { requireAuthUser } from "./controllerHelpers";

function buildPhysicalOrderPaymentDiscount(physicalOrder: Awaited<ReturnType<typeof orderService.getOrder>>) {
  if (!physicalOrder.discount) return undefined;
  return {
    source: physicalOrder.discount.source,
    couponCode: physicalOrder.discount.discountCode,
    discountId: physicalOrder.discount.discountId,
    discountName: physicalOrder.discount.discountName,
    discountPercent: physicalOrder.discount.discountPercent,
    discountType: physicalOrder.discount.discountType,
    discountAmount: physicalOrder.discount.discountAmount,
    originalAmount: physicalOrder.discount.originalAmount,
    finalAmount: physicalOrder.discount.finalAmount,
  };
}

async function reservePhysicalOrderCouponUsage(
  physicalOrder: Awaited<ReturnType<typeof orderService.getOrder>>,
  userId: string,
): Promise<void> {
  const discount = physicalOrder.discount;
  if (discount?.source !== "coupon" || !discount.discountId || !discount.discountCode) return;

  const usageRecorded = await recordCouponUsage(discount.discountId, discount.discountCode, userId, physicalOrder.id);
  if (!usageRecorded) {
    throw new ApiError(429, "Mã giảm giá đã hết lượt sử dụng. Vui lòng thử lại.", undefined, "coupon_exhausted");
  }
}

export async function createOrder(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const order = await orderService.createOrder(user.uid, req.body ?? {});
  res.status(201).json(successResponse(order));
}

export async function getOrders(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const orders = await orderService.getUserOrders(user.uid);
  res.status(200).json(successResponse(orders));
}

export async function getOrderById(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const order = await orderService.getOrder(user.uid, req.params.id);
  res.status(200).json(successResponse(order));
}

export async function cancelOrder(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const order = await orderService.cancelOrder(user.uid, req.params.id);
  res.status(200).json(successResponse(order));
}

export async function adminGetOrders(req: Request, res: Response): Promise<void> {
  requireAuthUser(req);
  const orders = await orderService.adminGetOrders();
  res.status(200).json(successResponse(orders));
}

export async function adminUpdateOrderStatus(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const order = await orderService.adminUpdateStatus(user.uid, req.params.id, req.body ?? {});
  res.status(200).json(successResponse(order));
}

export async function adminUpdateOrder(req: Request, res: Response): Promise<void> {
  requireAuthUser(req);
  const order = await orderService.adminUpdateOrder(req.params.id, req.body ?? {});
  res.status(200).json(successResponse(order));
}

/**
 * POST /api/orders/:id/payment-session
 *
 * Creates a payment session (QR/bank transfer link) for a pending physical kit order.
 * Uses the active payment provider adapter with the order's server-authoritative totalVnd.
 * This is NOT for Plus subscription — it creates a PaymentOrder with purpose "physical_order".
 *
 * Auth + email verified required.
 */
export async function createKitPaymentSession(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const orderId = req.params.id;

  const physicalOrder = await orderService.getOrder(user.uid, orderId);

  if (physicalOrder.status !== "pending") {
    throw new ApiError(409, "Chỉ có thể thanh toán đơn đang ở trạng thái chờ.", undefined, "order_not_pending");
  }

  const amount = physicalOrder.totalVnd;
  if (!amount || amount < 1000) {
    throw new ApiError(400, "Tổng giá trị đơn hàng không hợp lệ.", undefined, "invalid_order_total");
  }

  await reservePhysicalOrderCouponUsage(physicalOrder, user.uid);

  const frontendOrigin = process.env.FRONTEND_ORIGIN?.trim() || "";

  const adapter = getPaymentProviderAdapter();

  const session = await adapter.createCheckoutSession({
    userId: user.uid,
    planCode: "PLUS",
    billingCycle: "twelve_week",
    successUrl: frontendOrigin ? `${frontendOrigin}/order-status/__session_id__` : "",
    cancelUrl: frontendOrigin ? `${frontendOrigin}/order-status/${orderId}` : "",
    amount,
    purpose: "physical_order",
    physicalOrderId: orderId,
    receiptEmail: physicalOrder.email,
    receiptName: physicalOrder.fullName,
    discount: buildPhysicalOrderPaymentDiscount(physicalOrder),
  });

  res.status(200).json(
    successResponse({
      paymentOrderId: session.sessionId,
      checkoutUrl: session.checkoutUrl,
      provider: adapter.providerId,
      expiresAt: session.expiresAt,
      amount,
      currency: "VND",
    }),
  );
}
