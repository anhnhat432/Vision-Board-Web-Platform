import { chromium } from "playwright";

const GOAL_TITLE = "Debug goal title";
const TIMESTAMP = "debug_timestamp";

async function main() {
  console.log("Starting debug browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("Opening dashboard to clear and seed storage...");
  await page.goto("http://localhost:5173/");

  // Chạy script seed dữ liệu trong trình duyệt
  await page.evaluate((args) => {
    const { GOAL_TITLE, TIMESTAMP } = args;
    localStorage.clear();
    sessionStorage.clear();

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
    const goalId = "goal_smoke_quality_" + TIMESTAMP;
    const tacticOneId = "tactic_smoke_quality_one";
    const tacticTwoId = "tactic_smoke_quality_two";
    const totalWeeks = 12;

    const pendingSmartGoal = {
      id: "smart_smoke_quality",
      focus_area: "Personal Growth",
      specific: { goal_statement: GOAL_TITLE },
      measurable: { metric_name: "completed smoke weeks", baseline: 0, target: 12, metric_unit: "weeks" },
      achievable: { weekly_hours: 4, required_skills: ["weekly planning"], support_resources: ["local browser"] },
      relevant: { motivation_reason: "Smoke verifies the local-first execution loop.", life_dimension_alignment: "Career" },
      time_bound: { target_weeks: 12, start_date: dateKey(today) },
    };

    const pendingFeasibilityResult = {
      resultType: "realistic",
      resultTitle: "Mục tiêu này đủ thực tế.",
      resultSummary: "Smoke seed.",
      recommendation: "Khóa ít nhất 2 khung giờ cố định.",
      readinessScore: 18,
      adjustedScore: 18,
      wheelScore: 7,
      diagnosticScore: 22,
      maxDiagnosticScore: 28,
      axisScores: [],
      bottleneck: { axis: "time", label: "Thời gian", score: 4, action: "Khóa 2 khung giờ." },
      planLoad: "balanced",
      weeklyCapacity: "medium",
      firstWeekGuidance: "Tuần 1 cân bằng.",
      scopeRecommendation: "Giữ 1 kết quả chính.",
      smartGoalQualityLevel: "okay",
    };

    const weeklyPlans = Array.from({ length: totalWeeks }, (_, index) => ({
      weekNumber: index + 1,
      phaseName: index < 4 ? "Foundation" : index < 8 ? "Build" : "Finish",
      focus: "Bắt đầu.",
      milestone: "",
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
        id: "tw_task_1_smoke_a",
        weekNumber: 1,
        scheduledDate: dateKey(today),
        title: "Tactic one text",
        leadIndicatorName: "Tactic one text",
        isCore: true,
        completed: false,
        tacticId: tacticOneId,
      },
    ];

    const data = {
      storageVersion: 5,
      userId: "core-quality-smoke",
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
          title: GOAL_TITLE,
          description: "Debug goal.",
          deadline: dateKey(addDays(today, 83)),
          feasibilityResult: "realistic",
          readinessScore: 18,
          focusArea: "Personal Growth",
          tasks: [],
          createdAt: now.toISOString(),
          twelveWeekSystem: {
            goalType: "Personal Growth",
            vision12Week: GOAL_TITLE,
            lagMetric: { name: "completed smoke weeks", unit: "weeks", target: "12", currentValue: "0" },
            leadIndicators: [
              { id: tacticOneId, name: "Tactic one text", target: "1", unit: "lần/tuần", type: "core", priority: 1, schedule: [todayOffset] },
            ],
            milestones: { week4: "Milestone 4", week8: "Milestone 8", week12: "Milestone 12" },
            successEvidence: "Success evidence",
            reviewDay: "Sunday",
            week12Outcome: "Outcome",
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
    };

    localStorage.setItem("visionboard_user_data", JSON.stringify(data));
    localStorage.setItem("latest_12_week_goal_id", goalId);
    localStorage.setItem("latest_12_week_system_goal_id", goalId);
    localStorage.setItem("pending_smart_goal", JSON.stringify(pendingSmartGoal));
    localStorage.setItem("pending_feasibility_result", JSON.stringify(pendingFeasibilityResult));
    localStorage.setItem("selected_focus_area", "Personal Growth");
  }, { GOAL_TITLE, TIMESTAMP });

  console.log("Navigating to /12-week-system...");
  await page.goto("http://localhost:5173/12-week-system");
  await page.waitForTimeout(2000); // Chờ trang render xong

  console.log("Dumping all button elements...");
  const buttons = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll("button, [role='button'], a"));
    return elements.map(el => ({
      tagName: el.tagName,
      innerText: el.innerText || el.textContent,
      ariaLabel: el.getAttribute("aria-label"),
      outerHTML: el.outerHTML.slice(0, 150) + "..."
    }));
  });

  console.log(`Found ${buttons.length} elements:`);
  for (const btn of buttons) {
    if (btn.innerText?.includes("Check-in") || btn.ariaLabel?.includes("Check-in") || btn.innerText?.includes("ngày") || btn.ariaLabel?.includes("ngày")) {
      console.log(`- [MATCH] Tag: ${btn.tagName}, Text: "${btn.innerText?.replace(/\n/g, " ")}", AriaLabel: "${btn.ariaLabel}", HTML: ${btn.outerHTML}`);
    } else {
      console.log(`- Tag: ${btn.tagName}, Text: "${btn.innerText?.replace(/\n/g, " ").slice(0, 30)}", AriaLabel: "${btn.ariaLabel}"`);
    }
  }

  await browser.close();
  console.log("Done.");
}

main().catch(console.error);
