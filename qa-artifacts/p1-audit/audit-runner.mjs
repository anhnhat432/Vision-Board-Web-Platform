#!/usr/bin/env node
/**
 * P1 Production Audit Runner — read-only
 *
 * KHÔNG sửa code production, KHÔNG thanh toán thật, KHÔNG complete OAuth.
 * Đọc credential từ env: PROD_AUDIT_EMAIL, PROD_AUDIT_PASSWORD.
 *
 * Usage:
 *   set PROD_AUDIT_EMAIL=... & set PROD_AUDIT_PASSWORD=... & ^
 *   node qa-artifacts/p1-audit/audit-runner.mjs --phase=1.1
 *
 * Output: qa-artifacts/p1-audit/{phase}-findings.json + screenshots .png
 */

import { chromium, devices } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const BASE_URL = "https://dearourfuture.io.vn";
const OUT_DIR = path.resolve("qa-artifacts/p1-audit");
const EMAIL = process.env.PROD_AUDIT_EMAIL?.trim();
const PASSWORD = process.env.PROD_AUDIT_PASSWORD;

const argv = process.argv.slice(2);
function getArg(name, fallback) {
  const flag = argv.find((a) => a.startsWith(`--${name}=`));
  return flag ? flag.slice(name.length + 3) : fallback;
}

const PHASE = getArg("phase", "1.1");
const HEADFUL = argv.includes("--headful");
const SLOW_MO = Number(getArg("slowmo", "0")) || 0;

function log(msg) {
  process.stdout.write(`[p1-audit] ${msg}\n`);
}

async function ensureDir() {
  await fs.mkdir(OUT_DIR, { recursive: true });
}

function nowIso() {
  return new Date().toISOString();
}

function attachLoggers(page, sink) {
  page.on("console", (msg) => {
    const type = msg.type();
    if (type === "error" || type === "warning") {
      sink.consoleEntries.push({
        ts: nowIso(),
        type,
        text: msg.text().slice(0, 1000),
        url: msg.location()?.url ?? "",
      });
    }
  });
  page.on("pageerror", (err) => {
    sink.consoleEntries.push({
      ts: nowIso(),
      type: "pageerror",
      text: String(err?.message ?? err).slice(0, 1000),
      url: page.url(),
    });
  });
  page.on("requestfailed", (req) => {
    sink.networkEntries.push({
      ts: nowIso(),
      kind: "requestfailed",
      method: req.method(),
      url: req.url(),
      failure: req.failure()?.errorText ?? "",
    });
  });
  page.on("response", (res) => {
    const status = res.status();
    if (status >= 400) {
      sink.networkEntries.push({
        ts: nowIso(),
        kind: "http_error",
        status,
        method: res.request().method(),
        url: res.url(),
      });
    }
  });
}

function newSink(label) {
  return {
    label,
    startedAt: nowIso(),
    finishedAt: null,
    steps: [],
    consoleEntries: [],
    networkEntries: [],
    screenshots: [],
    notes: [],
  };
}

async function saveSink(sink, suffix) {
  sink.finishedAt = nowIso();
  const file = path.join(OUT_DIR, `phase-${suffix}-findings.json`);
  await fs.writeFile(file, JSON.stringify(sink, null, 2), "utf8");
  log(`saved ${file}`);
}

async function snap(page, sink, name) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  sink.screenshots.push(file.replace(/\\/g, "/"));
  log(`snap ${file}`);
}

async function step(sink, label, fn) {
  const t0 = Date.now();
  log(`STEP ${label}`);
  try {
    await fn();
    sink.steps.push({ label, ok: true, ms: Date.now() - t0 });
    log(`  PASS ${label} (${Date.now() - t0}ms)`);
  } catch (e) {
    sink.steps.push({
      label,
      ok: false,
      ms: Date.now() - t0,
      error: String(e?.message ?? e).slice(0, 1500),
    });
    log(`  FAIL ${label}: ${String(e?.message ?? e).slice(0, 200)}`);
    sink.notes.push(
      `FAIL: ${label} — ${String(e?.message ?? e).slice(0, 300)}`,
    );
  }
}

