import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  Check,
  Crown,
  Flame,
  LockKeyhole,
  type LucideIcon,
  Sparkles,
  Target,
  Trophy,
  Unlock,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { EmptyState } from "@/app/components/states/EmptyState";
import { TabErrorBoundary } from "@/app/components/TabErrorBoundary";
import { celebrateLarge } from "@/lib/effects/celebrate";
import { hasNewCelebrationIds } from "@/lib/effects/celebrationTriggers";
import { emptyNarratives } from "../components/empty-states/narratives";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { useSyncedUserData } from "../hooks/useSyncedUserData";
import { Stoic3DCoin } from "./Achievements/components/Stoic3DCoin";

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
  return (
    <TabErrorBoundary fallbackTitle="Trang Thành tựu gặp lỗi">
      <AchievementsContent />
    </TabErrorBoundary>
  );
}

function AchievementsContent() {
  const navigate = useNavigate();
  const { userData } = useSyncedUserData();
  const seenAchievementIdsRef = useRef<Set<string> | null>(null);
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementCard | null>(null);

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
    <div className="min-h-screen bg-app-bg-subtle">
      <main className="achievements-stagger mx-auto max-w-[1100px] px-9 py-[30px] pb-16">

        {/* ── Hero ── */}
        <div className="mb-6">
          <div className="mb-3 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-app-accent">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-app-accent" />
            Thành tựu
          </div>
          <h1
            className="mb-[11px] font-serif text-[clamp(28px,3.2vw,38px)] font-extrabold leading-[1.02] -tracking-[0.02em] text-app-ink"
          >
            Cột mốc của bạn
          </h1>
          <p className="max-w-[54ch] text-[14.5px] leading-[1.55] text-app-ink-soft">
            Nơi ghi lại những dấu hiệu nhỏ cho thấy bạn đã bắt đầu, duy trì và đi xa hơn hôm qua.
          </p>
        </div>

        {/* ── KPI Cards ── */}
        <section aria-label="Tổng quan thành tựu" className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-card border border-app-line bg-app-surface px-6 py-[22px]">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-app-ink-muted">
              Tổng thành tựu
            </p>
            <div className="flex items-end gap-2.5">
              <span className="font-serif text-[38px] font-extrabold leading-none text-app-ink tabular-nums">
                {totalAchievementCount}
              </span>
              <span className="mb-0.5 flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-app-accent-subtle text-app-accent">
                <Award className="h-[18px] w-[18px]" strokeWidth={2} />
              </span>
            </div>
            <p className="mt-2.5 text-xs font-medium text-app-ink-muted">huy hiệu</p>
          </div>

          <div className="rounded-card border border-app-line bg-app-surface px-6 py-[22px]">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-app-ink-muted">
              Đã mở khóa
            </p>
            <div className="flex items-end gap-2.5">
              <span className="font-serif text-[38px] font-extrabold leading-none text-app-ink tabular-nums">
                {unlockedCount}
              </span>
              <span className="mb-0.5 flex h-[34px] w-[34px] items-center justify-center rounded-[10px] bg-app-accent-subtle text-app-accent">
                <Unlock className="h-[18px] w-[18px]" strokeWidth={2} />
              </span>
            </div>
            <p className="mt-2.5 text-xs font-medium text-app-ink-muted">cột mốc</p>
          </div>

          <div className="rounded-card border border-app-line bg-app-surface px-6 py-[22px]">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.12em] text-app-ink-muted">
              Hoàn thành
            </p>
            <span className="font-serif text-[38px] font-extrabold leading-none text-app-accent tabular-nums">
              {completionRate}%
            </span>
            <div className="mt-[13px] h-[7px] overflow-hidden rounded-pill bg-app-bg-subtle">
              <div
                className="achievements-bar h-full rounded-pill bg-app-accent"
                style={{ width: `${completionRate}%` }}
              />
            </div>
            <p className="mt-2.5 text-xs font-medium text-app-ink-muted">bộ sưu tập</p>
          </div>
        </section>

        {/* ── Empty State ── */}
        {unlockedCount === 0 && (
          <EmptyState
            className="mb-6"
            as="section"
            icon={<Award className="h-7 w-7" />}
            title={emptyNarratives.noAchievements.title}
            description={emptyNarratives.noAchievements.body}
            actions={
              <>
                <Button type="button" onClick={() => navigate("/goals")}>
                  <Target className="h-4 w-4" />
                  Tạo mục tiêu
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate("/journal")}>
                  <BookOpen className="h-4 w-4" />
                  Viết nhật ký
                </Button>
              </>
            }
          />
        )}

        {/* ── Badge Grid ── */}
        <section aria-label="Danh sách thành tựu">
          <div className="mb-4">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-app-ink-muted">
              Bộ huy hiệu
            </p>
            <h2 className="font-serif text-[21px] font-bold -tracking-[0.01em] text-app-ink">
              Những cột mốc đang mở dần
            </h2>
          </div>

          <div className="achievements-grid grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {achievementCards.map((achievement) => {
              const Icon = ICON_MAP[achievement.icon] ?? Trophy;
              const isUnlocked = achievement.unlocked;

              return (
                <article
                  key={achievement.key}
                  onClick={() => isUnlocked && setSelectedAchievement(achievement)}
                  className={`achievements-badge relative rounded-card px-[22px] pb-5 pt-[22px] ${
                    isUnlocked
                      ? "unlocked cursor-pointer border border-app-line bg-app-surface"
                      : "locked cursor-default border border-dashed"
                  }`}
                >
                  {/* Seal stamp for unlocked */}
                  {isUnlocked && (
                    <span
                      className="achievements-seal absolute right-3.5 top-3.5 flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 border-white bg-[#C0392B] shadow-[0_4px_10px_-3px_rgba(192,57,43,0.7)] text-white"
                      style={{ transform: "rotate(-8deg)" }}
                    >
                      <Check className="h-[13px] w-[13px]" strokeWidth={3} />
                    </span>
                  )}

                  {/* Icon chip */}
                  <span
                    className={`mb-4 flex h-[50px] w-[50px] items-center justify-center rounded-[14px] ${
                      isUnlocked
                        ? "bg-app-accent-subtle text-app-accent"
                        : "bg-app-bg-subtle text-app-ink-muted"
                    }`}
                  >
                    <Icon className="h-[25px] w-[25px]" strokeWidth={1.9} />
                  </span>

                  {/* Title */}
                  <h3
                    className={`mb-1.5 text-[15px] font-bold leading-[1.3] ${
                      isUnlocked ? "text-app-ink" : "text-app-ink-muted"
                    }`}
                  >
                    {achievement.title}
                  </h3>

                  {/* Description */}
                  <p
                    className={`mb-4 text-[12.5px] leading-[1.5] ${
                      isUnlocked ? "text-app-ink-soft" : "text-app-ink-muted"
                    }`}
                  >
                    {achievement.description}
                  </p>

                  {/* Footer: date or locked label */}
                  {isUnlocked && achievement.earnedAt ? (
                    <span className="inline-flex items-center gap-[7px] font-mono text-xs font-semibold text-app-accent">
                      <Calendar className="h-[13px] w-[13px]" strokeWidth={2} />
                      {formatAchievementDate(achievement.earnedAt)}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-[7px] text-[10.5px] font-bold uppercase tracking-[0.1em] text-app-ink-muted">
                      <LockKeyhole className="h-3 w-3" strokeWidth={2.2} />
                      Đang khóa
                    </span>
                  )}
                </article>
              );
            })}
          </div>
        </section>

        {/* ── CTA Buttons ── */}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => navigate("/goals")}
            className="inline-flex items-center gap-2 rounded-pill bg-app-accent px-[22px] py-3 text-[13.5px] font-bold text-white transition-all duration-200 hover:bg-app-accent-hover active:scale-[0.98] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-app-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg-subtle"
          >
            Tiếp tục mục tiêu
            <ArrowRight className="h-[15px] w-[15px]" strokeWidth={2.2} />
          </button>
          <button
            type="button"
            onClick={() => navigate("/gallery")}
            className="inline-flex items-center gap-2 rounded-pill border border-app-line bg-app-surface px-5 py-3 text-[13.5px] font-semibold text-app-ink transition-all duration-200 hover:bg-app-bg-subtle active:scale-[0.98] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-app-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg-subtle"
          >
            <Sparkles className="h-[15px] w-[15px]" strokeWidth={2.2} />
            Mở thư viện vision board
          </button>
        </div>

      </main>

      {selectedAchievement && (
        <Stoic3DCoin achievement={selectedAchievement} onClose={() => setSelectedAchievement(null)} />
      )}
    </div>
  );
}

function AchievementsSkeleton() {
  return (
    <div className="min-h-screen bg-app-bg-subtle">
      <div
        className="mx-auto max-w-[1100px] px-9 py-[30px] pb-16"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <span className="sr-only">Đang tải thành tựu...</span>

        {/* Hero skeleton */}
        <div className="mb-6 space-y-3">
          <Skeleton className="h-2.5 w-24 rounded bg-app-line/60" />
          <Skeleton className="h-9 w-2/3 max-w-md rounded bg-app-line/60" />
          <Skeleton className="h-4 w-3/4 max-w-lg rounded bg-app-line/60" />
        </div>

        {/* KPI skeleton */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-[120px] rounded-card bg-app-line/30" />
          ))}
        </div>

        {/* Badge grid skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5, 6].map((index) => (
            <Skeleton key={index} className="h-[200px] rounded-card bg-app-line/30" />
          ))}
        </div>
      </div>
    </div>
  );
}
