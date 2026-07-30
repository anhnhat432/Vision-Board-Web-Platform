import type { Page } from "@playwright/test";
import { resolveAccountDeleteE2ECredentials } from "../scripts/account-delete-e2e-credentials.mjs";
import { expect, test } from "./fixtures";

const BASE_URL = process.env.ACCOUNT_DELETE_E2E_URL?.replace(/\/$/, "");
test.use({ proofBaseURL: BASE_URL });

const ALLOW_DELETE =
  process.env.ACCOUNT_DELETE_E2E_ALLOW === "DELETE_TEST_ACCOUNT";
const AUTH_MODE =
  process.env.ACCOUNT_DELETE_E2E_AUTH_MODE?.trim().toLowerCase() || "signup";
const TIMESTAMP = Date.now();
const { email: EMAIL, password: PASSWORD } =
  resolveAccountDeleteE2ECredentials({
    authMode: AUTH_MODE,
    timestamp: TIMESTAMP,
    env: process.env,
  });
const LOCAL_MARKER = `account-delete-e2e-${TIMESTAMP}`;
const USER_DATA_STORAGE_KEY = "visionboard_user_data";
const AUTH_OWNER_STORAGE_KEY = "visionboard_user_data:auth_owner_uid";
const SETTINGS_GUIDE_SEEN_STORAGE_KEY =
  "visionboard_screen_guide_seen:settings";

function isSafeDeleteEmail(email: string) {
  return /(^|[+._-])delete([+._-]|@)/i.test(email);
}

function isSafePostDeleteUrl(value: string) {
  const url = new URL(value);
  return (
    url.pathname === "/" ||
    url.pathname === "/onboarding" ||
    (url.pathname === "/login" &&
      url.searchParams.get("next") === "/onboarding")
  );
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
  await page.evaluate(
    ({ authOwnerStorageKey, marker, userDataStorageKey }) => {
      const raw = localStorage.getItem(userDataStorageKey);
      const ownerUid = localStorage.getItem(authOwnerStorageKey)?.trim();
      if (!raw || !ownerUid) {
        throw new Error(
          "Authenticated local snapshot was not ready for account-delete proof.",
        );
      }

      const currentData = JSON.parse(raw) as {
        aspirationalVision?: Record<string, unknown>;
      } & Record<string, unknown>;
      const aspirationalVision =
        currentData.aspirationalVision &&
        typeof currentData.aspirationalVision === "object"
          ? currentData.aspirationalVision
          : {};
      const data = {
        ...currentData,
        aspirationalVision: {
          ...aspirationalVision,
          summary: marker,
        },
        onboardingCompleted: true,
      };
      const serialized = JSON.stringify(data);
      localStorage.setItem(userDataStorageKey, serialized);
      localStorage.setItem(
        `${userDataStorageKey}:auth:${encodeURIComponent(ownerUid)}`,
        serialized,
      );
    },
    {
      authOwnerStorageKey: AUTH_OWNER_STORAGE_KEY,
      marker: LOCAL_MARKER,
      userDataStorageKey: USER_DATA_STORAGE_KEY,
    },
  );
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

async function primeSettingsGuideSeenState(page: Page) {
  await page.addInitScript((storageKey) => {
    localStorage.setItem(storageKey, "true");
    const seenAt = new Date().toISOString();
    localStorage.setItem("visionboard_new_user_guide_seen_at", seenAt);
    localStorage.setItem(
      "visionboard_first_run_guidance_completed_at",
      seenAt,
    );
  }, SETTINGS_GUIDE_SEEN_STORAGE_KEY);
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
    await primeSettingsGuideSeenState(page);
    await authenticateDisposableAccount(page);
    await seedLocalMarker(page);
    expect(await localMarkerExists(page)).toBe(true);

    await page.goto(`${BASE_URL}/settings`);
    expect(await localMarkerExists(page)).toBe(true);
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

    try {
      await expect
        .poll(() => isSafePostDeleteUrl(page.url()), { timeout: 45_000 })
        .toBe(true);
    } catch {
      const currentUrl = new URL(page.url());
      throw new Error(
        `Account deletion reached an unexpected post-delete route: ${currentUrl.pathname}${currentUrl.search}`,
      );
    }
    expect(await localMarkerExists(page)).toBe(false);
  });
});
