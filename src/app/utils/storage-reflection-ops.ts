import type { Reflection, UserData } from "./storage-types";

export function addReflectionToData(
  data: UserData,
  reflection: Omit<Reflection, "id">,
): void {
  data.reflections.unshift({
    ...reflection,
    id: `reflection_${Date.now()}`,
  });
}

export function upsertReflectionInData(
  data: UserData,
  reflection: Omit<Reflection, "id">,
): void {
  const existingIndex = data.reflections.findIndex(
    (item) =>
      item.entryType === reflection.entryType &&
      item.linkedGoalId === reflection.linkedGoalId &&
      item.linkedWeekNumber === reflection.linkedWeekNumber &&
      Boolean(reflection.entryType === "weekly-review"),
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
    id: `reflection_${Date.now()}`,
  });
}

export function deleteReflectionFromData(data: UserData, reflectionId: string): void {
  data.reflections = data.reflections.filter((reflection) => reflection.id !== reflectionId);
}
