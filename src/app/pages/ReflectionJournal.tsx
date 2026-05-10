import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Frown,
  Flag,
  Meh,
  NotebookPen,
  Plus,
  Search,
  Smile,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "../components/ui/card";
import { CountUp } from "../components/ui/count-up";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { useReducedMotion } from "../components/ui/use-reduced-motion";
import { Label } from "../components/ui/label";
import { Reveal } from "../components/ui/reveal";
import { Textarea } from "../components/ui/textarea";
import { useSyncedUserData } from "../hooks/useSyncedUserData";
import {
  celebrateAchievementUnlock,
  celebrateSpotlight,
  getAchievementCelebrationCopy,
  getUnlockedAchievements,
} from "../utils/experience";
import {
  APP_STORAGE_KEYS,
  addReflection,
  deleteReflection,
  formatCalendarDate,
  formatDateInputValue,
  getReviewDayLabel,
  getUserData,
  parseCalendarDate,
  saveUserData,
  sortReflectionsByDateDesc,
} from "../utils/storage";

type MoodValue = "happy" | "neutral" | "sad" | "";

const JOURNAL_PROMPTS = [
  "Điều gì hôm nay khiến bạn tự hào về bản thân?",
  "Một điều bạn muốn làm tốt hơn vào ngày mai là gì?",
  "Bạn đang học được điều gì từ chặng đường hiện tại?",
];

function getMoodConfig(mood?: string) {
  switch (mood) {
    case "happy":
      return {
        icon: <Smile className="h-5 w-5 text-emerald-600" />,
        label: "Vui vẻ",
        badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
      };
    case "neutral":
      return {
        icon: <Meh className="h-5 w-5 text-amber-600" />,
        label: "Bình thường",
        badge: "border-amber-200 bg-amber-50 text-amber-700",
      };
    case "sad":
      return {
        icon: <Frown className="h-5 w-5 text-sky-600" />,
        label: "Suy tư",
        badge: "border-sky-200 bg-sky-50 text-sky-700",
      };
    default:
      return {
        icon: null,
        label: "Chưa chọn",
        badge: "border-slate-200 bg-slate-50 text-slate-600",
      };
  }
}

