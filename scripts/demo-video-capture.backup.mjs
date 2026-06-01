#!/usr/bin/env node

import { spawn } from "node:child_process";
import { mkdir, readdir, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
const outputDir = path.resolve(process.env.DEMO_VIDEO_OUTPUT_DIR ?? `artifacts/demo-video/${timestamp}`);
const screenshotsDir = path.join(outputDir, "screenshots");
const appMode = process.env.DEMO_VIDEO_APP_MODE || "demo";
const port = Number(process.env.DEMO_VIDEO_PORT || 5173);
const externalUrl = process.env.DEMO_VIDEO_URL?.trim().replace(/\/$/, "");
const baseUrl = externalUrl || `http://127.0.0.1:${port}`;
const shouldShowSceneLabels = process.env.DEMO_VIDEO_SHOW_SCENE_LABELS === "1";
const headless = process.env.DEMO_VIDEO_HEADLESS !== "0";
const viewport = { width: 1440, height: 900 };

const sceneHoldMs = Number(process.env.DEMO_VIDEO_SCENE_HOLD_MS || 5200);
const transitionPauseMs = Number(process.env.DEMO_VIDEO_TRANSITION_MS || 650);

const scenes = [
  {
    id: "01-opening",
    title: "Mở đầu",
    path: "/",
    caption: "Từ tầm nhìn đến hành động",
    note: "Dùng làm cảnh mở đầu. Ở real mode, dashboard signed-out có thể hiển thị visitor view.",
  },
  {
    id: "02-onboarding",
    title: "Onboarding",
    path: "/onboarding",
    caption: "Chấm điểm cuộc sống",
    scroll: 0.3,
  },
  {
    id: "03-life-balance",
    title: "Life Balance",
    path: "/life-balance",
    caption: "Tìm vùng đang lệch nhịp",
    scroll: 0.45,
  },
  {
    id: "04-life-insight",
    title: "Life Insight",
    path: "/life-insight",
    caption: "Chọn trọng tâm đáng cải thiện",
    scroll: 0.35,
  },
  {
    id: "05-smart-goal",
    title: "SMART Goal",
    path: "/smart-goal-setup",
    caption: "Biến mong muốn thành mục tiêu rõ",
    scroll: 0.25,
  },
  {
    id: "06-feasibility",
    title: "Feasibility Check",
    path: "/feasibility",
    caption: "Kiểm tra tính khả thi",
    scroll: 0.3,
  },
  {
    id: "07-12-week-setup",
    title: "12-Week Plan",
    path: "/12-week-setup",
    caption: "Chia nhỏ thành chu kỳ 12 tuần",
    scroll: 0.35,
  },
  {
    id: "08-today",
    title: "Today",
    path: "/12-week-system?tab=today",
    caption: "Biết việc quan trọng tiếp theo",
    scroll: 0.35,
    requiresWorkspace: true,
  },
  {
    id: "09-weekly-review",
    title: "Weekly Review",
    path: "/12-week-system?tab=week",
    caption: "Review kết quả và chỉnh nhịp",
    scroll: 0.35,
    requiresWorkspace: true,
  },
  {
    id: "10-progress",
    title: "Progress",
    path: "/12-week-system?tab=progress",
    caption: "Theo dõi tiến triển tuần qua tuần",
    scroll: 0.25,
    requiresWorkspace: true,
  },
  {
    id: "11-reflection",
    title: "Reflection",
    path: "/journal",
    caption: "Ghi lại điều học được",
    scroll: 0.4,
    requiresWorkspace: true,
  },
];

const voiceoverScript = `Bạn có một tầm nhìn lớn cho cuộc sống, nhưng để biến nó thành hành động hằng tuần thì không dễ.

Vision Board Web Platform giúp bạn bắt đầu từ bức tranh tổng thể: nhìn lại tám khía cạnh cuộc sống, tìm vùng đang lệch nhịp, rồi chọn một trọng tâm đáng để cải thiện.

Từ đó, app hướng bạn viết mục tiêu theo khung SMART: kết quả cụ thể, chỉ số đo được, nguồn lực thực tế, lý do đủ mạnh và thời hạn rõ ràng.

Trước khi lập kế hoạch, hệ thống kiểm tra tính khả thi. Bạn sẽ biết mục tiêu đang đủ thực tế chưa, điểm nghẽn nằm ở thời gian, năng lượng, nguồn lực hay độ rõ ràng, và nên đi với nhịp nhẹ, cân bằng hay tăng tốc.

Khi mục tiêu đã chắc, app chia nó thành một chu kỳ 12 tuần: outcome cuối kỳ, chỉ số lag, hành động lead, mốc tuần 4, tuần 8, tuần 12 và ngày review cố định.

Mỗi ngày, bạn mở tab Hôm nay để biết việc quan trọng tiếp theo. Mỗi tuần, bạn review kết quả, ghi lại điều học được và điều chỉnh nhịp tuần sau.

Toàn bộ trải nghiệm được thiết kế local-first để không mất tiến độ khi mạng chập chờn, đồng thời production có đăng nhập, đồng bộ, billing và quản lý dữ liệu tài khoản.

Từ tầm nhìn đến hành động: rõ hơn, thực tế hơn và dễ theo sát hơn trong từng tuần.`;

function log(message) {
  console.log(`[demo-video] ${message}`);
}

function createChildEnv(extra) {
  const env = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (!key || key.startsWith("=") || value === undefined) continue;
    env[key] = value;
  }

  return { ...env, ...extra };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfWeek(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  const delta = (next.getDay() + 6) % 7;
  next.setDate(next.getDate() - delta);
  return next;
}

function getWeekdayOffset(date) {
  return (date.getDay() + 6) % 7;
}

function getWeekDate(startDate, weekNumber, weekdayOffset) {
  return addDays(startDate, (weekNumber - 1) * 7 + weekdayOffset);
}

function createWeeklyPlans() {
  const phases = ["Khởi động", "Khởi động", "Khởi động", "Khởi động", "Tăng tốc", "Tăng tốc", "Tăng tốc", "Tăng tốc", "Hoàn tất", "Hoàn tất", "Hoàn tất", "Hoàn tất"];
  return Array.from({ length: 12 }, (_, index) => {
    const weekNumber = index + 1;
    const focus =
      weekNumber <= 4
        ? "Khóa nền tảng portfolio, CV và pipeline ứng tuyển."
        : weekNumber <= 8
          ? "Tăng tốc case study, kết nối và gửi hồ sơ chất lượng."
          : "Tối ưu phản hồi, phỏng vấn và chốt cơ hội ưu tiên.";

    return {
      weekNumber,
      phaseName: phases[index],
      focus,
      milestone:
        weekNumber === 4
          ? "Portfolio có cấu trúc rõ và CV bản mới."
          : weekNumber === 8
            ? "10 hồ sơ chất lượng đã gửi, có phản hồi đầu tiên."
            : weekNumber === 12
              ? "20 hồ sơ chất lượng và ít nhất 3 cuộc trao đổi."
              : "",
      completed: false,
    };
  });
}

function createScoreboard() {
  return Array.from({ length: 12 }, (_, index) => {
    const weekNumber = index + 1;

    return {
      weekNumber,
      leadCompletionPercent: 0,
      mainMetricProgress: "",
      outputDone: "",
      reviewDone: false,
      weeklyScore: 0,
    };
  });
}

function createDemoSeed(uid = "demo_video_user") {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const currentWeek = 1;
  const todayOffset = getWeekdayOffset(today);
  const cycleStart = startOfWeek(today);
  const cycleEnd = addDays(cycleStart, 83);
  const goalId = "demo_video_goal_12_week";

  const currentWheelOfLife = [
    { name: "Career", score: 6, color: "#8b5cf6" },
    { name: "Finance", score: 6, color: "#10b981" },
    { name: "Health", score: 7, color: "#ef4444" },
    { name: "Education", score: 8, color: "#f59e0b" },
    { name: "Relationships", score: 7, color: "#ec4899" },
    { name: "Family", score: 8, color: "#3b82f6" },
    { name: "Personal Growth", score: 5, color: "#14b8a6" },
    { name: "Leisure", score: 5, color: "#a855f7" },
  ];

  const smartGoal = {
    id: "demo_video_smart_goal",
    domain: "career",
    specific: {
      goal_statement:
        "Ra mắt portfolio nghề nghiệp mới và gửi 20 hồ sơ ứng tuyển chất lượng trong 12 tuần tới.",
    },
    measurable: {
      metric_name: "Hồ sơ ứng tuyển chất lượng đã gửi",
      metric_unit: "hồ sơ",
      baseline_value: 0,
      target_value: 20,
    },
    achievable: {
      weekly_time_commitment_hours: 6,
      required_skills: ["Viết case study", "Tối ưu CV", "Chủ động networking"],
      support_resources: ["Lịch làm việc buổi tối", "Feedback từ mentor", "Danh sách công ty mục tiêu"],
    },
    relevant: {
      motivation_reason:
        "Tôi muốn có một bước chuyển nghề nghiệp rõ ràng hơn, với đầu ra có thể đo được thay vì chỉ chuẩn bị mơ hồ.",
      life_dimension_alignment: "Sự nghiệp",
    },
    time_bound: {
      target_weeks: 12,
    },
    goal_summary: {
      goal: "Ra mắt portfolio và gửi 20 hồ sơ chất lượng",
      metric: "Hồ sơ ứng tuyển chất lượng đã gửi",
      metric_unit: "hồ sơ",
      target: 20,
      weekly_commitment: 6,
      timeline_weeks: 12,
      difficulty: "medium",
    },
    created_at: today.toISOString(),
  };

  const feasibilityResult = {
    resultType: "realistic",
    resultTitle: "Mục tiêu này khả thi nếu giữ nhịp đều.",
    resultSummary:
      "Bạn đã có nền tảng tốt về kỹ năng và thời gian. Điểm cần khóa là lịch làm việc cố định và số lượng đầu ra mỗi tuần.",
    recommendation:
      "Giữ 2 buổi sâu mỗi tuần cho portfolio, 1 buổi cho CV và networking, sau đó review vào Chủ Nhật.",
    readinessScore: 18,
    adjustedScore: 19,
    wheelScore: 6,
    diagnosticScore: 23,
    maxDiagnosticScore: 28,
    axisScores: [
      {
        axis: "time",
        label: "Thời gian",
        score: 4,
        maxScore: 4,
        percent: 100,
        diagnostic: "Có thể giữ 6 giờ mỗi tuần nếu đặt lịch trước.",
      },
      {
        axis: "clarity",
        label: "Độ rõ",
        score: 3,
        maxScore: 4,
        percent: 75,
        diagnostic: "Outcome và chỉ số đã rõ, cần cụ thể hóa việc tuần đầu.",
      },
    ],
    bottleneck: {
      axis: "routine",
      label: "Nhịp duy trì",
      score: 3,
      action: "Khóa ngày review cố định và giới hạn số tactic cốt lõi.",
    },
    planLoad: "balanced",
    weeklyCapacity: "medium",
    firstWeekGuidance:
      "Tuần đầu nên bắt đầu bằng việc chốt cấu trúc portfolio, không polish quá sớm.",
    scopeRecommendation:
      "Giữ một outcome chính, 3 hành động lead và review đều trước khi tăng tải.",
    smartGoalQualityLevel: "strong",
    smartGoalQualityNote: "Mục tiêu có chỉ số đo rõ, deadline phù hợp và lý do đủ mạnh.",
    savedAt: now.toISOString(),
  };

  const leadIndicators = [
    {
      id: "lead_portfolio",
      name: "Hoàn thiện case study portfolio",
      target: "2",
      unit: "buổi/tuần",
      type: "core",
      priority: 1,
      schedule: [1, 4],
      commitment: {
        want: "Có portfolio đủ mạnh để gửi đi",
        cost: "2 buổi tối tập trung",
        means: "Tắt thông báo và làm theo checklist",
        tradeoff: "Giảm thời gian lướt mạng buổi tối",
        reward: "Được thấy portfolio tiến triển mỗi tuần",
        filledAt: now.toISOString(),
      },
    },
    {
      id: "lead_outreach",
      name: "Kết nối hoặc gửi hồ sơ chất lượng",
      target: "3",
      unit: "lần/tuần",
      type: "core",
      priority: 2,
      schedule: [2, 5],
    },
    {
      id: "lead_review",
      name: "Review pipeline và cải thiện CV",
      target: "1",
      unit: "lần/tuần",
      type: "core",
      priority: 3,
      schedule: [6],
    },
  ];

  const taskInstances = [
    {
      id: "task_week1_today_1",
      weekNumber: currentWeek,
      scheduledDate: dateKey(today),
      title: "Phác thảo cấu trúc portfolio cá nhân",
      leadIndicatorName: "Hoàn thiện case study portfolio",
      isCore: true,
      completed: false,
      tacticId: "lead_portfolio",
      lastModifiedAt: now.getTime(),
    },
    {
      id: "task_week1_today_2",
      weekNumber: currentWeek,
      scheduledDate: dateKey(today),
      title: "Lên danh sách 5 công ty mục tiêu ban đầu",
      leadIndicatorName: "Kết nối hoặc gửi hồ sơ chất lượng",
      isCore: true,
      completed: false,
      tacticId: "lead_outreach",
      lastModifiedAt: now.getTime(),
    },
    {
      id: "task_week1_review",
      weekNumber: currentWeek,
      scheduledDate: dateKey(getWeekDate(cycleStart, currentWeek, 6)),
      title: "Review kết quả tuần 1 và lên kế hoạch tuần 2",
      leadIndicatorName: "Review pipeline và cải thiện CV",
      isCore: true,
      completed: false,
      tacticId: "lead_review",
      lastModifiedAt: now.getTime(),
    },
  ];

  const twelveWeekSystem = {
    goalType: "career-transition",
    vision12Week:
      "Trong 12 tuần tới, tôi có portfolio rõ ràng, CV đủ mạnh và một pipeline ứng tuyển có chất lượng.",
    cycleNumber: 1,
    lagMetric: {
      name: "Hồ sơ ứng tuyển chất lượng đã gửi",
      unit: "hồ sơ",
      target: "20",
      currentValue: "0/20 hồ sơ",
    },
    leadIndicators,
    milestones: {
      week4: "Portfolio có cấu trúc rõ và CV bản mới.",
      week8: "10 hồ sơ chất lượng đã gửi, có phản hồi đầu tiên.",
      week12: "20 hồ sơ chất lượng và ít nhất 3 cuộc trao đổi.",
    },
    successEvidence:
      "Portfolio công khai, CV hoàn chỉnh, có phản hồi từ nhà tuyển dụng và lịch review tuần được giữ đều.",
    reviewDay: "Sunday",
    week12Outcome: "Portfolio hoàn chỉnh, 20 hồ sơ chất lượng và ít nhất 3 cuộc trao đổi tuyển dụng.",
    weeklyActions: [
      "2 buổi tối để viết hoặc chỉnh case study",
      "3 lần chủ động kết nối hoặc gửi hồ sơ chất lượng",
      "1 buổi review pipeline và cải thiện CV",
    ],
    successMetric: "Số hồ sơ chất lượng và số phản hồi nhận được mỗi tuần",
    startDate: dateKey(cycleStart),
    endDate: dateKey(cycleEnd),
    timezone: "Asia/Ho_Chi_Minh",
    weekStartsOn: "Monday",
    status: "active",
    dailyReminderTime: "19:00",
    tacticLoadPreference: "balanced",
    preferredDays: [1, 2, 4, 5, 6],
    personalConstraint: "time",
    reentryCount: 0,
    currentWeek,
    totalWeeks: 12,
    weeklyPlans: createWeeklyPlans(),
    taskInstances,
    dailyCheckIns: [],
    weeklyReviews: [],
    scoreboard: createScoreboard(),
    weeklyTimeBlocks: [
      {
        id: "block_tuesday_deep_work",
        type: "strategic",
        dayOfWeek: "Tuesday",
        startTime: "20:00",
        durationMinutes: 90,
        note: "Viết case study",
      },
      {
        id: "block_friday_outreach",
        type: "strategic",
        dayOfWeek: "Friday",
        startTime: "19:30",
        durationMinutes: 75,
        note: "Gửi hồ sơ và networking",
      },
    ],
  };

  const userData = {
    storageVersion: 8,
    userId: uid,
    wheelOfLifeHistory: [
      {
        date: addDays(today, -35).toISOString(),
        areas: currentWheelOfLife.map((area) => ({
          ...area,
          score: Math.max(3, area.score - 1),
        })),
      },
      {
        date: addDays(today, -14).toISOString(),
        areas: currentWheelOfLife,
      },
    ],
    currentWheelOfLife,
    goals: [
      {
        id: goalId,
        category: "Career",
        title: "Ra mắt portfolio nghề nghiệp và gửi 20 hồ sơ chất lượng",
        description:
          "Mục tiêu 12 tuần tập trung vào portfolio, CV, networking và pipeline ứng tuyển có chất lượng.",
        deadline: dateKey(cycleEnd),
        tasks: [
          {
            id: "classic_task_1",
            title: "Chốt cấu trúc portfolio",
            completed: true,
            lastModifiedAt: addDays(today, -18).getTime(),
          },
          {
            id: "classic_task_2",
            title: "Viết case study chính",
            completed: false,
            lastModifiedAt: now.getTime(),
          },
        ],
        feasibilityResult: "realistic",
        readinessScore: 19,
        focusArea: "Career",
        twelveWeekSystem,
        createdAt: addDays(today, -21).toISOString(),
      },
    ],
    visionBoards: [
      {
        id: "demo_video_board",
        name: "Vision 2026",
        year: "2026",
        createdAt: addDays(today, -10).toISOString(),
        theme: "minimal",
        items: [
          {
            id: "board_item_quote",
            type: "quote",
            content: "Kỷ luật là cây cầu nối tầm nhìn với kết quả.",
            x: 12,
            y: 18,
            width: 280,
            height: 120,
          },
          {
            id: "board_item_goal",
            type: "goal_card",
            content: goalId,
            x: 48,
            y: 44,
            width: 300,
            height: 160,
          },
        ],
      },
    ],
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
    aspirationalVision: {
      id: "demo_video_vision",
      horizonYears: 3,
      summary: "Trở thành một professional có portfolio rõ ràng, nhịp làm việc bền vững và lựa chọn nghề nghiệp tốt hơn.",
      lifeAreas: [
        {
          area: "career",
          statement: "Có vị trí nghề nghiệp tốt hơn, gắn với kỹ năng sản phẩm và tư duy hệ thống.",
        },
        {
          area: "personal",
          statement: "Giữ nhịp học và review đều để không bị cuốn vào bận rộn ngắn hạn.",
        },
      ],
      createdAt: addDays(today, -22).toISOString(),
      updatedAt: addDays(today, -22).toISOString(),
    },
    subscription: null,
    entitlements: [],
    lastMotivationalQuote: "Tầm nhìn chỉ có sức mạnh khi được nối với hành động lặp lại.",
    onboardingCompleted: true,
    isHydratedFromDemo: false,
    experimentAssignments: [],
    emailReminderSchedule: [],
    pushSubscription: null,
    privacyConsents: [
      {
        category: "local_analytics",
        granted: true,
        updatedAt: now.toISOString(),
      },
    ],
  };

  const pending12WeekSetupDraft = {
    templateId: "",
    goalType: "career-transition",
    vision12Week: twelveWeekSystem.vision12Week,
    week12Outcome: twelveWeekSystem.week12Outcome,
    lagMetricName: twelveWeekSystem.lagMetric.name,
    lagMetricTarget: twelveWeekSystem.lagMetric.target,
    lagMetricUnit: twelveWeekSystem.lagMetric.unit,
    leadIndicators: leadIndicators.map((indicator) => ({
      id: indicator.id,
      name: indicator.name,
      target: indicator.target,
      unit: indicator.unit,
      type: indicator.type,
      cadence: "spread",
      commitment: indicator.commitment,
    })),
    startDate: dateKey(cycleStart),
    reviewDay: "Sunday",
    tacticLoadPreference: "balanced",
    week4Milestone: twelveWeekSystem.milestones.week4,
    week8Milestone: twelveWeekSystem.milestones.week8,
    successEvidence: twelveWeekSystem.successEvidence,
    dailyTimeBudget: "60",
    preferredDays: [1, 2, 4, 5, 6],
    personalConstraint: "time",
  };

  const storage = {
    visionboard_user_data: JSON.stringify(userData),
    selected_focus_area: "Career",
    user_intent: "complete_project",
    pending_smart_goal: JSON.stringify(smartGoal),
    pending_feasibility_result: JSON.stringify(feasibilityResult),
    pending_feasibility_answers: JSON.stringify({
      1: "gt5",
      2: "energy_high",
      3: "resources_ready",
      4: "very_realistic",
      5: "minor",
      6: "always",
      7: "committed",
    }),
    pending_12_week_setup_draft: JSON.stringify(pending12WeekSetupDraft),
    latest_12_week_goal_id: goalId,
    latest_12_week_system_goal_id: goalId,
    latest_12_week_plan_goal_id: goalId,
    visionboard_new_user_guide_dismissed: "1",
  };

  if (uid !== "demo_video_user") {
    storage[`visionboard_user_data:auth:${uid}`] = JSON.stringify(userData);
    storage["visionboard_user_data:auth_owner_uid"] = uid;
  }

  return {
    goalId,
    localStorage: storage,
  };
}

async function waitForServer(url, timeoutMs = 45_000) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (response.status < 500) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await sleep(500);
  }

  throw new Error(`Timed out waiting for ${url}. ${lastError instanceof Error ? lastError.message : ""}`);
}

