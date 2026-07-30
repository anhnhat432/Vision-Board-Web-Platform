import { describe, expect, it } from "vitest";
import {
  getVercelAutomationBypassHeaders,
  getVercelAutomationBypassHeadersForRequest as getScopedHeaders,
} from "./vercel-automation-bypass.mjs";

describe("getVercelAutomationBypassHeaders", () => {
  it("returns undefined when the bypass secret is absent", () => {
    expect(getVercelAutomationBypassHeaders({})).toBeUndefined();
    expect(getVercelAutomationBypassHeaders({ VERCEL_AUTOMATION_BYPASS_SECRET: "" })).toBeUndefined();
  });

  it("returns exactly the Vercel bypass and cookie headers", () => {
    const secret = "test-bypass-secret";

    expect(getVercelAutomationBypassHeaders({ VERCEL_AUTOMATION_BYPASS_SECRET: secret })).toEqual({
      "x-vercel-protection-bypass": secret,
      "x-vercel-set-bypass-cookie": "true",
    });
  });

  it("preserves the secret value without trimming or rewriting it", () => {
    const secret = " test-secret-with-spaces ";

    expect(getVercelAutomationBypassHeaders({ VERCEL_AUTOMATION_BYPASS_SECRET: secret })).toEqual({
      "x-vercel-protection-bypass": secret,
      "x-vercel-set-bypass-cookie": "true",
    });
  });

  it("returns bypass headers for requests to the configured preview origin", () => {
    expect(
      getScopedHeaders({
        requestUrl: "https://preview.example.com/login?mode=signup",
        baseUrl: "https://preview.example.com/",
        env: { VERCEL_AUTOMATION_BYPASS_SECRET: "test-bypass-secret" },
      }),
    ).toEqual({
      "x-vercel-protection-bypass": "test-bypass-secret",
      "x-vercel-set-bypass-cookie": "true",
    });
  });

  it("does not return bypass headers for Firebase or lookalike origins", () => {
    const options = {
      baseUrl: "https://preview.example.com",
      env: { VERCEL_AUTOMATION_BYPASS_SECRET: "test-bypass-secret" },
    };

    expect(
      getScopedHeaders({
        ...options,
        requestUrl: "https://identitytoolkit.googleapis.com/v1/accounts:signUp",
      }),
    ).toBeUndefined();
    expect(
      getScopedHeaders({
        ...options,
        requestUrl: "https://preview.example.com.attacker.test/login",
      }),
    ).toBeUndefined();
  });

  it("fails closed when either URL is invalid", () => {
    const env = { VERCEL_AUTOMATION_BYPASS_SECRET: "test-bypass-secret" };

    expect(
      getScopedHeaders({
        requestUrl: "not-a-url",
        baseUrl: "https://preview.example.com",
        env,
      }),
    ).toBeUndefined();
    expect(
      getScopedHeaders({
        requestUrl: "https://preview.example.com",
        baseUrl: "not-a-url",
        env,
      }),
    ).toBeUndefined();
  });
});
