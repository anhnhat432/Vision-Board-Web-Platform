#!/usr/bin/env node

/**
 * Baseline screenshot capture + gating for the `core-flow-ui-upgrade` spec.
 *
 * Dev-time tooling (Requirement 1.2, 1.5, 1.7). NOT bundled into the product.
 *
 * Two modes:
 *   --mode capture  (default) : chụp Baseline_Screenshot cho mỗi màn hình Core_Flow + Dashboard
 *                               ở Desktop_Viewport (1440x900) và Mobile_Viewport (390x844),
 *                               lưu vào docs/specs/core-flow-ui-upgrade/screenshots/baseline/.
 *                               Nếu bất kỳ lần chụp nào thất bại → KHÔNG đánh dấu hoàn tất,
 *                               in lỗi kèm screen + viewport và thoát non-zero (Req 1.7).
 *   --mode check    (gating)  : xác minh baseline (Desktop + Mobile) đã tồn tại cho màn hình
 *                               được yêu cầu chỉnh sửa. Nếu thiếu → in "baseline missing"
 *                               kèm screen + viewport và thoát non-zero để chặn chỉnh sửa (Req 1.5).
 *                               Chế độ này chỉ đọc filesystem, KHÔNG cần dev server.
 *
 * Usage:
 *   node scripts/capture-baseline-screenshots.mjs                     # capture tất cả màn hình
 *   node scripts/capture-baseline-screenshots.mjs --screen dashboard  # capture 1 màn hình
 *   node scripts/capture-baseline-screenshots.mjs --mode check                 # gate tất cả màn hình
 *   node scripts/capture-baseline-screenshots.mjs --mode check --screen goals  # gate 1 màn hình
 *
 *   node scripts/capture-baseline-screenshots.mjs --output docs/.../after   # chụp After_Screenshot
 *
 * Env:
 *   BASELINE_BASE_URL   base URL của dev server (mặc định http://localhost:5173)
 *   BASELINE_OUTPUT_DIR thư mục lưu baseline (mặc định docs/specs/core-flow-ui-upgrade/screenshots/baseline)
 *
 * Flags:
 *   --output <dir>      override thư mục lưu (ưu tiên hơn BASELINE_OUTPUT_DIR); dùng cho After_Screenshot
 */

import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const BASE_URL = (process.env.BASELINE_BASE_URL ?? "http://localhost:5173").replace(/\/$/, "");
const DEFAULT_OUTPUT_DIR =
  process.env.BASELINE_OUTPUT_DIR ?? "docs/specs/core-flow-ui-upgrade/screenshots/baseline";

/**
 * Thư mục lưu screenshot. Mặc định là baseline dir; có thể override qua `--output`
 * (ưu tiên cao nhất) hoặc env BASELINE_OUTPUT_DIR. `--output` giúp chụp After_Screenshot
 * cross-platform mà không cần cross-env (Requirement 1.4).
 */
let OUTPUT_DIR = path.resolve(DEFAULT_OUTPUT_DIR);

/** Danh sách màn hình Core_Flow + Dashboard (đối chiếu docs/specs/core-flow-ui-upgrade/audit.md). */
const SCREENS = [
  { id: "onboarding", route: "/onboarding" },
  { id: "life-balance", route: "/life-balance" },
  { id: "life-insight", route: "/life-insight" },
  { id: "smart-goal-setup", route: "/smart-goal-setup" },
  { id: "feasibility", route: "/feasibility" },
  { id: "12-week-setup", route: "/12-week-setup" },
  { id: "12-week-system", route: "/12-week-system" },
  { id: "goals", route: "/goals" },
  { id: "journal", route: "/journal" },
  { id: "dashboard", route: "/" },
];

/** Desktop_Viewport (1440x900) + Mobile_Viewport (390x844) theo Requirement 1.2. */
const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

function log(message) {
  console.log(`[baseline] ${message}`);
}

function screenshotPathFor(screenId, viewportName) {
  return path.join(OUTPUT_DIR, `${screenId}_${viewportName}.png`);
}

