#!/usr/bin/env node

/**
 * Visual UX/UI QA screenshot suite
 * --------------------------------------------------
 * Captures the core UX surfaces (Dashboard, SMART review, Feasibility result,
 * 12-week setup review, 12-week system tabs) at desktop + mobile viewports for
 * manual visual review after every UI polish.
 *
 * Why this exists:
 *   - smoke-core-quality.mjs proves the local-first loop works semantically.
 *   - visual-core-flow-qa.mjs runs the *full* signup wizard against a real URL
 *     and aborts on layout overflow — useful as a gate, but slow to iterate.
 *   - This script seeds deterministic state directly in localStorage, navigates
 *     to each surface, and saves a screenshot per viewport. No pixel diff, no
 *     backend, no payment, no login.
 *
 * Output: artifacts/visual-ux-ui/<timestamp>/NN-<slug>-<viewport>.png + qa-report.json
 *
 * Configuration:
 *   UX_UI_QA_URL          base URL (default http://localhost:5173)
 *   UX_UI_QA_OUTPUT_DIR   override output dir
 *   UX_UI_QA_SESSION      browser session name (default ux-ui-qa-<timestamp>)
 *
 * The script reuses the agent-browser pattern shared by the other scripts in
 * this folder — no new dependency is added.
 */

import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_URL = (process.env.UX_UI_QA_URL ?? "http://localhost:5173").replace(/\/$/, "");
const TIMESTAMP = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const OUTPUT_DIR = path.resolve(process.env.UX_UI_QA_OUTPUT_DIR ?? `artifacts/visual-ux-ui/${TIMESTAMP}`);
const SESSION = process.env.UX_UI_QA_SESSION ?? `ux-ui-qa-${TIMESTAMP}`;

function parseViewportEnv(name, fallback) {
  const raw = process.env[name];
  if (!raw) return fallback;

  const match = raw.match(/^(\d+)x(\d+)$/i);
  if (!match) {
    console.warn(`[ux-ui-qa] WARN ${name} must use WIDTHxHEIGHT format; using ${fallback.width}x${fallback.height}.`);
    return fallback;
  }

  return {
    ...fallback,
    width: Number(match[1]),
    height: Number(match[2]),
  };
}

const VIEWPORTS = {
  desktop: parseViewportEnv("UX_UI_QA_DESKTOP_VIEWPORT", { name: "desktop", width: 1440, height: 1000 }),
  mobile: parseViewportEnv("UX_UI_QA_MOBILE_VIEWPORT", { name: "mobile", width: 390, height: 844 }),
};
const ACTION_VIEWPORT = VIEWPORTS.desktop;

const report = {
  baseUrl: BASE_URL,
  outputDir: OUTPUT_DIR,
  session: SESSION,
  generatedAt: new Date().toISOString(),
  checkpoints: [],
  warnings: [],
};

function log(message) {
  console.log(`[ux-ui-qa] ${message}`);
}

