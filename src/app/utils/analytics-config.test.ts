import { describe, expect, it } from "vitest";

import { isGaMeasurementId, resolveGaMeasurementId } from "./analytics-config";

describe("analytics config", () => {
  it("prefers the explicit GA measurement id", () => {
    expect(resolveGaMeasurementId(" G-PRIMARY1 ", "G-FIREBASE1")).toBe("G-PRIMARY1");
  });

  it("falls back to the Firebase measurement id", () => {
    expect(resolveGaMeasurementId("", " G-FIREBASE1 ")).toBe("G-FIREBASE1");
  });

  it("accepts only GA4 web-stream measurement ids", () => {
    expect(isGaMeasurementId("G-FIREBASE1")).toBe(true);
    expect(isGaMeasurementId("firebase-measurement")).toBe(false);
  });
});
