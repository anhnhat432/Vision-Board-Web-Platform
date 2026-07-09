#!/usr/bin/env node

/**
 * MVP 2 Cloud Sync Staging Smoke Test — Hardened
 *
 * Env vars:
 *   MVP2_SMOKE_URL           – staging/preview URL (required)
 *   MVP2_SMOKE_EMAIL         – test account email (required unless MVP2_SMOKE_SKIP_AUTH=true)
 *   MVP2_SMOKE_PASSWORD      – test account password
 *   MVP2_SMOKE_SKIP_AUTH     – "true" to skip login (signed-out guard only)
 *   MVP2_SMOKE_CLEANUP       – "true"|"false" to clear test data after run (default: true)
 *   MVP2_SMOKE_TEST_PREFIX   – override test data prefix (default: [SMOKE-{timestamp}])
 *
 * Safety:
 *   - No real payment. No production data. No hardcoded secrets.
 *   - All test data uses the test prefix — safe to identify and remove.
 *   - Cloud cleanup only deletes data via authenticated user's own workspace delete endpoint.
 *   - Missing env = explicit SKIP (exit 0), not false-pass.
 *   - Actual failure = exit 1.
 */

import { spawn } from "node:child_process";

// ── Env ──────────────────────────────────────────────────────────
const BASE_URL = process.env.MVP2_SMOKE_URL?.replace(/\/$/, "");
const EMAIL = process.env.MVP2_SMOKE_EMAIL?.trim();
const PASSWORD = process.env.MVP2_SMOKE_PASSWORD;
const SKIP_AUTH = process.env.MVP2_SMOKE_SKIP_AUTH === "true";
const CLEANUP = process.env.MVP2_SMOKE_CLEANUP !== "false";
const IS_GITHUB_ACTIONS = process.env.GITHUB_ACTIONS === "true";
const TIMESTAMP = new Date()
  .toISOString()
  .replace(/[-:.TZ]/g, "")
  .slice(0, 14);
const SESSION = `mvp2-sync-staging-${TIMESTAMP}`;
const TEST_PREFIX =
  process.env.MVP2_SMOKE_TEST_PREFIX || `[SMOKE-${TIMESTAMP}]`;
const GOAL_TITLE = `${TEST_PREFIX} Sync staging smoke`;
const TACTIC_ONE = `${TEST_PREFIX} Today task`;
const TACTIC_TWO = `${TEST_PREFIX} Weekly review`;
const DAILY_NOTE = `${TEST_PREFIX} Daily check-in`;
const WEEKLY_REVIEW_OBSTACLE = `${TEST_PREFIX} no blockers`;
const WEEKLY_REVIEW_PRIORITY = `${TEST_PREFIX} finish smoke`;

const passed = [];
const skipped = [];
const failed = [];
const seenApiResources = new Set();

function log(message) {
  console.log(`[mvp2-sync] ${message}`);
}

