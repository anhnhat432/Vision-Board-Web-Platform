import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const BASE_URL = process.env.LWW_E2E_URL?.replace(/\/$/, "");
test.use({ proofBaseURL: BASE_URL });

const ALLOW_OVERWRITE =
  process.env.LWW_E2E_ALLOW === "OVERWRITE_TEST_WORKSPACE";
const EMAIL = process.env.LWW_E2E_EMAIL;
const PASSWORD = process.env.LWW_E2E_PASSWORD;
const TIMESTAMP = Date.now();
const TEST_PREFIX = `[LWW-E2E-${TIMESTAMP}]`;
const PROOF_GOAL_ID = "lww_e2e_goal";
const PROOF_TASK_ID = "lww_e2e_task";
const USER_DATA_STORAGE_KEY = "visionboard_user_data";
const AUTH_OWNER_STORAGE_KEY = "visionboard_user_data:auth_owner_uid";
const USER_DATA_UPDATED_EVENT_NAME = "visionboard:user-data-updated";

interface LwwProofGoal {
  goalId: string;
  goalTitle: string;
  taskId: string;
  taskTitle: string;
}

function isSafeLwwEmail(email: string) {
  return /(^|[+._-])lww([+._-]|@)/i.test(email);
}

// ── Helpers ───────────────────────────────────────────────────────

async function loginPage(page: Page, email: string, password: string) {
  await page.goto("/login?next=%2Fsettings");
  await expect(
    page.getByPlaceholder(/email/i).or(page.locator("#login-email")),
  ).toBeVisible({ timeout: 15_000 });

  await page.fill("#login-email", email);
  await page.fill("#login-password", password);
  await page.getByRole("button", { name: /đăng nhập|sign in/i }).click();

  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
}

async function primeProofGuidanceState(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("visionboard_screen_guide_seen:settings", "true");
    localStorage.setItem("visionboard_screen_guide_seen:twelve-week-system", "true");
    localStorage.setItem("visionboard_page_tour_seen:twelve-week-system", "true");
    localStorage.setItem(
      "visionboard_first_run_guidance_completed_at",
      new Date().toISOString(),
    );
  });
}

