import type { UserData, VisionBoard } from "./storage-types";

export function addVisionBoardToData(
  data: UserData,
  board: Omit<VisionBoard, "id" | "createdAt">,
  createdAt = new Date().toISOString(),
): string {
  const newBoard: VisionBoard = {
    ...board,
    id: `board_${Date.now()}`,
    createdAt,
  };

  data.visionBoards.push(newBoard);
  return newBoard.id;
}

export function updateVisionBoardInData(
  data: UserData,
  boardId: string,
  updates: Partial<VisionBoard>,
): boolean {
  const boardIndex = data.visionBoards.findIndex((board) => board.id === boardId);
  if (boardIndex === -1) return false;

  data.visionBoards[boardIndex] = {
    ...data.visionBoards[boardIndex],
    ...updates,
  };
  return true;
}

export function deleteVisionBoardFromData(data: UserData, boardId: string): void {
  data.visionBoards = data.visionBoards.filter((board) => board.id !== boardId);
}
