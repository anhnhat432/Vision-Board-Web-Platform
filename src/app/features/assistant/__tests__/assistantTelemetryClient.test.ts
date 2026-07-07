import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const appModeMock = vi.hoisted(() => ({
  isRealMode: vi.fn(),
}));

const apiClientMock = vi.hoisted(() => ({
  getApiBaseUrl: vi.fn(),
}));

const authedFetchMock = vi.hoisted(() => ({
  authedFetch: vi.fn(),
}));

const observabilityMock = vi.hoisted(() => {
  const state: { sink: ((event: Record<string, unknown>) => void) | null } = { sink: null };
  return {
    state,
    setAssistantEventSink: vi.fn((sink: ((event: Record<string, unknown>) => void) | null) => {
      state.sink = sink;
    }),
  };
});

vi.mock("@/app/utils/app-mode", () => ({
  isRealMode: appModeMock.isRealMode,
}));

vi.mock("@/lib/api/apiClient", () => ({
  getApiBaseUrl: apiClientMock.getApiBaseUrl,
}));

vi.mock("@/lib/auth/authedFetch", () => ({
  authedFetch: authedFetchMock.authedFetch,
}));

vi.mock("../assistantObservability", () => ({
  setAssistantEventSink: observabilityMock.setAssistantEventSink,
}));

import {
  __getTelemetryBufferForTest,
  __resetTelemetryForTest,
  startAssistantTelemetryForwarding,
  stopAssistantTelemetryForwarding,
} from "../assistantTelemetryClient";

function setNavigatorOnline(value: boolean): void {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    value,
  });
}

function setVisibilityState(value: DocumentVisibilityState): void {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value,
  });
}

function createForwardedEvent() {
  return {
    id: "event_1",
    type: "assistant_feedback_submitted",
    createdAt: "2026-07-07T00:00:00.000Z",
    userId: "user_1",
    sessionId: "session_1",
    route: "/assistant",
    success: true,
    metadata: { rawText: "do not forward metadata" },
  };
}

describe("assistantTelemetryClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetTelemetryForTest();
    observabilityMock.state.sink = null;
    appModeMock.isRealMode.mockReturnValue(true);
    apiClientMock.getApiBaseUrl.mockReturnValue("https://api.example.test/api");
    authedFetchMock.authedFetch.mockResolvedValue(new Response(null, { status: 200 }));
    setNavigatorOnline(true);
    setVisibilityState("visible");
  });

  afterEach(() => {
    __resetTelemetryForTest();
    vi.restoreAllMocks();
  });

  it("flushes buffered telemetry when the tab becomes hidden", async () => {
    startAssistantTelemetryForwarding();
    expect(observabilityMock.state.sink).toEqual(expect.any(Function));

    observabilityMock.state.sink?.(createForwardedEvent());

    expect(__getTelemetryBufferForTest()).toHaveLength(1);
    expect(authedFetchMock.authedFetch).not.toHaveBeenCalled();

    setVisibilityState("hidden");
    document.dispatchEvent(new Event("visibilitychange"));

    await vi.waitFor(() => {
      expect(authedFetchMock.authedFetch).toHaveBeenCalledWith(
        "https://api.example.test/api/ai/assistant/telemetry",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            events: [
              {
                type: "assistant_feedback_submitted",
                route: "/assistant",
                success: true,
                sessionId: "session_1",
                createdAt: "2026-07-07T00:00:00.000Z",
              },
            ],
          }),
        }),
      );
    });

    expect(__getTelemetryBufferForTest()).toHaveLength(0);
  });

  it("removes lifecycle listeners and pending flushes when forwarding stops", async () => {
    startAssistantTelemetryForwarding();
    expect(observabilityMock.state.sink).toEqual(expect.any(Function));

    observabilityMock.state.sink?.(createForwardedEvent());
    expect(__getTelemetryBufferForTest()).toHaveLength(1);

    stopAssistantTelemetryForwarding();

    setVisibilityState("hidden");
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("online"));

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(authedFetchMock.authedFetch).not.toHaveBeenCalled();
    expect(__getTelemetryBufferForTest()).toHaveLength(1);
    expect(observabilityMock.setAssistantEventSink).toHaveBeenLastCalledWith(null);
  });
});
