import type { Request, Response } from "express";

import type {
  AdminBulkClassifyUsersBody,
  AdminOperationalClassificationBody,
} from "../middleware/requestValidation";
import {
  bulkClassifyAdminUsers,
  classifyAdminPaymentOrder,
  classifyAdminPhysicalOrder,
} from "../services/adminOperationalClassificationService";
import { ApiError } from "../utils/apiError";
import { successResponse } from "../utils/apiResponse";

export async function bulkClassifyAdminUsersController(req: Request, res: Response): Promise<void> {
  const actorUid = req.user?.uid?.trim();
  if (!actorUid) throw new ApiError(401, "Authentication required.");

  const body = req.body as AdminBulkClassifyUsersBody;
  const result = await bulkClassifyAdminUsers({ actorUid, ...body });
  const onlyResult = result.results.length === 1 ? result.results[0] : null;
  if (onlyResult?.status === "failed") {
    if (onlyResult.errorCode === "admin_classification_request_conflict") {
      throw new ApiError(
        409,
        "Classification request conflicts with an earlier command.",
        undefined,
        "admin_classification_request_conflict",
      );
    }
    if (onlyResult.errorCode === "admin_audit_unavailable" || onlyResult.errorCode === "admin_audit_commit_unknown") {
      throw new ApiError(
        503,
        "Admin audit storage is unavailable. Retry later.",
        undefined,
        onlyResult.errorCode,
      );
    }
  }
  res.status(200).json(successResponse(result));
}

export async function classifyAdminPaymentOrderController(req: Request, res: Response): Promise<void> {
  const actorUid = req.user?.uid?.trim();
  if (!actorUid) throw new ApiError(401, "Authentication required.");

  const body = req.body as AdminOperationalClassificationBody;
  const result = await classifyAdminPaymentOrder({ actorUid, orderId: req.params.orderId ?? "", ...body });
  res.status(200).json(successResponse(result));
}

export async function classifyAdminPhysicalOrderController(req: Request, res: Response): Promise<void> {
  const actorUid = req.user?.uid?.trim();
  if (!actorUid) throw new ApiError(401, "Authentication required.");

  const body = req.body as AdminOperationalClassificationBody;
  const result = await classifyAdminPhysicalOrder({ actorUid, orderId: req.params.id ?? "", ...body });
  res.status(200).json(successResponse(result));
}