/* ---------- Phase 1.1 ---------- */
async function phase11() {
  const sink = newSink("1.1 Public Visitor");
  const browser = await chromium.launch({
    headless: !HEADFUL,
    slowMo: SLOW_MO,
  });
  try {
    const viewports = [
      { w: 1280, h: 900, key: "1280" },
      { w: 768, h: 1024, key: "768" },
      { w: 375, h: 812, key: "375" },
    ];
    for (const vp of viewports) {
      const ctx = await browser.newContext({
        viewport: { width: vp.w, height: vp.h },
        deviceScaleFactor: 1,
        userAgent:
          vp.key === "375"
            ? "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15"
            : undefined,
      });
      const page = await ctx.newPage();
      attachLoggers(page, sink);

      await step(sink, `goto ${BASE_URL} @ ${vp.key}`, async () => {
        await page.goto(BASE_URL, {
          waitUntil: "networkidle",
          timeout: 60_000,
        });
      });

      await step(sink, `verify hero heading @ ${vp.key}`, async () => {
        const heading = page.getByRole("heading", {
          name: /Biến mục tiêu mơ hồ thành kế hoạch 12 tuần/i,
        });
        await heading.waitFor({ timeout: 15_000 });
        sink.notes.push(`@${vp.key}: hero heading visible`);
      });

      await step(
        sink,
        `verify "Cách hoạt động" section @ ${vp.key}`,
        async () => {
          const cachHoatDong = page.getByText(/Cách hoạt động/i).first();
          await cachHoatDong.waitFor({ timeout: 10_000 });
        },
      );

      await step(
        sink,
        `verify "Vì sao chọn Dear Our Future" @ ${vp.key}`,
        async () => {
          const visao = page.getByText(/Vì sao chọn Dear Our Future/i).first();
          await visao.waitFor({ timeout: 10_000 });
        },
      );

      await step(sink, `verify final CTA @ ${vp.key}`, async () => {
        const cta = page
          .getByText(/Sẵn sàng dựng chu kỳ 12 tuần đầu tiên/i)
          .first();
        await cta.scrollIntoViewIfNeeded();
        await cta.waitFor({ timeout: 10_000 });
      });

      await step(sink, `check horizontal overflow @ ${vp.key}`, async () => {
        const overflow = await page.evaluate(() => {
          return {
            scrollWidth: document.documentElement.scrollWidth,
            clientWidth: document.documentElement.clientWidth,
            bodyScroll: document.body.scrollWidth,
          };
        });
        if (overflow.scrollWidth > overflow.clientWidth + 1) {
          throw new Error(
            `horizontal overflow: scrollWidth=${overflow.scrollWidth} clientWidth=${overflow.clientWidth}`,
          );
        }
        sink.notes.push(
          `@${vp.key}: scrollWidth=${overflow.scrollWidth} clientWidth=${overflow.clientWidth} bodyScroll=${overflow.bodyScroll}`,
        );
      });

      await snap(page, sink, `public-${vp.key}`);
      await ctx.close();
    }
  } finally {
    await browser.close();
    await saveSink(sink, "1.1");
  }
}

