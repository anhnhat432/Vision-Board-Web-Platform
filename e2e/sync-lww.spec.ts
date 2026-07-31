import type { Page, Response } from "@playwright/test";
import type { Goal } from "../src/app/utils/storage-types";
import {
  createTwelveWeekImportPayload,
  type TwelveWeekImportPayload,
} from "../src/features/plan12week/persistence/twelveWeekImportPayload";
import { expect, test } from "./fixtures";

const BASE_URL = process.env.LWW_E2E_URL?.replace(/\/$/, "");
test.use({ proofBaseURL: BASE_URL });

const ALLOW_OVERWRITE =
  process.env.LWW_E2E_ALLOW === "OVERWRITE_TEST_WORKSPACE";
const EMAIL = process.env.LWW_E2E_EMAIL;
const PASSWORD = process.env.LWW_E2E_PASSWORD;
const RUN_ID =
  process.env.LWW_E2E_RUN_ID?.trim() ||
  process.env.GITHUB_RUN_ID?.trim() ||
  String(Date.now());
const TEST_PREFIX = `[LWW-E2E-${RUN_ID}]`;
const PROOF_GOAL_ID = "lww_e2e_goal";
const PROOF_LEAD_INDICATOR_ID = "lww_e2e_lead";
const USER_DATA_STORAGE_KEY = "visionboard_user_data";
const AUTH_OWNER_STORAGE_KEY = "visionboard_user_data:auth_owner_uid";
const MANUAL_SYNC_MIN_INTERVAL_MS = 5_000;
const lastObservedCloudPullAt = new WeakMap<Page, number>();
const observedApiBaseUrl = new WeakMap<Page, string>();

interface LwwProofIdentity {
  goalId: string;
  goalTitle: string;
  leadIndicatorId: string;
  taskId: string;
  taskTitle: string;
}

interface LwwProofGoal extends LwwProofIdentity {
  importId: string;
  importPayload: TwelveWeekImportPayload;
}

interface ApiResponseDiagnostic {
  method: string;
  path: string;
  status: number;
}

interface LwwSyncResponseDiagnostic {
  kind: "mutation" | "pull";
  httpStatus: number;
  parseError?: boolean;
  batchStatus?: string | null;
  targetMutationRequestCount?: number;
  targetMutationStatuses?: string[];
  mode?: string | null;
  taskCount?: number;
  targetTaskPresent?: boolean;
  targetTaskCompleted?: boolean | null;
  targetTaskTombstoned?: boolean;
}

interface ManualSyncDiagnosticsContext {
  seed: LwwProofIdentity;
  readSyncResponses: () => Promise<LwwSyncResponseDiagnostic[]>;
}

function isSafeLwwEmail(email: string) {
  return /(^|[+._-])lww([+._-]|@)/i.test(email);
}

function createScenarioKey(scenarioTitle: string) {
  const runParts = RUN_ID.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const runId = runParts[0] ?? "run";
  const attempt = runParts[1] ?? "0";
  const runSuffix = `${runId.slice(-12)}${attempt.slice(0, 2)}`;
  const titleSlug = scenarioTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 12);
  return `${runSuffix}_${titleSlug}`;
}

// ── Helpers ───────────────────────────────────────────────────────

async function createSafePullDiagnostics(page: Page, stage: string, response: Response) {
  return {
    scenario: test.info().title,
    stage,
    status: response.status(),
    retryAfter: await response.headerValue("retry-after"),
    ...(await readMutationQueueCountDiagnostics(page)),
  };
}

async function createSafeConvergenceDiagnostics(
  pageA: Page,
  pageB: Page,
  stage: string,
  seed: LwwProofIdentity,
  finalStateA: boolean,
  finalStateB: boolean,
  readSyncResponsesA: () => Promise<LwwSyncResponseDiagnostic[]>,
  readSyncResponsesB: () => Promise<LwwSyncResponseDiagnostic[]>,
) {
  const [queueA, queueB, storageA, storageB, syncResponsesA, syncResponsesB] = await Promise.all([
    readMutationQueueCountDiagnostics(pageA),
    readMutationQueueCountDiagnostics(pageB),
    readProofTaskDiagnostics(pageA, seed),
    readProofTaskDiagnostics(pageB, seed),
    readSyncResponsesA(),
    readSyncResponsesB(),
  ]);
  return {
    scenario: test.info().title,
    stage,
    queueA,
    queueB,
    storageA,
    storageB,
    syncResponsesA,
    syncResponsesB,
    finalStateA,
    finalStateB,
  };
}

