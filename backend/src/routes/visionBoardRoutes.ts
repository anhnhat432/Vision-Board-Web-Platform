import { Router } from "express";

import {
  createVisionBoard,
  deleteVisionBoard,
  getVisionBoardById,
  getVisionBoards,
  updateVisionBoard,
} from "../controllers/visionBoardController";
import { asyncHandler } from "../utils/asyncHandler";

const visionBoardRoutes = Router();

visionBoardRoutes.post("/vision-boards", asyncHandler(createVisionBoard));
visionBoardRoutes.get("/vision-boards", asyncHandler(getVisionBoards));
visionBoardRoutes.get("/vision-boards/:id", asyncHandler(getVisionBoardById));
visionBoardRoutes.put("/vision-boards/:id", asyncHandler(updateVisionBoard));
visionBoardRoutes.delete("/vision-boards/:id", asyncHandler(deleteVisionBoard));

export { visionBoardRoutes };
