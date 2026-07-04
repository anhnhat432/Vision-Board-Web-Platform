import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const screenshotDir = path.join(process.cwd(), 'e2e', 'screenshots');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

test.describe('Visual QA - Motion Effects Checklist', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
  });

  test('Dashboard - Desktop 1440x900', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(screenshotDir, 'qa-dashboard-desktop.png'), fullPage: true });

    const ctaButton = page.getByRole('button', { name: /Thiết lập chu kỳ 12 tuần/i }).first();
    await expect(ctaButton).toBeVisible();
  });

  test('Dashboard - Mobile 390x844', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(screenshotDir, 'qa-dashboard-mobile.png'), fullPage: true });
  });

  test('SMARTGoalSetup - Desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:5173/smart-goal-setup');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(screenshotDir, 'qa-smart-goal-desktop.png'), fullPage: true });
  });

  test('SMARTGoalSetup - Mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:5173/smart-goal-setup');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(screenshotDir, 'qa-smart-goal-mobile.png'), fullPage: true });
  });

  test('Feasibility Result - Desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:5173/feasibility');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(screenshotDir, 'qa-feasibility-desktop.png'), fullPage: true });
  });

  test('12WeekSetup - Desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:5173/12-week-setup');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(screenshotDir, 'qa-12week-setup-desktop.png'), fullPage: true });
  });

  test('12WeekSystem Today Tab - Desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:5173/12-week-system');
    await page.waitForLoadState('networkidle');
    const todayTab = page.getByRole('tab', { name: /Hôm nay/i });
    if (await todayTab.isVisible()) {
      await todayTab.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: path.join(screenshotDir, 'qa-today-tab-desktop.png'), fullPage: true });
  });

  test('12WeekSystem Today Tab - Mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://localhost:5173/12-week-system');
    await page.waitForLoadState('networkidle');
    const todayTab = page.getByRole('tab', { name: /Hôm nay/i });
    if (await todayTab.isVisible()) {
      await todayTab.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: path.join(screenshotDir, 'qa-today-tab-mobile.png'), fullPage: true });
  });

  test('12WeekSystem Week Tab - Desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:5173/12-week-system');
    await page.waitForLoadState('networkidle');
    const weekTab = page.getByRole('tab', { name: /Tuần/i });
    if (await weekTab.isVisible()) {
      await weekTab.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: path.join(screenshotDir, 'qa-week-tab-desktop.png'), fullPage: true });
  });

  test('12WeekSystem Progress Tab - Desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:5173/12-week-system');
    await page.waitForLoadState('networkidle');
    const progressTab = page.getByRole('tab', { name: /Tiến độ/i });
    if (await progressTab.isVisible()) {
      await progressTab.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: path.join(screenshotDir, 'qa-progress-tab-desktop.png'), fullPage: true });
  });

  test('12WeekSystem Settings Tab - Desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('http://localhost:5173/12-week-system');
    await page.waitForLoadState('networkidle');
    const settingsTab = page.getByRole('tab', { name: /Cài đặt/i });
    if (await settingsTab.isVisible()) {
      await settingsTab.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({ path: path.join(screenshotDir, 'qa-settings-tab-desktop.png'), fullPage: true });
  });

  test('Reduced Motion - Dashboard', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('http://localhost:5173/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(screenshotDir, 'qa-dashboard-reduced-motion.png'), fullPage: true });
  });
});
