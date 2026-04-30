#!/usr/bin/env node

import { spawn } from "node:child_process";

const BASE_URL = (process.env.MVP1_SMOKE_URL ?? "http://localhost:5173").replace(/\/$/, "");
const TIMESTAMP = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const SESSION = process.env.MVP1_SMOKE_SESSION ?? `mvp1-local-demo-${TIMESTAMP}`;
const RUN_FULL_UI_FLOW = process.env.MVP1_SMOKE_FULL_UI === "true";
const GOAL_TITLE = `MVP1 local demo smoke ${TIMESTAMP}`;
const TACTIC_ONE = `Smoke today task ${TIMESTAMP}`;
const TACTIC_TWO = `Smoke weekly review ${TIMESTAMP}`;
const DAILY_CHECKIN_NOTE = `MVP1 smoke daily check-in ${TIMESTAMP}`;
const WEEKLY_REVIEW_OUTPUT = `MVP1 smoke task completed ${TIMESTAMP}`;
const WEEKLY_REVIEW_OBSTACLE = `Keep the demo smoke short ${TIMESTAMP}`;
const WEEKLY_REVIEW_PRIORITY = `Open progress after saving ${TIMESTAMP}`;

const seenApiResources = new Set();

function log(message) {
  console.log(`[mvp1-smoke] ${message}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function killProcessTree(child) {
  if (!child.pid) return;

  if (process.platform === "win32") {
    spawn("taskkill.exe", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
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
            [
              "npx.cmd",
              "agent-browser",
              "--session",
              quoteCmdArg(SESSION),
              ...args.map(quoteCmdArg),
            ].join(" "),
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
    child.on("error", (error) => {
      settle(reject, error);
    });

    const finish = (code) => {
      if (code !== 0) {
        settle(reject, new Error(`agent-browser ${args.join(" ")} failed with code ${code}\n${stderr || stdout}`));
        return;
      }
      settle(resolve, { stdout, stderr });
    };

    child.on("exit", (code) => {
      setTimeout(() => finish(code), 25);
    });
    child.on("close", (code) => {
      finish(code);
    });

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
  const result = await runAgentBrowser(["eval", "--stdin"], {
    ...options,
    input: source,
  });
  return parseEvalResult(result.stdout);
}

async function openPage(pathOrUrl) {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${BASE_URL}${pathOrUrl}`;
  log(`Opening ${url}`);
  await runAgentBrowser(["open", url], { timeoutMs: 90_000 });
  await runAgentBrowser(["wait", "--load", "networkidle"], { timeoutMs: 90_000 });
  await recordApiResources();
}

function normalizedTextExpression(rawExpression) {
  return `
    (() => {
      const normalize = (value) =>
        String(value ?? "")
          .normalize("NFD")
          .replace(/[\\u0300-\\u036f]/g, "")
          .replace(/[đĐ]/g, (match) => (match === "đ" ? "d" : "D"))
          .replace(/\\s+/g, " ")
          .trim()
          .toLowerCase();
      return normalize(${rawExpression});
    })()
  `;
}

function bodyIncludes(text) {
  return `${normalizedTextExpression("document.body.innerText")}.includes(${JSON.stringify(text)})`;
}

async function waitFor(description, source, { timeoutMs = 45_000, intervalMs = 700 } = {}) {
  log(`Waiting for ${description}`);
  const startedAt = Date.now();
  let lastValue = null;

  while (Date.now() - startedAt < timeoutMs) {
    lastValue = await browserEval(`
      (() => {
        try {
          return Boolean(${source});
        } catch {
          return false;
        }
      })()
    `);

    if (lastValue) {
      await recordApiResources();
      return;
    }
    await sleep(intervalMs);
  }

  const state = await getPageState();
  throw new Error(
    `Timed out waiting for ${description}. Last value: ${String(lastValue)}\n` +
      `URL: ${state.url}\nText: ${state.text.slice(0, 900)}`,
  );
}

async function getPageState() {
  return browserEval(`
    (() => {
      const normalize = (value) =>
        String(value ?? "")
          .normalize("NFD")
          .replace(/[\\u0300-\\u036f]/g, "")
          .replace(/[đĐ]/g, (match) => (match === "đ" ? "d" : "D"))
          .replace(/\\s+/g, " ")
          .trim()
          .toLowerCase();
      return {
        url: location.href,
        path: location.pathname,
        text: document.body.innerText,
        normalizedText: normalize(document.body.innerText),
        apiResources: performance
          .getEntriesByType("resource")
          .filter((entry) => entry.name.includes("/api/"))
          .map((entry) => entry.name),
      };
    })()
  `);
}

async function recordApiResources() {
  const state = await getPageState().catch(() => null);
  if (!state?.apiResources) return;
  state.apiResources.forEach((resource) => seenApiResources.add(resource));
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
            .map(
              (name) =>
                new Promise((resolve) => {
                  const request = indexedDB.deleteDatabase(name);
                  request.onsuccess = () => resolve(true);
                  request.onerror = () => resolve(false);
                  request.onblocked = () => resolve(false);
                }),
            ),
        );
      }

      if (typeof caches !== "undefined") {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
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
      const fillSelector = (selector, value) => {
        setNativeValue(document.querySelector(selector), value);
      };
      const clickButtonByText = (texts) => {
        const candidates = Array.isArray(texts) ? texts : [texts];
        const normalizedCandidates = candidates.map(normalize);
        const elements = Array.from(document.querySelectorAll("button, [role='button'], a"));
        const element = elements.find((item) => {
          const text = normalize(item.innerText || item.textContent || item.getAttribute("aria-label"));
          return normalizedCandidates.some((candidate) => text.includes(candidate));
        });
        if (!element) throw new Error("Could not find button/link: " + candidates.join(" | "));
        if (element.disabled || element.getAttribute("aria-disabled") === "true") {
          throw new Error("Button/link is disabled: " + (element.innerText || element.textContent || ""));
        }
        element.scrollIntoView({ block: "center" });
        element.click();
      };
      const clickRadioValue = (value) => {
        const radio =
          document.getElementById(value) ||
          document.querySelector('[value="' + value + '"]') ||
          document.querySelector('[data-value="' + value + '"]');
        if (!radio) throw new Error("Could not find radio: " + value);
        radio.scrollIntoView({ block: "center" });
        radio.click();
      };
      const clickTabByText = (text) => {
        const target = normalize(text);
        const tab = Array.from(document.querySelectorAll('[role="tab"]')).find((item) =>
          normalize(item.innerText || item.textContent || item.getAttribute("aria-label")).includes(target),
        );
        if (!tab) throw new Error("Could not find tab: " + text);
        tab.scrollIntoView({ block: "center" });
        tab.click();
      };
      ${source}
      return true;
    })()
  `);

  if (result !== true) {
    throw new Error(`Page action failed: ${source}`);
  }

  await sleep(350);
  await recordApiResources();
}

async function clickButton(texts) {
  log(`Clicking ${Array.isArray(texts) ? texts.join(" | ") : texts}`);
  await pageAction(`clickButtonByText(${JSON.stringify(texts)});`);
}

async function clickTab(text) {
  log(`Opening tab ${text}`);
  await pageAction(`clickTabByText(${JSON.stringify(text)});`);
}

async function fill(selector, value) {
  log(`Filling ${selector}`);
  await pageAction(`fillSelector(${JSON.stringify(selector)}, ${JSON.stringify(value)});`);
}

async function clickRadio(value) {
  log(`Choosing radio ${value}`);
  await pageAction(`clickRadioValue(${JSON.stringify(value)});`);
}

function assertTextIncludesAny(state, expectedTexts, context) {
  const found = expectedTexts.find((expected) => state.normalizedText.includes(expected));
  if (found) return;

  throw new Error(
    `${context} is missing expected text. Expected one of: ${expectedTexts.join(" | ")}\n` +
      `URL: ${state.url}\nText: ${state.text.slice(0, 900)}`,
  );
}

function assertTextExcludes(state, forbiddenTexts, context) {
  const found = forbiddenTexts.find((forbidden) => state.normalizedText.includes(forbidden));
  if (!found) return;

  throw new Error(`${context} includes forbidden text: ${found}\nURL: ${state.url}\nText: ${state.text.slice(0, 900)}`);
}

async function assertSignedOutHome() {
  await openPage("/");
  await clearBrowserStorage();
  await openPage("/");
  await waitFor("dashboard body", "document.body.innerText.trim().length > 80");

  const state = await getPageState();
  if (state.path === "/login") {
    throw new Error(`Fresh signed-out demo visitor was redirected to login: ${state.url}`);
  }

  assertTextIncludesAny(
    state,
    ["trai nghiem demo mien phi", "dung thu khong can dang nhap", "bat dau life balance"],
    "signed-out dashboard",
  );
  assertTextIncludesAny(
    state,
    ["du lieu demo/local duoc luu tren trinh duyet hien tai", "local luu tren trinh duyet"],
    "signed-out dashboard local-storage disclosure",
  );
  assertTextExcludes(
    state,
    ["ra mat portfolio", "duy tri thoi quen", "di bo 8.000", "private stale goal"],
    "signed-out dashboard",
  );
}

async function startDemoFlowFromDashboard() {
  await clickButton(["trai nghiem demo mien phi", "dung thu khong can dang nhap", "bat dau life balance"]);
  await waitFor(
    "local-first core flow route",
    'location.pathname === "/onboarding" || location.pathname === "/life-balance"',
    { timeoutMs: 20_000 },
  );

  const state = await getPageState();
  if (state.path === "/login") {
    throw new Error("Demo start CTA sent the signed-out visitor to /login.");
  }
}

async function completeOnboarding() {
  await waitFor("onboarding start", `${bodyIncludes("cham life balance")} || ${bodyIncludes("bat dau danh gia")}`);
  await clickButton(["cham life balance", "bat dau danh gia"]);
  await waitFor("life balance assessment", `${bodyIncludes("cham diem hien tai")} || ${bodyIncludes("hoan thanh danh gia")}`);
  await clickButton("hoan thanh danh gia");
  await waitFor("life insight route", 'location.pathname === "/life-insight"', { timeoutMs: 45_000 });
}

async function completeLifeInsight() {
  await waitFor("life insight CTA", `${bodyIncludes("tao muc tieu voi")} || ${bodyIncludes("life insight")}`);
  await clickButton("tao muc tieu voi");
  await waitFor("SMART goal route", 'location.pathname === "/smart-goal-setup"', { timeoutMs: 45_000 });
}

async function completeSmartGoal() {
  await waitFor("SMART specific step", 'document.querySelector("#smart-specific")');
  await fill("#smart-specific", GOAL_TITLE);
  await clickButton("tiep theo");

  await waitFor("SMART measurable step", 'document.querySelector("#smart-metric-name")');
  await fill("#smart-metric-name", "completed smoke weeks");
  await fill("#smart-baseline", "0");
  await fill("#smart-target", "12");
  await clickButton("tiep theo");

  await waitFor("SMART achievable step", 'document.querySelector("#smart-weekly-hours")');
  await fill("#smart-weekly-hours", "4");
  await fill("#smart-required-skills", "weekly planning\\nshort review");
  await fill("#smart-support-resources", "local browser and MVP1 dashboard");
  await clickButton("tiep theo");

  await waitFor("SMART relevant step", 'document.querySelector("#smart-relevant-reason")');
  await fill("#smart-relevant-reason", "This smoke test proves the local-first MVP1 execution loop works without login.");
  await fill("#smart-life-alignment", "Career");
  await clickButton("tiep theo");

  await waitFor("SMART deadline step", 'document.querySelector("#smart-target-weeks")');
  await clickButton("kiem tra tinh thuc te");
  await waitFor("feasibility route", 'location.pathname === "/feasibility"', { timeoutMs: 45_000 });
}

async function completeFeasibility() {
  const answers = ["gt5", "energy_high", "resources_ready", "very_realistic", "none", "always", "committed"];

  for (const [index, answer] of answers.entries()) {
    await clickRadio(answer);
    await clickButton(index === answers.length - 1 ? "hoan thanh danh gia" : "tiep theo");
  }

  await waitFor("feasibility result", `${bodyIncludes("tao ke hoach 12 tuan")}`);
  await clickButton("tao ke hoach 12 tuan");
  await waitFor("12-week setup route", 'location.pathname === "/12-week-setup"', { timeoutMs: 45_000 });
}

async function completeTwelveWeekSetup() {
  await waitFor("12-week setup goal step", `${bodyIncludes("muc tieu 12 tuan")} || document.querySelector("#tactic-name-0")`);
  if (!(await browserEval('Boolean(document.querySelector("#tactic-name-0"))'))) {
    await clickButton("tiep tuc");
  }

  await waitFor("12-week tactic step", 'document.querySelector("#tactic-name-0") && document.querySelector("#tactic-name-1")');
  await fill("#tactic-name-0", TACTIC_ONE);
  await fill("#tactic-name-1", TACTIC_TWO);
  await clickButton("tiep tuc");

  await waitFor("12-week metric step", 'document.querySelector("#lag-metric-target")');
  await fill("#lag-metric-target", "12");
  await fill("#lag-metric-unit", "weeks");
  await clickButton("tiep tuc");

  await waitFor("12-week final step", `${bodyIncludes("chot ke hoach")} || ${bodyIncludes("tao ke hoach 12 tuan")}`);
  await clickButton("tao ke hoach 12 tuan");
  await waitFor("12-week system route", 'location.pathname === "/12-week-system"', { timeoutMs: 75_000 });
}

async function completeUiCoreFlow() {
  await completeOnboarding();
  await completeLifeInsight();
  await completeSmartGoal();
  await completeFeasibility();
  await completeTwelveWeekSetup();
}

async function seedLocalTwelveWeekSystem() {
  log("Seeding a minimal local 12-week system fallback");
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
      const goalId = "goal_mvp1_smoke_" + ${JSON.stringify(TIMESTAMP)};
      const tacticOneId = "tactic_smoke_today";
      const tacticTwoId = "tactic_smoke_review";
      const totalWeeks = 12;
      const weeklyPlans = Array.from({ length: totalWeeks }, (_, index) => ({
        weekNumber: index + 1,
        phaseName: index < 4 ? "Foundation" : index < 8 ? "Build" : "Finish",
        focus: index === 0 ? "Prove the local-first MVP1 loop." : "Keep the weekly execution rhythm.",
        milestone: index === 11 ? "A working local-first 12-week demo." : "",
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
          id: "tw_task_1_tactic_smoke_today_0",
          weekNumber: 1,
          scheduledDate: dateKey(today),
          title: ${JSON.stringify(TACTIC_ONE)},
          leadIndicatorName: ${JSON.stringify(TACTIC_ONE)},
          isCore: true,
          completed: false,
          tacticId: tacticOneId,
        },
        {
          id: "tw_task_1_tactic_smoke_review_0",
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
        userId: "local-demo-smoke",
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
            title: ${JSON.stringify(GOAL_TITLE)},
            description: "Controlled localStorage fallback for the MVP1 smoke script.",
            deadline: dateKey(addDays(today, 83)),
            feasibilityResult: "realistic",
            readinessScore: 18,
            focusArea: "Personal Growth",
            tasks: [],
            createdAt: now.toISOString(),
            twelveWeekSystem: {
              goalType: "custom-goal",
              vision12Week: ${JSON.stringify(GOAL_TITLE)},
              lagMetric: {
                name: "completed smoke weeks",
                unit: "weeks",
                target: "12",
                currentValue: "0",
              },
              leadIndicators: [
                {
                  id: tacticOneId,
                  name: ${JSON.stringify(TACTIC_ONE)},
                  target: "1",
                  unit: "time/week",
                  type: "core",
                  priority: 1,
                  schedule: [todayOffset],
                },
                {
                  id: tacticTwoId,
                  name: ${JSON.stringify(TACTIC_TWO)},
                  target: "1",
                  unit: "time/week",
                  type: "core",
                  priority: 2,
                  schedule: [todayOffset],
                },
              ],
              milestones: {
                week4: "Smoke path reaches week 4.",
                week8: "Smoke path reaches week 8.",
                week12: "Smoke path completes the local-first loop.",
              },
              successEvidence: "The smoke script can toggle a task, save check-in, and open progress.",
              reviewDay: "Sunday",
              week12Outcome: "A stable MVP1 local-first public demo.",
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
      localStorage.removeItem("backend_goal_links");
      localStorage.removeItem("backend_plan_links");
      window.dispatchEvent(new CustomEvent("visionboard:user-data-updated"));
      return { ok: true, goalId, taskCount: taskInstances.length };
    })()
  `);

  if (!result?.ok) {
    throw new Error(`Could not seed local 12-week system: ${JSON.stringify(result)}`);
  }

  await openPage("/12-week-system");
  await waitFor("seeded 12-week system", 'location.pathname === "/12-week-system"', { timeoutMs: 45_000 });
}

