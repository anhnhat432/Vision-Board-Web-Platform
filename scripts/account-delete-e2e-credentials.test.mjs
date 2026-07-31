import { describe, expect, it } from "vitest";
import { resolveAccountDeleteE2ECredentials as resolveCredentials } from "./account-delete-e2e-credentials.mjs";

describe("resolveAccountDeleteE2ECredentials", () => {
  it("uses fresh valid credentials in signup mode even when fixed secrets exist", () => {
    expect(
      resolveCredentials({
        authMode: "signup",
        timestamp: 123456,
        env: {
          ACCOUNT_DELETE_E2E_EMAIL: "codex.qa+delete-fixed@example.com",
          ACCOUNT_DELETE_E2E_PASSWORD: "stale-password",
        },
      }),
    ).toEqual({
      email: "codex.qa+delete-123456@example.com",
      password: "CodexDelete123456!",
    });
  });

  it("keeps fixed disposable credentials in signin mode", () => {
    expect(
      resolveCredentials({
        authMode: "signin",
        timestamp: 123456,
        env: {
          ACCOUNT_DELETE_E2E_EMAIL: " codex.qa+delete-fixed@example.com ",
          ACCOUNT_DELETE_E2E_PASSWORD: "fixed-password-7",
        },
      }),
    ).toEqual({
      email: "codex.qa+delete-fixed@example.com",
      password: "fixed-password-7",
    });
  });
});
