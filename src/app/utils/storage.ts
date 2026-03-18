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

export const MOTIVATIONAL_QUOTES = [
  "The future belongs to those who believe in the beauty of their dreams.",
  "Success is not final, failure is not fatal: it is the courage to continue that counts.",
  "Believe you can and you're halfway there.",
  "The only way to do great work is to love what you do.",
  "Your limitation—it's only your imagination.",
  "Push yourself, because no one else is going to do it for you.",
  "Great things never come from comfort zones.",
  "Dream it. Wish it. Do it.",
  "Success doesn't just find you. You have to go out and get it.",
  "The harder you work for something, the greater you'll feel when you achieve it.",
];

function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function initializeUserData(): UserData {
  const existingData = localStorage.getItem(STORAGE_KEY);
  
  if (existingData) {
    return JSON.parse(existingData);
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
  return newUserData;
}

export function getUserData(): UserData {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : initializeUserData();
}

export function saveUserData(data: UserData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
      description: 'Created your first goal',
      icon: 'Target',
    });
  }
  
  // Five Goals Achievement
  if (data.goals.length === 5) {
    addAchievement({
      title: 'Goal Setter',
      description: 'Created 5 goals',
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
      description: 'Completed your first goal',
      icon: 'Award',
    });
  }
  
  // Five Completed Goals
  if (completedGoals.length === 5) {
    addAchievement({
      title: 'Master Achiever',
      description: 'Completed 5 goals',
      icon: 'Crown',
    });
  }
  
  // First Vision Board
  if (data.visionBoards.length === 1) {
    addAchievement({
      title: 'Visionary',
      description: 'Created your first vision board',
      icon: 'Sparkles',
    });
  }
  
  // First Reflection
  if (data.reflections.length === 1) {
    addAchievement({
      title: 'Reflective Mind',
      description: 'Wrote your first reflection',
      icon: 'BookOpen',
    });
  }
  
  // 30 Day Streak (check reflections)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentReflections = data.reflections.filter(
    r => new Date(r.date) > thirtyDaysAgo
  );
  if (recentReflections.length >= 30) {
    addAchievement({
      title: 'Dedicated',
      description: '30 days of reflections',
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