async function bootstrapLwwGoal(
  page: Page,
  scenarioTitle: string,
): Promise<LwwProofGoal> {
  const seed: LwwProofGoal = {
    goalId: PROOF_GOAL_ID,
    goalTitle: `${TEST_PREFIX} ${scenarioTitle}`,
    taskId: PROOF_TASK_ID,
    taskTitle: `${TEST_PREFIX} ${scenarioTitle} Task`,
  };

  await page.evaluate(
    ({
      authOwnerStorageKey,
      userDataStorageKey,
      userDataUpdatedEventName,
      seed: proofSeed,
    }) => {
      const raw = localStorage.getItem(userDataStorageKey);
      const ownerUid = localStorage.getItem(authOwnerStorageKey)?.trim();
      if (!raw || !ownerUid) {
        throw new Error(
          "Authenticated local snapshot was not ready for LWW bootstrap.",
        );
      }

      const currentData = JSON.parse(raw) as {
        goals?: Array<{ id?: string }>;
      } & Record<string, unknown>;
      if (!Array.isArray(currentData.goals)) {
        throw new Error("Authenticated local snapshot has no goals array.");
      }

      const formatDateKey = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };
      const addDays = (date: Date, amount: number) => {
        const next = new Date(date);
        next.setDate(next.getDate() + amount);
        return next;
      };

      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const weekStart = addDays(now, -((now.getDay() + 6) % 7));
      const startDate = formatDateKey(weekStart);
      const endDate = formatDateKey(addDays(weekStart, 83));
      const today = formatDateKey(now);
      const leadIndicatorName = `${proofSeed.goalTitle} Lead`;
      const leadIndicatorId = "lww_e2e_lead";

      const weeklyPlans = Array.from({ length: 12 }, (_, index) => ({
        weekNumber: index + 1,
        phaseName:
          index < 4 ? "Foundation" : index < 8 ? "Build" : "Finish",
        focus: proofSeed.goalTitle,
        milestone: index === 11 ? proofSeed.goalTitle : "",
        completed: false,
      }));
      const scoreboard = Array.from({ length: 12 }, (_, index) => ({
        weekNumber: index + 1,
        leadCompletionPercent: 0,
        mainMetricProgress: "",
        outputDone: "",
        reviewDone: false,
        weeklyScore: 0,
      }));

      const goal = {
        id: proofSeed.goalId,
        category: "Career",
        focusArea: "Career",
        title: proofSeed.goalTitle,
        description: proofSeed.goalTitle,
        deadline: endDate,
        tasks: [],
        feasibilityResult: "realistic",
        readinessScore: 20,
        createdAt: new Date().toISOString(),
        twelveWeekSystem: {
          goalType: "Project Completion",
          vision12Week: proofSeed.goalTitle,
          lagMetric: {
            name: "LWW proof completion",
            unit: "state",
            target: "1",
            currentValue: "",
          },
          leadIndicators: [
            {
              id: leadIndicatorId,
              name: leadIndicatorName,
              target: "1",
              unit: "task/week",
              type: "core",
              priority: 1,
              schedule: [6],
            },
          ],
          milestones: {
            week4: "",
            week8: "",
            week12: proofSeed.goalTitle,
          },
          successEvidence: proofSeed.goalTitle,
          reviewDay: "Sunday",
          week12Outcome: proofSeed.goalTitle,
          startDate,
          endDate,
          timezone: "Asia/Ho_Chi_Minh",
          weekStartsOn: "Monday",
          status: "active",
          dailyReminderTime: "19:00",
          tacticLoadPreference: "balanced",
          reentryCount: 0,
          currentWeek: 1,
          totalWeeks: 12,
          weeklyPlans,
          taskInstances: [
            {
              id: proofSeed.taskId,
              title: proofSeed.taskTitle,
              leadIndicatorName,
              isCore: true,
              completed: false,
              weekNumber: 1,
              scheduledDate: today,
              tacticId: leadIndicatorId,
              lastModifiedAt: 0,
            },
          ],
          dailyCheckIns: [],
          weeklyReviews: [],
          scoreboard,
        },
      };

      const nextData = {
        ...currentData,
        goals: [
          ...currentData.goals.filter(
            (candidate) => candidate.id !== proofSeed.goalId,
          ),
          goal,
        ],
        onboardingCompleted: true,
        isHydratedFromDemo: false,
      };
      const serialized = JSON.stringify(nextData);
      localStorage.setItem(userDataStorageKey, serialized);
      localStorage.setItem(
        `${userDataStorageKey}:auth:${encodeURIComponent(ownerUid)}`,
        serialized,
      );
      localStorage.setItem("latest_12_week_goal_id", proofSeed.goalId);
      localStorage.setItem(
        "latest_12_week_system_goal_id",
        proofSeed.goalId,
      );
      window.dispatchEvent(new CustomEvent(userDataUpdatedEventName));
    },
    {
      authOwnerStorageKey: AUTH_OWNER_STORAGE_KEY,
      userDataStorageKey: USER_DATA_STORAGE_KEY,
      userDataUpdatedEventName: USER_DATA_UPDATED_EVENT_NAME,
      seed,
    },
  );

  return seed;
}

async function openSystemTab(page: Page, tab: "today" | "settings") {
  await page.goto(`/12-week-system?tab=${tab}`);
  await page.waitForLoadState("networkidle");

  const tabByTourId = page.locator(`[data-tour-id="twelve-week-tab-${tab}"]`);
  if ((await tabByTourId.count()) > 0) {
    await tabByTourId.first().click();
    return;
  }

  const tabName = tab === "today" ? /today|h.m nay/i : /settings|c.i . .t/i;
  const tabByRole = page.getByRole("tab", { name: tabName });
  if ((await tabByRole.count()) > 0) {
    await tabByRole.first().click();
  }
}

async function getProofTaskCheckbox(page: Page, taskTitle: string) {
  const checkbox = page.getByRole("checkbox", {
    name: `Hoàn thành việc: ${taskTitle}`,
  });
  await expect(checkbox).toBeVisible({ timeout: 30_000 });
  return checkbox;
}

async function toggleTask(
  page: Page,
  taskTitle: string,
  completed: boolean,
) {
  const checkbox = await getProofTaskCheckbox(page, taskTitle);
  if ((await checkbox.isChecked()) === completed) return;

  await checkbox.click();
  await expect
    .poll(() => checkbox.isChecked(), {
      timeout: 10_000,
      intervals: [250, 500, 1000],
    })
    .toBe(completed);
}

