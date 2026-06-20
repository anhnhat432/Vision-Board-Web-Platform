/**
 * Visual Verification Script - Vision Board Web Platform
 *
 * Chụp màn hình các trang chính ở 4 kích thước viewport,
 * thu thập console errors, và kiểm tra các vấn đề giao diện cơ bản.
 *
 * Usage: node qa-artifacts/visual-verify-results/visual-verify.mjs
 */

import { chromium } from "playwright";
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = "http://localhost:5173";
const SCREENSHOTS_DIR = join(__dirname, "screenshots");
const REPORT_PATH = join(__dirname, "report.json");

const VIEWPORTS = {
  mobile: { width: 375, height: 812, label: "Mobile (375px)" },
  tablet: { width: 768, height: 1024, label: "Tablet (768px)" },
  desktop: { width: 1280, height: 900, label: "Desktop (1280px)" },
  wide: { width: 1920, height: 1080, label: "Wide (1920px)" },
};

// Routes thực tế trong app (từ src/app/routes.tsx)
const ROUTES = [
  { path: "/", name: "Dashboard (Trang chủ)", key: "dashboard" },
  { path: "/onboarding", name: "Onboarding", key: "onboarding" },
  { path: "/life-balance", name: "Life Balance", key: "life-balance" },
  { path: "/life-insight", name: "Life Insight", key: "life-insight" },
  {
    path: "/smart-goal-setup",
    name: "SMART Goal Setup",
    key: "smart-goal-setup",
  },
  { path: "/feasibility", name: "Feasibility Check", key: "feasibility" },
  { path: "/12-week-setup", name: "12-Week Setup", key: "12-week-setup" },
  { path: "/12-week-system", name: "12-Week System", key: "12-week-system" },
  {
    path: "/12-week-system?tab=today",
    name: "Today (12-Week Tab)",
    key: "today",
  },
  { path: "/journal", name: "Reflection Journal", key: "journal" },
  { path: "/vision-board", name: "Vision Board Editor", key: "vision-board" },
  { path: "/goals", name: "Goal Tracker", key: "goals" },
  { path: "/achievements", name: "Achievements", key: "achievements" },
];

/** @typedef {{ route: string, name: string, key: string, status: number|null, redirectedTo: string|null, consoleErrors: string[], screenshots: Record<string, string>, issues: { severity: string, category: string, description: string, element?: string }[], bodyHtml: string|null }} PageResult */

/** @type {PageResult[]} */
const results = [];

