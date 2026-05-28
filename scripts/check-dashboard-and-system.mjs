import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  // Seed full state
  await page.goto('http://localhost:5173/');
  await page.evaluate(() => {
    const data = {
      storageVersion: 5,
      userId: "ux-ui-qa",
      currentWheelOfLife: [
        { name: "Career", score: 7, color: "#8b5cf6" },
        { name: "Finance", score: 6, color: "#10b981" },
        { name: "Health", score: 6, color: "#ef4444" },
        { name: "Education", score: 7, color: "#f59e0b" },
        { name: "Relationships", score: 6, color: "#ec4899" },
        { name: "Family", score: 7, color: "#3b82f6" },
        { name: "Personal Growth", score: 8, color: "#14b8a6" },
        { name: "Leisure", score: 5, color: "#a855f7" },
      ],
      goals: [{
        id: "goal_1",
        title: "QA Goal",
        twelveWeekSystem: {
          currentWeek: 1,
          totalWeeks: 12,
          taskInstances: [{ id: "t1", title: "Task 1", completed: false, scheduledDate: new Date().toISOString().split('T')[0] }],
          scoreboard: Array(12).fill({ weekNumber: 1, reviewDone: false })
        }
      }],
      onboardingCompleted: true,
    };
    localStorage.setItem("visionboard_user_data", JSON.stringify(data));
    localStorage.setItem("latest_12_week_goal_id", "goal_1");
    localStorage.setItem("latest_12_week_system_goal_id", "goal_1");
    window.dispatchEvent(new CustomEvent("visionboard:user-data-updated"));
  });

  await page.reload();

  // 1. Check Dashboard
  await page.screenshot({ path: 'dashboard-check.png', fullPage: true });
  console.log('Captured Dashboard');

  // 2. Check 12-Week System
  await page.goto('http://localhost:5173/12-week-system');
  await page.waitForSelector('[role="tablist"]');
  await page.screenshot({ path: 'system-check.png', fullPage: true });
  console.log('Captured 12-Week System');

  await browser.close();
})();
