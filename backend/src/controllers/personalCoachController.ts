import type { Request, Response } from "express";

import { processPersonalCoachRequest } from "../services/personalCoachService";
import { sanitizePersonalCoachRequest } from "../shared/personalCoachSchema";
import { ApiError } from "../utils/apiError";
import { successResponse } from "../utils/apiResponse";

export async function personalCoachController(req: Request, res: Response): Promise<void> {
  const validation = sanitizePersonalCoachRequest(req.body);
  if (!validation.ok) {
    throw new ApiError(
      400,
      "Dữ liệu ngữ cảnh Coach không hợp lệ.",
      undefined,
      validation.errorCode,
    );
  }

  const result = await processPersonalCoachRequest(validation.value);
  if (!result.ok) {
    throw new ApiError(result.status, result.message, undefined, result.errorCode);
  }

  res.status(200).json(successResponse({ recommendation: result.recommendation }));
}