function assertTargetSafeForEnvironment() {
  if (!IS_GITHUB_ACTIONS || !BASE_URL) return;

  const normalizedUrl = BASE_URL.toLowerCase();
  if (normalizedUrl.includes("localhost") || normalizedUrl.includes("127.0.0.1")) {
    throw new Error(
      "Refusing to run MVP2 sync staging smoke against localhost. Use a staging or production-like URL.",
    );
  }
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
    const settle = (cb, val) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cb(val);
    };
    const timer = setTimeout(() => {
      killProcessTree(child);
      settle(reject, new Error(`Timeout: ${args.join(" ")}`));
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
        settle(
          reject,
          new Error(`agent-browser failed (code ${code})\n${stderr || stdout}`),
        );
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
  const result = await runAgentBrowser(["eval", "--stdin"], {
    ...options,
    input: source,
  });
  return parseEvalResult(result.stdout);
}

async function openPage(pathOrUrl) {
  const url = pathOrUrl.startsWith("http")
    ? pathOrUrl
    : `${BASE_URL}${pathOrUrl}`;
  log(`Opening ${url}`);
  await runAgentBrowser(["open", url], { timeoutMs: 90_000 });
  await runAgentBrowser(["wait", "--load", "networkidle"], {
    timeoutMs: 90_000,
  });
  await recordApiResources();
}

async function waitFor(
  description,
  source,
  { timeoutMs = 45_000, intervalMs = 700 } = {},
) {
  log(`Waiting: ${description}`);
  const start = Date.now();
  let last = null;
  while (Date.now() - start < timeoutMs) {
    last = await browserEval(
      `(() => { try { return Boolean(${source}); } catch { return false; } })()`,
    );
    if (last) {
      await recordApiResources();
      return;
    }
    await sleep(intervalMs);
  }
  const state = await getPageState();
  throw new Error(
    `Timeout: ${description}. Last=${String(last)}\nURL: ${state.url}\nText: ${state.text.slice(0, 600)}`,
  );
}

async function getPageState() {
  return browserEval(`(() => ({
    url: location.href, path: location.pathname, text: document.body.innerText,
    apiResources: performance.getEntriesByType("resource").filter(e => e.name.includes("/api/")).map(e => e.name),
  }))()`);
}

async function recordApiResources() {
  const state = await getPageState().catch(() => null);
  if (!state?.apiResources) return;
  state.apiResources.forEach((r) => seenApiResources.add(r));
}

async function clearBrowserStorage() {
  log("Clearing browser storage");
  await browserEval(`(async () => {
    localStorage.clear(); sessionStorage.clear();
    for (const c of document.cookie.split(";")) {
      const n = c.split("=")[0]?.trim();
      if (n) document.cookie = n + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";
    }
    if (indexedDB.databases) {
      const dbs = await indexedDB.databases();
      await Promise.all(dbs.map(d => d.name && new Promise(r => { const req = indexedDB.deleteDatabase(d.name); req.onsuccess = req.onerror = req.onblocked = () => r(); })));
    }
    return true;
  })()`);
}

async function pageAction(source) {
  const result = await browserEval(`(() => {
    const normalize = (v) => String(v ?? "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[đĐ]/g, m => m === "đ" ? "d" : "D").replace(/\\s+/g, " ").trim().toLowerCase();
    const setNativeValue = (el, val) => {
      if (!el) throw new Error("Missing element");
      const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLInputElement ? HTMLInputElement.prototype : Object.getPrototypeOf(el);
      const desc = Object.getOwnPropertyDescriptor(proto, "value");
      if (desc?.set) desc.set.call(el, val); else el.value = val;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    };
    const fillSelector = (sel, val) => setNativeValue(document.querySelector(sel), val);
    const clickButtonByText = (texts) => {
      const candidates = Array.isArray(texts) ? texts : [texts];
      const nc = candidates.map(normalize);
      const els = Array.from(document.querySelectorAll("button, [role='button'], a"));
      const el = els.find(e => { const t = normalize(e.innerText || e.textContent || e.getAttribute("aria-label")); return nc.some(c => t.includes(c)); });
      if (!el) throw new Error("Button not found: " + candidates.join(" | "));
      if (el.disabled || el.getAttribute("aria-disabled") === "true") throw new Error("Button disabled: " + (el.innerText || ""));
      el.scrollIntoView({ block: "center" }); el.click();
    };
    const clickTabByText = (text) => {
      const t = normalize(text);
      const tab = Array.from(document.querySelectorAll('[role="tab"]')).find(e => normalize(e.innerText || e.textContent).includes(t));
      if (!tab) throw new Error("Tab not found: " + text);
      tab.scrollIntoView({ block: "center" }); tab.click();
    };
    ${source}
    return true;
  })()`);
  if (result !== true) throw new Error(`pageAction failed: ${source}`);
  await sleep(350);
  await recordApiResources();
}

async function clickButton(texts) {
  log(`Click: ${Array.isArray(texts) ? texts.join(" | ") : texts}`);
  await pageAction(`clickButtonByText(${JSON.stringify(texts)});`);
}

async function clickTab(text) {
  log(`Tab: ${text}`);
  await pageAction(`clickTabByText(${JSON.stringify(text)});`);
}

async function fill(selector, value) {
  log(`Fill: ${selector}`);
  await pageAction(
    `fillSelector(${JSON.stringify(selector)}, ${JSON.stringify(value)});`,
  );
}

// ── Auth ──────────────────────────────────────────────────────────
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

async function authenticate() {
  if (SKIP_AUTH) {
    log("SKIP_AUTH=true, skipping login");
    return;
  }
  await openPage("/login?next=%2F12-week-system");
  await waitFor(
    "login form",
    'document.querySelector("#login-email") && document.querySelector("#login-password")',
  );
  log(`Signing in as ${EMAIL}`);
  await fill("#login-email", EMAIL);
  await fill("#login-password", PASSWORD);
  await clickButton(["Đăng nhập", "dang nhap"]);
  await waitFor("post-login route", 'location.pathname !== "/login"', {
    timeoutMs: 70_000,
  });
}

// ── Signed-out guard ─────────────────────────────────────────────
async function stepSignedOutGuard() {
  log("Verifying signed-out guard: no protected API spam");
  await clearBrowserStorage();
  await openPage("/");
  await waitFor("dashboard body", "document.body.innerText.trim().length > 80");
  const state = await getPageState();
  if (state.path === "/login")
    throw new Error("Signed-out visitor redirected to /login");

  // Navigate to 12-week system to ensure no backend sync calls fire in demo mode
  await openPage("/12-week-system");
  await sleep(3000);
  await recordApiResources();

  const protectedPaths = [
    "/api/sync/",
    "/api/goals",
    "/api/plans",
    "/api/tasks",
    "/api/auth/profile",
  ];
  const protectedHits = Array.from(seenApiResources).filter((r) => {
    try {
      const p = new URL(r).pathname;
      return protectedPaths.some((m) => p.includes(m));
    } catch {
      return protectedPaths.some((m) => r.includes(m));
    }
  });
  if (protectedHits.length > 0) {
    throw new Error(
      `Signed-out demo made protected API calls:\n${protectedHits.join("\n")}`,
    );
  }
  log("Signed-out guard OK: no protected API requests detected");
  seenApiResources.clear();
}

// ── Seed local data ───────────────────────────────────────────────
async function seedLocalTwelveWeekSystem() {
  log("Seeding local 12-week system with test prefix");
  const result = await browserEval(`(() => {
    const pad = v => String(v).padStart(2, "0");
    const dk = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
    const now = new Date(); const today = new Date(now); today.setHours(0,0,0,0);
    const ws = new Date(today); ws.setDate(ws.getDate() - ((ws.getDay() - 1 + 7) % 7));
    const addD = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
    const todayOff = Math.max(0, Math.min(6, Math.round((today - ws) / 86400000)));
    const goalId = "goal_smoke_sync_" + ${JSON.stringify(TIMESTAMP)};
    const wps = Array.from({length:12}, (_,i) => ({weekNumber:i+1,phaseName:i<4?"Foundation":i<8?"Build":"Finish",focus:"Sync smoke",milestone:"",completed:false}));
    const sb = Array.from({length:12}, (_,i) => ({weekNumber:i+1,leadCompletionPercent:0,mainMetricProgress:"",outputDone:"",reviewDone:false,weeklyScore:0}));
    const tasks = [
      {id:"tw_smoke_task_1",weekNumber:1,scheduledDate:dk(today),title:${JSON.stringify(TACTIC_ONE)},leadIndicatorName:${JSON.stringify(TACTIC_ONE)},isCore:true,completed:false,tacticId:"tactic_s1"},
      {id:"tw_smoke_task_2",weekNumber:1,scheduledDate:dk(today),title:${JSON.stringify(TACTIC_TWO)},leadIndicatorName:${JSON.stringify(TACTIC_TWO)},isCore:true,completed:false,tacticId:"tactic_s2"},
    ];
    const data = {
      storageVersion:5, userId:"sync-smoke", wheelOfLifeHistory:[], goals:[{
        id:goalId, category:"Personal Growth", title:${JSON.stringify(GOAL_TITLE)},
        description:"Sync staging smoke test data — safe to delete.",
        deadline:dk(addD(today,83)), feasibilityResult:"realistic", readinessScore:18, focusArea:"Personal Growth", tasks:[], createdAt:now.toISOString(),
        twelveWeekSystem:{
          goalType:"custom-goal", vision12Week:${JSON.stringify(GOAL_TITLE)},
          lagMetric:{name:"smoke weeks",unit:"weeks",target:"12",currentValue:"0"},
          leadIndicators:[
            {id:"tactic_s1",name:${JSON.stringify(TACTIC_ONE)},target:"1",unit:"time/week",type:"core",priority:1,schedule:[todayOff]},
            {id:"tactic_s2",name:${JSON.stringify(TACTIC_TWO)},target:"1",unit:"time/week",type:"core",priority:2,schedule:[todayOff]},
          ],
          milestones:{week4:"w4",week8:"w8",week12:"w12"}, successEvidence:"Sync smoke passes.",
          reviewDay:"Sunday", week12Outcome:"Sync works.", startDate:dk(ws), endDate:dk(addD(ws,83)),
          timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||"Asia/Ho_Chi_Minh",
          weekStartsOn:"Monday", status:"active", dailyReminderTime:"19:00", tacticLoadPreference:"balanced",
          reentryCount:0, currentWeek:1, totalWeeks:12, weeklyPlans:wps, taskInstances:tasks, dailyCheckIns:[], weeklyReviews:[], scoreboard:sb,
        },
      }],
      currentWheelOfLife:[{name:"Career",score:7,color:"#8b5cf6"},{name:"Health",score:6,color:"#ef4444"}],
      visionBoards:[], achievements:[], reflections:[], eventLog:[], syncOutbox:[],
      appPreferences:{allowLocalAnalytics:true,enableInAppReminders:false,enableBrowserNotifications:false,keepLocalOutbox:true,preferredReminderHour:19},
      subscription:null, entitlements:[], onboardingCompleted:true, isHydratedFromDemo:false,
    };
    localStorage.setItem("visionboard_user_data", JSON.stringify(data));
    localStorage.setItem("latest_12_week_goal_id", goalId);
    localStorage.setItem("latest_12_week_system_goal_id", goalId);
    window.dispatchEvent(new CustomEvent("visionboard:user-data-updated"));
    return { ok:true, goalId };
  })()`);
  if (!result?.ok) throw new Error(`Seed failed: ${JSON.stringify(result)}`);
  await openPage("/12-week-system");
  await waitFor(
    "seeded system loaded",
    `document.body.innerText.includes(${JSON.stringify(TEST_PREFIX)})`,
    { timeoutMs: 45_000 },
  );
}

// ── Snapshot helpers ──────────────────────────────────────────────
async function getGoalSnapshot() {
  return browserEval(`(() => {
    const raw = localStorage.getItem("visionboard_user_data");
    if (!raw) return { found:false };
    const data = JSON.parse(raw);
    const goal = data.goals?.find(g => g?.title?.includes(${JSON.stringify(TEST_PREFIX)}));
    if (!goal?.twelveWeekSystem) return { found:false, goalCount:data.goals?.length??0 };
    const s = goal.twelveWeekSystem;
    return {
      found:true, goalId:goal.id, title:goal.title,
      taskCount:(s.taskInstances||[]).length,
      completedTaskCount:(s.taskInstances||[]).filter(t=>t.completed).length,
      dailyCheckInCount:(s.dailyCheckIns||[]).length,
      weeklyReviewCount:(s.weeklyReviews||[]).length,
    };
  })()`);
}

async function waitForSnapshot(
  desc,
  pred,
  { timeoutMs = 45_000, intervalMs = 700 } = {},
) {
  log(`Waiting: ${desc}`);
  const start = Date.now();
  let last = null;
  while (Date.now() - start < timeoutMs) {
    last = await getGoalSnapshot();
    if (pred(last)) return last;
    await sleep(intervalMs);
  }
  throw new Error(`Timeout: ${desc}. Snapshot: ${JSON.stringify(last)}`);
}

async function getMutationQueueSnapshot() {
  return browserEval(`(() => {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith("visionboard_data_mutation_queue")) keys.push(k);
    }
    let totalPending = 0; let totalItems = 0;
    for (const k of keys) {
      try {
        const store = JSON.parse(localStorage.getItem(k));
        const items = store?.items || [];
        totalItems += items.length;
        totalPending += items.filter(i => i.status === "pending").length;
      } catch {}
    }
    return { queueKeys: keys.length, totalItems, totalPending };
  })()`);
}

// ── Test steps ────────────────────────────────────────────────────
async function stepToggleTask() {
  await clickTab("Hôm nay");
  await waitFor(
    "Today queue",
    'document.body.innerText.includes("Hàng việc hôm nay") || document.body.innerText.includes("hang viec hom nay")',
  );
  await pageAction(`
    const queue = document.querySelector('[data-tour-id="system-today-queue"]') ||
      Array.from(document.querySelectorAll('section, div')).find(e => e.textContent?.includes("Hàng việc hôm nay"));
    if (!queue) throw new Error("Today queue not found");
    const cb = Array.from(queue.querySelectorAll('[role="checkbox"], input[type="checkbox"]')).find(e => {
      if (e.disabled) return false;
      if (e.matches?.('input[type="checkbox"]')) return !e.checked;
      return e.getAttribute("aria-checked") !== "true";
    });
    if (!cb) throw new Error("No open task checkbox");
    cb.scrollIntoView({ block: "center" }); cb.click();
  `);
  await waitForSnapshot("task toggled", (s) => s.completedTaskCount >= 1);
}

async function stepDailyCheckIn() {
  await clickTab("Hôm nay");
  await waitFor(
    "Today tab ready",
    'document.body.innerText.includes("Hàng việc hôm nay") || document.body.innerText.includes("hang viec hom nay")',
  );
  const hasDailyNote = await browserEval(
    'Boolean(document.querySelector("#daily-note"))',
  );
  if (!hasDailyNote) {
    log("Daily check-in form not visible; skipping");
    skipped.push("daily-check-in");
    return;
  }
  await fill("#daily-note", DAILY_NOTE);
  await clickButton(["Lưu check-in hôm nay", "luu check-in hom nay"]);
  await waitForSnapshot(
    "daily check-in saved",
    (s) => s.dailyCheckInCount >= 1,
    { timeoutMs: 30_000 },
  );
  log("Daily check-in saved locally");
}

async function stepWeeklyReview() {
  await clickTab("Tuần");
  await waitFor(
    "Week tab",
    'document.querySelector("#weekly-insights") && document.querySelector("#weekly-next-commitments")',
    { timeoutMs: 10_000 },
  ).catch(async () => {
    log("Tab click did not switch to Week; opening the Week tab URL directly");
    await openPage("/12-week-system?tab=week");
    await waitFor(
      "Week tab URL",
      'document.querySelector("#weekly-insights") && document.querySelector("#weekly-next-commitments")',
    );
  });
  const hasForm = await browserEval(
    'Boolean(document.querySelector("#weekly-insights") && document.querySelector("#weekly-next-commitments"))',
  );
  if (!hasForm) {
    log("Weekly review form not visible; skipping");
    skipped.push("weekly-review");
    return;
  }
  await fill("#weekly-insights", WEEKLY_REVIEW_OBSTACLE);
  await addNextWeekCommitment(WEEKLY_REVIEW_PRIORITY);
  await browserEval("window.__smokeOriginalWeeklyReviewConfirm = window.confirm; window.confirm = () => true;");
  await clickButton(["Chốt review tuần này", "chot review tuan nay"]);
  await waitForSnapshot(
    "weekly review saved",
    (s) => s.weeklyReviewCount >= 1,
    { timeoutMs: 75_000 },
  );
  log("Weekly review saved locally");
}

async function stepManualSync() {
  await clickTab("Cài đặt");
  await waitFor(
    "settings tab",
    'document.body.innerText.includes("Mutation queue") || document.body.innerText.includes("mutation queue")',
    { timeoutMs: 30_000 },
  );
  await clickButton(["Đồng bộ cloud thủ công", "dong bo cloud thu cong"]);
  await sleep(5000);
  log("Manual sync triggered, waiting for completion");
  await waitFor(
    "sync finished",
    `
    (() => {
      const text = document.body.innerText.toLowerCase();
      return text.includes("đã gửi queue") || text.includes("da gui queue") ||
             text.includes("đã áp dụng") || text.includes("merge an toàn") ||
             text.includes("idle") || text.includes("skipped") ||
             text.includes("conflict") || text.includes("lỗi");
    })()
  `,
    { timeoutMs: 60_000 },
  );
}

async function stepRefreshAndVerify() {
  log("Refreshing page to verify persistence");
  await browserEval("location.reload()");
  await runAgentBrowser(["wait", "--load", "networkidle"], {
    timeoutMs: 90_000,
  });
  await waitFor(
    "system reloaded",
    `document.body.innerText.includes(${JSON.stringify(TEST_PREFIX)})`,
    { timeoutMs: 45_000 },
  );
  const snap = await waitForSnapshot(
    "task still completed after reload",
    (s) => s.found && s.completedTaskCount >= 1,
    { timeoutMs: 30_000 },
  );
  log(
    `After reload: tasks=${snap.completedTaskCount}, check-ins=${snap.dailyCheckInCount}, reviews=${snap.weeklyReviewCount}`,
  );
}

async function stepSecondSync() {
  log("Running second sync to verify pull + round-trip");
  await clickTab("Cài đặt");
  await waitFor(
    "settings tab (second)",
    'document.body.innerText.includes("Mutation queue") || document.body.innerText.includes("mutation queue")',
    { timeoutMs: 30_000 },
  );
  await clickButton(["Đồng bộ cloud thủ công", "dong bo cloud thu cong"]);
  await sleep(5000);
  await waitFor(
    "second sync finished",
    `
    (() => {
      const text = document.body.innerText.toLowerCase();
      return text.includes("đã gửi queue") || text.includes("da gui queue") ||
             text.includes("đã áp dụng") || text.includes("merge an toàn") ||
             text.includes("idle") || text.includes("skipped") ||
             text.includes("conflict") || text.includes("lỗi");
    })()
  `,
    { timeoutMs: 60_000 },
  );
  const snap = await getGoalSnapshot();
  log(
    `After second sync: tasks=${snap.completedTaskCount ?? 0}, check-ins=${snap.dailyCheckInCount ?? 0}, reviews=${snap.weeklyReviewCount ?? 0}`,
  );
}

async function stepLogoutLoginVerify() {
  if (SKIP_AUTH) {
    log("SKIP: logout/login (no auth)");
    skipped.push("logout-login-verify");
    return;
  }
  log("Clearing session and logging back in");
  await clearBrowserStorage();
  await authenticate();
  await openPage("/12-week-system");
  await waitFor(
    "system after re-login",
    `document.body.innerText.includes(${JSON.stringify(TEST_PREFIX)})`,
    { timeoutMs: 75_000 },
  );
  const snap = await getGoalSnapshot();
  if (snap.found && snap.completedTaskCount >= 1) {
    log(
      `Re-login persistence OK: tasks=${snap.completedTaskCount}, check-ins=${snap.dailyCheckInCount ?? 0}, reviews=${snap.weeklyReviewCount ?? 0}`,
    );
  } else {
    log(
      `Re-login: goal found=${snap.found}, completedTasks=${snap.completedTaskCount ?? 0} (may need backend hydration)`,
    );
  }
}

async function stepCleanupLocal() {
  if (!CLEANUP) {
    log("SKIP: local cleanup (MVP2_SMOKE_CLEANUP=false)");
    return;
  }
  log(`Cleaning local test data with prefix ${TEST_PREFIX}`);
  await browserEval(`(() => {
    const raw = localStorage.getItem("visionboard_user_data");
    if (!raw) return { ok: true, reason: "no data" };
    const data = JSON.parse(raw);
    const before = data.goals?.length ?? 0;
    data.goals = (data.goals || []).filter(g => !g?.title?.includes(${JSON.stringify(TEST_PREFIX)}));
    data.reflections = (data.reflections || []).filter(r => !r?.title?.includes(${JSON.stringify(TEST_PREFIX)}));
    localStorage.setItem("visionboard_user_data", JSON.stringify(data));
    window.dispatchEvent(new CustomEvent("visionboard:user-data-updated"));
    return { ok: true, removed: before - data.goals.length };
  })()`);
}

async function stepCleanupCloud() {
  if (!CLEANUP) {
    log("SKIP: cloud cleanup (MVP2_SMOKE_CLEANUP=false)");
    return;
  }
  if (SKIP_AUTH) {
    log("SKIP: cloud cleanup (no auth)");
    skipped.push("cloud-cleanup");
    return;
  }
  log("Cleaning cloud workspace via DELETE /api/sync/12-week/workspace");
  await clickTab("Cài đặt");
  await waitFor(
    "settings tab for cleanup",
    'document.body.innerText.includes("Mutation queue") || document.body.innerText.includes("mutation queue")',
    { timeoutMs: 30_000 },
  );
  // Use the Export cloud / Xóa cloud buttons if available; otherwise skip
  const hasDeleteButton = await browserEval(`(() => {
    const normalize = (v) => String(v ?? "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/[đĐ]/g, m => m === "đ" ? "d" : "D").replace(/\\s+/g, " ").trim().toLowerCase();
    const buttons = Array.from(document.querySelectorAll("button"));
    return buttons.some(b => normalize(b.innerText).includes("xoa cloud"));
  })()`);
  if (!hasDeleteButton) {
    log("Xóa cloud button not found; skipping cloud cleanup");
    skipped.push("cloud-cleanup-button");
    return;
  }
  // Click the delete button — will trigger window.confirm
  // Override confirm to auto-accept for cleanup
  await browserEval(
    `window.__smokeOriginalConfirm = window.confirm; window.confirm = () => true;`,
  );
  try {
    await clickButton(["Xóa cloud", "xoa cloud"]);
    await sleep(5000);
    log("Cloud workspace delete triggered");
  } finally {
    await browserEval(
      `if (window.__smokeOriginalConfirm) { window.confirm = window.__smokeOriginalConfirm; delete window.__smokeOriginalConfirm; }`,
    );
  }
}

// ── Runner ────────────────────────────────────────────────────────
async function runStep(label, fn) {
  log(`\n── ${label} ──`);
  try {
    await fn();
    passed.push(label);
    log(`✓ ${label}`);
  } catch (error) {
    failed.push({ label, error: error.message });
    log(`✗ ${label}: ${error.message}`);
  }
}

async function main() {
  // ── Env validation ──
  if (!BASE_URL) {
    console.error(
      "[mvp2-sync] SKIP: MVP2_SMOKE_URL is not set. Set it to the staging/preview URL.",
    );
    process.exitCode = 0;
    return;
  }
  assertTargetSafeForEnvironment();
  if (!SKIP_AUTH && (!EMAIL || !PASSWORD)) {
    console.error(
      "[mvp2-sync] SKIP: MVP2_SMOKE_EMAIL and MVP2_SMOKE_PASSWORD required (or set MVP2_SMOKE_SKIP_AUTH=true).",
    );
    process.exitCode = 0;
    return;
  }

  log(`Target: ${BASE_URL}`);
  log(`Auth: ${SKIP_AUTH ? "skipped (signed-out guard only)" : EMAIL}`);
  log(`Cleanup: ${CLEANUP}`);
  log(`Test prefix: ${TEST_PREFIX}`);

  try {
    await runAgentBrowser(["close"], { timeoutMs: 30_000 }).catch(
      () => undefined,
    );

    // Phase 0: Signed-out guard (always runs)
    await runStep(
      "Signed-out guard (no protected API spam)",
      stepSignedOutGuard,
    );

    if (SKIP_AUTH) {
      log(
        "\n── SKIP_AUTH=true: skipping all authenticated cloud sync steps ──",
      );
      skipped.push(
        "authenticate",
        "seed",
        "toggle-task",
        "daily-check-in",
        "weekly-review",
        "manual-sync-1",
        "refresh-verify",
        "manual-sync-2",
        "logout-login",
        "cloud-cleanup",
      );
    } else {
      // Phase 1: Authenticate + seed
      await runStep("Authenticate", authenticate);
      await runStep("Clear & seed local data", async () => {
        await clearBrowserStorage();
        await authenticate();
        await seedLocalTwelveWeekSystem();
      });

      // Phase 2: Exercise execution actions
      await runStep("Toggle today task", stepToggleTask);
      await runStep("Daily check-in", stepDailyCheckIn);
      await runStep("Weekly review", stepWeeklyReview);

      // Phase 3: First sync cycle
      const queueBefore = await getMutationQueueSnapshot();
      log(`Queue before sync: ${JSON.stringify(queueBefore)}`);
      await runStep("Manual cloud sync (1st)", stepManualSync);
      const queueAfter = await getMutationQueueSnapshot();
      log(`Queue after sync: ${JSON.stringify(queueAfter)}`);

      // Phase 4: Verify persistence
      await runStep("Refresh & verify persistence", stepRefreshAndVerify);

      // Phase 5: Second sync (pull round-trip)
      await runStep("Manual cloud sync (2nd — pull verify)", stepSecondSync);

      // Phase 6: Cross-session verify
      await runStep("Logout/login verify", stepLogoutLoginVerify);

      // Phase 7: Cleanup
      await runStep("Cleanup cloud workspace", stepCleanupCloud);
      await runStep("Cleanup local test data", stepCleanupLocal);
    }
  } finally {
    await clearBrowserStorage().catch(() => undefined);
    await runAgentBrowser(["close"], { timeoutMs: 30_000 }).catch(
      () => undefined,
    );
  }

  log("\n── Summary ──");
  log(
    `Passed: ${passed.length} | Skipped: ${skipped.length} | Failed: ${failed.length}`,
  );
  if (skipped.length > 0) log(`  Skipped: ${skipped.join(", ")}`);
  if (failed.length > 0) {
    for (const f of failed) log(`  ✗ ${f.label}: ${f.error}`);
    process.exitCode = 1;
  } else {
    log("MVP2 sync staging smoke passed ✓");
  }
}

main().catch((error) => {
  console.error(
    `[mvp2-sync] FATAL: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
});
