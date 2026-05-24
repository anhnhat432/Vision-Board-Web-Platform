#!/usr/bin/env node
/**
 * P4 Production Smoke — public + (optional) authenticated.
 *
 * Phase A (always): 3 viewport (1280/768/375) screenshot of `/` on production URL.
 * Phase B (only if P4_PROD_EMAIL + P4_PROD_PASSWORD set): login → verify /12-week-system → tick task → sync.
 *
 * Output: qa-artifacts/p4-prod-smoke/*.png + log.json
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = __dirname;
const PROD_URL = process.env.P4_PROD_URL ?? "https://dearourfuture.io.vn";
const EMAIL = process.env.P4_PROD_EMAIL ?? "";
const PASSWORD = process.env.P4_PROD_PASSWORD ?? "";

const VIEWPORTS = [
  { name: "1280", width: 1280, height: 800 },
  { name: "768", width: 768, height: 1024 },
  { name: "375", width: 375, height: 812 },
];

const log = (m) => console.log(`[p4-prod] ${m}`);
mkdirSync(OUTPUT_DIR, { recursive: true });

const out = {
  startedAt: new Date().toISOString(),
  prodUrl: PROD_URL,
  public: [],
  auth: null,
  errors: [],
};

async function phaseA(browser) {
  log("=== Phase A: PublicVisitorView 3 viewport ===");
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      locale: "vi-VN",
    });
    const page = await ctx.newPage();
    const t0 = Date.now();
    try {
      const resp = await page.goto(PROD_URL, {
        waitUntil: "networkidle",
        timeout: 30000,
      });
      const ms = Date.now() - t0;
      await page.waitForTimeout(800);
      const file = join(OUTPUT_DIR, `public-${vp.name}.png`);
      await page.screenshot({ path: file, fullPage: false });
      const text = (await page.locator("body").innerText()).slice(0, 500);
      out.public.push({
        viewport: vp.name,
        status: resp?.status(),
        loadMs: ms,
        file: `public-${vp.name}.png`,
        snippet: text,
      });
      log(
        `  ${vp.name}: http=${resp?.status()} ${ms}ms ${ms < 3000 ? "OK" : "SLOW"}`,
      );
    } catch (e) {
      out.errors.push(`Phase A ${vp.name}: ${e.message}`);
      log(`  ${vp.name}: ERROR ${e.message.split("\n")[0]}`);
    }
    await ctx.close();
  }
}

async function phaseB(browser) {
  if (!EMAIL || !PASSWORD) {
    log("=== Phase B SKIPPED (no P4_PROD_EMAIL/P4_PROD_PASSWORD env) ===");
    out.auth = { skipped: true, reason: "no credentials in env" };
    return;
  }
  log("=== Phase B: Authenticated smoke ===");
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: "vi-VN",
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) =>
    errors.push(`pageerror: ${e.message.split("\n")[0]}`),
  );
  try {
    log("  goto /login");
    const tLogin0 = Date.now();
    await page.goto(`${PROD_URL}/login`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await page.fill('input[type="email"]', EMAIL);
    await page.fill('input[type="password"]', PASSWORD);
    await page.screenshot({
      path: join(OUTPUT_DIR, "auth-01-login-filled.png"),
    });
    await page.click('button:has-text("Đăng nhập")');
    // wait for navigation away from login
    await page
      .waitForURL((url) => !url.toString().includes("/login"), {
        timeout: 25000,
      })
      .catch(() => {});
    const tLoginMs = Date.now() - tLogin0;
    log(`  login → ${page.url()} in ${tLoginMs}ms`);
    await page.screenshot({
      path: join(OUTPUT_DIR, "auth-02-after-login.png"),
      fullPage: false,
    });

    log("  goto /12-week-system");
    const tNav0 = Date.now();
    await page.goto(`${PROD_URL}/12-week-system`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await page.waitForTimeout(2000);
    const tNavMs = Date.now() - tNav0;
    await page.screenshot({
      path: join(OUTPUT_DIR, "auth-03-12week-system.png"),
      fullPage: false,
    });
    log(`  /12-week-system loaded in ${tNavMs}ms`);

    // try ticking the first checkbox under main content (best-effort, do not fail hard)
    let tickedOk = false;
    let postRefreshMatch = null;
    try {
      const checkbox = page.locator('input[type="checkbox"]').first();
      const beforeChecked = await checkbox.isChecked().catch(() => null);
      log(`  first checkbox beforeChecked=${beforeChecked}`);
      await checkbox.click({ timeout: 5000 });
      await page.waitForTimeout(5000); // wait for sync
      await page.screenshot({
        path: join(OUTPUT_DIR, "auth-04-after-tick.png"),
        fullPage: false,
      });

      log("  reload to verify persistence");
      await page.reload({ waitUntil: "networkidle", timeout: 25000 });
      await page.waitForTimeout(2000);
      const afterChecked = await page
        .locator('input[type="checkbox"]')
        .first()
        .isChecked()
        .catch(() => null);
      log(`  first checkbox afterReload=${afterChecked}`);
      tickedOk = beforeChecked !== afterChecked;
      postRefreshMatch = {
        beforeChecked,
        afterChecked,
        persistedDifferent: tickedOk,
      };
      await page.screenshot({
        path: join(OUTPUT_DIR, "auth-05-after-reload.png"),
        fullPage: false,
      });
    } catch (e) {
      errors.push(`tick step: ${e.message.split("\n")[0]}`);
    }

    log("  logout");
    try {
      // Best-effort: open settings/profile menu and find logout
      await page.goto(`${PROD_URL}/settings`, {
        waitUntil: "networkidle",
        timeout: 25000,
      });
      await page.screenshot({
        path: join(OUTPUT_DIR, "auth-06-settings.png"),
        fullPage: false,
      });
      const logoutBtn = page
        .locator(
          'button:has-text("Đăng xuất"), button:has-text("Đăng xuất tài khoản")',
        )
        .first();
      if (await logoutBtn.count()) {
        await logoutBtn.click();
        await page.waitForTimeout(2000);
      }
    } catch (e) {
      errors.push(`logout: ${e.message.split("\n")[0]}`);
    }

    out.auth = {
      skipped: false,
      loginUrl: page.url(),
      loginMs: tLoginMs,
      twelveWeekMs: tNavMs,
      tickPersisted: tickedOk,
      postRefreshMatch,
      pageErrors: errors,
    };
  } catch (e) {
    out.errors.push(`Phase B fatal: ${e.message}`);
    log(`Phase B FATAL ${e.message.split("\n")[0]}`);
  }
  await ctx.close();
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  await phaseA(browser);
  await phaseB(browser);
  await browser.close();
  out.finishedAt = new Date().toISOString();
  writeFileSync(join(OUTPUT_DIR, "log.json"), JSON.stringify(out, null, 2));
  log("=== Done ===");
  log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error("[p4-prod] FATAL:", e);
  process.exitCode = 1;
});
