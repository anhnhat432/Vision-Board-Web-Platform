import { describe, it, expect, vi, beforeEach } from "vitest";

// We test normalizeAppMode indirectly through the public API.
// Since the module reads import.meta.env at module scope, we need to
// use dynamic import with vi.stubEnv to control the env value.

describe("app-mode", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  async function importWithMode(value: string | undefined) {
    if (value !== undefined) {
      vi.stubEnv("VITE_APP_MODE", value);
    } else {
      // Ensure the key is absent
      vi.stubEnv("VITE_APP_MODE", "");
      // stubEnv sets to empty string; we'll test empty-string → "real"
    }
    const mod = await import("./app-mode");
    vi.unstubAllEnvs();
    return mod;
  }

  it('returns "real" when VITE_APP_MODE is "real"', async () => {
    const mod = await importWithMode("real");
    expect(mod.getAppMode()).toBe("real");
    expect(mod.isRealMode()).toBe(true);
    expect(mod.isDemoMode()).toBe(false);
  });

  it('returns "demo" when VITE_APP_MODE is "demo"', async () => {
    const mod = await importWithMode("demo");
    expect(mod.getAppMode()).toBe("demo");
    expect(mod.isDemoMode()).toBe(true);
    expect(mod.isRealMode()).toBe(false);
  });

  it('defaults to "real" when VITE_APP_MODE is empty string', async () => {
    const mod = await importWithMode("");
    expect(mod.getAppMode()).toBe("real");
  });

  it('defaults to "real" when VITE_APP_MODE is undefined/missing', async () => {
    const mod = await importWithMode(undefined);
    // empty string from stubEnv simulates missing — both map to "real"
    expect(mod.getAppMode()).toBe("real");
  });

  it('handles case-insensitive "REAL"', async () => {
    const mod = await importWithMode("REAL");
    expect(mod.getAppMode()).toBe("real");
  });

  it('handles case-insensitive "Demo"', async () => {
    const mod = await importWithMode("Demo");
    expect(mod.getAppMode()).toBe("demo");
  });

  it('handles whitespace " real "', async () => {
    const mod = await importWithMode(" real ");
    expect(mod.getAppMode()).toBe("real");
  });

  it('defaults to "real" for invalid value and logs error', async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mod = await importWithMode("staging");
    expect(mod.getAppMode()).toBe("real");
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid VITE_APP_MODE="staging"'));
    errorSpy.mockRestore();
  });
});