async function main() {
  console.log("🚀 Khởi động trình duyệt...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  for (const route of ROUTES) {
    console.log(`\n📄 [${route.name}] ${route.path}`);
    const page = await context.newPage();

    /** @type {PageResult} */
    const result = {
      route: route.path,
      name: route.name,
      key: route.key,
      status: null,
      redirectedTo: null,
      consoleErrors: [],
      screenshots: {},
      issues: [],
      bodyHtml: null,
    };

    // Capture console errors
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        result.consoleErrors.push(msg.text());
      }
    });

    page.on("pageerror", (err) => {
      result.consoleErrors.push(`[PAGE ERROR] ${err.message}`);
    });

    try {
      const response = await page.goto(`${BASE_URL}${route.path}`, {
        waitUntil: "networkidle",
        timeout: 15000,
      });

      if (response) {
        result.status = response.status();
      }

      // Wait a moment for lazy-loaded content
      await page.waitForTimeout(1500);

      // Check if redirected
      const currentUrl = page.url();
      if (
        currentUrl !== `${BASE_URL}${route.path}` &&
        !currentUrl.startsWith(`${BASE_URL}${route.path}`)
      ) {
        result.redirectedTo = currentUrl.replace(BASE_URL, "");
      }

      // Take screenshots at each viewport
      for (const [vpKey, vp] of Object.entries(VIEWPORTS)) {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.waitForTimeout(500);

        const screenshotPath = join(
          SCREENSHOTS_DIR,
          `${route.key}-${vpKey}.png`,
        );
        await page.screenshot({
          path: screenshotPath,
          fullPage: true,
        });
        result.screenshots[vpKey] = screenshotPath;
        console.log(`  📸 ${vp.label}: ${screenshotPath}`);
      }

      // Reset to desktop for DOM checks
      await page.setViewportSize({ width: 1280, height: 900 });

      // Collect DOM info for issue detection
      result.bodyHtml = await page.evaluate(() => {
        // Check for basic issues
        const issues = [];

        // 1. Check horizontal overflow on body/html
        const bodyEl = document.body;
        const htmlEl = document.documentElement;
        if (bodyEl.scrollWidth > window.innerWidth) {
          issues.push({
            severity: "P1",
            category: "Layout",
            description: `Nội dung tràn ngang (body scrollWidth=${bodyEl.scrollWidth} > viewport=${window.innerWidth})`,
          });
        }

        // 2. Check for images without alt text
        const imgsWithoutAlt = document.querySelectorAll("img:not([alt])");
        if (imgsWithoutAlt.length > 0) {
          issues.push({
            severity: "P2",
            category: "Accessibility",
            description: `${imgsWithoutAlt.length} ảnh thiếu thuộc tính alt`,
            elements: Array.from(imgsWithoutAlt)
              .slice(0, 5)
              .map((el) => el.outerHTML.substring(0, 200)),
          });
        }

        // 3. Check for elements with aria-hidden="true" containing focusable children
        const ariaHiddenWithFocusable = document.querySelectorAll(
          '[aria-hidden="true"] a, [aria-hidden="true"] button, [aria-hidden="true"] input',
        );
        if (ariaHiddenWithFocusable.length > 0) {
          issues.push({
            severity: "P2",
            category: "Accessibility",
            description: `${ariaHiddenWithFocusable.length} phần tử focusable nằm trong aria-hidden="true"`,
          });
        }

        // 4. Check for very small font sizes (< 12px)
        const smallFontEls = document.querySelectorAll("*");
        let tinyFontCount = 0;
        smallFontEls.forEach((el) => {
          const style = window.getComputedStyle(el);
          const fontSize = parseFloat(style.fontSize);
          if (fontSize > 0 && fontSize < 10 && el.textContent?.trim()) {
            tinyFontCount++;
          }
        });
        if (tinyFontCount > 0) {
          issues.push({
            severity: "P3",
            category: "Typography",
            description: `${tinyFontCount} phần tử có font-size < 10px`,
          });
        }

        // 5. Check for fixed position elements that might overlap content
        const fixedEls = document.querySelectorAll(
          '[style*="position: fixed"], [style*="position:fixed"]',
        );
        // Also check for common fixed classes
        const fixedClasses = document.querySelectorAll(
          '.fixed, [class*="fixed"]',
        );
        // Just note count for manual review

        // 6. Check for empty buttons/links
        const emptyButtons = document.querySelectorAll(
          'button:empty, a:empty, [role="button"]:empty',
        );
        if (emptyButtons.length > 0) {
          issues.push({
            severity: "P2",
            category: "Accessibility",
            description: `${emptyButtons.length} button/link rỗng (không có text content hoặc aria-label)`,
          });
        }

        return {
          issues,
          title: document.title,
          hasViewportMeta: !!document.querySelector('meta[name="viewport"]'),
          lang: document.documentElement.lang || "not set",
        };
      });

      // Merge DOM-detected issues
      if (result.bodyHtml?.issues) {
        result.issues.push(...result.bodyHtml.issues);
      }

      // Add meta checks
      if (result.bodyHtml && !result.bodyHtml.hasViewportMeta) {
        result.issues.push({
          severity: "P2",
          category: "Responsive",
          description: 'Thiếu thẻ <meta name="viewport">',
        });
      }
      if (
        result.bodyHtml &&
        (!result.bodyHtml.lang || result.bodyHtml.lang === "not set")
      ) {
        result.issues.push({
          severity: "P2",
          category: "Accessibility",
          description: "Thiếu thuộc tính lang trên thẻ <html>",
        });
      }
    } catch (err) {
      console.error(`  ❌ Lỗi khi tải trang: ${err.message}`);
      result.status = null;
      result.issues.push({
        severity: "P1",
        category: "Navigation",
        description: `Không thể tải trang: ${err.message}`,
      });
    }

    results.push(result);
    await page.close();
  }

  await browser.close();

  // Generate summary report
  const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);
  const p1Issues = results.reduce(
    (sum, r) => sum + r.issues.filter((i) => i.severity === "P1").length,
    0,
  );
  const p2Issues = results.reduce(
    (sum, r) => sum + r.issues.filter((i) => i.severity === "P2").length,
    0,
  );
  const p3Issues = results.reduce(
    (sum, r) => sum + r.issues.filter((i) => i.severity === "P3").length,
    0,
  );

  const pagesWithErrors = results.filter((r) => r.consoleErrors.length > 0);
  const failedPages = results.filter(
    (r) => r.status === null || (r.status && r.status >= 400),
  );
  const redirectedPages = results.filter((r) => r.redirectedTo);

  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    summary: {
      totalPages: ROUTES.length,
      pagesSucceeded: results.filter((r) => r.status && r.status < 400).length,
      pagesFailed: failedPages.length,
      pagesRedirected: redirectedPages.length,
      pagesWithConsoleErrors: pagesWithErrors.length,
      totalIssuesFound: totalIssues,
      p1Critical: p1Issues,
      p2Moderate: p2Issues,
      p3Minor: p3Issues,
    },
    redirectedPages: redirectedPages.map((r) => ({
      route: r.route,
      name: r.name,
      redirectedTo: r.redirectedTo,
    })),
    consoleErrorsSummary: pagesWithErrors.map((r) => ({
      route: r.route,
      name: r.name,
      errors: r.consoleErrors,
    })),
    perPageResults: results,
  };

  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf-8");
  console.log(`\n\n✅ Báo cáo đã được lưu tại: ${REPORT_PATH}`);

  // Print summary
  console.log("\n═══════════════════════════════════════");
  console.log("📊 TÓM TẮT KẾT QUẢ KIỂM TRA");
  console.log("═══════════════════════════════════════");
  console.log(`   Tổng số trang: ${report.summary.totalPages}`);
  console.log(`   ✅ Thành công: ${report.summary.pagesSucceeded}`);
  console.log(`   ❌ Thất bại:   ${report.summary.pagesFailed}`);
  console.log(`   🔀 Redirect:   ${report.summary.pagesRedirected}`);
  console.log(
    `   ⚠️  Console errors: ${report.summary.pagesWithConsoleErrors} trang`,
  );
  console.log(
    `   🐛 Tổng vấn đề: ${report.summary.totalIssuesFound} (P1: ${p1Issues}, P2: ${p2Issues}, P3: ${p3Issues})`,
  );

  if (failedPages.length > 0) {
    console.log("\n❌ TRANG LỖI:");
    failedPages.forEach((p) => console.log(`   - ${p.route} (${p.name})`));
  }
  if (redirectedPages.length > 0) {
    console.log("\n🔀 TRANG BỊ REDIRECT:");
    redirectedPages.forEach((p) =>
      console.log(`   - ${p.route} → ${p.redirectedTo}`),
    );
  }
  if (pagesWithErrors.length > 0) {
    console.log("\n⚠️  CONSOLE ERRORS:");
    pagesWithErrors.forEach((p) => {
      console.log(`   - ${p.name}:`);
      p.consoleErrors.forEach((e) => console.log(`     • ${e}`));
    });
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
