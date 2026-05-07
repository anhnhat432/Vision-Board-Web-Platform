#!/usr/bin/env node

import { chromium } from "playwright";

const BASE_URL = (process.env.PROD_SMOKE_URL ?? "https://vision-board-web-platform.vercel.app").replace(/\/$/, "");
const TIMESTAMP = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const GENERATED_EMAIL = `codex.qa+quick-smoke-${TIMESTAMP}@example.com`;
const GENERATED_PASSWORD = `CodexQuickSmoke${TIMESTAMP}!`;
const EMAIL = process.env.PROD_SMOKE_EMAIL?.trim() || GENERATED_EMAIL;
const PASSWORD = process.env.PROD_SMOKE_PASSWORD || GENERATED_PASSWORD;
const HAS_PROVIDED_CREDENTIALS = Boolean(process.env.PROD_SMOKE_EMAIL && process.env.PROD_SMOKE_PASSWORD);
const AUTH_MODE_OVERRIDE = process.env.PROD_SMOKE_AUTH_MODE?.trim().toLowerCase();
const AUTH_MODE = AUTH_MODE_OVERRIDE || (HAS_PROVIDED_CREDENTIALS ? "signin" : "signup");
const GOAL_ID = `goal_quick_smoke_${TIMESTAMP}`;
const GOAL_TITLE = `Quick smoke production ${TIMESTAMP}`;
const TACTIC_TITLE = "Review execution rhythm";
const TODAY_TASK_TITLE = `Quick smoke today task ${TIMESTAMP}`;
const DEFAULT_TIMEOUT_MS = Number(process.env.PROD_QUICK_SMOKE_TIMEOUT_MS ?? 30_000);

