import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { CountUp } from "../components/ui/count-up";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Reveal } from "../components/ui/reveal";
import { Textarea } from "../components/ui/textarea";
import {
  celebrateAchievementUnlock,
  celebrateSpotlight,
  getAchievementCelebrationCopy,
  getUnlockedAchievements,
} from "../utils/experience";
import {
  APP_STORAGE_KEYS,
  UserData,
  addReflection,
  deleteReflection,
  formatCalendarDate,
  formatDateInputValue,
  getReviewDayLabel,
  getUserData,
  parseCalendarDate,
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
  const [userData, setUserData] = useState<UserData | null>(null);
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const data = getUserData();
    setUserData(data);
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
    const unlockedAchievements = getUnlockedAchievements(
      beforeData.achievements,
      afterData.achievements,
    );
    const achievementCopy = getAchievementCelebrationCopy(unlockedAchievements);

    celebrateSpotlight({ x: 0.8, y: 0.16 });
    if (achievementCopy) {
      window.setTimeout(() => {
        celebrateAchievementUnlock({ x: 0.5, y: 0.16 });
      }, 140);
    }

    toast.success("Một trang mới đã được giữ lại.", {
      description:
        achievementCopy?.title
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
    setUserData(afterData);
  };

  const handleDeleteReflection = (id: string) => {
    setReflectionToDelete(id);
  };

  const confirmDeleteReflection = () => {
    if (!reflectionToDelete) return;
    deleteReflection(reflectionToDelete);
    setReflectionToDelete(null);
    loadData();
  };

  const sortedReflections = useMemo(
    () => (userData ? sortReflectionsByDateDesc(userData.reflections) : []),
    [userData],
  );
  const goalsById = useMemo(
    () => new Map((userData?.goals ?? []).map((goal) => [goal.id, goal])),
    [userData],
  );

  const monthlyCount = useMemo(() => {
    if (!userData) return 0;
    const now = new Date();
    return sortedReflections.filter((reflection) => {
      const date = parseCalendarDate(reflection.date);
      return Boolean(
        date && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear(),
      );
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

  const recentMood = getMoodConfig(sortedReflections[0]?.mood);

  const currentStreak = useMemo(() => {
    if (sortedReflections.length === 0) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const writtenDays = new Set(
      sortedReflections.map((r) => {
        const d = parseCalendarDate(r.date);
        if (!d) return "";
        d.setHours(0, 0, 0, 0);
        return d.getTime().toString();
      }).filter(Boolean),
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
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(lower) ||
          r.content.toLowerCase().includes(lower),
      );
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
    <div className="space-y-8 pb-12">
      <AlertDialog open={Boolean(reflectionToDelete)} onOpenChange={(open) => { if (!open) setReflectionToDelete(null); }}>
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
        <Card className="hero-surface overflow-hidden border-0 text-white">
          <CardContent className="relative p-8 lg:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.12),_transparent_24%)] opacity-90" />

            <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_360px]">
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-1.5 text-sm text-white/82">
                  <NotebookPen className="h-4 w-4" />
                  Nhật ký phản tư
                </div>

                <div className="space-y-4">
                  <h1 className="max-w-3xl text-4xl font-bold tracking-[-0.05em] lg:text-5xl">
                    Một nơi đủ đẹp và đủ yên để bạn nhìn lại, gọi tên cảm xúc và giữ lại những điều đáng nhớ.
                  </h1>
                  <p className="max-w-2xl text-base leading-8 text-white/82 lg:text-lg">
                    Nhật ký ở đây không chỉ để lưu chữ. Nó là nơi gom lại bài học, cảm xúc, những chuyển động nhỏ
                    và cả cách bạn đang lớn lên qua từng ngày.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    className="border-white/18 bg-white text-slate-900 hover:bg-white/92"
                    onClick={() => setIsAddingReflection(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Viết nhật ký mới
                  </Button>
                </div>
              </div>

              <div className="rounded-[32px] border border-white/14 bg-white/12 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/60">
                  Nhịp viết hiện tại
                </p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                  {[
                    { label: "Tổng số bài", value: userData.reflections.length, note: "đã lưu trong hành trình" },
                    { label: "Tháng này", value: monthlyCount, note: "bài viết trong tháng hiện tại" },
                    { label: "Tâm trạng gần nhất", value: recentMood.label, note: "tín hiệu cảm xúc mới nhất" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-[24px] border border-white/10 bg-black/12 px-4 py-4"
                    >
                      <p className="text-xs uppercase tracking-[0.18em] text-white/55">{item.label}</p>
                      <p className="mt-2 text-2xl font-bold text-white">
                        {typeof item.value === "number" ? <CountUp value={item.value} /> : item.value}
                      </p>
                      <p className="mt-1 text-sm text-white/68">{item.note}</p>
                    </div>
                  ))}
                </div>
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
              <div className="space-y-2">
                <Label>Ngày</Label>
                <Input
                  type="date"
                  value={newReflection.date}
                  onChange={(event) =>
                    setNewReflection({ ...newReflection, date: event.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Tiêu đề</Label>
                <Input
                  placeholder="Ví dụ: Một ngày tôi lấy lại được nhịp"
                  value={newReflection.title}
                  onChange={(event) =>
                    setNewReflection({ ...newReflection, title: event.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
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
                      className={`rounded-[24px] border px-4 py-4 text-left transition-all ${
                        active
                          ? item.activeClass
                          : "border-white/70 bg-white/72 text-slate-500 hover:border-slate-200"
                      }`}
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-white/70">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="mt-3 text-sm font-semibold">{item.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Nội dung</Label>
              <Textarea
                placeholder="Viết về trải nghiệm, điều bạn học được, khoảnh khắc đáng nhớ hoặc điều bạn muốn nhắc mình sau này..."
                value={newReflection.content}
                onChange={(event) =>
                  setNewReflection({ ...newReflection, content: event.target.value })
                }
                rows={8}
                className="min-h-[220px]"
              />
            </div>

            <div className="rounded-[24px] border border-white/70 bg-white/72 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Gợi ý bắt đầu
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
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

            <Button className="w-full" onClick={handleAddReflection}>
              Lưu nhật ký
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * index }}
            >
              <Card className="relative overflow-hidden">
                <div
                  className={`absolute inset-x-5 top-0 h-20 rounded-b-[28px] bg-gradient-to-br ${item.color} blur-2xl`}
                />
                <CardHeader className="relative flex flex-row items-start justify-between pb-3">
                  <div>
                    <CardDescription>{item.title}</CardDescription>
                    <CardTitle className="mt-2 text-4xl">
                      <CountUp value={item.value} />
                    </CardTitle>
                  </div>
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${item.color}`}
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

      {sortedReflections.length === 0 ? (
        <Reveal delay={0.04}>
          <Card className="overflow-hidden">
          <CardContent className="p-10 text-center lg:p-14">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-violet-50 text-violet-700">
              <BookOpen className="h-10 w-10" />
            </div>
            <h2 className="mt-6 text-3xl font-bold text-slate-900">Chưa có trang nhật ký nào được mở ra</h2>
            <p className="mx-auto mt-3 max-w-2xl text-base text-slate-500">
              Hãy bắt đầu bằng một bài viết đầu tiên để lưu lại cảm xúc, bài học và những chuyển động nhỏ trên hành trình của bạn. Review tuần từ chu kỳ 12 tuần cũng sẽ tự động xuất hiện tại đây.
            </p>
            <Button className="mt-8" onClick={() => setIsAddingReflection(true)}>
              <Plus className="h-4 w-4" />
              Viết bài đầu tiên
            </Button>
          </CardContent>
          </Card>
        </Reveal>
      ) : (
        <Reveal delay={0.04} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            {latestWeeklyReview && (
              <Card className="overflow-hidden border-sky-200 bg-[linear-gradient(135deg,_rgba(239,246,255,0.96)_0%,_rgba(248,250,252,0.92)_100%)]">
                <CardContent className="p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/90 px-3 py-1.5 text-sm font-medium text-sky-700">
                        <Flag className="h-4 w-4" />
                        Review tuần mới nhất
                      </div>
                      <h3 className="mt-4 text-2xl font-bold text-slate-950">{latestWeeklyReview.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-slate-600">
                        {latestWeeklyReview.linkedGoalId ? goalsById.get(latestWeeklyReview.linkedGoalId)?.title : "Chu kỳ 12 tuần"}
                        {latestWeeklyReview.linkedWeekNumber ? ` • tuần ${latestWeeklyReview.linkedWeekNumber}` : ""}
                        {latestWeeklyReview.linkedGoalId && goalsById.get(latestWeeklyReview.linkedGoalId)?.twelveWeekSystem?.reviewDay
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

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Tìm kiếm nhật ký..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                {([
                  { value: "all", label: "Tất cả" },
                  { value: "weekly-review", label: "Review tuần" },
                  { value: "freeform", label: "Nhật ký tự do" },
                ] as const).map((item) => (
                  <Button
                    key={item.value}
                    size="sm"
                    variant={filterType === item.value ? "default" : "outline"}
                    onClick={() => setFilterType(item.value)}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
              <div className="flex gap-2">
                {(["", "happy", "neutral", "sad"] as const).map((mood) => {
                  const labels: Record<string, string> = { "": "Tất cả", happy: "Vui vẻ", neutral: "Bình thường", sad: "Suy tư" };
                  return (
                    <Button
                      key={mood}
                      size="sm"
                      variant={filterMood === mood ? "default" : "outline"}
                      onClick={() => setFilterMood(mood)}
                    >
                      {labels[mood]}
                    </Button>
                  );
                })}
              </div>
            </div>

            {filteredReflections.length === 0 && (sortedReflections.length > 0) && (
              <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 px-5 py-8 text-center text-sm text-slate-500">
                Không tìm thấy nhật ký nào phù hợp với bộ lọc hiện tại.
              </div>
            )}

            {filteredReflections.map((reflection, index) => {
              const mood = getMoodConfig(reflection.mood);
              const linkedGoal = reflection.linkedGoalId ? goalsById.get(reflection.linkedGoalId) : null;

              return (
                <motion.div
                  key={reflection.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="overflow-hidden">
                    <CardContent className="p-6 lg:p-7">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-2xl font-bold text-slate-900">{reflection.title}</h3>
                            <Badge variant="outline" className={`rounded-full px-3 py-1.5 ${mood.badge}`}>
                              <span className="mr-1.5">{mood.icon}</span>
                              {mood.label}
                            </Badge>
                            {reflection.entryType === "weekly-review" && (
                              <Badge variant="outline" className="rounded-full border-sky-200 bg-sky-50 px-3 py-1.5 text-sky-700">
                                Review tuần
                              </Badge>
                            )}
                            {reflection.linkedWeekNumber && (
                              <Badge variant="outline" className="rounded-full border-white/80 bg-white px-3 py-1.5 text-slate-600">
                                Tuần {reflection.linkedWeekNumber}
                              </Badge>
                            )}
                            {linkedGoal && (
                              <Badge variant="outline" className="rounded-full border-violet-200 bg-violet-50 px-3 py-1.5 text-violet-700">
                                {linkedGoal.title}
                              </Badge>
                            )}
                          </div>

                          <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
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
                          className="h-10 w-10 rounded-2xl text-slate-500 hover:text-red-600"
                          aria-label={`Xóa nhật ký ${reflection.title}`}
                          onClick={() => handleDeleteReflection(reflection.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="mt-5 rounded-[24px] border border-white/70 bg-white/72 p-5">
                        <p className="whitespace-pre-wrap text-sm leading-8 text-slate-600">
                          {reflection.content}
                        </p>
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
          </div>

          <div className="space-y-6 xl:sticky xl:top-28">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Streak hiện tại
                </p>
                <div className="mt-4 flex items-center gap-3 rounded-[20px] border border-violet-200 bg-violet-50 px-4 py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-violet-700">
                      <CountUp value={currentStreak} /> ngày
                    </p>
                    <p className="text-xs text-violet-500">
                      {currentStreak >= 3 ? "Nhịp viết đang rất tốt!" : currentStreak > 0 ? "Hãy duy trì đều hơn nhé." : "Bắt đầu streak hôm nay!"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Nhịp cảm xúc
                </p>
                <div className="mt-5 space-y-3">
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
                      className="flex items-center justify-between rounded-[20px] border border-white/70 bg-white/72 px-4 py-3"
                    >
                      <span className="text-sm font-medium text-slate-600">{item.label}</span>
                      <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${item.className}`}>
                        <CountUp value={item.value} />
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Viết tiếp khi bí ý
                </p>
                <div className="mt-5 space-y-3">
                  {JOURNAL_PROMPTS.map((prompt) => (
                    <div
                      key={prompt}
                      className="rounded-[20px] border border-white/70 bg-white/72 px-4 py-3 text-sm leading-7 text-slate-600"
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
