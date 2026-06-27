import type { PetEventPayload } from "./types";

export const PET_EVENT_NAME = "visionboard:mam-pet-event";

export function emitPetEvent(payload: PetEventPayload): void {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent<PetEventPayload>(PET_EVENT_NAME, {
      detail: {
        ...payload,
        createdAt: payload.createdAt ?? Date.now(),
      },
    }),
  );
}
