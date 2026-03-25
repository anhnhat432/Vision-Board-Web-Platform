// Local Storage Management Utility

export interface LifeArea {
  name: string;
  score: number;
  color: string;
}

export interface WheelOfLifeRecord {
  date: string;
  areas: LifeArea[];
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
}

export interface DailyUpdate {
  date: string;
  workedToday: boolean;
  note: string;
}

export interface WeeklyReview {
  week: number;
  wentWell: string;
  gotInTheWay: string;
  improveNextWeek: string;
  score: number;
  completed: boolean;
  completedWeeklyActions?: number;
}

export interface ScoreboardWeek {
  week: number;
  score: number;
  reviewed: boolean;
}

export interface LagMetric {
  name: string;
  unit: string;
  target: string;
  currentValue: string;
}

export interface LeadIndicator {
  name: string;
  target: string;
  unit: string;
}

export interface Milestones {
  week4: string;
  week8: string;
  week12: string;
}

export interface WeeklyPlanEntry {
  weekNumber: number;
  phaseName: string;
  focus: string;
  milestone: string;
  completed: boolean;
}

export interface UniversalDailyCheckIn {
  date: string;
  didWorkToday: boolean;
  whichLeadIndicatorWorkedOn: string;
  amountDone: string;
  outputCreated: string;
  obstacleOrIssue: string;
  dailySelfRating: number;
  optionalNote: string;
}

export interface UniversalWeeklyReview {
  weekNumber: number;
  leadCompletionPercent: number;
  lagProgressValue: string;
  biggestOutputThisWeek: string;
  mainObstacle: string;
  nextWeekPriority: string;
  workloadDecision: "keep same" | "reduce slightly" | "increase slightly" | "";
  reviewCompleted: boolean;
  progressScore: number;
  disciplineScore: number;
  focusScore: number;
  improvementScore: number;
  outputQualityScore: number;
  completedLeadIndicators?: number;
}

export interface UniversalScoreboardWeek {
  weekNumber: number;
  leadCompletionPercent: number;
  mainMetricProgress: string;
  outputDone: string;
  reviewDone: boolean;
  weeklyScore: number;
}

export interface TwelveWeekSystem {
  goalType: string;
  vision12Week: string;
  lagMetric: LagMetric;
  leadIndicators: LeadIndicator[];
  milestones: Milestones;
  successEvidence: string;
  reviewDay: string;
  week12Outcome: string;
  weeklyActions: string[];
  successMetric: string;
  currentWeek: number;
  totalWeeks: number;
  weeklyPlans: WeeklyPlanEntry[];
  dailyCheckIns: UniversalDailyCheckIn[];
  weeklyReviews: UniversalWeeklyReview[];
  scoreboard: UniversalScoreboardWeek[];
  // Legacy compatibility fields
  dailyUpdates?: DailyUpdate[];
  legacyWeeklyReviews?: WeeklyReview[];
  legacyScoreboard?: ScoreboardWeek[];
}

export interface TwelveWeekPlan {
  week12Outcome: string;
  weeklyActions: string[];
  successMetric: string;
  reviewDay: string;
  currentWeek: number;
  totalWeeks: number;
  weeklyCheckIns: string[];
}

export interface Goal {
  id: string;
  category: string;
  title: string;
  description: string;
  deadline: string;
  tasks: Task[];
  feasibilityResult?: string;
  readinessScore?: number;
  focusArea?: string;
  twelveWeekSystem?: TwelveWeekSystem;
  twelveWeekPlan?: TwelveWeekPlan;
  createdAt: string;
}