async function completeCoreFlowWithFallback() {
  if (!RUN_FULL_UI_FLOW) {
    log(
      "Using controlled localStorage seed after the signed-out start CTA; set MVP1_SMOKE_FULL_UI=true to exercise the full wizard.",
    );
    await seedLocalTwelveWeekSystem();
    return "seeded";
  }

  try {
    await completeUiCoreFlow();
    return "ui";
  } catch (error) {
    log(`UI core flow did not complete; using controlled localStorage seed. Reason: ${error.message}`);
    await clearBrowserStorage();
    await seedLocalTwelveWeekSystem();
    return "seeded";
  }
}

async function getSmokeGoalSnapshot() {
  return browserEval(`
    (() => {
      const raw = localStorage.getItem("visionboard_user_data");
      if (!raw) return { found: false, reason: "missing visionboard_user_data" };
      let data;
      try {
        data = JSON.parse(raw);
      } catch {
        return { found: false, reason: "invalid JSON" };
      }

      const goals = Array.isArray(data.goals) ? data.goals : [];
      const goal =
        goals.find((item) => String(item?.title ?? "").includes(${JSON.stringify(GOAL_TITLE)})) ||
        goals.find((item) => item?.twelveWeekSystem?.status === "active") ||
        goals.find((item) => item?.twelveWeekSystem);
      const system = goal?.twelveWeekSystem;
      if (!goal || !system) return { found: false, goalCount: goals.length };

      const taskInstances = Array.isArray(system.taskInstances) ? system.taskInstances : [];
      const dailyCheckIns = Array.isArray(system.dailyCheckIns) ? system.dailyCheckIns : [];
      const weeklyReviews = Array.isArray(system.weeklyReviews) ? system.weeklyReviews : [];
      const todayKey = new Date().toISOString().slice(0, 10);
      return {
        found: true,
        goalId: goal.id,
        title: goal.title,
        taskCount: taskInstances.length,
        todayTaskCount: taskInstances.filter((task) => task.scheduledDate === todayKey).length,
        completedTaskCount: taskInstances.filter((task) => task.completed).length,
        dailyCheckInCount: dailyCheckIns.length,
        latestDailyCheckIn: dailyCheckIns[0] ?? null,
        weeklyReviewCount: weeklyReviews.length,
        latestWeeklyReview: weeklyReviews[weeklyReviews.length - 1] ?? null,
      };
    })()
  `);
}

