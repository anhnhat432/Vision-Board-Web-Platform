const GA_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/i;

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
