export function cleanupLegacyAssistantHistory(): void {
  try {
    localStorage.removeItem("assistant.chat.history");
  } catch {}
}