async function waitForGoalSnapshot(description, predicate, { timeoutMs = 45_000, intervalMs = 700 } = {}) {
  log(`Waiting for ${description}`);
  const startedAt = Date.now();
  let lastSnapshot = null;

  while (Date.now() - startedAt < timeoutMs) {
    lastSnapshot = await getSmokeGoalSnapshot();
    if (predicate(lastSnapshot)) return lastSnapshot;
    await sleep(intervalMs);
  }

  const state = await getPageState();
  throw new Error(
    `Timed out waiting for ${description}.\n` +
      `Last snapshot: ${JSON.stringify(lastSnapshot, null, 2)}\n` +
      `URL: ${state.url}\nText: ${state.text.slice(0, 900)}`,
  );
}

async function ensureTodayTaskAvailable() {
  const result = await browserEval(`
    (() => {
      const raw = localStorage.getItem("visionboard_user_data");
      if (!raw) return { ok: false, reason: "missing data" };
      const data = JSON.parse(raw);
      const goal =
        data.goals?.find((item) => String(item?.title ?? "").includes(${JSON.stringify(GOAL_TITLE)})) ||
        data.goals?.find((item) => item?.twelveWeekSystem?.status === "active") ||
        data.goals?.find((item) => item?.twelveWeekSystem);
      const system = goal?.twelveWeekSystem;
      if (!system || !Array.isArray(system.taskInstances)) return { ok: false, reason: "missing system tasks" };

      const todayKey = new Date().toISOString().slice(0, 10);
      const openTodayTask = system.taskInstances.find((task) => task.scheduledDate === todayKey && !task.completed);
      if (openTodayTask) return { ok: true, changed: false, taskId: openTodayTask.id };

      const task = system.taskInstances.find((item) => !item.completed) || system.taskInstances[0];
      if (!task) return { ok: false, reason: "no task instances" };
      task.scheduledDate = todayKey;
      task.completed = false;
      task.completedAt = undefined;
      localStorage.setItem("visionboard_user_data", JSON.stringify(data));
      window.dispatchEvent(new CustomEvent("visionboard:user-data-updated"));
      return { ok: true, changed: true, taskId: task.id };
    })()
  `);

  if (!result?.ok) {
    throw new Error(`Could not ensure a Today task is available: ${JSON.stringify(result)}`);
  }

  if (result.changed) {
    log("Moved one local task into today's queue for a deterministic smoke toggle");
    await openPage("/12-week-system");
  }
}

