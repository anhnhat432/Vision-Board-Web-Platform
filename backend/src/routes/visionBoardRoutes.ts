import { Router } from "express";

import {
  createVisionBoard,
  deleteVisionBoard,
  getVisionBoardById,
  getVisionBoards,
  updateVisionBoard,
} from "../controllers/visionBoardController";
import { validateJsonObjectBody, validateObjectIdParam } from "../middleware/requestValidation";
import { asyncHandler } from "../utils/asyncHandler";

const visionBoardRoutes = Router();

visionBoardRoutes.post("/vision-boards", validateJsonObjectBody, asyncHandler(createVisionBoard));
visionBoardRoutes.get("/vision-boards", asyncHandler(getVisionBoards));
visionBoardRoutes.get(
  "/vision-boards/:id",
  validateObjectIdParam("id", "visionBoardId"),
  asyncHandler(getVisionBoardById),
);
visionBoardRoutes.put(
  "/vision-boards/:id",
  validateObjectIdParam("id", "visionBoardId"),
  validateJsonObjectBody,
  asyncHandler(updateVisionBoard),
);
visionBoardRoutes.delete(
  "/vision-boards/:id",
  validateObjectIdParam("id", "visionBoardId"),
  asyncHandler(deleteVisionBoard),
);

export { visionBoardRoutes };
