import { access, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createAgentBrowserBypassConfig, removeAgentBrowserBypassConfig } from "./agent-browser-bypass-config.mjs";

let testRoot;

beforeEach(async () => {
  testRoot = await mkdtemp(path.join(os.tmpdir(), "agent-browser-bypass-test-"));
});

afterEach(async () => {
  await rm(testRoot, { recursive: true, force: true });
});

describe("agent-browser bypass config", () => {
  it("does not create a config when the secret is absent", async () => {
    await expect(createAgentBrowserBypassConfig({ env: {}, tempRoot: testRoot })).resolves.toBeUndefined();
  });

  it("writes only the approved headers and removes the temporary directory", async () => {
    const config = await createAgentBrowserBypassConfig({
      env: { VERCEL_AUTOMATION_BYPASS_SECRET: "test-bypass-secret" },
      tempRoot: testRoot,
    });

    expect(config).toBeDefined();
    const rawConfig = await readFile(config.configPath, "utf8");
    expect(JSON.parse(rawConfig)).toEqual({
      headers: {
        "x-vercel-protection-bypass": "test-bypass-secret",
        "x-vercel-set-bypass-cookie": "true",
      },
    });

    if (process.platform !== "win32") {
      expect((await stat(config.directoryPath)).mode & 0o777).toBe(0o700);
      expect((await stat(config.configPath)).mode & 0o777).toBe(0o600);
    }

    await removeAgentBrowserBypassConfig(config);
    await expect(access(config.directoryPath)).rejects.toMatchObject({ code: "ENOENT" });
  });
});