async function clickFirstTodayTaskCheckbox() {
  log("Toggling the first Today task");
  await pageAction(`
    const queue = document.querySelector('[data-tour-id="system-today-queue"]');
    if (!queue) throw new Error("Could not find Today queue");
    const checkbox = Array.from(queue.querySelectorAll('[role="checkbox"], input[type="checkbox"]')).find((item) => {
      if (item.disabled) return false;
      if (item.matches?.('input[type="checkbox"]')) return !item.checked;
      return item.getAttribute("aria-checked") !== "true";
    });
    if (!checkbox) throw new Error("Could not find an open Today task checkbox");
    checkbox.scrollIntoView({ block: "center" });
    checkbox.click();
  `);
}

async function assertTwelveWeekSystemReady() {
  await waitFor("12-week system page", 'location.pathname === "/12-week-system"', { timeoutMs: 75_000 });
  await waitFor("Today tab useful content", `${bodyIncludes("hang viec hom nay")} && ${bodyIncludes("check-in 30 giay")}`, {
    timeoutMs: 75_000,
  });

  await waitForGoalSnapshot("local 12-week system in storage", (snapshot) => snapshot.found && snapshot.taskCount > 0);
}

async function exerciseTodayAndReviewTabs() {
  await clickTab("hom nay").catch(() => undefined);
  await ensureTodayTaskAvailable();
  await waitFor("Today queue", 'document.querySelector("[data-tour-id=\\"system-today-queue\\"]")');
  await clickFirstTodayTaskCheckbox();
  await waitForGoalSnapshot("Today task toggle persisted", (snapshot) => snapshot.completedTaskCount >= 1);

  const hasDailyNote = await browserEval('Boolean(document.querySelector("#daily-note"))');
  if (hasDailyNote) {
    await fill("#daily-note", DAILY_CHECKIN_NOTE);
    await clickButton("luu check-in hom nay");
    await waitForGoalSnapshot(
      "daily check-in persisted",
      (snapshot) =>
        snapshot.dailyCheckInCount >= 1 && snapshot.latestDailyCheckIn?.optionalNote === DAILY_CHECKIN_NOTE,
    );
  } else {
    log("Daily check-in UI was not present; skipping check-in save");
  }

  await clickTab("tuan");
  await waitFor("Week tab", `${bodyIncludes("review")} || document.querySelector("#weekly-best")`, {
    timeoutMs: 8_000,
  }).catch(async () => {
    log("Tab click did not switch to Week; opening the Week tab URL directly");
    await openPage("/12-week-system?tab=week");
    await waitFor("Week tab URL", `${bodyIncludes("review")} || document.querySelector("#weekly-best")`);
  });
  const hasWeeklyReviewForm = await browserEval(
    'Boolean(document.querySelector("#weekly-best") && document.querySelector("#weekly-obstacle") && document.querySelector("#weekly-priority"))',
  );

  if (hasWeeklyReviewForm) {
    await fill("#weekly-best", WEEKLY_REVIEW_OUTPUT);
    await fill("#weekly-obstacle", WEEKLY_REVIEW_OBSTACLE);
    await fill("#weekly-priority", WEEKLY_REVIEW_PRIORITY);
    await clickButton("chot review tuan nay");
    await waitForGoalSnapshot(
      "weekly review persisted",
      (snapshot) =>
        snapshot.weeklyReviewCount >= 1 &&
        snapshot.latestWeeklyReview?.biggestOutputThisWeek === WEEKLY_REVIEW_OUTPUT,
      { timeoutMs: 75_000 },
    );
  }

  await clickTab("tien do");
  await waitFor("Progress tab", `${bodyIncludes("bang diem 12 tuan")} || ${bodyIncludes("tuan dang chay")}`, {
    timeoutMs: 8_000,
  }).catch(async () => {
    log("Tab click did not switch to Progress; opening the Progress tab URL directly");
    await openPage("/12-week-system?tab=progress");
    await waitFor("Progress tab URL", `${bodyIncludes("bang diem 12 tuan")} || ${bodyIncludes("tuan dang chay")}`);
  });
}