async function expectTaskConvergence(
  pageA: Page,
  pageB: Page,
  seed: LwwProofIdentity,
  expected: boolean,
  readSyncResponsesA: () => Promise<LwwSyncResponseDiagnostic[]>,
  readSyncResponsesB: () => Promise<LwwSyncResponseDiagnostic[]>,
) {
  const [stateA, stateB] = await Promise.all([
    getTaskCompletedState(pageA, seed.taskTitle),
    getTaskCompletedState(pageB, seed.taskTitle),
  ]);
  const diagnostics = await createSafeConvergenceDiagnostics(
    pageA,
    pageB,
    "final-convergence",
    seed,
    stateA,
    stateB,
    readSyncResponsesA,
    readSyncResponsesB,
  );
  expect({ stateA, stateB }, JSON.stringify(diagnostics)).toEqual({ stateA: expected, stateB: expected });
}

function rememberCloudPull(page: Page, response: Response) {
  lastObservedCloudPullAt.set(page, Date.now());
  const url = new URL(response.url());
  observedApiBaseUrl.set(
    page,
    `${url.origin}${url.pathname.replace(/\/sync\/12-week\/pull$/, "")}`,
  );
}

async function waitForManualSyncWindow(page: Page) {
  const lastPullAt = lastObservedCloudPullAt.get(page);
  if (lastPullAt === undefined) return;

  await expect
    .poll(() => Date.now() - lastPullAt, {
      timeout: MANUAL_SYNC_MIN_INTERVAL_MS + 2_000,
      intervals: [100, 250, 500],
    })
    .toBeGreaterThanOrEqual(MANUAL_SYNC_MIN_INTERVAL_MS);
}

