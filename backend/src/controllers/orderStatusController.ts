/**
 * Order Status Controller
 *
 * Provides a polling endpoint for the frontend checkout page.
 * The frontend polls every 5 seconds to detect when Casso webhook
 * has marked the PaymentOrder as "completed".
 *
 * Auth required — only the order owner can check their order status.
 */

import type { Request, Response } from "express";

import { PaymentOrderModel } from "../models/PaymentOrderModel";
import { ApiError } from "../utils/apiError";
import { successResponse } from "../utils/apiResponse";
import { requireAuthUser } from "./controllerHelpers";

const PAYMENT_HISTORY_LIMIT = 20;

function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * GET /api/billing/order-status/:orderId
 */
export async function getOrderStatus(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const { orderId } = req.params;

  if (!orderId || typeof orderId !== "string" || orderId.length < 4) {
    throw new ApiError(400, "orderId không hợp lệ.", undefined, "invalid_order_id");
  }

  const order = await PaymentOrderModel.findOne({
    orderId: orderId.trim().toUpperCase(),
    userId: user.uid,
  });

  if (!order) {
    throw new ApiError(404, "Không tìm thấy đơn hàng.", undefined, "order_not_found");
  }

  // Auto-expire if past expiresAt and still pending
  if (order.status === "pending" && order.expiresAt && new Date() > order.expiresAt) {
    order.status = "expired";
    await order.save();
  }

  res.status(200).json(
    successResponse({
      orderId: order.orderId,
      status: order.status,
      amount: order.amount,
      currency: order.currency,
      bankAccount: order.bankAccount,
      bankName: order.bankName,
      accountName: order.accountName,
      qrDataUrl: order.qrDataUrl,
      expiresAt: order.expiresAt?.toISOString() ?? null,
      completedAt: order.completedAt?.toISOString() ?? null,
      createdAt: order.createdAt?.toISOString() ?? null,
    }),
  );
}

/**
 * GET /api/billing/payment-history
 *
 * Returns recent payment orders for the authenticated user.
 * Sensitive bank and provider transaction details are intentionally omitted.
 */
export async function getPaymentHistory(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const now = new Date();

  await PaymentOrderModel.updateMany(
    {
      userId: user.uid,
      status: "pending",
      expiresAt: { $lt: now },
    },
    { $set: { status: "expired" } },
  );

  const orders = await PaymentOrderModel.find({ userId: user.uid })
    .select("orderId planCode billingCycle amount currency status provider createdAt completedAt expiresAt")
    .sort({ createdAt: -1 })
    .limit(PAYMENT_HISTORY_LIMIT)
    .lean();

  res.status(200).json(
    successResponse({
      orders: orders.map((order) => ({
        orderId: order.orderId,
        planCode: order.planCode,
        billingCycle: order.billingCycle,
        amount: order.amount,
        currency: order.currency,
        status: order.status,
        provider: order.provider,
        createdAt: toIsoString(order.createdAt),
        completedAt: toIsoString(order.completedAt),
        expiresAt: toIsoString(order.expiresAt),
      })),
    }),
  );
}

/**
 * GET /api/billing/checkout-info
 *
 * Returns bank account info and pricing for the checkout page
 * without creating an order. Used to show pricing before user commits.
 */
export async function getCheckoutInfo(_req: Request, res: Response): Promise<void> {
  const bankAccount = process.env.CASSO_BANK_ACCOUNT?.trim() ?? "";
  const bankName = process.env.CASSO_BANK_NAME?.trim() ?? "";
  const accountName = process.env.CASSO_ACCOUNT_NAME?.trim() ?? "";
  const plusPriceVnd = Number.parseInt(process.env.PLUS_PRICE_VND?.trim() ?? "79000", 10);

  res.status(200).json(
    successResponse({
      bankAccount,
      bankName,
      accountName,
      amount: plusPriceVnd,
      currency: "VND",
      billingCycle: "twelve_week",
      provider: process.env.BILLING_PROVIDER?.trim() ?? "mock",
    }),
  );
}
