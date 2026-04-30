import { readBackendLinkMap, writeBackendLinkMap } from "@/app/utils/backend-link-storage";

const VISION_BOARD_LINK_STORAGE_KEY = "backend_vision_board_links";

// Maps local (UUID) vision board ID → backend (MongoDB ObjectId) vision board ID
type VisionBoardLinkMap = Record<string, string>;

function readLinkMap(): VisionBoardLinkMap {
  return readBackendLinkMap<VisionBoardLinkMap>(VISION_BOARD_LINK_STORAGE_KEY);
}

function writeLinkMap(nextMap: VisionBoardLinkMap): void {
  writeBackendLinkMap(VISION_BOARD_LINK_STORAGE_KEY, nextMap);
}

export function saveVisionBoardLink(localBoardId: string, backendBoardId: string): void {
  const nextMap = readLinkMap();
  nextMap[localBoardId] = backendBoardId;
  writeLinkMap(nextMap);
}

export function getBackendVisionBoardId(localBoardId: string): string | null {
  return readLinkMap()[localBoardId] ?? null;
}

export function getLocalVisionBoardId(backendBoardId: string): string | null {
  const map = readLinkMap();
  for (const [localId, backendId] of Object.entries(map)) {
    if (backendId === backendBoardId) return localId;
  }
  return null;
}
