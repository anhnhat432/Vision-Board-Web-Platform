import { ArrowRight, CalendarCheck, Clock, Flame, Frown, Meh, MoreVertical, Pencil, Plus, Search, Smile } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { MotionCountUp } from "@/app/components/motion";
import { EmptyState } from "@/app/components/states/EmptyState";
import { emptyNarratives } from "../components/empty-states/narratives";
import { TabErrorBoundary } from "@/app/components/TabErrorBoundary";
import { ScreenGuide } from "../components/ScreenGuide";
import { SCREEN_GUIDES } from "../components/screen-guides";
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
import { Card } from "../components/ui/card";
import { CountUp } from "../components/ui/count-up";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Skeleton } from "../components/ui/skeleton";
import { Textarea } from "../components/ui/textarea";
import { cn } from "../components/ui/utils";
import { useSetAssistantPageContext } from "../features/assistant/AssistantPageContextProvider";
import { type ReflectionDraft, useReflectionDraft } from "../hooks/useReflectionDraft";
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
  getActiveTwelveWeekGoal,
  getTwelveWeekCurrentWeek,
  getTwelveWeekWeekCompletion,
  getUserData,
  parseCalendarDate,
  saveUserData,
  sortReflectionsByDateDesc,
} from "../utils/storage";
import { formatDisplayDate } from "../utils/storage-date-utils";
import { WaterReflectionPool } from "./ReflectionJournal/components/WaterReflectionPool";

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
        icon: <Smile className="h-5 w-5 text-app-warm" />,
        label: "Vui vẻ",
        badge: "border-app-warm bg-app-warm-soft text-app-warm",
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

function getJournalPhaseTone() {
  return {
    stripe: "bg-app-warm",
    soft: "border-app-line bg-app-warm-soft text-app-warm",
    bar: "bg-app-warm",
  };
}

export function ReflectionJournal() {
  return (
    <TabErrorBoundary fallbackTitle="Trang Nhật ký phản tư gặp lỗi">
      <ReflectionJournalContent />
    </TabErrorBoundary>
  );
}

