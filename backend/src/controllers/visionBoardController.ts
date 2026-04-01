import type { Request, Response } from "express";

import { visionBoardService } from "../services/visionBoardService";
import { successResponse } from "../utils/apiResponse";
import { requireAuthUser } from "./controllerHelpers";

export async function createVisionBoard(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const board = await visionBoardService.createVisionBoard(user.uid, req.body ?? {});
  res.status(201).json(successResponse(board));
}

export async function getVisionBoards(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const boards = await visionBoardService.getUserVisionBoards(user.uid);
  res.status(200).json(successResponse(boards));
}

export async function getVisionBoardById(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const board = await visionBoardService.getVisionBoard(user.uid, req.params.id);
  res.status(200).json(successResponse(board));
}

export async function updateVisionBoard(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const board = await visionBoardService.updateVisionBoard(user.uid, req.params.id, req.body ?? {});
  res.status(200).json(successResponse(board));
}

export async function deleteVisionBoard(req: Request, res: Response): Promise<void> {
  const user = requireAuthUser(req);
  const result = await visionBoardService.deleteVisionBoard(user.uid, req.params.id);
  res.status(200).json(successResponse(result));
}
