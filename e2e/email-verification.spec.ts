import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const BASE_URL = process.env.EMAIL_VERIFICATION_E2E_URL?.replace(/\/$/, "");
test.use({ proofBaseURL: BASE_URL });

const ALLOW_CREATE = process.env.EMAIL_VERIFICATION_E2E_ALLOW === "CREATE_TEST_ACCOUNT";
const TIMESTAMP = Date.now();
const GENERATED_EMAIL = `codex.qa+verify-${TIMESTAMP}@example.com`;
const EMAIL = process.env.EMAIL_VERIFICATION_E2E_EMAIL?.trim() || GENERATED_EMAIL;
const PASSWORD = process.env.EMAIL_VERIFICATION_E2E_PASSWORD || `CodexVerify${TIMESTAMP}!`;

function isSafeVerifyEmail(email: string) {
  return /(^|[+._-])verify([+._-]|@)/i.test(email);
}

async function signupDisposableAccount(page: Page) {
  await page.goto(`${BASE_URL}/login?mode=signup&next=${encodeURIComponent("/billing/plan")}`, {
    waitUntil: "domcontentloaded",
  });
  await page.locator("#login-email").fill(EMAIL);
  await page.locator("#login-password").fill(PASSWORD);
  await page.locator("#login-confirm-password").fill(PASSWORD);
  await page.locator('form button[type="submit"]').click();

  await page.waitForFunction(
    () => location.pathname === "/billing/plan" || Boolean(document.querySelector('[role="alert"]')),
    undefined,
    { timeout: 45_000 },
  );

  if (new URL(page.url()).pathname !== "/billing/plan") {
    const errorText = await page.locator('[role="alert"]').innerText().catch(() => "unknown auth error");
    throw new Error(`Email verification E2E signup failed for ${EMAIL}: ${errorText}`);
  }
}

test.describe("staging email verification", () => {
  test.skip(
    !BASE_URL || !ALLOW_CREATE,
    "Set EMAIL_VERIFICATION_E2E_URL and EMAIL_VERIFICATION_E2E_ALLOW=CREATE_TEST_ACCOUNT to run",
  );

  test.beforeAll(() => {
    if (!isSafeVerifyEmail(EMAIL)) {
      throw new Error(
        `Refusing to create email-verification smoke account for ${EMAIL}. Use a disposable email containing "+verify".`,
      );
    }
  });

  test("signs up a disposable user and keeps paid checkout available while email is unverified", async ({ page }) => {
    await signupDisposableAccount(page);

    await expect(page.getByTestId("email-verification-banner")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("email-verification-banner")).toContainText(EMAIL);
    await expect(page.getByTestId("email-verification-resend")).toBeDisabled();

    const upgradeCta = page.getByTestId("billing-plan-upgrade-cta");
    await expect(upgradeCta).toBeVisible({ timeout: 20_000 });

    if (await upgradeCta.isDisabled()) {
      await expect(page.getByTestId("paid-checkout-disabled-banner")).toBeVisible();
      test.info().annotations.push({
        type: "billing-checkout-disabled",
        description: "Global paid-checkout kill switch prevented opening the upgrade dialog.",
      });
      return;
    }

    await upgradeCta.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/xác thực email trước khi thanh toán/i)).toHaveCount(0);
    const dialogCta = page.getByTestId("paywall-upgrade-cta-plus");
    await expect(dialogCta).toBeEnabled();
    await dialogCta.click();
    await expect(page).toHaveURL(/\/billing\/confirm/);
  });
});
