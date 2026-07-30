import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const BASE_URL = process.env.LWW_E2E_URL?.replace(/\/$/, "");
test.use({ proofBaseURL: BASE_URL });

const ALLOW_OVERWRITE =
  process.env.LWW_E2E_ALLOW === "OVERWRITE_TEST_WORKSPACE";
const EMAIL = process.env.LWW_E2E_EMAIL;
const PASSWORD = process.env.LWW_E2E_PASSWORD;
const TIMESTAMP = Date.now();
const TEST_PREFIX = `[LWW-E2E-${TIMESTAMP}]`;

function isSafeLwwEmail(email: string) {
  return /(^|[+._-])lww([+._-]|@)/i.test(email);
}

// ── Helpers ───────────────────────────────────────────────────────

async function loginPage(page: Page, email: string, password: string) {
  await page.goto("/login?next=%2F12-week-system");
  await expect(
    page.getByPlaceholder(/email/i).or(page.locator("#login-email")),
  ).toBeVisible({ timeout: 15_000 });

  await page.fill("#login-email", email);
  await page.fill("#login-password", password);
  await page.getByRole("button", { name: /đăng nhập|sign in/i }).click();

  await expect(page).not.toHaveURL(/\/login/, { timeout: 30_000 });
}

async function createGoalWithTask(page: Page, title: string) {
  await page.goto("/12-week-system");
  await page.waitForLoadState("networkidle");

  const createBtn = page.getByRole("button", { name: /mở trung tâm 12 tuần|tạo mới|setup/i });
  if (await createBtn.isVisible({ timeout: 10_000 })) {
    await createBtn.click();
  }

  await expect(page.getByText(/12 tuần|tactic|task/i)).toBeVisible({
    timeout: 30_000,
  });

  const goalTitle = `${TEST_PREFIX} ${title}`;
  
  const goalNameInput = page.locator('input[aria-label*="mục tiêu"][aria-label*="12"], input[id*="goal"], input[id*="vision"]');
  if (await goalNameInput.count() > 0) {
    await goalNameInput.first().fill(goalTitle);
  } else {
    const textInput = page.locator("input[type='text']");
    if (await textInput.count() > 0) {
      await textInput.first().fill(goalTitle);
    }
  }

  await expect(page.getByText(goalTitle)).toBeVisible({ timeout: 15_000 });
  return goalTitle;
}

