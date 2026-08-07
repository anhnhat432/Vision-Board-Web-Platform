const SAFE_REMOTE_IMAGE_PROTOCOLS = new Set(["http:", "https:"]);
const SAFE_RASTER_DATA_URL = /^data:image\/(?:png|jpe?g|gif|webp|avif);base64,[a-z0-9+/=]+$/i;

export function getSafeImageSource(source: unknown): string | undefined {
  if (typeof source !== "string") return undefined;

  const trimmed = source.trim();
  if (!trimmed) return undefined;
  if (SAFE_RASTER_DATA_URL.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    return SAFE_REMOTE_IMAGE_PROTOCOLS.has(url.protocol) ? trimmed : undefined;
  } catch {
    return undefined;
  }
}
