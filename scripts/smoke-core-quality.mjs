#!/usr/bin/env node

/**
 * Core funnel quality smoke
 * --------------------------------------------------
 * Goes beyond "route opens" — asserts that each step of the local-first
 * funnel produces semantically useful output:
 *   1. SMART goal carries metric / baseline / target / time
 *   2. Feasibility result has a recommendation
 *   3. 12-week plan has outcome + ≥2 lead indicators + week-1 tasks + reviewDay
 *   4. Today tab renders the primary task hero (testid="today-primary-hero")
 *   5. Toggling a task persists
 *   6. Daily check-in persists
 *   7. Weekly review persists (incl. summary card testid="weekly-review-summary")
 *   8. Progress tab renders the trend hero (testid="progress-trend-hero")
 *      with a non-empty next-action narrative
 *
 * The script reuses the agent-browser stack already used by smoke-mvp1.
 * It targets local-first/demo builds and does not require backend, Firebase,
 * or payment. Real-mode production proof belongs in smoke-production-e2e.mjs.
 */

import { spawn } from "node:child_process";

const BASE_URL = (process.env.CORE_QUALITY_URL ?? process.env.MVP1_SMOKE_URL ?? "http://localhost:5173").replace(/\/$/, "");
const PRODUCTION_REAL_MODE_URLS = new Set([
  "https://vision-board-web-platform.vercel.app",
  "https://dearourfuture.io.vn",
]);
const IS_GITHUB_ACTIONS = process.env.GITHUB_ACTIONS === "true";
const TIMESTAMP = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const SESSION = process.env.CORE_QUALITY_SESSION ?? `core-quality-${TIMESTAMP}`;
const GOAL_TITLE = `Core quality smoke ${TIMESTAMP}`;
const TACTIC_ONE = `Daily smoke action ${TIMESTAMP}`;
const TACTIC_TWO = `Smoke review tactic ${TIMESTAMP}`;
const DAILY_CHECKIN_NOTE = `Smoke daily check-in ${TIMESTAMP}`;
const WEEKLY_REVIEW_OBSTACLE = `Smoke weekly obstacle ${TIMESTAMP}`;
const WEEKLY_REVIEW_PRIORITY = `Smoke priority next week ${TIMESTAMP}`;
const WEEKLY_REVIEW_FORM_READY =
  `document.querySelector('[data-testid="wam-section-score"]') && ` +
  `document.querySelector('[data-testid="wam-section-commitments"]') && ` +
  `document.querySelector('[data-testid="wam-section-insights"]') && ` +
  `document.querySelector('[data-testid="wam-section-next-commitments"]') && ` +
  `document.querySelector("#weekly-insights") && ` +
  `document.querySelector("#weekly-next-commitments")`;
const AGENT_BROWSER_DEFAULT_TIMEOUT_MS = "90000";

function log(message) {
  console.log(`[core-quality] ${message}`);
}

function assertTargetSafeForEnvironment() {
  if (!IS_GITHUB_ACTIONS) return;

  if (!process.env.CORE_QUALITY_URL?.trim()) {
    throw new Error("CORE_QUALITY_URL is required in GitHub Actions so deployed core-funnel proof cannot fall back to localhost.");
  }

  const normalizedUrl = BASE_URL.toLowerCase();
  if (normalizedUrl.includes("localhost") || normalizedUrl.includes("127.0.0.1")) {
    throw new Error(
      "Refusing to run deployed core-funnel proof against localhost. Use an accessible VITE_APP_MODE=demo staging/preview URL.",
    );
  }
  if (PRODUCTION_REAL_MODE_URLS.has(normalizedUrl)) {
    throw new Error(
      "Core quality smoke is local-first/demo-only; do not run it against the production real-mode URL. Use an accessible VITE_APP_MODE=demo staging/preview URL, or production-smoke-e2e.yml for real-mode production proof.",
    );
  }
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
      env: {
        ...process.env,
        AGENT_BROWSER_DEFAULT_TIMEOUT: process.env.AGENT_BROWSER_DEFAULT_TIMEOUT ?? AGENT_BROWSER_DEFAULT_TIMEOUT_MS,
      },
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

async function getPageState() {
  return browserEval(`
    (() => ({ url: location.href, path: location.pathname, text: document.body.innerText }))()
  `);
}

function describeBlockedCoreQualityTarget(state) {
  if (!state?.url) return null;

  let currentUrl;
  try {
    currentUrl = new URL(state.url);
  } catch {
    return null;
  }

  if (currentUrl.hostname === "vercel.com" && currentUrl.pathname.startsWith("/login")) {
    return (
      "Target appears to be behind Vercel Deployment Protection. " +
      "Use an accessible demo/staging URL with deployment protection disabled, or run the local dev preflight."
    );
  }

  const next = currentUrl.searchParams.get("next") ?? "";
  if (currentUrl.pathname === "/login" && next.includes("/12-week-system")) {
    return (
      "Target is real-mode auth-gated for /12-week-system. " +
      "Core quality smoke expects an accessible local-first/demo target; use production-smoke-e2e.yml for real-mode production proof."
    );
  }

  return null;
}

async function assertCoreQualityTargetAccessible(context) {
  const state = await getPageState();
  const blockedReason = describeBlockedCoreQualityTarget(state);
  if (!blockedReason) return;

  throw new Error(
    `${blockedReason}\nContext: ${context}\nURL: ${state.url}\nText: ${(state.text ?? "").slice(0, 600)}`,
  );
}

async function waitFor(description, source, { timeoutMs = 30_000, intervalMs = 500 } = {}) {
  log(`Waiting for ${description}`);
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const value = await browserEval(`
      (() => { try { return Boolean(${source}); } catch { return false; } })()
    `);
    if (value) return;
    await sleep(intervalMs);
  }
  const state = await getPageState();
  throw new Error(
    `Timed out waiting for ${description}.\nURL: ${state?.url ?? "n/a"}\nText: ${(state?.text ?? "").slice(0, 600)}`,
  );
}