export interface VisionBoardItem {
  id: string;
  type: 'image' | 'quote' | 'icon';
  content: string; // URL for image, text for quote, icon name for icon
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VisionBoard {
  id: string;
  name: string;
  year: string;
  items: VisionBoardItem[];
  createdAt: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  earnedAt: string;
}

export interface Reflection {
  id: string;
  date: string;
  title: string;
  content: string;
  mood?: string;
}

export interface UserData {
  userId: string;
  wheelOfLifeHistory: WheelOfLifeRecord[];
  currentWheelOfLife: LifeArea[];
  goals: Goal[];
  visionBoards: VisionBoard[];
  achievements: Achievement[];
  reflections: Reflection[];
  lastMotivationalQuote?: string;
  onboardingCompleted: boolean;
  isHydratedFromDemo?: boolean;
}

const STORAGE_KEY = 'visionboard_user_data';
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export const APP_STORAGE_KEYS = {
  selectedFocusArea: 'selected_focus_area',
  pendingSmartGoal: 'pending_smart_goal',
  pendingFeasibilityResult: 'pending_feasibility_result',
  pendingFeasibilityAnswers: 'pending_feasibility_answers',
  pending12WeekSetupDraft: 'pending_12_week_setup_draft',
  pending12WeekPlanDraft: 'pending_12_week_plan_draft',
  latest12WeekGoalId: 'latest_12_week_goal_id',
  latest12WeekSystemGoalId: 'latest_12_week_system_goal_id',
  latest12WeekPlanGoalId: 'latest_12_week_plan_goal_id',
  readinessLevel: 'readiness_level',
  readinessScore: 'readiness_score',
} as const;

export const LIFE_AREAS = [
  { name: 'Career', color: '#8b5cf6' },
  { name: 'Finance', color: '#10b981' },
  { name: 'Health', color: '#ef4444' },
  { name: 'Education', color: '#f59e0b' },
  { name: 'Relationships', color: '#ec4899' },
  { name: 'Family', color: '#3b82f6' },
  { name: 'Personal Growth', color: '#14b8a6' },
  { name: 'Leisure', color: '#a855f7' },
];

export const LIFE_AREA_LABELS: Record<string, string> = {
  Career: 'Sự nghiệp',
  Finance: 'Tài chính',
  Health: 'Sức khỏe',
  Education: 'Học tập',
  Relationships: 'Mối quan hệ',
  Family: 'Gia đình',
  'Personal Growth': 'Phát triển bản thân',
  Leisure: 'Giải trí',
};

export const REVIEW_DAY_LABELS: Record<string, string> = {
  Monday: 'Thứ Hai',
  Tuesday: 'Thứ Ba',
  Wednesday: 'Thứ Tư',
  Thursday: 'Thứ Năm',
  Friday: 'Thứ Sáu',
  Saturday: 'Thứ Bảy',
  Sunday: 'Chủ Nhật',
};

export const FEASIBILITY_RESULT_LABELS: Record<string, string> = {
  realistic: 'Khả thi',
  challenging: 'Thách thức nhưng làm được',
  too_ambitious: 'Hơi quá sức lúc này',
  'This goal looks realistic for you right now.': 'Mục tiêu này có vẻ khả thi với bạn lúc này.',
  'This goal is challenging but possible.': 'Mục tiêu này đầy thách thức nhưng có thể thực hiện được.',
  'This goal may be too ambitious right now.': 'Mục tiêu này có thể quá tham vọng lúc này.',
  'Mục tiêu này có vẻ khả thi với bạn lúc này.': 'Khả thi',
  'Mục tiêu này đầy thách thức nhưng có thể thực hiện được.': 'Thách thức nhưng làm được',
  'Mục tiêu này có thể quá tham vọng lúc này.': 'Hơi quá sức lúc này',
};

export const MOTIVATIONAL_QUOTES = [
  "Tương lai thuộc về những người tin vào vẻ đẹp của ước mơ mình.",
  "Thành công không phải điểm kết, thất bại không phải dấu chấm hết: điều quan trọng là lòng can đảm để tiếp tục.",
  "Hãy tin rằng bạn có thể, và bạn đã đi được một nửa chặng đường.",
  "Cách duy nhất để làm nên điều tuyệt vời là yêu điều bạn đang làm.",
  "Giới hạn của bạn thường chỉ đến từ trí tưởng tượng của chính bạn.",
  "Hãy thúc đẩy chính mình, vì không ai có thể làm điều đó thay bạn.",
  "Những điều tuyệt vời không sinh ra từ vùng an toàn.",
  "Hãy mơ ước, mong cầu và bắt tay vào hành động.",
  "Thành công không tự tìm đến bạn. Bạn phải đứng dậy và đi tìm nó.",
  "Bạn càng nỗ lực cho điều gì đó, cảm giác khi đạt được nó sẽ càng ý nghĩa.",
];

function padDatePart(value: number): string {
  return String(value).padStart(2, '0');
}

function getCalendarDayIndex(date: Date): number {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MILLISECONDS_PER_DAY);
}

function normalizeUserData(data: UserData): UserData {
  return {
    ...data,
    reflections: sortReflectionsByDateDesc(Array.isArray(data.reflections) ? data.reflections : []),
  };
}

function getLegacyPhaseName(weekNumber: number): string {
  if (weekNumber <= 4) return 'Foundation';
  if (weekNumber <= 8) return 'Build / Acceleration';
  return 'Finish / Execution';
}