async function openSettingsWithoutReload(page: Page) {
  if (new URL(page.url()).pathname === "/settings") return;

  await page.evaluate(() => {
    window.history.pushState({}, "", "/settings");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await expect(page).toHaveURL(/\/settings(?:[?#]|$)/, { timeout: 30_000 });
}

async function loginPage(page: Page, email: string, password: string) {
  await page.goto("/login?next=%2Fsettings");
  await expect(
    page.getByPlaceholder(/email/i).or(page.locator("#login-email")),
  ).toBeVisible({ timeout: 15_000 });

  const initialPullResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      /\/sync\/12-week\/pull$/.test(new URL(response.url()).pathname),
    { timeout: 60_000 },
  );
  await page.fill("#login-email", email);
  await page.fill("#login-password", password);
  await page.getByRole("button", { name: /đăng nhập|sign in/i }).click();

  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
  const initialPullResponse = await initialPullResponsePromise;
  const pullDiagnostics = await createSafePullDiagnostics(page, "login-initial-pull", initialPullResponse);
  expect(
    initialPullResponse.ok(),
    `Initial 12-week pull failed: ${JSON.stringify(pullDiagnostics)}`,
  ).toBe(true);
  rememberCloudPull(page, initialPullResponse);
  await expect(page).toHaveURL(/\/settings(?:[?#]|$)/, { timeout: 30_000 });
  await expect(
    page.getByRole("button", {
      name: "Kiểm tra sao lưu",
      exact: true,
    }),
  ).toBeEnabled({ timeout: 60_000 });
  await expect(page.getByTestId("settings-sync-last-result")).toBeVisible({
    timeout: 60_000,
  });
}

async function primeProofGuidanceState(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem("onboarding-deferred", "1");
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
  const scenarioKey = createScenarioKey(scenarioTitle);
  const seed: LwwProofIdentity = {
    goalId: `${PROOF_GOAL_ID}_${scenarioKey}`,
    goalTitle: `${TEST_PREFIX} ${scenarioTitle}`,
    leadIndicatorId: `${PROOF_LEAD_INDICATOR_ID}_${scenarioKey}`,
    taskId: `tw_task_1_${PROOF_LEAD_INDICATOR_ID}_${scenarioKey}_0`,
    taskTitle: `${TEST_PREFIX} ${scenarioTitle} Task`,
  };

  await page.evaluate(
    ({
      authOwnerStorageKey,
      userDataStorageKey,
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
      const todayOffset = (now.getDay() + 6) % 7;
      const leadIndicatorName = proofSeed.taskTitle;
      const leadIndicatorId = proofSeed.leadIndicatorId;

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
        createdAt: `${startDate}T00:00:00.000Z`,
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
              schedule: [todayOffset],
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
          taskInstances: Array.from({ length: 12 }, (_, index) => ({
            id: `tw_task_${index + 1}_${leadIndicatorId}_0`,
            title: proofSeed.taskTitle,
            leadIndicatorName,
            isCore: true,
            completed: false,
            weekNumber: index + 1,
            scheduledDate: formatDateKey(
              addDays(weekStart, index * 7 + todayOffset),
            ),
            tacticId: leadIndicatorId,
            lastModifiedAt: 0,
          })),
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
    },
    {
      authOwnerStorageKey: AUTH_OWNER_STORAGE_KEY,
      userDataStorageKey: USER_DATA_STORAGE_KEY,
      seed,
    },
  );

  expect(await readProofTaskDiagnostics(page, seed)).toMatchObject({
    goalPresent: true,
    taskPresent: true,
    taskCount: 12,
    scheduledDateMatchesToday: true,
    authScopedSnapshotMatches: true,
  });

  const storedGoal = await page.evaluate(
    ({ goalId, userDataStorageKey }) => {
      const raw = localStorage.getItem(userDataStorageKey);
      if (!raw) return null;
      const data = JSON.parse(raw) as { goals?: Goal[] };
      return data.goals?.find((goal) => goal.id === goalId) ?? null;
    },
    { goalId: seed.goalId, userDataStorageKey: USER_DATA_STORAGE_KEY },
  );
  const importPayload = storedGoal
    ? createTwelveWeekImportPayload(storedGoal)
    : null;
  if (!importPayload) {
    throw new Error("LWW bootstrap could not create a 12-week import fixture.");
  }

  return {
    ...seed,
    importId: `lww_e2e_import_${scenarioKey}`,
    importPayload,
  };
}

async function importLwwBaseline(
  page: Page,
  seed: LwwProofGoal,
  readApiDiagnostics: () => ApiResponseDiagnostic[],
) {
  const apiBaseUrl = observedApiBaseUrl.get(page);
  if (!apiBaseUrl) {
    throw new Error("LWW bootstrap could not resolve the deployed backend API base URL.");
  }
  const diagnostics = await page.evaluate(
    async ({ apiBaseUrl: backendApiBaseUrl, importId, importPayload, proofIds }) => {
      type EntityCounts = Partial<
        Record<"goals" | "plans" | "weeks" | "tasks" | "leadMetrics", number>
      >;
      type EntityLink = { clientId?: string };
      type ImportData = {
        status?: string;
        validation?: { acceptedEntityCounts?: EntityCounts };
        links?: Partial<
          Record<"goals" | "plans" | "tasks", EntityLink[]>
        >;
      };
      type Envelope<T> = { success?: boolean; data?: T };
      const readJson = async <T>(response: globalThis.Response) => {
        try {
          return (await response.json()) as Envelope<T>;
        } catch {
          return {} as Envelope<T>;
        }
      };
      const token = localStorage.getItem("firebase_id_token")?.trim();

      if (!token) {
        return {
          tokenPresent: false,
          importHttpStatus: 0,
          importSuccess: false,
          importStatus: null,
          importCounts: { goals: 0, plans: 0, weeks: 0, tasks: 0, leadMetrics: 0 },
          goalLinkMatches: false,
          planLinkMatches: false,
          taskLinkMatches: false,
        };
      }

      const importResponse = await fetch(
        `${backendApiBaseUrl}/sync/12-week/import`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            importId,
            idempotencyKey: importId,
            source: "account_scope_cloud_import",
            workspace: { goals: [importPayload] },
          }),
        },
      );
      const importEnvelope = await readJson<ImportData>(importResponse);
      const importData = importEnvelope.data;
      const counts = importData?.validation?.acceptedEntityCounts ?? {};
      const links = importData?.links ?? {};
      const importDiagnostics = {
        tokenPresent: true,
        importHttpStatus: importResponse.status,
        importSuccess: importResponse.ok && importEnvelope.success === true,
        importStatus: importData?.status ?? null,
        importCounts: {
          goals: counts.goals ?? 0,
          plans: counts.plans ?? 0,
          weeks: counts.weeks ?? 0,
          tasks: counts.tasks ?? 0,
          leadMetrics: counts.leadMetrics ?? 0,
        },
        goalLinkMatches: (links.goals ?? []).some(
          (link) => link.clientId === proofIds.goalId,
        ),
        planLinkMatches: (links.plans ?? []).some(
          (link) => link.clientId === proofIds.planId,
        ),
        taskLinkMatches: (links.tasks ?? []).some(
          (link) => link.clientId === proofIds.taskId,
        ),
      };

      return importDiagnostics;
    },
    {
      apiBaseUrl,
      importId: seed.importId,
      importPayload: seed.importPayload,
      proofIds: {
        goalId: seed.goalId,
        planId: seed.importPayload.plan.clientPlanId,
        taskId: seed.taskId,
      },
    },
  );

  expect(diagnostics).toMatchObject({
    tokenPresent: true,
    importHttpStatus: 200,
    importSuccess: true,
    importCounts: {
      goals: 1,
      plans: 1,
      weeks: 12,
      tasks: 12,
      leadMetrics: 12,
    },
    goalLinkMatches: true,
    planLinkMatches: true,
    taskLinkMatches: true,
  });
  expect(["applied", "duplicate"]).toContain(diagnostics.importStatus);
  expect(
    readApiDiagnostics().some(
      (response) =>
        response.method === "POST" &&
        response.path === "/api/sync/12-week/import" &&
        response.status >= 200 &&
        response.status < 300,
    ),
  ).toBe(true);
}

async function reloadProofGoal(page: Page, seed: LwwProofGoal) {
  const pullResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      /\/sync\/12-week\/pull$/.test(new URL(response.url()).pathname),
    { timeout: 60_000 },
  );
  await page.reload();
  const pullResponse = await pullResponsePromise;
  expect(
    pullResponse.ok(),
    `Reload 12-week pull responded ${pullResponse.status()}`,
  ).toBe(true);
  rememberCloudPull(page, pullResponse);
  await waitForProofGoal(page, seed);
}

async function readSystemTabDiagnostics(
  page: Page,
  tab: "today" | "settings",
) {
  const systemTabs = page.locator('[data-tour-id^="twelve-week-tab-"]');
  const requestedTab = page.locator(
    `[data-tour-id="twelve-week-tab-${tab}"]`,
  );
  const activeTab = page.locator(
    '[data-tour-id^="twelve-week-tab-"][data-state="active"]',
  );
  const currentUrl = new URL(page.url());
  const systemTabCount = await systemTabs.count();
  const requestedTabCount = await requestedTab.count();
  const activeTabCount = await activeTab.count();

  return {
    route: `${currentUrl.pathname}${currentUrl.search}`,
    systemTabCount,
    requestedTabCount,
    requestedTabVisible:
      requestedTabCount > 0 ? await requestedTab.first().isVisible() : false,
    requestedTabState:
      requestedTabCount > 0
        ? await requestedTab.first().getAttribute("data-state")
        : null,
    activeTabTourId:
      activeTabCount > 0
        ? await activeTab.first().getAttribute("data-tour-id")
        : null,
    tabPanelVisible: await page.getByRole("tabpanel").isVisible(),
    settingsPanelVisible: await page.locator("#cycle-settings-heading").isVisible(),
    settingsControlVisible: await page
      .getByRole("combobox", { name: "Chọn nhịp tuần" })
      .isVisible(),
  };
}

async function openSystemTab(page: Page, tab: "today" | "settings") {
  if (new URL(page.url()).pathname !== "/12-week-system") {
    const systemButton = page.getByRole("button", {
      name: "Hệ thống 12 tuần",
      exact: true,
    });
    await expect(systemButton).toBeVisible({ timeout: 30_000 });
    await systemButton.click();
    await expect(page).toHaveURL(/\/12-week-system(?:\?|$)/, {
      timeout: 30_000,
    });
  }

  const tabByTourId = page.locator(`[data-tour-id="twelve-week-tab-${tab}"]`);
  try {
    await expect(tabByTourId).toBeVisible({ timeout: 30_000 });
    await tabByTourId.click();
    await expect(tabByTourId).toHaveAttribute("data-state", "active", {
      timeout: 10_000,
    });
  } catch {
    throw new Error(
      `LWW system tab was not available: ${JSON.stringify(await readSystemTabDiagnostics(page, tab))}`,
    );
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
      kind?: string;
      status?: string;
      attemptCount?: number;
      errorCode?: string;
      nextRetryAt?: string;
    }> = [];

    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key) continue;
      const isQueueStoreKey =
        key === "visionboard_data_mutation_queue" ||
        key === "visionboard_data_mutation_queue:anonymous" ||
        key.startsWith("visionboard_data_mutation_queue:auth:");
      if (!isQueueStoreKey) continue;

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
            kind: item.kind,
            status: item.status,
            attemptCount: item.attemptCount,
            errorCode: item.error?.code,
            nextRetryAt: item.nextRetryAt,
          });
        }
      } catch {
        diagnostics.push({
          status: "invalid_json",
          errorCode: "invalid_json",
        });
      }
    }

    return diagnostics;
  });
}

