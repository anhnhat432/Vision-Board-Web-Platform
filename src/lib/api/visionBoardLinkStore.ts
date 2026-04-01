const VISION_BOARD_LINK_STORAGE_KEY = "backend_vision_board_links";

// Maps local (UUID) vision board ID → backend (MongoDB ObjectId) vision board ID
type VisionBoardLinkMap = Record<string, string>;

function readLinkMap(): VisionBoardLinkMap {
  if (typeof window === "undefined") return {};

  try {
    const rawValue = localStorage.getItem(VISION_BOARD_LINK_STORAGE_KEY);
    if (!rawValue) return {};

    const parsedValue = JSON.parse(rawValue) as unknown;
    if (!parsedValue || typeof parsedValue !== "object") return {};

    return parsedValue as VisionBoardLinkMap;
  } catch {
    return {};
  }
}

function writeLinkMap(nextMap: VisionBoardLinkMap): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(VISION_BOARD_LINK_STORAGE_KEY, JSON.stringify(nextMap));
  } catch {
    // ignore storage errors
  }
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