function ReflectionJournalContent() {
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

  useSetAssistantPageContext({
    pageType: "reflection",
    hint: "Đang viết reflection",
  });

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

  const weeklyReviewCount = useMemo(
    () => sortedReflections.filter((reflection) => reflection.entryType === "weekly-review").length,
    [sortedReflections],
  );
  const hasReflections = sortedReflections.length > 0;

  const activeGoal = useMemo(
    () => (userData ? getActiveTwelveWeekGoal(userData.goals) : null),
    [userData],
  );

  const weekCompletion = useMemo(() => {
    if (!activeGoal?.twelveWeekSystem) return null;
    const system = activeGoal.twelveWeekSystem;
    const weekNumber = getTwelveWeekCurrentWeek(system);
    const completion = getTwelveWeekWeekCompletion(system, weekNumber);
    return { weekNumber, ...completion };
  }, [activeGoal]);

  const journalStreak = useMemo(() => {
    if (!userData || userData.reflections.length === 0) return 0;
    const sorted = [...userData.reflections].sort((a, b) => b.date.localeCompare(a.date));
    const dates = [...new Set(sorted.map((r) => r.date.slice(0, 10)))];
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
    if (dates[0] !== todayKey && dates[0] !== yesterdayKey) return 0;
    let streak = 0;
    const check = new Date(dates[0]);
    for (const date of dates) {
      const expected = `${check.getFullYear()}-${String(check.getMonth() + 1).padStart(2, "0")}-${String(check.getDate()).padStart(2, "0")}`;
      if (date !== expected) break;
      streak++;
      check.setDate(check.getDate() - 1);
    }
    return streak;
  }, [userData]);

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

  if (!userData) return <ReflectionJournalSkeleton />;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pb-12 pt-8 sm:px-6 lg:px-8">
      <WaterReflectionPool />
      <ScreenGuide {...SCREEN_GUIDES.reflectionJournal} autoOpen />
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
              className="bg-app-status-error hover:bg-app-status-error/90 text-white"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-[22px] border border-app-line bg-app-surface p-8 sm:p-9 grid grid-cols-1 md:grid-cols-[1fr_360px] gap-7 items-center page-enter">
        <div>
          <div className="flex items-center gap-2 mb-3.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-app-warm">
            <span className="w-1.5 h-1.5 rounded-full bg-app-warm" />
            Phản tư
          </div>
          <h1 className="font-serif text-[clamp(28px,3.2vw,40px)] font-bold leading-[1.02] tracking-[-0.02em] text-app-ink mb-3">
            Nhật ký phản tư
          </h1>
          <p className="text-sm leading-relaxed text-app-ink-soft mb-6 max-w-[44ch] sm:text-[14.5px]">
            Ghi lại điều bạn học được, điều biết ơn, và điều muốn cải thiện. Mỗi dòng là một dấu chân trên hành trình 12 tuần.
          </p>
          <div className="flex flex-wrap gap-2.5">
            <Button
              onClick={() => setIsAddingReflection(true)}
              className="bg-app-warm text-white hover:bg-app-warm-hover hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.97] transition-all duration-200 rounded-full px-5 py-3 h-auto text-[13.5px] font-bold shadow-lg shadow-app-warm/25 gap-2.5"
            >
              <Pencil className="h-4 w-4" />
              Viết entry mới
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const list = document.getElementById("journal-entries");
                if (list) list.scrollIntoView({ behavior: "smooth" });
              }}
              className="rounded-full px-5 py-3 h-auto text-[13.5px] font-semibold gap-2 border-app-line text-app-ink hover:bg-app-bg hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200"
            >
              <Clock className="h-[15px] w-[15px]" />
              Dòng thời gian
            </Button>
          </div>
        </div>
        <div className="relative rounded-[18px] overflow-hidden self-stretch min-h-[210px] shadow-[0_24px_48px_-28px_rgba(23,21,15,0.5)] animate-[float_5s_ease-in-out_infinite]">
          <img
            src="/reflection_journal.png"
            alt="Nhật ký phản tư"
            className="w-full h-full object-cover absolute inset-0 dark:brightness-[0.85] dark:contrast-[1.05]"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-app-warm/10 to-transparent" />
        </div>
      </section>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3.5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A8A296]" aria-hidden="true" />
          <Input
            type="search"
            aria-label="Tìm kiếm nhật ký"
            placeholder="Tìm kiếm nhật ký…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-12 pl-[42px] rounded-[13px] border-app-line bg-app-surface text-[13.5px] placeholder:text-[#A8A296]"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#A8A296] mr-0.5">Loại</span>
          {(["all", "weekly-review", "freeform"] as const).map((type) => {
            const isActive = filterType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setFilterType(type)}
                className={cn(
                  "inline-flex items-center rounded-full border px-3.5 py-2 text-xs font-semibold transition-all duration-150 active:scale-[0.96]",
                  isActive
                    ? "border-app-warm bg-[#FBF4EE] dark:bg-app-warm-soft/20 text-app-warm"
                    : "border-app-line bg-app-surface text-app-ink-soft hover:border-app-warm/40 hover:text-app-warm",
                )}
              >
                {type === "all" ? "Mọi loại" : type === "weekly-review" ? "Review tuần" : "Tự do"}
              </button>
            );
          })}
          <span className="w-px h-[22px] bg-app-line mx-1.5" />
          <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#A8A296] mr-0.5">Tâm trạng</span>
          {(["", "happy", "neutral", "sad"] as const).map((mood) => {
            const labels: Record<string, string> = {
              "": "Mọi tâm trạng",
              happy: "Vui vẻ",
              neutral: "Bình thường",
              sad: "Suy tư",
            };
            const isActive = filterMood === mood;
            return (
              <button
                key={mood}
                type="button"
                onClick={() => setFilterMood(mood)}
                className={cn(
                  "inline-flex items-center rounded-full border px-3.5 py-2 text-xs font-semibold transition-all duration-150 active:scale-[0.96]",
                  isActive
                    ? "border-app-warm bg-[#FBF4EE] dark:bg-app-warm-soft/20 text-app-warm"
                    : "border-app-line bg-app-surface text-app-ink-soft hover:border-app-warm/40 hover:text-app-warm",
                )}
              >
                {labels[mood]}
              </button>
            );
          })}
        </div>
      </div>

      {weekCompletion && (
        <section className="relative overflow-hidden bg-[#F4ECE2] dark:bg-app-warm-soft/20 border border-app-warm/20 rounded-[20px] p-6 sm:p-7 flex flex-col sm:flex-row items-start gap-7">
          <div className="relative w-[74px] h-[74px] shrink-0 rounded-2xl bg-app-surface border border-app-warm/20 flex items-center justify-center text-app-warm">
            <CalendarCheck className="h-[34px] w-[34px]" strokeWidth={1.8} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-app-warm mb-1.5">
              Tổng kết tuần {weekCompletion.weekNumber}
            </div>
            <h2 className="font-serif text-[21px] font-bold text-app-ink tracking-[-0.01em] mb-1">
              Tuần này bạn đã làm được
            </h2>
            <p className="text-xs text-[#7A6E5E] dark:text-app-ink-soft">
              Viết một dòng phản tư mỗi ngày để giữ chuỗi và nhìn lại tiến bộ.
            </p>
            {journalStreak > 0 && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-app-warm/10 px-4 py-1.5">
                <Flame className="h-4 w-4 text-app-warm" aria-hidden="true" />
                <span className="text-xs font-semibold text-app-warm">{journalStreak} ngày viết liên tục</span>
              </div>
            )}
          </div>
          <div className="flex items-end gap-8 sm:gap-10 shrink-0">
            <div>
              <div className="font-serif text-[40px] font-extrabold leading-none text-app-ink tabular-nums">
                <MotionCountUp value={weekCompletion.completed} />
                <span className="text-lg text-[#A8A296] font-bold"> / {weekCompletion.total}</span>
              </div>
              <div className="text-[11.5px] text-[#7A6E5E] dark:text-app-ink-soft font-medium mt-1.5">task hoàn thành</div>
            </div>
            <div>
              <div className="font-serif text-[40px] font-extrabold leading-none text-app-warm tabular-nums">
                <MotionCountUp value={weekCompletion.percent} suffix="%" />
              </div>
              <div className="text-[11.5px] text-[#7A6E5E] dark:text-app-ink-soft font-medium mt-1.5">tiến độ tuần</div>
              <div className="w-[120px] h-1.5 rounded-full bg-app-warm/15 overflow-hidden mt-2">
                <div
                  className="h-full rounded-full bg-app-warm transition-all duration-700"
                  style={{ width: `${Math.max(2, weekCompletion.percent)}%` }}
                />
              </div>
            </div>
          </div>
        </section>
      )}

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
              <div className="rounded-xl border border-app-warm-border bg-app-warm-soft p-4 text-sm text-app-warm-strong">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p>Tìm thấy bản nháp chưa lưu lúc {formatDraftSavedTime(pendingReflectionDraft.savedAt)}.</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      type="button"
                      onClick={handleRestoreReflectionDraft}
                      className="transition-all duration-150 active:scale-[0.97] focus-visible:ring-app-warm focus-visible:ring-offset-2"
                    >
                      Khôi phục
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={handleIgnoreReflectionDraft}
                      className="transition-all duration-150 active:scale-[0.97]"
                    >
                      Bỏ qua
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid gap-5 md:grid-cols-2">
              <div className="stack-tight">
                <Label htmlFor="reflection-date">Ngày</Label>
                <Input
                  id="reflection-date"
                  type="date"
                  value={newReflection.date}
                  onChange={(event) => setNewReflection({ ...newReflection, date: event.target.value })}
                />
                {newReflection.date ? (
                  <p className="text-xs text-app-ink-soft">Đã chọn: {formatDisplayDate(newReflection.date)}</p>
                ) : null}
              </div>
              <div className="stack-tight">
                <Label htmlFor="reflection-title">Tiêu đề</Label>
                <Input
                  id="reflection-title"
                  placeholder="Ví dụ: Một ngày tôi lấy lại được nhịp"
                  value={newReflection.title}
                  onChange={(event) => setNewReflection({ ...newReflection, title: event.target.value })}
                />
              </div>
            </div>

            {/* New Entry Section - Warm Tone */}
            <div className="surface-raised rounded-xl border border-app-warm-border bg-app-warm-soft p-5 md:p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="inline-flex rounded-full bg-app-warm-soft px-3 py-1 text-xs font-medium text-app-warm ring-1 ring-app-warm-border">
                  Phản tư hôm nay
                </span>
              </div>

              <p className="mb-4 font-serif text-lg font-medium leading-7 text-app-warm-strong">{JOURNAL_PROMPTS[0]}</p>

              <Textarea
                id="reflection-content"
                aria-label="Nội dung nhật ký phản tư"
                placeholder="Viết về trải nghiệm, điều bạn học được, khoảnh khắc đáng nhớ hoặc điều bạn muốn nhắc mình sau này..."
                value={newReflection.content}
                onChange={(event) => handleReflectionContentChange(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                    event.preventDefault();
                    handleAddReflection();
                  }
                }}
                className="min-h-[140px] max-h-[240px] border-app-warm-border focus-visible:border-app-warm focus-visible:ring-app-warm/20"
              />

              {/* Mood Selector */}
              <div className="mt-4">
                <Label className="mb-2 block text-sm font-medium text-app-ink">
                  Hôm nay bạn đang cảm thấy thế nào?
                </Label>
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
                          "rounded-full border px-3 py-1.5 text-sm transition-all duration-150 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-warm focus-visible:ring-offset-2",
                          isActive
                            ? "bg-app-warm text-white border-app-warm shadow-app-sm font-semibold"
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
                className="mt-6 w-full bg-app-warm text-white hover:bg-app-warm-hover active:scale-[0.98] transition-all duration-150 focus-visible:ring-app-warm focus-visible:ring-offset-2 shadow-app-md shadow-app-warm/15"
              >
                Lưu nhật ký
              </Button>
            </div>

            <div className="rounded-xl border border-app-line bg-app-surface p-4">
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
                    className="rounded-full border border-app-line bg-app-bg px-3.5 py-2 text-sm text-app-ink-soft hover:bg-app-warm-soft hover:text-app-warm hover:border-app-warm/30 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-warm focus-visible:ring-offset-2 transition-all duration-150 text-left"
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
            <Card key={item.label} className="rounded-card border border-app-line bg-app-surface p-5 md:p-6">
              <p className="text-xs uppercase tracking-[0.18em] text-app-ink-muted">{item.label}</p>
              <p className="mt-1 font-serif text-3xl font-medium text-app-ink tabular-nums">
                <CountUp value={item.value} />
              </p>
            </Card>
          ))}
        </section>
      )}

      {/* Empty State */}
      {sortedReflections.length === 0 ? (
        <section className="flex flex-col items-center text-center bg-app-surface border border-app-line rounded-[20px] p-10 sm:p-11 sm:pt-12">
          <div className="relative w-[150px] h-[108px] rounded-2xl overflow-hidden border-[3px] border-app-surface shadow-[0_16px_34px_-20px_rgba(23,21,15,0.55)] mb-5">
            <img
              src="/reflection_journal.png"
              alt="Trang giấy còn trắng"
              className="w-full h-full object-cover block dark:brightness-[0.85] dark:contrast-[1.05]"
            />
          </div>
          <h3 className="font-serif text-[22px] font-bold text-app-ink tracking-[-0.01em] mb-2">
            {emptyNarratives.noJournalEntries.title}
          </h3>
          <p className="text-[13.5px] text-app-ink-soft mb-6 max-w-[42ch] leading-relaxed">
            {emptyNarratives.noJournalEntries.body} Bắt đầu từ một gợi ý bên dưới.
          </p>
          <Button
            onClick={() => setIsAddingReflection(true)}
            className="bg-app-warm text-white hover:bg-app-warm-hover hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.97] transition-all duration-200 rounded-full px-6 py-3.5 h-auto text-sm font-bold shadow-lg shadow-app-warm/25 gap-2.5 mb-7"
          >
            <Plus className="h-4 w-4" strokeWidth={2.4} />
            Viết entry đầu tiên
          </Button>

          {/* Prompt Cards */}
          <div className="w-full max-w-[660px] border-t border-app-line pt-6">
            <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#A8A296] mb-3.5">Gợi ý mở đầu</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {([
                {
                  title: "Điều tôi học được",
                  hint: "Một bài học hoặc nhận ra hôm nay.",
                  iconBg: "#EDF7E0",
                  iconColor: "#0C5E3A",
                  prompt: "Điều gì hôm nay khiến bạn tự hào về bản thân?",
                },
                {
                  title: "Điều tôi biết ơn",
                  hint: "Một điều nhỏ khiến hôm nay nhẹ hơn.",
                  iconBg: "#FBEAE0",
                  iconColor: "#B0673C",
                  prompt: "Một điều bạn muốn làm tốt hơn vào ngày mai là gì?",
                },
                {
                  title: "Điều muốn cải thiện",
                  hint: "Một việc tuần tới làm tốt hơn.",
                  iconBg: "#FFF8DE",
                  iconColor: "#9A7B00",
                  prompt: "Bạn đang học được điều gì từ chặng đường hiện tại?",
                },
              ] as const).map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => {
                    setIsAddingReflection(true);
                    setNewReflection((prev) => ({
                      ...prev,
                      content: prev.content ? `${prev.content}\n\n${item.prompt}` : item.prompt,
                    }));
                    saveDraft(item.prompt);
                  }}
                  className="text-left bg-[#FAF8F3] dark:bg-app-bg border border-app-line rounded-[14px] p-4 cursor-pointer transition-all duration-150 hover:border-app-warm/50 hover:bg-[#FBF5EF] dark:hover:bg-app-warm-soft/20 active:scale-[0.98]"
                >
                  <span
                    className="flex w-[30px] h-[30px] rounded-[9px] items-center justify-center mb-2.5"
                    style={{ backgroundColor: item.iconBg, color: item.iconColor }}
                  >
                    {item.title === "Điều tôi học được" ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/></svg>
                    ) : item.title === "Điều tôi biết ơn" ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17V7l6 5 6-9 6 14"/></svg>
                    )}
                  </span>
                  <span className="block text-[13px] font-bold text-app-ink mb-1">{item.title}</span>
                  <span className="block text-[11.5px] text-app-ink-soft leading-relaxed">{item.hint}</span>
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : (
        /* Past Entries List */
        <section id="journal-entries">
          <div className="mb-4">
            <p className="text-xs uppercase tracking-[0.18em] text-app-ink-muted">GHI CHÉP CŨ</p>
            <h2 className="mt-1 font-serif text-2xl font-medium text-app-ink">{filteredReflections.length} bài viết</h2>
          </div>

          <div className="space-y-4">
            {filteredReflections.map((reflection) => {
              const mood = getMoodConfig(reflection.mood);
              const linkedGoal = reflection.linkedGoalId ? goalsById.get(reflection.linkedGoalId) : null;
              const phaseTone = getJournalPhaseTone();

              return (
                <Card key={reflection.id} className="rounded-card border border-app-line bg-app-surface p-5 md:p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_46px_-30px_rgba(23,21,15,0.34)]">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs uppercase tracking-[0.14em] text-app-ink-muted">
                          {formatCalendarDate(reflection.date, "vi-VN", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                        <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 text-xs", mood.badge)}>
                          {mood.label}
                        </Badge>
                        {reflection.entryType === "weekly-review" && (
                          <Badge
                            variant="outline"
                            className="rounded-full border-app-line bg-app-bg px-2.5 py-0.5 text-xs text-app-ink-soft"
                          >
                            Review tuần
                          </Badge>
                        )}
                        {reflection.linkedWeekNumber && (
                          <Badge variant="outline" className={cn("rounded-full px-2.5 py-0.5 text-xs", phaseTone.soft)}>
                            Tuần {reflection.linkedWeekNumber}
                          </Badge>
                        )}
                      </div>

                      <h3 className="mt-2 font-serif text-lg font-medium text-app-ink">{reflection.title}</h3>

                      <p className="mt-2 text-sm leading-relaxed text-app-ink whitespace-pre-line">
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
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Mở tuỳ chọn cho nhật ký ${reflection.title || formatCalendarDate(reflection.date)}`}
                          className="shrink-0 text-app-ink-soft hover:text-app-ink"
                        >
                          <MoreVertical className="h-4 w-4" aria-hidden="true" />
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
                          className="text-app-status-error focus:text-app-status-error"
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
            <EmptyState
              variant="dashed"
              title="Không tìm thấy kết quả"
              description="Hãy thử thay đổi bộ lọc hoặc từ khóa tìm kiếm để tìm lại những ghi chép của bạn."
            />
          )}
        </section>
      )}
    </div>
  );
}

function ReflectionJournalSkeleton() {
  return (
    <div
      className="mx-auto max-w-6xl space-y-6 px-4 pb-12 pt-8 sm:px-6 lg:px-8"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Đang tải nhật ký...</span>
      <Skeleton className="h-40 rounded-2xl bg-app-line/60" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <Skeleton key={index} className="h-20 rounded-xl bg-app-line/60" />
        ))}
      </div>
      <div className="space-y-3">
        {[0, 1, 2, 3, 4].map((index) => (
          <Skeleton key={index} className="h-24 rounded-xl bg-app-line/60" />
        ))}
      </div>
    </div>
  );
}