function migrateLegacyPlanToSystem(goal: Goal): Goal {
  if (!goal.twelveWeekPlan || goal.twelveWeekSystem) return goal;

  const legacyPlan = goal.twelveWeekPlan;
  const leadIndicators = legacyPlan.weeklyActions.map((action) => ({
    name: action,
    target: '',
    unit: '',
  }));

  const weeklyPlans: WeeklyPlanEntry[] = Array.from(
    { length: Math.max(legacyPlan.totalWeeks || 12, 1) },
    (_, index) => ({
      weekNumber: index + 1,
      phaseName: getLegacyPhaseName(index + 1),
      focus: legacyPlan.weeklyActions[index] ?? legacyPlan.weeklyActions[0] ?? 'Duy trì nhịp hành động tuần này',
      milestone: index === 3 || index === 7 || index === 11 ? legacyPlan.week12Outcome : '',
      completed: false,
    }),
  );

  const scoreboard: UniversalScoreboardWeek[] = Array.from({ length: 12 }, (_, index) => ({
    weekNumber: index + 1,
    leadCompletionPercent: 0,
    mainMetricProgress: '',
    outputDone: '',
    reviewDone: false,
    weeklyScore: 0,
  }));

  return {
    ...goal,
    twelveWeekSystem: {
      goalType: 'legacy-plan',
      vision12Week: goal.description || goal.title,
      lagMetric: {
        name: legacyPlan.successMetric || 'Chỉ số kết quả chính',
        unit: '',
        target: '',
        currentValue: '',
      },
      leadIndicators,
      milestones: {
        week4: '',
        week8: '',
        week12: legacyPlan.week12Outcome || '',
      },
      successEvidence: legacyPlan.week12Outcome || '',
      reviewDay: legacyPlan.reviewDay,
      week12Outcome: legacyPlan.week12Outcome,
      weeklyActions: legacyPlan.weeklyActions,
      successMetric: legacyPlan.successMetric,
      currentWeek: legacyPlan.currentWeek,
      totalWeeks: legacyPlan.totalWeeks,
      weeklyPlans,
      dailyCheckIns: [],
      weeklyReviews: [],
      scoreboard,
    },
  };
}

function migrateLegacyUserData(data: UserData): UserData {
  const migratedGoals = data.goals.map(migrateLegacyPlanToSystem);
  const hasChanges = migratedGoals.some((goal, index) => goal !== data.goals[index]);

  if (!hasChanges) return data;

  return {
    ...data,
    goals: migratedGoals,
  };
}

function shouldHydrateDemoData(data: UserData): boolean {
  return (
    data.goals.length === 0 &&
    data.visionBoards.length === 0 &&
    data.reflections.length === 0 &&
    data.achievements.length === 0 &&
    data.wheelOfLifeHistory.length === 0 &&
    data.onboardingCompleted === false
  );
}

function parseStoredUserData(raw: string): UserData | null {
  try {
    return normalizeUserData(JSON.parse(raw) as UserData);
  } catch {
    return null;
  }
}

export function formatDateInputValue(date: Date): string {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

export function parseCalendarDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3]);
    const parsed = new Date(year, month - 1, day);

    if (
      parsed.getFullYear() === year &&
      parsed.getMonth() === month - 1 &&
      parsed.getDate() === day
    ) {
      return parsed;
    }

    return null;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getCalendarDateKey(value: string): string | null {
  const date = parseCalendarDate(value);
  return date ? formatDateInputValue(date) : null;
}

export function formatCalendarDate(
  value: string,
  locale = 'vi-VN',
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = parseCalendarDate(value);
  if (!date) return '--';
  return date.toLocaleDateString(locale, options);
}

export function getCalendarDayDifference(targetDate: string, referenceDate = new Date()): number | null {
  const target = parseCalendarDate(targetDate);
  if (!target) return null;
  return getCalendarDayIndex(target) - getCalendarDayIndex(referenceDate);
}

export function sortReflectionsByDateDesc(reflections: Reflection[]): Reflection[] {
  return [...reflections].sort((left, right) => {
    const leftKey = getCalendarDateKey(left.date);
    const rightKey = getCalendarDateKey(right.date);

    if (leftKey && rightKey && leftKey !== rightKey) {
      return rightKey.localeCompare(leftKey);
    }

    if (leftKey && !rightKey) return -1;
    if (!leftKey && rightKey) return 1;

    return right.id.localeCompare(left.id);
  });
}