function parseArgs(argv) {
  const args = { mode: "capture", screen: null, output: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--mode") {
      args.mode = argv[i + 1];
      i += 1;
    } else if (arg.startsWith("--mode=")) {
      args.mode = arg.slice("--mode=".length);
    } else if (arg === "--screen") {
      args.screen = argv[i + 1];
      i += 1;
    } else if (arg.startsWith("--screen=")) {
      args.screen = arg.slice("--screen=".length);
    } else if (arg === "--output" || arg === "--out") {
      args.output = argv[i + 1];
      i += 1;
    } else if (arg.startsWith("--output=")) {
      args.output = arg.slice("--output=".length);
    } else if (arg.startsWith("--out=")) {
      args.output = arg.slice("--out=".length);
    }
  }
  return args;
}

function resolveScreens(screenId) {
  if (!screenId) return SCREENS;
  const found = SCREENS.find((screen) => screen.id === screenId);
  if (!found) {
    const known = SCREENS.map((screen) => screen.id).join(", ");
    throw new Error(`Unknown screen id "${screenId}". Known screens: ${known}`);
  }
  return [found];
}

async function fileExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Gating mode (Req 1.5): chặn chỉnh sửa khi thiếu baseline.
 * Chỉ đọc filesystem — không khởi động browser hay dev server.
 */
async function runCheck(screens) {
  const missing = [];
  for (const screen of screens) {
    for (const viewport of VIEWPORTS) {
      const filePath = screenshotPathFor(screen.id, viewport.name);
      if (!(await fileExists(filePath))) {
        missing.push({ screen: screen.id, viewport: viewport.name, filePath });
      }
    }
  }

  if (missing.length > 0) {
    console.error("[baseline] baseline missing — chỉnh sửa bị chặn (Requirement 1.5).");
    for (const item of missing) {
      console.error(
        `[baseline] baseline missing: screen="${item.screen}" viewport="${item.viewport}" (expected: ${item.filePath})`,
      );
    }
    console.error(
      "[baseline] Chạy `npm run screenshots:baseline` để chụp baseline trước khi chỉnh sửa màn hình trên.",
    );
    process.exitCode = 1;
    return;
  }

  log(`OK — baseline đầy đủ cho ${screens.length} màn hình (Desktop 1440x900 + Mobile 390x844).`);
}

/**
 * Seed localStorage để các màn hình Core_Flow render có dữ liệu.
 * Chỉ ghi vào localStorage của trình duyệt QA — KHÔNG đụng Core contract / dữ liệu thật.
 */
