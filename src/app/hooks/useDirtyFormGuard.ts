import { useEffect, useRef } from "react";

export function useDirtyFormGuard(isDirty: boolean, flushPendingSave: () => void) {
  const isDirtyRef = useRef(isDirty);
  const flushPendingSaveRef = useRef(flushPendingSave);

  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    flushPendingSaveRef.current = flushPendingSave;
  }, [flushPendingSave]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirtyRef.current) return undefined;

      flushPendingSaveRef.current();
      event.preventDefault();
      event.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      if (isDirtyRef.current) {
        flushPendingSaveRef.current();
      }
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);
}