async function readMutationQueueCountDiagnostics(page: Page) {
  const pending = await readPendingMutationQueueDiagnostics(page);
  return {
    pendingCount: pending.filter((item) => item.status === "pending").length,
    retryScheduledCount: pending.filter((item) => item.status === "retry_scheduled").length,
  };
}

function captureApiResponseDiagnostics(page: Page) {
  const diagnostics: ApiResponseDiagnostic[] = [];
  const onResponse = (response: Response) => {
    const url = new URL(response.url());
    if (!url.pathname.startsWith("/api/")) return;

    diagnostics.push({
      method: response.request().method(),
      path: url.pathname,
      status: response.status(),
    });
    if (diagnostics.length > 20) diagnostics.shift();
  };

  page.on("response", onResponse);
  return {
    read: () => [...diagnostics],
    stop: () => page.off("response", onResponse),
  };
}

function captureLwwSyncResponseDiagnostics(page: Page, seed: LwwProofIdentity) {
  const diagnostics: LwwSyncResponseDiagnostic[] = [];
  const pendingReads = new Set<Promise<void>>();

  const captureResponse = async (response: Response) => {
    const request = response.request();
    const path = new URL(response.url()).pathname;
    const isMutation = request.method() === "POST" && /\/sync\/12-week\/mutations$/.test(path);
    const isPull = request.method() === "GET" && /\/sync\/12-week\/pull$/.test(path);
    if (!isMutation && !isPull) return;

    try {
      const envelope = (await response.json()) as {
        data?: Record<string, unknown>;
        error?: { details?: Record<string, unknown> };
      } & Record<string, unknown>;
      const data = (envelope.data ?? envelope.error?.details ?? envelope) as Record<string, unknown>;

      if (isMutation) {
        const requestBody = JSON.parse(request.postData() ?? "{}") as {
          mutations?: Array<{
            mutationId?: string;
            entity?: { clientTaskId?: string };
            payload?: { clientTaskId?: string };
          }>;
        };
        const targetMutationIds = new Set(
          (requestBody.mutations ?? [])
            .filter(
              (mutation) =>
                mutation.entity?.clientTaskId === seed.taskId ||
                mutation.payload?.clientTaskId === seed.taskId,
            )
            .map((mutation) => mutation.mutationId)
            .filter((mutationId): mutationId is string => Boolean(mutationId)),
        );
        const resultGroups = [data.results, data.accepted, data.duplicate, data.failed];
        const statuses = new Set<string>();
        for (const group of resultGroups) {
          if (!Array.isArray(group)) continue;
          for (const item of group) {
            if (!item || typeof item !== "object") continue;
            const result = item as { mutationId?: string; status?: string };
            if (!result.mutationId || !targetMutationIds.has(result.mutationId)) continue;
            if (result.status) statuses.add(result.status);
          }
        }

        diagnostics.push({
          kind: "mutation",
          httpStatus: response.status(),
          batchStatus: typeof data.status === "string" ? data.status : null,
          targetMutationRequestCount: targetMutationIds.size,
          targetMutationStatuses: [...statuses],
        });
        return;
      }

      const workspace =
        data.workspace && typeof data.workspace === "object"
          ? (data.workspace as { tasks?: unknown[] })
          : {};
      const tasks = Array.isArray(workspace.tasks) ? workspace.tasks : [];
      const targetTask = tasks.find(
        (item) =>
          item &&
          typeof item === "object" &&
          (item as { clientTaskId?: string }).clientTaskId === seed.taskId,
      ) as { status?: string } | undefined;
      const tombstones =
        data.tombstones && typeof data.tombstones === "object"
          ? (data.tombstones as { tasks?: unknown[] })
          : {};
      const targetTaskTombstoned = (Array.isArray(tombstones.tasks) ? tombstones.tasks : []).some(
        (item) =>
          item &&
          typeof item === "object" &&
          (item as { clientId?: string }).clientId === seed.taskId,
      );

      diagnostics.push({
        kind: "pull",
        httpStatus: response.status(),
        mode: typeof data.mode === "string" ? data.mode : null,
        taskCount: tasks.length,
        targetTaskPresent: Boolean(targetTask),
        targetTaskCompleted: targetTask ? targetTask.status === "done" : null,
        targetTaskTombstoned,
      });
    } catch {
      diagnostics.push({
        kind: isMutation ? "mutation" : "pull",
        httpStatus: response.status(),
        parseError: true,
      });
    }
  };

  const onResponse = (response: Response) => {
    const read = captureResponse(response);
    pendingReads.add(read);
    void read.finally(() => pendingReads.delete(read));
  };

  page.on("response", onResponse);
  return {
    read: async () => {
      await Promise.allSettled([...pendingReads]);
      return [...diagnostics];
    },
    stop: () => page.off("response", onResponse),
  };
}