function log(message) {
  console.log(`[prod-quick-smoke] ${message}`);
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

async function step(label, action) {
  const startedAt = Date.now();
  log(`START ${label}`);
  await action();
  log(`PASS ${label} (${Date.now() - startedAt}ms)`);
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

function createQuickSmokeUserData() {
  const now = new Date();
  const today = formatDate(now);
  const endDate = formatDate(addDays(now, 83));
  const createdAt = now.toISOString();

  const weeklyPlans = Array.from({ length: 12 }, (_, index) => {
    const weekNumber = index + 1;
    return {
      weekNumber,
      phaseName: weekNumber <= 4 ? "Foundation" : weekNumber <= 8 ? "Build" : "Finish",
      focus: weekNumber === 1 ? "Keep the execution rhythm visible" : `Week ${weekNumber} execution rhythm`,
      milestone: weekNumber === 4 || weekNumber === 8 || weekNumber === 12 ? `Milestone week ${weekNumber}` : "",
      completed: false,
    };
  });

  const scoreboard = Array.from({ length: 12 }, (_, index) => ({
    weekNumber: index + 1,
    leadCompletionPercent: index === 0 ? 25 : 0,
    mainMetricProgress: index === 0 ? "1/12" : "",
    outputDone: index === 0 ? "Quick smoke output" : "",
    reviewDone: false,
    weeklyScore: index === 0 ? 24 : 0,
  }));

  return {
    storageVersion: 5,
    userId: "quick_smoke_user",
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
        description: "Seeded quick smoke goal for production route checks.",
        deadline: endDate,
        tasks: [{ id: "task_goal_quick", title: TODAY_TASK_TITLE, completed: false }],
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
              id: "tactic_quick_review",
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
          successEvidence: "The 12-week system opens with a seeded local plan.",
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
              id: "task_quick_today",
              weekNumber: 1,
              scheduledDate: today,
              title: TODAY_TASK_TITLE,
              leadIndicatorName: TACTIC_TITLE,
              isCore: true,
              completed: false,
              tacticId: "tactic_quick_review",
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

function assertNoMojibake(text, label) {
  const markers = [
    "Ã¡",
    "Ã ",
    "Ã¢",
    "Ã£",
    "Ã©",
    "Ã¨",
    "Ãª",
    "Ã­",
    "Ã¬",
    "Ã³",
    "Ã²",
    "Ã´",
    "Ãµ",
    "Ãº",
    "Ã¹",
    "Ã½",
    "Â·",
    "Â°",
    "Ä",
    "Æ",
    "áº",
    "á»",
    "â€",
    "â€¦",
    "âœ",
  ];
  const marker = markers.find((item) => text.includes(item));

  if (marker) {
    const index = text.indexOf(marker);
    const context = text.slice(Math.max(0, index - 120), index + 180);
    throw new Error(`${label} appears to contain mojibake marker ${JSON.stringify(marker)}\nContext: ${context}`);
  }
}

function assertNoVisibleFailure(text, label) {
  const markers = [
    "API Error",
    "Provider is temporarily unavailable",
    "Something went wrong",
    "Unexpected token",
    "Failed to fetch",
    "Cannot read properties",
  ];
  const marker = markers.find((item) => text.includes(item));

  if (marker) {
    throw new Error(`${label} shows failure text: ${marker}`);
  }
}

async function getBodyText(page) {
  return page.locator("body").innerText({ timeout: DEFAULT_TIMEOUT_MS });
}

async function getDiagnostics(page) {
  const text = await getBodyText(page).catch(() => "");
  return `URL: ${page.url()}\nText: ${text.slice(0, 1_200)}`;
}

async function seedQuickSmokeData(page) {
  const userData = createQuickSmokeUserData();
  await page.evaluate(
    ({ serializedUserData, goalId }) => {
      const authOwnerUid = localStorage.getItem("visionboard_user_data:auth_owner_uid");
      localStorage.clear();
      sessionStorage.clear();
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

async function submitEmailAuth(page, { mode, nextPath }) {
  const modeQuery = mode === "signup" ? "mode=signup&" : "";
  await page.goto(`${BASE_URL}/login?${modeQuery}next=${encodeURIComponent(nextPath)}`, {
    waitUntil: "domcontentloaded",
  });
  await page.locator("#login-email").fill(EMAIL);
  await page.locator("#login-password").fill(PASSWORD);
  await page.locator('form button[type="submit"]').click();
  await page.waitForFunction(
    (expectedPath) => location.pathname === expectedPath || Boolean(document.querySelector('[role="alert"]')),
    nextPath,
    { timeout: 60_000 },
  );

  if (new URL(page.url()).pathname === nextPath) {
    return { ok: true, errorText: "" };
  }

  return {
    ok: false,
    errorText: await page.locator('[role="alert"]').innerText().catch(() => ""),
  };
}

async function authenticateIfRequired(page, nextPath) {
  if (new URL(page.url()).pathname !== "/login") return;

  if (!["signin", "signup"].includes(AUTH_MODE)) {
    throw new Error(`Invalid PROD_SMOKE_AUTH_MODE=${AUTH_MODE}`);
  }

  log(`${AUTH_MODE === "signup" ? "Creating" : "Signing in with"} quick smoke account ${EMAIL}`);
  let outcome = await submitEmailAuth(page, { mode: AUTH_MODE, nextPath });

  if (!outcome.ok && AUTH_MODE === "signup") {
    log(`Signup did not complete (${outcome.errorText || "unknown error"}); trying signin`);
    outcome = await submitEmailAuth(page, { mode: "signin", nextPath });
  }

  if (!outcome.ok) {
    throw new Error(`Email auth failed for quick smoke account: ${outcome.errorText || "unknown error"}`);
  }
}

async function waitForLoginRedirect(page, timeoutMs = 4_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const path = new URL(page.url()).pathname;
    if (path === "/login") return true;

    const hasLoginForm = await page.locator("#login-email").count().catch(() => 0);
    if (hasLoginForm > 0) return true;

    await page.waitForTimeout(250);
  }

  return new URL(page.url()).pathname === "/login";
}

async function clickDialogUpgradeButton(page) {
  const label = await page.locator('[role="dialog"] button').evaluateAll((buttons) => {
    const normalizeButtonText = (text) =>
      text
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[đĐ]/g, "d")
        .toLowerCase();
    const candidates = buttons.filter((button) => {
      const text = button.textContent?.trim() ?? "";
      return !button.disabled && !/de sau|later|dang dung|current/i.test(normalizeButtonText(text));
    });
    const target =
      candidates.find((button) => /plus|pro|upgrade|mo|demo/i.test(normalizeButtonText(button.textContent ?? ""))) ??
      candidates[0];
    target?.click();
    return target?.textContent?.trim() ?? "";
  });

  if (!label) {
    throw new Error("Could not find an enabled upgrade button in the paywall dialog");
  }

  log(`Clicked dialog upgrade button: ${label}`);
}

async function run() {
  const unexpectedBackendRequests = [];
  const pageErrors = [];
  let authWasRequired = false;
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(DEFAULT_TIMEOUT_MS);
  page.setDefaultNavigationTimeout(DEFAULT_TIMEOUT_MS);

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  page.on("request", (request) => {
    const url = new URL(request.url());
    const isBackendHost = url.hostname.includes("onrender.com");
    const isApiPathOnAppHost = url.origin === BASE_URL && url.pathname.startsWith("/api/");

    if (isBackendHost || isApiPathOnAppHost) {
      unexpectedBackendRequests.push(request.url());
    }
  });

  try {
    await step("SPA shell and Vercel rewrite", async () => {
      await assertSpaRoute("/");
      await assertSpaRoute("/12-week-system");
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

      if (!text.includes("Dear Our Future")) {
        throw new Error("Home did not render the product brand");
      }

      assertNoMojibake(text, "signed-out home");
      assertNoVisibleFailure(text, "signed-out home");
    });

    await step("Seeded 12-week system loads from localStorage", async () => {
      await page.goto(`${BASE_URL}/12-week-system`, { waitUntil: "domcontentloaded" });
      if (await waitForLoginRedirect(page)) {
        authWasRequired = true;
        await authenticateIfRequired(page, "/12-week-system");
      }
      await seedQuickSmokeData(page);
      await page.goto(`${BASE_URL}/12-week-system`, { waitUntil: "domcontentloaded" });
      if (await waitForLoginRedirect(page, 2_000)) {
        authWasRequired = true;
        await authenticateIfRequired(page, "/12-week-system");
        await seedQuickSmokeData(page);
        await page.goto(`${BASE_URL}/12-week-system`, { waitUntil: "domcontentloaded" });
      }
      try {
        await page.waitForFunction(
          ({ goalTitle, tacticTitle }) =>
            document.body.innerText.includes(goalTitle) && document.body.innerText.includes(tacticTitle),
          { goalTitle: GOAL_TITLE, tacticTitle: TACTIC_TITLE },
        );
      } catch (error) {
        throw new Error(`Seeded 12-week system did not render.\n${await getDiagnostics(page)}\n${error.message}`);
      }

      const text = await getBodyText(page);
      assertNoMojibake(text, "12-week system");
      assertNoVisibleFailure(text, "12-week system");
    });

    await step("Progress tab renders for seeded plan", async () => {
      await page.goto(`${BASE_URL}/12-week-system?tab=progress`, { waitUntil: "domcontentloaded" });
      await page.locator('[data-testid="progress-trend-hero"]').waitFor();
      await page.waitForFunction((goalTitle) => document.body.innerText.includes(goalTitle), GOAL_TITLE);

      const text = await getBodyText(page);
      assertNoMojibake(text, "progress tab");
      assertNoVisibleFailure(text, "progress tab");
    });

    await step("Mock upgrade completes locally", async () => {
      await page.goto(`${BASE_URL}/billing/plan`, { waitUntil: "domcontentloaded" });
      await page.getByRole("button", { name: /Plus demo/i }).first().click();
      const dialog = page.locator('[role="dialog"]');
      await dialog.waitFor();
      await clickDialogUpgradeButton(page);
      await page.waitForURL(/\/billing\/mock-checkout\?session=/, { timeout: DEFAULT_TIMEOUT_MS });
      await page.getByRole("button", { name: /\(demo\)/i }).click();
      await page.waitForFunction(() => {
        const raw = localStorage.getItem("visionboard_user_data");
        if (!raw) return false;
        const data = JSON.parse(raw);
        return data.subscription?.planCode === "PLUS" && data.subscription?.status === "active";
      });

      const account = await page.evaluate(() => {
        const raw = localStorage.getItem("visionboard_mock_billing_account");
        return raw ? JSON.parse(raw) : null;
      });

      if (account?.planCode !== "PLUS" || account?.status !== "active") {
        throw new Error("Mock billing account was not activated locally");
      }
    });

    if (pageErrors.length > 0) {
      throw new Error(`Browser page errors:\n${pageErrors.join("\n")}`);
    }

    if (!authWasRequired && unexpectedBackendRequests.length > 0) {
      throw new Error(`Demo mode made unexpected backend requests:\n${unexpectedBackendRequests.join("\n")}`);
    }

    log("Quick production smoke passed");
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
