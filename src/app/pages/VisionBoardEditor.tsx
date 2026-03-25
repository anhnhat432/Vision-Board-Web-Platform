import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { useNavigate, useParams } from "react-router";
import { DndProvider, useDrag } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import {
  Heart,
  Image,
  LayoutGrid,
  MessageSquareQuote,
  Moon,
  Palette,
  Plus,
  Save,
  Sparkles,
  Star,
  Sun,
  Target,
  Trash2,
  Trophy,
  Wand2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import {
  celebrateAchievementUnlock,
  celebrateSpotlight,
  getAchievementCelebrationCopy,
  getUnlockedAchievements,
} from "../utils/experience";
import {
  VisionBoard,
  VisionBoardItem,
  addVisionBoard,
  getUserData,
  updateVisionBoard,
} from "../utils/storage";

interface DraggableItemProps {
  item: VisionBoardItem;
  onUpdate: (id: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
}

const ICON_COMPONENTS = {
  Star,
  Heart,
  Target,
  Trophy,
  Zap,
  Sun,
  Moon,
  Sparkles,
};

type IconName = keyof typeof ICON_COMPONENTS;

const ICON_OPTIONS = Object.keys(ICON_COMPONENTS) as IconName[];
const IMAGE_SUGGESTIONS = ["luxury workspace", "healthy morning", "freedom travel", "dream home"];
const QUOTE_SUGGESTIONS = [
  "Mỗi ngày tiến một chút vẫn là tiến lên.",
  "Kỷ luật là cây cầu nối tầm nhìn với kết quả.",
  "Tôi đang xây một cuộc sống mình thật sự muốn thức dậy mỗi sáng.",
];

function DraggableItem({ item, onUpdate, onDelete }: DraggableItemProps) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "board-item",
    item: { id: item.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  const handleDragEnd = (event: React.DragEvent) => {
    const rect = event.currentTarget.parentElement?.getBoundingClientRect();
    if (!rect) return;

    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    onUpdate(item.id, Math.max(0, Math.min(95, x)), Math.max(0, Math.min(95, y)));
  };

  const Icon = ICON_COMPONENTS[item.content as IconName] ?? Sparkles;

  return (
    <div
      ref={drag as unknown as React.Ref<HTMLDivElement>}
      draggable
      onDragEnd={handleDragEnd}
      className="absolute cursor-move transition-transform duration-300 hover:scale-[1.015]"
      style={{
        left: `${item.x}%`,
        top: `${item.y}%`,
        width: `${item.width}px`,
        opacity: isDragging ? 0.56 : 1,
      }}
    >
      <div className="group relative">
        {item.type === "image" && (
          <div className="overflow-hidden rounded-[26px] border border-white/85 bg-white/90 p-2 shadow-[0_28px_50px_-34px_rgba(15,23,42,0.48)] backdrop-blur-2xl">
            <ImageWithFallback
              src={item.content}
              alt="Phần tử bảng tầm nhìn"
              className="rounded-[20px] shadow-sm"
              style={{ width: `${item.width - 16}px` }}
            />
          </div>
        )}

        {item.type === "quote" && (
          <div
            className="rounded-[26px] border border-white/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.96)_0%,_rgba(248,250,252,0.92)_100%)] p-5 shadow-[0_28px_50px_-34px_rgba(15,23,42,0.45)] backdrop-blur-2xl"
            style={{ width: `${item.width}px` }}
          >
            <div className="flex items-center gap-2 text-violet-600">
              <MessageSquareQuote className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                Quote
              </span>
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-700">{item.content}</p>
          </div>
        )}

        {item.type === "icon" && (
          <div className="flex h-24 w-24 items-center justify-center rounded-[28px] bg-[linear-gradient(135deg,_rgba(109,40,217,0.96)_0%,_rgba(236,72,153,0.88)_100%)] text-white shadow-[0_28px_50px_-32px_rgba(109,40,217,0.62)]">
            <Icon className="h-10 w-10" />
          </div>
        )}

        <Button
          size="icon"
          variant="destructive"
          className="absolute -right-2 -top-2 h-8 w-8 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
          onClick={() => onDelete(item.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function VisionBoardEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [board, setBoard] = useState<VisionBoard | null>(null);
  const [boardName, setBoardName] = useState("");
  const [boardYear, setBoardYear] = useState(new Date().getFullYear().toString());
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [quoteText, setQuoteText] = useState("");
  const [iconName, setIconName] = useState<IconName>("Sparkles");
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    if (id) {
      const userData = getUserData();
      const existingBoard = userData.visionBoards.find((item) => item.id === id);
      if (existingBoard) {
        setBoard(existingBoard);
        setBoardName(existingBoard.name);
        setBoardYear(existingBoard.year);
      }
      return;
    }

    setBoard({
      id: "temp",
      name: "",
      year: new Date().getFullYear().toString(),
      items: [],
      createdAt: new Date().toISOString(),
    });
  }, [id]);

  const boardStats = useMemo(() => {
    if (!board) return { images: 0, quotes: 0, icons: 0 };

    return board.items.reduce(
      (acc, item) => {
        if (item.type === "image") acc.images += 1;
        if (item.type === "quote") acc.quotes += 1;
        if (item.type === "icon") acc.icons += 1;
        return acc;
      },
      { images: 0, quotes: 0, icons: 0 },
    );
  }, [board]);

  const handleSave = () => {
    if (!board || !boardName.trim()) return;

    const beforeData = getUserData();
    let savedBoardId = id ?? "";

    if (id) {
      updateVisionBoard(id, {
        name: boardName.trim(),
        year: boardYear.trim(),
        items: board.items,
      });
      savedBoardId = id;
    } else {
      savedBoardId = addVisionBoard({
        name: boardName.trim(),
        year: boardYear.trim(),
        items: board.items,
      });
    }

    const afterData = getUserData();
    const unlockedAchievements = getUnlockedAchievements(
      beforeData.achievements,
      afterData.achievements,
    );
    const achievementCopy = getAchievementCelebrationCopy(unlockedAchievements);

    celebrateSpotlight({ x: 0.84, y: 0.14 });
    if (achievementCopy) {
      window.setTimeout(() => {
        celebrateAchievementUnlock({ x: 0.5, y: 0.16 });
      }, 140);
    }

    toast.success(id ? "Canvas đã được làm mới." : "Board đã vào thư viện.", {
      description:
        achievementCopy?.title
          ? `${achievementCopy.title}. ${achievementCopy.description}`
          : id
            ? "Phiên bản mới nhất của board này đã sẵn sàng để bạn tiếp tục nuôi cảm hứng."
            : "Board mới của bạn đã được lưu và sẽ được spotlight ngay trong thư viện.",
    });

    navigate("/gallery", { state: { spotlightBoardId: savedBoardId } });
  };

  const handleAddImage = async () => {
    if (!searchQuery.trim() || !board) return;

    setIsSearching(true);
    const seed = encodeURIComponent(searchQuery.trim()) + Date.now();
    const imageUrl = `https://picsum.photos/seed/${seed}/480/360`;

    const newItem: VisionBoardItem = {
      id: `item_${Date.now()}`,
      type: "image",
      content: imageUrl,
      x: 10 + (board.items.length * 6) % 48,
      y: 12 + (board.items.length * 5) % 42,
      width: 220,
      height: 220,
    };

    setBoard({ ...board, items: [...board.items, newItem] });
    setSearchQuery("");
    setIsSearching(false);
    setIsAddingItem(false);
  };

  const handleAddQuote = () => {
    if (!quoteText.trim() || !board) return;

    const newItem: VisionBoardItem = {
      id: `item_${Date.now()}`,
      type: "quote",
      content: quoteText.trim(),
      x: 12 + (board.items.length * 5) % 50,
      y: 14 + (board.items.length * 4) % 40,
      width: 280,
      height: 120,
    };

    setBoard({ ...board, items: [...board.items, newItem] });
    setQuoteText("");
    setIsAddingItem(false);
  };

  const handleAddIcon = () => {
    if (!board) return;

    const newItem: VisionBoardItem = {
      id: `item_${Date.now()}`,
      type: "icon",
      content: iconName,
      x: 16 + (board.items.length * 5) % 50,
      y: 16 + (board.items.length * 4) % 42,
      width: 96,
      height: 96,
    };

    setBoard({ ...board, items: [...board.items, newItem] });
    setIsAddingItem(false);
  };

  const handleUpdateItemPosition = (itemId: string, x: number, y: number) => {
    if (!board) return;

    setBoard({
      ...board,
      items: board.items.map((item) => (item.id === itemId ? { ...item, x, y } : item)),
    });
  };

  const handleDeleteItem = (itemId: string) => {
    if (!board) return;
    setBoard({ ...board, items: board.items.filter((item) => item.id !== itemId) });
  };

  if (!board) return null;

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-8 pb-12">
        <Dialog open={isAddingItem} onOpenChange={setIsAddingItem}>
          <Card className="hero-surface overflow-hidden border-0 text-white">
            <CardContent className="relative p-8 lg:p-10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.16),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.12),_transparent_22%)] opacity-90" />

              <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_360px]">
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-1.5 text-sm text-white/82">
                    <Wand2 className="h-4 w-4" />
                    Vision Board Studio
                  </div>

                  <div className="space-y-4">
                    <h1 className="max-w-3xl text-4xl font-bold tracking-[-0.05em] lg:text-5xl">
                      Dựng một không gian hình ảnh khiến mục tiêu của bạn trở nên chạm được mỗi ngày.
                    </h1>
                    <p className="max-w-2xl text-base leading-8 text-white/82 lg:text-lg">
                      Kéo thả hình ảnh, câu nói và biểu tượng để tạo một canvas giàu cảm xúc,
                      rõ định hướng và đủ đẹp để bạn muốn quay lại thường xuyên.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_120px]">
                    <Input
                      placeholder="Tên bảng tầm nhìn của bạn"
                      value={boardName}
                      onChange={(event) => setBoardName(event.target.value)}
                      className="border-white/20 bg-white/14 text-lg font-semibold text-white placeholder:text-white/52"
                    />
                    <Input
                      type="number"
                      placeholder="Năm"
                      value={boardYear}
                      onChange={(event) => setBoardYear(event.target.value)}
                      className="border-white/20 bg-white/14 text-white placeholder:text-white/52"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      className="border-white/18 bg-white text-slate-900 hover:bg-white/92"
                      onClick={() => setIsAddingItem(true)}
                    >
                      <Plus className="h-4 w-4" />
                      Thêm phần tử
                    </Button>
                    <Button
                      variant="outline"
                      className="border-white/18 bg-white/12 text-white hover:bg-white/18 hover:text-white"
                      onClick={handleSave}
                      disabled={!boardName.trim()}
                    >
                      <Save className="h-4 w-4" />
                      Lưu board
                    </Button>
                  </div>
                </div>

                <div className="rounded-[32px] border border-white/14 bg-white/12 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl">
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/60">
                    Snapshot canvas
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                    {[
                      { label: "Tổng phần tử", value: board.items.length, note: "đang có trên canvas" },
                      { label: "Hình ảnh", value: boardStats.images, note: "nguồn cảm hứng trực quan" },
                      { label: "Quote + icon", value: boardStats.quotes + boardStats.icons, note: "điểm nhấn cảm xúc" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-[24px] border border-white/10 bg-black/12 px-4 py-4"
                      >
                        <p className="text-xs uppercase tracking-[0.18em] text-white/55">{item.label}</p>
                        <p className="mt-2 text-3xl font-bold text-white">{item.value}</p>
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
              <DialogTitle>Thêm vào bảng tầm nhìn</DialogTitle>
              <DialogDescription>
                Chọn loại phần tử phù hợp để làm board của bạn sống động và giàu ý nghĩa hơn.
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="image" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="image">
                  <Image className="h-4 w-4" />
                  Hình ảnh
                </TabsTrigger>
                <TabsTrigger value="quote">
                  <MessageSquareQuote className="h-4 w-4" />
                  Câu nói
                </TabsTrigger>
                <TabsTrigger value="icon">
                  <Sparkles className="h-4 w-4" />
                  Biểu tượng
                </TabsTrigger>
              </TabsList>

              <TabsContent value="image" className="space-y-5 pt-4">
                <div className="space-y-3">
                  <Input
                    placeholder="Tìm một vibe hình ảnh, ví dụ: dream office, healthy life..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && handleAddImage()}
                  />
                  <div className="flex flex-wrap gap-2">
                    {IMAGE_SUGGESTIONS.map((item) => (
                      <Button
                        key={item}
                        variant="outline"
                        size="sm"
                        onClick={() => setSearchQuery(item)}
                      >
                        {item}
                      </Button>
                    ))}
                  </div>
                </div>

                <Button className="w-full" onClick={handleAddImage} disabled={isSearching || !searchQuery.trim()}>
                  {isSearching ? "Đang thêm hình..." : "Thêm hình ảnh vào canvas"}
                </Button>
              </TabsContent>

              <TabsContent value="quote" className="space-y-5 pt-4">
                <Textarea
                  rows={4}
                  placeholder="Viết một câu nhắc nhở bạn muốn nhìn thấy mỗi ngày..."
                  value={quoteText}
                  onChange={(event) => setQuoteText(event.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  {QUOTE_SUGGESTIONS.map((item) => (
                    <Button
                      key={item}
                      variant="outline"
                      size="sm"
                      onClick={() => setQuoteText(item)}
                    >
                      {item}
                    </Button>
                  ))}
                </div>
                <Button className="w-full" onClick={handleAddQuote} disabled={!quoteText.trim()}>
                  Thêm quote vào canvas
                </Button>
              </TabsContent>

              <TabsContent value="icon" className="space-y-5 pt-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {ICON_OPTIONS.map((item) => {
                    const Icon = ICON_COMPONENTS[item];
                    const isActive = iconName === item;

                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setIconName(item)}
                        className={`rounded-[24px] border p-4 transition-all ${
                          isActive
                            ? "border-violet-300 bg-violet-50 text-violet-700 shadow-[0_18px_36px_-24px_rgba(109,40,217,0.35)]"
                            : "border-white/80 bg-white/72 text-slate-500 hover:border-violet-200 hover:text-violet-700"
                        }`}
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,_rgba(109,40,217,0.16)_0%,_rgba(236,72,153,0.12)_100%)]">
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="mt-3 text-sm font-semibold">{item}</div>
                      </button>
                    );
                  })}
                </div>
                <Button className="w-full" onClick={handleAddIcon}>
                  Thêm icon vào canvas
                </Button>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div
                className="relative min-h-[620px] overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.82),_transparent_24%),linear-gradient(135deg,_rgba(244,244,255,0.96)_0%,_rgba(251,244,255,0.94)_48%,_rgba(239,246,255,0.96)_100%)]"
                style={{ aspectRatio: "16/9" }}
              >
                <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] bg-[size:36px_36px] opacity-70" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(168,85,247,0.14),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(56,189,248,0.14),_transparent_22%)]" />

                {board.items.length === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center p-8">
                    <div className="max-w-lg rounded-[32px] border border-white/80 bg-white/82 p-8 text-center shadow-[0_32px_70px_-40px_rgba(15,23,42,0.42)] backdrop-blur-2xl">
                      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[24px] bg-violet-50 text-violet-700">
                        <Sparkles className="h-9 w-9" />
                      </div>
                      <h2 className="mt-6 text-3xl font-bold text-slate-900">
                        Canvas của bạn đang chờ câu chuyện đầu tiên
                      </h2>
                      <p className="mt-3 text-base text-slate-500">
                        Hãy bắt đầu bằng một hình ảnh đại diện, một câu nói khiến bạn rung động hoặc một biểu tượng để neo cảm xúc cho mục tiêu của mình.
                      </p>
                      <Button className="mt-8" onClick={() => setIsAddingItem(true)}>
                        <Plus className="h-4 w-4" />
                        Thêm phần tử đầu tiên
                      </Button>
                    </div>
                  </div>
                ) : (
                  board.items.map((item) => (
                    <DraggableItem
                      key={item.id}
                      item={item}
                      onUpdate={handleUpdateItemPosition}
                      onDelete={handleDeleteItem}
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6 xl:sticky xl:top-28">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-violet-50 text-violet-700">
                    <LayoutGrid className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Thành phần board</h3>
                    <p className="text-sm text-slate-500">
                      Một board tốt có đủ hình ảnh, biểu tượng và câu chữ nhắc hướng đi.
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {[
                    { label: "Hình ảnh", value: boardStats.images, color: "bg-violet-50 text-violet-700" },
                    { label: "Quote", value: boardStats.quotes, color: "bg-amber-50 text-amber-700" },
                    { label: "Icon", value: boardStats.icons, color: "bg-sky-50 text-sky-700" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-[22px] border border-white/70 bg-white/72 px-4 py-3"
                    >
                      <span className="text-sm font-medium text-slate-600">{item.label}</span>
                      <span className={`rounded-full px-3 py-1 text-sm font-semibold ${item.color}`}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-sky-50 text-sky-700">
                    <Palette className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Gợi ý bố cục</h3>
                    <p className="text-sm text-slate-500">
                      Một vài nguyên tắc nhỏ để board nhìn sang hơn và dễ chạm cảm xúc hơn.
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {[
                    "Đặt hình ảnh quan trọng nhất ở trung tâm hoặc góc trái trên.",
                    "Dùng 1-2 quote đủ mạnh thay vì quá nhiều chữ trên canvas.",
                    "Xen icon ở các khoảng trống để board có nhịp và điểm nhấn.",
                    "Giữ khoảng thở giữa các phần tử để tổng thể trông cao cấp hơn.",
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-[20px] border border-white/70 bg-white/72 px-4 py-3 text-sm leading-7 text-slate-600"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-emerald-50 text-emerald-700">
                    <Save className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Hoàn tất</h3>
                    <p className="text-sm text-slate-500">
                      Lưu board để xuất hiện trong thư viện và trở thành một phần của hành trình.
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3">
                  <Button onClick={handleSave} disabled={!boardName.trim()}>
                    <Save className="h-4 w-4" />
                    Lưu bảng tầm nhìn
                  </Button>
                  <Button variant="outline" onClick={() => setIsAddingItem(true)}>
                    <Plus className="h-4 w-4" />
                    Thêm phần tử mới
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DndProvider>
  );
}
