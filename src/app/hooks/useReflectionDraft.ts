import { useCallback, useEffect, useMemo, useRef } from "react";

export type ReflectionDraft = {
  content: string;
  savedAt: string;
};

const REFLECTION_DRAFT_PREFIX = "pendingReflectionDraft_";
const REFLECTION_DRAFT_DEBOUNCE_MS = 500;

function createReflectionDraftKey(weekId?: string | null) {
  return `${REFLECTION_DRAFT_PREFIX}${weekId ?? "freeform"}`;
}

function parseReflectionDraft(raw: string | null): ReflectionDraft | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<ReflectionDraft>;
    if (typeof parsed.content !== "string" || parsed.content.length === 0) return null;
    if (typeof parsed.savedAt !== "string") return null;

    return {
      content: parsed.content,
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

export function useReflectionDraft(weekId?: string | null) {
  const timeoutRef = useRef<number | null>(null);
  const storageKey = useMemo(() => createReflectionDraftKey(weekId), [weekId]);

  const cancelPendingSave = useCallback(() => {
    if (!timeoutRef.current) return;

    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
  }, []);

  const loadDraft = useCallback(() => parseReflectionDraft(localStorage.getItem(storageKey)), [storageKey]);

  const clearDraft = useCallback(() => {
    cancelPendingSave();
    localStorage.removeItem(storageKey);
  }, [cancelPendingSave, storageKey]);

  const saveDraft = useCallback(
    (content: string) => {
      cancelPendingSave();

      if (!content.trim()) {
        localStorage.removeItem(storageKey);
        return;
      }

      timeoutRef.current = window.setTimeout(() => {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            content,
            savedAt: new Date().toISOString(),
          } satisfies ReflectionDraft),
        );
        timeoutRef.current = null;
      }, REFLECTION_DRAFT_DEBOUNCE_MS);
    },
    [cancelPendingSave, storageKey],
  );

  useEffect(() => cancelPendingSave, [cancelPendingSave]);

  return {
    clearDraft,
    loadDraft,
    saveDraft,
    storageKey,
  };
}
