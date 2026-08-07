import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { apiGet } = vi.hoisted(() => ({ apiGet: vi.fn() }));

vi.mock("@/lib/api/apiClient", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api/apiClient")>("@/lib/api/apiClient");
  return {
    ...actual,
    apiClient: { ...actual.apiClient, get: apiGet },
  };
});

import { getPlanningResource } from "./planningReadRequest";

describe("getPlanningResource", () => {
  beforeEach(() => {
    apiGet.mockReset();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shares one in-flight GET for the same normalized path", async () => {
    let resolveRequest: ((value: { id: string }) => void) | undefined;
    apiGet.mockImplementation(
      () =>
        new Promise<{ id: string }>((resolve) => {
          resolveRequest = resolve;
        }),
    );

    const first = getPlanningResource<{ id: string }>("plans/plan-single-flight");
    const second = getPlanningResource<{ id: string }>("/plans/plan-single-flight");
    expect(apiGet).toHaveBeenCalledTimes(1);
    expect(apiGet).toHaveBeenCalledWith("/plans/plan-single-flight");

    resolveRequest?.({ id: "plan-single-flight" });
    await expect(Promise.all([first, second])).resolves.toEqual([
      { id: "plan-single-flight" },
      { id: "plan-single-flight" },
    ]);
  });

  it("waits Retry-After and retries a planning GET once", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    apiGet
      .mockRejectedValueOnce({ status: 429, rateLimited: true, retryAfterMs: 2_000, message: "rate limited" })
      .mockResolvedValueOnce({ id: "plan-recovered" });

    const request = getPlanningResource<{ id: string }>("/plans/plan-recovered");
    await vi.advanceTimersByTimeAsync(1_999);
    expect(apiGet).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await expect(request).resolves.toEqual({ id: "plan-recovered" });
    expect(apiGet).toHaveBeenCalledTimes(2);
  });

  it.each([401, 403, 409, 422])("does not retry HTTP %s", async (status) => {
    apiGet.mockRejectedValueOnce({ status, message: "not retryable" });

    await expect(getPlanningResource(`/plans/no-retry-${status}`)).rejects.toMatchObject({ status });
    expect(apiGet).toHaveBeenCalledTimes(1);
  });

  it("surfaces the second 429 without starting a third request", async () => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(0);
    apiGet.mockRejectedValue({ status: 429, rateLimited: true, retryAfterMs: 1, message: "still limited" });

    const request = getPlanningResource("/plans/retry-exhausted");
    const rejection = expect(request).rejects.toMatchObject({ status: 429 });
    await vi.runAllTimersAsync();
    await rejection;
    expect(apiGet).toHaveBeenCalledTimes(2);
  });

  it("clears the in-flight entry after final failure", async () => {
    apiGet
      .mockRejectedValueOnce({ status: 403, message: "forbidden" })
      .mockResolvedValueOnce({ id: "plan-after-failure" });

    await expect(getPlanningResource("/plans/plan-after-failure")).rejects.toMatchObject({ status: 403 });
    await expect(getPlanningResource("/plans/plan-after-failure")).resolves.toEqual({ id: "plan-after-failure" });
    expect(apiGet).toHaveBeenCalledTimes(2);
  });
});
