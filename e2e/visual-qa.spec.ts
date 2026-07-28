import { test, expect, type Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

const screenshotDir = path.join(process.cwd(), 'output', 'playwright', 'visual-qa');
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

async function seedCockpitData(page: Page, theme: 'light' | 'dark' = 'light') {
  await page.goto('/');
  await page.evaluate((selectedTheme) => {
    const pad = (value: number) => String(value).padStart(2, '0');
    const dateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
    const addDays = (date: Date, days: number) => {
      const next = new Date(date);
      next.setDate(next.getDate() + days);
      return next;
    };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const goalId = 'goal_execution_cockpit_qa';
    const tacticOneId = 'tactic_execution_qa_1';
    const tacticTwoId = 'tactic_execution_qa_2';
    const totalWeeks = 12;
    const weeklyPlans = Array.from({ length: totalWeeks }, (_, index) => ({
      weekNumber: index + 1,
      focus: index === 0 ? 'Khóa nhịp tuần đầu tiên.' : 'Giữ nhịp execution.',
      milestone: index === 11 ? 'Hoàn thành chu kỳ.' : '',
      completed: false,
    }));
    const scoreboard = Array.from({ length: totalWeeks }, (_, index) => ({
      weekNumber: index + 1,
      leadCompletionPercent: index === 0 ? 60 : 0,
      mainMetricProgress: index === 0 ? 'Đã hoàn thành hai phiên deep work.' : '',
      outputDone: '',
      reviewDone: false,
      weeklyScore: index === 0 ? 60 : 0,
    }));
    const taskInstances = [
      {
        id: 'tw_execution_qa_1',
        weekNumber: 1,
        scheduledDate: dateKey(today),
        title: 'Hoàn thiện case study trọng tâm',
        leadIndicatorName: 'Deep work cho case study',
        isCore: true,
        completed: false,
        tacticId: tacticOneId,
      },
      {
        id: 'tw_execution_qa_2',
        weekNumber: 1,
        scheduledDate: dateKey(today),
        title: 'Gửi bản nháp để nhận phản hồi',
        leadIndicatorName: 'Gửi bản nháp',
        isCore: false,
        completed: false,
        tacticId: tacticTwoId,
      },
    ];
    const data = {
      storageVersion: 5,
      userId: 'execution-cockpit-qa',
      wheelOfLifeHistory: [],
      currentWheelOfLife: [],
      goals: [
        {
          id: goalId,
          category: 'Career',
          title: 'Ra mắt portfolio mới và tạo 20 cơ hội nghề nghiệp chất lượng',
          description: 'Dữ liệu QA cục bộ cho Execution Cockpit.',
          deadline: dateKey(addDays(today, 83)),
          feasibilityResult: 'realistic',
          readinessScore: 18,
          focusArea: 'Career',
          tasks: [],
          createdAt: new Date().toISOString(),
          twelveWeekSystem: {
            goalType: 'Project Completion',
            vision12Week: 'Ra mắt portfolio và tạo 20 cơ hội chất lượng',
            lagMetric: { name: 'Cơ hội chất lượng', unit: 'cơ hội', target: '20', currentValue: '4' },
            leadIndicators: [
              {
                id: tacticOneId,
                name: 'Deep work cho case study',
                target: '3',
                unit: 'phiên/tuần',
                type: 'core',
                priority: 1,
                schedule: [0, 2, 4],
              },
              {
                id: tacticTwoId,
                name: 'Gửi bản nháp',
                target: '1',
                unit: 'lần/tuần',
                type: 'optional',
                priority: 2,
                schedule: [0],
              },
            ],
            milestones: {
              week4: 'Chốt cấu trúc portfolio.',
              week8: 'Xuất bản hai case study.',
              week12: 'Tạo 20 cơ hội chất lượng.',
            },
            successEvidence: 'Portfolio live và có phản hồi từ thị trường.',
            reviewDay: 'Sunday',
            week12Outcome: 'Portfolio tạo ra cơ hội nghề nghiệp thật.',
            startDate: dateKey(today),
            endDate: dateKey(addDays(today, 83)),
            timezone: 'Asia/Ho_Chi_Minh',
            weekStartsOn: 'Monday',
            status: 'active',
            dailyReminderTime: '19:00',
            tacticLoadPreference: 'balanced',
            reentryCount: 0,
            currentWeek: 1,
            totalWeeks,
            weeklyPlans,
            taskInstances,
            dailyCheckIns: [],
            weeklyReviews: [],
            scoreboard,
            weeklyTimeBlocks: [],
          },
        },
      ],
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
      onboardingCompleted: true,
      isHydratedFromDemo: false,
    };

    localStorage.setItem('visionboard_user_data', JSON.stringify(data));
    localStorage.setItem('latest_12_week_goal_id', goalId);
    localStorage.setItem('latest_12_week_system_goal_id', goalId);
    localStorage.setItem('selected_focus_area', 'Career');
    localStorage.setItem('dof_theme', selectedTheme);
    localStorage.removeItem('backend_goal_links');
    localStorage.removeItem('backend_plan_links');
    window.dispatchEvent(new CustomEvent('visionboard:user-data-updated'));
  }, theme);
}

async function openCockpit(page: Page, theme: 'light' | 'dark' = 'light') {
  await seedCockpitData(page, theme);
  await page.goto('/12-week-system');
  await expect(page.getByRole('navigation', { name: 'Điều hướng hệ 12 tuần' })).toBeVisible();
}

async function expectCockpitFirstViewport(page: Page) {
  const tabs = page.getByRole('navigation', { name: 'Điều hướng hệ 12 tuần' });
  const primary = page.locator('[data-testid="today-primary-hero"], [data-testid="today-next-action-panel"]');
  await expect(tabs).toBeVisible();
  await expect(primary).toBeVisible();
  const tabBox = await tabs.boundingBox();
  const primaryBox = await primary.boundingBox();
  expect(tabBox?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(844);
  expect(primaryBox?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(844);
}

async function expectCockpitLayout(page: Page) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    h1Count: document.querySelectorAll('main h1').length,
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
  expect(metrics.h1Count).toBe(1);
}

async function expectCockpitTabLabelsUnclipped(page: Page) {
  for (const label of ['Hôm nay', 'Tuần', 'Tiến độ', 'Cài đặt']) {
    const text = page.getByRole('tab', { name: `Mở tab ${label}`, exact: true }).locator('span').first();
    const isClipped = await text.evaluate((element) => element.scrollWidth > element.clientWidth + 1);
    expect(isClipped, `Nhãn tab "${label}" không được bị cắt ở mobile`).toBe(false);
  }
}

async function selectCockpitTab(page: Page, label: string) {
  const tab = page.getByRole('tab', { name: `Mở tab ${label}`, exact: true });
  await tab.click();
  await expect(tab).toHaveAttribute('aria-selected', 'true');

  const content =
    label === 'Hôm nay'
      ? page.locator('[data-testid="today-primary-hero"], [data-testid="today-next-action-panel"]')
      : label === 'Tuần'
        ? page.getByTestId('weekly-review-shell')
        : label === 'Tiến độ'
          ? page.getByTestId('progress-trend-hero')
          : page.getByRole('region', { name: 'Chu kỳ' });
  await expect(content).toBeVisible();
  await page.waitForTimeout(250);
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

test.describe('Execution Cockpit - responsive visual QA', () => {
  const tabs = [
    { label: 'Hôm nay', slug: 'today' },
    { label: 'Tuần', slug: 'week' },
    { label: 'Tiến độ', slug: 'progress' },
    { label: 'Cài đặt', slug: 'settings' },
  ];

  test('captures all tabs at 1440x900', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openCockpit(page);

    for (const tab of tabs) {
      await selectCockpitTab(page, tab.label);
      await page.screenshot({
        path: path.join(screenshotDir, `qa-cockpit-${tab.slug}-desktop.png`),
        fullPage: true,
      });
    }
  });

  test('keeps all tabs within the 390x844 mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openCockpit(page);
    await expectCockpitTabLabelsUnclipped(page);

    for (const tab of tabs) {
      await selectCockpitTab(page, tab.label);
      if (tab.slug === 'today') await expectCockpitFirstViewport(page);
      await expectCockpitLayout(page);
      await page.screenshot({
        path: path.join(screenshotDir, `qa-cockpit-${tab.slug}-mobile.png`),
        fullPage: true,
      });
    }
  });

  test('remains usable in dark mode with reduced motion', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await openCockpit(page, 'dark');
    await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
    await selectCockpitTab(page, 'Tiến độ');
    await expectCockpitLayout(page);
    await page.screenshot({
      path: path.join(screenshotDir, 'qa-cockpit-progress-mobile-dark-reduced-motion.png'),
      fullPage: true,
    });
  });
});
