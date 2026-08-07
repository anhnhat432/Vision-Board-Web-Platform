const SAFE_REMOTE_IMAGE_PROTOCOLS = new Set(["http:", "https:"]);
const SAFE_RASTER_DATA_URL = /^data:image\/(?:png|jpe?g|gif|webp|avif);base64,[a-z0-9+/=]+$/i;

export function getSafeImageSource(source: unknown): string | undefined {
  if (typeof source !== "string") return undefined;

  const trimmed = source.trim();
  if (!trimmed) return undefined;

  try {
    const encoded = encodeURI(trimmed);
    if (SAFE_RASTER_DATA_URL.test(trimmed)) return encoded;

    const url = new URL(encoded);
    return SAFE_REMOTE_IMAGE_PROTOCOLS.has(url.protocol) ? encoded : undefined;
  } catch {
    return undefined;
  }
}
