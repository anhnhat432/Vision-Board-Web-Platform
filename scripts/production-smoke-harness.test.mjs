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
    expect(smokeScript).toContain("async function tryClickButtonByNormalizedText(page, normalizedNeedle)");
    expect(smokeScript).toContain("async function hasVisibleWeeklyReviewForm(page)");
    expect(smokeScript).toContain("async function prepareWeeklyReviewFormData(page)");
    expect(smokeScript).toContain("async function ensureWeeklyReviewFormVisible(page)");
    expect(smokeScript).toContain('[data-testid="weekly-review-flow"]:visible');
    expect(smokeScript).toContain('[data-tour-id="twelve-week-tab-week"]');
    expect(smokeScript).toContain('[data-testid="weekly-review-shell"]');
    expect(smokeScript).toContain('await ensureWeeklyReviewFormVisible(page);');
    expect(smokeScript).toContain('tryClickButtonByNormalizedText(page, "bat dau review som")');
    expect(smokeScript).toContain('tryClickButtonByNormalizedText(page, "chinh sua danh gia")');
    expect(smokeScript).toContain("Prepared weekly review smoke form");
    expect(smokeScript).toContain('await tryClickButtonByNormalizedText(page, "van luu som");');
  });

  it("waits for visible weekly review UI instead of a hidden score container", () => {
    expect(smokeScript).toContain('page.locator("#weekly-insights").waitFor');
    expect(smokeScript).toContain('page.locator("#weekly-next-commitments").waitFor');
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

  it("fails full smoke early when the fixed sync account is email-unverified", () => {
    expect(smokeScript).toContain("async function assertProductionSmokeAccountReadyForSync(page)");
    expect(smokeScript).toContain("settings sync email-unverified blocker");
    expect(smokeScript).toContain("backend /api/sync/12-week/* routes are expected to fail");
    expect(smokeScript).toContain('await step("Production smoke account is verified for 12-week sync", async () => {');
  });

  it("can require verified sync during quick smoke warmup", () => {
    expect(quickSmokeScript).toContain('const REQUIRE_VERIFIED_SYNC = process.env.PROD_SMOKE_REQUIRE_VERIFIED_SYNC === "1";');
    expect(quickSmokeScript).toContain('REQUIRE_VERIFIED_SYNC && surface.state === "email_unverified"');
    expect(quickSmokeScript).toContain("full production smoke cannot pass");
    expect(quickSmokeScript).toContain("Backend /api/sync/12-week/* routes require verified email");
  });

  it("waits for the quick smoke login form to be editable or already redirected", () => {
    expect(quickSmokeScript).toContain("async function waitForLoginFormReadyOrRedirect(page");
    expect(quickSmokeScript).toContain('if (location.pathname === expectedPath) return "redirected";');
    expect(quickSmokeScript).toContain("!field.disabled && !field.readOnly");
    expect(quickSmokeScript).toContain("const loginState = await waitForLoginFormReadyOrRedirect(page");
    expect(quickSmokeScript).toContain('if (loginState === "redirected")');
  });

  it("keeps the settings sync-trust proof after successful account sync", () => {
    expect(smokeScript).toContain("async function assertSettingsSyncTrust(page)");
    expect(smokeScript).toContain('[data-testid="settings-sync-section"]');
    expect(smokeScript).toContain('[data-testid="settings-sync-last-synced"]');
    expect(smokeScript).toContain('[data-testid="settings-sync-pending-count"]');
    expect(smokeScript).toContain('[data-testid="settings-sync-status-copy"]');
    expect(smokeScript).toContain("await assertSettingsSyncTrust(page);");
  });

  it("accepts the deployed 12-week mutation endpoint as backend sync proof", () => {
    expect(smokeScript).toContain('sync\\/12-week\\/(?:mutations|pull)(?:\\?|$)');
    expect(smokeScript).toContain('(?:plans|tasks|weeks|metrics)(?:\\/|$)');
  });

  it("prints bounded API error response bodies for production smoke failures", () => {
    expect(smokeScript).toContain("function compactApiResponseBody(text)");
    expect(smokeScript).toContain("redactSensitiveLogText");
    expect(smokeScript).toContain("event.responseBody = compactApiResponseBody(await response.text());");
    expect(smokeScript).toContain("Response body:");
  });

  it("uses the real 12-week account sync control before waiting for backend sync proof", () => {
    expect(smokeScript).toContain("async function triggerManualTwelveWeekAccountSync(page)");
    expect(smokeScript).toContain("async function waitForManualTwelveWeekAccountSyncReady(page)");
    expect(smokeScript).toContain('[data-tour-id="twelve-week-tab-settings"]');
    expect(smokeScript).toContain('await clickButtonByNormalizedText(page, "dong bo tai khoan");');
    expect(smokeScript).toContain("12-week account sync control ready");
    expect(smokeScript).toContain("visionboard_data_mutation_queue:auth:");
    expect(smokeScript).toContain("await triggerManualTwelveWeekAccountSync(page);");
  });

  it("prepares an open Today task before mutating the real production smoke plan", () => {
    expect(smokeScript).toContain("const SMOKE_TASK_ID = `task_full_today_${TIMESTAMP}`;");
    expect(smokeScript).toContain("async function hasOpenTodayTaskCheckbox(page)");
    expect(smokeScript).toContain("async function ensureOpenTodayTaskAvailable(page)");
    expect(smokeScript).toContain("const existingTask =");
    expect(smokeScript).toContain("reusedExistingTask: Boolean(existingTask)");
    expect(smokeScript).toContain("reused existing task in");
    expect(smokeScript).toContain("Prepared open Today smoke task");
    expect(smokeScript).toContain("dailyCheckIns.filter((item) => item?.date !== todayKey)");
    expect(smokeScript).toContain("weeklyReviews.filter((item) => item?.weekNumber !== currentWeek)");
    expect(smokeScript).toContain('window.dispatchEvent(new CustomEvent("visionboard:user-data-updated"));');
    expect(smokeScript).toContain("await ensureOpenTodayTaskAvailable(page);");
  });

  it("prints queue item diagnostics when production smoke sync does not drain", () => {
    expect(smokeScript).toContain("async function getSyncQueueDebug(page)");
    expect(smokeScript).toContain("Last queue debug:");
    expect(smokeScript).toContain("clientTaskId: item.payload?.clientTaskId");
  });
});
