import { expect, test, type Page } from "@playwright/test";

const BASE_URL = process.env.ACCOUNT_DELETE_E2E_URL?.replace(/\/$/, "");
const ALLOW_DELETE =
  process.env.ACCOUNT_DELETE_E2E_ALLOW === "DELETE_TEST_ACCOUNT";
const AUTH_MODE =
  process.env.ACCOUNT_DELETE_E2E_AUTH_MODE?.trim().toLowerCase() || "signup";
const TIMESTAMP = Date.now();
const GENERATED_EMAIL = `codex.qa+delete-${TIMESTAMP}@example.com`;
const EMAIL = process.env.ACCOUNT_DELETE_E2E_EMAIL?.trim() || GENERATED_EMAIL;
const PASSWORD =
  process.env.ACCOUNT_DELETE_E2E_PASSWORD || `CodexDelete${TIMESTAMP}!`;
const LOCAL_MARKER = `account-delete-e2e-${TIMESTAMP}`;

function isSafeDeleteEmail(email: string) {
  return /(^|[+._-])delete([+._-]|@)/i.test(email);
}

async function submitEmailAuth(
  page: Page,
  mode: "signin" | "signup",
  nextPath: string,
) {
  const modeQuery = mode === "signup" ? "mode=signup&" : "";
  await page.goto(
    `${BASE_URL}/login?${modeQuery}next=${encodeURIComponent(nextPath)}`,
    { waitUntil: "domcontentloaded" },
  );
  await page.locator("#login-email").fill(EMAIL);
  await page.locator("#login-password").fill(PASSWORD);
  if (mode === "signup") {
    await page.locator("#login-confirm-password").fill(PASSWORD);
  }
  await page.locator('form button[type="submit"]').click();

  await page.waitForFunction(
    (expectedPath) =>
      location.pathname === expectedPath ||
      Boolean(document.querySelector('[role="alert"]')),
    nextPath,
    { timeout: 45_000 },
  );

  return new URL(page.url()).pathname === nextPath;
}

async function authenticateDisposableAccount(page: Page) {
  if (AUTH_MODE !== "signin" && AUTH_MODE !== "signup") {
    throw new Error(
      `ACCOUNT_DELETE_E2E_AUTH_MODE must be "signin" or "signup", got "${AUTH_MODE}"`,
    );
  }

  let ok = await submitEmailAuth(
    page,
    AUTH_MODE as "signin" | "signup",
    "/settings",
  );
  if (!ok && AUTH_MODE === "signup") {
    ok = await submitEmailAuth(page, "signin", "/settings");
  }

  if (!ok) {
    const errorText = await page
      .locator('[role="alert"]')
      .innerText()
      .catch(() => "unknown auth error");
    throw new Error(
      `Account delete E2E auth failed for ${EMAIL}: ${errorText}`,
    );
  }
}

async function seedLocalMarker(page: Page) {
  await page.evaluate((marker) => {
    const data = {
      storageVersion: 5,
      aspirationalVision: { summary: marker },
      onboardingCompleted: true,
      goals: [],
      visionBoards: [],
      achievements: [],
      reflections: [],
      eventLog: [],
      syncOutbox: [],
    };
    localStorage.setItem("visionboard_user_data", JSON.stringify(data));
  }, LOCAL_MARKER);
}

async function localMarkerExists(page: Page) {
  return page.evaluate((marker) => {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key) continue;
      const value = localStorage.getItem(key) ?? "";
      if (key.includes(marker) || value.includes(marker)) return true;
    }
    return false;
  }, LOCAL_MARKER);
}

test.describe("staging account deletion", () => {
  test.skip(
    !BASE_URL || !ALLOW_DELETE,
    "Set ACCOUNT_DELETE_E2E_URL and ACCOUNT_DELETE_E2E_ALLOW=DELETE_TEST_ACCOUNT to run",
  );

  test.beforeAll(() => {
    if (!isSafeDeleteEmail(EMAIL)) {
      throw new Error(
        `Refusing to run destructive account-delete smoke for ${EMAIL}. Use a disposable email containing "+delete".`,
      );
    }
  });

  test("deletes a disposable account remotely before clearing local data", async ({
    page,
  }) => {
    await authenticateDisposableAccount(page);
    await seedLocalMarker(page);
    expect(await localMarkerExists(page)).toBe(true);

    await page.goto(`${BASE_URL}/settings`);
    await expect(page.getByTestId("settings-delete-account-open")).toBeVisible({
      timeout: 20_000,
    });

    await page.getByTestId("settings-delete-account-open").click();
    await expect(
      page.getByTestId("settings-delete-account-dialog"),
    ).toBeVisible();
    await page.getByTestId("settings-delete-account-continue").click();
    await expect(
      page.getByTestId("settings-delete-account-confirm"),
    ).toBeVisible();

    const deleteResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "DELETE" &&
        /\/api\/account(\/delete)?$/.test(new URL(response.url()).pathname),
      { timeout: 45_000 },
    );

    await page.getByTestId("settings-delete-account-confirm").click();
    const deleteResponse = await deleteResponsePromise;
    expect(
      deleteResponse.ok(),
      `DELETE account responded ${deleteResponse.status()}`,
    ).toBe(true);

    await expect(page).toHaveURL(/\/$/, { timeout: 45_000 });
    expect(await localMarkerExists(page)).toBe(false);
  });
});
