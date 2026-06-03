import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE_URL = "http://localhost:5174";
const OUTPUT_DIR = "C:/Users/admin/.gemini/antigravity/brain/c8122703-dec6-439f-9c5f-a5a529406f92/screenshots";

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 }
];

const pad = (value) => String(value).padStart(2, "0");
const dateKey = (date) => date.getFullYear() + "-" + pad(date.getMonth() + 1) + "-" + pad(date.getDate());
const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};
const now = new Date();
const today = new Date(now);
today.setHours(0, 0, 0, 0);

const mockUserData = {
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
      id: "goal_review_test",
      category: "Personal Growth",
      title: "Đạt IELTS 7.0 trước tháng 9",
      description: "Visual QA review - Đánh giá thực tế cho mục tiêu IELTS.",
      deadline: dateKey(addDays(today, 83)),
      feasibilityResult: "realistic",
      readinessScore: 18,
      focusArea: "Personal Growth",
      tasks: [],
      createdAt: now.toISOString(),
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

async function run() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  console.log(`Launching browser...`);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // 1. Chụp màn khảo sát (Survey Mode) - Có cán cân nghiêng
  console.log(`Setting up Survey Mode...`);
  await page.goto(BASE_URL);
  await page.evaluate(({ userData, smartGoal }) => {
    localStorage.clear();
    localStorage.setItem("visionboard_user_data", JSON.stringify(userData));
    localStorage.setItem("selected_focus_area", "Personal Growth");
    localStorage.setItem("pending_smart_goal", JSON.stringify(smartGoal));
    // Set tạm, tí nữa sau load lần đầu sẽ đồng bộ chính xác
    localStorage.setItem("feasibilityActiveGoal", JSON.stringify(smartGoal));
    window.dispatchEvent(new CustomEvent("visionboard:user-data-updated"));
  }, { userData: mockUserData, smartGoal: pendingSmartGoal });

  console.log(`Navigating to /feasibility in Survey Mode...`);
  await page.goto(`${BASE_URL}/feasibility`);
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);

  // Đồng bộ feasibilityActiveGoal với pendingSmartGoal sau chuẩn hóa
  await page.evaluate(() => {
    const normalizedGoal = localStorage.getItem("pending_smart_goal");
    if (normalizedGoal) {
      localStorage.setItem("feasibilityActiveGoal", normalizedGoal);
    }
    
    // Trả lời 3 câu hỏi (Q1, Q2, Q3) để cán cân nghiêng nặng về rào cản
    const mockAnswers = {
      1: "1", // Q1: Dưới 1 giờ
      2: "1", // Q2: Mệt mỏi rã rời (năng lượng)
      3: "1"  // Q3: Hoàn toàn chưa có gì (nguồn lực)
    };
    localStorage.setItem("pending_feasibility_answers", JSON.stringify(mockAnswers));
  });

  // Reload để load lại state từ localStorage chuẩn
  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  for (const viewport of VIEWPORTS) {
    console.log(`Capturing Survey Mode (Tilted Scale) - Viewport: ${viewport.name} (${viewport.width}x${viewport.height})`);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForTimeout(500);
    const filePath = path.join(OUTPUT_DIR, `feasibility_survey_${viewport.name}.png`);
    await page.screenshot({ path: filePath, fullPage: true });
  }

  // 1b. Tạo Survey Mode ở bước 7 (Xem phân tích khả thi) với cân nghiêng cực hạn
  console.log(`Setting up Survey Mode at Step 7 (Tilted Scale)...`);
  await page.evaluate(() => {
    // Seed sẵn 6 câu trả lời trước
    const mockAnswers = {
      1: "1",
      2: "1",
      3: "1",
      4: "1",
      5: "1",
      6: "1"
    };
    localStorage.setItem("pending_feasibility_answers", JSON.stringify(mockAnswers));
  });

  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  // Click "Tiếp theo" 6 lần để tới câu hỏi 7 (step index = 6)
  console.log(`Clicking Next 6 times to reach Step 7...`);
  for (let i = 0; i < 6; i++) {
    await page.click('button:has-text("Tiếp theo")');
    await page.waitForTimeout(200);
  }

  // Chụp ảnh bước 7 trên Tablet để verify nút "Xem phân tích khả thi" và cân nghiêng
  console.log(`Capturing Survey Step 7 - Viewport: tablet (768x1024)`);
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.waitForTimeout(500);
  const step7TabletPath = path.join(OUTPUT_DIR, `feasibility_survey_step7_tablet.png`);
  await page.screenshot({ path: step7TabletPath, fullPage: true });
  console.log(`Saved screenshot: ${step7TabletPath}`);

  // 2. Chụp màn kết quả (Result Mode)
  console.log(`Setting up Result Mode...`);
  await page.evaluate(({ result, smartGoal }) => {
    const mockAnswers = {
      1: "2",
      2: "1",
      3: "3",
      4: "2",
      5: "3",
      6: "2",
      7: "3"
    };
    localStorage.setItem("pending_feasibility_result", JSON.stringify(result));
    localStorage.setItem("pending_feasibility_answers", JSON.stringify(mockAnswers));
    localStorage.setItem("pending_smart_goal", JSON.stringify(smartGoal));
    localStorage.setItem("feasibilityActiveGoal", JSON.stringify(smartGoal));
    window.dispatchEvent(new CustomEvent("visionboard:user-data-updated"));
  }, { result: pendingFeasibilityResult, smartGoal: pendingSmartGoal });

  await page.reload();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);

  for (const viewport of VIEWPORTS) {
    console.log(`Capturing Result Mode - Viewport: ${viewport.name} (${viewport.width}x${viewport.height})`);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.waitForTimeout(500);
    const filePath = path.join(OUTPUT_DIR, `feasibility_result_${viewport.name}.png`);
    await page.screenshot({ path: filePath, fullPage: true });
  }

  await browser.close();
  console.log("All feasibility screenshots captured successfully.");
}

run().catch(err => {
  console.error("Error in feasibility capture script:", err);
  process.exit(1);
});