async function readPendingMutationQueueDiagnostics(page: Page) {
  return page.evaluate(() => {
    const pendingStatuses = new Set([
      "pending",
      "in_flight",
      "retry_scheduled",
    ]);
    const diagnostics: Array<{
      storageKey: string;
      id?: string;
      kind?: string;
      status?: string;
      attemptCount?: number;
      errorCode?: string;
      nextRetryAt?: string;
    }> = [];

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith("visionboard_data_mutation_queue")) continue;

      const raw = localStorage.getItem(key);
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw) as {
          items?: Array<{
            id?: string;
            kind?: string;
            status?: string;
            attemptCount?: number;
            error?: { code?: string };
            nextRetryAt?: string;
          }>;
        };
        for (const item of parsed.items ?? []) {
          if (!pendingStatuses.has(item.status ?? "")) continue;
          diagnostics.push({
            storageKey: key,
            id: item.id,
            kind: item.kind,
            status: item.status,
            attemptCount: item.attemptCount,
            errorCode: item.error?.code,
            nextRetryAt: item.nextRetryAt,
          });
        }
      } catch {
        diagnostics.push({
          storageKey: key,
          status: "invalid_json",
          errorCode: "invalid_json",
        });
      }
    }

    return diagnostics;
  });
}

async function waitForMutationQueueIdle(
  page: Page,
  timeoutMs: number = 45_000,
) {
  await expect
    .poll(
      () => readPendingMutationQueueDiagnostics(page),
      { timeout: timeoutMs, intervals: [500, 1000, 2000] },
    )
    .toEqual([]);
}

function waitForPlanSnapshotBulkSync(page: Page) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      /\/plans\/[^/]+\/bulk-sync$/.test(new URL(response.url()).pathname),
    { timeout: 60_000 },
  );
}

async function syncProofGoalToCloud(
  page: Page,
  seed: LwwProofGoal,
  bulkSyncResponsePromise: ReturnType<typeof waitForPlanSnapshotBulkSync>,
) {
  await page.goto("/12-week-system?tab=today");
  await getProofTaskCheckbox(page, seed.taskTitle);

  const bulkSyncResponse = await bulkSyncResponsePromise;
  expect(
    bulkSyncResponse.ok(),
    `Plan snapshot bulk sync responded ${bulkSyncResponse.status()}`,
  ).toBe(true);
  await expect(
    page.getByText("Đã lưu & đồng bộ", { exact: true }).first(),
  ).toBeVisible({ timeout: 30_000 });
  await waitForMutationQueueIdle(page);
}

async function triggerManualCloudSync(
  page: Page,
  timeoutMs: number = 60_000,
) {
  await page.goto("/settings");
  const syncButton = page.getByRole("button", {
    name: "Kiểm tra sao lưu",
    exact: true,
  });
  await expect(syncButton).toBeVisible({ timeout: 30_000 });
  await expect(syncButton).toBeEnabled({ timeout: 30_000 });

  const pullResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      /\/sync\/12-week\/pull$/.test(new URL(response.url()).pathname),
    { timeout: timeoutMs },
  );
  await syncButton.click();

  const pullResponse = await pullResponsePromise;
  expect(
    pullResponse.ok(),
    `12-week pull responded ${pullResponse.status()}`,
  ).toBe(true);
  await expect(syncButton).toBeEnabled({ timeout: timeoutMs });
  await expect(page.getByTestId("settings-sync-last-result")).toBeVisible({
    timeout: timeoutMs,
  });
  await waitForMutationQueueIdle(page, timeoutMs);
}

async function openProofGoal(page: Page, seed: LwwProofGoal) {
  await page.evaluate((goalId) => {
    localStorage.setItem("latest_12_week_goal_id", goalId);
    localStorage.setItem("latest_12_week_system_goal_id", goalId);
  }, seed.goalId);
  await page.goto("/12-week-system?tab=today");
  await getProofTaskCheckbox(page, seed.taskTitle);
}

async function pullProofGoal(page: Page, seed: LwwProofGoal) {
  await triggerManualCloudSync(page);
  await expect
    .poll(
      () =>
        page.evaluate(
          ({ goalId, taskId, taskTitle, userDataStorageKey }) => {
            const raw = localStorage.getItem(userDataStorageKey);
            if (!raw) return false;
            const data = JSON.parse(raw) as {
              goals?: Array<{
                id?: string;
                twelveWeekSystem?: {
                  taskInstances?: Array<{ id?: string; title?: string }>;
                };
              }>;
            };
            const goal = data.goals?.find(
              (candidate) => candidate.id === goalId,
            );
            return Boolean(
              goal?.twelveWeekSystem?.taskInstances?.some(
                (task) => task.id === taskId && task.title === taskTitle,
              ),
            );
          },
          {
            goalId: seed.goalId,
            taskId: seed.taskId,
            taskTitle: seed.taskTitle,
            userDataStorageKey: USER_DATA_STORAGE_KEY,
          },
        ),
      { timeout: 45_000, intervals: [500, 1000, 2000] },
    )
    .toBe(true);
  await openProofGoal(page, seed);
}

