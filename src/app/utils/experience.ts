import confetti from "canvas-confetti";

import type { Achievement } from "./storage";

const ACHIEVEMENT_LABELS: Record<string, string> = {
  "First Step": "Bước Đầu Tiên",
  "Goal Setter": "Người Đặt Mục Tiêu",
  Achiever: "Người Hoàn Thành",
  "Master Achiever": "Bậc Thầy Hoàn Thành",
  Visionary: "Người Tầm Nhìn",
  "Reflective Mind": "Tâm Trí Suy Ngẫm",
  Dedicated: "Bền Bỉ",
};

const CELEBRATION_COLORS = ["#6d28d9", "#c026d3", "#3b82f6", "#f59e0b", "#10b981"];

function canAnimate() {
  return (
    typeof window !== "undefined" &&
    typeof document !== "undefined" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function burst(options: Parameters<typeof confetti>[0]) {
  if (!canAnimate()) return;
  confetti({
    disableForReducedMotion: true,
    colors: CELEBRATION_COLORS,
    ...options,
  });
}

export function celebrateSpark(origin = { x: 0.84, y: 0.14 }) {
  burst({
    particleCount: 45,
    spread: 60,
    startVelocity: 28,
    scalar: 0.82,
    origin,
  });
}

export function celebrateSpotlight(origin = { x: 0.84, y: 0.14 }) {
  burst({
    particleCount: 90,
    spread: 84,
    startVelocity: 38,
    scalar: 0.94,
    origin,
  });
  burst({
    particleCount: 26,
    angle: 60,
    spread: 58,
    startVelocity: 28,
    scalar: 0.78,
    origin,
  });
  burst({
    particleCount: 26,
    angle: 120,
    spread: 58,
    startVelocity: 28,
    scalar: 0.78,
    origin,
  });
}

export function celebrateAchievementUnlock(origin = { x: 0.5, y: 0.18 }) {
  burst({
    particleCount: 120,
    spread: 96,
    startVelocity: 42,
    scalar: 1.02,
    origin,
  });
  burst({
    particleCount: 72,
    angle: 70,
    spread: 62,
    startVelocity: 36,
    decay: 0.92,
    scalar: 0.92,
    origin,
  });
  burst({
    particleCount: 72,
    angle: 110,
    spread: 62,
    startVelocity: 36,
    decay: 0.92,
    scalar: 0.92,
    origin,
  });
}

export function getUnlockedAchievements(before: Achievement[], after: Achievement[]) {
  const previousTitles = new Set(before.map((achievement) => achievement.title));
  return after.filter((achievement) => !previousTitles.has(achievement.title));
}

export function getAchievementDisplayTitle(title: string) {
  return ACHIEVEMENT_LABELS[title] ?? title;
}

export function getAchievementCelebrationCopy(unlocked: Achievement[]) {
  if (unlocked.length === 0) {
    return null;
  }

  const titles = unlocked.map((achievement) => getAchievementDisplayTitle(achievement.title));

  if (titles.length === 1) {
    return {
      title: `Mở khóa thành tựu: ${titles[0]}`,
      description: "Khoảnh khắc nhỏ này vừa được ghi lại như một cột mốc thật sự.",
    };
  }

  return {
    title: `Mở khóa ${titles.length} thành tựu mới`,
    description: titles.join(" • "),
  };
}
