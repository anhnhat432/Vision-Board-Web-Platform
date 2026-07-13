import type { Request, Response } from "express";

import {
  buildAdminSalesReportCsv,
  getAdminSalesReport,
  getAdminSalesReportExport,
  reviewAdminSalesOrder,
} from "../services/adminSalesReportService";
import { ApiError } from "../utils/apiError";
import { successResponse } from "../utils/apiResponse";

export async function getAdminSalesReportController(req: Request, res: Response): Promise<void> {
  const report = await getAdminSalesReport(req.query);
  res.status(200).set("Cache-Control", "no-store").json(successResponse(report));
}

export async function exportAdminSalesReportController(req: Request, res: Response): Promise<void> {
  const exported = await getAdminSalesReportExport(req.query);
  const csv = buildAdminSalesReportCsv(exported);
  res
    .status(200)
    .set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exported.filename}"`,
      "Cache-Control": "no-store",
    })
    .send(csv);
}

export async function reviewAdminSalesOrderController(req: Request, res: Response): Promise<void> {
  const reviewerUid = req.user?.uid?.trim();
  if (!reviewerUid) throw new ApiError(401, "Authentication required.");
  const result = await reviewAdminSalesOrder({
    orderId: req.params.orderId ?? "",
    reviewerUid,
    reviewRequestId: req.body?.reviewRequestId,
    kpiStatus: req.body?.kpiStatus,
    exclusionReason: req.body?.exclusionReason,
    reviewNote: req.body?.reviewNote,
  });
  res.status(200).json(successResponse({ item: result.item }));
}
