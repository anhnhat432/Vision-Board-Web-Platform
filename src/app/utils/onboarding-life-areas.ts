import { LIFE_AREAS } from "./storage-constants";
import type { LifeArea } from "./storage-types";

const CUSTOM_AREA_FALLBACK_COLOR = "#64748b";

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
