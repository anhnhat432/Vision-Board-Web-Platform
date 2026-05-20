import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_URL = process.env.QA_BASE_URL || "http://127.0.0.1:5174";
const OUT_DIR = path.resolve("qa-artifacts/dashboard-active-mobile-priority");
const today = new Date();
const todayKey = today.toISOString().slice(0, 10);
const endDate = new Date(today);
endDate.setDate(today.getDate() + 83);
const endKey = endDate.toISOString().slice(0, 10);

const viewports = [
  {
    name: "mobile-375",
    width: 375,
    height: 812,
    screenshot: "dashboard-mobile-375.png",
  },
  {
    name: "tablet-768",
    width: 768,
    height: 1024,
    screenshot: "dashboard-tablet-768.png",
  },
  {
    name: "desktop-1440",
    width: 1440,
    height: 900,
    screenshot: "dashboard-desktop-1440.png",
  },
];

const goalId = "goal_dashboard_active_qa";
const userData = {
  storageVersion: 5,
  userId: "dashboard-active-qa",
  onboardingCompleted: true,
  currentWheelOfLife: [
    { name: "Career", score: 7, color: "#0f172a" },
    { name: "Health", score: 6, color: "#059669" },
    { name: "Personal Growth", score: 8, color: "#7c3aed" },
  ],
  wheelOfLifeHistory: [],
  goals: [
    {
      id: goalId,
      category: "Career",
      focusArea: "Career",
      title: "Launch a focused dashboard",
      description:
        "QA seed: active 12-week system for dashboard mobile priority.",
      deadline: endKey,
      feasibilityResult: "Khả thi",
      readinessScore: 16,
      tasks: [],
      createdAt: today.toISOString(),
      progress: 25,
      twelveWeekSystem: {
        goalType: "Project Completion",
        vision12Week: "Ship a clearer dashboard that answers what to do today.",
        lagMetric: {
          name: "Dashboard clarity",
          unit: "%",
          target: "100",
          currentValue: "35",
        },
        leadIndicators: [
          {
            name: "Deep work",
            target: "5",
            unit: "sessions/week",
            currentValue: "2",
          },
          {
            name: "QA review",
            target: "3",
            unit: "checks/week",
            currentValue: "1",
          },
        ],
        milestones: {
          week4: "Draft ready",
          week8: "Priority UI validated",
          week12: "Launch ready",
        },
        successEvidence:
          "The user can answer what to do today from the dashboard.",
        reviewDay: "Sunday",
        week12Outcome: "Dashboard is clear and actionable.",
        startDate: todayKey,
        endDate: endKey,
        timezone: "Asia/Ho_Chi_Minh",
        weekStartsOn: "Monday",
        status: "active",
        currentWeek: 1,
        totalWeeks: 12,
        weeklyPlans: [
          {
            weekNumber: 1,
            focus: "Clarify dashboard priority",
            commitments: ["Validate Today card", "Review mobile layout"],
          },
        ],
        taskInstances: [
          {
            id: "qa_task_1",
            weekNumber: 1,
            scheduledDate: todayKey,
            title: "Finish the dashboard primary card",
            leadIndicatorName: "Deep work",
            isCore: true,
            completed: false,
          },
          {
            id: "qa_task_2",
            weekNumber: 1,
            scheduledDate: todayKey,
            title: "Check mobile card order",
            leadIndicatorName: "QA review",
            isCore: true,
            completed: false,
          },
          {
            id: "qa_task_3",
            weekNumber: 1,
            scheduledDate: todayKey,
            title: "Capture QA screenshots",
            leadIndicatorName: "QA review",
            isCore: false,
            completed: false,
          },
          {
            id: "qa_task_4",
            weekNumber: 1,
            scheduledDate: todayKey,
            title: "Already done item",
            leadIndicatorName: "Deep work",
            isCore: false,
            completed: true,
          },
        ],
        dailyCheckIns: [],
        weeklyReviews: [],
        scoreboard: [{ weekNumber: 1, planned: 4, completed: 1, score: 25 }],
      },
    },
  ],
  visionBoards: [],
  reflections: [],
  orders: [],
  eventLog: [],
  subscription: null,
  appPreferences: {},
};

const authUserData = {
  ...userData,
  userId: "qa-dashboard-user",
};

