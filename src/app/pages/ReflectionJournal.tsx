import {
  ArrowRight,
  BookOpen,
  CalendarCheck,
  Clock,
  Flame,
  Frown,
  Heart,
  Meh,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Smile,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { MotionCountUp } from "@/app/components/motion";
import { EmptyState } from "@/app/components/states/EmptyState";
import { ScreenStateView } from "@/app/components/states/ScreenStateView";
import { useScreenDataState } from "@/app/components/states/useScreenDataState";
import { TabErrorBoundary } from "@/app/components/TabErrorBoundary";
import { emptyNarratives } from "../components/empty-states/narratives";
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

  // Máy trạng thái loại trừ lẫn nhau cho vùng nội dung nhật ký (Req 5.1–5.6).
  // Nguồn dữ liệu là localStorage qua useSyncedUserData; retry chỉ tải lại
  // (reloadUserData) và KHÔNG đụng/xoá dữ liệu local. Loading do skeleton cấp
  // trang đảm nhận nên vùng này không hiển thị empty khi đang tải.
  const [journalLoadFailed, setJournalLoadFailed] = useState(false);
  const handleJournalRetry = useCallback(() => {
    setJournalLoadFailed(false);
    reloadUserData();
  }, [reloadUserData]);
  const journalScreenState = useScreenDataState({
    status: journalLoadFailed ? "error" : userData ? "ready" : "loading",
    isEmpty: sortedReflections.length === 0,
    onRetry: handleJournalRetry,
  });

  const activeGoal = useMemo(() => (userData ? getActiveTwelveWeekGoal(userData.goals) : null), [userData]);

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
      <section
        data-reflection-journal-hero
        className="relative grid grid-cols-[1fr_88px] items-start gap-4 overflow-hidden rounded-card-lg border border-app-line bg-app-surface p-5 page-enter sm:gap-7 sm:p-9 md:grid-cols-[1fr_360px] md:items-center"
      >
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2 mb-3.5 break-words text-[10px] font-extrabold uppercase tracking-[0.14em] text-app-warm">
            <span className="w-1.5 h-1.5 rounded-full bg-app-warm" />
            Phản tư
          </div>
          <h1 className="break-words font-serif text-[clamp(28px,3.2vw,40px)] font-bold leading-[1.05] tracking-[-0.02em] text-app-ink mb-3">
            Nhật ký phản tư
          </h1>
          <p className="mb-5 max-w-[44ch] break-words text-sm leading-relaxed text-app-ink-soft sm:mb-6 sm:text-[14.5px]">
            Ghi lại điều bạn học được, điều biết ơn, và điều muốn cải thiện. Mỗi dòng là một dấu chân trên hành trình 12
            tuần.
          </p>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
            <Button
              onClick={() => setIsAddingReflection(true)}
              className="min-h-11 bg-app-warm text-white hover:bg-app-warm-hover hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.97] transition-all duration-200 rounded-full px-5 py-3 text-[13.5px] font-bold leading-tight shadow-lg shadow-app-warm/25 gap-2.5"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Viết entry mới
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const list = document.getElementById("journal-entries");
                if (list) list.scrollIntoView({ behavior: "smooth" });
              }}
              className="min-h-11 rounded-full px-5 py-3 text-[13.5px] font-semibold leading-tight gap-2 border-app-line text-app-ink hover:bg-app-bg hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200"
            >
              <Clock className="h-[15px] w-[15px]" aria-hidden="true" />
              Dòng thời gian
            </Button>
          </div>
        </div>
        <div className="relative h-24 w-24 overflow-hidden rounded-card self-start shadow-[0_18px_34px_-24px_rgba(23,21,15,0.5)] animate-[float_5s_ease-in-out_infinite] motion-reduce:animate-none md:h-auto md:w-auto md:self-stretch md:min-h-[210px] md:shadow-[0_24px_48px_-28px_rgba(23,21,15,0.5)]">
          <img
            src="/reflection_journal.png"
            alt="Nhật ký phản tư"
            className="w-full h-full object-cover absolute inset-0 dark:brightness-[0.85] dark:contrast-[1.05]"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-app-warm/10 to-transparent" />
        </div>
      </section>

      {/* ── Section 1 — Prompt phản tư (Req 15.1): heading h2 riêng + ranh giới ── */}
      <section data-reflection-section="prompt" aria-labelledby="reflection-prompt-heading" className="space-y-6">
        <header className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-app-warm">Phản tư</p>
          <h2
            id="reflection-prompt-heading"
            className="mt-1 break-words font-serif text-2xl font-bold tracking-[-0.01em] text-app-ink"
          >
            Ghi chép &amp; phản tư
          </h2>
          <p className="mt-1 max-w-[52ch] text-sm leading-relaxed text-app-ink-soft">
            Viết prompt phản tư mới và xem lại những ghi chép trước đây của bạn.
          </p>
        </header>

        {/* Search + Filters */}
        <div className="rounded-card border border-app-line bg-app-surface p-3.5 shadow-3xs sm:p-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A8A296]" aria-hidden="true" />
            <Input
              type="search"
              aria-label="Tìm kiếm nhật ký"
              placeholder="Tìm kiếm nhật ký…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 rounded-[13px] border-app-line bg-app-bg/45 pl-[42px] text-[13.5px] placeholder:text-[#A8A296]"
            />
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div className="min-w-0 space-y-2">
              <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-[#A8A296]">Loại</span>
              <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
                {(["all", "weekly-review", "freeform"] as const).map((type) => {
                  const isActive = filterType === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFilterType(type)}
                      className={cn(
                        "inline-flex min-h-11 min-w-0 items-center justify-center rounded-full border px-3 py-2 text-center text-xs font-semibold leading-tight transition-all duration-150 active:scale-[0.96] sm:min-h-11 sm:px-3.5",
                        isActive
                          ? "border-app-warm bg-[#FBF4EE] text-app-warm dark:bg-app-warm-soft/20"
                          : "border-app-line bg-app-surface text-app-ink-soft hover:border-app-warm/40 hover:text-app-warm",
                      )}
                    >
                      {type === "all" ? "Mọi loại" : type === "weekly-review" ? "Review tuần" : "Tự do"}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-w-0 space-y-2">
              <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-[#A8A296]">Tâm trạng</span>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
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
                        "inline-flex min-h-11 min-w-0 items-center justify-center rounded-full border px-3 py-2 text-center text-xs font-semibold leading-tight transition-all duration-150 active:scale-[0.96] sm:min-h-11 sm:px-3.5",
                        isActive
                          ? "border-app-warm bg-[#FBF4EE] text-app-warm dark:bg-app-warm-soft/20"
                          : "border-app-line bg-app-surface text-app-ink-soft hover:border-app-warm/40 hover:text-app-warm",
                      )}
                    >
                      {labels[mood]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <Dialog open={isAddingReflection} onOpenChange={setIsAddingReflection}>
          <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-3xl overflow-y-auto p-0">
            <div className="border-b border-app-line px-5 pb-4 pt-5 sm:px-6">
              <DialogHeader>
                <DialogTitle>Viết nhật ký mới</DialogTitle>
                <DialogDescription>
                  Ghi lại bài học, cảm xúc, bước tiến hoặc bất kỳ điều gì bạn không muốn để trôi qua.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="grid gap-5 px-5 py-5 sm:px-6">
              {pendingReflectionDraft ? (
                <div className="rounded-xl border border-app-warm-border bg-app-warm-soft p-4 text-sm text-app-warm-strong">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p>Tìm thấy bản nháp chưa lưu lúc {formatDraftSavedTime(pendingReflectionDraft.savedAt)}.</p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        type="button"
                        onClick={handleRestoreReflectionDraft}
                        className="min-h-11 transition-all duration-150 active:scale-[0.97] focus-visible:ring-app-warm focus-visible:ring-offset-2"
                      >
                        Khôi phục
                      </Button>
                      <Button
                        size="sm"
                        type="button"
                        variant="outline"
                        onClick={handleIgnoreReflectionDraft}
                        className="min-h-11 transition-all duration-150 active:scale-[0.97]"
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

                <p className="mb-4 break-words font-serif text-lg font-medium leading-7 text-app-warm-strong">
                  {JOURNAL_PROMPTS[0]}
                </p>

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
                      { value: "happy" as MoodValue, label: "Vui vẻ", icon: Smile },
                      { value: "neutral" as MoodValue, label: "Bình thường", icon: Meh },
                      { value: "sad" as MoodValue, label: "Suy tư", icon: Frown },
                    ].map((item) => {
                      const isActive = newReflection.mood === item.value;
                      const MoodIcon = item.icon;
                      return (
                        <button
                          key={item.value}
                          type="button"
                          aria-pressed={isActive}
                          onClick={() => setNewReflection({ ...newReflection, mood: item.value })}
                          className={cn(
                            "inline-flex min-h-11 items-center gap-2 rounded-full border px-3.5 py-2 text-sm transition-all duration-150 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-warm focus-visible:ring-offset-2",
                            isActive
                              ? "bg-app-warm text-white border-app-warm shadow-app-sm font-semibold"
                              : "bg-app-surface border-app-warm-border text-app-ink-soft hover:bg-app-warm-soft",
                          )}
                        >
                          <MoodIcon className="h-4 w-4" aria-hidden="true" />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-app-warm-border/70 bg-app-surface/70 p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs leading-relaxed text-app-ink-soft">
                      {newReflection.title && newReflection.content
                        ? "Đã đủ nội dung để lưu. Bản nháp sẽ được xoá sau khi lưu thành công."
                        : "Cần có tiêu đề và nội dung trước khi lưu nhật ký."}
                    </p>
                    <Button
                      onClick={handleAddReflection}
                      disabled={!newReflection.title || !newReflection.content}
                      className="min-h-11 w-full bg-app-warm text-white shadow-app-md shadow-app-warm/15 transition-all duration-150 hover:bg-app-warm-hover active:scale-[0.98] focus-visible:ring-app-warm focus-visible:ring-offset-2 sm:w-auto"
                    >
                      Lưu nhật ký
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-app-line bg-app-surface p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-app-ink-muted">Gợi ý bắt đầu</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {JOURNAL_PROMPTS.map((prompt, index) => (
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
                      className="min-h-[64px] rounded-card border border-app-line bg-app-bg px-3.5 py-3 text-left text-sm leading-relaxed text-app-ink-soft transition-all duration-150 hover:border-app-warm/30 hover:bg-app-warm-soft hover:text-app-warm active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-warm focus-visible:ring-offset-2"
                    >
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] text-app-ink-muted">
                        Gợi ý {index + 1}
                      </span>
                      <span>{prompt}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Empty / Loading / Error / Ready — máy trạng thái loại trừ lẫn nhau (Req 5, 15.3–15.6) */}
        <ScreenStateView
          state={journalScreenState.kind}
          onRetry={journalScreenState.retry}
          errorDescription="Chưa tải được nhật ký. Dữ liệu cục bộ của bạn vẫn được giữ nguyên. Hãy thử lại."
          loadingFallback={<ReflectionListSkeleton />}
          empty={
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
                className="min-h-11 bg-app-warm text-white hover:bg-app-warm-hover hover:-translate-y-0.5 hover:shadow-xl active:scale-[0.97] transition-all duration-200 rounded-full px-6 py-3.5 text-sm font-bold leading-tight shadow-lg shadow-app-warm/25 gap-2.5 mb-7"
              >
                <Plus className="h-4 w-4" strokeWidth={2.4} />
                Viết entry đầu tiên
              </Button>

              {/* Prompt Cards */}
              <div className="w-full max-w-[660px] border-t border-app-line pt-6">
                <div className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#A8A296] mb-3.5">
                  Gợi ý mở đầu
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(
                    [
                      {
                        title: "Điều tôi học được",
                        hint: "Một bài học hoặc nhận ra hôm nay.",
                        // Palette icon prompt trang trí (3 tông green/warm/gold cho biến
                        // thể trực quan); giữ literal có chủ đích — Reflection context chỉ
                        // dùng token warm, nên cặp green này để dạng màu trang trí (xem
                        // allowlist Property 2 / quy tắc color-context zoning).
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
                    ] as const
                  ).map((item) => (
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
                      className="min-h-28 text-left bg-app-bg-subtle dark:bg-app-bg border border-app-line rounded-[14px] p-4 cursor-pointer transition-all duration-150 hover:border-app-warm/50 hover:bg-[#FBF5EF] dark:hover:bg-app-warm-soft/20 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-warm focus-visible:ring-offset-2"
                    >
                      <span
                        className="flex w-[30px] h-[30px] rounded-[9px] items-center justify-center mb-2.5"
                        style={{ backgroundColor: item.iconBg, color: item.iconColor }}
                      >
                        {item.title === "Điều tôi học được" ? (
                          <BookOpen className="h-4 w-4" aria-hidden="true" />
                        ) : item.title === "Điều tôi biết ơn" ? (
                          <Heart className="h-4 w-4" aria-hidden="true" />
                        ) : (
                          <TrendingUp className="h-4 w-4" aria-hidden="true" />
                        )}
                      </span>
                      <span className="block text-[13px] font-bold text-app-ink mb-1">{item.title}</span>
                      <span className="block text-[11.5px] text-app-ink-soft leading-relaxed">{item.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          }
        >
          {/* Past Entries List */}
          <section id="journal-entries">
            <div className="mb-4 flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-app-ink-muted">Ghi chép cũ</p>
                <h3 className="mt-1 break-words font-serif text-2xl font-medium text-app-ink">
                  {filteredReflections.length} bài viết
                </h3>
              </div>
              {sortedReflections.length > 0 && (
                <p className="max-w-[52ch] text-xs leading-relaxed text-app-ink-soft sm:text-right">
                  Danh sách được sắp theo ngày mới nhất. Dùng bộ lọc phía trên để tìm lại review tuần hoặc cảm xúc cụ
                  thể.
                </p>
              )}
            </div>

            <div className="space-y-4">
              {filteredReflections.map((reflection) => {
                const mood = getMoodConfig(reflection.mood);
                const linkedGoal = reflection.linkedGoalId ? goalsById.get(reflection.linkedGoalId) : null;
                const phaseTone = getJournalPhaseTone();

                return (
                  <Card
                    key={reflection.id}
                    className="rounded-card border border-app-line bg-app-surface p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_46px_-30px_rgba(23,21,15,0.34)] sm:p-5 md:p-6"
                  >
                    <div className="flex min-w-0 items-start justify-between gap-3 sm:gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="break-words text-xs uppercase tracking-[0.14em] text-app-ink-muted">
                            {formatCalendarDate(reflection.date, "vi-VN", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                          <Badge
                            variant="outline"
                            className={cn("rounded-full px-2.5 py-0.5 text-xs leading-tight", mood.badge)}
                          >
                            {mood.label}
                          </Badge>
                          {reflection.entryType === "weekly-review" && (
                            <Badge
                              variant="outline"
                              className="rounded-full border-app-line bg-app-bg px-2.5 py-0.5 text-xs leading-tight text-app-ink-soft"
                            >
                              Review tuần
                            </Badge>
                          )}
                          {reflection.linkedWeekNumber && (
                            <Badge
                              variant="outline"
                              className={cn("rounded-full px-2.5 py-0.5 text-xs leading-tight", phaseTone.soft)}
                            >
                              Tuần {reflection.linkedWeekNumber}
                            </Badge>
                          )}
                        </div>

                        <h3 className="mt-2 break-words font-serif text-lg font-medium leading-snug text-app-ink">
                          {reflection.title}
                        </h3>

                        <p className="mt-2 max-w-[72ch] whitespace-pre-line break-words text-sm leading-relaxed text-app-ink">
                          {reflection.content}
                        </p>

                        {linkedGoal && (
                          <div className="mt-3 flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openLinkedCycle(reflection.linkedGoalId)}
                              className="min-h-11 whitespace-normal leading-tight"
                            >
                              Mở chu kỳ liên quan
                              <ArrowRight className="h-3.5 w-3.5 ml-1" aria-hidden="true" />
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
                            className="min-h-11 min-w-11 shrink-0 text-app-ink-soft hover:text-app-ink"
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
        </ScreenStateView>
      </section>

      {/* ── Section 2 — Dữ liệu tiến độ (Req 15.1): heading h2 riêng + ranh giới (border-t) ── */}
      <section
        data-reflection-section="progress"
        aria-labelledby="reflection-progress-heading"
        className="space-y-4 border-t border-app-line pt-8"
      >
        <header className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-app-warm">Tiến độ</p>
          <h2
            id="reflection-progress-heading"
            className="mt-1 break-words font-serif text-2xl font-bold tracking-[-0.01em] text-app-ink"
          >
            Dữ liệu tiến độ
          </h2>
          <p className="mt-1 max-w-[52ch] text-sm leading-relaxed text-app-ink-soft">
            Nhìn lại nhịp phản tư và tiến độ tuần trong chu kỳ 12 tuần của bạn.
          </p>
        </header>

        {weekCompletion && (
          <div className="relative flex flex-col items-start gap-7 overflow-hidden rounded-[20px] border border-app-warm/20 bg-[#F4ECE2] p-6 dark:bg-app-warm-soft/20 sm:flex-row sm:p-7">
            <div className="relative flex h-[74px] w-[74px] shrink-0 items-center justify-center rounded-2xl border border-app-warm/20 bg-app-surface text-app-warm">
              <CalendarCheck className="h-[34px] w-[34px]" strokeWidth={1.8} aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-app-warm">
                Tổng kết tuần {weekCompletion.weekNumber}
              </div>
              <h3 className="mb-1 break-words font-serif text-[21px] font-bold tracking-[-0.01em] text-app-ink">
                Tuần này bạn đã làm được
              </h3>
              <p className="break-words text-xs text-[#7A6E5E] dark:text-app-ink-soft">
                Viết một dòng phản tư mỗi ngày để giữ chuỗi và nhìn lại tiến bộ.
              </p>
              {journalStreak > 0 && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-app-warm/10 px-4 py-1.5">
                  <Flame className="h-4 w-4 text-app-warm" aria-hidden="true" />
                  <span className="text-xs font-semibold text-app-warm">{journalStreak} ngày viết liên tục</span>
                </div>
              )}
            </div>
            <div className="flex w-full flex-wrap items-end gap-6 shrink-0 sm:w-auto sm:gap-10">
              <div>
                <div className="font-serif text-[40px] font-extrabold leading-none text-app-ink tabular-nums">
                  <MotionCountUp value={weekCompletion.completed} />
                  <span className="text-lg font-bold text-[#A8A296]"> / {weekCompletion.total}</span>
                </div>
                <div className="mt-1.5 text-[11.5px] font-medium text-[#7A6E5E] dark:text-app-ink-soft">
                  task hoàn thành
                </div>
              </div>
              <div>
                <div className="font-serif text-[40px] font-extrabold leading-none text-app-warm tabular-nums">
                  <MotionCountUp value={weekCompletion.percent} suffix="%" />
                </div>
                <div className="mt-1.5 text-[11.5px] font-medium text-[#7A6E5E] dark:text-app-ink-soft">
                  tiến độ tuần
                </div>
                <div className="mt-2 h-1.5 w-[120px] overflow-hidden rounded-full bg-app-warm/15">
                  <div
                    className="h-full rounded-full bg-app-warm transition-all duration-300"
                    style={{ width: `${Math.max(2, weekCompletion.percent)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {hasReflections && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
          </div>
        )}

        {!weekCompletion && !hasReflections && (
          <EmptyState
            variant="dashed"
            title="Chưa có dữ liệu tiến độ"
            description="Dữ liệu tiến độ tuần và thống kê phản tư sẽ xuất hiện tại đây khi bạn bắt đầu chu kỳ 12 tuần và ghi lại phản tư."
          />
        )}
      </section>
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

/**
 * Skeleton per-screen cho vùng DANH SÁCH ghi chép cũ (slot `loadingFallback`
 * của `ScreenStateView`). Ánh xạ 1:1 nội dung thật của `<section id="journal-entries">`:
 * vùng tiêu đề (label "Ghi chép cũ" + heading số lượng) và vùng list các thẻ
 * reflection. Dùng cùng container `min-w-0`/`space-y-4` như nội dung thật để
 * không tràn viewport (Req 14.2, 14.3). Lớp trình bày thuần — không đọc/ghi
 * storage (Req 14.8). Tôn trọng R10: chỉ dùng `Skeleton` (shimmer tĩnh).
 */
function ReflectionListSkeleton() {
  return (
    <section className="min-w-0" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Đang tải ghi chép...</span>
      {/* Vùng tiêu đề */}
      <div className="mb-4 space-y-2">
        <Skeleton className="h-3 w-24 rounded-full bg-app-line/60" />
        <Skeleton className="h-7 w-40 rounded-lg bg-app-line/60" />
      </div>
      {/* Vùng list các thẻ ghi chép */}
      <div className="space-y-4">
        {[0, 1, 2, 3].map((index) => (
          <Skeleton key={index} className="h-36 rounded-card bg-app-line/60" />
        ))}
      </div>
    </section>
  );
}
