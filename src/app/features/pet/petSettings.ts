import type { PetPreferences } from "./types";

export const PET_PREFERENCES_STORAGE_KEY = "visionboard_mam_pet_preferences_v1";

export const DEFAULT_PET_PREFERENCES: PetPreferences = {
  animationEnabled: true,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function readPetPreferences(): PetPreferences {
  if (typeof window === "undefined") return DEFAULT_PET_PREFERENCES;

  try {
    const raw = window.localStorage.getItem(PET_PREFERENCES_STORAGE_KEY);
    if (!raw) return DEFAULT_PET_PREFERENCES;

    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return DEFAULT_PET_PREFERENCES;

    return {
      animationEnabled:
        typeof parsed.animationEnabled === "boolean"
          ? parsed.animationEnabled
          : DEFAULT_PET_PREFERENCES.animationEnabled,
    };
  } catch {
    return DEFAULT_PET_PREFERENCES;
  }
}

export function writePetPreferences(nextPreferences: PetPreferences): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(PET_PREFERENCES_STORAGE_KEY, JSON.stringify(nextPreferences));
    window.dispatchEvent(new CustomEvent(PET_PREFERENCES_STORAGE_KEY, { detail: nextPreferences }));
  } catch {
    // Ignore storage errors; the companion remains optional UI.
  }
}
