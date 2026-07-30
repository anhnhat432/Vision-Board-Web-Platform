import { describe, expect, it } from "vitest";
import { getVercelAutomationBypassHeaders } from "./vercel-automation-bypass.mjs";

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
});
