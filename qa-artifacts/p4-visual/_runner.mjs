#!/usr/bin/env node
/**
 * P4 Visual QA Runner — capture 10 routes × 3 viewports.
 * Local-only screenshot probe, không sửa code, không thanh toán.
 * Output: qa-artifacts/p4-visual/{viewport}/{step}-{slug}.png
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = __dirname;
const BASE_URL = process.env.P4_VISUAL_URL ?? "http://localhost:5173";

const VIEWPORTS = [
  { name: "1280", width: 1280, height: 800 },
  { name: "768", width: 768, height: 1024 },
  { name: "375", width: 375, height: 812 },
];

const STEPS = [
  { slug: "01-home", path: "/" },
  { slug: "02-onboarding", path: "/onboarding" },
  { slug: "03-life-insight", path: "/life-insight" },
  { slug: "04-smart-goal-setup", path: "/smart-goal-setup" },
  { slug: "05-feasibility", path: "/feasibility" },
  { slug: "06-12week-setup", path: "/12-week-setup" },
  { slug: "07-12week-system", path: "/12-week-system" },
  { slug: "08-today-v2", path: "/today-v2" },
  { slug: "09-journal", path: "/journal" },
  { slug: "10-billing-plan", path: "/billing/plan" },
];

function log(msg) {
  console.log(`[p4-visual] ${msg}`);
}

async function captureViewport(browser, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    locale: "vi-VN",
  });
  const page = await context.newPage();
  page.on("pageerror", (e) =>
    log(`  pageerror[${viewport.name}]: ${e.message.split("\n")[0]}`),
  );

  // Clear localStorage one time per viewport
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  try {
    await page.evaluate(() => {
      try {
        localStorage.clear();
      } catch {}
      try {
        sessionStorage.clear();
      } catch {}
    });
  } catch {}

  const dir = join(OUTPUT_DIR, viewport.name);
  mkdirSync(dir, { recursive: true });

  const results = [];
  for (const step of STEPS) {
    const url = `${BASE_URL}${step.path}`;
    log(`  ${viewport.name} → ${step.path}`);
    let status = "ok";
    let finalUrl = "";
    try {
      const resp = await page.goto(url, {
        waitUntil: "networkidle",
        timeout: 25000,
      });
      finalUrl = page.url();
      // wait a small settling moment
      await page.waitForTimeout(800);
      const httpStatus = resp ? resp.status() : "n/a";
      const filePath = join(dir, `${step.slug}.png`);
      await page.screenshot({ path: filePath, fullPage: false });
      results.push({
        step: step.slug,
        viewport: viewport.name,
        requestedPath: step.path,
        finalUrl,
        httpStatus,
        status: "ok",
      });
    } catch (e) {
      status = "error:" + (e?.message?.split("\n")[0] ?? "unknown");
      const filePath = join(dir, `${step.slug}-ERR.png`);
      try {
        await page.screenshot({ path: filePath, fullPage: false });
      } catch {}
      results.push({
        step: step.slug,
        viewport: viewport.name,
        requestedPath: step.path,
        finalUrl: page.url(),
        httpStatus: "n/a",
        status,
      });
    }
  }

  await context.close();
  return results;
}

async function main() {
  log(`BASE_URL=${BASE_URL}`);
  const browser = await chromium.launch({ headless: true });
  const allResults = [];
  for (const vp of VIEWPORTS) {
    log(`-- viewport ${vp.name} (${vp.width}x${vp.height}) --`);
    const r = await captureViewport(browser, vp);
    allResults.push(...r);
  }
  await browser.close();

  // Print compact summary table
  log("--- summary ---");
  for (const r of allResults) {
    const final = r.finalUrl.replace(BASE_URL, "") || "?";
    const drift = final.split("?")[0] !== r.requestedPath ? `→ ${final}` : "ok";
    log(
      `${r.viewport.padEnd(4)} ${r.step.padEnd(22)} http=${r.httpStatus} ${drift}`,
    );
  }
}

main().catch((e) => {
  console.error("[p4-visual] FATAL:", e);
  process.exitCode = 1;
});