async function deleteProofWorkspace(page: Page) {
  await openSystemTab(page, "settings");
  const deleteCloudButton = page.getByRole("button", {
    name: "Xóa dữ liệu tài khoản",
    exact: true,
  });
  await expect(deleteCloudButton).toBeVisible({ timeout: 30_000 });
  await deleteCloudButton.click();

  const dialog = page.getByRole("alertdialog", {
    name: "Xóa dữ liệu 12 tuần đã đồng bộ?",
  });
  await expect(dialog).toBeVisible({ timeout: 15_000 });
  await dialog.locator("#delete-cloud-confirm-checkbox").click();
  const confirmButton = dialog.getByRole("button", {
    name: "Xóa dữ liệu đã đồng bộ",
    exact: true,
  });
  await expect(confirmButton).toBeEnabled();

  const deleteResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "DELETE" &&
      /\/sync\/12-week\/workspace$/.test(new URL(response.url()).pathname),
    { timeout: 45_000 },
  );
  await confirmButton.click();
  const deleteResponse = await deleteResponsePromise;
  expect(
    deleteResponse.ok(),
    `Delete cloud workspace responded ${deleteResponse.status()}`,
  ).toBe(true);
  await expect(dialog).toBeHidden({ timeout: 30_000 });
}

async function expectNoConflictDialog(page: Page) {
  const conflictTexts = [
    "cần chọn bản dữ liệu",
    "cần chọn nguồn dữ liệu",
    "conflict",
    "xung đột",
  ];

  for (const text of conflictTexts) {
    const count = await page.locator(`text=${text}`).count();
    expect(count, `Found conflict dialog with text: ${text}`).toBe(0);
  }

  const dialogOpen = await page
    .locator('[role="dialog"], .DialogOverlay, [class*="dialog"]')
    .count();
  expect(dialogOpen, "No dialog should be open").toBe(0);
}

async function waitForGoalToDisappear(
  page: Page,
  goalId: string,
  timeoutMs: number = 45_000,
) {
  await expect
    .poll(
      () =>
        page.evaluate(
          ({ proofGoalId, userDataStorageKey }) => {
            const raw = localStorage.getItem(userDataStorageKey);
            if (!raw) return true;
            const data = JSON.parse(raw) as {
              goals?: Array<{ id?: string }>;
            };
            return !data.goals?.some((goal) => goal.id === proofGoalId);
          },
          {
            proofGoalId: goalId,
            userDataStorageKey: USER_DATA_STORAGE_KEY,
          },
        ),
      { timeout: timeoutMs, intervals: [1000, 2000, 3000] }
    )
    .toBe(true);
}

async function getTaskCompletedState(
  page: Page,
  taskTitle: string,
): Promise<boolean> {
  return (await getProofTaskCheckbox(page, taskTitle)).isChecked();
}

async function captureConsoleLogs(page: Page): Promise<string[]> {
  const logs: string[] = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("[auto-sync-lww]")) {
      logs.push(text);
    }
  });
  return logs;
}

async function prepareLwwScenario(
  pageA: Page,
  pageB: Page,
  scenarioTitle: string,
): Promise<LwwProofGoal> {
  await Promise.all([
    primeProofGuidanceState(pageA),
    primeProofGuidanceState(pageB),
  ]);
  await Promise.all([
    loginPage(pageA, EMAIL!, PASSWORD!),
    loginPage(pageB, EMAIL!, PASSWORD!),
  ]);

  const bulkSyncResponsePromise = waitForPlanSnapshotBulkSync(pageA);
  const seed = await bootstrapLwwGoal(pageA, scenarioTitle);
  await syncProofGoalToCloud(pageA, seed, bulkSyncResponsePromise);
  await pullProofGoal(pageB, seed);

  expect(await getTaskCompletedState(pageA, seed.taskTitle)).toBe(false);
  expect(await getTaskCompletedState(pageB, seed.taskTitle)).toBe(false);
  return seed;
}

// ── Tests ─────────────────────────────────────────────────────────

