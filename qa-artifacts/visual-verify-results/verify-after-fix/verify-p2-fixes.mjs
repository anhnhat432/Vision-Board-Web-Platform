/**
 * Post-Fix Verification Script - P2 UI Bug Fixes
 *
 * Kiểm tra 3 trang sau khi sửa các lỗi P2:
 * - P2-01: Dashboard - focusable elements trong aria-hidden
 * - P2-02: Vision Board - focusable elements + empty buttons
 * - P2-03 + P2-04: Goal Tracker - inert warning + flip card focus
 *
 * Usage: node qa-artifacts/visual-verify-results/verify-after-fix/verify-p2-fixes.mjs
 */

import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = "http://localhost:5173";
const SCREENSHOTS_DIR = __dirname;
const REPORT_PATH = join(__dirname, "verification-report.json");

// Pre-fix baseline từ REPORT.md
const BASELINE = {
  dashboard: {
    page: "/",
    name: "Dashboard",
    focusableInAriaHidden: 21,
    emptyButtons: 0,
  },
  "vision-board": {
    page: "/vision-board",
    name: "Vision Board",
    focusableInAriaHidden: 39,
    emptyButtons: 8,
  },
  goals: {
    page: "/goals",
    name: "Goal Tracker",
    focusableInAriaHidden: 4,
    emptyButtons: 0,
    inertWarning: true,
  },
};

const TARGET_PAGES = [
  { path: "/", name: "Dashboard (Trang chủ)", key: "dashboard" },
  { path: "/vision-board", name: "Vision Board Editor", key: "vision-board" },
  { path: "/goals", name: "Goal Tracker", key: "goals" },
];

/**
 * Comprehensive DOM analysis for accessibility issues
 */
async function analyzePage(page) {
  return await page.evaluate(() => {
    const results = {
      focusableInAriaHidden: {
        count: 0,
        elements: [],
      },
      emptyButtons: {
        count: 0,
        elements: [],
      },
      inertElements: {
        count: 0,
        elements: [],
      },
    };

    // ============================================================
    // 1. Focusable elements inside aria-hidden="true"
    // ============================================================
    // Comprehensive focusable selector
    const focusableSelector = [
      "a[href]",
      "button:not([disabled])",
      'input:not([disabled]):not([type="hidden"])',
      "select:not([disabled])",
      "textarea:not([disabled])",
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
      "audio[controls]",
      "video[controls]",
      "details > summary",
      "iframe",
      "object",
      "embed",
    ].join(", ");

    const allFocusable = document.querySelectorAll(focusableSelector);

    allFocusable.forEach((el) => {
      // Walk up the DOM to check if any ancestor has aria-hidden="true"
      let parent = el.parentElement;
      let isInsideAriaHidden = false;
      let ariaHiddenAncestor = null;

      while (parent) {
        if (parent.getAttribute("aria-hidden") === "true") {
          isInsideAriaHidden = true;
          ariaHiddenAncestor = parent;
          break;
        }
        parent = parent.parentElement;
      }

      if (isInsideAriaHidden) {
        results.focusableInAriaHidden.count++;
        results.focusableInAriaHidden.elements.push({
          tag: el.tagName.toLowerCase(),
          id: el.id || null,
          className: el.className?.toString()?.substring(0, 100) || null,
          text: (el.textContent || "").trim().substring(0, 100),
          type: el.getAttribute("type") || null,
          ariaLabel: el.getAttribute("aria-label") || null,
          role: el.getAttribute("role") || null,
          ariaHiddenAncestor: {
            tag: ariaHiddenAncestor.tagName.toLowerCase(),
            id: ariaHiddenAncestor.id || null,
            className:
              ariaHiddenAncestor.className?.toString()?.substring(0, 100) ||
              null,
          },
        });
      }
    });

    // Also check using the simpler approach (direct child query)
    const directFocusableInAriaHidden = document.querySelectorAll(
      '[aria-hidden="true"] a[href], [aria-hidden="true"] button, [aria-hidden="true"] input, [aria-hidden="true"] select, [aria-hidden="true"] textarea, [aria-hidden="true"] [tabindex]:not([tabindex="-1"])',
    );

    results.focusableInAriaHidden.directQueryCount =
      directFocusableInAriaHidden.length;

    // ============================================================
    // 2. Empty buttons/links without accessible name
    // ============================================================
    const allButtonsAndLinks = document.querySelectorAll(
      'button, a, [role="button"], [role="link"]',
    );

    allButtonsAndLinks.forEach((el) => {
      const tag = el.tagName.toLowerCase();
      const hasText = (el.textContent || "").trim().length > 0;
      const hasAriaLabel = !!el.getAttribute("aria-label");
      const hasAriaLabelledby = !!el.getAttribute("aria-labelledby");
      const hasTitle = !!el.getAttribute("title");
      const hasImgAlt = el.querySelector("img[alt]");

      // Check for sr-only text (screen reader only)
      const srOnlyChild = el.querySelector(".sr-only");
      const hasSrOnlyText =
        srOnlyChild && srOnlyChild.textContent.trim().length > 0;

      const hasAccessibleName =
        hasText ||
        hasAriaLabel ||
        hasAriaLabelledby ||
        hasTitle ||
        hasImgAlt ||
        hasSrOnlyText;

      if (!hasAccessibleName) {
        // Skip if it's a known decorative element
        const isDecorative =
          el.classList.contains("sr-only") ||
          el.getAttribute("aria-hidden") === "true";

        if (!isDecorative) {
          results.emptyButtons.count++;
          results.emptyButtons.elements.push({
            tag,
            id: el.id || null,
            className: el.className?.toString()?.substring(0, 100) || null,
            innerHTML: el.innerHTML.substring(0, 150),
            hasText,
            hasAriaLabel,
            hasTitle,
            hasSrOnlyText,
            role: el.getAttribute("role") || null,
          });
        }
      }
    });

    // ============================================================
    // 3. Inert attribute usage check
    // ============================================================
    const allElements = document.querySelectorAll("*");
    allElements.forEach((el) => {
      // Check if inert is present (as attribute or property)
      if (el.hasAttribute("inert") || el.inert === true) {
        const inertAttrValue = el.getAttribute("inert");
        results.inertElements.count++;
        results.inertElements.elements.push({
          tag: el.tagName.toLowerCase(),
          id: el.id || null,
          className: el.className?.toString()?.substring(0, 100) || null,
          inertAttribute: inertAttrValue,
          inertProperty: el.inert,
        });
      }
    });

    // ============================================================
    // 4. Additional checks: Dialog with modal=false
    // ============================================================
    const dialogs = document.querySelectorAll(
      '[role="dialog"], dialog, [data-radix-dialog-content]',
    );
    results.dialogInfo = Array.from(dialogs).map((d) => ({
      tag: d.tagName.toLowerCase(),
      id: d.id || null,
      className: d.className?.toString()?.substring(0, 100) || null,
      ariaHidden: d.getAttribute("aria-hidden"),
      ariaModal: d.getAttribute("aria-modal"),
      open: d.hasAttribute("open"),
      hasModalFalse:
        d.getAttribute("data-modal") === "false" ||
        d.getAttribute("aria-modal") === "false",
    }));

    return results;
  });
}

