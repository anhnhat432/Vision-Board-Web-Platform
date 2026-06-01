import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE_URL = "http://localhost:5173";
const OUTPUT_DIR = "C:/Users/admin/.gemini/antigravity/brain/62c11841-49c9-40cb-83ee-671b233954d2";

const VIEWPORTS = [
  { name: "mobile_375", width: 375, height: 812 },
  { name: "tablet_768", width: 768, height: 1024 },
  { name: "desktop_1280", width: 1280, height: 800 }
];

async function seedLocalStorageForFreshOnboarding(page) {
  await page.evaluate(() => {
    localStorage.clear();
    const data = {
      storageVersion: 5,
      userId: "fresh-user",
      wheelOfLifeHistory: [],
      currentWheelOfLife: [
        { name: "Career", score: 0 },
        { name: "Finance", score: 0 },
        { name: "Health", score: 0 },
        { name: "Education", score: 0 },
        { name: "Relationships", score: 0 },
        { name: "Family", score: 0 },
        { name: "Personal Growth", score: 0 },
        { name: "Leisure", score: 0 },
      ],
      goals: [],
      visionBoards: [],
      achievements: [],
      reflections: [],
      eventLog: [],
      syncOutbox: [],
      appPreferences: {
        allowLocalAnalytics: true,
        enableInAppReminders: true,
        enableBrowserNotifications: false,
        keepLocalOutbox: true,
        preferredReminderHour: 19,
      },
      subscription: null,
      entitlements: [],
      onboardingCompleted: false,
      isHydratedFromDemo: false,
    };
    localStorage.setItem("visionboard_user_data", JSON.stringify(data));
  });
}

async function run() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  console.log("Launching browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("Navigating to welcome step of onboarding...");
  await page.goto(`${BASE_URL}/onboarding`);
  await page.waitForLoadState("networkidle");
  
  await seedLocalStorageForFreshOnboarding(page);
  await page.goto(`${BASE_URL}/onboarding`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500); // Đợi 1.5s để vẽ xong ảnh vẽ tay

  console.log("=== Capturing Welcome Step ===");
  for (const viewport of VIEWPORTS) {
    console.log(`Viewport: ${viewport.name} (${viewport.width}x${viewport.height})`);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForTimeout(1000); // Đợi layout ổn định

    const fileName = `onboarding_welcome_${viewport.name}.png`;
    const filePath = path.join(OUTPUT_DIR, fileName);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`Saved screenshot to ${filePath}`);
  }

  console.log("Navigating to assessment step...");
  const startButton = page.locator("button:has-text('Bắt đầu rà 8 lĩnh vực')");
  await startButton.click();
  await page.waitForTimeout(1500); // wait for state change and scroll

  console.log("=== Capturing Assessment Step ===");
  for (const viewport of VIEWPORTS) {
    console.log(`Viewport: ${viewport.name} (${viewport.width}x${viewport.height})`);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForTimeout(1000); // Đợi layout ổn định

    const fileName = `onboarding_assessment_${viewport.name}.png`;
    const filePath = path.join(OUTPUT_DIR, fileName);
    await page.screenshot({ path: filePath, fullPage: true });
    console.log(`Saved screenshot to ${filePath}`);
  }

  await browser.close();
  console.log("All screenshots captured successfully.");
}

run().catch(err => {
  console.error("Error in capture script:", err);
  process.exit(1);
});
