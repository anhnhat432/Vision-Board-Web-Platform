import { lazy, Suspense, useEffect, useState } from "react";
import type { PetEvent } from "./types";

interface LazyMamCompanionProps {
  initialEvent?: PetEvent;
  className?: string;
  compact?: boolean;
  animated?: boolean;
  deferMs?: number;
}

const MamCompanion = lazy(() =>
  import("./MamCompanion").then((module) => ({
    default: module.MamCompanion,
  })),
);

const DEFAULT_DEFER_LOAD_MS = 900;

function MamCompanionFallback({ className = "", compact = false }: Pick<LazyMamCompanionProps, "className" | "compact">) {
  return (
    <span
      aria-hidden="true"
      className={`flex items-end gap-3 ${compact ? "justify-end" : "justify-between"} ${className}`}
    >
      <span className={`mam-pet mam-pet--static ${compact ? "mam-pet--compact" : ""}`} />
    </span>
  );
}

export function LazyMamCompanion(props: LazyMamCompanionProps) {
  const [shouldLoad, setShouldLoad] = useState(false);
  const deferMs = props.deferMs ?? DEFAULT_DEFER_LOAD_MS;

  useEffect(() => {
    if (shouldLoad) return;

    let idleHandle: number | null = null;
    const load = () => setShouldLoad(true);
    const timeoutHandle = window.setTimeout(() => {
      if ("requestIdleCallback" in window) {
        idleHandle = window.requestIdleCallback(load, { timeout: 900 });
        return;
      }

      load();
    }, deferMs);

    return () => {
      window.clearTimeout(timeoutHandle);
      if (idleHandle !== null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleHandle);
      }
    };
  }, [deferMs, shouldLoad]);

  if (!shouldLoad) {
    return <MamCompanionFallback className={props.className} compact={props.compact} />;
  }

  return (
    <Suspense fallback={<MamCompanionFallback className={props.className} compact={props.compact} />}>
      <MamCompanion {...props} />
    </Suspense>
  );
}
