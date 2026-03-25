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

export function initializeUserData(): UserData {
  const existingData = localStorage.getItem(STORAGE_KEY);
  
  if (existingData) {
    const parsedData = parseStoredUserData(existingData);
    if (parsedData) {
      return parsedData;
    }
  }
  
  const newUserData: UserData = {
    userId: generateUserId(),
    wheelOfLifeHistory: [],
    currentWheelOfLife: LIFE_AREAS.map(area => ({ ...area, score: 5 })),
    goals: [],
    visionBoards: [],
    achievements: [],
    reflections: [],
    onboardingCompleted: false,
  };
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newUserData));
  return normalizeUserData(newUserData);
}

export function getUserData(): UserData {
  const data = localStorage.getItem(STORAGE_KEY);
  if (!data) return initializeUserData();

  const parsedData = parseStoredUserData(data);
  return parsedData ?? initializeUserData();
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
  const completedGoals = data.goals.filter(g => 
    g.tasks.length > 0 && g.tasks.every(t => t.completed)
  );
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