export function ReflectionJournal() {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const { userData, reloadUserData } = useSyncedUserData();
  const [isAddingReflection, setIsAddingReflection] = useState(false);
  const [newReflection, setNewReflection] = useState({
    title: "",
    content: "",
    mood: "" as MoodValue,
    date: formatDateInputValue(new Date()),
  });
  const [reflectionToDelete, setReflectionToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMood, setFilterMood] = useState<MoodValue | "">("");
  const [filterType, setFilterType] = useState<"all" | "weekly-review" | "freeform">("all");

  const handleAddReflection = () => {
    if (!newReflection.title || !newReflection.content) return;

    const beforeData = userData ?? getUserData();

    addReflection({
      title: newReflection.title,
      content: newReflection.content,
      mood: newReflection.mood,
      date: newReflection.date,
    });

    const afterData = getUserData();
    const unlockedAchievements = getUnlockedAchievements(beforeData.achievements, afterData.achievements);
    const achievementCopy = getAchievementCelebrationCopy(unlockedAchievements);

    celebrateSpotlight({ x: 0.8, y: 0.16 });
    if (achievementCopy) {
      window.setTimeout(() => {
        celebrateAchievementUnlock({ x: 0.5, y: 0.16 });
      }, 140);
    }

    toast.success("Một trang mới đã được giữ lại.", {
      description: achievementCopy?.title
        ? `${achievementCopy.title}. ${achievementCopy.description}`
        : "Suy nghĩ, cảm xúc và bài học hôm nay đã có chỗ đứng trong hành trình của bạn.",
    });

    setNewReflection({
      title: "",
      content: "",
      mood: "",
      date: formatDateInputValue(new Date()),
    });
    setIsAddingReflection(false);
    reloadUserData();
  };

  const handleDeleteReflection = (id: string) => {
    setReflectionToDelete(id);
  };

  const confirmDeleteReflection = () => {
    if (!reflectionToDelete) return;
    const snapshot = getUserData();
    deleteReflection(reflectionToDelete);
    setReflectionToDelete(null);
    reloadUserData();
    toast.success("Trang nhật ký đã được xóa.", {
      action: {
        label: "Hoàn tác",
        onClick: () => {
          saveUserData(snapshot);
          reloadUserData();
          toast.info("Đã khôi phục trang nhật ký.");
        },
      },
    });
  };

  const sortedReflections = useMemo(
    () => (userData ? sortReflectionsByDateDesc(userData.reflections) : []),
    [userData],
  );
  const goalsById = useMemo(() => new Map((userData?.goals ?? []).map((goal) => [goal.id, goal])), [userData]);

  const monthlyCount = useMemo(() => {
    if (!userData) return 0;
    const now = new Date();
    return sortedReflections.filter((reflection) => {
      const date = parseCalendarDate(reflection.date);
      return Boolean(date && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear());
    }).length;
  }, [sortedReflections, userData]);

  const moodCounts = useMemo(() => {
    if (!userData) return { happy: 0, neutral: 0, sad: 0 };

    return sortedReflections.reduce(
      (acc, reflection) => {
        if (reflection.mood === "happy") acc.happy += 1;
        if (reflection.mood === "neutral") acc.neutral += 1;
        if (reflection.mood === "sad") acc.sad += 1;
        return acc;
      },
      { happy: 0, neutral: 0, sad: 0 },
    );
  }, [sortedReflections, userData]);

  const weeklyReviewCount = useMemo(
    () => sortedReflections.filter((reflection) => reflection.entryType === "weekly-review").length,
    [sortedReflections],
  );
  const weeklyReviewReflections = useMemo(
    () => sortedReflections.filter((reflection) => reflection.entryType === "weekly-review"),
    [sortedReflections],
  );
  const latestWeeklyReview = weeklyReviewReflections[0] ?? null;
  const hasReflections = sortedReflections.length > 0;

  const recentMood = getMoodConfig(sortedReflections[0]?.mood);

  const currentStreak = useMemo(() => {
    if (sortedReflections.length === 0) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const writtenDays = new Set(
      sortedReflections
        .map((r) => {
          const d = parseCalendarDate(r.date);
          if (!d) return "";
          d.setHours(0, 0, 0, 0);
          return d.getTime().toString();
        })
        .filter(Boolean),
    );

    let streak = 0;
    const cursor = new Date(today);
    // allow today or yesterday as streak start
    if (!writtenDays.has(cursor.getTime().toString())) {
      cursor.setDate(cursor.getDate() - 1);
    }
    while (writtenDays.has(cursor.getTime().toString())) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }, [sortedReflections]);

  const filteredReflections = useMemo(() => {
    let result = sortedReflections;
    if (filterType !== "all") result = result.filter((r) => r.entryType === filterType);
    if (filterMood) result = result.filter((r) => r.mood === filterMood);
    if (searchQuery.trim()) {
      const lower = searchQuery.toLowerCase();
      result = result.filter((r) => r.title.toLowerCase().includes(lower) || r.content.toLowerCase().includes(lower));
    }
    return result;
  }, [sortedReflections, filterMood, filterType, searchQuery]);

  const openLinkedCycle = (goalId?: string) => {
    if (!goalId) return;
    localStorage.setItem(APP_STORAGE_KEYS.latest12WeekGoalId, goalId);
    localStorage.setItem(APP_STORAGE_KEYS.latest12WeekSystemGoalId, goalId);
    navigate("/12-week-system");
  };

  if (!userData) return null;

  return (
    <div className="stack-section pb-12">
      <AlertDialog
        open={Boolean(reflectionToDelete)}
        onOpenChange={(open) => {
          if (!open) setReflectionToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa nhật ký này?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Bài viết sẽ bị xóa vĩnh viễn khỏi hành trình của bạn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteReflection} className="bg-red-600 hover:bg-red-700">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isAddingReflection} onOpenChange={setIsAddingReflection}>
        <Card className="ops-surface overflow-hidden border border-slate-200/80 bg-white/94 text-slate-950 shadow-sm">
          <CardContent className="relative p-5 sm:p-6">
            <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="stack-stack">
                <div className="inline-flex items-center gap-2 rounded-[var(--r-pill)] border border-slate-200 bg-slate-50/90 px-3 py-1.5 text-xs font-semibold text-slate-600">
                  <NotebookPen className="h-4 w-4" />
                  Nhật ký phản tư
                </div>

                <div className="stack-tight">
                  <h1 className="max-w-3xl text-2xl font-bold tracking-tight sm:text-3xl">
                    Một nơi đủ đẹp và đủ yên để bạn nhìn lại, gọi tên cảm xúc và giữ lại những điều đáng nhớ.
                  </h1>
                  <p className="max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                    Nhật ký ở đây không chỉ để lưu chữ. Nó là nơi gom lại bài học, cảm xúc, những chuyển động nhỏ và cả
                    cách bạn đang lớn lên qua từng ngày.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    className="border-slate-950 bg-slate-950 text-white hover:bg-slate-800 hover:text-white"
                    onClick={() => setIsAddingReflection(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Viết nhật ký mới
                  </Button>
                </div>
              </div>

              <div className="hidden rounded-[var(--r-tile)] border border-slate-200 bg-slate-50/80 p-4 shadow-sm lg:block">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Nhịp viết hiện tại</p>
                {hasReflections ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                    {[
                      { label: "Tổng số bài", value: userData.reflections.length, note: "đã lưu trong hành trình" },
                      { label: "Tháng này", value: monthlyCount, note: "bài viết trong tháng hiện tại" },
                      { label: "Tâm trạng gần nhất", value: recentMood.label, note: "tín hiệu cảm xúc mới nhất" },
                    ].map((item) => (
                      <div key={item.label} className="rounded-[var(--r-tile)] border border-slate-200 bg-white px-4 py-4">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                        <p className="mt-2 text-2xl font-bold text-slate-950">
                          {typeof item.value === "number" ? <CountUp value={item.value} /> : item.value}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">{item.note}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-[var(--r-tile)] border border-slate-200 bg-white px-5 py-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[var(--r-tile)] bg-slate-100 text-slate-700">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <p className="mt-4 text-xl font-bold text-slate-950">Chưa có nhật ký nào</p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      Dữ liệu thật sẽ xuất hiện sau bài viết đầu tiên hoặc sau review tuần trong chu kỳ 12 tuần.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Viết nhật ký mới</DialogTitle>
            <DialogDescription>
              Ghi lại bài học, cảm xúc, bước tiến hoặc bất kỳ điều gì bạn không muốn để trôi qua.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 grid gap-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="stack-tight">
                <Label>Ngày</Label>
                <Input
                  type="date"
                  value={newReflection.date}
                  onChange={(event) => setNewReflection({ ...newReflection, date: event.target.value })}
                />
              </div>

              <div className="stack-tight">
                <Label>Tiêu đề</Label>
                <Input
                  placeholder="Ví dụ: Một ngày tôi lấy lại được nhịp"
                  value={newReflection.title}
                  onChange={(event) => setNewReflection({ ...newReflection, title: event.target.value })}
                />
              </div>
            </div>

            <div className="stack-tight">
              <Label>Hôm nay bạn đang cảm thấy thế nào?</Label>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  {
                    value: "happy" as MoodValue,
                    label: "Vui vẻ",
                    icon: Smile,
                    activeClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
                  },
                  {
                    value: "neutral" as MoodValue,
                    label: "Bình thường",
                    icon: Meh,
                    activeClass: "border-amber-200 bg-amber-50 text-amber-700",
                  },
                  {
                    value: "sad" as MoodValue,
                    label: "Suy tư",
                    icon: Frown,
                    activeClass: "border-sky-200 bg-sky-50 text-sky-700",
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = newReflection.mood === item.value;

                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setNewReflection({ ...newReflection, mood: item.value })}
                      className={`rounded-[var(--r-card)] border px-4 py-4 text-left transition-colors transition-transform duration-150 ${
                        active ? item.activeClass : "border-white/70 bg-white/72 text-slate-500 hover:border-slate-200"
                      }`}
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-[var(--r-tile)] bg-white/70">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="mt-[var(--space-inline)] text-sm font-semibold">{item.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="stack-tight">
              <div className="flex items-center justify-between">
                <Label>Nội dung</Label>
                <span
                  className={`text-xs font-medium transition-colors ${newReflection.content.length > 1800 ? "text-rose-500" : "text-slate-400"}`}
                >
                  {newReflection.content.length} ký tự
                </span>
              </div>
              <Textarea
                placeholder="Viết về trải nghiệm, điều bạn học được, khoảnh khắc đáng nhớ hoặc điều bạn muốn nhắc mình sau này..."
                value={newReflection.content}
                onChange={(event) => setNewReflection({ ...newReflection, content: event.target.value })}
                onKeyDown={(event) => {
                  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                    event.preventDefault();
                    handleAddReflection();
                  }
                }}
                rows={8}
                className="min-h-[220px]"
              />
              <p className="text-xs text-slate-400">
                Nhấn{" "}
                <kbd className="rounded-[var(--r-control)] border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[0.7rem] text-slate-600">
                  Ctrl+Enter
                </kbd>{" "}
                để lưu nhanh
              </p>
            </div>

            <div className="rounded-[var(--r-card)] border border-white/70 bg-white/72 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Gợi ý bắt đầu</p>
              <div className="mt-[var(--space-inline)] flex flex-wrap gap-2">
                {JOURNAL_PROMPTS.map((prompt) => (
                  <Button
                    key={prompt}
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setNewReflection((prev) => ({
                        ...prev,
                        content: prev.content ? `${prev.content}\n\n${prompt}` : prompt,
                      }))
                    }
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleAddReflection}
              disabled={!newReflection.title || !newReflection.content}
            >
              <span>Lưu nhật ký</span>
              <kbd className="ml-auto rounded-[var(--r-control)] border border-white/30 bg-white/10 px-1.5 py-0.5 font-mono text-[0.68rem] opacity-70">
                Ctrl+↵
              </kbd>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {hasReflections && (
        <Reveal>
          <div className="stagger-hover-grid grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                title: "Tổng số nhật ký",
                value: userData.reflections.length,
                note: "đã lưu lại",
                icon: BookOpen,
                color: "from-violet-500/18 to-fuchsia-500/10 text-violet-700",
              },
              {
                title: "Tháng này",
                value: monthlyCount,
                note: "bài viết mới",
                icon: Calendar,
                color: "from-sky-500/18 to-cyan-500/10 text-sky-700",
              },
              {
                title: "Bài viết vui vẻ",
                value: moodCounts.happy,
                note: "ghi nhận tích cực",
                icon: Smile,
                color: "from-emerald-500/18 to-teal-500/10 text-emerald-700",
              },
              {
                title: "Review tuần",
                value: weeklyReviewCount,
                note: "đã được nối vào chu kỳ 12 tuần",
                icon: Sparkles,
                color: "from-amber-500/18 to-orange-500/10 text-amber-700",
              },
            ].map((item, index) => {
              const Icon = item.icon;

              return (
                <motion.div
                  key={item.title}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={prefersReducedMotion ? { duration: 0 } : { delay: 0.08 * index }}
                >
                  <Card className="relative overflow-hidden">
                    <div
                      className={`absolute inset-x-5 top-0 h-20 rounded-b-[28px] bg-gradient-to-br ${item.color} blur-2xl`}
                    />
                    <CardHeader className="relative flex flex-row items-start justify-between pb-3">
                      <div>
                        <CardDescription>{item.title}</CardDescription>
                        <p className="mt-2 text-4xl font-bold leading-tight tracking-normal text-slate-900">
                          <CountUp value={item.value} />
                        </p>
                      </div>
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-[var(--r-tile)] bg-gradient-to-br ${item.color}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                    </CardHeader>
                    <CardContent className="relative">
                      <p className="text-sm text-slate-500">{item.note}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </Reveal>
      )}

      {sortedReflections.length === 0 ? (
        <Reveal delay={0.04}>
          <Card className="overflow-hidden" data-testid="journal-fresh-empty-state">
            <CardContent className="p-10 text-center lg:p-14">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[var(--r-tile)] bg-violet-50 text-violet-700">
                <BookOpen className="h-10 w-10" />
              </div>
              <h2 className="mt-6 text-3xl font-bold text-slate-900">Chưa có trang nhật ký nào được mở ra</h2>
              <p className="mx-auto mt-[var(--space-inline)] max-w-2xl text-base text-slate-500">
                Nhật ký phản tư là phần về sau của flow. Bạn có thể đi từ Life Balance trước, hoặc viết một trang tự do
                nếu hôm nay đã có điều cần ghi lại.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button onClick={() => navigate("/onboarding")}>
                  Bắt đầu Life Balance
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => setIsAddingReflection(true)}>
                  <Plus className="h-4 w-4" />
                  Viết nhật ký tự do
                </Button>
              </div>
            </CardContent>
          </Card>
        </Reveal>
      ) : (
        <Reveal delay={0.04} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="stack-stack">
            <h2 className="sr-only">Nhật ký đã lưu</h2>
            {latestWeeklyReview && (
              <Card className="overflow-hidden border-sky-200 gradient-sky-slate">
                <CardContent className="p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-[var(--r-pill)] border border-sky-200 bg-white/90 px-3 py-1.5 text-sm font-medium text-sky-700">
                        <Flag className="h-4 w-4" />
                        Review tuần mới nhất
                      </div>
                      <h3 className="mt-4 text-2xl font-bold text-slate-950">{latestWeeklyReview.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        {latestWeeklyReview.linkedGoalId
                          ? goalsById.get(latestWeeklyReview.linkedGoalId)?.title
                          : "Chu kỳ 12 tuần"}
                        {latestWeeklyReview.linkedWeekNumber ? ` • tuần ${latestWeeklyReview.linkedWeekNumber}` : ""}
                        {latestWeeklyReview.linkedGoalId &&
                        goalsById.get(latestWeeklyReview.linkedGoalId)?.twelveWeekSystem?.reviewDay
                          ? ` • review vào ${getReviewDayLabel(goalsById.get(latestWeeklyReview.linkedGoalId)?.twelveWeekSystem?.reviewDay || "Sunday")}`
                          : ""}
                      </p>
                    </div>
                    {latestWeeklyReview.linkedGoalId && (
                      <Button onClick={() => openLinkedCycle(latestWeeklyReview.linkedGoalId)}>
                        Mở chu kỳ 12 tuần
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="stack-tight sm:[&>*+*]:mt-0 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Tìm kiếm nhật ký..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { value: "all", label: "Tất cả" },
                    { value: "weekly-review", label: "Review" },
                    { value: "freeform", label: "Tự do" },
                  ] as const
                ).map((item) => (
                  <Button
                    key={item.value}
                    size="sm"
                    className="h-11"
                    variant={filterType === item.value ? "default" : "outline"}
                    onClick={() => setFilterType(item.value)}
                  >
                    {item.label}
                  </Button>
                ))}
                <span className="hidden sm:inline w-px h-6 bg-slate-200" />
                {(["", "happy", "neutral", "sad"] as const).map((mood) => {
                  const labels: Record<string, string> = { "": "Tất cả", happy: "😊", neutral: "😐", sad: "😢" };
                  const fullLabels: Record<string, string> = {
                    "": "Tất cả",
                    happy: "Vui vẻ",
                    neutral: "Bình thường",
                    sad: "Suy tư",
                  };
                  return (
                    <Button
                      key={mood}
                      size="sm"
                      className="h-11"
                      variant={filterMood === mood ? "default" : "outline"}
                      onClick={() => setFilterMood(mood)}
                      title={fullLabels[mood]}
                    >
                      <span className="sm:hidden">{labels[mood]}</span>
                      <span className="hidden sm:inline">{fullLabels[mood]}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {filteredReflections.length === 0 && sortedReflections.length > 0 && (
              <div className="rounded-[var(--r-card)] border border-dashed border-slate-200 bg-slate-50/80 px-5 py-8 text-center text-sm text-slate-500">
                Không tìm thấy nhật ký nào phù hợp với bộ lọc hiện tại.
              </div>
            )}

            <AnimatePresence>
              {filteredReflections.map((reflection, index) => {
                const mood = getMoodConfig(reflection.mood);
                const linkedGoal = reflection.linkedGoalId ? goalsById.get(reflection.linkedGoalId) : null;

                return (
                  <motion.div
                    key={reflection.id}
                    layout
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={
                      prefersReducedMotion ? { duration: 0 } : { delay: index * 0.05, duration: 0.25 }
                    }
                  >
                    <Card className="overflow-hidden">
                      <CardContent className="p-6 lg:p-7">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-2xl font-bold text-slate-900">{reflection.title}</h3>
                              <Badge variant="outline" className={`rounded-[var(--r-pill)] px-3 py-1.5 ${mood.badge}`}>
                                <span className="mr-1.5">{mood.icon}</span>
                                {mood.label}
                              </Badge>
                              {reflection.entryType === "weekly-review" && (
                                <Badge
                                  variant="outline"
                                  className="rounded-[var(--r-pill)] border-sky-200 bg-sky-50 px-3 py-1.5 text-sky-700"
                                >
                                  Review tuần
                                </Badge>
                              )}
                              {reflection.linkedWeekNumber && (
                                <Badge
                                  variant="outline"
                                  className="rounded-[var(--r-pill)] border-white/80 bg-white px-3 py-1.5 text-slate-600"
                                >
                                  Tuần {reflection.linkedWeekNumber}
                                </Badge>
                              )}
                              {linkedGoal && (
                                <Badge
                                  variant="outline"
                                  className="rounded-[var(--r-pill)] border-violet-200 bg-violet-50 px-3 py-1.5 text-violet-700"
                                >
                                  {linkedGoal.title}
                                </Badge>
                              )}
                            </div>

                            <div className="mt-[var(--space-inline)] flex items-center gap-2 text-sm text-slate-500">
                              <Calendar className="h-4 w-4" />
                              {formatCalendarDate(reflection.date, "vi-VN", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 rounded-[var(--r-tile)] text-slate-500 hover:text-red-600"
                            aria-label={`Xóa nhật ký ${reflection.title}`}
                            onClick={() => handleDeleteReflection(reflection.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="mt-[var(--space-stack)] rounded-[var(--r-card)] border border-white/70 bg-white/72 p-5">
                          <p className="whitespace-pre-wrap text-sm leading-8 text-slate-600">{reflection.content}</p>
                        </div>
                        {reflection.entryType === "weekly-review" && reflection.linkedGoalId && (
                          <div className="mt-4 flex justify-end">
                            <Button variant="outline" onClick={() => openLinkedCycle(reflection.linkedGoalId)}>
                              Mở chu kỳ 12 tuần
                              <ArrowRight className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          <div className="stack-section xl:sticky xl:top-28">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Streak hiện tại</p>
                <div className="mt-4 flex items-center gap-3 rounded-[var(--r-tile)] border border-violet-200 bg-violet-50 px-4 py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[var(--r-tile)] bg-violet-100 text-violet-700">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-violet-700">
                      <CountUp value={currentStreak} /> ngày
                    </p>
                    <p className="text-xs text-violet-500">
                      {currentStreak >= 3
                        ? "Nhịp viết đang rất tốt!"
                        : currentStreak > 0
                          ? "Hãy duy trì đều hơn nhé."
                          : "Bắt đầu streak hôm nay!"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Nhịp cảm xúc</p>
                <div className="mt-[var(--space-stack)] stack-tight">
                  {[
                    {
                      label: "Vui vẻ",
                      value: moodCounts.happy,
                      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
                    },
                    {
                      label: "Bình thường",
                      value: moodCounts.neutral,
                      className: "border-amber-200 bg-amber-50 text-amber-700",
                    },
                    {
                      label: "Suy tư",
                      value: moodCounts.sad,
                      className: "border-sky-200 bg-sky-50 text-sky-700",
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-[var(--r-tile)] border border-white/70 bg-white/72 px-4 py-3"
                    >
                      <span className="text-sm font-medium text-slate-600">{item.label}</span>
                      <span className={`rounded-[var(--r-pill)] border px-3 py-1 text-sm font-semibold ${item.className}`}>
                        <CountUp value={item.value} />
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Viết tiếp khi bí ý</p>
                <div className="mt-[var(--space-stack)] stack-tight">
                  {JOURNAL_PROMPTS.map((prompt) => (
                    <div
                      key={prompt}
                      className="rounded-[var(--r-tile)] border border-white/70 bg-white/72 px-4 py-3 text-sm leading-7 text-slate-600"
                    >
                      {prompt}
                    </div>
                  ))}
                </div>

                <Button className="mt-6 w-full" onClick={() => setIsAddingReflection(true)}>
                  <Plus className="h-4 w-4" />
                  Viết thêm một trang mới
                </Button>
              </CardContent>
            </Card>
          </div>
        </Reveal>
      )}
    </div>
  );
}
