import type { Request, Response } from "express";

import { getParam, requireAuthUser } from "./controllerHelpers";
import { createRefundRequest, getRefundPolicyConfig, listRefundRequests, resolveRefundRequest } from "../services/refundService";
import type { RefundRequestStatus } from "../models/refundRequestModel";
import { ApiError } from "../utils/apiError";
import { successResponse } from "../utils/apiResponse";

const REQUEST_ID_REGEX = /^[a-fA-F0-9]{24}$/;

function normalizeString(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normalizeRefundStatus(value: unknown): RefundRequestStatus | "all" {
  if (typeof value !== "string") return "pending";
  const normalized = value.trim().toLowerCase();
  if (normalized === "all" || normalized === "pending" || normalized === "completed" || normalized === "rejected") {
    return normalized;
  }
  return "pending";
}

export async function createBillingRefundRequest(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const orderId = req.params.orderId?.trim().toUpperCase() ?? "";

  const request = await createRefundRequest({
    orderId,
    userId: user.uid,
    userEmail: user.email,
    emailVerified: user.emailVerified,
    contactEmail: normalizeString(req.body?.contactEmail ?? user.email, 254),
    reason: normalizeString(req.body?.reason, 1000),
    refundAccount: normalizeString(req.body?.refundAccount, 300),
  });

  res.status(201).json(
    successResponse({
      request,
      policy: getRefundPolicyConfig(),
    }),
  );
}

export async function getAdminRefundRequests(req: Request, res: Response): Promise<void> {
  const status = normalizeRefundStatus(req.query.status);
  const items = await listRefundRequests(status);
  res.status(200).json(successResponse({ status, total: items.length, items }));
}

export async function completeAdminRefundRequest(req: Request, res: Response): Promise<void> {
  const admin = requireAuthUser(req);
  const requestId = req.params.requestId?.trim() ?? "";
  if (!REQUEST_ID_REGEX.test(requestId)) {
    throw new ApiError(400, "requestId không hợp lệ.", undefined, "invalid_refund_request_id");
  }

  const request = await resolveRefundRequest({
    requestId,
    adminUserId: admin.uid,
    status: "completed",
    adminNote: normalizeString(req.body?.adminNote, 1000),
  });

  res.status(200).json(successResponse({ request }));
}

export async function rejectAdminRefundRequest(req: Request, res: Response): Promise<void> {
  const admin = requireAuthUser(req);
  const requestId = req.params.requestId?.trim() ?? "";
  if (!REQUEST_ID_REGEX.test(requestId)) {
    throw new ApiError(400, "requestId không hợp lệ.", undefined, "invalid_refund_request_id");
  }

  const request = await resolveRefundRequest({
    requestId,
    adminUserId: admin.uid,
    status: "rejected",
    adminNote: normalizeString(req.body?.adminNote, 1000),
  });

  res.status(200).json(successResponse({ request }));
}
