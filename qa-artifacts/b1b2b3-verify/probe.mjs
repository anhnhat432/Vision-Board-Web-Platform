/**
 * Verify B1/B2/B3 fixes on production https://dearourfuture.io.vn
 *
 * B1 — POST /api/auth/profile must NOT 429 in burst, and even if 429,
 *      frontend must NOT bounce signed-in user with plan to /onboarding.
 * B2 — Banner "Cần chọn bản dữ liệu" must NOT appear on first login
 *      with default seed (auto-overwrite untouched local seed with cloud).
 * B3 — /billing/plan copy must reflect new "đang hoàn tất tích hợp ..."
 *      message, not the old "tạm khóa do chuyển nhà cung cấp".
 *
 * Credentials passed via env vars VB_TEST_EMAIL + VB_TEST_PASSWORD,
 * never persisted to file. Output: screenshots + plain log only.
 */

import { chromium } from "playwright";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE_URL = "https://dearourfuture.io.vn";
const OUT_DIR = resolve("qa-artifacts/b1b2b3-verify");

const email = process.env.VB_TEST_EMAIL;
const password = process.env.VB_TEST_PASSWORD;

if (!email || !password) {
  console.error("[ERROR] Missing VB_TEST_EMAIL or VB_TEST_PASSWORD env vars.");
  process.exit(1);
}

const findings = {
  startedAt: new Date().toISOString(),
  baseUrl: BASE_URL,
  steps: [],
  consoleErrors: [],
  authProfile429Count: 0,
  authProfile200Count: 0,
  finalUrlAfterLogin: null,
  bannerDataConflictPresent: null,
  billingCopyOldPresent: null,
  billingCopyNewPresent: null,
  publicCopyOldPresent: null,
};

