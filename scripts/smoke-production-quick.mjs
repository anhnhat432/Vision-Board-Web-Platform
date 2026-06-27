#!/usr/bin/env node

import { chromium } from "playwright";

const BASE_URL = (process.env.PROD_SMOKE_URL ?? "https://vision-board-web-platform.vercel.app").replace(/\/$/, "");
const TIMESTAMP = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const GENERATED_EMAIL = `codex.qa+quick-smoke-${TIMESTAMP}@example.com`;
const GENERATED_PASSWORD = `CodexQuickSmoke${TIMESTAMP}!`;
const EMAIL = process.env.PROD_SMOKE_EMAIL?.trim() || GENERATED_EMAIL;
const PASSWORD = process.env.PROD_SMOKE_PASSWORD || GENERATED_PASSWORD;
const HAS_PROVIDED_CREDENTIALS = Boolean(process.env.PROD_SMOKE_EMAIL && process.env.PROD_SMOKE_PASSWORD);
const ALLOW_GENERATED_ACCOUNT = process.env.PROD_SMOKE_ALLOW_GENERATED_ACCOUNT === "1";
const REQUIRE_VERIFIED_SYNC = process.env.PROD_SMOKE_REQUIRE_VERIFIED_SYNC === "1";
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

function normalizeText(text) {
  return String(text)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[\u0111\u0110]/g, "d")
    .toLowerCase();
}

