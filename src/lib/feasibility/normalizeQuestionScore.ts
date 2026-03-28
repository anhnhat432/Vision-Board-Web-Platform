export function clampToUnitInterval(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function normalizeQuestionScore(score: number): number {
  return clampToUnitInterval((score - 1) / 3);
}
