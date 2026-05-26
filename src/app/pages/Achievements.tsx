import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router";
import {
  ArrowRight,
  Award,
  BookOpen,
  Crown,
  Flame,
  LockKeyhole,
  Sparkles,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react";

import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { emptyNarratives } from "../components/empty-states/narratives";
import { useSyncedUserData } from "../hooks/useSyncedUserData";
import { celebrateLarge } from "@/lib/effects/celebrate";
import { hasNewCelebrationIds } from "@/lib/effects/celebrationTriggers";

const ICON_MAP: Record<string, LucideIcon> = {
  Target,
  Trophy,
  Award,
  Crown,
  Sparkles,
  BookOpen,
  Flame,
};

const ACHIEVEMENT_COPY: Record<string, { title: string; description: string; icon: keyof typeof ICON_MAP }> = {
  "First Step": {
    title: "Bước đầu tiên",
    description: "Tạo mục tiêu đầu tiên của bạn.",
    icon: "Target",
  },
  "Goal Setter": {
    title: "Người đặt mục tiêu",
    description: "Tạo 5 mục tiêu trong hành trình của bạn.",
    icon: "Trophy",
  },
  Achiever: {
    title: "Người hoàn thành",
    description: "Hoàn thành mục tiêu đầu tiên của bạn.",
    icon: "Award",
  },
  "Master Achiever": {
    title: "Bậc thầy hoàn thành",
    description: "Hoàn thành 5 mục tiêu và giữ vững đà phát triển.",
    icon: "Crown",
  },
  Visionary: {
    title: "Người có tầm nhìn",
    description: "Tạo vision board đầu tiên của bạn.",
    icon: "Sparkles",
  },
  "Reflective Mind": {
    title: "Người hay nhìn lại",
    description: "Viết bài nhật ký nhìn lại đầu tiên.",
    icon: "BookOpen",
  },
  Dedicated: {
    title: "Bền Bỉ",
    description: "Duy trì 30 ngày viết nhật ký nhìn lại.",
    icon: "Flame",
  },
};

const ACHIEVEMENT_ORDER = Object.keys(ACHIEVEMENT_COPY);

type AchievementCard = {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: keyof typeof ICON_MAP;
  unlocked: boolean;
  earnedAt?: string;
};

function getIconKey(icon: string): keyof typeof ICON_MAP {
  return icon in ICON_MAP ? (icon as keyof typeof ICON_MAP) : "Trophy";
}

function formatAchievementDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Không rõ ngày";
  return date.toLocaleDateString("vi-VN");
}

