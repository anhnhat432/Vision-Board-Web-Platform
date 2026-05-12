import { describe, expect, it, vi } from "vitest";

import {
  claimCelebrationOnce,
  getCycleCelebrationStorageKey,
  hasNewCelebrationIds,
} from "./celebrationTriggers";

describe("celebrationTriggers", () => {
  it("does not treat the first seen achievement set as newly unlocked", () => {
    expect(hasNewCelebrationIds(null, new Set(["first-step"]))).toBe(false);
  });

  it("detects a genuinely new achievement id after the first seen set", () => {
    expect(hasNewCelebrationIds(new Set(["first-step"]), new Set(["first-step", "goal-setter"]))).toBe(true);
    expect(hasNewCelebrationIds(new Set(["first-step", "goal-setter"]), new Set(["goal-setter"]))).toBe(false);
  });

  it("claims a cycle celebration once per storage key", () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: vi.fn((key: string) => store.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => {
        store.set(key, value);
      }),
    };
    const key = getCycleCelebrationStorageKey("goal-1:cycle:1");

    expect(claimCelebrationOnce(key, storage)).toBe(true);
    expect(claimCelebrationOnce(key, storage)).toBe(false);
    expect(storage.setItem).toHaveBeenCalledWith(key, "true");
  });
});