async function waitForPageText(page: Page, text: string, timeoutMs: number = 30_000) {
  await expect
    .poll(
      async () => {
        const bodyText = (await page.textContent("body")) || "";
        return bodyText.includes(text);
      },
      { timeout: timeoutMs, intervals: [500, 1000, 2000] },
    )
    .toBe(true);
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

async function getTodayTaskCheckbox(page: Page): Promise<Locator | null> {
  await openSystemTab(page, "today");

  const todayShell = page.locator("[data-twelve-week-today-shell]");
  const scopedCheckbox = todayShell.getByRole("checkbox").first();
  if ((await scopedCheckbox.count()) > 0) return scopedCheckbox;

  const fallback = page
    .locator('[data-testid="today-main-work-grid"] [role="checkbox"], [data-testid="today-main-work-grid"] input[type="checkbox"]')
    .first();
  if ((await fallback.count()) > 0) return fallback;

  return null;
}

async function readCheckboxState(checkbox: Locator): Promise<boolean> {
  return checkbox.isChecked();
}

async function toggleTask(page: Page, completed: boolean) {
  const stableCheckbox = await getTodayTaskCheckbox(page);
  if (stableCheckbox) {
    const isCurrentlyCompleted = await readCheckboxState(stableCheckbox);
    if (completed !== isCurrentlyCompleted) {
      await stableCheckbox.click();
      await expect
        .poll(async () => readCheckboxState(stableCheckbox), { timeout: 10_000, intervals: [250, 500, 1000] })
        .toBe(completed);
    }
    return;
  }

  await page.click('[role="tab"][name*="Hôm nay"]')
    .catch(() => page.goto("/12-week-system?tab=today"));

  const checkbox = page
    .locator('[role="checkbox"], input[type="checkbox"]')
    .filter({ hasText: /task|việc|action|tactic/i })
    .first();

  if (await checkbox.count() > 0) {
    const isChecked = await checkbox.inputValue();
    const shouldCheck = completed;
    const isCurrentlyCompleted = isChecked === "true";

    if (shouldCheck && !isCurrentlyCompleted) {
      await checkbox.click();
    } else if (!shouldCheck && isCurrentlyCompleted) {
      await checkbox.click();
    }
  }
}

async function deleteGoal(page: Page) {
  let acceptedBrowserDialog = false;
  page.once("dialog", async (dialog) => {
    acceptedBrowserDialog = true;
    await dialog.accept();
  });

  await openSystemTab(page, "settings");

  const deleteCloudBtn = page.getByRole("button", {
    name: /x.a d. li.u t.i kho.n|delete cloud|delete workspace/i,
  });
  if (await deleteCloudBtn.count()) {
    await deleteCloudBtn.first().click();
    if (!acceptedBrowserDialog) {
      const dialog = page.locator('[role="alertdialog"], [role="dialog"]').last();
      await expect(dialog).toBeVisible({ timeout: 10_000 });

      const confirmationCheckbox = page.locator("#cloud-delete-confirm-checkbox, #delete-cloud-confirm-checkbox").first();
      if ((await confirmationCheckbox.count()) > 0 && !(await confirmationCheckbox.isChecked())) {
        await confirmationCheckbox.click();
      }

      const confirmationInput = page.locator("#cloud-delete-text-input, input[placeholder='XOACLOUD']").first();
      if ((await confirmationInput.count()) > 0) {
        await confirmationInput.fill("XOACLOUD");
      }

      const confirmButton = dialog.getByRole("button", { name: /x.a d. li.u|delete/i }).last();
      await expect(confirmButton).toBeEnabled({ timeout: 10_000 });
      await confirmButton.click();
      await expect(dialog).toBeHidden({ timeout: 15_000 });
    }
    return;
  }

  await page.goto("/12-week-system");
  await page.waitForLoadState("networkidle");

  const settingsTab = page.getByRole("tab", { name: /cài đặt|setting/i });
  if (await settingsTab.count() > 0) {
    await settingsTab.click();
  }

  const deleteBtn = page.getByRole("button", { name: /xóa|delete|remove/i });
  if (await deleteBtn.count() > 0) {
    await deleteBtn.click();
    
    page.once("dialog", (dialog) => dialog.accept());
    
    await page.waitForTimeout(2_000);
  }
}

async function waitSyncIdle(page: Page, timeoutMs: number = 30_000) {
  await expect
    .poll(
      async () => {
        const pendingQueueCount = await page.evaluate((prefix) => {
          const pendingStatuses = new Set(["pending", "in_flight", "retry_scheduled"]);
          let pendingCount = 0;

          for (let index = 0; index < localStorage.length; index += 1) {
            const key = localStorage.key(index);
            if (!key?.startsWith(prefix)) continue;

            const raw = localStorage.getItem(key);
            if (!raw) continue;

            try {
              const parsed = JSON.parse(raw);
              const items = Array.isArray(parsed?.items) ? parsed.items : [];
              pendingCount += items.filter((item: { status?: string }) => pendingStatuses.has(item.status ?? "")).length;
            } catch (_error) {
              pendingCount += 1;
            }
          }

          return pendingCount;
        }, "visionboard_data_mutation_queue");

        if (pendingQueueCount > 0) return false;

        const queueRaw = await page.evaluate((key) => {
          const raw = localStorage.getItem(key);
          return raw ? JSON.parse(raw) : null;
        }, "visionboard_data_mutation_queue:auth:");

        if (queueRaw?.items) {
          const pendingItems = queueRaw.items.filter(
            (item: { status: string }) =>
              item.status === "pending" || item.status === "in_flight"
          );
          if (pendingItems.length > 0) return false;
        }

        const text = await page.textContent("body") || "";
        const syncingKeywords = ["đang sao lưu", "đang đồng bộ", "syncing", "uploading"];
        const isSyncing = syncingKeywords.some((k) =>
          text.toLowerCase().includes(k)
        );
        if (isSyncing) return false;

        const pillText = await page.locator('[class*="sync"], [data-sync], [class*="pill"]').allTextContents();
        const pillAllText = pillText.join(" ").toLowerCase();
        const isPillSyncing = ["đang", "syncing", "pending", "uploading"].some((k) =>
          pillAllText.includes(k) && !pillAllText.includes("ok") && !pillAllText.includes("idle")
        );
        if (isPillSyncing) return false;

        return true;
      },
      { timeout: timeoutMs, intervals: [500, 1000, 2000] }
    )
    .toBe(true);
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

async function waitForGoalToDisappear(page: Page, timeoutMs: number = 30_000) {
  await expect
    .poll(
      async () => {
        const text = await page.textContent("body") || "";
        return !text.includes(TEST_PREFIX);
      },
      { timeout: timeoutMs, intervals: [1000, 2000, 3000] }
    )
    .toBe(true);
}

async function getTaskCompletedState(page: Page): Promise<boolean | null> {
  const stableCheckbox = await getTodayTaskCheckbox(page);
  if (stableCheckbox) {
    return readCheckboxState(stableCheckbox);
  }

  const checkbox = page
    .locator('[role="checkbox"], input[type="checkbox"]')
    .filter({ hasText: /task|việc|action|tactic/i })
    .first();

  if (await checkbox.count() === 0) return null;

  return await checkbox.isChecked();
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

// ── Tests ─────────────────────────────────────────────────────────

test.describe("LWW auto-resolve sync", () => {
  test.skip(
    !BASE_URL || !ALLOW_OVERWRITE || !EMAIL || !PASSWORD,
    "Set LWW_E2E_URL, LWW_E2E_ALLOW=OVERWRITE_TEST_WORKSPACE, LWW_E2E_EMAIL, and LWW_E2E_PASSWORD to run",
  );
  test.setTimeout(120_000);

  test.beforeAll(() => {
    if (!EMAIL || !isSafeLwwEmail(EMAIL)) {
      throw new Error(
        `Refusing to run LWW overwrite proof for ${EMAIL ?? "(missing email)"}. Use a dedicated QA email containing "+lww".`,
      );
    }
  });

  test("local wins when local mutation is newer", async ({ browser }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    const consoleLogsA = await captureConsoleLogs(pageA);

    try {
      await loginPage(pageA, EMAIL, PASSWORD);
      await loginPage(pageB, EMAIL, PASSWORD);

      await createGoalWithTask(pageA, "Local Wins Goal");
      await waitSyncIdle(pageA);

      await pageB.goto("/12-week-system");
      await waitForPageText(pageB, TEST_PREFIX);

      await toggleTask(pageA, true);
      await contextA.setOffline(true);

      await waitSyncIdle(pageB);

      await toggleTask(pageB, false);
      await waitSyncIdle(pageB);

      await toggleTask(pageA, true);

      await contextA.setOffline(false);
      await waitSyncIdle(pageA, 45_000);

      await pageB.reload();
      await waitSyncIdle(pageB);

      await expectNoConflictDialog(pageA);
      await expectNoConflictDialog(pageB);

      const stateA = await getTaskCompletedState(pageA);
      const stateB = await getTaskCompletedState(pageB);

      expect(stateA).toBe(true);
      expect(stateB).toBe(true);

      const hasLwwLog = consoleLogsA.some((log) =>
        log.includes("resolved")
      );
      expect(hasLwwLog).toBe(true);
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });

  test("cloud wins when cloud is newer", async ({ browser }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      await loginPage(pageA, EMAIL, PASSWORD);
      await loginPage(pageB, EMAIL, PASSWORD);

      await createGoalWithTask(pageA, "Cloud Wins Goal");
      await waitSyncIdle(pageA);

      await toggleTask(pageA, true);
      await waitSyncIdle(pageA);

      await contextA.setOffline(true);

      await toggleTask(pageB, false);
      await waitSyncIdle(pageB, 45_000);

      await contextA.setOffline(false);
      await pageA.reload();
      await waitSyncIdle(pageA, 45_000);

      await expectNoConflictDialog(pageA);
      await expectNoConflictDialog(pageB);

      const stateA = await getTaskCompletedState(pageA);
      const stateB = await getTaskCompletedState(pageB);

      expect(stateA).toBe(false);
      expect(stateB).toBe(false);
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });

  test("tombstone wins over pending mutation", async ({ browser }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      await loginPage(pageA, EMAIL, PASSWORD);
      await loginPage(pageB, EMAIL, PASSWORD);

      await createGoalWithTask(pageA, "Tombstone Goal");
      await waitSyncIdle(pageA);

      await toggleTask(pageA, true);

      await contextA.setOffline(true);

      await deleteGoal(pageB);
      await waitSyncIdle(pageB, 45_000);

      await contextA.setOffline(false);
      await pageA.reload();
      await waitSyncIdle(pageA, 45_000);

      await expectNoConflictDialog(pageA);
      await expectNoConflictDialog(pageB);

      await waitForGoalToDisappear(pageA, 30_000);
      await waitForGoalToDisappear(pageB, 30_000);
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
});
