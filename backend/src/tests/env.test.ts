import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { getOptionalEnv, getRequiredAnyEnvInProduction, getRequiredEnvInProduction } from "../config/env";

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const TEST_KEY = "SECURITY_ENV_TEST_VALUE";
const TEST_ALIAS_KEY = "SECURITY_ENV_TEST_ALIAS_VALUE";

afterEach(() => {
  if (ORIGINAL_NODE_ENV === undefined) {
    delete process.env.NODE_ENV;
  } else {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV;
  }
  delete process.env[TEST_KEY];
  delete process.env[TEST_ALIAS_KEY];
});

describe("production environment helpers", () => {
  it("throws when a production-only required env var is missing in production", () => {
    process.env.NODE_ENV = "production";
    delete process.env[TEST_KEY];

    assert.throws(
      () => getRequiredEnvInProduction(TEST_KEY),
      /Missing required environment variable: SECURITY_ENV_TEST_VALUE/,
    );
  });

  it("returns undefined when a production-only env var is missing outside production", () => {
    process.env.NODE_ENV = "development";
    delete process.env[TEST_KEY];

    assert.equal(getRequiredEnvInProduction(TEST_KEY), undefined);
  });

  it("trims optional env values and treats blank values as undefined", () => {
    process.env[TEST_KEY] = "  enabled  ";
    assert.equal(getOptionalEnv(TEST_KEY), "enabled");

    process.env[TEST_KEY] = "   ";
    assert.equal(getOptionalEnv(TEST_KEY), undefined);
  });

  it("accepts a configured alias for a production-only required env var", () => {
    process.env.NODE_ENV = "production";
    delete process.env[TEST_KEY];
    process.env[TEST_ALIAS_KEY] = "  alias-secret  ";

    assert.equal(getRequiredAnyEnvInProduction([TEST_KEY, TEST_ALIAS_KEY]), "alias-secret");
  });
});
