import type { NextFunction, Request, RequestHandler, Response } from "express";
import { Router } from "express";
import multer from "multer";

import {
  completePaymentOrderManually,
  getAdminPaymentOrders,
  getAdminOverview,
  getAdminUserDetail,
  getAdminUsers,
  getReconciliationLastRun,
  sendExpiringBillingReminders,
  updateAdminUserRole,
} from "../controllers/adminController";
import { getAdminAuditLogs } from "../controllers/auditLogController";
import {
  createCatalogItem,
  listAllCatalog,
  toggleCatalogItemActive,
  updateCatalogItem,
  uploadCatalogItemThumbnail,
} from "../controllers/orderCatalogController";
import {
  completeAdminRefundRequest,
  getAdminRefundRequests,
  rejectAdminRefundRequest,
} from "../controllers/refundController";
import { clearAdminRoleCache, requireAdmin } from "../middleware/requireAdmin";
import { validateOptionalJsonObjectBody, validateOrderIdParam } from "../middleware/requestValidation";
import { logAdminAction } from "../services/auditLogService";
import { ApiError } from "../utils/apiError";
import { successResponse } from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";

const adminRoutes = Router();

const MAX_THUMBNAIL_BYTES = 2 * 1024 * 1024;

const thumbnailUpload = multer({
  storage: multer.memoryStorage(),
  limits: { files: 1, fileSize: MAX_THUMBNAIL_BYTES },
});

const uploadThumbnailMiddleware: RequestHandler = (req, res, next) => {
  thumbnailUpload.single("thumbnail")(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        next(new ApiError(400, "Image is too large. Max 2MB.", undefined, "file_too_large"));
        return;
      }
      next(new ApiError(400, `Upload error: ${err.message}`, undefined, "upload_error"));
      return;
    }
    if (err) {
      next(err as Error);
      return;
    }
    next();
  });
};

type AdminHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

interface AuditedAdminActionOptions {
  action: string;
  target: string;
  getTargetId?: (req: Request) => string | null | undefined;
  validators?: RequestHandler[];
  handler: AdminHandler;
}

function runMiddleware(handler: RequestHandler, req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const result = (handler as (req: Request, res: Response, next: NextFunction) => unknown)(req, res, (error?: unknown) => {
        if (error) reject(error);
        else resolve();
      });
      if (result && typeof (result as Promise<unknown>).then === "function") {
        (result as Promise<unknown>).then(() => resolve()).catch(reject);
      }
    } catch (error) {
      reject(error);
    }
  });
}

function runAdminHandler(handler: AdminHandler, req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    handler(req, res, (error?: unknown) => {
      if (error) reject(error);
      else resolve();
    })
      .then(() => resolve())
      .catch(reject);
  });
}

export function auditedAdminAction(options: AuditedAdminActionOptions): RequestHandler {
  return async (req, res, next) => {
    const targetId = options.getTargetId?.(req) ?? null;

    try {
      await runMiddleware(requireAdmin, req, res);
      for (const validator of options.validators ?? []) {
        await runMiddleware(validator, req, res);
      }
      await runAdminHandler(options.handler, req, res);
      await logAdminAction({
        req,
        action: options.action,
        target: options.target,
        targetId,
        payload: req.body,
        success: true,
      });
    } catch (error) {
      await logAdminAction({
        req,
        action: options.action,
        target: options.target,
        targetId,
        payload: req.body,
        success: false,
      });
      next(error);
    }
  };
}

async function clearRoleCacheHandler(req: Request, res: Response): Promise<void> {
  const uid = req.params.uid?.trim();
  clearAdminRoleCache(uid);
  res.status(200).json(successResponse({ uid }, "Admin role cache cleared."));
}