function logStep(label, ok, extra = {}) {
  const entry = { label, ok, ts: new Date().toISOString(), ...extra };
  findings.steps.push(entry);
  console.log(`[${ok ? "OK" : "FAIL"}] ${label}`, extra.note ?? "");
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  // ── PHASE 1: Public landing (no auth) ────────────────────────────────
  const ctxPublic = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const pagePublic = await ctxPublic.newPage();
  pagePublic.on("console", (msg) => {
    if (msg.type() === "error") {
      findings.consoleErrors.push({ phase: "public", text: msg.text() });
    }
  });

  try {
    await pagePublic.goto(BASE_URL, { waitUntil: "networkidle", timeout: 60_000 });
    logStep("Phase1: goto / public", true);

    const bodyPublic = await pagePublic.locator("body").innerText();
    findings.publicCopyOldPresent = /không cần đăng nhập/i.test(bodyPublic);
    await pagePublic.screenshot({ path: `${OUT_DIR}/01-public-1280.png`, fullPage: false });
    logStep("Phase1: capture public landing", true, {
      hasOldDemoCopy: findings.publicCopyOldPresent,
    });
  } catch (err) {
    logStep("Phase1: public landing", false, { error: String(err) });
  }
  await ctxPublic.close();

  // ── PHASE 2: Fresh-context login → check B1 + B2 ─────────────────────
  const ctxLogin = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const pageLogin = await ctxLogin.newPage();

  pageLogin.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      findings.consoleErrors.push({
        phase: "login",
        type: msg.type(),
        text: msg.text(),
      });
    }
    // Capture all auto-sync info logs to see merge report details
    const text = msg.text();
    if (text.includes("[auto-sync") || text.includes("merge") || text.includes("conflict")) {
      findings.consoleErrors.push({
        phase: "login-info",
        type: msg.type(),
        text,
      });
    }
  });

  // Track all /api/auth/profile responses
  pageLogin.on("response", async (resp) => {
    const url = resp.url();
    if (url.includes("/api/auth/profile")) {
      const status = resp.status();
      if (status === 429) findings.authProfile429Count++;
      else if (status >= 200 && status < 300) {
        findings.authProfile200Count++;
        try {
          const body = await resp.json();
          findings.authProfileBody = body;
          console.log(`[auth/profile] ${status} body=${JSON.stringify(body).slice(0, 600)}`);
        } catch {
          // ignore
        }
      } else {
        console.log(`[auth/profile] ${status} ${resp.request().method()}`);
      }
    }
    if (url.includes("/api/plans") || url.includes("/api/12-week")) {
      const status = resp.status();
      console.log(`[plans] ${status} ${resp.request().method()} ${url.slice(BASE_URL.length)}`);
    }
  });

  try {
    await pageLogin.goto(`${BASE_URL}/login`, { waitUntil: "networkidle", timeout: 60_000 });
    logStep("Phase2: goto /login fresh-context", true);

    await pageLogin.fill('input[type="email"]', email);
    await pageLogin.fill('input[type="password"]', password);
    await pageLogin.screenshot({ path: `${OUT_DIR}/02-login-filled-1280.png` });
    logStep("Phase2: fill credentials", true);

    // Submit and wait for redirect
    await Promise.all([
      pageLogin.waitForURL((url) => !url.toString().includes("/login"), { timeout: 30_000 }),
      pageLogin.click('button[type="submit"]'),
    ]);
    logStep("Phase2: submit login", true);

    // Wait for app to settle (longer to allow cloud plan hydration)
    await pageLogin.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
    await pageLogin.waitForTimeout(8000);

    // Capture URL after extended settle
    findings.urlAfter3s = pageLogin.url();

    // Wait additionally for backend plan hydration event to potentially redirect away from /onboarding
    await pageLogin.waitForTimeout(5000);
    findings.finalUrlAfterLogin = pageLogin.url();
    await pageLogin.screenshot({ path: `${OUT_DIR}/03-after-login-1280.png`, fullPage: true });
    logStep("Phase2: final URL after login", true, {
      finalUrl: findings.finalUrlAfterLogin,
    });

    // B1 check: NOT bounced to /onboarding
    const isOnOnboarding = findings.finalUrlAfterLogin.includes("/onboarding");
    logStep("B1: NOT bounced to /onboarding", !isOnOnboarding, {
      finalUrl: findings.finalUrlAfterLogin,
      authProfile429Count: findings.authProfile429Count,
      authProfile200Count: findings.authProfile200Count,
    });

    // B2 check: banner "Cần chọn bản dữ liệu" should NOT appear
    const bannerText = await pageLogin
      .locator("text=/Cần chọn bản dữ liệu/i")
      .first()
      .isVisible()
      .catch(() => false);
    findings.bannerDataConflictPresent = bannerText;
    logStep("B2: NO banner 'Cần chọn bản dữ liệu'", !bannerText, {
      bannerVisible: bannerText,
    });

    // Capture body text snapshot for review
    const bodyAfterLogin = await pageLogin.locator("body").innerText();
    writeFileSync(`${OUT_DIR}/03-after-login-body.txt`, bodyAfterLogin.slice(0, 6000), "utf-8");
  } catch (err) {
    logStep("Phase2: login flow", false, { error: String(err) });
  }

  // ── PHASE 3: /billing/plan copy check (B3) ───────────────────────────
  try {
    await pageLogin.goto(`${BASE_URL}/billing/plan`, { waitUntil: "networkidle", timeout: 60_000 });
    await pageLogin.waitForTimeout(8000);

    const bodyBilling = await pageLogin.locator("body").innerText();

    findings.billingCopyOldPresent = /tạm khóa do chuyển nhà cung cấp/i.test(bodyBilling);
    findings.billingCopyNewPresent =
      /đang hoàn tất tích hợp/i.test(bodyBilling) ||
      /sẵn sàng trong tuần tới/i.test(bodyBilling);
    findings.bannerOnBillingPlan = /Cần chọn bản dữ liệu/i.test(bodyBilling);

    await pageLogin.screenshot({ path: `${OUT_DIR}/04-billing-plan-1280.png`, fullPage: true });
    logStep("B3: billing copy old phrasing GONE", !findings.billingCopyOldPresent, {
      old: findings.billingCopyOldPresent,
      new: findings.billingCopyNewPresent,
    });
    logStep("B2 follow-up: NO banner on /billing/plan after sync", !findings.bannerOnBillingPlan, {
      bannerOnBillingPlan: findings.bannerOnBillingPlan,
    });

    writeFileSync(`${OUT_DIR}/04-billing-plan-body.txt`, bodyBilling.slice(0, 6000), "utf-8");
  } catch (err) {
    logStep("Phase3: /billing/plan", false, { error: String(err) });
  }

  await ctxLogin.close();
  await browser.close();

  findings.finishedAt = new Date().toISOString();
  writeFileSync(`${OUT_DIR}/findings.json`, JSON.stringify(findings, null, 2), "utf-8");

  console.log("\n=== SUMMARY ===");
  console.log(JSON.stringify(
    {
      finalUrlAfterLogin: findings.finalUrlAfterLogin,
      authProfile429Count: findings.authProfile429Count,
      authProfile200Count: findings.authProfile200Count,
      bannerDataConflictPresent: findings.bannerDataConflictPresent,
      billingCopyOldPresent: findings.billingCopyOldPresent,
      billingCopyNewPresent: findings.billingCopyNewPresent,
      publicCopyOldPresent: findings.publicCopyOldPresent,
      consoleErrorCount: findings.consoleErrors.length,
    },
    null,
    2,
  ));
})().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