async function main() {
  console.log("=".repeat(60));
  console.log("🔍 P2 FIX VERIFICATION - Post-Fix Analysis");
  console.log("=".repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Output dir: ${SCREENSHOTS_DIR}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });

  /** @type {Array} */
  const results = [];

  for (const pageInfo of TARGET_PAGES) {
    console.log(`\n${"-".repeat(60)}`);
    console.log(`📄 [${pageInfo.name}] ${pageInfo.path}`);
    console.log(`${"-".repeat(60)}`);

    const page = await context.newPage();

    /** @type {Array} */
    const consoleErrors = [];
    /** @type {Array} */
    const consoleWarnings = [];

    // Capture ALL console messages
    page.on("console", (msg) => {
      const text = msg.text();
      if (msg.type() === "error") {
        consoleErrors.push(text);
      }
      if (msg.type() === "warning") {
        consoleWarnings.push(text);
      }
    });

    page.on("pageerror", (err) => {
      consoleErrors.push(`[PAGE ERROR] ${err.message}`);
    });

    const result = {
      route: pageInfo.path,
      name: pageInfo.name,
      key: pageInfo.key,
      status: null,
      redirectedTo: null,
      consoleErrors: [],
      consoleWarnings: [],
      screenshot: null,
      analysis: null,
      baseline: BASELINE[pageInfo.key] || null,
    };

    try {
      const response = await page.goto(`${BASE_URL}${pageInfo.path}`, {
        waitUntil: "networkidle",
        timeout: 20000,
      });

      if (response) {
        result.status = response.status();
      }

      // Wait for animations and lazy content
      await page.waitForTimeout(2000);

      // Check redirect
      const currentUrl = page.url();
      if (
        currentUrl !== `${BASE_URL}${pageInfo.path}` &&
        !currentUrl.startsWith(`${BASE_URL}${pageInfo.path}`)
      ) {
        result.redirectedTo = currentUrl.replace(BASE_URL, "");
      }

      // Take screenshot
      const screenshotPath = join(
        SCREENSHOTS_DIR,
        `${pageInfo.key}-desktop-postfix.png`,
      );
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
      });
      result.screenshot = screenshotPath;
      console.log(`  📸 Screenshot: ${screenshotPath}`);

      // Run deep DOM analysis
      console.log(`  🔬 Running DOM analysis...`);
      result.analysis = await analyzePage(page);

      // Store console messages
      result.consoleErrors = [...consoleErrors];
      result.consoleWarnings = [...consoleWarnings];

      // Specifically look for inert warning
      result.hasInertWarning = consoleWarnings.some(
        (w) => w.includes("inert") || w.includes("non-boolean"),
      );

      // Find inert-related console errors too
      result.hasInertError = consoleErrors.some((e) => e.includes("inert"));
    } catch (err) {
      console.error(`  ❌ Error loading page: ${err.message}`);
      result.status = null;
      result.consoleErrors.push(`[LOAD ERROR] ${err.message}`);
    }

    results.push(result);
    await page.close();
  }

  await browser.close();

  // ============================================================
  // Generate comparison report
  // ============================================================
  console.log(`\n\n${"=".repeat(60)}`);
  console.log("📊 VERIFICATION RESULTS");
  console.log("=".repeat(60));

  for (const r of results) {
    const bl = r.baseline;
    const an = r.analysis;

    console.log(`\n## ${r.name} (${r.route})`);
    console.log(`   HTTP Status: ${r.status || "FAILED"}`);

    if (an) {
      // Focusable in aria-hidden
      const focusableCount = an.focusableInAriaHidden.count;
      const focusableBefore = bl?.focusableInAriaHidden ?? "N/A";
      const focusableDelta = bl ? focusableCount - bl.focusableInAriaHidden : 0;
      const focusableIcon =
        focusableCount === 0 ? "✅" : focusableDelta < 0 ? "🟡" : "❌";
      console.log(
        `   ${focusableIcon} Focusable trong aria-hidden: ${focusableCount} (trước: ${focusableBefore}, Δ: ${focusableDelta >= 0 ? "+" : ""}${focusableDelta})`,
      );

      if (
        an.focusableInAriaHidden.elements.length > 0 &&
        an.focusableInAriaHidden.elements.length <= 10
      ) {
        console.log(`     Chi tiết:`);
        an.focusableInAriaHidden.elements.forEach((el) => {
          console.log(
            `       - <${el.tag}> "${el.text}" (trong <${el.ariaHiddenAncestor.tag}#${el.ariaHiddenAncestor.id || "?"}>)`,
          );
        });
      }

      // Empty buttons
      const emptyCount = an.emptyButtons.count;
      const emptyBefore = bl?.emptyButtons ?? "N/A";
      const emptyDelta = bl ? emptyCount - bl.emptyButtons : 0;
      const emptyIcon = emptyCount === 0 ? "✅" : emptyDelta < 0 ? "🟡" : "❌";
      console.log(
        `   ${emptyIcon} Empty buttons/links: ${emptyCount} (trước: ${emptyBefore}, Δ: ${emptyDelta >= 0 ? "+" : ""}${emptyDelta})`,
      );

      if (
        an.emptyButtons.elements.length > 0 &&
        an.emptyButtons.elements.length <= 10
      ) {
        console.log(`     Chi tiết:`);
        an.emptyButtons.elements.forEach((el) => {
          console.log(
            `       - <${el.tag}> class="${el.className}" innerHTML="${el.innerHTML}"`,
          );
        });
      }

      // Inert elements
      if (an.inertElements.count > 0) {
        console.log(`   ℹ️  Inert elements: ${an.inertElements.count}`);
        an.inertElements.elements.forEach((el) => {
          console.log(
            `       - <${el.tag}#${el.id || "?"}> inert attr="${el.inertAttribute}" prop=${el.inertProperty}`,
          );
        });
      }
    }

    // Console
    if (r.consoleErrors.length > 0) {
      console.log(`   ⚠️  Console errors (${r.consoleErrors.length}):`);
      r.consoleErrors.forEach((e) => console.log(`       - ${e}`));
    } else {
      console.log(`   ✅ No console errors`);
    }

    if (r.consoleWarnings.length > 0) {
      // Filter to show only relevant warnings
      const relevantWarnings = r.consoleWarnings.filter(
        (w) =>
          w.includes("inert") ||
          w.includes("aria") ||
          w.includes("focus") ||
          w.includes("React"),
      );
      if (relevantWarnings.length > 0) {
        console.log(
          `   ⚠️  Relevant warnings (${relevantWarnings.length}/${r.consoleWarnings.length} total):`,
        );
        relevantWarnings.forEach((w) => console.log(`       - ${w}`));
      } else {
        console.log(
          `   ℹ️  ${r.consoleWarnings.length} console warnings (none relevant to P2)`,
        );
      }
    } else {
      console.log(`   ✅ No console warnings`);
    }

    // Inert warning specifically
    if (r.hasInertWarning) {
      console.log(`   ❌ INERT WARNING STILL PRESENT`);
    } else if (bl?.inertWarning) {
      console.log(`   ✅ Inert warning đã được sửa (không còn xuất hiện)`);
    }
  }

  // ============================================================
  // Overall verdict
  // ============================================================
  console.log(`\n\n${"=".repeat(60)}`);
  console.log("🏁 OVERALL VERDICT");
  console.log("=".repeat(60));

  const dashboardResult = results.find((r) => r.key === "dashboard");
  const visionBoardResult = results.find((r) => r.key === "vision-board");
  const goalsResult = results.find((r) => r.key === "goals");

  const checks = [];

  if (dashboardResult?.analysis) {
    const ok = dashboardResult.analysis.focusableInAriaHidden.count === 0;
    checks.push({
      id: "P2-01",
      name: "Dashboard - Focusable trong aria-hidden",
      before: 21,
      after: dashboardResult.analysis.focusableInAriaHidden.count,
      fixed: ok,
      status: ok
        ? "✅ FIXED"
        : dashboardResult.analysis.focusableInAriaHidden.count < 21
          ? "🟡 IMPROVED"
          : "❌ NOT FIXED",
    });
  }

  if (visionBoardResult?.analysis) {
    const focusOk =
      visionBoardResult.analysis.focusableInAriaHidden.count === 0;
    const emptyOk = visionBoardResult.analysis.emptyButtons.count === 0;
    checks.push({
      id: "P2-02a",
      name: "Vision Board - Focusable trong aria-hidden",
      before: 39,
      after: visionBoardResult.analysis.focusableInAriaHidden.count,
      fixed: focusOk,
      status: focusOk
        ? "✅ FIXED"
        : visionBoardResult.analysis.focusableInAriaHidden.count < 39
          ? "🟡 IMPROVED"
          : "❌ NOT FIXED",
    });
    checks.push({
      id: "P2-02b",
      name: "Vision Board - Empty buttons/links",
      before: 8,
      after: visionBoardResult.analysis.emptyButtons.count,
      fixed: emptyOk,
      status: emptyOk
        ? "✅ FIXED"
        : visionBoardResult.analysis.emptyButtons.count < 8
          ? "🟡 IMPROVED"
          : "❌ NOT FIXED",
    });
  }

  if (goalsResult?.analysis) {
    const focusOk = goalsResult.analysis.focusableInAriaHidden.count === 0;
    const inertOk = !goalsResult.hasInertWarning;
    checks.push({
      id: "P2-03",
      name: "Goal Tracker - Focusable trong aria-hidden",
      before: 4,
      after: goalsResult.analysis.focusableInAriaHidden.count,
      fixed: focusOk,
      status: focusOk
        ? "✅ FIXED"
        : goalsResult.analysis.focusableInAriaHidden.count < 4
          ? "🟡 IMPROVED"
          : "❌ NOT FIXED",
    });
    checks.push({
      id: "P2-04",
      name: "Goal Tracker - inert warning",
      before: "Có warning",
      after: goalsResult.hasInertWarning ? "Còn warning" : "Không warning",
      fixed: inertOk,
      status: inertOk ? "✅ FIXED" : "❌ NOT FIXED",
    });
  }

  console.log("");
  for (const c of checks) {
    console.log(
      `   ${c.status.padEnd(18)} | ${c.id.padEnd(8)} | ${c.name.padEnd(42)} | Trước: ${String(c.before).padEnd(6)} → Sau: ${String(c.after).padEnd(6)}`,
    );
  }

  const allFixed = checks.every((c) => c.fixed);
  console.log(
    `\n   ${allFixed ? "✅ TẤT CẢ LỖI ĐÃ ĐƯỢC SỬA" : "⚠️  MỘT SỐ LỖI VẪN CÒN TỒN TẠI"}`,
  );

  // ============================================================
  // Save JSON report
  // ============================================================
  const report = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    viewport: "1280x900",
    baseline: BASELINE,
    checks,
    allFixed,
    results,
  };

  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf-8");
  console.log(`\n📝 Full report saved to: ${REPORT_PATH}`);
  console.log(`📸 Screenshots saved to: ${SCREENSHOTS_DIR}/`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
