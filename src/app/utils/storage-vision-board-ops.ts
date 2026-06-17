import type {
  UserData,
  VisionBoard,
  VisionBoardItem,
  VisionBoardItemStyle,
  VisionBoardSizePreset,
  VisionBoardThemeId,
} from "./storage-types";
import { generateId } from "./storage-types";

const VALID_TYPES = ["image", "quote", "icon", "goal_card", "sticker"] as const;
const VALID_SIZE_PRESETS: VisionBoardSizePreset[] = ["S", "M", "L", "XL"];
const VALID_QUOTE_FONTS: NonNullable<VisionBoardItemStyle["quoteFont"]>[] = ["default", "handwriting", "serif", "bold"];
const VALID_IMAGE_FRAMES: NonNullable<VisionBoardItemStyle["imageFrame"]>[] = [
  "shadow",
  "polaroid",
  "washi",
  "minimal",
  "scalloped",
  "filmstrip",
  "watercolor",
];
const VALID_QUOTE_BACKGROUNDS: NonNullable<VisionBoardItemStyle["quoteBackground"]>[] = [
  "none",
  "dots",
  "highlight",
];
const VALID_THEMES: VisionBoardThemeId[] = ["aurora", "sunset", "forest", "nightsky", "minimal", "blossom", "dreamscape"];

function normalizeFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeVisionBoardItemStyle(value: unknown): VisionBoardItemStyle | undefined {
  if (!value || typeof value !== "object") return undefined;

  const raw = value as Record<string, unknown>;
  const style: VisionBoardItemStyle = {};

  if (typeof raw.sizePreset === "string" && VALID_SIZE_PRESETS.includes(raw.sizePreset as VisionBoardSizePreset)) {
    style.sizePreset = raw.sizePreset as VisionBoardSizePreset;
  }

  if (
    typeof raw.quoteFont === "string" &&
    VALID_QUOTE_FONTS.includes(raw.quoteFont as NonNullable<VisionBoardItemStyle["quoteFont"]>)
  ) {
    style.quoteFont = raw.quoteFont as NonNullable<VisionBoardItemStyle["quoteFont"]>;
  }

  if (
    typeof raw.imageFrame === "string" &&
    VALID_IMAGE_FRAMES.includes(raw.imageFrame as NonNullable<VisionBoardItemStyle["imageFrame"]>)
  ) {
    style.imageFrame = raw.imageFrame as NonNullable<VisionBoardItemStyle["imageFrame"]>;
  }

  if (
    typeof raw.quoteBackground === "string" &&
    VALID_QUOTE_BACKGROUNDS.includes(raw.quoteBackground as NonNullable<VisionBoardItemStyle["quoteBackground"]>)
  ) {
    style.quoteBackground = raw.quoteBackground as NonNullable<VisionBoardItemStyle["quoteBackground"]>;
  }

  return Object.keys(style).length > 0 ? style : undefined;
}

export function normalizeVisionBoardItem(item: unknown): VisionBoardItem | null {
  if (!item || typeof item !== "object") return null;

  const raw = item as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id : null;
  if (!id) return null;

  return {
    id,
    type: VALID_TYPES.includes(raw.type as VisionBoardItem["type"]) ? (raw.type as VisionBoardItem["type"]) : "image",
    content: typeof raw.content === "string" ? raw.content : "",
    x: normalizeFiniteNumber(raw.x, 10),
    y: normalizeFiniteNumber(raw.y, 10),
    width: normalizeFiniteNumber(raw.width, 220),
    height: normalizeFiniteNumber(raw.height, 220),
    lifeAreaId: typeof raw.lifeAreaId === "string" && raw.lifeAreaId.trim() ? raw.lifeAreaId.trim() : undefined,
    style: normalizeVisionBoardItemStyle(raw.style),
  };
}

export function normalizeVisionBoard(board: unknown): VisionBoard | null {
  if (!board || typeof board !== "object") return null;

  const raw = board as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id : null;
  if (!id) return null;

  const items = Array.isArray(raw.items)
    ? raw.items.map(normalizeVisionBoardItem).filter((item): item is VisionBoardItem => item !== null)
    : [];
  const theme =
    typeof raw.theme === "string" && VALID_THEMES.includes(raw.theme as VisionBoardThemeId)
      ? (raw.theme as VisionBoardThemeId)
      : undefined;
  let storyAnswers: VisionBoard["storyAnswers"] | undefined;

  if (raw.storyAnswers && typeof raw.storyAnswers === "object") {
    const answers = raw.storyAnswers as Record<string, unknown>;
    storyAnswers = {
      feelings: Array.isArray(answers.feelings)
        ? answers.feelings.filter((value): value is string => typeof value === "string")
        : undefined,
      focusAreas: Array.isArray(answers.focusAreas)
        ? answers.focusAreas.filter((value): value is string => typeof value === "string")
        : undefined,
      coreQuote: typeof answers.coreQuote === "string" ? answers.coreQuote : undefined,
    };
  }

  return {
    id,
    name: typeof raw.name === "string" ? raw.name : "",
    year: typeof raw.year === "string" ? raw.year : new Date().getFullYear().toString(),
    items,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
    theme,
    storyAnswers,
  };
}

export function addVisionBoardToData(
  data: UserData,
  board: Omit<VisionBoard, "id" | "createdAt">,
  createdAt = new Date().toISOString(),
): string {
  const newBoard: VisionBoard = {
    ...board,
    id: generateId("board"),
    createdAt,
  };

  data.visionBoards.push(newBoard);
  return newBoard.id;
}

export function updateVisionBoardInData(data: UserData, boardId: string, updates: Partial<VisionBoard>): boolean {
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