function hasProductBrand(text) {
  return normalizeText(text).includes("dear our future");
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

function assertNoRealBillingDemoCopy(text) {
  const normalized = normalizeText(text);
  const forbidden = [
    "plus demo",
    "mock checkout",
    "checkout dung thu",
    "mo plus demo",
    "chi dung cho ban demo",
    "khong xu ly khoan thu that",
  ];
  const marker = forbidden.find((item) => normalized.includes(item));

  if (marker) {
    throw new Error(`Production surface still shows demo/mock billing copy: ${marker}`);
  }
}

async function waitForCondition(label, predicate, timeoutMs = DEFAULT_TIMEOUT_MS, intervalMs = 500) {
  const startedAt = Date.now();
  let lastValue;

  while (Date.now() - startedAt < timeoutMs) {
    lastValue = await predicate();
    if (lastValue) return lastValue;
    await pageWait(intervalMs);
  }

  throw new Error(`Timed out waiting for ${label}. Last value: ${JSON.stringify(lastValue)}`);
}

async function pageWait(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function seedQuickSmokeData(page) {
  const userData = createQuickSmokeUserData();
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

async function clickButtonByNormalizedText(page, normalizedNeedle) {
  return page.evaluate((needle) => {
    const normalizeButtonText = (text) =>
      String(text)
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[\u0111\u0110]/g, "d")
        .toLowerCase();
    const button = Array.from(document.querySelectorAll("button")).find((candidate) => {
      if (candidate.disabled) return false;
      return normalizeButtonText(candidate.textContent ?? "").includes(needle);
    });
    if (!button) return false;
    button.scrollIntoView({ block: "center" });
    button.click();
    return true;
  }, normalizedNeedle);
}

async function readSettingsSyncSurface(page) {
  return page.evaluate(() => {
    const readText = (selector) =>
      document.querySelector(selector)?.textContent?.trim() ?? "";
    const syncButton = Array.from(document.querySelectorAll("button")).find((button) =>
      String(button.textContent ?? "")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[\u0111\u0110]/g, "d")
        .toLowerCase()
        .includes("kiem tra sao luu"),
    );

    return {
      sectionVisible: Boolean(document.querySelector('[data-testid="settings-sync-section"]')),
      lastSynced: readText('[data-testid="settings-sync-last-synced"]'),
      pendingCopy: readText('[data-testid="settings-sync-pending-count"]'),
      statusCopy: readText('[data-testid="settings-sync-status-copy"]'),
      emailUnverifiedCopy: readText('[data-testid="settings-sync-email-unverified"]'),
      syncButtonDisabled: syncButton?.disabled ?? null,
    };
  });
}

function classifySettingsSyncSurface(surface) {
  const lastSynced = normalizeText(surface.lastSynced);
  const pendingCopy = normalizeText(surface.pendingCopy);
  const statusCopy = normalizeText(surface.statusCopy);
  const emailUnverifiedCopy = normalizeText(surface.emailUnverifiedCopy);
  const hasLocalSafeCopy = statusCopy.includes("du lieu van") && statusCopy.includes("thiet bi");

  if (!surface.sectionVisible || !hasLocalSafeCopy) return false;

  if (
    !lastSynced.includes("chua co lan dong bo tai khoan") &&
    pendingCopy.includes("khong co thay doi cho dong bo")
  ) {
    return "synced";
  }

  if (
    emailUnverifiedCopy.includes("email chua xac thuc") ||
    statusCopy.includes("chua the sao luu len tai khoan")
  ) {
    return "email_unverified";
  }

  // Tài khoản sạch/đã đăng nhập, email đã xác thực, sao lưu sẵn sàng nhưng chưa
  // từng đồng bộ (vd warmup chạy trước khi seed dữ liệu). Đây vẫn là trạng thái
  // trust lành mạnh: không có blocker email và không có lỗi đồng bộ.
  if (statusCopy.includes("sao luu san sang") && pendingCopy.includes("khong co thay doi cho dong bo")) {
    return "ready";
  }

  return false;
}

async function assertSettingsSyncTrust(page) {
  await page.goto(`${BASE_URL}/settings#account-sync`, { waitUntil: "domcontentloaded" });
  if (await waitForLoginRedirect(page, 2_000)) {
    await authenticateIfRequired(page, "/settings");
    await page.goto(`${BASE_URL}/settings#account-sync`, { waitUntil: "domcontentloaded" });
  }

  await page.locator('[data-testid="settings-sync-section"]').waitFor();
  let clickedSyncButton = await clickButtonByNormalizedText(page, "kiem tra sao luu");
  if (!clickedSyncButton) {
    const surface = await readSettingsSyncSurface(page);
    if (surface.syncButtonDisabled === true) {
      await authenticateWithSmokeAccount(page, "/settings");
      await page.goto(`${BASE_URL}/settings#account-sync`, { waitUntil: "domcontentloaded" });
      await page.locator('[data-testid="settings-sync-section"]').waitFor();
      clickedSyncButton = await clickButtonByNormalizedText(page, "kiem tra sao luu");
    }
  }

  if (!clickedSyncButton) {
    throw new Error(
      `Could not click account sync check button.\nLast sync surface: ${JSON.stringify(await readSettingsSyncSurface(page).catch(() => null))}\n${await getDiagnostics(page)}`,
    );
  }

  const surface = await waitForCondition(
    "settings account sync trust state",
    async () => {
      const nextSurface = await readSettingsSyncSurface(page);
      const state = classifySettingsSyncSurface(nextSurface);
      return state ? { state, ...nextSurface } : false;
    },
    DEFAULT_TIMEOUT_MS,
  ).catch(async (error) => {
    throw new Error(
      `${error.message}\nLast sync surface: ${JSON.stringify(await readSettingsSyncSurface(page).catch(() => null))}\n${await getDiagnostics(page)}`,
    );
  });

  const text = await getBodyText(page);
  assertNoMojibake(text, "settings account sync");
  assertNoVisibleFailure(text, "settings account sync");
  if (REQUIRE_VERIFIED_SYNC && surface.state === "email_unverified") {
    throw new Error(
      `PROD_SMOKE_REQUIRE_VERIFIED_SYNC=1 but PROD_SMOKE_EMAIL is email-unverified for sync. Backend /api/sync/12-week/* routes require verified email, so full production smoke cannot pass. Verify the smoke account email or replace the secret.\nLast sync surface: ${JSON.stringify(
        surface,
      )}\n${await getDiagnostics(page)}`,
    );
  }
  log(`Settings account sync trust state: ${surface.state}`);
}

async function ensureSettingsSignedIn(page) {
  await page.goto(`${BASE_URL}/settings`, { waitUntil: "domcontentloaded" });
  if (await waitForLoginRedirect(page, 2_000)) {
    await authenticateIfRequired(page, "/settings");
    await page.goto(`${BASE_URL}/settings`, { waitUntil: "domcontentloaded" });
  }

  if ((await page.locator('[data-testid="settings-account-export"]').count()) === 0) {
    await authenticateWithSmokeAccount(page, "/settings");
    await page.goto(`${BASE_URL}/settings`, { waitUntil: "domcontentloaded" });
  }
}

async function assertSettingsAccountLifecycleSurface(page) {
  await ensureSettingsSignedIn(page);
  await page.locator('[data-testid="settings-account-export"]').waitFor();
  await page.locator('[data-testid="settings-delete-account-open"]').waitFor();

  const requiredLinks = ["/privacy", "/terms", "/billing/faq"];
  const missingLinks = [];
  for (const href of requiredLinks) {
    const count = await page.locator(`a[href="${href}"]`).count();
    if (count === 0) missingLinks.push(href);
  }

  if (missingLinks.length > 0) {
    throw new Error(`Settings account lifecycle surface missing legal/support links: ${missingLinks.join(", ")}`);
  }

  const text = await getBodyText(page);
  assertNoMojibake(text, "settings account lifecycle");
  assertNoVisibleFailure(text, "settings account lifecycle");
}

async function assertMockCheckoutNotExposed(page) {
  await page.goto(`${BASE_URL}/billing/mock-checkout?session=legacy_checkout_test`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForFunction(() => document.body.innerText.length > 0);

  const text = await getBodyText(page);
  assertNoMojibake(text, "mock checkout direct route");
  assertNoVisibleFailure(text, "mock checkout direct route");
  assertNoRealBillingDemoCopy(text);
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
  await page.locator("#login-email").waitFor();

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
  await page.locator("#login-confirm-password").waitFor();

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

  const text = await getBodyText(page);
  assertNoMojibake(text, "login recovery surface");
  assertNoVisibleFailure(text, "login recovery surface");
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

async function authenticateWithSmokeAccount(page, nextPath) {
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

async function authenticateIfRequired(page, nextPath) {
  if (new URL(page.url()).pathname !== "/login") return;
  await authenticateWithSmokeAccount(page, nextPath);
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

  if (!HAS_PROVIDED_CREDENTIALS && !ALLOW_GENERATED_ACCOUNT) {
    throw new Error(
      "PROD_SMOKE_EMAIL and PROD_SMOKE_PASSWORD are required. Set PROD_SMOKE_ALLOW_GENERATED_ACCOUNT=1 to explicitly create a generated production QA account.",
    );
  }

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

      if (!hasProductBrand(text)) {
        throw new Error("Home did not render the product brand");
      }

      assertNoMojibake(text, "signed-out home");
      assertNoVisibleFailure(text, "signed-out home");
    });

    await step("Production does not expose mock checkout surface", async () => {
      await assertMockCheckoutNotExposed(page);
    });

    await step("Login recovery and legal trust surface is reachable", async () => {
      await assertLoginRecoverySurface(page);
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

    await step("Settings account sync trust surface is visible", async () => {
      await assertSettingsSyncTrust(page);
    });

    await step("Settings account lifecycle actions are reachable", async () => {
      await assertSettingsAccountLifecycleSurface(page);
    });

    await step("Production billing management loads", async () => {
      // Bắt HTTP status + lỗi mạng thật của payment-history để chẩn đoán khi lỗi.
      let lastPaymentHistoryStatus = null;
      let lastPaymentHistoryFailure = null;
      const onResponse = (response) => {
        if (response.url().includes("/billing/payment-history")) {
          lastPaymentHistoryStatus = response.status();
        }
      };
      const onRequestFailed = (request) => {
        if (request.url().includes("/billing/payment-history")) {
          lastPaymentHistoryFailure = request.failure()?.errorText ?? "unknown_failure";
        }
      };
      page.on("response", onResponse);
      page.on("requestfailed", onRequestFailed);

      try {
        // payment-history có timeout phía client 8s và phải chờ MongoDB (updateMany + 2 query).
        // Trên hạ tầng free-tier, lần tải đầu sau cold-start dễ vượt 8s -> state "error".
        // Thử lại vài lần để backend/DB ấm dần; lỗi cố định (401/500) vẫn fail sau khi hết lượt.
        const maxAttempts = 3;
        let paymentHistoryState = null;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          await page.goto(`${BASE_URL}/billing`, { waitUntil: "domcontentloaded" });
          if (await waitForLoginRedirect(page, 2_000)) {
            authWasRequired = true;
            await authenticateIfRequired(page, "/billing");
            await page.goto(`${BASE_URL}/billing`, { waitUntil: "domcontentloaded" });
          }

          await page
            .waitForFunction(() => {
              const paymentHistory = document.querySelector('[data-testid="billing-payment-history"]');
              // Action surface tùy theo gói: upgrade (FREE), quản lý gói (đã Plus),
              // hoặc banner khóa thanh toán. Chấp nhận bất kỳ cái nào.
              const upgradeCta = document.querySelector('[data-testid="billing-plan-upgrade-cta"]');
              const manageCta = document.querySelector('[data-testid="billing-plan-manage-cta"]');
              const paymentLockBanner = document.querySelector('[data-testid="paid-checkout-disabled-banner"]');
              return (
                location.pathname === "/billing/plan" &&
                paymentHistory !== null &&
                (upgradeCta !== null || manageCta !== null || paymentLockBanner !== null)
              );
            })
            .catch(async (error) => {
              const surface = await page
                .evaluate(() => ({
                  pathname: location.pathname,
                  hasPaymentHistory: !!document.querySelector('[data-testid="billing-payment-history"]'),
                  hasUpgradeCta: !!document.querySelector('[data-testid="billing-plan-upgrade-cta"]'),
                  hasManageCta: !!document.querySelector('[data-testid="billing-plan-manage-cta"]'),
                  hasLockBanner: !!document.querySelector('[data-testid="paid-checkout-disabled-banner"]'),
                  paymentHistoryState: document
                    .querySelector('[data-testid="billing-payment-history"]')
                    ?.getAttribute("data-payment-history-state"),
                }))
                .catch(() => null);
              throw new Error(
                `Billing plan page did not reach expected state: ${JSON.stringify(surface)}\n${error.message}\n${await getDiagnostics(page)}`,
              );
            });
          const paymentHistoryStateHandle = await page.waitForFunction(() => {
            const paymentHistory = document.querySelector('[data-testid="billing-payment-history"]');
            const state = paymentHistory?.getAttribute("data-payment-history-state");
            if (state === "empty" || state === "ready" || state === "email-unverified" || state === "error")
              return state;
            return false;
          });
          paymentHistoryState = await paymentHistoryStateHandle.jsonValue();

          if (paymentHistoryState !== "error") break;
          if (attempt < maxAttempts) {
            log(`Billing payment history state=error (attempt ${attempt}/${maxAttempts}, last HTTP ${lastPaymentHistoryStatus ?? "unknown"}, net error ${lastPaymentHistoryFailure ?? "none"}); retrying after warm-up.`);
            await page.waitForTimeout(5_000);
          }
        }

        const text = await getBodyText(page);
        assertNoMojibake(text, "billing management");
        assertNoVisibleFailure(text, "billing management");
        if (paymentHistoryState === "error") {
          throw new Error(
            `Billing payment history endpoint failed on production after ${maxAttempts} attempts (last HTTP status: ${lastPaymentHistoryStatus ?? "unknown"}, net error: ${lastPaymentHistoryFailure ?? "none"}).\n${await getDiagnostics(page)}`,
          );
        }
        if (paymentHistoryState === "email-unverified" && !normalizeText(text).includes("xac thuc email")) {
          throw new Error(`Billing payment history is email-unverified without clear verification copy.\n${await getDiagnostics(page)}`);
        }
        if (/Plus demo|Checkout dùng thử|mock checkout/i.test(text)) {
          throw new Error("Production billing page still shows demo/mock billing copy");
        }
      } finally {
        page.off("response", onResponse);
        page.off("requestfailed", onRequestFailed);
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