adminRoutes.get("/admin/overview", asyncHandler(requireAdmin), asyncHandler(getAdminOverview));
adminRoutes.get("/admin/reconciliation/last-run", asyncHandler(requireAdmin), asyncHandler(getReconciliationLastRun));
adminRoutes.get("/admin/audit-logs", asyncHandler(requireAdmin), asyncHandler(getAdminAuditLogs));
adminRoutes.get("/admin/order-catalog", asyncHandler(requireAdmin), asyncHandler(listAllCatalog));
adminRoutes.post(
  "/admin/order-catalog",
  auditedAdminAction({
    action: "createOrderCatalogItem",
    target: "order_catalog",
    getTargetId: (req) => {
      const itemId = (req.body as Record<string, unknown> | undefined)?.itemId;
      return typeof itemId === "string" ? itemId : null;
    },
    validators: [validateOptionalJsonObjectBody],
    handler: createCatalogItem,
  }),
);
adminRoutes.put(
  "/admin/order-catalog/:itemId",
  auditedAdminAction({
    action: "updateOrderCatalogItem",
    target: "order_catalog",
    getTargetId: (req) => req.params.itemId ?? null,
    validators: [validateOptionalJsonObjectBody],
    handler: updateCatalogItem,
  }),
);
adminRoutes.patch(
  "/admin/order-catalog/:itemId/active",
  auditedAdminAction({
    action: "toggleOrderCatalogItemActive",
    target: "order_catalog",
    getTargetId: (req) => req.params.itemId ?? null,
    validators: [validateOptionalJsonObjectBody],
    handler: toggleCatalogItemActive,
  }),
);
adminRoutes.post(
  "/admin/order-catalog/:itemId/thumbnail",
  auditedAdminAction({
    action: "uploadOrderCatalogItemThumbnail",
    target: "order_catalog",
    getTargetId: (req) => req.params.itemId ?? null,
    validators: [uploadThumbnailMiddleware],
    handler: uploadCatalogItemThumbnail,
  }),
);
adminRoutes.get("/admin/billing/payment-orders", asyncHandler(requireAdmin), asyncHandler(getAdminPaymentOrders));
adminRoutes.post(
  "/admin/cache/clear-role/:uid",
  auditedAdminAction({
    action: "clearAdminRoleCache",
    target: "admin_role_cache",
    getTargetId: (req) => req.params.uid,
    handler: clearRoleCacheHandler,
  }),
);
adminRoutes.post(
  "/admin/billing/reminders/expiring",
  auditedAdminAction({
    action: "sendExpiringBillingReminders",
    target: "billing_subscription",
    validators: [validateOptionalJsonObjectBody],
    handler: sendExpiringBillingReminders,
  }),
);
adminRoutes.post(
  "/admin/billing/payment-orders/:orderId/complete",
  auditedAdminAction({
    action: "completePaymentOrderManually",
    target: "payment_order",
    getTargetId: (req) => req.params.orderId?.trim().toUpperCase(),
    validators: [validateOrderIdParam, validateOptionalJsonObjectBody],
    handler: completePaymentOrderManually,
  }),
);
adminRoutes.get("/admin/users", asyncHandler(requireAdmin), asyncHandler(getAdminUsers));
adminRoutes.get("/admin/users/:uid", asyncHandler(requireAdmin), asyncHandler(getAdminUserDetail));
adminRoutes.patch(
  "/admin/users/:uid/role",
  auditedAdminAction({
    action: "updateUserRole",
    target: "user",
    getTargetId: (req) => req.params.uid ?? null,
    validators: [validateOptionalJsonObjectBody],
    handler: updateAdminUserRole,
  }),
);

adminRoutes.get("/admin/billing/refund-requests", asyncHandler(requireAdmin), asyncHandler(getAdminRefundRequests));
adminRoutes.post(
  "/admin/billing/refund-requests/:requestId/complete",
  auditedAdminAction({
    action: "completeAdminRefundRequest",
    target: "refund_request",
    getTargetId: (req) => req.params.requestId,
    validators: [validateOptionalJsonObjectBody],
    handler: completeAdminRefundRequest,
  }),
);
adminRoutes.post(
  "/admin/billing/refund-requests/:requestId/reject",
  auditedAdminAction({
    action: "rejectAdminRefundRequest",
    target: "refund_request",
    getTargetId: (req) => req.params.requestId,
    validators: [validateOptionalJsonObjectBody],
    handler: rejectAdminRefundRequest,
  }),
);

export { adminRoutes };
