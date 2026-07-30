const GA_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/i;
type DataLayerEntry = Record<string, unknown> & { event?: unknown };

export function resolveGaMeasurementId(primaryId?: string, firebaseId?: string): string {
  return primaryId?.trim() || firebaseId?.trim() || "";
}

export function getConfiguredGaMeasurementId(): string {
  return resolveGaMeasurementId(
    import.meta.env.VITE_GA_MEASUREMENT_ID,
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
  );
}

export function isGaMeasurementId(value: string): boolean {
  return GA_MEASUREMENT_ID_PATTERN.test(value);
}

export function createGtagCommandQueue(dataLayer: DataLayerEntry[]): (...args: unknown[]) => void {
  return function gtag(): void {
    // biome-ignore lint/complexity/noArguments: gtag.js requires real Arguments objects, not rest-parameter arrays.
    dataLayer.push(arguments as unknown as DataLayerEntry);
  };
}