test.describe("LWW auto-resolve sync", () => {
  test.skip(
    !BASE_URL || !ALLOW_OVERWRITE || !EMAIL || !PASSWORD,
    "Set LWW_E2E_URL, LWW_E2E_ALLOW=OVERWRITE_TEST_WORKSPACE, LWW_E2E_EMAIL, and LWW_E2E_PASSWORD to run",
  );
  test.setTimeout(240_000);

  test.beforeAll(() => {
    if (!EMAIL || !isSafeLwwEmail(EMAIL)) {
      throw new Error(
        `Refusing to run LWW overwrite proof for ${EMAIL ?? "(missing email)"}. Use a dedicated QA email containing "+lww".`,
      );
    }
  });

  test("local wins when local mutation is newer", async ({ newProofContext }) => {
    const contextA = await newProofContext();
    const contextB = await newProofContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    const consoleLogsA = await captureConsoleLogs(pageA);

    try {
      const seed = await prepareLwwScenario(
        pageA,
        pageB,
        "Local Wins Goal",
      );

      await toggleTask(pageA, seed.taskTitle, true);
      await triggerManualCloudSync(pageA);
      await pullProofGoal(pageB, seed);
      await openProofGoal(pageA, seed);
      await contextA.setOffline(true);

      await toggleTask(pageB, seed.taskTitle, false);
      await triggerManualCloudSync(pageB);

      await toggleTask(pageA, seed.taskTitle, false);
      await pageA.waitForTimeout(25);
      await toggleTask(pageA, seed.taskTitle, true);
      await contextA.setOffline(false);
      await triggerManualCloudSync(pageA);
      await openProofGoal(pageA, seed);
      await pullProofGoal(pageB, seed);

      await expectNoConflictDialog(pageA);
      await expectNoConflictDialog(pageB);

      const stateA = await getTaskCompletedState(pageA, seed.taskTitle);
      const stateB = await getTaskCompletedState(pageB, seed.taskTitle);

      expect(stateA).toBe(true);
      expect(stateB).toBe(true);

      const hasLwwLog = consoleLogsA.some((log) =>
        log.includes("resolved")
      );
      expect(hasLwwLog).toBe(true);
    } finally {
      await Promise.all([contextA.close(), contextB.close()]);
    }
  });

  test("cloud wins when cloud is newer", async ({ newProofContext }) => {
    const contextA = await newProofContext();
    const contextB = await newProofContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    const consoleLogsA = await captureConsoleLogs(pageA);

    try {
      const seed = await prepareLwwScenario(
        pageA,
        pageB,
        "Cloud Wins Goal",
      );
      await contextA.setOffline(true);
      await toggleTask(pageA, seed.taskTitle, true);

      await toggleTask(pageB, seed.taskTitle, true);
      await triggerManualCloudSync(pageB);
      await openProofGoal(pageB, seed);
      await toggleTask(pageB, seed.taskTitle, false);
      await triggerManualCloudSync(pageB);

      await contextA.setOffline(false);
      await triggerManualCloudSync(pageA);
      await openProofGoal(pageA, seed);
      await pullProofGoal(pageB, seed);

      await expectNoConflictDialog(pageA);
      await expectNoConflictDialog(pageB);

      const stateA = await getTaskCompletedState(pageA, seed.taskTitle);
      const stateB = await getTaskCompletedState(pageB, seed.taskTitle);

      expect(stateA).toBe(false);
      expect(stateB).toBe(false);

      expect(consoleLogsA.some((log) => log.includes("resolved"))).toBe(true);
    } finally {
      await Promise.all([contextA.close(), contextB.close()]);
    }
  });

  test("tombstone wins over pending mutation", async ({ newProofContext }) => {
    const contextA = await newProofContext();
    const contextB = await newProofContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      const seed = await prepareLwwScenario(
        pageA,
        pageB,
        "Tombstone Goal",
      );
      await contextA.setOffline(true);
      await toggleTask(pageA, seed.taskTitle, true);

      await deleteProofWorkspace(pageB);

      await contextA.setOffline(false);
      await triggerManualCloudSync(pageA);
      await triggerManualCloudSync(pageB);

      await waitForGoalToDisappear(pageA, seed.goalId);
      await waitForGoalToDisappear(pageB, seed.goalId);
      await expectNoConflictDialog(pageA);
      await expectNoConflictDialog(pageB);
    } finally {
      await Promise.all([contextA.close(), contextB.close()]);
    }
  });
});