async function seedLocalStorage(page) {
  await page.evaluate(() => {
    const pad = (value) => String(value).padStart(2, "0");
    const dateKey = (date) =>
      `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    const addDays = (date, days) => {
      const next = new Date(date);
      next.setDate(next.getDate() + days);
      return next;
    };
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const goalId = "goal_baseline";
    const tacticOneId = "tactic_one";
    const tacticTwoId = "tactic_two";
    const totalWeeks = 12;

    const weeklyPlans = Array.from({ length: totalWeeks }, (_, index) => ({
      weekNumber: index + 1,
      focus: index === 0 ? "Bắt đầu nhịp tuần 1." : "Giữ nhịp execution.",
      milestone: index === 11 ? "Hoàn thành chu kỳ." : "",
      completed: false,
    }));
    const scoreboard = Array.from({ length: totalWeeks }, (_, index) => ({
      weekNumber: index + 1,
      leadCompletionPercent: 0,
      mainMetricProgress: "",
      outputDone: "",
      reviewDone: false,
      weeklyScore: 0,
    }));
    const taskInstances = [
      {
        id: "tw_task_1",
        weekNumber: 1,
        scheduledDate: dateKey(today),
        title: "Luyện 1 đề Listening",
        leadIndicatorName: "Luyện 1 đề Listening",
        isCore: true,
        completed: false,
        tacticId: tacticOneId,
      },
      {
        id: "tw_task_2",
        weekNumber: 1,
        scheduledDate: dateKey(today),
        title: "Viết 1 essay Task 2",
        leadIndicatorName: "Viết 1 essay Task 2",
        isCore: true,
        completed: false,
        tacticId: tacticTwoId,
      },
    ];

    const data = {
      storageVersion: 5,
      userId: "baseline-qa",
      wheelOfLifeHistory: [],
      currentWheelOfLife: [
        { name: "Career", score: 7, color: "#8b5cf6" },
        { name: "Finance", score: 6, color: "#10b981" },
        { name: "Health", score: 6, color: "#ef4444" },
        { name: "Education", score: 7, color: "#f59e0b" },
        { name: "Relationships", score: 6, color: "#ec4899" },
        { name: "Family", score: 7, color: "#3b82f6" },
        { name: "Personal Growth", score: 8, color: "#14b8a6" },
        { name: "Leisure", score: 5, color: "#a855f7" },
      ],
      goals: [
        {
          id: goalId,
          category: "Personal Growth",
          title: "Đạt IELTS 7.0 trước tháng 9",
          description: "Baseline screenshot - đánh giá thực tế cho mục tiêu IELTS.",
          deadline: dateKey(addDays(today, 83)),
          feasibilityResult: "realistic",
          readinessScore: 18,
          focusArea: "Personal Growth",
          tasks: [],
          createdAt: now.toISOString(),
          twelveWeekSystem: {
            goalType: "Personal Growth",
            vision12Week: "Đạt IELTS 7.0 trước tháng 9",
            lagMetric: { name: "tuần review hoàn chỉnh", unit: "tuần", target: "12", currentValue: "0" },
            leadIndicators: [
              { id: tacticOneId, name: "Luyện 1 đề Listening", target: "1", unit: "lần/tuần", type: "core", priority: 1, schedule: [0] },
              { id: tacticTwoId, name: "Viết 1 essay Task 2", target: "1", unit: "lần/tuần", type: "core", priority: 2, schedule: [0] },
            ],
            milestones: { week4: "Giữ nhịp 4 tuần đầu.", week8: "Khóa nhịp giữa chu kỳ.", week12: "Kết thúc chu kỳ." },
            successEvidence: "Review loop works smoothly.",
            reviewDay: "Sunday",
            week12Outcome: "Một chu kỳ đầy đủ.",
            startDate: dateKey(today),
            endDate: dateKey(addDays(today, 83)),
            timezone: "Asia/Ho_Chi_Minh",
            weekStartsOn: "Monday",
            status: "active",
            dailyReminderTime: "19:00",
            tacticLoadPreference: "balanced",
            reentryCount: 0,
            currentWeek: 1,
            totalWeeks,
            weeklyPlans,
            taskInstances,
            dailyCheckIns: [],
            weeklyReviews: [],
            scoreboard,
          },
        },
      ],
      visionBoards: [],
      achievements: [],
      reflections: [],
      eventLog: [],
      syncOutbox: [],
      appPreferences: {
        allowLocalAnalytics: true,
        enableInAppReminders: true,
        enableBrowserNotifications: false,
        keepLocalOutbox: true,
        preferredReminderHour: 19,
      },
      subscription: null,
      entitlements: [],
      onboardingCompleted: true,
      isHydratedFromDemo: false,
    };

    localStorage.setItem("visionboard_user_data", JSON.stringify(data));
    localStorage.setItem("latest_12_week_goal_id", goalId);
    localStorage.setItem("latest_12_week_system_goal_id", goalId);
    localStorage.setItem("selected_focus_area", "Personal Growth");
    localStorage.removeItem("backend_goal_links");
    localStorage.removeItem("backend_plan_links");
    window.dispatchEvent(new CustomEvent("visionboard:user-data-updated"));
  });
}

/**
 * Capture mode (Req 1.2, 1.7): chụp baseline cho mọi màn hình ở cả hai viewport.
 * Nếu BẤT KỲ lần chụp nào thất bại → không đánh dấu hoàn tất, in lỗi kèm screen + viewport, thoát non-zero.
 */
async function runCapture(screens) {
  await mkdir(OUTPUT_DIR, { recursive: true });

  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch (error) {
    console.error(
      "[baseline] Không import được `playwright`. Cài dependency có sẵn của repo trước khi chạy capture.",
    );
    console.error(`[baseline] Chi tiết: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
    return;
  }

  const failures = [];
  let browser;

  try {
    log(`Base URL: ${BASE_URL}`);
    log(`Output:   ${OUTPUT_DIR}`);
    browser = await chromium.launch({ headless: true });

    // Seed localStorage một lần trên origin của dev server.
    const seedContext = await browser.newContext();
    const seedPage = await seedContext.newPage();
    try {
      await seedPage.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 60_000 });
      await seedLocalStorage(seedPage);
    } catch (error) {
      console.error(
        `[baseline] Không seed được dữ liệu tại ${BASE_URL}. Dev server có đang chạy không? (npm run dev)`,
      );
      console.error(`[baseline] Chi tiết: ${error instanceof Error ? error.message : String(error)}`);
      process.exitCode = 1;
      return;
    }
    const storageState = await seedContext.storageState();
    await seedContext.close();

    for (const screen of screens) {
      for (const viewport of VIEWPORTS) {
        const filePath = screenshotPathFor(screen.id, viewport.name);
        const context = await browser.newContext({
          storageState,
          viewport: { width: viewport.width, height: viewport.height },
          deviceScaleFactor: 1,
        });
        const page = await context.newPage();
        try {
          const url = `${BASE_URL}${screen.route}`;
          log(`Capturing ${screen.id} @ ${viewport.name} (${viewport.width}x${viewport.height}) → ${url}`);
          const response = await page.goto(url, { waitUntil: "networkidle", timeout: 60_000 });
          if (response && response.status() >= 400) {
            throw new Error(`HTTP ${response.status()} khi mở ${url}`);
          }
          await page.waitForTimeout(800);

          const errorOverlay = await page.evaluate(() =>
            Boolean(
              document.querySelector(
                "[data-nextjs-dialog], .vite-error-overlay, #vite-error-overlay, #webpack-dev-server-client-overlay",
              ),
            ),
          );
          if (errorOverlay) {
            throw new Error("Trang hiển thị error overlay (framework/runtime error)");
          }

          const bodyTextLength = await page.evaluate(() => document.body?.innerText?.trim().length ?? 0);
          if (bodyTextLength < 40) {
            throw new Error(`Trang gần như trống (bodyTextLength=${bodyTextLength}), có thể chưa render`);
          }

          await page.screenshot({ path: filePath, fullPage: true });
          log(`  saved → ${filePath}`);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(
            `[baseline] screenshot capture FAILED: screen="${screen.id}" viewport="${viewport.name}" — ${message}`,
          );
          failures.push({ screen: screen.id, viewport: viewport.name, message });
        } finally {
          await context.close();
        }
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[baseline] Lỗi không mong đợi trong quá trình capture: ${message}`);
    failures.push({ screen: "*", viewport: "*", message });
  } finally {
    if (browser) await browser.close().catch(() => undefined);
  }

  if (failures.length > 0) {
    console.error(
      `[baseline] KHÔNG hoàn tất — ${failures.length} lần chụp thất bại (Requirement 1.7). Chi tiết:`,
    );
    for (const failure of failures) {
      console.error(`[baseline]   screen="${failure.screen}" viewport="${failure.viewport}": ${failure.message}`);
    }
    process.exitCode = 1;
    return;
  }

  log(`Hoàn tất — đã chụp baseline cho ${screens.length} màn hình ở cả Desktop (1440x900) và Mobile (390x844).`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // `--output` (nếu có) override cả default lẫn env BASELINE_OUTPUT_DIR.
  if (args.output) {
    OUTPUT_DIR = path.resolve(args.output);
  }

  let screens;
  try {
    screens = resolveScreens(args.screen);
  } catch (error) {
    console.error(`[baseline] ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
    return;
  }

  if (args.mode === "check") {
    await runCheck(screens);
    return;
  }
  if (args.mode === "capture") {
    await runCapture(screens);
    return;
  }

  console.error(`[baseline] Unknown mode "${args.mode}". Dùng --mode capture hoặc --mode check.`);
  process.exitCode = 1;
}

main().catch((error) => {
  console.error(`[baseline] FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
