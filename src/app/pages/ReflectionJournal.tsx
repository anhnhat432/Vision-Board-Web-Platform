import { ArrowRight, Frown, Meh, MoreVertical, Plus, Search, Smile } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { EmptyState } from "@/app/components/states/EmptyState";
import { TabErrorBoundary } from "@/app/components/TabErrorBoundary";
import { ZenLeafIllustration } from "../components/illustrations";
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
  getUserData,
  parseCalendarDate,
  saveUserData,
  sortReflectionsByDateDesc,
} from "../utils/storage";
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
      <section className="surface-raised rounded-card border border-app-line bg-app-surface p-5 md:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-app-ink-muted">PHẢN TƯ</p>
            <h1 className="font-serif text-4xl font-medium leading-tight text-app-ink">Nhật ký phản tư</h1>
            <p className="max-w-2xl text-sm leading-6 text-app-ink-soft">
              Ghi lại điều bạn học được, biết ơn, và muốn cải thiện.
            </p>
          </div>
          {hasReflections && (
            <Button
              onClick={() => setIsAddingReflection(true)}
              className="bg-app-warm text-white hover:bg-app-warm hover:brightness-105 active:scale-[0.97] transition-all duration-150 focus-visible:ring-app-warm focus-visible:ring-offset-2 shrink-0 self-start sm:self-center shadow-md shadow-app-warm/15"
            >
              <Plus className="h-4 w-4 mr-2" />
              Viết nhật ký mới
            </Button>
          )}
        </div>

        {/* Toolbar */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative min-w-[200px] flex-1">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-ink-muted"
              aria-hidden="true"
            />
            <Input
              type="search"
              aria-label="Tìm kiếm nhật ký"
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
                  "rounded-full border border-app-line bg-app-surface px-3 py-1 text-xs transition-all duration-150 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-warm focus-visible:ring-offset-2",
                  filterType === type
                    ? "bg-app-warm-soft text-app-warm font-semibold border-app-warm/30 shadow-sm"
                    : "text-app-ink-soft hover:bg-app-bg",
                )}
              >
                {type === "all" ? "Mọi loại" : type === "weekly-review" ? "Review tuần" : "Tự do"}
              </button>
            ))}
            <span className="hidden sm:inline w-px h-5 bg-app-line" />
            {(["", "happy", "neutral", "sad"] as const).map((mood) => {
              const labels: Record<string, string> = {
                "": "Mọi tâm trạng",
                happy: "Vui vẻ",
                neutral: "Bình thường",
                sad: "Suy tư",
              };
              return (
                <button
                  key={mood}
                  type="button"
                  onClick={() => setFilterMood(mood)}
                  className={cn(
                    "rounded-full border border-app-line bg-app-surface px-3 py-1 text-xs transition-all duration-150 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-warm focus-visible:ring-offset-2",
                    filterMood === mood
                      ? "bg-app-warm-soft text-app-warm font-semibold border-app-warm/30 shadow-sm"
                      : "text-app-ink-soft hover:bg-app-bg",
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
              <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950">
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
                            ? "bg-app-warm text-white border-app-warm shadow-sm font-semibold"
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
                className="mt-6 w-full bg-app-warm text-white hover:bg-app-warm hover:brightness-105 active:scale-[0.98] transition-all duration-150 focus-visible:ring-app-warm focus-visible:ring-offset-2 shadow-md shadow-app-warm/15"
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
        <EmptyState
          variant="card"
          illustration={<ZenLeafIllustration className="w-full text-app-warm" />}
          title="Bắt đầu nhật ký của bạn"
          description="Nhật ký phản tư là nơi lưu giữ những suy nghĩ, bài học và cảm xúc quan trọng trên hành trình phát triển."
          actions={
            <Button
              onClick={() => setIsAddingReflection(true)}
              className="bg-app-warm text-white hover:bg-app-warm hover:brightness-105 active:scale-[0.98] transition-all duration-150 shadow-md shadow-app-warm/15"
            >
              <Plus className="h-4 w-4 mr-2" />
              Viết entry đầu tiên
            </Button>
          }
        />
      ) : (
        /* Past Entries List */
        <section>
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
                <Card key={reflection.id} className="rounded-card border border-app-line bg-app-surface p-5 md:p-6">
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
                          className="h-9 w-9 shrink-0 text-app-ink-soft hover:text-app-ink"
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
