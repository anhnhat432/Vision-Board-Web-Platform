import type { Request, Response } from "express";

import { listAuditLogs } from "../services/auditLogService";
import { successResponse } from "../utils/apiResponse";

export async function getAdminAuditLogs(req: Request, res: Response): Promise<void> {
  const result = await listAuditLogs({
    actorUid: req.query.actorUid,
    action: req.query.action,
    startDate: req.query.startDate ?? req.query.from,
    endDate: req.query.endDate ?? req.query.to,
    limit: req.query.limit,
    page: req.query.page,
  });

  res.status(200).json(successResponse(result, "Admin audit logs loaded."));
}
