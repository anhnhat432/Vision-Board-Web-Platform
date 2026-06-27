import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const smokeScript = readFileSync(
  path.resolve("scripts", "smoke-production-e2e.mjs"),
  "utf8",
);
const quickSmokeScript = readFileSync(
  path.resolve("scripts", "smoke-production-quick.mjs"),
  "utf8",
);

describe("production smoke harness guards", () => {
  it("fails closed without fixed credentials unless generated signup is explicitly allowed", () => {
    expect(smokeScript).toContain(
      'const ALLOW_GENERATED_ACCOUNT = process.env.PROD_SMOKE_ALLOW_GENERATED_ACCOUNT === "1";',
    );
    expect(smokeScript).toContain(
      "Set PROD_SMOKE_ALLOW_GENERATED_ACCOUNT=1 to explicitly create a generated production QA account.",
    );
  });

  it("opens the real weekly review flow before filling review inputs", () => {
    expect(smokeScript).toContain("async function ensureWeeklyReviewFormVisible(page)");
    expect(smokeScript).toContain('[data-testid="weekly-review-flow"]');
    expect(smokeScript).toContain('await ensureWeeklyReviewFormVisible(page);');
    expect(smokeScript).toContain('getByRole("button", { name: /bắt đầu review sớm/i })');
  });

  it("waits for visible weekly review UI instead of a hidden score container", () => {
    expect(smokeScript).toContain('[data-testid="weekly-score-interpretation"]');
    expect(smokeScript).not.toContain(
      `await page.locator('[data-testid="wam-section-score"]').waitFor({ timeout: DEFAULT_TIMEOUT_MS });`,
    );
  });

  it("does not inject window.confirm into the runtime page", () => {
    expect(smokeScript).not.toContain("window.confirm = () => true;");
  });

  it("accepts checkout lock only after verifying billing confirm stays locked", () => {
    expect(smokeScript).toContain("async function assertPaidCheckoutLocked(page, apiEvents)");
    expect(smokeScript).toContain('[data-testid="paid-checkout-disabled-banner"]');
    expect(smokeScript).toContain("Paid checkout kill-switch is active; verified locked billing confirm flow instead of creating a checkout QR");
    expect(smokeScript).toContain("Paid checkout lock leaked checkout-session POSTs");
    expect(smokeScript).toContain("await assertPaidCheckoutLocked(page, apiEvents);");
  });

  it("keeps the real-mode mock-checkout proof step", () => {
    expect(smokeScript).toContain("async function assertMockCheckoutNotExposed(page)");
    expect(smokeScript).toContain("/billing/mock-checkout?session=legacy_checkout_test");
    expect(smokeScript).toContain("await assertMockCheckoutNotExposed(page);");
    expect(smokeScript).toContain("Production does not expose mock checkout surface");
  });

  it("checks the home brand without being brittle to display casing", () => {
    for (const script of [smokeScript, quickSmokeScript]) {
      expect(script).toContain("function hasProductBrand(text)");
      expect(script).toContain('normalizeText(text).includes("dear our future")');
      expect(script).not.toContain('text.includes("Dear Our Future")');
      expect(script).not.toContain('document.body.innerText.includes("Dear Our Future")');
    }
  });

  it("keeps the login recovery and legal trust proof before authentication", () => {
    expect(smokeScript).toContain("async function readLoginRecoverySurface(page)");
    expect(smokeScript).toContain("async function assertLoginRecoverySurface(page)");
    expect(smokeScript).toContain("const resetCardAlreadyVisible =");
    expect(smokeScript).toContain('if (!resetCardAlreadyVisible) {');
    expect(smokeScript).toContain("return clicked;");
    expect(quickSmokeScript).toContain("const resetCardAlreadyVisible =");
    expect(smokeScript).toContain("#login-email");
    expect(smokeScript).toContain("#reset-email");
    expect(smokeScript).toContain("#login-confirm-password");
    expect(smokeScript).toContain('a[href="/terms"]');
    expect(smokeScript).toContain('a[href="/privacy"]');
    expect(smokeScript).toContain("await assertLoginRecoverySurface(page);");
  });

  it("keeps the authenticated settings account lifecycle proof", () => {
    expect(smokeScript).toContain("async function assertSettingsAccountLifecycleSurface(page)");
    expect(smokeScript).toContain('[data-testid="settings-account-export"]');
    expect(smokeScript).toContain('[data-testid="settings-delete-account-open"]');
    expect(smokeScript).toContain('const requiredLinks = ["/privacy", "/terms", "/billing/faq"];');
    expect(smokeScript).toContain("await assertSettingsAccountLifecycleSurface(page);");
  });

  it("keeps the settings sync-trust proof after successful account sync", () => {
    expect(smokeScript).toContain("async function assertSettingsSyncTrust(page)");
    expect(smokeScript).toContain('[data-testid="settings-sync-section"]');
    expect(smokeScript).toContain('[data-testid="settings-sync-last-synced"]');
    expect(smokeScript).toContain('[data-testid="settings-sync-pending-count"]');
    expect(smokeScript).toContain('[data-testid="settings-sync-status-copy"]');
    expect(smokeScript).toContain("await assertSettingsSyncTrust(page);");
  });
});