export function clearGoalPlanningDrafts(): void {
  [
    APP_STORAGE_KEYS.pendingSmartGoal,
    APP_STORAGE_KEYS.pendingFeasibilityResult,
    APP_STORAGE_KEYS.pendingFeasibilityAnswers,
    APP_STORAGE_KEYS.pending12WeekSetupDraft,
    APP_STORAGE_KEYS.pending12WeekPlanDraft,
    APP_STORAGE_KEYS.readinessLevel,
    APP_STORAGE_KEYS.readinessScore,
  ].forEach((key) => localStorage.removeItem(key));
}

export function getLifeAreaLabel(name: string): string {
  return LIFE_AREA_LABELS[name] ?? name;
}

export function getReviewDayLabel(day: string): string {
  return REVIEW_DAY_LABELS[day] ?? day;
}

export function getFeasibilityResultLabel(result: string): string {
  return FEASIBILITY_RESULT_LABELS[result] ?? result;
}

function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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

function createDemoUserData(): UserData {
  const userId = generateUserId();

  const currentWheelOfLife: LifeArea[] = [
    { name: 'Career', score: 7, color: '#8b5cf6' },
    { name: 'Finance', score: 6, color: '#10b981' },
    { name: 'Health', score: 5, color: '#ef4444' },
    { name: 'Education', score: 8, color: '#f59e0b' },
    { name: 'Relationships', score: 7, color: '#ec4899' },
    { name: 'Family', score: 8, color: '#3b82f6' },
    { name: 'Personal Growth', score: 6, color: '#14b8a6' },
    { name: 'Leisure', score: 5, color: '#a855f7' },
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
        score: area.name === 'Health' || area.name === 'Leisure' ? area.score - 1 : area.score,
      })),
    },
    {
      date: getRelativeISOString(-3),
      areas: currentWheelOfLife,
    },
  ];

  const systemGoalId = 'goal_demo_12_week';
  const careerGoalId = 'goal_demo_portfolio';
  const healthGoalId = 'goal_demo_health';
  const boardId = 'board_demo_2026';

  const goals: Goal[] = [
    {
      id: systemGoalId,
      category: 'Career',
      title: 'Ra mắt portfolio mới và nộp 20 đơn ứng tuyển chất lượng',
      description:
        'Một mục tiêu 12 tuần tập trung vào việc hoàn thiện hồ sơ nghề nghiệp, tăng chất lượng portfolio và tạo đầu ra thật để chuẩn bị cho bước chuyển nghề nghiệp rõ ràng hơn.',
      deadline: getRelativeDateValue(70),
      feasibilityResult: 'Khả thi',
      readinessScore: 16,
      focusArea: 'Career',
      createdAt: getRelativeISOString(-16),
      tasks: [
        { id: 'task_demo_portfolio_1', title: 'Chốt bố cục portfolio và case study chính', completed: true },
        { id: 'task_demo_portfolio_2', title: 'Viết lại phần giới thiệu bản thân và CV', completed: true },
        { id: 'task_demo_portfolio_3', title: 'Hoàn thiện trang dự án số 1', completed: true },
        { id: 'task_demo_portfolio_4', title: 'Chuẩn bị danh sách công ty mục tiêu', completed: false },
      ],
      twelveWeekSystem: {
        goalType: 'career-transition',
        vision12Week:
          'Trong 12 tuần tới, tôi muốn có một portfolio đủ mạnh, quy trình nộp đơn đủ rõ và sự tự tin đủ lớn để bước vào một giai đoạn nghề nghiệp tốt hơn.',
        lagMetric: {
          name: 'Đơn ứng tuyển chất lượng đã gửi',
          unit: 'đơn',
          target: '20',
          currentValue: '7/20 đơn',
        },
        leadIndicators: [
          { name: 'Hoàn thiện case study portfolio', target: '2', unit: 'buổi/tuần' },
          { name: 'Networking hoặc outreach', target: '3', unit: 'lần/tuần' },
          { name: 'Nộp đơn mục tiêu', target: '2', unit: 'đơn/tuần' },
        ],
        milestones: {
          week4: 'Hoàn thành 1 case study và CV phiên bản mới',
          week8: 'Có ít nhất 10 đơn chất lượng và 3 cuộc trao đổi tuyển dụng',
          week12: 'Portfolio hoàn chỉnh và đủ dữ liệu để tiếp tục tăng tốc nộp đơn',
        },
        successEvidence:
          'Portfolio đã public, CV hoàn chỉnh, có phản hồi từ nhà tuyển dụng và thói quen review hàng tuần được giữ đều.',
        reviewDay: 'Sunday',
        week12Outcome: 'Portfolio hoàn chỉnh, 20 đơn chất lượng và ít nhất 3 cuộc trao đổi tuyển dụng.',
        weeklyActions: [
          '2 buổi tối để viết hoặc chỉnh case study',
          '3 outreach chất lượng tới người trong ngành hoặc recruiter',
          '2 đơn ứng tuyển đã cá nhân hóa',
        ],
        successMetric: 'Số đơn chất lượng và số phản hồi nhận được mỗi tuần',
        currentWeek: 4,
        totalWeeks: 12,
        weeklyPlans: [
          { weekNumber: 1, phaseName: 'Foundation', focus: 'Làm rõ câu chuyện nghề nghiệp và xác định danh sách công ty mục tiêu', milestone: 'Khung portfolio hoàn chỉnh', completed: true },
          { weekNumber: 2, phaseName: 'Foundation', focus: 'Xây CV mới và outline case study số 1', milestone: 'CV bản nháp đầu tiên', completed: true },
          { weekNumber: 3, phaseName: 'Foundation', focus: 'Hoàn thiện case study số 1 và chuẩn hóa visual', milestone: 'Case study số 1 online', completed: true },
          { weekNumber: 4, phaseName: 'Build / Acceleration', focus: 'Tăng outreach và mở case study số 2', milestone: 'Bắt đầu có phản hồi đầu tiên', completed: false },
          { weekNumber: 5, phaseName: 'Build / Acceleration', focus: 'Nộp đơn có chọn lọc và lặp lại review hồ sơ', milestone: '', completed: false },
          { weekNumber: 6, phaseName: 'Build / Acceleration', focus: 'Tinh chỉnh portfolio dựa trên feedback', milestone: '', completed: false },
          { weekNumber: 7, phaseName: 'Build / Acceleration', focus: 'Tăng tốc số lượng đơn chất lượng', milestone: '', completed: false },
          { weekNumber: 8, phaseName: 'Build / Acceleration', focus: 'Kiểm tra chất lượng pipeline ứng tuyển', milestone: '10 đơn chất lượng', completed: false },
          { weekNumber: 9, phaseName: 'Finish / Execution', focus: 'Dồn lực cho các cơ hội phản hồi tốt', milestone: '', completed: false },
          { weekNumber: 10, phaseName: 'Finish / Execution', focus: 'Chuẩn bị các buổi phỏng vấn hoặc bài test', milestone: '', completed: false },
          { weekNumber: 11, phaseName: 'Finish / Execution', focus: 'Chốt các cơ hội ưu tiên', milestone: '', completed: false },
          { weekNumber: 12, phaseName: 'Finish / Execution', focus: 'Review toàn bộ chu kỳ và quyết định bước tiếp theo', milestone: 'Đóng chu kỳ 12 tuần', completed: false },
        ],
        dailyCheckIns: [
          {
            date: getRelativeISOString(-1),
            didWorkToday: true,
            whichLeadIndicatorWorkedOn: 'Hoàn thiện case study portfolio',
            amountDone: '90 phút',
            outputCreated: 'Hoàn thiện phần challenge và solution của case study số 2',
            obstacleOrIssue: 'Mất khá nhiều thời gian chọn ảnh minh họa',
            dailySelfRating: 4,
            optionalNote: 'Ngày mai nên khóa layout trước rồi mới polish.',
          },
          {
            date: getRelativeISOString(-2),
            didWorkToday: true,
            whichLeadIndicatorWorkedOn: 'Networking hoặc outreach',
            amountDone: '3 tin nhắn',
            outputCreated: 'Gửi outreach tới 2 recruiter và 1 designer lead',
            obstacleOrIssue: '',
            dailySelfRating: 4,
            optionalNote: '',
          },
        ],
        weeklyReviews: [
          {
            weekNumber: 1,
            leadCompletionPercent: 75,
            lagProgressValue: '2/20 đơn',
            biggestOutputThisWeek: 'Hoàn thành outline portfolio và CV mới',
            mainObstacle: 'Khó gom ý tưởng thành một câu chuyện rõ',
            nextWeekPriority: 'Chốt case study số 1',
            workloadDecision: 'keep same',
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
            lagProgressValue: '4/20 đơn',
            biggestOutputThisWeek: 'CV và portfolio có hình hài rõ ràng hơn',
            mainObstacle: 'Dễ sa vào chỉnh giao diện quá sớm',
            nextWeekPriority: 'Đưa case study số 1 lên online',
            workloadDecision: 'keep same',
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
            lagProgressValue: '7/20 đơn',
            biggestOutputThisWeek: 'Case study số 1 đã public và có phản hồi tốt',
            mainObstacle: 'Chưa duy trì outreach đều như dự kiến',
            nextWeekPriority: 'Giữ nhịp outreach 3 lần và mở case study số 2',
            workloadDecision: 'increase slightly',
            reviewCompleted: true,
            progressScore: 8,
            disciplineScore: 8,
            focusScore: 8,
            improvementScore: 8,
            outputQualityScore: 9,
          },
        ],
        scoreboard: [
          { weekNumber: 1, leadCompletionPercent: 75, mainMetricProgress: '2/20 đơn', outputDone: 'Outline portfolio + CV', reviewDone: true, weeklyScore: 78 },
          { weekNumber: 2, leadCompletionPercent: 80, mainMetricProgress: '4/20 đơn', outputDone: 'CV + cấu trúc portfolio', reviewDone: true, weeklyScore: 80 },
          { weekNumber: 3, leadCompletionPercent: 85, mainMetricProgress: '7/20 đơn', outputDone: 'Case study số 1', reviewDone: true, weeklyScore: 86 },
          { weekNumber: 4, leadCompletionPercent: 0, mainMetricProgress: '', outputDone: '', reviewDone: false, weeklyScore: 0 },
          { weekNumber: 5, leadCompletionPercent: 0, mainMetricProgress: '', outputDone: '', reviewDone: false, weeklyScore: 0 },
          { weekNumber: 6, leadCompletionPercent: 0, mainMetricProgress: '', outputDone: '', reviewDone: false, weeklyScore: 0 },
          { weekNumber: 7, leadCompletionPercent: 0, mainMetricProgress: '', outputDone: '', reviewDone: false, weeklyScore: 0 },
          { weekNumber: 8, leadCompletionPercent: 0, mainMetricProgress: '', outputDone: '', reviewDone: false, weeklyScore: 0 },
          { weekNumber: 9, leadCompletionPercent: 0, mainMetricProgress: '', outputDone: '', reviewDone: false, weeklyScore: 0 },
          { weekNumber: 10, leadCompletionPercent: 0, mainMetricProgress: '', outputDone: '', reviewDone: false, weeklyScore: 0 },
          { weekNumber: 11, leadCompletionPercent: 0, mainMetricProgress: '', outputDone: '', reviewDone: false, weeklyScore: 0 },
          { weekNumber: 12, leadCompletionPercent: 0, mainMetricProgress: '', outputDone: '', reviewDone: false, weeklyScore: 0 },
        ],
      },
    },
    {
      id: careerGoalId,
      category: 'Personal Growth',
      title: 'Duy trì thói quen đọc và ghi chú 20 phút mỗi ngày',
      description: 'Một mục tiêu nền để tăng chất lượng đầu vào tri thức và giữ nhịp học đều.',
      deadline: getRelativeDateValue(45),
      createdAt: getRelativeISOString(-12),
      tasks: [
        { id: 'task_demo_reading_1', title: 'Chọn 2 cuốn sách ưu tiên trong tháng này', completed: true },
        { id: 'task_demo_reading_2', title: 'Tạo template ghi chú ngắn sau mỗi buổi đọc', completed: true },
        { id: 'task_demo_reading_3', title: 'Giữ streak đọc ít nhất 10 ngày', completed: false },
      ],
    },
    {
      id: healthGoalId,
      category: 'Health',
      title: 'Đi bộ 8.000 bước mỗi ngày trong 30 ngày',
      description: 'Một mục tiêu sức khỏe đơn giản để kéo lại năng lượng nền mỗi ngày.',
      deadline: getRelativeDateValue(18),
      createdAt: getRelativeISOString(-30),
      tasks: [
        { id: 'task_demo_health_1', title: 'Chuẩn bị khung giờ đi bộ cố định', completed: true },
        { id: 'task_demo_health_2', title: 'Đi bộ đủ bước trong tuần đầu tiên', completed: true },
        { id: 'task_demo_health_3', title: 'Giữ nhịp 2 tuần liên tiếp', completed: true },
      ],
    },
  ];

  const visionBoards: VisionBoard[] = [
    {
      id: boardId,
      name: 'Vision 2026',
      year: '2026',
      createdAt: getRelativeISOString(-10),
      items: [
        { id: 'board_item_1', type: 'image', content: 'https://picsum.photos/seed/demo-office/480/360', x: 10, y: 12, width: 220, height: 180 },
        { id: 'board_item_2', type: 'image', content: 'https://picsum.photos/seed/demo-travel/480/360', x: 58, y: 14, width: 210, height: 170 },
        { id: 'board_item_3', type: 'quote', content: 'Kỷ luật là cây cầu nối tầm nhìn với kết quả.', x: 14, y: 58, width: 280, height: 120 },
        { id: 'board_item_4', type: 'icon', content: 'Sparkles', x: 74, y: 62, width: 96, height: 96 },
      ],
    },
  ];

  const reflections: Reflection[] = [
    {
      id: 'reflection_demo_1',
      date: getRelativeDateValue(-1),
      title: 'Một ngày giữ được nhịp rất rõ',
      content:
        'Hôm nay mình làm ít hơn dự kiến nhưng rất đúng trọng tâm. Điều đáng giá nhất là không bị trôi vào những việc nhìn bận rộn nhưng không tạo ra đầu ra thật.',
      mood: 'happy',
    },
    {
      id: 'reflection_demo_2',
      date: getRelativeDateValue(-4),
      title: 'Nhìn lại sự thiếu nhất quán',
      content:
        'Mình nhận ra cứ khi lịch bị xáo trộn thì các thói quen tốt rơi trước. Tuần tới cần khóa trước 2 khung giờ quan trọng nhất thay vì cố nhồi quá nhiều việc.',
      mood: 'neutral',
    },
  ];

  const achievements: Achievement[] = [
    {
      id: 'achievement_demo_1',
      title: 'First Step',
      description: 'Tạo mục tiêu đầu tiên của bạn',
      icon: 'Target',
      earnedAt: getRelativeISOString(-30),
    },
    {
      id: 'achievement_demo_2',
      title: 'Visionary',
      description: 'Tạo bảng tầm nhìn đầu tiên của bạn',
      icon: 'Sparkles',
      earnedAt: getRelativeISOString(-10),
    },
    {
      id: 'achievement_demo_3',
      title: 'Reflective Mind',
      description: 'Viết nhật ký phản tư đầu tiên của bạn',
      icon: 'BookOpen',
      earnedAt: getRelativeISOString(-5),
    },
  ];

  return normalizeUserData({
    userId,
    wheelOfLifeHistory,
    currentWheelOfLife,
    goals,
    visionBoards,
    achievements,
    reflections,
    lastMotivationalQuote: MOTIVATIONAL_QUOTES[0],
    onboardingCompleted: true,
    isHydratedFromDemo: true,
  });
}

