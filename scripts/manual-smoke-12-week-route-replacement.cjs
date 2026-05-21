const { chromium } = require("playwright");

const base = process.env.SMOKE_BASE_URL || "http://127.0.0.1:5174";

const routeExpectations = {
  "/12-week-setup-old": {
    label: "old setup implementation",
    shouldContain: ["Outcome statement"],
    shouldNotContain: ["Đích đến sau 12 tuần", "Quay lại bản hiện tại"],
  },
  "/12-week-setup": {
    label: "lab setup implementation",
    shouldContain: ["Đích đến sau 12 tuần"],
    shouldNotContain: ["Outcome statement"],
  },
  "/12-week-setup-lab": {
    label: "lab QA/reference implementation",
    shouldContain: ["Đích đến sau 12 tuần", "Quay lại bản hiện tại"],
    shouldNotContain: ["Outcome statement"],
  },
};

function tomorrowDateKey() {
  return new Date(Date.now() + 86400000).toISOString().slice(0, 10);
}

async function seed(page) {
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => {
    localStorage.clear();
    const now = new Date().toISOString();
    const areas = [
      "Career",
      "Finance",
      "Health",
      "Education",
      "Relationships",
      "Family",
      "Personal Growth",
      "Leisure",
    ];
    localStorage.setItem(
      "visionboard_user_data",
      JSON.stringify({
        storageVersion: 8,
        userId: "manual-smoke-local-user",
        onboardingCompleted: true,
        currentWheelOfLife: areas.map((name) => ({
          name,
          score: name === "Career" ? 7 : 5,
          color: "#8b5cf6",
        })),
        wheelOfLifeHistory: [],
        goals: [],
        visionBoards: [],
        achievements: [],
        reflections: [],
        eventLog: [],
        syncOutbox: [],
        createdAt: now,
        updatedAt: now,
        appPreferences: {
          allowLocalAnalytics: true,
          enableInAppReminders: false,
          enableBrowserNotifications: false,
          keepLocalOutbox: true,
          preferredReminderHour: 19,
        },
      }),
    );
    localStorage.setItem("selected_focus_area", "Career");
    localStorage.setItem(
      "pending_smart_goal",
      JSON.stringify({
        focusArea: "Career",
        specific:
          "Hoàn thành MVP Vision Board có thể demo cho 10 người dùng đầu tiên.",
        measurable: "Số người dùng test / 10 / người",
        achievable:
          "Có thể ship theo từng màn và kiểm tra với người dùng thật.",
        relevant: "Tôi muốn kiểm chứng ý tưởng bằng sản phẩm thật.",
        timeBound: "Trong 12 tuần tới",
      }),
    );
    localStorage.setItem(
      "pending_feasibility_result",
      JSON.stringify({
        resultType: "realistic",
        resultTitle: "Khả thi",
        resultSummary: "Bạn có đủ nền tảng để làm việc này.",
        recommendation: "Giữ flow gọn, đo bằng demo thật và feedback thật.",
        readinessScore: 16,
        adjustedScore: 17,
        wheelScore: 7,
        savedAt: now,
        answers: {},
      }),
    );
    localStorage.removeItem("pending_12_week_setup_draft");
  });
}

async function assertRoute(page, route, results) {
  await seed(page);
  await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
  await page.waitForSelector("#twelve-week-setup-title", { timeout: 10000 });
  const text = await page.locator("body").innerText();
  const expectation = routeExpectations[route];
  const missing = expectation.shouldContain.filter(
    (item) => !text.includes(item),
  );
  const unexpected = expectation.shouldNotContain.filter((item) =>
    text.includes(item),
  );
  results.routeResults[route] = {
    expected: expectation.label,
    passed: missing.length === 0 && unexpected.length === 0,
    missing,
    unexpected,
    title: await page.locator("#twelve-week-setup-title").innerText(),
  };
}

