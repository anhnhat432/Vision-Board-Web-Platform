#!/usr/bin/env node

import { chromium } from "playwright";

const BASE_URL = (process.env.PROD_SMOKE_URL ?? "https://vision-board-web-platform.vercel.app").replace(/\/$/, "");
const TIMESTAMP = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const GENERATED_EMAIL = `codex.qa+full-smoke-${TIMESTAMP}@example.com`;
const GENERATED_PASSWORD = `CodexFullSmoke${TIMESTAMP}!`;
const EMAIL = process.env.PROD_SMOKE_EMAIL?.trim() || GENERATED_EMAIL;
const PASSWORD = process.env.PROD_SMOKE_PASSWORD || GENERATED_PASSWORD;
const HAS_PROVIDED_CREDENTIALS = Boolean(process.env.PROD_SMOKE_EMAIL && process.env.PROD_SMOKE_PASSWORD);
const ALLOW_GENERATED_ACCOUNT = process.env.PROD_SMOKE_ALLOW_GENERATED_ACCOUNT === "1";
const AUTH_MODE_OVERRIDE = process.env.PROD_SMOKE_AUTH_MODE?.trim().toLowerCase();
const AUTH_MODE = AUTH_MODE_OVERRIDE || (HAS_PROVIDED_CREDENTIALS ? "signin" : "signup");
const DEFAULT_TIMEOUT_MS = Number(process.env.PROD_SMOKE_TIMEOUT_MS ?? 90_000);
const SKIP_CHECKOUT = process.env.PROD_SMOKE_SKIP_CHECKOUT === "1";

const GOAL_ID = `goal_full_smoke_${TIMESTAMP}`;
const GOAL_TITLE = `Full production smoke ${TIMESTAMP}`;
const TACTIC_TITLE = "Review execution rhythm";
const TODAY_TASK_TITLE = `Full smoke today task ${TIMESTAMP}`;
const CHECKIN_NOTE = `Full smoke check-in ${TIMESTAMP}`;
const WEEKLY_REVIEW_OUTPUT = `Full smoke weekly review ${TIMESTAMP}`;
const WEEKLY_REVIEW_PRIORITY = `Full smoke next commitment ${TIMESTAMP}`;

function log(message) {
  console.log(`[prod-smoke] ${message}`);
}

async function step(label, action) {
  const startedAt = Date.now();
  log(`START ${label}`);
  await action();
  log(`PASS ${label} (${Date.now() - startedAt}ms)`);
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function normalizeText(text) {
  return String(text)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "d")
    .toLowerCase();
}

function hasProductBrand(text) {
  return normalizeText(text).includes("dear our future");
}

