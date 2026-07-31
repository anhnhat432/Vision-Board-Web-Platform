import { describe, expect, it } from "vitest";

import {
  createGtagCommandQueue,
  isGaMeasurementId,
  resolveGaMeasurementId,
} from "./analytics-config";

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

  it("queues gtag commands as Arguments objects for the Google runtime", () => {
    const dataLayer: Array<Record<string, unknown> & { event?: unknown }> = [];
    const gtag = createGtagCommandQueue(dataLayer);
    const pageView = { page_path: "/billing/plan" };

    gtag("event", "page_view", pageView);

    const command = dataLayer[0];
    expect(Array.isArray(command)).toBe(false);
    expect(Object.prototype.toString.call(command)).toBe("[object Arguments]");
    expect(Array.from(command as unknown as IArguments)).toEqual(["event", "page_view", pageView]);
  });
});
