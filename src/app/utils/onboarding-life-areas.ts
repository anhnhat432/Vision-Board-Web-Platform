import { LIFE_AREAS } from "./storage-constants";
import type { LifeArea } from "./storage-types";

const CUSTOM_AREA_FALLBACK_COLOR = "#64748b";

/**
 * Số lượng lĩnh vực tối đa: 8 base + 4 custom.
 */
export const MAX_LIFE_AREAS = 12;

/**
 * Độ dài tối đa của tên lĩnh vực tùy chỉnh.
 */
export const CUSTOM_AREA_NAME_MAX = 30;

/**
 * Chọn màu cho custom area dựa trên hash của tên, sử dụng palette màu
 * từ LIFE_AREAS để đảm bảo màu luôn nằm trong bộ màu hệ thống.
 */
export function pickCustomAreaColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  const palette = LIFE_AREAS.map((a) => a.color);
  return palette[h % palette.length];
}

/**
 * Kiểm tra xem một tên lĩnh vực có thuộc 8 lĩnh vực mặc định hay không.
 */
export function isDefaultLifeArea(name: string): boolean {
  return LIFE_AREAS.some((a) => a.name === name);
}

export type AddAreaResult =
  | { ok: true; area: LifeArea }
  | { ok: false; error: string };

/**
 * Validate và tạo một lĩnh vực tùy chỉnh mới.
 * Trả về { ok: true, area } nếu hợp lệ, hoặc { ok: false, error } nếu không.
 */
export function buildCustomArea(
  rawName: string,
  existing: LifeArea[],
): AddAreaResult {
  const name = rawName.trim();
  if (!name) {
    return { ok: false, error: "Vui lòng nhập tên lĩnh vực." };
  }
  if (name.length > CUSTOM_AREA_NAME_MAX) {
    return {
      ok: false,
      error: `Tên tối đa ${CUSTOM_AREA_NAME_MAX} ký tự.`,
    };
  }
  if (existing.some((a) => a.name.toLowerCase() === name.toLowerCase())) {
    return { ok: false, error: "Tên lĩnh vực đã tồn tại." };
  }
  if (existing.length >= MAX_LIFE_AREAS) {
    return {
      ok: false,
      error: `Tối đa ${MAX_LIFE_AREAS} lĩnh vực.`,
    };
  }
  return {
    ok: true,
    area: { name, score: 5, color: pickCustomAreaColor(name) },
  };
}

/**
 * Xóa một lĩnh vực tại index chỉ định và re-index lại reviewedAreaIndices.
 * Các index > removeIndex sẽ giảm 1, index == removeIndex bị loại,
 * index < removeIndex giữ nguyên.
 */
export function removeAreaAtIndex(
  lifeAreas: LifeArea[],
  reviewed: Set<number>,
  removeIndex: number,
): { lifeAreas: LifeArea[]; reviewed: Set<number> } {
  const nextAreas = lifeAreas.filter((_, i) => i !== removeIndex);
  const nextReviewed = new Set<number>();
  reviewed.forEach((i) => {
    if (i === removeIndex) return;
    nextReviewed.add(i > removeIndex ? i - 1 : i);
  });
  return { lifeAreas: nextAreas, reviewed: nextReviewed };
}

export function mergeOnboardingLifeAreas(
  draftLifeAreas: Array<Partial<LifeArea>> | undefined,
  normalizeScore: (v: unknown) => number,
): LifeArea[] {
  const drafts = Array.isArray(draftLifeAreas) ? draftLifeAreas : [];
  const baseNames = new Set(LIFE_AREAS.map((a) => a.name));

  const base = LIFE_AREAS.map((baseArea) => {
    const draftArea = drafts.find((a) => a?.name === baseArea.name);
    return { ...baseArea, score: normalizeScore(draftArea?.score) };
  });

  const custom = drafts
    .filter((a) => typeof a?.name === "string" && a.name.trim() !== "" && !baseNames.has(a.name))
    .map((a) => ({
      name: a.name as string,
      score: normalizeScore(a.score),
      color: typeof a.color === "string" && a.color ? a.color : CUSTOM_AREA_FALLBACK_COLOR,
    }));

  return [...base, ...custom];
}