export function initializeUserData(): UserData {
  const existingData = localStorage.getItem(STORAGE_KEY);
  
  if (existingData) {
    const parsedData = parseStoredUserData(existingData);
    if (parsedData) {
      if (shouldHydrateDemoData(parsedData)) {
        const demoData = createDemoUserData();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(demoData));
        return demoData;
      }

      return parsedData;
    }
  }
  
  const newUserData = createDemoUserData();
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newUserData));
  return normalizeUserData(newUserData);
}

export function getUserData(): UserData {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return initializeUserData();

  const parsedData = parseStoredUserData(data);
  if (!parsedData) return initializeUserData();

  const migratedData = migrateLegacyUserData(parsedData);
  if (migratedData !== parsedData) {
    saveUserData(migratedData);
  }

  return migratedData;
}

export function saveUserData(data: UserData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeUserData(data)));
}

export function updateWheelOfLife(areas: LifeArea[]): void {
  const data = getUserData();
  data.currentWheelOfLife = areas;
  data.wheelOfLifeHistory.push({
    date: new Date().toISOString(),
    areas: [...areas],
  });
  data.onboardingCompleted = true;
  data.isHydratedFromDemo = false;
  saveUserData(data);
}

export function addGoal(goal: Omit<Goal, 'id' | 'createdAt'>): string {
  const data = getUserData();
  const newGoal: Goal = {
    ...goal,
    id: `goal_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  data.goals.push(newGoal);
  saveUserData(data);
  checkAchievements(data);
  return newGoal.id;
}

export function updateGoal(goalId: string, updates: Partial<Goal>): void {
  const data = getUserData();
  const goalIndex = data.goals.findIndex(g => g.id === goalId);
  if (goalIndex !== -1) {
    data.goals[goalIndex] = { ...data.goals[goalIndex], ...updates };
    saveUserData(data);
    checkAchievements(data);
  }
}

export function deleteGoal(goalId: string): void {
  const data = getUserData();
  data.goals = data.goals.filter(g => g.id !== goalId);
  saveUserData(data);
}

export function addVisionBoard(board: Omit<VisionBoard, 'id' | 'createdAt'>): string {
  const data = getUserData();
  const newBoard: VisionBoard = {
    ...board,
    id: `board_${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  data.visionBoards.push(newBoard);
  saveUserData(data);
  checkAchievements(data);
  return newBoard.id;
}

export function updateVisionBoard(boardId: string, updates: Partial<VisionBoard>): void {
  const data = getUserData();
  const boardIndex = data.visionBoards.findIndex(b => b.id === boardId);
  if (boardIndex !== -1) {
    data.visionBoards[boardIndex] = { ...data.visionBoards[boardIndex], ...updates };
    saveUserData(data);
  }
}

export function deleteVisionBoard(boardId: string): void {
  const data = getUserData();
  data.visionBoards = data.visionBoards.filter(b => b.id !== boardId);
  saveUserData(data);
}

export function addReflection(reflection: Omit<Reflection, 'id'>): void {
  const data = getUserData();
  const newReflection: Reflection = {
    ...reflection,
    id: `reflection_${Date.now()}`,
  };
  data.reflections.unshift(newReflection);
  saveUserData(data);
  checkAchievements(data);
}

export function deleteReflection(reflectionId: string): void {
  const data = getUserData();
  data.reflections = data.reflections.filter(r => r.id !== reflectionId);
  saveUserData(data);
}

export function addAchievement(achievement: Omit<Achievement, 'id' | 'earnedAt'>): void {
  const data = getUserData();
  // Check if achievement already exists
  if (data.achievements.some(a => a.title === achievement.title)) {
    return;
  }
  const newAchievement: Achievement = {
    ...achievement,
    id: `achievement_${Date.now()}`,
    earnedAt: new Date().toISOString(),
  };
  data.achievements.push(newAchievement);
  saveUserData(data);
}

export function checkAchievements(data: UserData): void {
  // First Goal Achievement
  if (data.goals.length === 1) {
    addAchievement({
      title: 'First Step',
      description: 'Tạo mục tiêu đầu tiên của bạn',
      icon: 'Target',
    });
  }
  
  // Five Goals Achievement
  if (data.goals.length === 5) {
    addAchievement({
      title: 'Goal Setter',
      description: 'Tạo 5 mục tiêu',
      icon: 'Trophy',
    });
  }
  
  // First Completed Goal
  const completedGoals = data.goals.filter((goal) => calculateGoalProgress(goal) === 100);
  if (completedGoals.length === 1) {
    addAchievement({
      title: 'Achiever',
      description: 'Hoàn thành mục tiêu đầu tiên của bạn',
      icon: 'Award',
    });
  }
  
  // Five Completed Goals
  if (completedGoals.length === 5) {
    addAchievement({
      title: 'Master Achiever',
      description: 'Hoàn thành 5 mục tiêu',
      icon: 'Crown',
    });
  }
  
  // First Vision Board
  if (data.visionBoards.length === 1) {
    addAchievement({
      title: 'Visionary',
      description: 'Tạo bảng tầm nhìn đầu tiên của bạn',
      icon: 'Sparkles',
    });
  }
  
  // First Reflection
  if (data.reflections.length === 1) {
    addAchievement({
      title: 'Reflective Mind',
      description: 'Viết nhật ký phản tư đầu tiên của bạn',
      icon: 'BookOpen',
    });
  }
  
  // 30 Day Streak (check reflections)
  const todayKey = formatDateInputValue(new Date());
  const distinctReflectionDates = Array.from(
    new Set(
      data.reflections
        .map((reflection) => getCalendarDateKey(reflection.date))
        .filter((dateKey): dateKey is string => Boolean(dateKey) && dateKey <= todayKey)
    )
  ).sort();

  let longestStreak = 0;
  let currentStreak = 0;
  let previousDayIndex: number | null = null;

  distinctReflectionDates.forEach((dateKey) => {
    const currentDate = parseCalendarDate(dateKey);
    if (!currentDate) return;

    const currentDayIndex = getCalendarDayIndex(currentDate);
    currentStreak =
      previousDayIndex !== null && currentDayIndex === previousDayIndex + 1
        ? currentStreak + 1
        : 1;
    previousDayIndex = currentDayIndex;
    longestStreak = Math.max(longestStreak, currentStreak);
  });

  if (longestStreak >= 30) {
    addAchievement({
      title: 'Dedicated',
      description: '30 ngày duy trì viết nhật ký phản tư',
      icon: 'Flame',
    });
  }
}

export function getRandomMotivationalQuote(): string {
  return MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
}

export function calculateGoalProgress(goal: Goal): number {
  if (goal.tasks.length === 0) return 0;
  const completed = goal.tasks.filter(t => t.completed).length;
  return Math.round((completed / goal.tasks.length) * 100);
}
