import { useEffect, useState } from "react";
import { PET_PREFERENCES_STORAGE_KEY, readPetPreferences, writePetPreferences } from "./petSettings";
import type { PetPreferences } from "./types";

export function usePetPreferences() {
  const [preferences, setPreferences] = useState<PetPreferences>(() => readPetPreferences());

  useEffect(() => {
    const handlePreferencesChange = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail : undefined;
      setPreferences(detail ?? readPetPreferences());
    };

    window.addEventListener(PET_PREFERENCES_STORAGE_KEY, handlePreferencesChange);
    window.addEventListener("storage", handlePreferencesChange);

    return () => {
      window.removeEventListener(PET_PREFERENCES_STORAGE_KEY, handlePreferencesChange);
      window.removeEventListener("storage", handlePreferencesChange);
    };
  }, []);

  const updatePreferences = (nextPreferences: PetPreferences) => {
    setPreferences(nextPreferences);
    writePetPreferences(nextPreferences);
  };

  return { preferences, updatePreferences };
}
