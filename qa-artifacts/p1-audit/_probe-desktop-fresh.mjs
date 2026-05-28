import { chromium } from "playwright";

const EMAIL = process.env.PROD_AUDIT_EMAIL?.trim();
const PASSWORD = process.env.PROD_AUDIT_PASSWORD;
const BASE = "https://dearourfuture.io.vn";

(async () => {
  const browser = await chromium.launch({ headless: true });
  // Wait a bit so previous probes' rate-limit window expires
  console.log("=== sleeping 60s to let rate-limit window cool down ===");
  await new Promise((r) => setTimeout(r, 60_000));

  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", (m) => {
    const t = m.type();
    if (t === "error" || t === "warning")
      errs.push(`[${t}] ${m.text().slice(0, 250)}`);
  });
  page.on("response", (r) => {
    if (r.status() >= 400)
      errs.push(`[http ${r.status()}] ${r.request().method()} ${r.url()}`);
  });
  page.on("requestfailed", (r) => {
    errs.push(
      `[reqfail ${r.method()}] ${r.url()} -> ${r.failure()?.errorText}`,
    );
  });

  console.log("--- desktop fresh /login ---");
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
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
  console.log(`post-login URL: ${page.url()}`);
  await page.waitForTimeout(8000);
  console.log(`URL after 8s settle: ${page.url()}`);

  console.log("--- /12-week-system ---");
  await page.goto(`${BASE}/12-week-system`, { waitUntil: "networkidle" });
  await page.waitForTimeout(4000);
  console.log(`URL: ${page.url()}`);
  const txt = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  console.log(`first 600: ${txt.slice(0, 600)}`);
  console.log(
    `has "Cần chọn bản dữ liệu": ${txt.includes("Cần chọn bản dữ liệu")}`,
  );
  console.log(
    `has "Hệ thống 12 tuần" navigation: ${txt.includes("Hệ thống 12 tuần")}`,
  );
  console.log(
    `has goal title fragment: ${txt.includes("Hoàn thành một dự án nổi bật")}`,
  );
  await page.screenshot({
    path: "qa-artifacts/p1-audit/desktop-fresh-12week-1280.png",
    fullPage: false,
  });

  console.log("\n=== console / network ===");
  for (const e of errs) console.log(e);

  await browser.close();
})();