async function runSetupFlow(page, results) {
  await seed(page);
  await page.goto(`${base}/12-week-setup`, { waitUntil: "networkidle" });
  await page.waitForSelector("#week-12-outcome", { timeout: 10000 });

  await page
    .locator("#week-12-outcome")
    .fill(
      "Hoàn thành MVP Vision Board có thể demo cho 10 người dùng đầu tiên.",
    );
  await page
    .locator("#vision-12-week")
    .fill("Tôi muốn kiểm chứng ý tưởng bằng sản phẩm thật.");
  await page.locator("#lag-metric-target").fill("10");
  await page.locator("#lag-metric-unit").fill("người");
  await page.locator("#lag-metric-name").fill("Số người dùng test");
  await page.getByRole("button", { name: "Tiếp →" }).click();

  await page.waitForSelector("#tactic-name-0", { timeout: 10000 });
  await page.waitForTimeout(300);
  const step2EntryText = await page.locator("body").innerText();
  const immediateValidationTerms = [
    "Đặt tên cho việc lặp lại này.",
    "Nhập mục tiêu tuần.",
    "Nhập đơn vị đo.",
  ];
  results.step2ValidationImmediate = {
    passed: !immediateValidationTerms.some((term) =>
      step2EntryText.includes(term),
    ),
    observedValidationTerms: immediateValidationTerms.filter((term) =>
      step2EntryText.includes(term),
    ),
  };

  const tactics = [
    ["Demo sản phẩm cho người dùng", "2", "lần/tuần"],
    ["Code chức năng chính", "5", "buổi/tuần"],
    ["Viết ghi chú feedback", "2", "lần/tuần"],
  ];
  for (let index = 0; index < tactics.length; index += 1) {
    if (index > 1)
      await page.getByRole("button", { name: /Thêm việc lặp lại/ }).click();
    const [name, target, unit] = tactics[index];
    await page.locator(`#tactic-name-${index}`).fill(name);
    await page.locator(`#tactic-target-${index}`).fill(target);
    await page.locator(`#tactic-unit-${index}`).fill(unit);
  }
  await page.getByRole("button", { name: "Tiếp →" }).click();

  await page.waitForSelector("#cycle-start-date", { timeout: 10000 });
  await page.locator("#cycle-start-date").fill(tomorrowDateKey());
  await page.getByRole("button", { name: "CN" }).click();
  await page.getByRole("button", { name: /1 giờ/ }).click();
  await page.getByRole("button", { name: /Vừa đủ/ }).click();
  await page.getByRole("button", { name: "Tiếp →" }).click();

  await page.waitForTimeout(500);
  const step4Text = await page.locator("body").innerText();
  const required = [
    "Hoàn thành MVP Vision Board có thể demo cho 10 người dùng đầu tiên",
    "Số người dùng test",
    "Tôi muốn kiểm chứng ý tưởng bằng sản phẩm thật",
    "Demo sản phẩm cho người dùng",
    "Code chức năng chính",
    "Viết ghi chú feedback",
    "Tuần 1",
  ];
  results.step1To4 = {
    passed: required.every((item) => step4Text.includes(item)),
    missingInStep4: required.filter((item) => !step4Text.includes(item)),
  };

  await page.getByRole("button", { name: "Lưu kế hoạch" }).click();
  await page
    .waitForURL("**/12-week-system**", { timeout: 5000 })
    .catch(() => undefined);
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(1200);
  results.saveDestination = {
    path: new URL(page.url()).pathname + new URL(page.url()).search,
    passed: new URL(page.url()).pathname === "/12-week-system",
    bodyMentionsToday: (await page.locator("body").innerText()).includes(
      "Hôm nay",
    ),
  };
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  const logs = { errors: [], warnings: [], exceptions: [], failedRequests: [] };
  const results = {
    environment: {
      base,
      appMode: "demo via command env",
      browser: "Playwright Chromium headless",
      authState: "seeded local demo/auth-free funnel state",
    },
    routeResults: {},
    step2ValidationImmediate: null,
    step1To4: null,
    saveDestination: null,
    logs,
  };

  page.on("console", (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (type === "error") logs.errors.push(text);
    if (type === "warning" || type === "warn") logs.warnings.push(text);
  });
  page.on("pageerror", (err) => logs.exceptions.push(err.stack || err.message));
  page.on("requestfailed", (req) =>
    logs.failedRequests.push({
      url: req.url(),
      failure: req.failure()?.errorText || "unknown",
    }),
  );

  try {
    for (const route of Object.keys(routeExpectations)) {
      await assertRoute(page, route, results);
    }
    await runSetupFlow(page, results);
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify(results, null, 2));

  const failed =
    Object.values(results.routeResults).some((result) => !result.passed) ||
    !results.step1To4?.passed ||
    !results.saveDestination?.passed;

  if (failed) process.exit(1);
})();