async function readProofTaskDiagnostics(page: Page, seed: LwwProofIdentity) {
  const storageState = await page.evaluate(
    ({ authOwnerStorageKey, goalId, leadIndicatorId, taskId, taskTitle, userDataStorageKey }) => {
      type StoredData = {
        goals?: Array<{
          id?: string;
          twelveWeekSystem?: {
            currentWeek?: number;
            taskInstances?: Array<{
              id?: string;
              title?: string;
              tacticId?: string;
              weekNumber?: number;
              scheduledDate?: string;
              completed?: boolean;
            }>;
          };
        }>;
      };
      const parseStoredData = (raw: string | null): StoredData | null => {
        if (!raw) return null;
        try {
          return JSON.parse(raw) as StoredData;
        } catch {
          return null;
        }
      };
      const findGoal = (data: StoredData | null) =>
        data?.goals?.find((candidate) => candidate.id === goalId);
      const formatDateKey = (date: Date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };

      const data = parseStoredData(localStorage.getItem(userDataStorageKey));
      const goal = findGoal(data);
      const task = goal?.twelveWeekSystem?.taskInstances?.find(
        (candidate) => candidate.id === taskId,
      );
      const taskInstances = goal?.twelveWeekSystem?.taskInstances ?? [];
      const ownerUid = localStorage.getItem(authOwnerStorageKey)?.trim();
      const scopedData = ownerUid
        ? parseStoredData(
            localStorage.getItem(
              `${userDataStorageKey}:auth:${encodeURIComponent(ownerUid)}`,
            ),
          )
        : null;
      const scopedGoal = findGoal(scopedData);
      const scopedTask = scopedGoal?.twelveWeekSystem?.taskInstances?.find(
        (candidate) => candidate.id === taskId,
      );

      return {
        goalPresent: Boolean(goal),
        taskPresent: Boolean(task),
        taskCompleted: task?.completed ?? null,
        taskCount: taskInstances.length,
        currentWeekTaskCount: taskInstances.filter(
          (candidate) => candidate.weekNumber === (goal?.twelveWeekSystem?.currentWeek ?? 1),
        ).length,
        todayTaskCount: taskInstances.filter(
          (candidate) => candidate.scheduledDate === formatDateKey(new Date()),
        ).length,
        proofTacticTaskCount: taskInstances.filter(
          (candidate) => candidate.tacticId === leadIndicatorId,
        ).length,
        proofTitleTaskCount: taskInstances.filter(
          (candidate) => candidate.title === taskTitle,
        ).length,
        currentWeek: goal?.twelveWeekSystem?.currentWeek ?? null,
        scheduledDateMatchesToday:
          Boolean(task?.scheduledDate) &&
          task?.scheduledDate === formatDateKey(new Date()),
        latestGoalPointerMatches:
          localStorage.getItem("latest_12_week_goal_id") === goalId &&
          localStorage.getItem("latest_12_week_system_goal_id") === goalId,
        authScopedSnapshotMatches: Boolean(scopedGoal && scopedTask),
        authScopedTaskCompleted: scopedTask?.completed ?? null,
      };
    },
    {
      authOwnerStorageKey: AUTH_OWNER_STORAGE_KEY,
      goalId: seed.goalId,
      leadIndicatorId: seed.leadIndicatorId,
      taskId: seed.taskId,
      taskTitle: seed.taskTitle,
      userDataStorageKey: USER_DATA_STORAGE_KEY,
    },
  );

  const currentUrl = new URL(page.url());
  return {
    route: `${currentUrl.pathname}${currentUrl.search}`,
    ...storageState,
    activeProofGoalVisible: await page.getByText(seed.goalTitle, { exact: true }).first().isVisible(),
    proofTaskCheckboxCount: await page
      .getByRole("checkbox", { name: `Hoàn thành việc: ${seed.taskTitle}` })
      .count(),
    visibleCheckboxCount: await page.locator('[role="checkbox"]:visible').count(),
  };
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

async function triggerManualCloudSync(
  page: Page,
  timeoutMs: number = 60_000,
  diagnosticsContext?: ManualSyncDiagnosticsContext,
) {
  await openSettingsWithoutReload(page);
  const syncButton = page.getByRole("button", {
    name: "Kiểm tra sao lưu",
    exact: true,
  });
  await expect(syncButton).toBeVisible({ timeout: 30_000 });
  await waitForManualSyncWindow(page);
  await expect(syncButton).toBeEnabled({ timeout: 30_000 });

  const pullResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      /\/sync\/12-week\/pull$/.test(new URL(response.url()).pathname),
    { timeout: timeoutMs },
  );
  await syncButton.click();

  let pullResponse: Response;
  try {
    pullResponse = await pullResponsePromise;
  } catch (error) {
    const diagnostics = diagnosticsContext
      ? {
          scenario: test.info().title,
          stage: "manual-sync-before-pull",
          queue: await readPendingMutationQueueDiagnostics(page),
          storage: await readProofTaskDiagnostics(page, diagnosticsContext.seed),
          syncResponses: await diagnosticsContext.readSyncResponses(),
        }
      : {
          scenario: test.info().title,
          stage: "manual-sync-before-pull",
          queue: await readPendingMutationQueueDiagnostics(page),
        };
    throw new Error(`Manual 12-week sync did not reach pull: ${JSON.stringify(diagnostics)}`, {
      cause: error,
    });
  }
  const pullDiagnostics = await createSafePullDiagnostics(page, "manual-sync-pull", pullResponse);
  expect(
    pullResponse.ok(),
    `12-week pull failed: ${JSON.stringify(pullDiagnostics)}`,
  ).toBe(true);
  rememberCloudPull(page, pullResponse);
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
  await openSystemTab(page, "today");
  await getProofTaskCheckbox(page, seed.taskTitle);
}

