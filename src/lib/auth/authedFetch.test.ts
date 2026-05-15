import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const firebaseMock = vi.hoisted(() => ({
  getFirebaseToken: vi.fn(),
}));

vi.mock("./firebase", () => ({
  getFirebaseToken: firebaseMock.getFirebaseToken,
}));

import { AuthError, authedFetch } from "./authedFetch";

function jsonResponse(status: number): Response {
  return new Response(JSON.stringify({ ok: status >= 200 && status < 300 }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("authedFetch", () => {
  beforeEach(() => {
    firebaseMock.getFirebaseToken.mockReset();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("refreshes the Firebase token and retries once after a 401", async () => {
    firebaseMock.getFirebaseToken.mockResolvedValueOnce("old-token").mockResolvedValueOnce("new-token");
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(401)).mockResolvedValueOnce(jsonResponse(200));
    vi.stubGlobal("fetch", fetchMock);

    const response = await authedFetch("/api/protected", { method: "POST" });

    expect(response.ok).toBe(true);
    expect(firebaseMock.getFirebaseToken).toHaveBeenNthCalledWith(1, false);
    expect(firebaseMock.getFirebaseToken).toHaveBeenNthCalledWith(2, true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((fetchMock.mock.calls[0]?.[1]?.headers as Headers).get("Authorization")).toBe("Bearer old-token");
    expect((fetchMock.mock.calls[1]?.[1]?.headers as Headers).get("Authorization")).toBe("Bearer new-token");
  });

  it("throws AuthError and dispatches force logout after two 401 responses", async () => {
    firebaseMock.getFirebaseToken.mockResolvedValueOnce("old-token").mockResolvedValueOnce("new-token");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401)));
    const forceLogoutListener = vi.fn();
    window.addEventListener("auth:force-logout", forceLogoutListener);

    await expect(authedFetch("/api/protected")).rejects.toBeInstanceOf(AuthError);

    expect(forceLogoutListener).toHaveBeenCalledTimes(1);
    window.removeEventListener("auth:force-logout", forceLogoutListener);
  });

  it("throws AbortError when the request exceeds 10 seconds", async () => {
    vi.useFakeTimers();
    firebaseMock.getFirebaseToken.mockResolvedValue("token");
    vi.stubGlobal(
      "fetch",
      vi.fn((_input: RequestInfo, init?: RequestInit) => {
        return new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(init.signal?.reason);
          });
        });
      }),
    );

    const request = authedFetch("/api/slow");
    const expectation = expect(request).rejects.toMatchObject({ name: "AbortError" });
    await vi.advanceTimersByTimeAsync(10_000);

    await expectation;
  });
});
