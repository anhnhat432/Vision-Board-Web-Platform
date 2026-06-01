import type { VisionBoardItemStyle, VisionBoardItemType, VisionBoardThemeId } from "@/app/utils/storage-types";
import { delete as deleteReq, get, post, put } from "@/lib/api/apiClient";

export interface ApiVisionBoardItem {
  id: string;
  type: VisionBoardItemType;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  lifeAreaId?: string;
  style?: VisionBoardItemStyle;
}

export interface ApiVisionBoard {
  id: string;
  userId: string;
  name: string;
  year: string;
  items: ApiVisionBoardItem[];
  theme?: VisionBoardThemeId;
  goalId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVisionBoardPayload {
  name: string;
  year: string;
  items: Omit<ApiVisionBoardItem, "id">[];
  theme?: VisionBoardThemeId;
  goalId?: string;
}

export interface UpdateVisionBoardPayload {
  name?: string;
  year?: string;
  items?: Omit<ApiVisionBoardItem, "id">[];
  theme?: VisionBoardThemeId;
  goalId?: string;
}

export function createVisionBoard(payload: CreateVisionBoardPayload): Promise<ApiVisionBoard> {
  return post<ApiVisionBoard, CreateVisionBoardPayload>("/vision-boards", payload);
}

export function getVisionBoards(): Promise<ApiVisionBoard[]> {
  return get<ApiVisionBoard[]>("/vision-boards");
}

export function getVisionBoard(boardId: string): Promise<ApiVisionBoard> {
  return get<ApiVisionBoard>(`/vision-boards/${boardId}`);
}

export function updateVisionBoard(boardId: string, payload: UpdateVisionBoardPayload): Promise<ApiVisionBoard> {
  return put<ApiVisionBoard, UpdateVisionBoardPayload>(`/vision-boards/${boardId}`, payload);
}

export function deleteVisionBoard(boardId: string): Promise<unknown> {
  return deleteReq(`/vision-boards/${boardId}`);
}