function createFullSmokeUserData() {
  const now = new Date();
  const today = formatDate(now);
  const endDate = formatDate(addDays(now, 83));
  const createdAt = now.toISOString();

  const weeklyPlans = Array.from({ length: 12 }, (_, index) => {
    const weekNumber = index + 1;
    return {
      weekNumber,
      phaseName: weekNumber <= 4 ? "Foundation" : weekNumber <= 8 ? "Build" : "Finish",
      focus: weekNumber === 1 ? "Keep the production smoke plan active" : `Week ${weekNumber} production rhythm`,
      milestone: weekNumber === 4 || weekNumber === 8 || weekNumber === 12 ? `Milestone week ${weekNumber}` : "",
      completed: false,
    };
  });

  const scoreboard = Array.from({ length: 12 }, (_, index) => ({
    weekNumber: index + 1,
    leadCompletionPercent: index === 0 ? 25 : 0,
    mainMetricProgress: index === 0 ? "1/12" : "",
    outputDone: index === 0 ? "Production smoke output" : "",
    reviewDone: false,
    weeklyScore: index === 0 ? 24 : 0,
  }));

  return {
    storageVersion: 5,
    userId: "full_smoke_user",
    wheelOfLifeHistory: [],
    currentWheelOfLife: [
      { name: "Finance", score: 6, color: "#10b981" },
      { name: "Health", score: 6, color: "#ef4444" },
      { name: "Career", score: 6, color: "#8b5cf6" },
    ],
    goals: [
      {
        id: GOAL_ID,
        category: "Finance",
        title: GOAL_TITLE,
        description: "Seeded full smoke goal for production route and sync checks.",
        deadline: endDate,
        tasks: [{ id: "task_goal_full", title: TODAY_TASK_TITLE, completed: false }],
        feasibilityResult: "challenging",
        readinessScore: 18,
        focusArea: "Finance",
        createdAt,
        twelveWeekSystem: {
          goalType: "Finance",
          vision12Week: GOAL_TITLE,
          lagMetric: { name: "Completed reviews", unit: "reviews", target: "12", currentValue: "1" },
          leadIndicators: [
            {
              id: "tactic_full_review",
              name: TACTIC_TITLE,
              target: "1",
              unit: "review/day",
              type: "core",
              priority: 1,
              schedule: [0, 1, 2, 3, 4, 5, 6],
            },
          ],
          milestones: {
            week4: "First four weeks reviewed",
            week8: "Execution rhythm stable",
            week12: "Twelve reviews completed",
          },
          successEvidence: "The 12-week system opens with a seeded production plan.",
          reviewDay: "Sunday",
          week12Outcome: "Twelve reviews completed",
          weeklyActions: [TACTIC_TITLE],
          successMetric: "Completed reviews",
          startDate: today,
          endDate,
          timezone: "Asia/Ho_Chi_Minh",
          weekStartsOn: "Monday",
          status: "active",
          dailyReminderTime: "19:00",
          tacticLoadPreference: "balanced",
          preferredDays: [0, 1, 2, 3, 4, 5, 6],
          personalConstraint: "consistency",
          reentryCount: 0,
          currentWeek: 1,
          totalWeeks: 12,
          weeklyPlans,
          taskInstances: [
            {
              id: "task_full_today",
              weekNumber: 1,
              scheduledDate: today,
              title: TODAY_TASK_TITLE,
              leadIndicatorName: TACTIC_TITLE,
              isCore: true,
              completed: false,
              tacticId: "tactic_full_review",
            },
          ],
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
      allowLocalAnalytics: false,
      enableInAppReminders: true,
      enableBrowserNotifications: false,
      keepLocalOutbox: true,
      preferredReminderHour: 19,
    },
    subscription: null,
    entitlements: [],
    onboardingCompleted: true,
    isHydratedFromDemo: false,
    experimentAssignments: [],
    emailReminderSchedule: [],
    pushSubscription: null,
    privacyConsents: [],
  };
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    return await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function assertSpaRoute(path) {
  const url = new URL(path, BASE_URL).href;
  const response = await fetchWithTimeout(url);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}`);
  }

  if (!text.includes('<div id="root"')) {
    throw new Error(`${path} did not return the Vite SPA shell`);
  }
}

async function getBodyText(page) {
  return page.locator("body").innerText({ timeout: DEFAULT_TIMEOUT_MS });
}

async function getDiagnostics(page) {
  const text = await getBodyText(page).catch(() => "");
  return `URL: ${page.url()}\nText: ${text.slice(0, 1_500)}`;
}

function assertNoMojibake(text, label) {
  const markers = [
    "\u00c3\u00a1",
    "\u00c3\u00a0",
    "\u00c3\u00a2",
    "\u00c3\u00a3",
    "\u00c3\u00a9",
    "\u00c3\u00a8",
    "\u00c3\u00aa",
    "\u00c3\u00ad",
    "\u00c3\u00ac",
    "\u00c3\u00b3",
    "\u00c3\u00b2",
    "\u00c3\u00b4",
    "\u00c3\u00b5",
    "\u00c3\u00ba",
    "\u00c3\u00b9",
    "\u00c3\u00bd",
    "\u00c2\u00b7",
    "\u00c2\u00b0",
    "\u00c4\u2018",
    "\u00c4\u0090",
    "\u00e1\u00ba",
    "\u00e1\u00bb",
    "\u00e2\u20ac",
  ];
  const marker = markers.find((item) => text.includes(item));

  if (marker) {
    const index = text.indexOf(marker);
    const context = text.slice(Math.max(0, index - 120), index + 180);
    throw new Error(`${label} appears to contain mojibake marker ${JSON.stringify(marker)}\nContext: ${context}`);
  }
}

function assertNoVisibleFailure(text, label) {
  const normalized = normalizeText(text);
  const normalizedMarkers = [
    "trang nay vua gap loi",
    "tab cai dat gap loi",
    "phan nay khong tai duoc",
    "khong the tai lich su thanh toan",
  ];
  const rawMarkers = [
    "API Error",
    "Cannot read properties",
    "Failed to fetch dynamically imported module",
    "Provider is temporarily unavailable",
    "Something went wrong",
    "Unexpected token",
  ];
  const normalizedMarker = normalizedMarkers.find((item) => normalized.includes(item));
  const rawMarker = rawMarkers.find((item) => text.includes(item));

  if (normalizedMarker || rawMarker) {
    throw new Error(`${label} shows failure text: ${normalizedMarker ?? rawMarker}`);
  }
}

function assertNoRealBillingDemoCopy(text) {
  const normalized = normalizeText(text);
  const forbidden = [
    "plus demo",
    "mock checkout",
    "checkout dung thu",
    "mo plus demo",
    "chi dung cho ban demo",
    "khong xu ly khoan thu that",
    "mo phong",
    "quyen local",
  ];
  const marker = forbidden.find((item) => normalized.includes(item));
  if (marker) {
    throw new Error(`Production billing still shows demo/mock copy: ${marker}`);
  }
}

async function assertCleanPage(page, label) {
  const text = await getBodyText(page);
  assertNoMojibake(text, label);
  assertNoVisibleFailure(text, label);
}

async function assertNoHorizontalOverflow(page, label) {
  const result = await page.evaluate(() => {
    const doc = document.documentElement;
    const overflow = doc.scrollWidth - doc.clientWidth;
    const offenders = Array.from(document.querySelectorAll("body *"))
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.right - document.documentElement.clientWidth > 8;
      })
      .slice(0, 5)
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        className: String(element.getAttribute("class") ?? "").slice(0, 120),
        text: String(element.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 120),
      }));
    return { clientWidth: doc.clientWidth, scrollWidth: doc.scrollWidth, overflow, offenders };
  });

  if (result.overflow > 8) {
    throw new Error(`${label} has horizontal overflow: ${JSON.stringify(result, null, 2)}`);
  }
}

function isApiUrl(urlValue) {
  try {
    const url = new URL(urlValue);
    return url.pathname.startsWith("/api/") || url.hostname.includes("onrender.com");
  } catch {
    return false;
  }
}

function installNetworkRecorder(page) {
  const apiEvents = [];
  const requestFailures = [];

  page.on("response", (response) => {
    const url = response.url();
    if (!isApiUrl(url)) return;
    apiEvents.push({
      at: Date.now(),
      method: response.request().method(),
      status: response.status(),
      url,
    });
  });

  page.on("requestfailed", (request) => {
    const url = request.url();
    if (!isApiUrl(url)) return;
    requestFailures.push({
      at: Date.now(),
      method: request.method(),
      url,
      errorText: request.failure()?.errorText ?? "request failed",
    });
  });

  return { apiEvents, requestFailures };
}

async function waitForCondition(label, predicate, timeoutMs = DEFAULT_TIMEOUT_MS, intervalMs = 500) {
  const startedAt = Date.now();
  let lastValue;

  while (Date.now() - startedAt < timeoutMs) {
    lastValue = await predicate();
    if (lastValue) return lastValue;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(`Timed out waiting for ${label}. Last value: ${JSON.stringify(lastValue)}`);
}

async function waitForApiSuccess(apiEvents, pattern, label, options = {}) {
  const after = options.after ?? 0;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return waitForCondition(
    label,
    () => {
      const failed = apiEvents.find((event) => event.at >= after && pattern.test(event.url) && event.status >= 400);
      if (failed) {
        throw new Error(`${label} failed with HTTP ${failed.status}: ${failed.method} ${failed.url}`);
      }

      return apiEvents.find(
        (event) => event.at >= after && pattern.test(event.url) && event.status >= 200 && event.status < 300,
      );
    },
    timeoutMs,
  );
}

function getRecentRateLimit(apiEvents, after) {
  return apiEvents.find((event) => event.at >= after && event.status === 429);
}

async function waitForPath(page, expectedPath, label, apiEvents, after, timeoutMs = DEFAULT_TIMEOUT_MS) {
  try {
    return await waitForCondition(
      label,
      () => {
        const rateLimited = getRecentRateLimit(apiEvents, after);
        if (rateLimited) {
          throw new Error(`${label} hit HTTP 429 rate limit: ${rateLimited.method} ${rateLimited.url}`);
        }
        return new URL(page.url()).pathname === expectedPath;
      },
      timeoutMs,
    );
  } catch (error) {
    throw new Error(`${error.message}\n${await getDiagnostics(page)}`);
  }
}

async function waitForBodyText(page, predicate, label, apiEvents, after, timeoutMs = DEFAULT_TIMEOUT_MS) {
  try {
    return await waitForCondition(
      label,
      async () => {
        const rateLimited = getRecentRateLimit(apiEvents, after);
        if (rateLimited) {
          throw new Error(`${label} hit HTTP 429 rate limit: ${rateLimited.method} ${rateLimited.url}`);
        }
        const text = await getBodyText(page);
        return predicate(text) ? text : false;
      },
      timeoutMs,
    );
  } catch (error) {
    throw new Error(`${error.message}\n${await getDiagnostics(page)}`);
  }
}

async function submitEmailAuth(page, { mode, nextPath }) {
  const modeQuery = mode === "signup" ? "mode=signup&" : "";
  await page.goto(`${BASE_URL}/login?${modeQuery}next=${encodeURIComponent(nextPath)}`, {
    waitUntil: "domcontentloaded",
  });
  await page.locator("#login-email").fill(EMAIL);
  await page.locator("#login-password").fill(PASSWORD);
  if (mode === "signup") {
    await page.locator("#login-confirm-password").fill(PASSWORD);
  }
  await page.locator('form button[type="submit"]').click();
  await page.waitForFunction(
    (expectedPath) => location.pathname === expectedPath || Boolean(document.querySelector('[role="alert"]')),
    nextPath,
    { timeout: DEFAULT_TIMEOUT_MS },
  );

  if (new URL(page.url()).pathname === nextPath) {
    return { ok: true, errorText: "" };
  }

  return {
    ok: false,
    errorText: await page.locator('[role="alert"]').innerText().catch(() => ""),
  };
}

async function authenticate(page, nextPath = "/12-week-system") {
  if (!["signin", "signup"].includes(AUTH_MODE)) {
    throw new Error(`PROD_SMOKE_AUTH_MODE must be "signin" or "signup", got ${AUTH_MODE}`);
  }
  if (AUTH_MODE === "signin" && !HAS_PROVIDED_CREDENTIALS) {
    throw new Error("PROD_SMOKE_EMAIL and PROD_SMOKE_PASSWORD are required when PROD_SMOKE_AUTH_MODE=signin");
  }

  log(`${AUTH_MODE === "signup" ? "Creating" : "Signing in with"} production smoke account ${EMAIL}`);
  let outcome = await submitEmailAuth(page, { mode: AUTH_MODE, nextPath });

  if (!outcome.ok && AUTH_MODE === "signup") {
    log(`Signup did not complete (${outcome.errorText || "unknown error"}); trying signin`);
    outcome = await submitEmailAuth(page, { mode: "signin", nextPath });
  }

  if (!outcome.ok) {
    throw new Error(`Email auth failed: ${outcome.errorText || "unknown error"}`);
  }
}

async function seedFullSmokeData(page) {
  const userData = createFullSmokeUserData();
  await page.evaluate(
    ({ serializedUserData, goalId }) => {
      const authOwnerUid = localStorage.getItem("visionboard_user_data:auth_owner_uid");
      const appDataKeys = [
        "visionboard_user_data",
        "latest_12_week_goal_id",
        "latest_12_week_system_goal_id",
        "latest_12_week_plan_goal_id",
      ];
      for (const key of appDataKeys) {
        localStorage.removeItem(key);
      }
      localStorage.setItem("visionboard_user_data", serializedUserData);
      localStorage.setItem("latest_12_week_goal_id", goalId);
      localStorage.setItem("latest_12_week_system_goal_id", goalId);
      localStorage.setItem("latest_12_week_plan_goal_id", goalId);

      if (authOwnerUid) {
        localStorage.setItem("visionboard_user_data:auth_owner_uid", authOwnerUid);
        localStorage.setItem(`visionboard_user_data:auth:${encodeURIComponent(authOwnerUid)}`, serializedUserData);
      }
    },
    {
      serializedUserData: JSON.stringify(userData),
      goalId: GOAL_ID,
    },
  );
}

async function waitForSystemLoaded(page, options = {}) {
  const requireTactic = options.requireTactic ?? true;
  try {
    await page.waitForFunction(
      ({ goalTitle, tacticTitle, requireTactic }) =>
        document.body.innerText.includes(goalTitle) &&
        (!requireTactic || document.body.innerText.includes(tacticTitle)),
      { goalTitle: GOAL_TITLE, tacticTitle: TACTIC_TITLE, requireTactic },
      { timeout: DEFAULT_TIMEOUT_MS },
    );
  } catch (error) {
    throw new Error(`12-week system did not render the seeded plan.\n${await getDiagnostics(page)}\n${error.message}`);
  }
}

async function getGoalSnapshot(page) {
  return page.evaluate(
    ({ goalId, goalTitle }) => {
      const keys = ["visionboard_user_data"];
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (key?.startsWith("visionboard_user_data:auth:")) keys.push(key);
      }

      for (const key of Array.from(new Set(keys))) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;

        try {
          const data = JSON.parse(raw);
          const goal = Array.isArray(data.goals)
            ? data.goals.find((item) => item?.id === goalId || item?.title?.includes(goalTitle))
            : null;
          const system = goal?.twelveWeekSystem;
          if (!system) continue;

          const taskInstances = Array.isArray(system.taskInstances) ? system.taskInstances : [];
          const dailyCheckIns = Array.isArray(system.dailyCheckIns) ? system.dailyCheckIns : [];
          const weeklyReviews = Array.isArray(system.weeklyReviews) ? system.weeklyReviews : [];

          return {
            key,
            title: goal.title,
            taskCount: taskInstances.length,
            completedTaskCount: taskInstances.filter((task) => task.completed).length,
            dailyCheckInCount: dailyCheckIns.length,
            latestDailyCheckIn: dailyCheckIns[dailyCheckIns.length - 1] ?? null,
            weeklyReviewCount: weeklyReviews.length,
            latestWeeklyReview: weeklyReviews[weeklyReviews.length - 1] ?? null,
          };
        } catch {
          continue;
        }
      }

      return null;
    },
    { goalId: GOAL_ID, goalTitle: GOAL_TITLE },
  );
}

async function waitForGoalSnapshot(page, label, predicate, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const startedAt = Date.now();
  let lastSnapshot = null;

  while (Date.now() - startedAt < timeoutMs) {
    lastSnapshot = await getGoalSnapshot(page);
    if (lastSnapshot && predicate(lastSnapshot)) return lastSnapshot;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(
    `Timed out waiting for ${label}.\nLast snapshot: ${JSON.stringify(lastSnapshot, null, 2)}\n${await getDiagnostics(
      page,
    )}`,
  );
}

async function tryClickButtonByNormalizedText(page, normalizedNeedle) {
  return page.evaluate((needle) => {
    const normalize = (value) =>
      String(value)
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/\u0111/g, "d")
        .replace(/\u0110/g, "d")
        .toLowerCase();
    const button = Array.from(document.querySelectorAll("button")).find((candidate) => {
      const text = normalize(candidate.textContent ?? "");
      return !candidate.disabled && text.includes(needle);
    });
    if (!button) return false;
    button.scrollIntoView({ block: "center" });
    button.click();
    return true;
  }, normalizedNeedle);
}

async function clickButtonByNormalizedText(page, normalizedNeedle) {
  const clicked = await tryClickButtonByNormalizedText(page, normalizedNeedle);

  if (!clicked) {
    throw new Error(`Could not find enabled button containing normalized text: ${normalizedNeedle}`);
  }

  return clicked;
}

async function clickFirstTodayTaskCheckbox(page) {
  await page.locator('[data-tour-id="system-today-queue"]').waitFor({ timeout: DEFAULT_TIMEOUT_MS });
  const clicked = await page.evaluate(() => {
    const queue = document.querySelector('[data-tour-id="system-today-queue"]');
    if (!queue) return false;
    const candidates = Array.from(queue.querySelectorAll('[role="checkbox"], input[type="checkbox"]'));
    const checkbox = candidates.find((item) => {
      if (item.disabled) return false;
      if (item.matches?.('input[type="checkbox"]')) return !item.checked;
      return item.getAttribute("aria-checked") !== "true";
    });
    if (!checkbox) return false;
    checkbox.scrollIntoView({ block: "center" });
    checkbox.click();
    return true;
  });

  if (!clicked) {
    throw new Error("Could not find an open Today task checkbox");
  }
}

async function ensureWeeklyReviewFormVisible(page) {
  const reviewFlow = page.locator('[data-testid="weekly-review-flow"]:visible').first();
  if (await reviewFlow.isVisible().catch(() => false)) return;

  await clickButtonByNormalizedText(page, "bat dau review som");

  try {
    await reviewFlow.waitFor({ timeout: DEFAULT_TIMEOUT_MS });
  } catch (error) {
    throw new Error(`Could not open weekly review flow after start-early action.\n${await getDiagnostics(page)}\n${error.message}`);
  }
}

async function getSyncQueueSummary(page) {
  return page.evaluate((goalId) => {
    const raw = localStorage.getItem(`twelve_week_sync_queue:${goalId}`);
    if (!raw) {
      return { totalCount: 0, pendingCount: 0, inFlightCount: 0, failedOrRetryableCount: 0, succeededCount: 0 };
    }

    try {
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed.items) ? parsed.items : [];
      return {
        totalCount: items.length,
        pendingCount: items.filter((item) => item.status === "pending").length,
        inFlightCount: items.filter((item) => item.status === "in_flight").length,
        failedOrRetryableCount: items.filter(
          (item) => item.status === "retry_scheduled" || item.status === "failed_terminal",
        ).length,
        succeededCount: items.filter((item) => item.status === "succeeded").length,
      };
    } catch {
      return { totalCount: 0, pendingCount: 0, inFlightCount: 0, failedOrRetryableCount: 0, succeededCount: 0 };
    }
  }, GOAL_ID);
}

async function waitForSyncQueueIdle(page) {
  return waitForCondition(
    "12-week sync queue idle",
    async () => {
      const summary = await getSyncQueueSummary(page);
      if (
        summary.pendingCount === 0 &&
        summary.inFlightCount === 0 &&
        summary.failedOrRetryableCount === 0
      ) {
        return summary;
      }
      return false;
    },
    60_000,
  );
}

async function assertSettingsSyncTrust(page) {
  await page.goto(`${BASE_URL}/settings#account-sync`, { waitUntil: "domcontentloaded" });

  const readSyncSurface = () =>
    page.evaluate(() => {
      const readText = (selector) =>
        document.querySelector(selector)?.textContent?.trim() ?? "";

      return {
        sectionVisible: Boolean(document.querySelector('[data-testid="settings-sync-section"]')),
        lastSynced: readText('[data-testid="settings-sync-last-synced"]'),
        pendingCopy: readText('[data-testid="settings-sync-pending-count"]'),
        statusCopy: readText('[data-testid="settings-sync-status-copy"]'),
        lastResult: readText('[data-testid="settings-sync-last-result"]'),
        emailUnverifiedVisible: Boolean(
          document.querySelector('[data-testid="settings-sync-email-unverified"]'),
        ),
      };
    });

  let syncSurface;
  try {
    syncSurface = await waitForCondition(
      "settings account-sync trust surface",
      async () => {
        const surface = await readSyncSurface();
        const normalizedLastSynced = normalizeText(surface.lastSynced);
        const normalizedPendingCopy = normalizeText(surface.pendingCopy);
        const normalizedStatusCopy = normalizeText(surface.statusCopy);

        if (!surface.sectionVisible || surface.emailUnverifiedVisible) return false;
        if (
          !normalizedLastSynced ||
          normalizedLastSynced.includes(normalizeText("Chưa có lần đồng bộ tài khoản"))
        ) {
          return false;
        }
        if (!normalizedPendingCopy.includes(normalizeText("Không có thay đổi chờ đồng bộ"))) {
          return false;
        }
        if (
          !normalizedStatusCopy.includes(normalizeText("dữ liệu vẫn được giữ trên thiết bị này")) ||
          !normalizedStatusCopy.includes(normalizeText("sao lưu sẵn sàng"))
        ) {
          return false;
        }
        return surface;
      },
      DEFAULT_TIMEOUT_MS,
    );
  } catch (error) {
    const surface = await readSyncSurface().catch(() => null);
    throw new Error(
      `${error.message}\nLast sync surface: ${JSON.stringify(surface)}\n${await getDiagnostics(page)}`,
    );
  }

  const normalizedLastSynced = normalizeText(syncSurface.lastSynced);
  const normalizedPendingCopy = normalizeText(syncSurface.pendingCopy);
  const normalizedStatusCopy = normalizeText(syncSurface.statusCopy);

  if (!syncSurface.sectionVisible) {
    throw new Error(`Settings sync section did not render.\n${await getDiagnostics(page)}`);
  }

  if (
    !normalizedLastSynced ||
    normalizedLastSynced.includes(normalizeText("Chưa có lần đồng bộ tài khoản"))
  ) {
    throw new Error(
      `Settings sync surface never showed a synced account timestamp.\n${JSON.stringify(syncSurface)}\n${await getDiagnostics(page)}`,
    );
  }

  if (!normalizedPendingCopy.includes(normalizeText("Không có thay đổi chờ đồng bộ"))) {
    throw new Error(
      `Settings sync surface still shows pending account changes after queue drained.\n${JSON.stringify(syncSurface)}\n${await getDiagnostics(page)}`,
    );
  }

  if (
    !normalizedStatusCopy.includes(normalizeText("dữ liệu vẫn được giữ trên thiết bị này")) ||
    !normalizedStatusCopy.includes(normalizeText("sao lưu sẵn sàng"))
  ) {
    throw new Error(
      `Settings sync trust copy missing local-safe synced message.\n${JSON.stringify(syncSurface)}\n${await getDiagnostics(page)}`,
    );
  }

  if (syncSurface.emailUnverifiedVisible) {
    throw new Error(
      `Settings sync surface unexpectedly shows email-unverified blocker after successful backend sync.\n${JSON.stringify(syncSurface)}\n${await getDiagnostics(page)}`,
    );
  }

  if (syncSurface.lastResult && !normalizeText(syncSurface.lastResult).includes(normalizeText("Kết quả gần nhất"))) {
    throw new Error(
      `Settings sync last-result card rendered unexpected copy.\n${JSON.stringify(syncSurface)}\n${await getDiagnostics(page)}`,
    );
  }

  await assertCleanPage(page, "settings account sync");
  await assertNoHorizontalOverflow(page, "settings account sync desktop");
}

async function assertSettingsAccountLifecycleSurface(page) {
  await page.goto(`${BASE_URL}/settings`, { waitUntil: "domcontentloaded" });
  await page.locator('[data-testid="settings-account-export"]').waitFor({ timeout: DEFAULT_TIMEOUT_MS });
  await page.locator('[data-testid="settings-delete-account-open"]').waitFor({ timeout: DEFAULT_TIMEOUT_MS });

  const requiredLinks = ["/privacy", "/terms", "/billing/faq"];
  const missingLinks = [];
  for (const href of requiredLinks) {
    const count = await page.locator(`a[href="${href}"]`).count();
    if (count === 0) missingLinks.push(href);
  }

  if (missingLinks.length > 0) {
    throw new Error(`Settings account lifecycle surface missing legal/support links: ${missingLinks.join(", ")}`);
  }

  await assertCleanPage(page, "settings account lifecycle");
  await assertNoHorizontalOverflow(page, "settings account lifecycle desktop");
}

async function assertMockCheckoutNotExposed(page) {
  await page.goto(`${BASE_URL}/billing/mock-checkout?session=legacy_checkout_test`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction(() => document.body.innerText.length > 0, { timeout: DEFAULT_TIMEOUT_MS });

  const text = await getBodyText(page);
  assertNoMojibake(text, "mock checkout direct route");
  assertNoVisibleFailure(text, "mock checkout direct route");
  assertNoRealBillingDemoCopy(text);
  await assertNoHorizontalOverflow(page, "mock checkout direct route desktop");
}

async function readLoginRecoverySurface(page) {
  return page.evaluate(() => {
    const normalize = (text) =>
      String(text)
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[\u0111\u0110]/g, "d")
        .toLowerCase();
    const findButton = (needle) =>
      Array.from(document.querySelectorAll("button")).find((button) =>
        normalize(button.textContent ?? "").includes(needle),
      );

    return {
      emailFieldVisible: Boolean(document.querySelector("#login-email")),
      passwordFieldVisible: Boolean(document.querySelector("#login-password")),
      forgotPasswordVisible: Boolean(findButton("quen mat khau")),
      resetEmailVisible: Boolean(document.querySelector("#reset-email")),
      sendLinkVisible: Boolean(findButton("gui link")),
      closeResetVisible: Boolean(findButton("dong")),
      confirmPasswordVisible: Boolean(document.querySelector("#login-confirm-password")),
      termsLinkVisible: Boolean(document.querySelector('a[href="/terms"]')),
      privacyLinkVisible: Boolean(document.querySelector('a[href="/privacy"]')),
    };
  });
}

async function assertLoginRecoverySurface(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.locator("#login-email").waitFor({ timeout: DEFAULT_TIMEOUT_MS });

  const signInSurface = await readLoginRecoverySurface(page);
  if (!signInSurface.emailFieldVisible || !signInSurface.passwordFieldVisible || !signInSurface.forgotPasswordVisible) {
    throw new Error(
      `Login sign-in recovery surface is incomplete: ${JSON.stringify(signInSurface)}\n${await getDiagnostics(page)}`,
    );
  }

  const resetCardAlreadyVisible =
    signInSurface.resetEmailVisible && signInSurface.sendLinkVisible && signInSurface.closeResetVisible;
  if (!resetCardAlreadyVisible) {
    const openedResetCard = await clickButtonByNormalizedText(page, "quen mat khau");
    if (!openedResetCard) {
      throw new Error(`Could not open login reset-password card.\n${await getDiagnostics(page)}`);
    }
  }

  await waitForCondition("login reset-password surface", async () => {
    const surface = await readLoginRecoverySurface(page);
    return surface.resetEmailVisible && surface.sendLinkVisible && surface.closeResetVisible ? surface : false;
  }).catch(async (error) => {
    throw new Error(`${error.message}\n${await getDiagnostics(page)}`);
  });

  const closedResetCard = await clickButtonByNormalizedText(page, "dong");
  if (!closedResetCard) {
    throw new Error(`Could not close login reset-password card.\n${await getDiagnostics(page)}`);
  }

  await waitForCondition("login reset-password surface close", async () => {
    const surface = await readLoginRecoverySurface(page);
    return surface.resetEmailVisible ? false : surface;
  }).catch(async (error) => {
    throw new Error(`${error.message}\n${await getDiagnostics(page)}`);
  });

  await page.goto(`${BASE_URL}/login?mode=signup`, { waitUntil: "domcontentloaded" });
  await page.locator("#login-confirm-password").waitFor({ timeout: DEFAULT_TIMEOUT_MS });

  const signUpSurface = await readLoginRecoverySurface(page);
  if (
    !signUpSurface.emailFieldVisible ||
    !signUpSurface.passwordFieldVisible ||
    !signUpSurface.confirmPasswordVisible ||
    !signUpSurface.termsLinkVisible ||
    !signUpSurface.privacyLinkVisible
  ) {
    throw new Error(`Login sign-up trust surface is incomplete: ${JSON.stringify(signUpSurface)}\n${await getDiagnostics(page)}`);
  }

  await assertCleanPage(page, "login recovery surface");
  await assertNoHorizontalOverflow(page, "login recovery surface desktop");
}

async function exerciseTwelveWeekSaveReloadAndSync(page, apiEvents) {
  await page.goto(`${BASE_URL}/12-week-system`, { waitUntil: "domcontentloaded" });
  await seedFullSmokeData(page);
  await page.goto(`${BASE_URL}/12-week-system`, { waitUntil: "domcontentloaded" });
  await waitForSystemLoaded(page);
  await assertCleanPage(page, "12-week system");

  const syncStartedAt = Date.now();

  await clickFirstTodayTaskCheckbox(page);
  await waitForGoalSnapshot(page, "completed Today task in local storage", (snapshot) => {
    return snapshot.completedTaskCount >= 1;
  });

  await page.locator("#daily-note").fill(CHECKIN_NOTE);
  await clickButtonByNormalizedText(page, "luu check-in hom nay");
  await waitForGoalSnapshot(page, "daily check-in in local storage", (snapshot) => {
    return snapshot.dailyCheckInCount >= 1;
  });

  await page.locator('[data-tour-id="twelve-week-tab-week"]').click();
  await page.locator('[data-testid="weekly-review-shell"]').waitFor({ timeout: DEFAULT_TIMEOUT_MS });
  await ensureWeeklyReviewFormVisible(page);
  await page.locator("#weekly-insights").waitFor({ timeout: DEFAULT_TIMEOUT_MS });
  await page.locator("#weekly-next-commitments").waitFor({ timeout: DEFAULT_TIMEOUT_MS });
  await page.locator("#weekly-insights").fill(WEEKLY_REVIEW_OUTPUT);
  await page.locator("#weekly-next-commitments").fill(WEEKLY_REVIEW_PRIORITY);
  await page.locator("#weekly-next-commitments").press("Enter");
  await clickButtonByNormalizedText(page, "chot review tuan nay");
  await tryClickButtonByNormalizedText(page, "van luu som");
  await waitForGoalSnapshot(page, "weekly review in local storage", (snapshot) => {
    return (
      snapshot.weeklyReviewCount >= 1 &&
      snapshot.latestWeeklyReview?.insights === WEEKLY_REVIEW_OUTPUT &&
      snapshot.latestWeeklyReview?.nextWeekCommitments?.includes(WEEKLY_REVIEW_PRIORITY)
    );
  });

  await waitForApiSuccess(apiEvents, /\/api\/(plans|tasks|weeks|metrics)(?:\/|$)/, "12-week backend sync", {
    after: syncStartedAt,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  });
  await waitForSyncQueueIdle(page);

  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForSystemLoaded(page);
  await waitForGoalSnapshot(page, "12-week state persisted after reload", (snapshot) => {
    return (
      snapshot.completedTaskCount >= 1 &&
      snapshot.dailyCheckInCount >= 1 &&
      snapshot.latestDailyCheckIn?.optionalNote === CHECKIN_NOTE &&
      snapshot.weeklyReviewCount >= 1 &&
      snapshot.latestWeeklyReview?.insights === WEEKLY_REVIEW_OUTPUT &&
      snapshot.latestWeeklyReview?.nextWeekCommitments?.includes(WEEKLY_REVIEW_PRIORITY)
    );
  });
  await assertNoHorizontalOverflow(page, "12-week desktop");
  await assertSettingsSyncTrust(page);
}

async function exerciseBilling(page, apiEvents) {
  const billingStartedAt = Date.now();
  await seedFullSmokeData(page);
  await page.goto(`${BASE_URL}/billing`, { waitUntil: "domcontentloaded" });
  await waitForPath(page, "/billing/plan", "billing plan route", apiEvents, billingStartedAt);
  await waitForBodyText(page, (text) => text.includes("Plus"), "billing Plus copy", apiEvents, billingStartedAt);
  await waitForApiSuccess(apiEvents, /\/api\/billing\/payment-history(?:\?|$)/, "billing payment history", {
    after: billingStartedAt,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  });

  const text = await getBodyText(page);
  assertNoMojibake(text, "billing plan");
  assertNoVisibleFailure(text, "billing plan");
  assertNoRealBillingDemoCopy(text);
  await assertNoHorizontalOverflow(page, "billing desktop");

  if ((await page.locator('[data-testid="paid-checkout-disabled-banner"]').count()) > 0) {
    await assertPaidCheckoutLocked(page, apiEvents);
    log("Paid checkout kill-switch is active; verified locked billing confirm flow instead of creating a checkout QR");
    return;
  }

  if (SKIP_CHECKOUT) {
    log("Skipping checkout QR creation because PROD_SMOKE_SKIP_CHECKOUT=1");
    return;
  }

  const checkoutStartedAt = Date.now();
  await seedFullSmokeData(page);
  await page.goto(`${BASE_URL}/billing/checkout`, { waitUntil: "domcontentloaded" });
  await waitForApiSuccess(apiEvents, /\/api\/billing\/checkout-session(?:\?|$)/, "billing checkout session", {
    after: checkoutStartedAt,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  });
  await waitForCondition(
    "checkout order route",
    () => {
      const rateLimited = getRecentRateLimit(apiEvents, checkoutStartedAt);
      if (rateLimited) {
        throw new Error(`checkout order route hit HTTP 429 rate limit: ${rateLimited.method} ${rateLimited.url}`);
      }
      return /^\/billing\/checkout\/VB[A-Z0-9]{8,12}$/.test(new URL(page.url()).pathname);
    },
    DEFAULT_TIMEOUT_MS,
  ).catch(async (error) => {
    throw new Error(`${error.message}\n${await getDiagnostics(page)}`);
  });
  await waitForApiSuccess(apiEvents, /\/api\/billing\/order-status\/VB[A-Z0-9]{8,12}(?:\?|$)/, "billing order status", {
    after: checkoutStartedAt,
    timeoutMs: DEFAULT_TIMEOUT_MS,
  });
  await waitForCondition(
    "checkout QR content",
    async () => {
      const rateLimited = getRecentRateLimit(apiEvents, checkoutStartedAt);
      if (rateLimited) {
        throw new Error(`checkout QR content hit HTTP 429 rate limit: ${rateLimited.method} ${rateLimited.url}`);
      }
      return page.evaluate(() => {
        const textContent = document.body.innerText;
        const hasOrderId = /VB[A-Z0-9]{8,12}/.test(textContent);
        const hasQrImage = Array.from(document.images).some((image) => image.src.includes("vietqr"));
        return /vietqr/i.test(textContent) && hasOrderId && hasQrImage;
      });
    },
    DEFAULT_TIMEOUT_MS,
  ).catch(async (error) => {
    throw new Error(`${error.message}\n${await getDiagnostics(page)}`);
  });

  const checkoutText = await getBodyText(page);
  assertNoMojibake(checkoutText, "billing checkout");
  assertNoVisibleFailure(checkoutText, "billing checkout");
  await assertNoHorizontalOverflow(page, "checkout desktop");
}

async function assertPaidCheckoutLocked(page, apiEvents) {
  const startedAt = Date.now();
  await page.goto(`${BASE_URL}/billing/confirm`, { waitUntil: "domcontentloaded" });
  await page.locator('[data-testid="paid-checkout-disabled-banner"]').waitFor({ timeout: DEFAULT_TIMEOUT_MS });
  await assertCleanPage(page, "billing confirm locked checkout");

  await page.waitForTimeout(1_000);
  const checkoutPosts = apiEvents.filter((event) => {
    if (event.at < startedAt || event.method !== "POST") return false;
    return /\/api\/billing\/(?:public-)?checkout-session(?:\?|$)/.test(event.url);
  });

  if (checkoutPosts.length > 0) {
    throw new Error(
      `Paid checkout lock leaked checkout-session POSTs:\n${checkoutPosts.map((item) => JSON.stringify(item)).join("\n")}`,
    );
  }
}

async function exerciseResponsiveQa(page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE_URL}/12-week-system?tab=progress`, { waitUntil: "domcontentloaded" });
  await page.locator('[data-testid="progress-trend-hero"]').waitFor({ timeout: DEFAULT_TIMEOUT_MS });
  await waitForSystemLoaded(page, { requireTactic: false });
  await assertCleanPage(page, "12-week mobile progress");
  await assertNoHorizontalOverflow(page, "12-week mobile progress");

  await page.goto(`${BASE_URL}/billing/plan`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.body.innerText.includes("Plus"), { timeout: DEFAULT_TIMEOUT_MS });
  await assertCleanPage(page, "billing mobile");
  await assertNoHorizontalOverflow(page, "billing mobile");
}

async function run() {
  log(`Target: ${BASE_URL}`);
  if (!HAS_PROVIDED_CREDENTIALS) {
    if (!ALLOW_GENERATED_ACCOUNT) {
      throw new Error(
        "PROD_SMOKE_EMAIL and PROD_SMOKE_PASSWORD are required. Set PROD_SMOKE_ALLOW_GENERATED_ACCOUNT=1 to explicitly create a generated production QA account.",
      );
    }
    log(`No PROD_SMOKE_EMAIL/PROD_SMOKE_PASSWORD provided; using generated QA account ${EMAIL}`);
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
    viewport: { width: 1366, height: 900 },
  });
  const page = await context.newPage();
  const pageErrors = [];
  const { apiEvents, requestFailures } = installNetworkRecorder(page);

  page.setDefaultTimeout(DEFAULT_TIMEOUT_MS);
  page.setDefaultNavigationTimeout(DEFAULT_TIMEOUT_MS);
  page.on("pageerror", (error) => pageErrors.push(error.message));

  try {
    await step("SPA shell and protected-route rewrite", async () => {
      await assertSpaRoute("/");
      await assertSpaRoute("/12-week-system");
      await assertSpaRoute("/billing/checkout");
    });

    await step("Signed-out home loads cleanly", async () => {
      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => document.body.innerText.length > 0);
      const text = await getBodyText(page);
      if (!hasProductBrand(text)) {
        throw new Error("Home did not render the product brand");
      }
      await assertCleanPage(page, "signed-out home");
      await assertNoHorizontalOverflow(page, "signed-out home desktop");
    });

    await step("Production does not expose mock checkout surface", async () => {
      await assertMockCheckoutNotExposed(page);
    });

    await step("Login recovery and legal trust surface is reachable", async () => {
      await assertLoginRecoverySurface(page);
    });

    await step("Authentication", async () => {
      await authenticate(page, "/12-week-system");
      await assertCleanPage(page, "authenticated workspace");
    });

    await step("Settings account lifecycle actions are reachable", async () => {
      await assertSettingsAccountLifecycleSurface(page);
    });

    await step("12-week save, reload, and backend sync", async () => {
      await exerciseTwelveWeekSaveReloadAndSync(page, apiEvents);
    });

    await step("Billing management and Casso VietQR checkout", async () => {
      await exerciseBilling(page, apiEvents);
    });

    await step("Responsive desktop/mobile QA", async () => {
      await exerciseResponsiveQa(page);
    });

    const significantRequestFailures = requestFailures.filter((item) => !item.errorText.includes("ERR_ABORTED"));
    if (significantRequestFailures.length > 0) {
      throw new Error(
        `API request failures:\n${significantRequestFailures.map((item) => JSON.stringify(item)).join("\n")}`,
      );
    }

    const severeApiFailures = apiEvents.filter((event) => event.status === 429 || event.status >= 500);
    if (severeApiFailures.length > 0) {
      throw new Error(`Severe API failures:\n${severeApiFailures.map((item) => JSON.stringify(item)).join("\n")}`);
    }

    if (pageErrors.length > 0) {
      throw new Error(`Browser page errors:\n${pageErrors.join("\n")}`);
    }

    log("Production smoke passed");
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(`[prod-smoke] FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
