import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authedFetch: vi.fn(),
  getApiBaseUrl: vi.fn(() => "http://localhost:4000/api"),
  isApiBaseUrlConfigured: vi.fn(() => true),
  isRealMode: vi.fn(() => true),
  setAssistantEventSink: vi.fn(),
}));

vi.mock("@/app/utils/app-mode", () => ({
  isRealMode: mocks.isRealMode,
}));

vi.mock("@/lib/api/apiClient", () => ({
  getApiBaseUrl: mocks.getApiBaseUrl,
  isApiBaseUrlConfigured: mocks.isApiBaseUrlConfigured,
}));

vi.mock("@/lib/auth/authedFetch", () => ({
  authedFetch: mocks.authedFetch,
}));

vi.mock("../assistantObservability", () => ({
  setAssistantEventSink: mocks.setAssistantEventSink,
}));

describe("assistantTelemetryClient", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.getApiBaseUrl.mockReturnValue("http://localhost:4000/api");
    mocks.isApiBaseUrlConfigured.mockReturnValue(true);
    mocks.isRealMode.mockReturnValue(true);
  });

  it("does not forward telemetry to the localhost fallback when API base URL is not configured", async () => {
    mocks.isApiBaseUrlConfigured.mockReturnValue(false);
    const telemetry = await import("../assistantTelemetryClient");

    telemetry.startAssistantTelemetryForwarding();
    const lastSetSinkCall = mocks.setAssistantEventSink.mock.calls[mocks.setAssistantEventSink.mock.calls.length - 1];
    const sink = lastSetSinkCall?.[0];
    expect(sink).toEqual(expect.any(Function));

    sink?.({
      type: "assistant_message_sent",
      route: "/12-week-system",
      sessionId: "session-test",
      createdAt: "2026-07-08T00:00:00.000Z",
    });
    await telemetry.flushTelemetry();

    expect(telemetry.__getTelemetryBufferForTest()).toEqual([]);
    expect(mocks.getApiBaseUrl).not.toHaveBeenCalled();
    expect(mocks.authedFetch).not.toHaveBeenCalled();
  });
});
