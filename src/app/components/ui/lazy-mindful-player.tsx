import { lazy, Suspense, useEffect, useState } from "react";

const MindfulPlayer = lazy(() =>
  import("./mindful-player").then((module) => ({
    default: module.MindfulPlayer,
  })),
);

const DEFAULT_DEFER_LOAD_MS = 5200;

interface LazyMindfulPlayerProps {
  deferMs?: number;
}

function MindfulPlayerFallback({ onWarmLoad }: { onWarmLoad?: () => void }) {
  return (
    <span
      aria-hidden="true"
      className="h-9 w-9 shrink-0 rounded-full border border-app-line bg-app-surface"
      onFocus={onWarmLoad}
      onPointerDown={onWarmLoad}
      onPointerEnter={onWarmLoad}
      onTouchStart={onWarmLoad}
    />
  );
}

export function LazyMindfulPlayer({ deferMs = DEFAULT_DEFER_LOAD_MS }: LazyMindfulPlayerProps = {}) {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (shouldLoad) return;

    let idleHandle: number | null = null;
    const load = () => setShouldLoad(true);
    const timeoutHandle = window.setTimeout(() => {
      if ("requestIdleCallback" in window) {
        idleHandle = window.requestIdleCallback(load, { timeout: 1200 });
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

  const warmLoad = () => setShouldLoad(true);

  if (!shouldLoad) {
    return <MindfulPlayerFallback onWarmLoad={warmLoad} />;
  }

  return (
    <Suspense fallback={<MindfulPlayerFallback />}>
      <MindfulPlayer />
    </Suspense>
  );
}
