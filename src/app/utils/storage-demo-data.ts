import { formatDateInputValue, sortReflectionsByDateDesc } from "./storage-date-utils";
import { normalizeGoal } from "./storage-twelve-week";
import type {
  Achievement,
  AppPreferences,
  Goal,
  LifeArea,
  Reflection,
  UserData,
  VisionBoard,
  WheelOfLifeRecord,
} from "./storage-types";

export interface DemoDataOptions {
  currentStorageVersion: number;
  defaultAppPreferences: AppPreferences;
  motivationalQuotes: readonly string[];
}

function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function getRelativeISOString(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString();
}

function getRelativeDateValue(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return formatDateInputValue(date);
}

export function shouldHydrateDemoData(data: UserData): boolean {
  return (
    data.goals.length === 0 &&
    data.visionBoards.length === 0 &&
    data.reflections.length === 0 &&
    data.achievements.length === 0 &&
    data.wheelOfLifeHistory.length === 0 &&
    data.onboardingCompleted === false
  );
}

export function createDemoUserData({
  currentStorageVersion,
  defaultAppPreferences,
  motivationalQuotes,
}: DemoDataOptions): UserData {
  const userId = generateUserId();
  const systemGoalId = "goal_demo_12_week";
  const careerGoalId = "goal_demo_portfolio";
  const healthGoalId = "goal_demo_health";
  const boardId = "board_demo_2026";

  const currentWheelOfLife: LifeArea[] = [
    { name: "Career", score: 7, color: "#8b5cf6" },
    { name: "Finance", score: 6, color: "#10b981" },
    { name: "Health", score: 5, color: "#ef4444" },
    { name: "Education", score: 8, color: "#f59e0b" },
    { name: "Relationships", score: 7, color: "#ec4899" },
    { name: "Family", score: 8, color: "#3b82f6" },
    { name: "Personal Growth", score: 6, color: "#14b8a6" },
    { name: "Leisure", score: 5, color: "#a855f7" },
  ];

  const wheelOfLifeHistory: WheelOfLifeRecord[] = [
    {
      date: getRelativeISOString(-42),
      areas: currentWheelOfLife.map((area) => ({ ...area, score: Math.max(3, area.score - 1) })),
    },
    {
      date: getRelativeISOString(-21),
      areas: currentWheelOfLife.map((area) => ({
        ...area,
        score: area.name === "Health" || area.name === "Leisure" ? area.score - 1 : area.score,
      })),
    },
    {
      date: getRelativeISOString(-3),
      areas: currentWheelOfLife,
    },
  ];

  const goals: Goal[] = [
    {
      id: systemGoalId,
      category: "Career",
      title: "Ra mắt portfolio mới và nộp 20 đơn ứng tuyển chất lượng",
      description:
        "Một mục tiêu 12 tuần tập trung vào việc hoàn thiện hồ sơ nghề nghiệp, tăng chất lượng portfolio và tạo đầu ra thật để chuẩn bị cho bước chuyển nghề nghiệp rõ ràng hơn.",
      deadline: getRelativeDateValue(70),
      feasibilityResult: "Khả thi",
      readinessScore: 16,
      focusArea: "Career",
      createdAt: getRelativeISOString(-16),
      tasks: [
        { id: "task_demo_portfolio_1", title: "Chốt bố cục portfolio và case study chính", completed: true },
        { id: "task_demo_portfolio_2", title: "Viết lại phần giới thiệu bản thân và CV", completed: true },
        { id: "task_demo_portfolio_3", title: "Hoàn thiện trang dự án số 1", completed: true },
        { id: "task_demo_portfolio_4", title: "Chuẩn bị danh sách công ty mục tiêu", completed: false },
      ],
      twelveWeekSystem: {
        goalType: "career-transition",
        vision12Week:
          "Trong 12 tuần tới, tôi muốn có một portfolio đủ mạnh, quy trình nộp đơn đủ rõ và sự tự tin đủ lớn để bước vào một giai đoạn nghề nghiệp tốt hơn.",
        lagMetric: {
          name: "Đơn ứng tuyển chất lượng đã gửi",
          unit: "đơn",
          target: "20",
          currentValue: "7/20 đơn",
        },
        leadIndicators: [
          { name: "Hoàn thiện case study portfolio", target: "2", unit: "buổi/tuần" },
          { name: "Networking hoặc outreach", target: "3", unit: "lần/tuần" },
          { name: "Nộp đơn mục tiêu", target: "2", unit: "đơn/tuần" },
        ],
        milestones: {
          week4: "Hoàn thành 1 case study và CV phiên bản mới",
          week8: "Có ít nhất 10 đơn chất lượng và 3 cuộc trao đổi tuyển dụng",
          week12: "Portfolio hoàn chỉnh và đủ dữ liệu để tiếp tục tăng tốc nộp đơn",
        },
        successEvidence:
          "Portfolio đã public, CV hoàn chỉnh, có phản hồi từ nhà tuyển dụng và thói quen review hằng tuần được giữ đều.",
        reviewDay: "Sunday",
        week12Outcome: "Portfolio hoàn chỉnh, 20 đơn chất lượng và ít nhất 3 cuộc trao đổi tuyển dụng.",
        weeklyActions: [
          "2 buổi tối để viết hoặc chỉnh case study",
          "3 outreach chất lượng tới người trong ngành hoặc recruiter",
          "2 đơn ứng tuyển đã cá nhân hóa",
        ],
        successMetric: "Số đơn chất lượng và số phản hồi nhận được mỗi tuần",
        startDate: "",
        endDate: "",
        timezone: "Asia/Ho_Chi_Minh",
        weekStartsOn: "Monday",
        status: "active",
        dailyReminderTime: "19:00",
        tacticLoadPreference: "balanced",
        reentryCount: 0,
        currentWeek: 4,
        totalWeeks: 12,
        weeklyPlans: [
          {
            weekNumber: 1,
            phaseName: "Foundation",
            focus: "Làm rõ câu chuyện nghề nghiệp và xác định danh sách công ty mục tiêu",
            milestone: "Khung portfolio hoàn chỉnh",
            completed: true,
          },
          {
            weekNumber: 2,
            phaseName: "Foundation",
            focus: "Xây CV mới và outline case study số 1",
            milestone: "CV bản nháp đầu tiên",
            completed: true,
          },
          {
            weekNumber: 3,
            phaseName: "Foundation",
            focus: "Hoàn thiện case study số 1 và chuẩn hóa visual",
            milestone: "Case study số 1 online",
            completed: true,
          },
          {
            weekNumber: 4,
            phaseName: "Build / Acceleration",
            focus: "Tăng outreach và mở case study số 2",
            milestone: "Bắt đầu có phản hồi đầu tiên",
            completed: false,
          },
          {
            weekNumber: 5,
            phaseName: "Build / Acceleration",
            focus: "Nộp đơn có chọn lọc và lặp lại review hồ sơ",
            milestone: "",
            completed: false,
          },
          {
            weekNumber: 6,
            phaseName: "Build / Acceleration",
            focus: "Tinh chỉnh portfolio dựa trên feedback",
            milestone: "",
            completed: false,
          },
          {
            weekNumber: 7,
            phaseName: "Build / Acceleration",
            focus: "Tăng tốc số lượng đơn chất lượng",
            milestone: "",
            completed: false,
          },
          {
            weekNumber: 8,
            phaseName: "Build / Acceleration",
            focus: "Kiểm tra chất lượng pipeline ứng tuyển",
            milestone: "10 đơn chất lượng",
            completed: false,
          },
          {
            weekNumber: 9,
            phaseName: "Finish / Execution",
            focus: "Dồn lực cho các cơ hội phản hồi tốt",
            milestone: "",
            completed: false,
          },
          {
            weekNumber: 10,
            phaseName: "Finish / Execution",
            focus: "Chuẩn bị các buổi phỏng vấn hoặc bài test",
            milestone: "",
            completed: false,
          },
          {
            weekNumber: 11,
            phaseName: "Finish / Execution",
            focus: "Chốt các cơ hội ưu tiên",
            milestone: "",
            completed: false,
          },
          {
            weekNumber: 12,
            phaseName: "Finish / Execution",
            focus: "Review toàn bộ chu kỳ và quyết định bước tiếp theo",
            milestone: "Đóng chu kỳ 12 tuần",
            completed: false,
          },
        ],
        dailyCheckIns: [
          {
            date: getRelativeISOString(-1),
            didWorkToday: true,
            whichLeadIndicatorWorkedOn: "Hoàn thiện case study portfolio",
            amountDone: "90 phút",
            outputCreated: "Hoàn thiện phần challenge và solution của case study số 2",
            obstacleOrIssue: "Mất khá nhiều thời gian chọn ảnh minh họa",
            dailySelfRating: 4,
            optionalNote: "Ngày mai nên khóa layout trước rồi mới polish.",
          },
          {
            date: getRelativeISOString(-2),
            didWorkToday: true,
            whichLeadIndicatorWorkedOn: "Networking hoặc outreach",
            amountDone: "3 tin nhắn",
            outputCreated: "Gửi outreach tới 2 recruiter và 1 designer lead",
            obstacleOrIssue: "",
            dailySelfRating: 4,
            optionalNote: "",
          },
        ],
        weeklyReviews: [
          {
            weekNumber: 1,
            leadCompletionPercent: 75,
            lagProgressValue: "2/20 đơn",
            biggestOutputThisWeek: "Hoàn thành outline portfolio và CV mới",
            mainObstacle: "Khó gom ý tưởng thành một câu chuyện rõ",
            nextWeekPriority: "Chốt case study số 1",
            workloadDecision: "keep same",
            reviewCompleted: true,
            progressScore: 7,
            disciplineScore: 8,
            focusScore: 7,
            improvementScore: 7,
            outputQualityScore: 8,
          },
          {
            weekNumber: 2,
            leadCompletionPercent: 80,
            lagProgressValue: "4/20 đơn",
            biggestOutputThisWeek: "CV và portfolio có hình hài rõ ràng hơn",
            mainObstacle: "Dễ sa vào chỉnh giao diện quá sớm",
            nextWeekPriority: "Đưa case study số 1 lên online",
            workloadDecision: "keep same",
            reviewCompleted: true,
            progressScore: 8,
            disciplineScore: 8,
            focusScore: 7,
            improvementScore: 8,
            outputQualityScore: 8,
          },
          {
            weekNumber: 3,
            leadCompletionPercent: 85,
            lagProgressValue: "7/20 đơn",
            biggestOutputThisWeek: "Case study số 1 đã public và có phản hồi tốt",
            mainObstacle: "Chưa duy trì outreach đều như dự kiến",
            nextWeekPriority: "Giữ nhịp outreach 3 lần và mở case study số 2",
            workloadDecision: "increase slightly",
            reviewCompleted: true,
            progressScore: 8,
            disciplineScore: 8,
            focusScore: 8,
            improvementScore: 8,
            outputQualityScore: 9,
          },
        ],
        scoreboard: [
          { weekNumber: 1, leadCompletionPercent: 75, mainMetricProgress: "2/20 đơn", outputDone: "Outline portfolio + CV", reviewDone: true, weeklyScore: 78 },
          { weekNumber: 2, leadCompletionPercent: 80, mainMetricProgress: "4/20 đơn", outputDone: "CV + cấu trúc portfolio", reviewDone: true, weeklyScore: 80 },
          { weekNumber: 3, leadCompletionPercent: 85, mainMetricProgress: "7/20 đơn", outputDone: "Case study số 1", reviewDone: true, weeklyScore: 86 },
          { weekNumber: 4, leadCompletionPercent: 0, mainMetricProgress: "", outputDone: "", reviewDone: false, weeklyScore: 0 },
          { weekNumber: 5, leadCompletionPercent: 0, mainMetricProgress: "", outputDone: "", reviewDone: false, weeklyScore: 0 },
          { weekNumber: 6, leadCompletionPercent: 0, mainMetricProgress: "", outputDone: "", reviewDone: false, weeklyScore: 0 },
          { weekNumber: 7, leadCompletionPercent: 0, mainMetricProgress: "", outputDone: "", reviewDone: false, weeklyScore: 0 },
          { weekNumber: 8, leadCompletionPercent: 0, mainMetricProgress: "", outputDone: "", reviewDone: false, weeklyScore: 0 },
          { weekNumber: 9, leadCompletionPercent: 0, mainMetricProgress: "", outputDone: "", reviewDone: false, weeklyScore: 0 },
          { weekNumber: 10, leadCompletionPercent: 0, mainMetricProgress: "", outputDone: "", reviewDone: false, weeklyScore: 0 },
          { weekNumber: 11, leadCompletionPercent: 0, mainMetricProgress: "", outputDone: "", reviewDone: false, weeklyScore: 0 },
          { weekNumber: 12, leadCompletionPercent: 0, mainMetricProgress: "", outputDone: "", reviewDone: false, weeklyScore: 0 },
        ],
        taskInstances: [],
      },
    },
    {
      id: careerGoalId,
      category: "Personal Growth",
      title: "Duy trì thói quen đọc và ghi chú 20 phút mỗi ngày",
      description: "Một mục tiêu nền để tăng chất lượng đầu vào tri thức và giữ nhịp học đều.",
      deadline: getRelativeDateValue(45),
      createdAt: getRelativeISOString(-12),
      tasks: [
        { id: "task_demo_reading_1", title: "Chọn 2 cuốn sách ưu tiên trong tháng này", completed: true },
        { id: "task_demo_reading_2", title: "Tạo template ghi chú ngắn sau mỗi buổi đọc", completed: true },
        { id: "task_demo_reading_3", title: "Giữ streak đọc ít nhất 10 ngày", completed: false },
      ],
    },
    {
      id: healthGoalId,
      category: "Health",
      title: "Đi bộ 8.000 bước mỗi ngày trong 30 ngày",
      description: "Một mục tiêu sức khỏe đơn giản để kéo lại năng lượng nền mỗi ngày.",
      deadline: getRelativeDateValue(18),
      createdAt: getRelativeISOString(-30),
      tasks: [
        { id: "task_demo_health_1", title: "Chuẩn bị khung giờ đi bộ cố định", completed: true },
        { id: "task_demo_health_2", title: "Đi bộ đủ bước trong tuần đầu tiên", completed: true },
        { id: "task_demo_health_3", title: "Giữ nhịp 2 tuần liên tiếp", completed: true },
      ],
    },
  ];

  const visionBoards: VisionBoard[] = [
    {
      id: boardId,
      name: "Vision 2026",
      year: "2026",
      createdAt: getRelativeISOString(-10),
      items: [
        {
          id: "board_item_1",
          type: "image",
          content: "https://picsum.photos/seed/demo-office/480/360",
          x: 10,
          y: 12,
          width: 220,
          height: 180,
        },
        {
          id: "board_item_2",
          type: "image",
          content: "https://picsum.photos/seed/demo-travel/480/360",
          x: 58,
          y: 14,
          width: 210,
          height: 170,
        },
        {
          id: "board_item_3",
          type: "quote",
          content: "Kỷ luật là cây cầu nối tầm nhìn với kết quả.",
          x: 14,
          y: 58,
          width: 280,
          height: 120,
        },
        {
          id: "board_item_4",
          type: "icon",
          content: "Sparkles",
          x: 74,
          y: 62,
          width: 96,
          height: 96,
        },
      ],
    },
  ];

  const reflections: Reflection[] = [
    {
      id: "reflection_demo_1",
      date: getRelativeDateValue(-1),
      title: "Một ngày giữ được nhịp rất rõ",
      content:
        "Hôm nay mình làm ít hơn dự kiến nhưng rất đúng trọng tâm. Điều đáng giá nhất là không bị trôi vào những việc nhìn bận rộn nhưng không tạo ra đầu ra thật.",
      mood: "happy",
    },
    {
      id: "reflection_demo_2",
      date: getRelativeDateValue(-4),
      title: "Nhìn lại sự thiếu nhất quán",
      content:
        "Mình nhận ra cứ khi lịch bị xáo trộn thì các thói quen tốt rơi trước. Tuần tới cần khóa trước 2 khung giờ quan trọng nhất thay vì cố nhồi quá nhiều việc.",
      mood: "neutral",
    },
  ];

  const achievements: Achievement[] = [
    {
      id: "achievement_demo_1",
      title: "First Step",
      description: "Tạo mục tiêu đầu tiên của bạn",
      icon: "Target",
      earnedAt: getRelativeISOString(-30),
    },
    {
      id: "achievement_demo_2",
      title: "Visionary",
      description: "Tạo bảng tầm nhìn đầu tiên của bạn",
      icon: "Sparkles",
      earnedAt: getRelativeISOString(-10),
    },
    {
      id: "achievement_demo_3",
      title: "Reflective Mind",
      description: "Viết nhật ký phản tư đầu tiên của bạn",
      icon: "BookOpen",
      earnedAt: getRelativeISOString(-5),
    },
  ];

  return {
    storageVersion: currentStorageVersion,
    userId,
    wheelOfLifeHistory,
    currentWheelOfLife,
    goals: goals.map((goal) => normalizeGoal(goal)),
    visionBoards,
    achievements,
    reflections: sortReflectionsByDateDesc(reflections),
    eventLog: [],
    syncOutbox: [],
    appPreferences: { ...defaultAppPreferences },
    lastMotivationalQuote: motivationalQuotes[0] ?? "",
    onboardingCompleted: true,
    isHydratedFromDemo: true,
  };
}
