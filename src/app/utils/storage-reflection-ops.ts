import type { Reflection, UserData } from "./storage-types";
import { generateId } from "./storage-types";

export function addReflectionToData(data: UserData, reflection: Omit<Reflection, "id">): void {
  data.reflections.unshift({
    ...reflection,
    id: generateId("reflection"),
  });
}

export function upsertReflectionInData(data: UserData, reflection: Omit<Reflection, "id">): void {
  const existingIndex = data.reflections.findIndex(
    (item) =>
      item.entryType === reflection.entryType &&
      item.linkedGoalId === reflection.linkedGoalId &&
      ((reflection.entryType === "weekly-review" && item.linkedWeekNumber === reflection.linkedWeekNumber) ||
        (reflection.entryType === "cycleReview" && item.cycleId === reflection.cycleId)),
  );

  if (existingIndex >= 0) {
    data.reflections[existingIndex] = {
      ...data.reflections[existingIndex],
      ...reflection,
    };
    return;
  }

  data.reflections.unshift({
    ...reflection,
    id: generateId("reflection"),
  });
}

export function deleteReflectionFromData(data: UserData, reflectionId: string): void {
  data.reflections = data.reflections.filter((reflection) => reflection.id !== reflectionId);
}