function warn(message) {
  console.warn(`[ux-ui-qa] WARN ${message}`);
  report.warnings.push(message);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function killProcessTree(child) {
  if (!child.pid) return;
  if (process.platform === "win32") {
    spawn("taskkill.exe", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    return;
  }
  child.kill("SIGTERM");
}

function quoteCmdArg(value) {
  return `"${String(value).replace(/"/g, '\\"')}"`;
}

function runAgentBrowser(args, { input, timeoutMs = 60_000 } = {}) {
  return new Promise((resolve, reject) => {
    const command = process.platform === "win32" ? "cmd.exe" : "npx";
    const commandArgs =
      process.platform === "win32"
        ? [
            "/d",
            "/s",
            "/c",
            ["npx.cmd", "agent-browser", "--session", quoteCmdArg(SESSION), ...args.map(quoteCmdArg)].join(" "),
          ]
        : ["agent-browser", "--session", SESSION, ...args];
    const child = spawn(command, commandArgs, {
      cwd: process.cwd(),
      stdio: ["pipe", "pipe", "pipe"],
      windowsVerbatimArguments: process.platform === "win32",
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const settle = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      callback(value);
    };

    const timeout = setTimeout(() => {
      killProcessTree(child);
      settle(reject, new Error(`agent-browser ${args.join(" ")} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => settle(reject, error));

    const finish = (code) => {
      if (code !== 0) {
        settle(reject, new Error(`agent-browser ${args.join(" ")} failed with code ${code}\n${stderr || stdout}`));
        return;
      }
      settle(resolve, { stdout, stderr });
    };

    child.on("exit", (code) => setTimeout(() => finish(code), 25));
    child.on("close", (code) => finish(code));

    if (input) child.stdin.write(input);
    child.stdin.end();
  });
}

function parseEvalResult(output) {
  const value = output.trim();
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

async function browserEval(source, options) {
  const result = await runAgentBrowser(["eval", "--stdin"], { ...options, input: source });
  return parseEvalResult(result.stdout);
}

async function setViewport(viewport) {
  await runAgentBrowser(["set", "viewport", String(viewport.width), String(viewport.height)], { timeoutMs: 45_000 });
}

async function openPage(pathOrUrl) {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${BASE_URL}${pathOrUrl}`;
  log(`Opening ${url}`);
  await runAgentBrowser(["open", url], { timeoutMs: 90_000 });
  await runAgentBrowser(["wait", "--load", "networkidle"], { timeoutMs: 90_000 });
}

async function clearBrowserStorage() {
  log("Clearing browser storage");
  await browserEval(`
    (async () => {
      localStorage.clear();
      sessionStorage.clear();
      for (const cookie of document.cookie.split(";")) {
        const name = cookie.split("=")[0]?.trim();
        if (name) {
          document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
        }
      }
      if (indexedDB.databases) {
        const databases = await indexedDB.databases();
        await Promise.all(
          databases
            .map((database) => database.name)
            .filter(Boolean)
            .map((name) => new Promise((resolve) => {
              const request = indexedDB.deleteDatabase(name);
              request.onsuccess = () => resolve(true);
              request.onerror = () => resolve(false);
              request.onblocked = () => resolve(false);
            })),
        );
      }
      return true;
    })()
  `);
}

async function pageAction(source) {
  const result = await browserEval(`
    (() => {
      const normalize = (value) =>
        String(value ?? "")
          .normalize("NFD")
          .replace(/[\\u0300-\\u036f]/g, "")
          .replace(/[đĐ]/g, (match) => (match === "đ" ? "d" : "D"))
          .replace(/\\s+/g, " ")
          .trim()
          .toLowerCase();
      const setNativeValue = (element, value) => {
        if (!element) throw new Error("Missing form element");
        const prototype =
          element instanceof HTMLTextAreaElement
            ? HTMLTextAreaElement.prototype
            : element instanceof HTMLInputElement
              ? HTMLInputElement.prototype
              : Object.getPrototypeOf(element);
        const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
        if (descriptor?.set) descriptor.set.call(element, value);
        else element.value = value;
        element.dispatchEvent(new Event("input", { bubbles: true }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
      };
      const fillSelector = (selector, value) => setNativeValue(document.querySelector(selector), value);
      const clickButtonByText = (texts) => {
        const candidates = (Array.isArray(texts) ? texts : [texts]).map(normalize);
        const elements = Array.from(document.querySelectorAll("button, [role='button'], a"));
        const element = elements.find((item) => {
          const text = normalize(item.innerText || item.textContent || item.getAttribute("aria-label"));
          return candidates.some((candidate) => text.includes(candidate));
        });
        if (!element) return false;
        if (element.disabled || element.getAttribute("aria-disabled") === "true") return false;
        element.scrollIntoView({ block: "center" });
        element.click();
        return true;
      };
      const clickTabByText = (text) => {
        const target = normalize(text);
        const tab = Array.from(document.querySelectorAll('[role="tab"]')).find((item) =>
          normalize(item.innerText || item.textContent || item.getAttribute("aria-label")).includes(target),
        );
        if (!tab) return false;
        tab.scrollIntoView({ block: "center" });
        tab.click();
        return true;
      };
      ${source}
    })()
  `);
  await sleep(300);
  return result;
}

async function clickButtonIfPresent(texts) {
  const ok = await pageAction(`return clickButtonByText(${JSON.stringify(texts)});`);
  return Boolean(ok);
}

async function clickTabByText(text) {
  return Boolean(await pageAction(`return clickTabByText(${JSON.stringify(text)});`));
}

async function waitFor(description, source, { timeoutMs = 30_000, intervalMs = 500 } = {}) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const value = await browserEval(`
      (() => { try { return Boolean(${source}); } catch { return false; } })()
    `);
    if (value) return true;
    await sleep(intervalMs);
  }
  warn(`Timed out waiting for ${description}`);
  return false;
}

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

async function saveReport() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(path.join(OUTPUT_DIR, "qa-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

async function captureCheckpoint(
  name,
  { route, viewports = ["desktop", "mobile"], beforeCapture, scrollY = 0 } = {},
) {
  log(`Capturing: ${name}`);
  const checkpoint = { name, route: route ?? null, viewports: [] };

  for (const viewportKey of viewports) {
    const viewport = VIEWPORTS[viewportKey];
    if (!viewport) {
      warn(`Unknown viewport key: ${viewportKey}`);
      continue;
    }
    await setViewport(viewport);
    if (beforeCapture) {
      try {
        await beforeCapture(viewport);
      } catch (error) {
        warn(`beforeCapture for ${name}/${viewport.name} failed: ${error?.message || error}`);
      }
    }
    await browserEval(`window.scrollTo(0, ${scrollY}); true`);
    await sleep(450);

    const meta = await browserEval(`
      (() => ({
        url: location.href,
        path: location.pathname,
        title: document.title,
        scrollHeight: document.documentElement.scrollHeight,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        bodyTextLength: (document.body.innerText || "").trim().length,
      }))()
    `);

    const fileName = `${String(report.checkpoints.length + 1).padStart(2, "0")}-${slugify(name)}-${viewport.name}.png`;
    const screenshotPath = path.join(OUTPUT_DIR, fileName);
    await runAgentBrowser(["screenshot", screenshotPath, "--full"], { timeoutMs: 60_000 });

    if ((meta?.bodyTextLength ?? 0) < 40) {
      warn(`${name}/${viewport.name} screenshot looks blank (bodyTextLength=${meta?.bodyTextLength}).`);
    }

    checkpoint.viewports.push({
      viewport: viewport.name,
      screenshot: screenshotPath,
      url: meta?.url,
      path: meta?.path,
      scrollHeight: meta?.scrollHeight,
    });
  }

  report.checkpoints.push(checkpoint);
  await setViewport(ACTION_VIEWPORT);
  await saveReport();
}

// ---------------------------------------------------------------------------
// Seed builders
// ---------------------------------------------------------------------------

const SMART_GOAL_TITLE = `QA visual goal ${TIMESTAMP}`;
const TACTIC_ONE = `QA visual core tactic ${TIMESTAMP}`;
const TACTIC_TWO = `QA visual review tactic ${TIMESTAMP}`;

/**
 * Seed a fully-formed local-first state:
 *   - SMART goal (pending) so /smart-goal-setup can land on the review step
 *   - Feasibility result (pending) so /feasibility shows the result page
 *   - 12-week system in user data so /12-week-system renders Today/Week/Progress/Settings
 *   - One open task for today + one overdue task (rescue/overdue state)
 */
async function seedFunnelState({ overdue = false } = {}) {
  log(`Seeding funnel state (overdue=${overdue})`);
  const result = await browserEval(`
    (() => {
      const pad = (value) => String(value).padStart(2, "0");
      const dateKey = (date) => date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
      const startOfWeek = (date) => {
        const next = new Date(date);
        next.setHours(0, 0, 0, 0);
        const delta = (next.getDay() - 1 + 7) % 7;
        next.setDate(next.getDate() - delta);
        return next;
      };
      const addDays = (date, days) => {
        const next = new Date(date);
        next.setDate(next.getDate() + days);
        return next;
      };
      const now = new Date();
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      const weekStart = startOfWeek(today);
      const todayOffset = Math.max(0, Math.min(6, Math.round((today.getTime() - weekStart.getTime()) / 86400000)));
      const goalId = "goal_uxqa_" + ${JSON.stringify(TIMESTAMP)};
      const tacticOneId = "tactic_uxqa_one";
      const tacticTwoId = "tactic_uxqa_two";
      const totalWeeks = 12;
      const overdue = ${JSON.stringify(Boolean(overdue))};

      const pendingSmartGoal = {
        id: "smart_uxqa",
        focus_area: "Personal Growth",
        specific: { goal_statement: ${JSON.stringify(SMART_GOAL_TITLE)} },
        measurable: { metric_name: "tuần review hoàn chỉnh", baseline: 0, target: 12, metric_unit: "tuần" },
        achievable: {
          weekly_hours: 5,
          required_skills: ["Lập kế hoạch tuần", "Review ngắn"],
          support_resources: ["Dashboard production", "Lịch cá nhân"],
        },
        relevant: {
          motivation_reason: "Cần một nhịp review đủ rõ để không bỏ dở mục tiêu dài hạn.",
          life_dimension_alignment: "Sự nghiệp",
        },
        time_bound: { target_weeks: 12, start_date: dateKey(today) },
      };

      const pendingFeasibilityResult = {
        resultType: "realistic",
        resultTitle: "Mục tiêu này đủ thực tế nếu giữ đúng độ nặng.",
        resultSummary: "Visual QA seed — đánh giá thực tế dựa trên dữ liệu giả định.",
        recommendation:
          "Trước khi tạo kế hoạch 12 tuần, hãy khóa ít nhất 2 khung giờ cố định trong tuần. Sau đó giữ nhịp rõ và review mỗi Chủ Nhật.",
        readinessScore: 18,
        adjustedScore: 18,
        wheelScore: 7,
        diagnosticScore: 22,
        maxDiagnosticScore: 28,
        axisScores: [],
        bottleneck: { axis: "time", label: "Thời gian thật", score: 4, action: "Khóa 2 khung giờ cố định." },
        planLoad: "balanced",
        weeklyCapacity: "medium",
        firstWeekGuidance: "Tuần 1 nên cân bằng: đủ rõ để tiến lên, đủ nhẹ để không mất nhịp.",
        scopeRecommendation: "Giữ một kết quả chính, 2-3 việc lặp lại và một buổi nhìn lại cố định.",
        smartGoalQualityLevel: "okay",
      };

      const pending12WeekSetupDraft = {
        templateId: "",
        goalType: "Personal Growth",
        vision12Week: ${JSON.stringify(SMART_GOAL_TITLE)},
        week12Outcome: "Complete a stable visual QA cycle.",
        lagMetricName: "completed review weeks",
        lagMetricTarget: "12",
        lagMetricUnit: "weeks",
        leadIndicators: [
          {
            id: tacticOneId,
            name: ${JSON.stringify(TACTIC_ONE)},
            target: "1",
            unit: "time/week",
            type: "core",
            cadence: "spread",
          },
          {
            id: tacticTwoId,
            name: ${JSON.stringify(TACTIC_TWO)},
            target: "1",
            unit: "time/week",
            type: "core",
            cadence: "spread",
          },
        ],
        startDate: dateKey(today),
        reviewDay: "Sunday",
        tacticLoadPreference: "balanced",
        week4Milestone: "Week 4 rhythm is visible.",
        week8Milestone: "Week 8 review habit is stable.",
        successEvidence: "The visual QA loop reaches review without backend.",
        dailyTimeBudget: "30",
        preferredDays: [todayOffset],
        personalConstraint: "time",
      };

      const weeklyPlans = Array.from({ length: totalWeeks }, (_, index) => ({
        weekNumber: index + 1,
        phaseName: index < 4 ? "Foundation" : index < 8 ? "Build" : "Finish",
        focus: index === 0 ? "Bắt đầu nhịp tuần 1." : "Giữ nhịp execution.",
        milestone: index === 11 ? "Hoàn thành chu kỳ visual QA." : "",
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

      const overdueDateKey = dateKey(addDays(today, -2));
      const taskInstances = [
        {
          id: "tw_task_1_uxqa_a",
          weekNumber: 1,
          scheduledDate: overdue ? overdueDateKey : dateKey(today),
          title: ${JSON.stringify(TACTIC_ONE)},
          leadIndicatorName: ${JSON.stringify(TACTIC_ONE)},
          isCore: true,
          completed: false,
          tacticId: tacticOneId,
        },
        {
          id: "tw_task_1_uxqa_b",
          weekNumber: 1,
          scheduledDate: dateKey(today),
          title: ${JSON.stringify(TACTIC_TWO)},
          leadIndicatorName: ${JSON.stringify(TACTIC_TWO)},
          isCore: true,
          completed: false,
          tacticId: tacticTwoId,
        },
      ];

      const data = {
        storageVersion: 5,
        userId: "ux-ui-qa",
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
            title: ${JSON.stringify(SMART_GOAL_TITLE)},
            description: "Visual QA seed — UX/UI screenshot suite.",
            deadline: dateKey(addDays(today, 83)),
            feasibilityResult: "realistic",
            readinessScore: 18,
            focusArea: "Personal Growth",
            tasks: [],
            createdAt: now.toISOString(),
            twelveWeekSystem: {
              goalType: "Personal Growth",
              vision12Week: ${JSON.stringify(SMART_GOAL_TITLE)},
              lagMetric: { name: "tuần review hoàn chỉnh", unit: "tuần", target: "12", currentValue: "0" },
              leadIndicators: [
                { id: tacticOneId, name: ${JSON.stringify(TACTIC_ONE)}, target: "1", unit: "lần/tuần", type: "core", priority: 1, schedule: [todayOffset] },
                { id: tacticTwoId, name: ${JSON.stringify(TACTIC_TWO)}, target: "1", unit: "lần/tuần", type: "core", priority: 2, schedule: [todayOffset] },
              ],
              milestones: {
                week4: "Hoàn thành 4 tuần đầu giữ nhịp.",
                week8: "Khóa được nhịp giữa chu kỳ.",
                week12: "Kết thúc chu kỳ visual QA đầy đủ.",
              },
              successEvidence: "Visual QA suite chạy trọn loop mà không cần backend.",
              reviewDay: "Sunday",
              week12Outcome: "Một chu kỳ visual QA đầy đủ.",
              startDate: dateKey(weekStart),
              endDate: dateKey(addDays(weekStart, 83)),
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Ho_Chi_Minh",
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
      localStorage.setItem("pending_smart_goal", JSON.stringify(pendingSmartGoal));
      localStorage.setItem("feasibilityActiveGoal", JSON.stringify(pendingSmartGoal));
      localStorage.setItem("pending_feasibility_result", JSON.stringify(pendingFeasibilityResult));
      localStorage.setItem("pending_12_week_setup_draft", JSON.stringify(pending12WeekSetupDraft));
      localStorage.setItem("selected_focus_area", "Personal Growth");
      localStorage.removeItem("backend_goal_links");
      localStorage.removeItem("backend_plan_links");
      window.dispatchEvent(new CustomEvent("visionboard:user-data-updated"));
      return { ok: true, goalId };
    })()
  `);
  if (!result?.ok) throw new Error(`Seed failed: ${JSON.stringify(result)}`);
}

/**
 * Seed an "empty" state: clean local-first new visitor.
 * No goals, no 12-week system. Used to capture empty Dashboard / no-plan state.
 */
async function seedEmptyState() {
  log("Seeding empty state");
  await browserEval(`
    (() => {
      localStorage.removeItem("visionboard_user_data");
      localStorage.removeItem("latest_12_week_goal_id");
      localStorage.removeItem("latest_12_week_system_goal_id");
      localStorage.removeItem("pending_smart_goal");
      localStorage.removeItem("pending_feasibility_result");
      localStorage.removeItem("pending_12_week_setup_draft");
      window.dispatchEvent(new CustomEvent("visionboard:user-data-updated"));
      return true;
    })()
  `);
}

// ---------------------------------------------------------------------------
// Helpers to advance multi-step shells to the review step
// ---------------------------------------------------------------------------

async function advanceShellToLastStep({ continueLabels = ["tiep tuc", "tiep theo"], maxSteps = 8 } = {}) {
  for (let i = 0; i < maxSteps; i += 1) {
    const advanced = await clickButtonIfPresent(continueLabels);
    if (!advanced) return i;
    await sleep(450);
  }
  return maxSteps;
}

// ---------------------------------------------------------------------------
// Capture flow
// ---------------------------------------------------------------------------

async function captureDashboardSignedIn() {
  await openPage("/");
  await waitFor("dashboard hydrated", "document.body.innerText.trim().length > 80", { timeoutMs: 30_000 });
  await captureCheckpoint("dashboard signed-in", { route: "/" });
}

async function captureDashboardEmpty() {
  await seedEmptyState();
  await openPage("/");
  await waitFor("empty dashboard", "document.body.innerText.trim().length > 60", { timeoutMs: 20_000 });
  await captureCheckpoint("dashboard empty no-plan", { route: "/" });
}

async function captureSmartReview() {
  await openPage("/smart-goal-setup");
  const ok = await waitFor(
    "SMART setup form",
    `document.querySelector('#smart-specific') || document.body.innerText.includes('Viết mục tiêu')`,
  );
  if (!ok) {
    warn("SMART setup did not render — capturing whatever is on screen");
  } else {
    // Try advancing to the last step where ReviewStep renders.
    await advanceShellToLastStep({ continueLabels: ["tiep theo", "tiep tuc"], maxSteps: 7 });
  }
  await captureCheckpoint("smart goal review", { route: "/smart-goal-setup" });
}

async function captureFeasibilityResult() {
  await seedFunnelState();
  await openPage("/feasibility");
  const onResult = await waitFor(
    "feasibility result",
    `document.querySelector('#feasibility-result-title') || document.body.innerText.includes('Kết quả đánh giá khả thi')`,
    { timeoutMs: 15_000 },
  );
  if (!onResult) {
    warn("Feasibility result did not render directly — page may be on the questionnaire.");
  }
  await captureCheckpoint("feasibility result", { route: "/feasibility" });
}

async function capture12WeekSetupReview() {
  await openPage("/12-week-setup");
  await waitFor("12-week setup hydrated", `document.body.innerText.includes('Bước')`, { timeoutMs: 20_000 });
  await advanceShellToLastStep({ continueLabels: ["tiep tuc"], maxSteps: 5 });
  await captureCheckpoint("12-week setup review", { route: "/12-week-setup" });
}

async function captureTwelveWeekTab(tabKey, label, viewports = ["desktop", "mobile"]) {
  const tabReadyChecks = {
    today: `document.querySelector('[data-tour-id="system-today-queue"]') || document.body.innerText.includes('Hàng việc hôm nay')`,
    week: `document.querySelector('[data-testid="wam-section-score"]') || document.body.innerText.includes('Đã giữ')`,
    progress: `document.querySelector('[data-testid="progress-trend-hero"]')`,
    settings: `document.querySelector('[data-testid="weekly-time-block-chip"]') || document.body.innerText.includes('Lịch tuần tham chiếu') || document.body.innerText.includes('Cài đặt chu kỳ')`,
  };

  await openPage(`/12-week-system?tab=${tabKey}`);
  await waitFor(
    `12-week system ${tabKey}`,
    tabReadyChecks[tabKey] ?? `document.querySelector('[role="tablist"]')`,
    { timeoutMs: 30_000 },
  );

  if (tabKey === "today") {
    const switched = await clickTabByText(label);
    if (!switched) warn(`Could not click tab "${label}" — capturing direct URL state instead.`);
    await sleep(500);
  }

  await captureCheckpoint(`12-week system ${tabKey}`, {
    route: `/12-week-system?tab=${tabKey}`,
    viewports,
  });
}

async function captureTwelveWeekRescueOverdue() {
  await seedFunnelState({ overdue: true });
  await openPage("/12-week-system");
  await waitFor(
    "12-week system Today",
    `document.querySelector('[data-tour-id="system-today-queue"]') || document.body.innerText.includes('Hàng việc hôm nay')`,
    { timeoutMs: 30_000 },
  );
  await clickTabByText("hom nay");
  await sleep(600);
  await captureCheckpoint("12-week today rescue overdue", { route: "/12-week-system" });
  // restore default seed for any later checkpoints
  await seedFunnelState({ overdue: false });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  log(`Target: ${BASE_URL}`);
  log(`Output: ${OUTPUT_DIR}`);
  log(`Session: ${SESSION}`);

  try {
    await runAgentBrowser(["close"], { timeoutMs: 30_000 }).catch(() => undefined);
    await openPage("/");
    await setViewport(ACTION_VIEWPORT);
    await clearBrowserStorage();

    // 1. Empty state first (must be captured before seeding).
    await captureDashboardEmpty();

    // 2. Seed funnel state for the rest of the captures.
    await openPage("/");
    await seedFunnelState();
    await openPage("/");
    await waitFor("seeded dashboard", "document.body.innerText.trim().length > 80", { timeoutMs: 20_000 });
    await captureDashboardSignedIn();

    // 3. Funnel review surfaces.
    await captureSmartReview();
    await captureFeasibilityResult();
    await capture12WeekSetupReview();

    // 4. 12-week system tabs.
    await captureTwelveWeekTab("today", "hom nay", ["desktop", "mobile"]);
    await captureTwelveWeekTab("week", "tuan", ["desktop"]);
    await captureTwelveWeekTab("progress", "tien do", ["desktop"]);
    await captureTwelveWeekTab("settings", "cai dat", ["desktop"]);

    // 5. Overdue / rescue state.
    await captureTwelveWeekRescueOverdue();

    report.completedAt = new Date().toISOString();
    report.status = report.warnings.length > 0 ? "passed-with-warnings" : "passed";
    await saveReport();
    log(`Done. Report: ${path.join(OUTPUT_DIR, "qa-report.json")}`);
    log(`Screenshots: ${OUTPUT_DIR}`);
    if (report.warnings.length > 0) {
      log(`Warnings: ${report.warnings.length} (see report)`);
    }
  } catch (error) {
    report.completedAt = new Date().toISOString();
    report.status = "failed";
    report.error = error instanceof Error ? error.message : String(error);
    await saveReport().catch(() => undefined);
    throw error;
  } finally {
    await clearBrowserStorage().catch(() => undefined);
    await runAgentBrowser(["close"], { timeoutMs: 30_000 }).catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(`[ux-ui-qa] FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
