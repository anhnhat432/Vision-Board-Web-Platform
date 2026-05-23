import type { Request, Response } from "express";

import { OrderCatalogModel } from "../models/OrderCatalogModel";
import { successResponse } from "../utils/apiResponse";

export async function listActiveCatalog(_req: Request, res: Response): Promise<void> {
  const items = await OrderCatalogModel.find({ isActive: true })
    .sort({ sortOrder: 1, itemId: 1 })
    .lean();
  res.set("Cache-Control", "public, max-age=60");
  res.status(200).json(successResponse(items));
}
