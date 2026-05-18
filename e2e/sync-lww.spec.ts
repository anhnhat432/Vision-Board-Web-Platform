import { test, expect, type Page, type BrowserContext } from "@playwright/test";

const BASE_URL = process.env.LWW_E2E_URL?.replace(/\/$/, "");
const EMAIL = process.env.LWW_E2E_EMAIL;
const PASSWORD = process.env.LWW_E2E_PASSWORD;
const TIMESTAMP = Date.now();
const TEST_PREFIX = `[LWW-E2E-${TIMESTAMP}]`;

// ── Helpers ───────────────────────────────────────────────────────

async function loginPage(page: Page, email: string, password: string) {
  await page.goto("/login?next=%2F12-week-system");
  await expect(page.getByPlaceholder(/email/i)).or(
    page.locator("#login-email")
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

async function toggleTask(page: Page, completed: boolean) {
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
        const queueKey = "visionboard_data_mutation_queue:auth:user";
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
    !BASE_URL || !EMAIL || !PASSWORD,
    "Missing LWW_E2E_* env vars"
  );
  test.setTimeout(90_000);

  test("local wins when local mutation is newer", async ({ browser }) => {
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    const consoleLogsA: string[] = [];
    pageA.on("console", (msg) => {
      const text = msg.text();
      if (text.includes("[auto-sync-lww]")) {
        consoleLogsA.push(text);
      }
    });

    try {
      await loginPage(pageA, EMAIL, PASSWORD);
      await loginPage(pageB, EMAIL, PASSWORD);

      await createGoalWithTask(pageA, "Local Wins Goal");
      await waitSyncIdle(pageA);

      await pageB.goto("/12-week-system");
      await waitFor(() =>
        Promise.resolve(
          pageB.textContent("body")?.includes(TEST_PREFIX) ?? false
        )
      );

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