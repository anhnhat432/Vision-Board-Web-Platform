import { chromium } from "playwright";
import fs from "node:fs/promises";

const url = "http://127.0.0.1:5173/onboarding";
const outDir = "qa-artifacts/onboarding-visual-review";
await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const viewports = [
  { name: "mobile-375", width: 375, height: 900 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1280", width: 1280, height: 900 },
];

const results = [];

for (const vp of viewports) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    reducedMotion: "reduce",
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const consoleMessages = [];
  page.on("console", (msg) => {
    const type = msg.type();
    if (type === "error" || type === "warning")
      consoleMessages.push(`${type}: ${msg.text()}`);
  });

  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  await page.screenshot({ path: `${outDir}/${vp.name}.png`, fullPage: true });

  const metrics = await page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const overflowing = Array.from(document.querySelectorAll("body *"))
      .map((el) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return {
          tag: el.tagName.toLowerCase(),
          id: el.id || "",
          className: typeof el.className === "string" ? el.className : "",
          text: (el.textContent || "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 120),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          display: style.display,
          position: style.position,
          overflowX: style.overflowX,
        };
      })
      .filter(
        (item) =>
          item.width > 0 &&
          (item.left < -1 || item.right > window.innerWidth + 1),
      );

    const targets = Array.from(
      document.querySelectorAll(
        'button, a, [role="button"], input, textarea, select',
      ),
    )
      .map((el) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return {
          tag: el.tagName.toLowerCase(),
          text: (el.textContent || el.getAttribute("aria-label") || "")
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 120),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          visible:
            rect.width > 0 &&
            rect.height > 0 &&
            style.visibility !== "hidden" &&
            style.display !== "none",
        };
      })
      .filter((item) => item.visible);

    const motionTransitions = Array.from(document.querySelectorAll("body *"))
      .map((el) => window.getComputedStyle(el))
      .filter(
        (style) =>
          style.transitionDuration !== "0s" || style.animationDuration !== "0s",
      ).length;

    return {
      title: document.title,
      pathname: window.location.pathname,
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      scrollWidth: Math.max(root.scrollWidth, body.scrollWidth),
      clientWidth: root.clientWidth,
      horizontalOverflow:
        Math.max(root.scrollWidth, body.scrollWidth) > root.clientWidth + 1,
      overflowing: overflowing.slice(0, 30),
      targetCount: targets.length,
      smallTargets: targets
        .filter((target) => target.height < 40 || target.width < 40)
        .slice(0, 30),
      h1:
        document
          .querySelector("h1")
          ?.textContent?.replace(/\s+/g, " ")
          .trim() || "",
      mainText: (
        document.querySelector("main")?.textContent ||
        body.textContent ||
        ""
      )
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 1400),
      motionTransitions,
    };
  });

  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await page.screenshot({
    path: `${outDir}/${vp.name}-focus.png`,
    fullPage: false,
  });
  const focusInfo = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return {
      tag: el.tagName.toLowerCase(),
      text: (el.textContent || el.getAttribute("aria-label") || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 120),
      outline: style.outline,
      boxShadow: style.boxShadow,
      ringVisible: style.outlineStyle !== "none" || style.boxShadow !== "none",
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };
  });

  results.push({ viewport: vp, metrics, focusInfo, consoleMessages });
  await context.close();
}

await browser.close();
await fs.writeFile(
  `${outDir}/report.json`,
  JSON.stringify(results, null, 2),
  "utf8",
);
console.log(JSON.stringify(results, null, 2));