async function seed(page) {
  await page.goto(BASE_URL + "/", { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ userData, authUserData, goalId }) => {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem("visionboard_user_data", JSON.stringify(userData));
      localStorage.setItem(
        "visionboard_user_data:auth_owner_uid",
        "qa-dashboard-user",
      );
      localStorage.setItem(
        "visionboard_user_data:auth:qa-dashboard-user",
        JSON.stringify(authUserData),
      );
      localStorage.setItem("latest_12_week_goal_id", goalId);
      localStorage.setItem("latest_12_week_system_goal_id", goalId);
      localStorage.setItem("selected_focus_area", "Career");
      localStorage.removeItem("backend_goal_links");
      localStorage.removeItem("backend_plan_links");
      window.dispatchEvent(new CustomEvent("visionboard:user-data-updated"));
    },
    { userData, authUserData, goalId },
  );
}

async function inspect(page) {
  return page.evaluate(() => {
    const textOf = (el) => el?.textContent?.replace(/\s+/g, " ").trim() || null;
    const headings = Array.from(
      document.querySelectorAll("h1,h2,h3,h4,[role='heading']"),
    ).map((el, index) => ({
      index,
      text: textOf(el),
      inAside: Boolean(el.closest("aside")),
      rect: el.getBoundingClientRect().toJSON?.() || null,
    }));
    const todayHeadings = headings.filter((h) => h.text === "Việc hôm nay");
    const goals = headings.find((h) => h.text === "Mục tiêu đang chạy");
    const rhythm = headings.find((h) => h.text?.startsWith("Nhịp tuần"));
    const trend = headings.find((h) => h.text === "Đường 12 tuần");
    const hero = document.querySelector(
      "[data-testid='dashboard-primary-action-card']",
    );
    const cta = Array.from(document.querySelectorAll("a,button")).find((el) =>
      textOf(el)?.includes("Mở Today"),
    );
    const mobileToday = headings.filter((h) => h.text === "Việc hôm nay");
    const doc = document.documentElement;
    const body = document.body;
    const consoleText = document.body.innerText;
    return {
      url: location.href,
      title: document.title,
      bodyTextLength: consoleText.length,
      todayHeadings,
      goals,
      rhythm,
      trend,
      heroText: textOf(hero),
      ctaText: textOf(cta),
      ctaHref: cta?.getAttribute("href") || null,
      mobileToday,
      horizontalOverflow:
        Math.max(doc.scrollWidth, body.scrollWidth) > window.innerWidth + 1,
      scrollWidth: Math.max(doc.scrollWidth, body.scrollWidth),
      innerWidth: window.innerWidth,
      cardTextSamples: Array.from(
        document.querySelectorAll("section, aside, article, div"),
      )
        .map(textOf)
        .filter(Boolean)
        .filter((text) => text.includes("Việc hôm nay"))
        .slice(0, 4),
    };
  });
}

await mkdir(OUT_DIR, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();
const events = { consoleErrors: [], pageErrors: [], failedRequests: [] };
page.on("console", (msg) => {
  if (["error"].includes(msg.type())) events.consoleErrors.push(msg.text());
});
page.on("pageerror", (error) => events.pageErrors.push(error.message));
page.on("requestfailed", (request) =>
  events.failedRequests.push({
    url: request.url(),
    failure: request.failure()?.errorText || "unknown",
  }),
);

await seed(page);
const results = [];
for (const vp of viewports) {
  await page.setViewportSize({ width: vp.width, height: vp.height });
  await page.goto(BASE_URL + "/", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForFunction(
    () => {
      const text = document.body?.innerText || "";
      return (
        text.includes("Hôm nay tôi cần làm gì?") ||
        text.includes("Launch a focused dashboard") ||
        text.length > 200
      );
    },
    { timeout: 20000 },
  );
  await page.screenshot({
    path: path.join(OUT_DIR, vp.screenshot),
    fullPage: true,
  });
  results.push({ viewport: vp, inspection: await inspect(page) });
}

await browser.close();
await writeFile(
  path.join(OUT_DIR, "qa-raw-results.json"),
  JSON.stringify({ baseUrl: BASE_URL, events, results }, null, 2),
  "utf8",
);
console.log(JSON.stringify({ baseUrl: BASE_URL, events, results }, null, 2));
