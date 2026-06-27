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

  it("allows responsive progress QA to wait on progress UI instead of the Today queue", () => {
    expect(smokeScript).toContain("async function waitForSystemLoaded(page, options = {})");
    expect(smokeScript).toContain("options.requireTodayQueue ?? options.requireTactic !== false");
    expect(smokeScript).toContain('[data-testid="progress-trend-hero"]:visible');
    expect(smokeScript).toContain("await waitForSystemLoaded(page, { requireTactic: false });");
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

  it("submits the billing confirm form before waiting for a checkout session", () => {
    expect(smokeScript).toContain("async function submitBillingConfirmCheckout(page)");
    expect(smokeScript).toContain("#receipt-email");
    expect(smokeScript).toContain('input[type="checkbox"]');
    expect(smokeScript).toContain('await waitForEnabledButtonByNormalizedText(page, "xac nhan va tao thanh toan");');
    expect(smokeScript).toContain('await clickButtonByNormalizedText(page, "xac nhan va tao thanh toan");');
    expect(smokeScript).toContain("Submitted billing checkout confirmation form");

    const submitIndex = smokeScript.indexOf("await submitBillingConfirmCheckout(page);");
    const checkoutSessionWaitIndex = smokeScript.indexOf('"billing checkout session"');
    expect(submitIndex).toBeGreaterThan(0);
    expect(checkoutSessionWaitIndex).toBeGreaterThan(submitIndex);
  });

  it("retries rate-limited billing payment history before checkout creation", () => {
    expect(smokeScript).toContain('retryAfter: response.headers()["retry-after"] ?? ""');
    expect(smokeScript).toContain("async function waitForApiSuccessWithRateLimitRetry(page, apiEvents, pattern, label");
    expect(smokeScript).toContain("event.status >= 400 && event.status !== 429");
    expect(smokeScript).toContain("rateLimited.handledByRateLimitRetry = label;");
    expect(smokeScript).toContain("event.status === 429 && !event.handledByRateLimitRetry");
    expect(smokeScript).toContain("function markRateLimitHandled(event, label)");
    expect(smokeScript).toContain("rendered despite background 429");
    expect(smokeScript).toContain("await page.reload({ waitUntil: \"domcontentloaded\" });");
    expect(smokeScript).toContain("billing payment history");

    const paymentHistoryIndex = smokeScript.indexOf('"billing payment history"');
    const checkoutStartedIndex = smokeScript.indexOf("const checkoutStartedAt = Date.now();");
    expect(paymentHistoryIndex).toBeGreaterThan(0);
    expect(checkoutStartedIndex).toBeGreaterThan(paymentHistoryIndex);
  });

  it("tolerates only expected background rate-limited hydration calls at final aggregation", () => {
    expect(smokeScript).toContain("function isExpectedBackgroundRateLimit(event)");
    expect(smokeScript).toContain('String(event.responseBody ?? "").includes(\'"errorCode":"rate_limited"\')');
    expect(smokeScript).toContain('pathname === "/api/auth/profile"');
    expect(smokeScript).toContain('pathname === "/api/goals"');
    expect(smokeScript).toContain('pathname === "/api/billing/entitlement"');
    expect(smokeScript).toContain('pathname === "/api/plans"');
    expect(smokeScript).toContain('/^\\/api\\/plans\\/[^/]+$/.test(pathname)');
    expect(smokeScript).toContain('pathname === "/api/sync/12-week/pull"');
    expect(smokeScript).toContain(
      "event.status === 429 && !event.handledByRateLimitRetry && !isExpectedBackgroundRateLimit(event)",
    );
  });

  it("accepts hosted PayOS checkout after checkout-session creation", () => {
    expect(smokeScript).toContain("async function waitForCheckoutDestination(page, apiEvents, after)");
    expect(smokeScript).toContain('kind: "hosted-payos"');
    expect(smokeScript).toContain('currentUrl.hostname === "pay.payos.vn"');
    expect(smokeScript).toContain("async function assertHostedPayosCheckout(page)");
    expect(smokeScript).toContain("hosted PayOS checkout content");
    expect(smokeScript).toContain("Verified hosted PayOS checkout page");

    const destinationIndex = smokeScript.indexOf("const checkoutDestination = await waitForCheckoutDestination");
    const hostedIndex = smokeScript.indexOf('if (checkoutDestination.kind === "hosted-payos")');
    const orderStatusIndex = smokeScript.indexOf('"billing order status"');
    expect(destinationIndex).toBeGreaterThan(0);
    expect(hostedIndex).toBeGreaterThan(destinationIndex);
    expect(orderStatusIndex).toBeGreaterThan(hostedIndex);
  });

  it("retries rate-limited checkout-session creation by resubmitting confirm", () => {
    expect(smokeScript).toContain("const onRateLimitRetry = options.onRateLimitRetry;");
    expect(smokeScript).toContain("await onRateLimitRetry(rateLimited);");
    expect(smokeScript).toContain('onRateLimitRetry: async () => {');
    expect(smokeScript).toContain('await page.goto(`${BASE_URL}/billing/checkout`, { waitUntil: "domcontentloaded" });');
    expect(smokeScript).toContain("await submitBillingConfirmCheckout(page);");

    const checkoutSessionIndex = smokeScript.indexOf('"billing checkout session"');
    const retryCallbackIndex = smokeScript.indexOf("onRateLimitRetry: async () => {");
    const destinationIndex = smokeScript.indexOf("const checkoutDestination = await waitForCheckoutDestination");
    expect(checkoutSessionIndex).toBeGreaterThan(0);
    expect(retryCallbackIndex).toBeGreaterThan(checkoutSessionIndex);
    expect(destinationIndex).toBeGreaterThan(retryCallbackIndex);
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
    expect(smokeScript).toContain("/settings#account-sync");
    expect(smokeScript).toContain("settings account lifecycle controls");
    expect(smokeScript).toContain('[data-testid="settings-account-export"]');
    expect(smokeScript).toContain('[data-testid="settings-delete-account-open"]');
    expect(smokeScript).toContain("Last settings lifecycle surface");
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
