import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await ctx.newPage();
  await page.goto("https://dearourfuture.io.vn", {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
  // scroll to bottom slowly to trigger lazy sections
  for (let y = 0; y < 8000; y += 800) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(300);
  }
  const text = await page.locator("body").innerText();
  console.log("--- BEGIN BODY TEXT (truncated 12k) ---");
  console.log(text.slice(0, 12000));
  console.log("--- END ---");
  console.log("hasVisao=", /Vì sao/i.test(text));
  console.log("hasChonDearOurFuture=", /chọn Dear Our Future/i.test(text));
  console.log("hasCachHoatDong=", /Cách hoạt động/i.test(text));
  console.log(
    "hasFinalCTA=",
    /Sẵn sàng dựng chu kỳ 12 tuần đầu tiên/i.test(text),
  );
  // headings
  const headings = await page.locator("h1, h2, h3").allInnerTexts();
  console.log("HEADINGS:", JSON.stringify(headings, null, 2));
  await browser.close();
})();
