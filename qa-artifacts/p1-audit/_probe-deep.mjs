import { chromium } from "playwright";

const EMAIL = process.env.PROD_AUDIT_EMAIL?.trim();
const PASSWORD = process.env.PROD_AUDIT_PASSWORD;
const BASE = "https://dearourfuture.io.vn";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await ctx.newPage();

  const log = (...a) => console.log(...a);
  page.on("console", (m) => {
    const t = m.type();
    if (t === "error" || t === "warning")
      log(`[console.${t}]`, m.text().slice(0, 300));
  });
  page.on("requestfailed", (r) => {
    log(`[reqfail ${r.method()}]`, r.url(), "->", r.failure()?.errorText);
  });
  page.on("response", (r) => {
    if (r.status() >= 400)
      log(`[http ${r.status()}]`, r.request().method(), r.url());
  });

  log("--- /login probe ---");
  await page.goto(`${BASE}/login`, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
  const buttons = await page.locator("button, a").evaluateAll((els) =>
    els
      .map((e) => ({
        tag: e.tagName,
        text: e.textContent?.trim().slice(0, 80) ?? "",
        aria: e.getAttribute("aria-label") ?? "",
      }))
      .filter((e) => e.text || e.aria),
  );
  log("login buttons:", JSON.stringify(buttons, null, 2));

  log("--- login then probe routes ---");
  await page.locator('input[type="email"]').first().fill(EMAIL);
  await page.locator('input[type="password"]').first().fill(PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page.waitForFunction(
    () => !location.pathname.startsWith("/login"),
    undefined,
    {
      timeout: 30_000,
    },
  );
  log("post-login URL:", page.url());

  for (const route of [
    "/",
    "/12-week-system",
    "/billing/plan",
    "/journal",
    "/onboarding",
  ]) {
    log(`\n--- goto ${route} ---`);
    const t0 = Date.now();
    await page
      .goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 30_000 })
      .catch((e) => {
        log("goto error:", e.message.slice(0, 200));
      });
    await page.waitForTimeout(2500);
    log(`  loaded in ${Date.now() - t0}ms`);
    log(`  final URL: ${page.url()}`);
    const headings = await page.locator("h1, h2, h3").allInnerTexts();
    log(`  headings: ${JSON.stringify(headings.slice(0, 8))}`);
    const bodyTxt = (await page.locator("body").innerText()).replace(
      /\s+/g,
      " ",
    );
    log(`  body sample (1k): ${bodyTxt.slice(0, 1000)}`);

    // detect tab visibility
    const tabsHomNay = await page.getByText(/Hôm nay/i).count();
    const tabsTuan = await page.getByText(/^Tuần$/).count();
    const tabsTienDo = await page.getByText(/Tiến độ/i).count();
    log(
      `  tab counts: homnay=${tabsHomNay} tuan=${tabsTuan} tiendo=${tabsTienDo}`,
    );
  }

  // Probe localStorage for plan-related keys
  log("\n--- localStorage keys ---");
  const lsKeys = await page.evaluate(() => Object.keys(localStorage));
  log("keys:", lsKeys);
  for (const k of lsKeys) {
    const sample = await page.evaluate(
      (kk) => localStorage.getItem(kk)?.slice(0, 800),
      k,
    );
    log(`  ${k} (${sample?.length ?? 0}b sample): ${sample}`);
  }

  await browser.close();
})();