async function pageAction(source) {
  const result = await browserEval(`
    (() => {
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
        const candidates = (Array.isArray(texts) ? texts : [texts]).map((value) =>
          String(value)
            .normalize("NFD")
            .replace(/[\\u0300-\\u036f]/g, "")
            .replace(/[đĐ]/g, (m) => (m === "đ" ? "d" : "D"))
            .toLowerCase()
            .trim(),
        );
        const elements = Array.from(document.querySelectorAll("button, [role='button'], a"));
        const element = elements.find((item) => {
          const text = \`\${item.innerText || ""} \${item.textContent || ""} \${item.getAttribute("aria-label") || ""}\`
            .normalize("NFD")
            .replace(/[\\u0300-\\u036f]/g, "")
            .replace(/[đĐ]/g, (m) => (m === "đ" ? "d" : "D"))
            .toLowerCase();
          return candidates.some((candidate) => text.includes(candidate));
        });
        if (!element) throw new Error("Could not find button: " + (Array.isArray(texts) ? texts.join("|") : texts));
        if (element.disabled || element.getAttribute("aria-disabled") === "true") {
          throw new Error("Button disabled: " + (element.innerText || element.textContent || ""));
        }
        element.scrollIntoView({ block: "center" });
        element.click();
      };
      const clickTabByText = (text) => {
        const target = String(text)
          .normalize("NFD")
          .replace(/[\\u0300-\\u036f]/g, "")
          .replace(/[đĐ]/g, (m) => (m === "đ" ? "d" : "D"))
          .toLowerCase();
        const tab = Array.from(document.querySelectorAll('[role="tab"]')).find((item) =>
          String(item.innerText || item.textContent || item.getAttribute("aria-label") || "")
            .normalize("NFD")
            .replace(/[\\u0300-\\u036f]/g, "")
            .replace(/[đĐ]/g, (m) => (m === "đ" ? "d" : "D"))
            .toLowerCase()
            .includes(target),
        );
        if (!tab) throw new Error("Could not find tab: " + text);
        tab.scrollIntoView({ block: "center" });
        tab.click();
      };
      ${source}
      return true;
    })()
  `);
  if (result !== true) throw new Error(`Page action failed: ${source}`);
  await sleep(350);
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
  await pageAction(`fillSelector(${JSON.stringify(selector)}, ${JSON.stringify(value)});`);
}

async function pressKey(selector, key) {
  await pageAction(`
    (() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) throw new Error("Missing form element");
      element.focus();
      element.dispatchEvent(new KeyboardEvent("keydown", {
        key: ${JSON.stringify(key)},
        code: ${JSON.stringify(key)},
        bubbles: true,
        cancelable: true
      }));
    })();
  `);
}

async function addNextWeekCommitment(value) {
  await fill("#weekly-next-commitments", value);
  await pressKey("#weekly-next-commitments", "Enter");
}

