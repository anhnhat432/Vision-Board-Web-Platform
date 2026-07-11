import type { Request, Response } from "express";

import {
  buildAdminSalesReportCsv,
  getAdminSalesReport,
  getAdminSalesReportExport,
} from "../services/adminSalesReportService";
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
