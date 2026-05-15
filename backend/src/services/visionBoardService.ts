import {
  MongoVisionBoardRepository,
  type CreateVisionBoardData,
  type UpdateVisionBoardData,
} from "../repositories/mongo/MongoVisionBoardRepository";
import { ApiError } from "../utils/apiError";
import { assertFreeTierLimit, hasPlusAccess } from "./freeTierLimits";

export interface CreateVisionBoardPayload {
  name: string;
  year: string;
  items?: Array<{
    type: string;
    content: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  goalId?: string;
}

export interface UpdateVisionBoardPayload {
  name?: string;
  year?: string;
  items?: Array<{
    type: string;
    content: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;
  goalId?: string;
}

const VALID_ITEM_TYPES = new Set(["image", "quote", "icon"]);

function validateItemType(type: string): type is "image" | "quote" | "icon" {
  return VALID_ITEM_TYPES.has(type);
}

function validateItems(
  items: CreateVisionBoardPayload["items"],
): Array<{ type: "image" | "quote" | "icon"; content: string; x: number; y: number; width: number; height: number }> {
  if (!items || items.length === 0) return [];

  return items.map((item, index) => {
    if (!item.type || !validateItemType(item.type)) {
      throw new ApiError(400, `items[${index}].type must be one of: image, quote, icon.`);
    }
    if (typeof item.content !== "string") {
      throw new ApiError(400, `items[${index}].content is required.`);
    }
    if (typeof item.x !== "number" || typeof item.y !== "number") {
      throw new ApiError(400, `items[${index}].x and items[${index}].y must be numbers.`);
    }
    if (typeof item.width !== "number" || typeof item.height !== "number") {
      throw new ApiError(400, `items[${index}].width and items[${index}].height must be numbers.`);
    }

    return {
      type: item.type,
      content: item.content,
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
    };
  });
}

export class VisionBoardService {
  constructor(
    private readonly repository: MongoVisionBoardRepository,
    private readonly hasPlusAccessForUser: (userId: string) => Promise<boolean> = hasPlusAccess,
  ) {}

  async createVisionBoard(userId: string, payload: CreateVisionBoardPayload) {
    if (!payload.name?.trim()) throw new ApiError(400, "name is required.");
    if (!payload.year?.trim()) throw new ApiError(400, "year is required.");

    const existingBoards = await this.repository.getVisionBoardsByUserId(userId);
    await assertFreeTierLimit({
      userId,
      limitName: "maxVisionBoards",
      currentCount: existingBoards.length,
      hasPlusAccess: this.hasPlusAccessForUser,
    });

    const validatedItems = validateItems(payload.items);

    const data: CreateVisionBoardData = {
      userId,
      name: payload.name.trim(),
      year: payload.year.trim(),
      items: validatedItems,
      goalId: payload.goalId?.trim() || undefined,
    };

    return this.repository.createVisionBoard(data);
  }

  async getUserVisionBoards(userId: string) {
    return this.repository.getVisionBoardsByUserId(userId);
  }

  async getVisionBoard(userId: string, boardId: string) {
    const board = await this.repository.getVisionBoardById(boardId);
    if (!board) throw new ApiError(404, "Vision board not found.");
    if (board.userId !== userId) throw new ApiError(403, "You do not have access to this vision board.");
    return board;
  }

  async updateVisionBoard(userId: string, boardId: string, payload: UpdateVisionBoardPayload) {
    const board = await this.repository.getVisionBoardById(boardId);
    if (!board) throw new ApiError(404, "Vision board not found.");
    if (board.userId !== userId) throw new ApiError(403, "You do not have access to this vision board.");

    const updates: UpdateVisionBoardData = {};
    if (payload.name !== undefined) updates.name = payload.name.trim() || board.name;
    if (payload.year !== undefined) updates.year = payload.year.trim() || board.year;
    if (payload.items !== undefined) updates.items = validateItems(payload.items);
    if (payload.goalId !== undefined) updates.goalId = payload.goalId.trim() || undefined;

    const updated = await this.repository.updateVisionBoard(boardId, updates);
    if (!updated) throw new ApiError(404, "Vision board not found.");
    return updated;
  }

  async deleteVisionBoard(userId: string, boardId: string) {
    const board = await this.repository.getVisionBoardById(boardId);
    if (!board) throw new ApiError(404, "Vision board not found.");
    if (board.userId !== userId) throw new ApiError(403, "You do not have access to this vision board.");

    const deleted = await this.repository.deleteVisionBoard(boardId);
    if (!deleted) throw new ApiError(404, "Vision board not found.");
    return { deleted: true };
  }
}

const repository = new MongoVisionBoardRepository();
export const visionBoardService = new VisionBoardService(repository);