async function pullProofGoal(
  page: Page,
  seed: LwwProofGoal,
  diagnosticsContext: ManualSyncDiagnosticsContext,
) {
  await triggerManualCloudSync(page, 60_000, diagnosticsContext);
  await waitForProofGoal(page, seed);
}

async function waitForProofGoal(page: Page, seed: LwwProofGoal) {
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
  await dialog.getByPlaceholder("XOACLOUD").fill("XOACLOUD");
  const confirmCheckbox = dialog.getByRole("checkbox", {
    name: "Tôi hiểu hành động này là không thể rút lại và đồng ý xóa vĩnh viễn.",
  });
  await confirmCheckbox.click();
  await expect(confirmCheckbox).toBeChecked();
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
  seed: LwwProofGoal,
  diagnosticsContext: ManualSyncDiagnosticsContext,
  timeoutMs: number = 45_000,
) {
  try {
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
              proofGoalId: seed.goalId,
              userDataStorageKey: USER_DATA_STORAGE_KEY,
            },
          ),
        { timeout: timeoutMs, intervals: [1000, 2000, 3000] },
      )
      .toBe(true);
  } catch (error) {
    throw new Error(
      `Tombstone did not remove proof goal: ${JSON.stringify({
        scenario: test.info().title,
        stage: "tombstone-final-storage",
        storage: await readProofTaskDiagnostics(page, seed),
        syncResponses: await diagnosticsContext.readSyncResponses(),
      })}`,
      { cause: error },
    );
  }
}