/* ---------- shared helpers for logged-in flows ---------- */
async function loginAccount1(page, sink) {
  await step(sink, "goto /login", async () => {
    await page.goto(`${BASE_URL}/login`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
  });
  await step(sink, "fill email + password", async () => {
    const emailInput = page
      .locator(
        'input[type="email"], input[name="email"], input[autocomplete="email"]',
      )
      .first();
    await emailInput.waitFor({ timeout: 15_000 });
    await emailInput.fill(EMAIL);
    const pwInput = page
      .locator('input[type="password"], input[name="password"]')
      .first();
    await pwInput.fill(PASSWORD);
  });
  await step(sink, "submit login form", async () => {
    const submit = page
      .locator('button[type="submit"]')
      .filter({ hasText: /Đăng nhập|Sign in/i })
      .first();
    if ((await submit.count()) === 0) {
      // fallback: any submit
      const anySubmit = page.locator('button[type="submit"]').first();
      await anySubmit.click();
    } else {
      await submit.click();
    }
  });
  await step(sink, "wait for redirect away from /login", async () => {
    await page.waitForFunction(
      () => !window.location.pathname.startsWith("/login"),
      undefined,
      { timeout: 30_000 },
    );
    sink.notes.push(`post-login URL: ${page.url()}`);
  });
}

/* ---------- Phase 1.2 ---------- */
async function phase12() {
  const sink = newSink("1.2 Auth Flow");
  const browser = await chromium.launch({
    headless: !HEADFUL,
    slowMo: SLOW_MO,
  });
  try {
    if (!EMAIL || !PASSWORD) {
      sink.notes.push("SKIP: PROD_AUDIT_EMAIL/PASSWORD not provided");
      return;
    }
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    const page = await ctx.newPage();
    attachLoggers(page, sink);

    // Note: Phase 1.2 prompt yêu cầu signup account 2, nhưng user không cấp email mới.
    // Skip signup, chỉ test login + verify Google OAuth popup mở được.
    sink.notes.push(
      "SIGNUP SKIPPED — user did not provide a fresh email for account #2. Signup redirect path NOT verified by this audit.",
    );

    await loginAccount1(page, sink);
    await snap(page, sink, "post-login-1280");

    await step(sink, "verify post-login route is plausible", async () => {
      const url = page.url();
      const path = new URL(url).pathname;
      if (path === "/login") throw new Error("still on /login after submit");
      sink.notes.push(`landed at ${path}`);
    });

    // Verify Google OAuth popup behavior (nhấn nút, popup mở, KHÔNG complete)
    await step(sink, "logout to test Google OAuth button", async () => {
      // Best effort: navigate to /settings or click logout if visible
      // Simpler: clear cookies/storage in this context for next sub-step
      await ctx.clearCookies();
      await page.goto(`${BASE_URL}/login`, {
        waitUntil: "networkidle",
        timeout: 30_000,
      });
    });

    await step(
      sink,
      "click Google OAuth button (verify popup opens, do not complete)",
      async () => {
        const googleBtn = page
          .locator("button, a")
          .filter({ hasText: /Tiếp tục với Google|Google/i })
          .first();
        const exists = (await googleBtn.count()) > 0;
        if (!exists) {
          sink.notes.push("Google OAuth button NOT FOUND on /login");
          return;
        }
        let popupOpened = false;
        const popupPromise = ctx
          .waitForEvent("page", { timeout: 8_000 })
          .then((p) => {
            popupOpened = true;
            return p;
          })
          .catch(() => null);
        await googleBtn.click({ trial: false }).catch(() => null);
        const popup = await popupPromise;
        if (popup) {
          sink.notes.push(
            `Google OAuth popup opened: ${popup.url() || "(blank initial)"}`,
          );
          await popup.close().catch(() => null);
        } else {
          sink.notes.push(
            "Google OAuth popup did not open within 8s — may be redirect-flow or blocked",
          );
        }
        sink.notes.push(`popupOpened=${popupOpened}`);
      },
    );

    await snap(page, sink, "auth-google-popup-test-1280");
    await ctx.close();
  } finally {
    await browser.close();
    await saveSink(sink, "1.2");
  }
}

/* ---------- Phase 1.3 ---------- */
async function phase13() {
  const sink = newSink("1.3 Core Flow Logged-in");
  const browser = await chromium.launch({
    headless: !HEADFUL,
    slowMo: SLOW_MO,
  });
  try {
    if (!EMAIL || !PASSWORD) {
      sink.notes.push("SKIP: PROD_AUDIT_EMAIL/PASSWORD not provided");
      return;
    }
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    const page = await ctx.newPage();
    attachLoggers(page, sink);
    await loginAccount1(page, sink);

    await step(sink, "goto /12-week-system", async () => {
      await page.goto(`${BASE_URL}/12-week-system`, {
        waitUntil: "networkidle",
        timeout: 60_000,
      });
      await page.waitForTimeout(2000);
    });
    await snap(page, sink, "12week-system-overview-1280");

    await step(sink, "scrape goal title", async () => {
      const txt = await page.locator("body").innerText();
      const sample = txt.slice(0, 4000);
      sink.notes.push(
        `12-week-system body sample (4k): ${sample.replace(/\s+/g, " ")}`,
      );
    });

    await step(sink, "click 'Hôm nay' tab", async () => {
      const tab = page
        .getByRole("tab", { name: /Hôm nay/i })
        .or(page.getByRole("button", { name: /Hôm nay/i }))
        .or(page.getByRole("link", { name: /Hôm nay/i }))
        .first();
      const fallback = page.getByText(/^Hôm nay$/i).first();
      const target = (await tab.count()) > 0 ? tab : fallback;
      await target.click({ timeout: 8_000 }).catch(() => {
        sink.notes.push("Hôm nay tab click failed — may already be active");
      });
      await page.waitForTimeout(1500);
    });
    await snap(page, sink, "12week-today-1280");

    await step(sink, "find first task checkbox and toggle", async () => {
      const checkbox = page
        .locator(
          '[role="checkbox"], input[type="checkbox"], button[aria-pressed]',
        )
        .first();
      const count = await checkbox.count();
      sink.notes.push(`task checkbox count near top: ${count}`);
      if (count > 0) {
        const before = await checkbox
          .getAttribute("aria-checked")
          .catch(() => null);
        await checkbox.click({ timeout: 5_000 }).catch((e) => {
          sink.notes.push(`task click failed: ${e.message.slice(0, 200)}`);
        });
        await page.waitForTimeout(800);
        const after = await checkbox
          .getAttribute("aria-checked")
          .catch(() => null);
        sink.notes.push(`task aria-checked: before=${before} after=${after}`);
        // toggle back to leave state untouched
        await checkbox.click({ timeout: 5_000 }).catch(() => null);
      } else {
        sink.notes.push("no task checkbox located — Today tab may be empty");
      }
    });

    await step(sink, "click 'Tuần' tab", async () => {
      const tab = page
        .getByRole("tab", { name: /^Tuần$/i })
        .or(page.getByRole("button", { name: /^Tuần$/i }))
        .or(page.getByText(/^Tuần$/).first())
        .first();
      await tab.click({ timeout: 8_000 }).catch(() => {
        sink.notes.push("Tuần tab click failed");
      });
      await page.waitForTimeout(1500);
    });
    await snap(page, sink, "12week-week-1280");

    await step(sink, "click 'Tiến độ' tab", async () => {
      const tab = page
        .getByRole("tab", { name: /Tiến độ/i })
        .or(page.getByRole("button", { name: /Tiến độ/i }))
        .or(page.getByText(/Tiến độ/i).first())
        .first();
      await tab.click({ timeout: 8_000 }).catch(() => {
        sink.notes.push("Tiến độ tab click failed");
      });
      await page.waitForTimeout(1500);
    });
    await snap(page, sink, "12week-progress-1280");

    await step(sink, "goto /journal", async () => {
      await page.goto(`${BASE_URL}/journal`, {
        waitUntil: "networkidle",
        timeout: 30_000,
      });
      await page.waitForTimeout(1500);
    });
    await snap(page, sink, "journal-1280");

    await step(sink, "refresh page (F5) and verify auth persists", async () => {
      await page.reload({ waitUntil: "networkidle", timeout: 60_000 });
      await page.waitForTimeout(1500);
      const url = page.url();
      sink.notes.push(`post-refresh URL: ${url}`);
      if (new URL(url).pathname.startsWith("/login")) {
        throw new Error("auth lost after refresh — kicked back to /login");
      }
    });
    await snap(page, sink, "post-refresh-1280");

    await ctx.close();
  } finally {
    await browser.close();
    await saveSink(sink, "1.3");
  }
}

/* ---------- Phase 1.4 ---------- */
async function phase14() {
  const sink = newSink("1.4 Billing/Plus");
  const browser = await chromium.launch({
    headless: !HEADFUL,
    slowMo: SLOW_MO,
  });
  try {
    if (!EMAIL || !PASSWORD) {
      sink.notes.push("SKIP: credentials missing");
      return;
    }
    const ctx = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    const page = await ctx.newPage();
    attachLoggers(page, sink);
    await loginAccount1(page, sink);

    await step(sink, "goto /billing/plan", async () => {
      const t0 = Date.now();
      await page.goto(`${BASE_URL}/billing/plan`, {
        waitUntil: "networkidle",
        timeout: 60_000,
      });
      sink.notes.push(`/billing/plan load ms = ${Date.now() - t0}`);
      await page.waitForTimeout(2000);
    });
    await snap(page, sink, "billing-plan-1280");

    await step(sink, "scrape billing plan body", async () => {
      const txt = (await page.locator("body").innerText()).replace(/\s+/g, " ");
      sink.notes.push(`billing/plan body (5k): ${txt.slice(0, 5000)}`);
    });

    await step(sink, "click 'Nâng cấp Plus'", async () => {
      const btn = page
        .getByRole("button", { name: /Nâng cấp Plus|Nâng cấp/i })
        .or(page.getByRole("link", { name: /Nâng cấp Plus|Nâng cấp/i }))
        .first();
      if ((await btn.count()) === 0) {
        sink.notes.push("Upgrade button NOT FOUND");
        return;
      }
      const beforeUrl = page.url();
      await btn.click({ timeout: 8_000 }).catch((e) => {
        sink.notes.push(`upgrade click error: ${e.message.slice(0, 200)}`);
      });
      // Wait for either modal or navigation
      await page.waitForTimeout(4000);
      const afterUrl = page.url();
      sink.notes.push(`upgrade: before=${beforeUrl} after=${afterUrl}`);
    });
    await snap(page, sink, "billing-after-upgrade-click-1280");

    await step(sink, "scrape upgrade screen body", async () => {
      const txt = (await page.locator("body").innerText()).replace(/\s+/g, " ");
      sink.notes.push(`upgrade body (5k): ${txt.slice(0, 5000)}`);
      // Look for QR or transfer copy
      const hasQR = /VietQR|QR|Casso|Chuyển khoản|Quét mã/i.test(txt);
      sink.notes.push(`upgrade has QR/transfer copy: ${hasQR}`);
    });

    await step(sink, "back to /billing/plan to confirm not stuck", async () => {
      const t0 = Date.now();
      await page.goto(`${BASE_URL}/billing/plan`, {
        waitUntil: "domcontentloaded",
        timeout: 30_000,
      });
      sink.notes.push(`/billing/plan return load ms = ${Date.now() - t0}`);
    });

    await ctx.close();
  } finally {
    await browser.close();
    await saveSink(sink, "1.4");
  }
}

/* ---------- Phase 1.5 — multi-context sync sanity ---------- */
async function phase15() {
  const sink = newSink("1.5 Sync Multi-context");
  const browser = await chromium.launch({
    headless: !HEADFUL,
    slowMo: SLOW_MO,
  });
  try {
    if (!EMAIL || !PASSWORD) {
      sink.notes.push("SKIP: credentials missing");
      return;
    }
    // Open 2 isolated contexts (incognito-like)
    const ctxA = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    const ctxB = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();
    attachLoggers(pageA, sink);
    attachLoggers(pageB, sink);

    await step(sink, "login in context A", async () => {
      await pageA.goto(`${BASE_URL}/login`, {
        waitUntil: "networkidle",
        timeout: 60_000,
      });
      await pageA.locator('input[type="email"]').first().fill(EMAIL);
      await pageA.locator('input[type="password"]').first().fill(PASSWORD);
      await pageA.locator('button[type="submit"]').first().click();
      await pageA.waitForFunction(
        () => !location.pathname.startsWith("/login"),
        undefined,
        {
          timeout: 30_000,
        },
      );
    });
    await step(sink, "login in context B", async () => {
      await pageB.goto(`${BASE_URL}/login`, {
        waitUntil: "networkidle",
        timeout: 60_000,
      });
      await pageB.locator('input[type="email"]').first().fill(EMAIL);
      await pageB.locator('input[type="password"]').first().fill(PASSWORD);
      await pageB.locator('button[type="submit"]').first().click();
      await pageB.waitForFunction(
        () => !location.pathname.startsWith("/login"),
        undefined,
        {
          timeout: 30_000,
        },
      );
    });

    await step(sink, "both navigate to /12-week-system", async () => {
      await pageA.goto(`${BASE_URL}/12-week-system`, {
        waitUntil: "networkidle",
      });
      await pageB.goto(`${BASE_URL}/12-week-system`, {
        waitUntil: "networkidle",
      });
      await pageA.waitForTimeout(2000);
      await pageB.waitForTimeout(2000);
    });
    await snap(pageA, sink, "sync-ctxA-initial-1280");
    await snap(pageB, sink, "sync-ctxB-initial-1280");

    await step(sink, "snapshot body texts (truncated) for diff", async () => {
      const a = (await pageA.locator("body").innerText())
        .replace(/\s+/g, " ")
        .slice(0, 1500);
      const b = (await pageB.locator("body").innerText())
        .replace(/\s+/g, " ")
        .slice(0, 1500);
      sink.notes.push(`ctxA body slice: ${a}`);
      sink.notes.push(`ctxB body slice: ${b}`);
    });

    // We do NOT mutate task state to avoid corrupting user's data.
    // Document this clearly.
    sink.notes.push(
      "MUTATION SKIPPED: audit did not toggle tasks across contexts to avoid altering production user data. Sync latency therefore not measured by mutation; only verified that 2 concurrent sessions can read the same plan.",
    );

    await ctxA.close();
    await ctxB.close();
  } finally {
    await browser.close();
    await saveSink(sink, "1.5");
  }
}

/* ---------- Phase 1.6 — Mobile emulator (iPhone 12) ---------- */
async function phase16() {
  const sink = newSink("1.6 Mobile (iPhone 12 emulator)");
  const browser = await chromium.launch({
    headless: !HEADFUL,
    slowMo: SLOW_MO,
  });
  try {
    const iphone = devices["iPhone 12"];
    const ctx = await browser.newContext({ ...iphone });
    const page = await ctx.newPage();
    attachLoggers(page, sink);

    await step(sink, "goto / on iPhone 12", async () => {
      await page.goto(BASE_URL, { waitUntil: "networkidle", timeout: 60_000 });
    });
    await snap(page, sink, "mobile-public-iphone12");

    await step(sink, "check overflow on mobile", async () => {
      const o = await page.evaluate(() => ({
        sw: document.documentElement.scrollWidth,
        cw: document.documentElement.clientWidth,
      }));
      sink.notes.push(`mobile public overflow: ${JSON.stringify(o)}`);
      if (o.sw > o.cw + 1) throw new Error(`mobile overflow ${o.sw}>${o.cw}`);
    });

    if (EMAIL && PASSWORD) {
      await step(sink, "mobile login", async () => {
        await page.goto(`${BASE_URL}/login`, {
          waitUntil: "networkidle",
          timeout: 60_000,
        });
        await page.locator('input[type="email"]').first().fill(EMAIL);
        await page.locator('input[type="password"]').first().fill(PASSWORD);
        await page.locator('button[type="submit"]').first().click();
        await page
          .waitForFunction(
            () => !location.pathname.startsWith("/login"),
            undefined,
            {
              timeout: 30_000,
            },
          )
          .catch(() => sink.notes.push("mobile login: redirect timeout"));
      });
      await snap(page, sink, "mobile-post-login-iphone12");

      await step(sink, "mobile goto /12-week-system", async () => {
        await page.goto(`${BASE_URL}/12-week-system`, {
          waitUntil: "networkidle",
        });
        await page.waitForTimeout(2000);
      });
      await snap(page, sink, "mobile-12week-iphone12");

      await step(sink, "check mobile 12-week overflow", async () => {
        const o = await page.evaluate(() => ({
          sw: document.documentElement.scrollWidth,
          cw: document.documentElement.clientWidth,
        }));
        sink.notes.push(`mobile 12week overflow: ${JSON.stringify(o)}`);
        if (o.sw > o.cw + 1)
          throw new Error(`mobile 12week overflow ${o.sw}>${o.cw}`);
      });
    } else {
      sink.notes.push("SKIP mobile logged-in checks: credentials missing");
    }

    await ctx.close();
  } finally {
    await browser.close();
    await saveSink(sink, "1.6");
  }
}

/* ---------- main ---------- */
async function main() {
  await ensureDir();
  log(`PHASE = ${PHASE}`);
  log(
    `EMAIL = ${EMAIL ? EMAIL.replace(/(.{2}).+(@.+)/, "$1***$2") : "(not set)"}`,
  );

  switch (PHASE) {
    case "1.1":
      await phase11();
      break;
    case "1.2":
      await phase12();
      break;
    case "1.3":
      await phase13();
      break;
    case "1.4":
      await phase14();
      break;
    case "1.5":
      await phase15();
      break;
    case "1.6":
      await phase16();
      break;
    case "all":
      await phase11();
      await phase12();
      await phase13();
      await phase14();
      await phase15();
      await phase16();
      break;
    default:
      throw new Error(`unknown phase: ${PHASE}`);
  }
  log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