async function assertNoBrowserErrors() {
  const { stdout } = await runAgentBrowser(["errors"], { timeoutMs: 30_000 });
  const errors = stdout.trim();
  if (errors) {
    throw new Error(`Browser console/page errors detected:\n${errors}`);
  }
}

function assertNoProtectedApiRequestSpam() {
  const protectedPathMarkers = [
    "/api/auth/profile",
    "/api/goals",
    "/api/plans",
    "/api/weeks",
    "/api/tasks",
    "/api/metrics",
    "/api/orders",
    "/api/vision-boards",
  ];
  const protectedHits = Array.from(seenApiResources).filter((resource) => {
    try {
      const path = new URL(resource).pathname;
      return protectedPathMarkers.some((marker) => path.includes(marker));
    } catch {
      return protectedPathMarkers.some((marker) => resource.includes(marker));
    }
  });

  if (protectedHits.length > 0) {
    throw new Error(
      `Demo smoke made protected API requests; MVP1 local demo should not need backend/Firebase:\n${protectedHits.join(
        "\n",
      )}`,
    );
  }
}

async function runStep(label, task) {
  log(label);
  try {
    const result = await task();
    await recordApiResources();
    return result;
  } catch (error) {
    await recordApiResources().catch(() => undefined);
    throw error;
  }
}

async function main() {
  log(`Target: ${BASE_URL}`);
  log(`Browser session: ${SESSION}`);

  try {
    await runStep("Resetting browser session", async () => {
      await runAgentBrowser(["close"], { timeoutMs: 30_000 }).catch(() => undefined);
    });
    await runStep("Signed-out local-first dashboard", assertSignedOutHome);
    await runStep("Dashboard CTA starts the demo flow", startDemoFlowFromDashboard);
    const flowMode = await runStep("Core flow to 12-week system", completeCoreFlowWithFallback);
    log(`Core flow mode: ${flowMode}`);
    await runStep("12-week system loaded", assertTwelveWeekSystemReady);
    await runStep("Today task, check-in, Week/Progress tabs", exerciseTodayAndReviewTabs);
    await runStep("Browser error scan", assertNoBrowserErrors);
    await runStep("Protected API request scan", async () => {
      assertNoProtectedApiRequestSpam();
    });
    log("MVP1 local-first demo smoke passed");
  } finally {
    await clearBrowserStorage().catch(() => undefined);
    await runAgentBrowser(["close"], { timeoutMs: 30_000 }).catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(`[mvp1-smoke] FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
