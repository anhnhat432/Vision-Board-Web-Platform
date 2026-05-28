import { chromium, devices } from "playwright";

const EMAIL = process.env.PROD_AUDIT_EMAIL?.trim();
const PASSWORD = process.env.PROD_AUDIT_PASSWORD;
const BASE = "https://dearourfuture.io.vn";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    ...devices["iPhone 12"],
    storageState: undefined, // truly fresh
  });
  const page = await ctx.newPage();
  const networkErrors = [];
  const consoleErrors = [];
  page.on("console", (m) => {
    const t = m.type();
    if (t === "error" || t === "warning")
      consoleErrors.push(`[${t}] ${m.text().slice(0, 250)}`);
  });
  page.on("response", (r) => {
    if (r.status() >= 400)
      networkErrors.push(
        `[http ${r.status()}] ${r.request().method()} ${r.url()}`,
      );
  });
  page.on("requestfailed", (r) => {
    networkErrors.push(
      `[reqfail ${r.method()}] ${r.url()} -> ${r.failure()?.errorText}`,
    );
  });

  const log = (...a) => console.log(...a);
  log("=== Mobile fresh browser scenario ===");
  log("--- /login ---");
  const loginStart = Date.now();
  await page.goto(`${BASE}/login`, {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
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
  log(
    `login submit -> redirect: ${Date.now() - loginStart}ms; final URL: ${page.url()}`,
  );
  await page.screenshot({
    path: "qa-artifacts/p1-audit/mobile-after-login-iphone12.png",
  });

  // Wait for any auto-sync to complete or settle
  await page.waitForTimeout(8000);
  log(`URL after 8s settle: ${page.url()}`);
  await page.screenshot({
    path: "qa-artifacts/p1-audit/mobile-after-settle-iphone12.png",
  });

  log("--- /12-week-system (mobile) ---");
  await page.goto(`${BASE}/12-week-system`, {
    waitUntil: "networkidle",
    timeout: 30_000,
  });
  await page.waitForTimeout(4000);
  log(`12week URL: ${page.url()}`);
  const headings12w = await page.locator("h1, h2, h3").allInnerTexts();
  log(`headings: ${JSON.stringify(headings12w.slice(0, 6))}`);
  const conflictBanner = (await page.locator("body").innerText()).includes(
    "Cần chọn bản dữ liệu",
  );
  log(`has conflict banner "Cần chọn bản dữ liệu": ${conflictBanner}`);
  await page.screenshot({
    path: "qa-artifacts/p1-audit/mobile-12week-after-settle-iphone12.png",
  });

  log("--- /billing/plan (mobile) ---");
  await page.goto(`${BASE}/billing/plan`, {
    waitUntil: "networkidle",
    timeout: 30_000,
  });
  await page.waitForTimeout(3000);
  const billingTxt = (await page.locator("body").innerText()).replace(
    /\s+/g,
    " ",
  );
  log(
    `billing has "Thanh toán đang tạm khóa": ${billingTxt.includes("Thanh toán đang tạm khóa")}`,
  );
  log(
    `billing has "Nâng cấp Plus" button: ${(await page.getByRole("button", { name: /Nâng cấp/i }).count()) > 0}`,
  );
  log(`billing first 800 chars: ${billingTxt.slice(0, 800)}`);
  await page.screenshot({
    path: "qa-artifacts/p1-audit/mobile-billing-iphone12.png",
  });

  log("\n=== console / network ===");
  for (const e of consoleErrors) log(e);
  for (const e of networkErrors) log(e);

  await browser.close();
})();