async function getTaskCompletedState(
  page: Page,
  taskTitle: string,
): Promise<boolean> {
  return (await getProofTaskCheckbox(page, taskTitle)).isChecked();
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
  await loginPage(pageA, EMAIL!, PASSWORD!);

  const apiDiagnostics = captureApiResponseDiagnostics(pageA);
  try {
    const seed = await bootstrapLwwGoal(pageA, scenarioTitle);
    await importLwwBaseline(pageA, seed, apiDiagnostics.read);
    await reloadProofGoal(pageA, seed);
    await loginPage(pageB, EMAIL!, PASSWORD!);
    await waitForProofGoal(pageB, seed);

    expect(await getTaskCompletedState(pageA, seed.taskTitle)).toBe(false);
    expect(await getTaskCompletedState(pageB, seed.taskTitle)).toBe(false);
    return seed;
  } finally {
    apiDiagnostics.stop();
  }
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

    try {
      const seed = await prepareLwwScenario(
        pageA,
        pageB,
        "Local Wins Goal",
      );
      const syncDiagnosticsA = captureLwwSyncResponseDiagnostics(pageA, seed);
      const syncDiagnosticsB = captureLwwSyncResponseDiagnostics(pageB, seed);
      const diagnosticsA = { seed, readSyncResponses: syncDiagnosticsA.read };
      const diagnosticsB = { seed, readSyncResponses: syncDiagnosticsB.read };

      await toggleTask(pageA, seed.taskTitle, true);
      await triggerManualCloudSync(pageA, 60_000, diagnosticsA);
      await pullProofGoal(pageB, seed, diagnosticsB);
      await openProofGoal(pageA, seed);
      await contextA.setOffline(true);

      await toggleTask(pageB, seed.taskTitle, false);
      await triggerManualCloudSync(pageB, 60_000, diagnosticsB);

      await toggleTask(pageA, seed.taskTitle, false);
      await pageA.waitForTimeout(25);
      await toggleTask(pageA, seed.taskTitle, true);
      await contextA.setOffline(false);
      await triggerManualCloudSync(pageA, 60_000, diagnosticsA);
      await openProofGoal(pageA, seed);
      await pullProofGoal(pageB, seed, diagnosticsB);

      await expectNoConflictDialog(pageA);
      await expectNoConflictDialog(pageB);

      await expectTaskConvergence(
        pageA,
        pageB,
        seed,
        true,
        syncDiagnosticsA.read,
        syncDiagnosticsB.read,
      );

    } finally {
      await Promise.all([contextA.close(), contextB.close()]);
    }
  });

  test("cloud wins when cloud is newer", async ({ newProofContext }) => {
    const contextA = await newProofContext();
    const contextB = await newProofContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    try {
      const seed = await prepareLwwScenario(
        pageA,
        pageB,
        "Cloud Wins Goal",
      );
      const syncDiagnosticsA = captureLwwSyncResponseDiagnostics(pageA, seed);
      const syncDiagnosticsB = captureLwwSyncResponseDiagnostics(pageB, seed);
      const diagnosticsA = { seed, readSyncResponses: syncDiagnosticsA.read };
      const diagnosticsB = { seed, readSyncResponses: syncDiagnosticsB.read };
      await contextA.setOffline(true);
      await toggleTask(pageA, seed.taskTitle, true);

      await toggleTask(pageB, seed.taskTitle, true);
      await triggerManualCloudSync(pageB, 60_000, diagnosticsB);
      await openProofGoal(pageB, seed);
      await toggleTask(pageB, seed.taskTitle, false);
      await triggerManualCloudSync(pageB, 60_000, diagnosticsB);

      await contextA.setOffline(false);
      await triggerManualCloudSync(pageA, 60_000, diagnosticsA);
      await openProofGoal(pageA, seed);
      await pullProofGoal(pageB, seed, diagnosticsB);

      await expectNoConflictDialog(pageA);
      await expectNoConflictDialog(pageB);

      await expectTaskConvergence(
        pageA,
        pageB,
        seed,
        false,
        syncDiagnosticsA.read,
        syncDiagnosticsB.read,
      );

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
      const syncDiagnosticsA = captureLwwSyncResponseDiagnostics(pageA, seed);
      const syncDiagnosticsB = captureLwwSyncResponseDiagnostics(pageB, seed);
      const diagnosticsA = { seed, readSyncResponses: syncDiagnosticsA.read };
      const diagnosticsB = { seed, readSyncResponses: syncDiagnosticsB.read };
      await contextA.setOffline(true);
      await toggleTask(pageA, seed.taskTitle, true);

      await deleteProofWorkspace(pageB);

      await contextA.setOffline(false);
      await triggerManualCloudSync(pageA, 60_000, diagnosticsA);
      await triggerManualCloudSync(pageB, 60_000, diagnosticsB);

      await waitForGoalToDisappear(pageA, seed, diagnosticsA);
      await waitForGoalToDisappear(pageB, seed, diagnosticsB);
      await expectNoConflictDialog(pageA);
      await expectNoConflictDialog(pageB);
    } finally {
      await Promise.all([contextA.close(), contextB.close()]);
    }
  });
});