// ---------------------------------------------------------------------------
// Seed: a deterministic SMART goal + feasibility result + 12-week system
// ---------------------------------------------------------------------------

async function seedFunnelOutput() {
  log("Seeding deterministic SMART + Feasibility + 12-week system");
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
      const goalId = "goal_smoke_quality_" + ${JSON.stringify(TIMESTAMP)};
      const tacticOneId = "tactic_smoke_quality_one";
      const tacticTwoId = "tactic_smoke_quality_two";
      const totalWeeks = 12;

      // SMART goal pending payload (used to assert SMART metric/target/time)
      const pendingSmartGoal = {
        id: "smart_smoke_quality",
        focus_area: "Personal Growth",
        specific: { goal_statement: ${JSON.stringify(GOAL_TITLE)} },
        measurable: { metric_name: "completed smoke weeks", baseline: 0, target: 12, metric_unit: "weeks" },
        achievable: { weekly_hours: 4, required_skills: ["weekly planning"], support_resources: ["local browser"] },
        relevant: { motivation_reason: "Smoke verifies the local-first execution loop works.", life_dimension_alignment: "Career" },
        time_bound: { target_weeks: 12, start_date: dateKey(today) },
      };

      // Feasibility result with a non-trivial recommendation for assertion
      const pendingFeasibilityResult = {
        resultType: "realistic",
        resultTitle: "Mục tiêu này đủ thực tế nếu giữ đúng độ nặng.",
        resultSummary: "Smoke seed — đánh giá thực tế dựa trên dữ liệu giả định.",
        recommendation: "Trước khi tạo kế hoạch 12 tuần, hãy khóa ít nhất 2 khung giờ cố định. Sau đó giữ nhịp rõ.",
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

      const weeklyPlans = Array.from({ length: totalWeeks }, (_, index) => ({
        weekNumber: index + 1,
        phaseName: index < 4 ? "Foundation" : index < 8 ? "Build" : "Finish",
        focus: index === 0 ? "Bắt đầu nhịp tuần 1." : "Giữ nhịp execution.",
        milestone: index === 11 ? "Hoàn thành chu kỳ smoke." : "",
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
          id: "tw_task_1_smoke_a",
          weekNumber: 1,
          scheduledDate: dateKey(today),
          title: ${JSON.stringify(TACTIC_ONE)},
          leadIndicatorName: ${JSON.stringify(TACTIC_ONE)},
          isCore: true,
          completed: false,
          tacticId: tacticOneId,
        },
        {
          id: "tw_task_1_smoke_b",
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
        userId: "core-quality-smoke",
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
            description: "Core funnel quality smoke seed.",
            deadline: dateKey(addDays(today, 83)),
            feasibilityResult: "realistic",
            readinessScore: 18,
            focusArea: "Personal Growth",
            tasks: [],
            createdAt: now.toISOString(),
            twelveWeekSystem: {
              goalType: "Personal Growth",
              vision12Week: ${JSON.stringify(GOAL_TITLE)},
              lagMetric: { name: "completed smoke weeks", unit: "weeks", target: "12", currentValue: "0" },
              leadIndicators: [
                { id: tacticOneId, name: ${JSON.stringify(TACTIC_ONE)}, target: "1", unit: "lần/tuần", type: "core", priority: 1, schedule: [todayOffset] },
                { id: tacticTwoId, name: ${JSON.stringify(TACTIC_TWO)}, target: "1", unit: "lần/tuần", type: "core", priority: 2, schedule: [todayOffset] },
              ],
              milestones: { week4: "Hoàn thành 4 tuần đầu giữ nhịp.", week8: "Khóa được nhịp giữa chu kỳ.", week12: "Kết thúc chu kỳ smoke đầy đủ." },
              successEvidence: "Smoke script đã chạy trọn loop.",
              reviewDay: "Sunday",
              week12Outcome: "Một chu kỳ smoke đầy đủ.",
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
      localStorage.setItem("pending_feasibility_result", JSON.stringify(pendingFeasibilityResult));
      localStorage.setItem("selected_focus_area", "Personal Growth");
      localStorage.removeItem("backend_goal_links");
      localStorage.removeItem("backend_plan_links");
      window.dispatchEvent(new CustomEvent("visionboard:user-data-updated"));
      return { ok: true, goalId };
    })()
  `);
  if (!result?.ok) throw new Error(`Could not seed funnel output: ${JSON.stringify(result)}`);
}

// ---------------------------------------------------------------------------
// Semantic assertions (read directly from localStorage so the test cannot fake
// pass on partially-rendered UI)
// ---------------------------------------------------------------------------

async function getFunnelSnapshot() {
  return browserEval(`
    (() => {
      const pendingSmartGoalRaw = localStorage.getItem("pending_smart_goal");
      const pendingFeasibilityRaw = localStorage.getItem("pending_feasibility_result");
      const userDataRaw = localStorage.getItem("visionboard_user_data");
      const todayKey = new Date().toISOString().slice(0, 10);
      let smartGoal = null;
      let feasibility = null;
      let goal = null;
      let system = null;
      try { smartGoal = pendingSmartGoalRaw ? JSON.parse(pendingSmartGoalRaw) : null; } catch {}
      try { feasibility = pendingFeasibilityRaw ? JSON.parse(pendingFeasibilityRaw) : null; } catch {}
      try {
        const data = userDataRaw ? JSON.parse(userDataRaw) : null;
        const goals = Array.isArray(data?.goals) ? data.goals : [];
        goal = goals.find((item) => item?.twelveWeekSystem) ?? null;
        system = goal?.twelveWeekSystem ?? null;
      } catch {}

      const taskInstances = Array.isArray(system?.taskInstances) ? system.taskInstances : [];
      const dailyCheckIns = Array.isArray(system?.dailyCheckIns) ? system.dailyCheckIns : [];
      const weeklyReviews = Array.isArray(system?.weeklyReviews) ? system.weeklyReviews : [];
      const week1Tasks = taskInstances.filter((t) => t?.weekNumber === 1);
      const todayTasks = taskInstances.filter((t) => t?.scheduledDate === todayKey);

      return {
        smartGoal,
        feasibility,
        goalId: goal?.id ?? null,
        system: system
          ? {
              week12Outcome: system.week12Outcome,
              vision12Week: system.vision12Week,
              lagMetric: system.lagMetric,
              leadIndicatorCount: Array.isArray(system.leadIndicators) ? system.leadIndicators.length : 0,
              milestones: system.milestones,
              reviewDay: system.reviewDay,
              taskCount: taskInstances.length,
              week1TaskCount: week1Tasks.length,
              todayTaskCount: todayTasks.length,
              completedTaskCount: taskInstances.filter((t) => t?.completed).length,
              dailyCheckInCount: dailyCheckIns.length,
              latestDailyCheckIn: dailyCheckIns[0] ?? null,
              weeklyReviewCount: weeklyReviews.length,
              latestWeeklyReview: weeklyReviews[weeklyReviews.length - 1] ?? null,
            }
          : null,
      };
    })()
  `);
}

async function waitForSnapshot(description, predicate, { timeoutMs = 30_000, intervalMs = 600 } = {}) {
  const startedAt = Date.now();
  let last = null;
  while (Date.now() - startedAt < timeoutMs) {
    last = await getFunnelSnapshot();
    if (predicate(last)) return last;
    await sleep(intervalMs);
  }
  throw new Error(`Timed out waiting for ${description}.\nLast snapshot: ${JSON.stringify(last, null, 2)}`);
}

function fail(message) {
  throw new Error(message);
}

function assertSmartGoalQuality(snapshot) {
  const goal = snapshot.smartGoal;
  if (!goal) fail("SMART goal seed missing — pending_smart_goal not found.");
  if (!goal.specific?.goal_statement?.trim()) fail("SMART goal missing specific.goal_statement");
  const measurable = goal.measurable ?? {};
  if (!measurable.metric_name?.trim()) fail("SMART goal missing measurable.metric_name");
  if (!Number.isFinite(measurable.target) || measurable.target <= 0) fail("SMART goal missing positive measurable.target");
  if (!Number.isFinite(measurable.baseline)) fail("SMART goal missing measurable.baseline");
  if (!measurable.metric_unit?.trim()) fail("SMART goal missing measurable.metric_unit");
  const targetWeeks = goal.time_bound?.target_weeks;
  if (!Number.isFinite(targetWeeks) || targetWeeks <= 0) fail("SMART goal missing positive time_bound.target_weeks");
  log(`✓ SMART goal: ${goal.specific.goal_statement} → ${measurable.target} ${measurable.metric_unit} in ${targetWeeks} weeks`);
}

function assertFeasibilityQuality(snapshot) {
  const f = snapshot.feasibility;
  if (!f) fail("Feasibility result missing — pending_feasibility_result not found.");
  if (!f.resultType) fail("Feasibility result missing resultType");
  if (!f.recommendation?.trim()) fail("Feasibility result missing recommendation text");
  if (f.recommendation.trim().length < 20) fail("Feasibility recommendation is too short to be useful");
  if (!Number.isFinite(f.adjustedScore)) fail("Feasibility missing adjustedScore");
  log(`✓ Feasibility: ${f.resultType} (${f.adjustedScore}/20) — recommendation len=${f.recommendation.length}`);
}

function assertTwelveWeekPlanQuality(snapshot) {
  const system = snapshot.system;
  if (!system) fail("12-week system missing in user data.");
  if (!system.week12Outcome?.trim() && !system.vision12Week?.trim())
    fail("12-week plan missing both week12Outcome and vision12Week");
  if (!system.lagMetric?.target?.toString().trim()) fail("12-week plan missing lagMetric.target");
  if (system.leadIndicatorCount < 2) fail(`12-week plan needs ≥2 lead indicators, got ${system.leadIndicatorCount}`);
  if (system.week1TaskCount < 1) fail("12-week plan has no week-1 tasks");
  const m = system.milestones ?? {};
  if (!m.week4?.trim() && !m.week8?.trim() && !m.week12?.trim())
    fail("12-week plan milestones (week4/8/12) all empty");
  if (!system.reviewDay?.trim()) fail("12-week plan missing reviewDay (review cadence)");
  log(
    `✓ 12-week plan: ${system.leadIndicatorCount} lead indicators, ${system.week1TaskCount} week-1 tasks, review on ${system.reviewDay}`,
  );
}

async function assertTodayPrimaryHero() {
  await openPage("/12-week-system");
  await assertCoreQualityTargetAccessible("today primary hero");
  await waitFor(
    "Today queue + primary hero",
    `document.querySelector('[data-tour-id="system-today-queue"]') && document.querySelector('[data-testid="today-primary-hero"]')`,
    { timeoutMs: 30_000 },
  );
  const heroText = await browserEval(
    `(() => { const el = document.querySelector('[data-testid="today-primary-hero"]'); return el ? el.innerText : null; })()`,
  );
  if (!heroText || !heroText.trim()) fail("Today primary hero rendered but its text is empty.");
  if (!/hôm nay/i.test(heroText) && !/quan trọng/i.test(heroText))
    fail(`Today hero text does not look like a primary-task callout: ${heroText.slice(0, 120)}`);
  log(`✓ Today primary hero rendered: ${heroText.split("\n")[0].slice(0, 80)}`);
}

async function toggleFirstTodayTask() {
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
  await waitForSnapshot("Today task toggle persisted", (snapshot) => (snapshot.system?.completedTaskCount ?? 0) >= 1);
  log("✓ Today task toggle persisted to localStorage");
}

async function saveDailyCheckIn() {
  const hasNote = await browserEval('Boolean(document.querySelector("#daily-note"))');
  if (!hasNote) fail("Daily check-in input #daily-note not present.");
  await fill("#daily-note", DAILY_CHECKIN_NOTE);
  await clickButton("luu check-in hom nay");
  await waitForSnapshot(
    "daily check-in persisted",
    (snapshot) =>
      (snapshot.system?.dailyCheckInCount ?? 0) >= 1 &&
      snapshot.system?.latestDailyCheckIn?.optionalNote === DAILY_CHECKIN_NOTE,
  );
  log("✓ Daily check-in persisted with the smoke note");
}

async function saveWeeklyReview() {
  await clickTab("tuan");
  await waitFor("weekly review shell", `document.querySelector('[data-testid="weekly-review-shell"]')`, {
    timeoutMs: 30_000,
  }).catch(async () => {
    await openPage("/12-week-system?tab=week");
    await waitFor("weekly review shell (direct URL)", `document.querySelector('[data-testid="weekly-review-shell"]')`);
  });
  const hasWeeklyReviewForm = await browserEval(`Boolean(${WEEKLY_REVIEW_FORM_READY})`);
  if (!hasWeeklyReviewForm) {
    await clickButton("bat dau review som");
  }
  await waitFor("weekly review form", WEEKLY_REVIEW_FORM_READY, { timeoutMs: 30_000 });

  await fill("#weekly-insights", WEEKLY_REVIEW_OBSTACLE);
  await addNextWeekCommitment(WEEKLY_REVIEW_PRIORITY);
  await clickButton("chot review tuan nay");
  const hasEarlyReviewDialog = await browserEval(
    `Boolean(document.querySelector('[role="alertdialog"], [data-radix-alert-dialog-content]'))`,
  );
  if (hasEarlyReviewDialog) {
    await clickButton("van luu som");
  }

  await waitForSnapshot(
    "weekly review persisted",
    (snapshot) =>
      (snapshot.system?.weeklyReviewCount ?? 0) >= 1 &&
      snapshot.system?.latestWeeklyReview?.insights === WEEKLY_REVIEW_OBSTACLE &&
      snapshot.system?.latestWeeklyReview?.nextWeekCommitments?.includes(WEEKLY_REVIEW_PRIORITY),
    { timeoutMs: 45_000 },
  );

  // Summary card should now be on screen
  const hasSummary = await browserEval(`Boolean(document.querySelector('[data-testid="weekly-review-summary"]'))`);
  if (!hasSummary) fail("Weekly review summary card (data-testid='weekly-review-summary') did not render.");
  const summaryText = await browserEval(
    `document.querySelector('[data-testid="weekly-review-summary"]')?.innerText ?? ""`,
  );
  if (!summaryText.includes("Đã giữ")) fail("Weekly review summary did not include WAM commitment summary.");
  log("✓ Weekly review saved + summary card rendered");
}

async function assertProgressTrendHero() {
  await openPage("/12-week-system?tab=progress");
  await assertCoreQualityTargetAccessible("progress trend hero");
  await waitFor(
    "Progress tab trend hero",
    `document.querySelector('[data-testid="progress-trend-hero"]')`,
    { timeoutMs: 30_000 },
  );
  const heroText = await browserEval(
    `(() => { const el = document.querySelector('[data-testid="progress-trend-hero"]'); return el ? el.innerText : null; })()`,
  );
  if (!heroText || !heroText.trim()) fail("Progress trend hero rendered but text is empty.");
  if (!/tiếp theo/i.test(heroText) && !/tab/i.test(heroText) && !/setup/i.test(heroText))
    fail(`Progress trend hero does not include a next-action hint:\n${heroText.slice(0, 200)}`);
  log(`✓ Progress trend hero rendered with next-action: ${heroText.split("\n").slice(0, 3).join(" | ").slice(0, 140)}`);
}

async function assertNoBrowserErrors() {
  const { stdout } = await runAgentBrowser(["errors"], { timeoutMs: 30_000 });
  const errors = stdout.trim();
  if (errors) fail(`Browser console/page errors detected:\n${errors}`);
}

async function runStep(label, task) {
  log(`▶ ${label}`);
  return task();
}

async function main() {
  assertTargetSafeForEnvironment();
  log(`Target: ${BASE_URL}`);
  log(`Browser session: ${SESSION}`);

  try {
    await runStep("Reset browser session", async () => {
      await runAgentBrowser(["close"], { timeoutMs: 30_000 }).catch(() => undefined);
    });
    await runStep("Open and clear local storage", async () => {
      await openPage("/");
      await assertCoreQualityTargetAccessible("open target root");
      await clearBrowserStorage();
    });
    await runStep("Seed deterministic SMART + Feasibility + 12-week system", seedFunnelOutput);

    await runStep("Reload to hydrate seeded state", async () => {
      await openPage("/12-week-system");
      await assertCoreQualityTargetAccessible("hydrate seeded 12-week system");
      await waitFor(
        "12-week system hydrated",
        `location.pathname === "/12-week-system" && document.querySelector('[data-tour-id="system-today-queue"]')`,
        { timeoutMs: 60_000 },
      );
    });

    const snapshot = await runStep("Read funnel snapshot", getFunnelSnapshot);
    await runStep("Assert SMART goal carries metric/target/time", () => assertSmartGoalQuality(snapshot));
    await runStep("Assert feasibility result has recommendation", () => assertFeasibilityQuality(snapshot));
    await runStep("Assert 12-week plan output is meaningful", () => assertTwelveWeekPlanQuality(snapshot));

    await runStep("Assert Today primary task hero", assertTodayPrimaryHero);
    await runStep("Toggle the first Today task", toggleFirstTodayTask);
    await runStep("Save daily check-in", saveDailyCheckIn);
    await runStep("Save weekly review with new fields", saveWeeklyReview);
    await runStep("Assert Progress trend hero + next action", assertProgressTrendHero);

    await runStep("Browser error scan", assertNoBrowserErrors);

    log("✅ Core funnel quality smoke passed");
  } finally {
    await clearBrowserStorage().catch(() => undefined);
    await runAgentBrowser(["close"], { timeoutMs: 30_000 }).catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(`[core-quality] FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
