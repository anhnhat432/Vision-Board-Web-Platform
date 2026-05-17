import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router";
import { cn } from "../components/ui/utils";
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
  MoreVertical,
} from "lucide-react";
import { toast } from "sonner";

import { EmptyHintArrow } from "../components/illustrations";
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
import { Card, CardContent } from "../components/ui/card";
import { CountUp } from "../components/ui/count-up";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { useReflectionDraft, type ReflectionDraft } from "../hooks/useReflectionDraft";
import { useSyncedUserData } from "../hooks/useSyncedUserData";
import { getDayKey, getPreviousDayKey, getTodayDayKey } from "../utils/day-key";
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
  "Tuần sau bạn muốn giữ lại một nhịp nhỏ nào?",
];

function createEmptyReflectionInput() {
  return {
    title: "",
    content: "",
    mood: "" as MoodValue,
    date: formatDateInputValue(new Date()),
  };
}

function formatDraftSavedTime(savedAt: string) {
  const date = new Date(savedAt);
  if (Number.isNaN(date.getTime())) return "không rõ giờ";
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function getReflectionTitleFromContent(content: string) {
  const firstLine = content.trim().split(/\r?\n/)[0]?.trim() ?? "";
  if (!firstLine) return "Nhật ký chưa đặt tên";
  return firstLine.length > 64 ? `${firstLine.slice(0, 61)}...` : firstLine;
}

function getReflectionInputFromDraft(draft: ReflectionDraft) {
  return {
    title: getReflectionTitleFromContent(draft.content),
    content: draft.content,
    mood: "" as MoodValue,
    date: formatDateInputValue(new Date()),
  };
}

function getEmptyReflectionInputWithDraftDate(draft: ReflectionDraft) {
  const savedDate = new Date(draft.savedAt);
  return {
    ...createEmptyReflectionInput(),
    date: Number.isNaN(savedDate.getTime()) ? formatDateInputValue(new Date()) : formatDateInputValue(savedDate),
  };
}

function getReflectionInputForContent(content: string, previous: ReturnType<typeof createEmptyReflectionInput>) {
  return {
    ...previous,
    title: previous.title || getReflectionTitleFromContent(content),
    content,
  };
}

function getMoodConfig(mood?: string) {
  switch (mood) {
    case "happy":
      return {
        icon: <Smile className="h-5 w-5 text-app-accent" />,
        label: "Vui vẻ",
        badge: "border-app-accent bg-app-accent-soft text-app-accent",
      };
    case "neutral":
      return {
        icon: <Meh className="h-5 w-5 text-app-ink-soft" />,
        label: "Bình thường",
        badge: "border-app-line bg-app-bg text-app-ink-soft",
      };
    case "sad":
      return {
        icon: <Frown className="h-5 w-5 text-app-warm" />,
        label: "Suy tư",
        badge: "border-app-warm bg-app-warm-soft text-app-warm",
      };
    default:
      return {
        icon: null,
        label: "Chưa chọn",
        badge: "border-app-line bg-app-bg text-app-ink-muted",
      };
  }
}

function getJournalPhaseTone(weekNumber?: number) {
  return {
    stripe: "bg-app-warm",
    soft: "border-app-line bg-app-warm-soft text-app-warm",
    bar: "bg-app-warm",
  };
}

export function ReflectionJournal() {
  const navigate = useNavigate();
  const { userData, reloadUserData } = useSyncedUserData();
  const { clearDraft, loadDraft, saveDraft } = useReflectionDraft();
  const [isAddingReflection, setIsAddingReflection] = useState(false);
  const [newReflection, setNewReflection] = useState(() => createEmptyReflectionInput());
  const [pendingReflectionDraft, setPendingReflectionDraft] = useState<ReflectionDraft | null>(null);
  const [reflectionToDelete, setReflectionToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMood, setFilterMood] = useState<MoodValue | "">("");
  const [filterType, setFilterType] = useState<"all" | "weekly-review" | "freeform">("all");

  useEffect(() => {
    if (!isAddingReflection) return;
    const draft = loadDraft();
    setPendingReflectionDraft(draft);
    setNewReflection(draft ? getEmptyReflectionInputWithDraftDate(draft) : createEmptyReflectionInput());
  }, [isAddingReflection, loadDraft]);

  const handleRestoreReflectionDraft = () => {
    if (!pendingReflectionDraft) return;
    setNewReflection(getReflectionInputFromDraft(pendingReflectionDraft));
    setPendingReflectionDraft(null);
  };

  const handleIgnoreReflectionDraft = () => {
    clearDraft();
    setPendingReflectionDraft(null);
    setNewReflection(createEmptyReflectionInput());
  };

  const handleReflectionContentChange = (content: string) => {
    setNewReflection((previous) => getReflectionInputForContent(content, previous));
    saveDraft(content);
  };

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

    clearDraft();
    setPendingReflectionDraft(null);
    setNewReflection(createEmptyReflectionInput());
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
  const moodTotal = moodCounts.happy + moodCounts.neutral + moodCounts.sad;

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
    const todayKey = getTodayDayKey();
    const writtenDays = new Set(sortedReflections.map((r) => getDayKey(r.date)));
    let cursorKey = todayKey;
    if (!writtenDays.has(cursorKey)) {
      cursorKey = getPreviousDayKey(cursorKey);
    }
    let streak = 0;
    while (writtenDays.has(cursorKey)) {
      streak += 1;
      cursorKey = getPreviousDayKey(cursorKey);
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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 space-y-6">
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
            <AlertDialogAction
              onClick={confirmDeleteReflection}
              className="bg-[color:var(--color-danger-fg)] hover:bg-[color:var(--color-danger-fg)]/90"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hero Section */}
      <section className="rounded-card border border-app-line bg-app-surface p-5 md:p-8">
        <div className="flex flex-col gap-3">
          <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-app-ink-muted">PHẢN TƯ</p>
          <h1 className="font-serif text-[32px] font-medium leading-tight text-app-ink">Nhật ký phản tư</h1>
          <p className="max-w-2xl text-[15px] leading-6 text-app-ink-soft">
            Ghi lại điều bạn học được, biết ơn, và muốn cải thiện.
          </p>
        </div>

        {/* Toolbar */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative min-w-[200px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-ink-muted" />
            <Input
              placeholder="Tìm kiếm nhật ký..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(["all", "weekly-review", "freeform"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                className={cn(
                  "rounded-full border border-app-line bg-app-surface px-3 py-1 text-[13px] transition-colors",
                  filterType === type ? "bg-app-accent-soft text-app-accent" : "text-app-ink-soft hover:bg-app-bg",
                )}
              >
                {type === "all" ? "Tất cả" : type === "weekly-review" ? "Review tuần" : "Tự do"}
              </button>
            ))}
            <span className="hidden sm:inline w-px h-5 bg-app-line" />
            {(["", "happy", "neutral", "sad"] as const).map((mood) => {
              const labels: Record<string, string> = { "": "Tất cả", happy: "Vui vẻ", neutral: "Bình thường", sad: "Suy tư" };
              return (
                <button
                  key={mood}
                  type="button"
                  onClick={() => setFilterMood(mood)}
                  className={cn(
                    "rounded-full border border-app-line bg-app-surface px-3 py-1 text-[13px] transition-colors",
                    filterMood === mood ? "bg-app-accent-soft text-app-accent" : "text-app-ink-soft hover:bg-app-bg",
                  )}
                >
                  {labels[mood]}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <Dialog open={isAddingReflection} onOpenChange={setIsAddingReflection}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Viết nhật ký mới</DialogTitle>
            <DialogDescription>
              Ghi lại bài học, cảm xúc, bước tiến hoặc bất kỳ điều gì bạn không muốn để trôi qua.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 grid gap-5">
            {pendingReflectionDraft ? (
              <div className="rounded-card border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p>Tìm thấy bản nháp chưa lưu lúc {formatDraftSavedTime(pendingReflectionDraft.savedAt)}.</p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" type="button" onClick={handleRestoreReflectionDraft}>
                      Khôi phục
                    </Button>
                    <Button size="sm" type="button" variant="outline" onClick={handleIgnoreReflectionDraft}>
                      Bỏ qua
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

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

            {/* New Entry Section - Warm Tone */}
            <div className="rounded-card border border-app-warm-border bg-app-warm-soft p-6 md:p-8">
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex rounded-full bg-app-warm-soft px-3 py-1 text-[13px] font-medium text-app-warm ring-1 ring-app-warm-border">
                  Phản tư hôm nay
                </span>
              </div>

              <p className="font-serif text-[22px] font-medium leading-7 text-app-warm-strong mb-4">
                {JOURNAL_PROMPTS[0]}
              </p>

              <Textarea
                placeholder="Viết về trải nghiệm, điều bạn học được, khoảnh khắc đáng nhớ hoặc điều bạn muốn nhắc mình sau này..."
                value={newReflection.content}
                onChange={(event) => handleReflectionContentChange(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                    event.preventDefault();
                    handleAddReflection();
                  }
                }}
                className="min-h-[140px] rounded-lg border border-app-warm-border bg-app-surface px-3.5 py-2.5 text-[15px] text-app-ink focus:border-app-warm focus:ring-app-warm/30"
              />

              {/* Mood Selector */}
              <div className="mt-4">
                <Label className="mb-2 block text-[14px] font-medium text-app-ink">Hôm nay bạn đang cảm thấy thế nào?</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {[
                    { value: "happy" as MoodValue, label: "Vui vẻ", emoji: "😊" },
                    { value: "neutral" as MoodValue, label: "Bình thường", emoji: "😐" },
                    { value: "sad" as MoodValue, label: "Suy tư", emoji: "🤔" },
                  ].map((item) => {
                    const isActive = newReflection.mood === item.value;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setNewReflection({ ...newReflection, mood: item.value })}
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-[14px] transition-colors",
                          isActive
                            ? "bg-app-warm text-white border-app-warm"
                            : "bg-app-surface border-app-warm-border text-app-ink-soft hover:bg-app-warm-soft",
                        )}
                      >
                        <span className="mr-1">{item.emoji}</span>
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button
                onClick={handleAddReflection}
                disabled={!newReflection.title || !newReflection.content}
                className="mt-6 w-full bg-app-warm text-white hover:bg-[#c56b4e]"
              >
                Lưu nhật ký
              </Button>
            </div>

            <div className="rounded-card border border-app-line bg-app-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-ink-muted">Gợi ý bắt đầu</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {JOURNAL_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => {
                      setNewReflection((prev) => {
                        const content = prev.content ? `${prev.content}\n\n${prompt}` : prompt;
                        saveDraft(content);
                        return getReflectionInputForContent(content, prev);
                      });
                    }}
                    className="rounded-full border border-app-line bg-app-bg px-3 py-1.5 text-[13px] text-app-ink-soft hover:bg-app-warm-soft hover:text-app-warm transition-colors text-left"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stats Section */}
      {hasReflections && (
        <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "Tổng số", value: userData.reflections.length },
            { label: "Tháng này", value: monthlyCount },
            { label: "Review tuần", value: weeklyReviewCount },
          ].map((item) => (
            <Card key={item.label} className="rounded-card border border-app-line bg-app-surface p-4">
              <p className="text-[12px] uppercase tracking-[0.2em] text-app-ink-muted">{item.label}</p>
              <p className="mt-1 font-serif text-[28px] font-medium text-app-ink tabular-nums">
                <CountUp value={item.value} />
              </p>
            </Card>
          ))}
        </section>
      )}

      {/* Empty State */}
      {sortedReflections.length === 0 ? (
        <Card className="rounded-card border border-app-line bg-app-surface p-10 text-center">
          <BookOpen className="mx-auto h-12 w-12 text-app-accent" />
          <h2 className="mt-4 font-serif text-[24px] font-medium text-app-ink">Bắt đầu nhật ký của bạn</h2>
          <p className="mx-auto mt-2 max-w-md text-[15px] text-app-ink-soft">
            Nhật ký phản tư là nơi lưu giữ những suy nghĩ, bài học và cảm xúc quan trọng trên hành trình phát triển.
          </p>
          <Button
            onClick={() => setIsAddingReflection(true)}
            className="mt-5 bg-app-warm text-white hover:bg-[#c56b4e]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Viết entry đầu tiên
          </Button>
        </Card>
      ) : (
        /* Past Entries List */
        <section>
          <div className="mb-4">
            <p className="text-[12px] uppercase tracking-[0.2em] text-app-ink-muted">GHI CHÉP CŨ</p>
            <h2 className="mt-1 text-[22px] font-medium text-app-ink">
              {filteredReflections.length} bài viết
            </h2>
          </div>

          <div className="space-y-4">
            {filteredReflections.map((reflection) => {
              const mood = getMoodConfig(reflection.mood);
              const linkedGoal = reflection.linkedGoalId ? goalsById.get(reflection.linkedGoalId) : null;
              const phaseTone = getJournalPhaseTone(reflection.linkedWeekNumber);

              return (
                <Card key={reflection.id} className="rounded-card border border-app-line bg-app-surface p-5 md:p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[12px] uppercase tracking-[0.12em] text-app-ink-muted">
                          {formatCalendarDate(reflection.date, "vi-VN", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                        <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 text-[12px]", mood.badge)}>
                          {mood.label}
                        </Badge>
                        {reflection.entryType === "weekly-review" && (
                          <Badge variant="outline" className="rounded-full border-app-line bg-app-bg px-2.5 py-0.5 text-[12px] text-app-ink-soft">
                            Review tuần
                          </Badge>
                        )}
                        {reflection.linkedWeekNumber && (
                          <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 text-[12px]", phaseTone.soft)}>
                            Tuần {reflection.linkedWeekNumber}
                          </Badge>
                        )}
                      </div>

                      <h3 className="mt-2 text-[17px] font-medium text-app-ink">{reflection.title}</h3>

                      <p className="mt-2 text-[15px] leading-relaxed text-app-ink whitespace-pre-line">
                        {reflection.content}
                      </p>

                      {linkedGoal && (
                        <div className="mt-3 flex justify-end">
                          <Button variant="outline" size="sm" onClick={() => openLinkedCycle(reflection.linkedGoalId)}>
                            Mở chu kỳ 12 tuần
                            <ArrowRight className="h-3.5 w-3.5 ml-1" />
                          </Button>
                        </div>
                      )}
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 text-app-ink-soft hover:text-app-ink">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setNewReflection({
                              title: reflection.title,
                              content: reflection.content,
                              mood: (reflection.mood || "") as MoodValue,
                              date: reflection.date,
                            });
                            setIsAddingReflection(true);
                          }}
                        >
                          Chỉnh sửa
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteReflection(reflection.id)}
                          className="text-red-600 focus:text-red-600"
                        >
                          Xóa
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </Card>
              );
            })}
          </div>

          {filteredReflections.length === 0 && sortedReflections.length > 0 && (
            <Card className="rounded-card border border-app-line border-dashed bg-app-bg p-8 text-center">
              <p className="text-[15px] text-app-ink-muted">Không tìm thấy nhật ký nào phù hợp với bộ lọc hiện tại.</p>
            </Card>
          )}
        </section>
      )}
    </div>
  );
}