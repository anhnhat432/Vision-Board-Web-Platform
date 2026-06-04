import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE_URL = "http://localhost:5174";
const OUTPUT_DIR = "C:/Users/admin/.gemini/antigravity/brain/0b60e8f1-404a-4b84-b03d-51b2b4adc42d/scratch/screenshots";

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
  { name: "wide", width: 1920, height: 1080 }
];

const PAGES = [
  { name: "goals", path: "/goals" }
];

async function seedLocalStorage(page) {
  await page.evaluate(() => {
    const pad = (value) => String(value).padStart(2, "0");
    const dateKey = (date) => date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
    const startOfWeek = (date) => {
      const next = new Date(date);
      next.setHours(0, 0, 0, 0);
      const delta = (next.getDay() - 1 + 7) % 7;
      next.setDate(next.getDate() - delta);
      return next;
    };
    const addDays = (date, days) => {
      const next = new Date(date);
      next.setDate(next.getDate() + days);
      return next;
    };
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const weekStart = startOfWeek(today);
    const todayOffset = Math.max(0, Math.min(6, Math.round((today.getTime() - weekStart.getTime()) / 86400000)));
    const goalId = "goal_review_test";
    const tacticOneId = "tactic_one";
    const tacticTwoId = "tactic_two";
    const totalWeeks = 12;

    const pendingSmartGoal = {
      id: "smart_uxqa",
      focus_area: "Personal Growth",
      specific: { goal_statement: "Đạt IELTS 7.0 trước tháng 9" },
      measurable: { metric_name: "tuần review hoàn chỉnh", baseline: 0, target: 12, metric_unit: "tuần" },
      achievable: {
        weekly_hours: 5,
        required_skills: ["Lập kế hoạch tuần", "Review ngắn"],
        support_resources: ["Dashboard production", "Lịch cá nhân"],
      },
      relevant: {
        motivation_reason: "Cần một nhịp review đủ rõ để không bỏ dở mục tiêu dài hạn.",
        life_dimension_alignment: "Sự nghiệp",
      },
      time_bound: { target_weeks: 12, start_date: dateKey(today) },
    };

    const pendingFeasibilityResult = {
      resultType: "realistic",
      resultTitle: "Mục tiêu này đủ thực tế nếu giữ đúng độ nặng.",
      resultSummary: "Visual QA review - Đánh giá thực tế cho mục tiêu IELTS.",
      recommendation: "Hãy khóa ít nhất 2 khung giờ cố định trong tuần để đảm bảo giữ nhịp tốt.",
      readinessScore: 18,
      adjustedScore: 18,
      wheelScore: 7,
      diagnosticScore: 22,
      maxDiagnosticScore: 28,
      axisScores: [],
      bottleneck: { axis: "time", label: "Thời gian thật", score: 4, action: "Khóa 2 khung giờ cố định." },
      planLoad: "balanced",
      weeklyCapacity: "medium",
      firstWeekGuidance: "Tuần 1 nên cân bằng: đủ nhẹ để giữ nhịp, đủ rõ để tiến lên.",
      scopeRecommendation: "Giữ một kết quả chính và 2 việc lặp lại hằng tuần.",
      smartGoalQualityLevel: "okay",
    };

    const pending12WeekSetupDraft = {
      templateId: "",
      goalType: "Personal Growth",
      vision12Week: "Đạt IELTS 7.0 trước tháng 9",
      week12Outcome: "Complete a stable visual QA cycle.",
      lagMetricName: "completed review weeks",
      lagMetricTarget: "12",
      lagMetricUnit: "weeks",
      leadIndicators: [
        { id: tacticOneId, name: "Luyện 1 đề Listening", target: "1", unit: "lần/tuần", type: "core", cadence: "spread" },
        { id: tacticTwoId, name: "Viết 1 essay Task 2", target: "1", unit: "lần/tuần", type: "core", cadence: "spread" },
      ],
      startDate: dateKey(today),
      reviewDay: "Sunday",
      tacticLoadPreference: "balanced",
      week4Milestone: "Week 4 rhythm is visible.",
      week8Milestone: "Week 8 review habit is stable.",
      successEvidence: "Review loop works smoothly.",
      dailyTimeBudget: "30",
      preferredDays: [todayOffset],
      personalConstraint: "time",
    };

    const weeklyPlans = Array.from({ length: totalWeeks }, (_, index) => ({
      weekNumber: index + 1,
      focus: index === 0 ? "Bắt đầu nhịp tuần 1." : "Giữ nhịp execution.",
      milestone: index === 11 ? "Hoàn thành chu kỳ." : "",
      completed: false,
    }));
    const scoreboard = Array.from({ length: totalWeeks }, (_, index) => ({
      weekNumber: index + 1,
      leadCompletionPercent: 0,
      mainMetricProgress: "",
      outputDone: "",
      reviewDone: false,
      weeklyScore: 0,
    }));

    const taskInstances = [
      {
        id: "tw_task_1",
        weekNumber: 1,
        scheduledDate: dateKey(today),
        title: "Luyện 1 đề Listening",
        leadIndicatorName: "Luyện 1 đề Listening",
        isCore: true,
        completed: false,
        tacticId: tacticOneId,
      },
      {
        id: "tw_task_2",
        weekNumber: 1,
        scheduledDate: dateKey(today),
        title: "Viết 1 essay Task 2",
        leadIndicatorName: "Viết 1 essay Task 2",
        isCore: true,
        completed: false,
        tacticId: tacticTwoId,
      },
    ];

    const data = {
      storageVersion: 5,
      userId: "ux-ui-qa",
      wheelOfLifeHistory: [],
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
      goals: [
        {
          id: goalId,
          category: "Personal Growth",
          title: "Đạt IELTS 7.0 trước tháng 9",
          description: "Visual QA review - Đánh giá thực tế cho mục tiêu IELTS.",
          deadline: dateKey(addDays(today, 83)),
          feasibilityResult: "realistic",
          readinessScore: 18,
          focusArea: "Personal Growth",
          tasks: [],
          createdAt: now.toISOString(),
          twelveWeekSystem: {
            goalType: "Personal Growth",
            vision12Week: "Đạt IELTS 7.0 trước tháng 9",
            lagMetric: { name: "tuần review hoàn chỉnh", unit: "tuần", target: "12", currentValue: "0" },
            leadIndicators: [
              { id: tacticOneId, name: "Luyện 1 đề Listening", target: "1", unit: "lần/tuần", type: "core", priority: 1, schedule: [todayOffset] },
              { id: tacticTwoId, name: "Viết 1 essay Task 2", target: "1", unit: "lần/tuần", type: "core", priority: 2, schedule: [todayOffset] },
            ],
            milestones: {
              week4: "Hoàn thành 4 tuần đầu giữ nhịp.",
              week8: "Khóa được nhịp giữa chu kỳ.",
              week12: "Kết thúc chu kỳ.",
            },
            successEvidence: "Review loop works smoothly.",
            reviewDay: "Sunday",
            week12Outcome: "Một chu kỳ đầy đủ.",
            startDate: dateKey(weekStart),
            endDate: dateKey(addDays(weekStart, 83)),
            timezone: "Asia/Ho_Chi_Minh",
            weekStartsOn: "Monday",
            status: "active",
            dailyReminderTime: "19:00",
            tacticLoadPreference: "balanced",
            reentryCount: 0,
            currentWeek: 1,
            totalWeeks,
            weeklyPlans,
            taskInstances,
            dailyCheckIns: [],
            weeklyReviews: [],
            scoreboard,
          },
        },
        {
          id: "normal_goal_1",
          category: "Health",
          title: "Chạy bộ 5km mỗi tuần để rèn thể lực",
          description: "Mục tiêu thường không sử dụng chu kỳ 12 tuần.",
          deadline: dateKey(addDays(today, 30)),
          tasks: [
            { id: "normal_task_1", title: "Mua giày chạy mới", completed: false, createdAt: now.toISOString() },
            { id: "normal_task_2", title: "Chạy buổi đầu tiên 2km", completed: true, createdAt: now.toISOString(), lastModifiedAt: now.getTime() }
          ],
          createdAt: now.toISOString()
        }
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

    localStorage.setItem("visionboard_user_data", JSON.stringify(data));
    localStorage.setItem("latest_12_week_goal_id", goalId);
    localStorage.setItem("latest_12_week_system_goal_id", goalId);
    localStorage.setItem("pending_smart_goal", JSON.stringify(pendingSmartGoal));
    localStorage.setItem("pending_feasibility_result", JSON.stringify(pendingFeasibilityResult));
    localStorage.setItem("pending_12_week_setup_draft", JSON.stringify(pending12WeekSetupDraft));
    localStorage.setItem("selected_focus_area", "Personal Growth");
    localStorage.removeItem("backend_goal_links");
    localStorage.removeItem("backend_plan_links");
    window.dispatchEvent(new CustomEvent("visionboard:user-data-updated"));
  });
}

async function run() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  console.log(`Launching browser...`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log(`Navigating to ${BASE_URL}...`);
  await page.goto(BASE_URL);
  await page.waitForLoadState("networkidle");

  console.log(`Seeding mock data...`);
  await seedLocalStorage(page);
  
  for (const pageInfo of PAGES) {
    const url = `${BASE_URL}${pageInfo.path}`;
    console.log(`Reviewing page: ${pageInfo.name} at ${url}`);
    
    await page.goto(url);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500); // Đợi thêm để layout render đầy đủ

    for (const viewport of VIEWPORTS) {
      console.log(`  - Viewport: ${viewport.name} (${viewport.width}x${viewport.height})`);
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(1000); // Đợi layout ổn định

      const fileName = `${pageInfo.name}_${viewport.name}.png`;
      const filePath = path.join(OUTPUT_DIR, fileName);
      
      await page.screenshot({ path: filePath, fullPage: true });
      console.log(`    Saved screenshot to ${filePath}`);
    }
  }

  await browser.close();
  console.log("All screenshots captured successfully.");
}

run().catch(err => {
  console.error("Error in capture script:", err);
  process.exit(1);
});