export function Achievements() {
  const navigate = useNavigate();
  const { userData } = useSyncedUserData();
  const seenAchievementIdsRef = useRef<Set<string> | null>(null);

  const sortedAchievements = useMemo(() => {
    if (!userData) return [];
    return [...userData.achievements].sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime());
  }, [userData]);

  const achievementCards = useMemo<AchievementCard[]>(() => {
    const unlockedByTitle = new Map(sortedAchievements.map((achievement) => [achievement.title, achievement]));

    const knownCards = ACHIEVEMENT_ORDER.map((key) => {
      const copy = ACHIEVEMENT_COPY[key];
      const unlocked = unlockedByTitle.get(key);

      return {
        id: unlocked?.id ?? key,
        key,
        title: copy.title,
        description: copy.description,
        icon: copy.icon,
        unlocked: Boolean(unlocked),
        earnedAt: unlocked?.earnedAt,
      };
    });

    const customUnlockedCards = sortedAchievements
      .filter((achievement) => !ACHIEVEMENT_COPY[achievement.title])
      .map((achievement) => ({
        id: achievement.id,
        key: achievement.id,
        title: achievement.title,
        description: achievement.description,
        icon: getIconKey(achievement.icon),
        unlocked: true,
        earnedAt: achievement.earnedAt,
      }));

    return [...knownCards, ...customUnlockedCards];
  }, [sortedAchievements]);

  useEffect(() => {
    if (!userData) return;

    const currentIds = new Set(userData.achievements.map((achievement) => achievement.id));
    if (hasNewCelebrationIds(seenAchievementIdsRef.current, currentIds)) {
      celebrateLarge();
    }
    seenAchievementIdsRef.current = currentIds;
  }, [userData]);

  if (!userData) return <AchievementsSkeleton />;

  const totalAchievementCount = achievementCards.length;
  const unlockedCount = achievementCards.filter((achievement) => achievement.unlocked).length;
  const completionRate = totalAchievementCount > 0 ? Math.round((unlockedCount / totalAchievementCount) * 100) : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-ink-muted">THÀNH TỰU</p>
        <h1 className="mt-3 font-serif text-4xl font-medium leading-tight tracking-tight text-app-ink">
          Cột mốc của bạn
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-app-ink-soft">
          Nơi ghi lại những dấu hiệu nhỏ cho thấy bạn đã bắt đầu, duy trì và đi xa hơn hôm qua.
        </p>
      </header>

      <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="Tổng quan thành tựu">
        {[
          { label: "Tổng thành tựu", value: totalAchievementCount, suffix: "huy hiệu" },
          { label: "Đã mở khóa", value: unlockedCount, suffix: "cột mốc" },
          { label: "Hoàn thành", value: `${completionRate}%`, suffix: "bộ sưu tập" },
        ].map((stat) => (
          <div key={stat.label} className="surface-raised rounded-xl border border-app-line bg-app-surface p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-app-ink-muted">{stat.label}</p>
            <p className="mt-2 text-3xl font-medium leading-none text-app-ink tabular-nums">{stat.value}</p>
            <p className="mt-2 text-xs text-app-ink-muted">{stat.suffix}</p>
          </div>
        ))}
      </section>

      {unlockedCount === 0 ? (
        <section
          className="mt-6 surface-raised rounded-xl border border-app-line bg-app-surface p-6 text-center md:p-8"
          aria-label="Chưa có thành tựu"
        >
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-app-accent-soft text-app-accent">
            <Award className="h-7 w-7" />
          </div>
          <h2 className="mt-4 font-serif text-2xl font-medium text-app-ink">{emptyNarratives.noAchievements.title}</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-app-ink-soft">
            {emptyNarratives.noAchievements.body}
          </p>
          <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
            <Button type="button" onClick={() => navigate("/goals")}>
              <Target className="h-4 w-4" />
              Tạo mục tiêu
            </Button>
            <Button type="button" variant="outline" onClick={() => navigate("/journal")}>
              <BookOpen className="h-4 w-4" />
              Viết nhật ký
            </Button>
          </div>
        </section>
      ) : null}

      <section className="mt-8" aria-label="Danh sách thành tựu">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-ink-muted">BỘ HUY HIỆU</p>
          <h2 className="mt-1 text-base font-semibold text-app-ink">Những cột mốc đang mở dần</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {achievementCards.map((achievement) => {
            const Icon = ICON_MAP[achievement.icon] ?? Trophy;
            const isUnlocked = achievement.unlocked;

            return (
              <article
                key={achievement.key}
                className={`surface-raised rounded-xl border border-app-line bg-app-surface p-5 ${isUnlocked ? "" : "opacity-60"}`}
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                    isUnlocked ? "bg-app-accent-soft text-app-accent" : "bg-app-bg text-app-ink-muted"
                  }`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-sm font-medium leading-5 text-app-ink">{achievement.title}</h3>
                <p className="mt-1 text-xs leading-5 text-app-ink-soft">{achievement.description}</p>
                {isUnlocked && achievement.earnedAt ? (
                  <p className="mt-4 text-xs uppercase tracking-[0.14em] text-app-ink-muted">
                    {formatAchievementDate(achievement.earnedAt)}
                  </p>
                ) : (
                  <p className="mt-4 flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] text-app-ink-muted">
                    <LockKeyhole className="h-3 w-3" />
                    Đang khóa
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button type="button" variant="outline" onClick={() => navigate("/goals")}>
          Tiếp tục mục tiêu
          <ArrowRight className="h-4 w-4" />
        </Button>
        <Button type="button" variant="outline" onClick={() => navigate("/gallery")}>
          Mở thư viện vision board
        </Button>
      </div>
    </div>
  );
}

function AchievementsSkeleton() {
  return (
    <div
      className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 lg:px-8"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Đang tải thành tựu...</span>
      <div className="space-y-3">
        <Skeleton className="h-3 w-24 rounded bg-app-line/60" />
        <Skeleton className="h-9 w-2/3 max-w-md rounded bg-app-line/60" />
        <Skeleton className="h-4 w-3/4 max-w-lg rounded bg-app-line/60" />
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-20 rounded-xl bg-app-line/60" />
        ))}
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <Skeleton key={index} className="h-40 rounded-xl bg-app-line/60" />
        ))}
      </div>
    </div>
  );
}
