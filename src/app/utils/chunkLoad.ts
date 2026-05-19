const CHUNK_RELOAD_STORAGE_KEY = "visionboard:chunk-load-reload";
const RELOAD_WINDOW_MS = 60_000;

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error ?? "");
}

export function isChunkLoadError(error: unknown): boolean {
  const message = getErrorMessage(error);
  return (
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Importing a module script failed") ||
    message.includes("error loading dynamically imported module") ||
    message.includes("Loading chunk") ||
    message.includes("Loading CSS chunk") ||
    message.includes("ChunkLoadError")
  );
}

function readReloadMarker(): { key: string; at: number } | null {
  try {
    const raw = sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY);
    if (!raw) return null;
    const marker = JSON.parse(raw) as Partial<{ key: string; at: number }>;
    if (typeof marker.key !== "string" || typeof marker.at !== "number") return null;
    return { key: marker.key, at: marker.at };
  } catch {
    return null;
  }
}

function writeReloadMarker(key: string): void {
  try {
    sessionStorage.setItem(CHUNK_RELOAD_STORAGE_KEY, JSON.stringify({ key, at: Date.now() }));
  } catch {
    // Ignore storage failures; rethrowing would hide the original import error.
  }
}

function clearReloadMarker(): void {
  try {
    sessionStorage.removeItem(CHUNK_RELOAD_STORAGE_KEY);
  } catch {
    // Ignore storage failures; clearing this marker is a best-effort cleanup.
  }
}

export function reloadOnceForChunkError(error: unknown): boolean {
  if (typeof window === "undefined" || !isChunkLoadError(error)) return false;

  const key = `${window.location.pathname}${window.location.search}`;
  const marker = readReloadMarker();
  const alreadyReloadedRecently = marker?.key === key && Date.now() - marker.at < RELOAD_WINDOW_MS;

  if (alreadyReloadedRecently) return false;

  writeReloadMarker(key);
  window.location.reload();
  return true;
}

export async function loadWithChunkReload<T>(loader: () => Promise<T>): Promise<T> {
  try {
    const result = await loader();
    clearReloadMarker();
    return result;
  } catch (error) {
    if (reloadOnceForChunkError(error)) {
      return new Promise<T>(() => {
        // Keep React suspended until the browser reloads with the latest asset map.
      });
    }
    throw error;
  }
}

type VitePreloadErrorEvent = Event & {
  payload?: unknown;
};

export function installChunkLoadRecovery(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("vite:preloadError", (event) => {
    const payload = (event as VitePreloadErrorEvent).payload;
    if (reloadOnceForChunkError(payload)) {
      event.preventDefault();
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    if (reloadOnceForChunkError(event.reason)) {
      event.preventDefault();
    }
  });
}