async function startDevServerIfNeeded() {
  if (externalUrl) {
    log(`Using external URL: ${baseUrl}`);
    return null;
  }

  try {
    await waitForServer(baseUrl, 1_500);
    log(`Using existing dev server: ${baseUrl}`);
    return null;
  } catch {
    log(`Starting Vite dev server at ${baseUrl}`);
  }

  const command = process.platform === "win32" ? "cmd.exe" : "npm";
  const args =
    process.platform === "win32"
      ? ["/d", "/s", "/c", `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`]
      : ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(port), "--strictPort"];
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: createChildEnv({
      VITE_APP_MODE: appMode,
      VITE_SHOW_BILLING_DEBUG: "false",
      VITE_SHOW_SYNC_DEBUG: "false",
    }),
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });

  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });

  child.once("exit", (code) => {
    if (!child.demoVideoStopping && code !== null && code !== 0) {
      log(`Dev server exited early with code ${code}`);
    }
  });

  try {
    await waitForServer(baseUrl, 60_000);
  } catch (error) {
    killProcessTree(child);
    throw new Error(
      `Could not start dev server at ${baseUrl}.\n${error instanceof Error ? error.message : String(error)}\n${output}`,
    );
  }

  return child;
}

function killProcessTree(child) {
  if (!child?.pid) return;
  child.demoVideoStopping = true;

  if (process.platform === "win32") {
    spawn("taskkill.exe", ["/pid", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    return;
  }

  child.kill("SIGTERM");
}

async function seedBrowserStorage(page, seed, shouldClear = true) {
  if (shouldClear) {
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  }
  await page.evaluate((payload) => {
    if (payload.shouldClear) {
      localStorage.clear();
      sessionStorage.clear();
    }

    for (const [key, value] of Object.entries(payload.localStorage)) {
      localStorage.setItem(key, value);
    }

    window.dispatchEvent(new CustomEvent("visionboard:user-data-updated"));
  }, { localStorage: seed.localStorage, shouldClear });
}

async function waitForAppReady(page) {
  await page.waitForLoadState("domcontentloaded", { timeout: 30_000 }).catch(() => undefined);
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => undefined);
  await page
    .waitForFunction(() => document.body && document.body.innerText.trim().length > 80, null, { timeout: 25_000 })
    .catch(() => undefined);
  await page.evaluate(() => document.fonts?.ready).catch(() => undefined);
  await sleep(700);

  const pageState = await page.evaluate(() => ({
    url: location.href,
    textLength: document.body.innerText.trim().length,
    hasViteError: Boolean(document.querySelector("vite-error-overlay")),
    title: document.title,
  }));

  if (pageState.hasViteError || pageState.textLength < 50) {
    throw new Error(`Scene under-rendered: ${pageState.url}`);
  }
}

function assertSceneAccess(scene, actualUrl) {
  const actualPath = new URL(actualUrl).pathname;

  if (scene.requiresWorkspace && appMode === "real" && actualPath === "/login") {
    throw new Error(
      `Scene "${scene.title}" redirected to /login in real mode. ` +
        "Use DEMO_VIDEO_APP_MODE=demo for local marketing capture, or run against a signed-in real session.",
    );
  }
}

async function injectSceneLabel(page, scene) {
  if (!shouldShowSceneLabels) return;

  await page.evaluate((payload) => {
    const existing = document.querySelector("[data-demo-video-scene-label]");
    existing?.remove();

    const label = document.createElement("div");
    label.dataset.demoVideoSceneLabel = "true";
    label.textContent = payload.caption;
    label.style.position = "fixed";
    label.style.left = "24px";
    label.style.bottom = "24px";
    label.style.zIndex = "99999";
    label.style.padding = "10px 14px";
    label.style.borderRadius = "999px";
    label.style.background = "rgba(15, 23, 42, 0.86)";
    label.style.color = "white";
    label.style.font = "600 14px/1.3 Inter, system-ui, sans-serif";
    label.style.boxShadow = "0 12px 30px rgba(15, 23, 42, 0.22)";
    document.body.appendChild(label);
  }, scene);
}

async function moveMouseNaturally(page) {
  await page.mouse.move(1180, 160, { steps: 18 });
  await sleep(250);
  await page.mouse.move(1010, 460, { steps: 22 });
  await sleep(250);
  await page.mouse.move(760, 620, { steps: 22 });
}

async function scrollForScene(page, ratio) {
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
  await sleep(600);

  await page.evaluate(async () => {
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const scrollHeight = document.documentElement.scrollHeight;
    const clientHeight = window.innerHeight;
    const maxScroll = Math.max(0, scrollHeight - clientHeight);

    if (maxScroll === 0) return;

    const steps = 45;
    const stepSize = maxScroll / steps;

    for (let i = 1; i <= steps; i++) {
      window.scrollTo({ top: Math.round(stepSize * i), behavior: "instant" });
      await delay(35);
    }
  });

  await sleep(1500);
}

async function captureScene(page, scene, index) {
  const url = `${baseUrl}${scene.path}`;
  log(`Scene ${index + 1}/${scenes.length}: ${scene.title} (${scene.path})`);

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await waitForAppReady(page);
  assertSceneAccess(scene, page.url());
  await injectSceneLabel(page, scene);
  await moveMouseNaturally(page);
  await scrollForScene(page, scene.scroll);
  await sleep(Math.max(0, sceneHoldMs - 1800));

  const screenshotPath = path.join(screenshotsDir, `${String(index + 1).padStart(2, "0")}-${scene.id}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await sleep(transitionPauseMs);

  return {
    ...scene,
    url,
    actualUrl: page.url(),
    screenshot: screenshotPath,
  };
}

async function moveRecordedVideo(page) {
  const video = page.video();
  if (!video) return null;

  const source = await video.path();
  const target = path.join(outputDir, "vision-board-demo.webm");
  await rename(source, target);
  return target;
}

async function getDirectoryFiles(directory) {
  const files = [];
  for (const name of await readdir(directory)) {
    const filePath = path.join(directory, name);
    const info = await stat(filePath);
    files.push({
      name,
      path: filePath,
      bytes: info.size,
    });
  }
  return files;
}

async function writeArtifacts(capturedScenes, videoPath, consoleMessages) {
  const manifest = {
    generatedAt: new Date().toISOString(),
    appMode,
    baseUrl,
    viewport,
    outputDir,
    videoPath,
    screenshotsDir,
    voiceoverScript,
    scenes: capturedScenes,
    consoleMessages,
  };

  await writeFile(path.join(outputDir, "demo-video-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  await writeFile(
    path.join(outputDir, "voiceover.md"),
    `# Voiceover\n\n${voiceoverScript}\n\n# Cảnh quay\n\n${capturedScenes
      .map((scene, index) => `${index + 1}. ${scene.title} - ${scene.caption} - ${scene.path}`)
      .join("\n")}\n`,
    "utf8",
  );
}

async function main() {
  await mkdir(screenshotsDir, { recursive: true });
  const server = await startDevServerIfNeeded();
  const email = process.env.DEMO_VIDEO_EMAIL;
  const password = process.env.DEMO_VIDEO_PASSWORD;
  const hasCredentials = Boolean(email && password);
  const resolvedAppMode = hasCredentials ? "real" : appMode;

  const seed = createDemoSeed();
  const consoleMessages = [];

  log(`App mode: ${resolvedAppMode}`);
  log(`Output: ${outputDir}`);

  const browser = await chromium.launch({
    headless,
    args: headless ? [] : ["--start-maximized"],
    slowMo: headless ? 0 : 60,
  });

  const context = await browser.newContext({
    viewport: headless ? viewport : null,
    deviceScaleFactor: 1,
    locale: "vi-VN",
    timezoneId: "Asia/Ho_Chi_Minh",
    colorScheme: "light",
    reducedMotion: "no-preference",
    recordVideo: {
      dir: outputDir,
      size: viewport,
    },
  });

  const page = await context.newPage();
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleMessages.push({
        type: message.type(),
        text: message.text(),
      });
    }
  });
  page.on("pageerror", (error) => {
    consoleMessages.push({
      type: "pageerror",
      text: error.message,
    });
  });

  let videoPath = null;
  let capturedScenes = [];

  try {
    let finalSeed = seed;

    log("Quay phân cảnh mở đầu ở trạng thái chưa đăng nhập...");
    capturedScenes.push(await captureScene(page, scenes[0], 0));

    if (hasCredentials) {
      log(`Tiến hành đăng nhập thật bằng email: ${email}`);
      await page.goto(`${baseUrl}/login`, { waitUntil: "domcontentloaded" });
      await waitForAppReady(page);
      
      await page.fill("#login-email", email);
      await page.fill("#login-password", password);
      await page.click('button[type="submit"]');
      
      log("Đang đợi đăng nhập thành công...");
      await page.waitForURL((url) => {
        const p = url.pathname;
        return p === "/" || p === "/12-week-system" || p === "/onboarding";
      }, { timeout: 25000 });
      
      await sleep(1500); // Đợi Firebase cập nhật localStorage
      
      const uid = await page.evaluate(() => {
        return localStorage.getItem("visionboard_user_data:auth_owner_uid");
      });
      
      if (!uid) {
        throw new Error("Đăng nhập thất bại: Không tìm thấy auth_owner_uid trong localStorage.");
      }
      
      log(`Đăng nhập thành công với UID thật: ${uid}`);
      finalSeed = createDemoSeed(uid);
      
      await seedBrowserStorage(page, finalSeed, false);
      
      await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded" });
      await waitForAppReady(page);
    } else {
      await seedBrowserStorage(page, finalSeed, true);
    }

    for (let index = 1; index < scenes.length; index += 1) {
      capturedScenes.push(await captureScene(page, scenes[index], index));
    }

    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" })).catch(() => undefined);
    await sleep(900);
  } finally {
    await page.close();
    videoPath = await moveRecordedVideo(page).catch(() => null);
    await context.close().catch(() => undefined);
    await browser.close().catch(() => undefined);

    if (server) {
      killProcessTree(server);
    }
  }

  await writeArtifacts(capturedScenes, videoPath, consoleMessages);
  const files = await getDirectoryFiles(outputDir);
  log(`Done. Video: ${videoPath ?? "not saved"}`);
  log(`Artifacts: ${files.map((file) => `${file.name} (${file.bytes} bytes)`).join(", ")}`);

  if (consoleMessages.length > 0) {
    log(`Captured ${consoleMessages.length} browser warning/error messages. See demo-video-manifest.json.`);
  }
}

main().catch((error) => {
  console.error(`[demo-video] FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
