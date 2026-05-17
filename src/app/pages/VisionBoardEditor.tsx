import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBeforeUnload, useBlocker, useNavigate, useParams } from "react-router";
import {
  Heart,
  Image,
  Globe,
  LayoutGrid,
  Link2,
  MessageSquareQuote,
  Moon,
  Palette,
  Plus,
  Save,
  Sparkles,
  Star,
  Sun,
  Target,
  Trophy,
  Type,
  Upload,
  Wand2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { EmptyOrdersIllustration } from "../components/illustrations";
import { UpgradePaywallDialog } from "../components/UpgradePaywallDialog";
import { VisionBoardCanvas } from "../components/visionBoard/VisionBoardCanvas";
import { SectionBlock } from "../components/layout/SectionBlock";
import { ProductVisual } from "../components/visuals/ProductVisual";
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
  type VisionBoard,
  type VisionBoardItem,
  type VisionBoardThemeId,
  addVisionBoard,
  calculateGoalProgress,
  getCurrentPlan,
  getUserData,
  updateVisionBoard,
} from "../utils/storage";
import { hasReachedLimit } from "../utils/feature-entitlements";
import { LIFE_AREAS, LIFE_AREA_LABELS } from "../utils/storage-constants";
import { IMAGE_FRAME_STYLES, QUOTE_FONT_STYLES, SIZE_PRESETS, VISION_BOARD_THEMES } from "../utils/vision-board-config";
import { useAuthContext } from "@/lib/auth/AuthContext";
import {
  createVisionBoard as backendCreateVisionBoard,
  updateVisionBoard as backendUpdateVisionBoard,
} from "@/services/visionBoardService";
import {
  getBackendVisionBoardId,
  saveVisionBoardLink,
} from "@/lib/api/visionBoardLinkStore";

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
type VisionBoardItemStyle = NonNullable<VisionBoardItem["style"]>;
type ImageFrameId = NonNullable<VisionBoardItemStyle["imageFrame"]>;
type QuoteFontId = NonNullable<VisionBoardItemStyle["quoteFont"]>;
type IconSizePreset = NonNullable<VisionBoardItemStyle["sizePreset"]>;

const ICON_OPTIONS = Object.keys(ICON_COMPONENTS) as IconName[];
const IMAGE_SUGGESTIONS = ["không gian làm việc đẹp", "buổi sáng khỏe mạnh", "du lịch tự do", "ngôi nhà mơ ước"];
const QUOTE_SUGGESTIONS = [
  "Mỗi ngày tiến một chút vẫn là tiến lên.",
  "Kỷ luật là cây cầu nối tầm nhìn với kết quả.",
  "Tôi đang xây một cuộc sống mình thật sự muốn thức dậy mỗi sáng.",
];

const CURATED_IMAGES: Array<{ label: string; url: string }> = [
  { label: "Không gian", url: "https://picsum.photos/seed/vision-workspace/480/360" },
  { label: "Bình minh", url: "https://picsum.photos/seed/vision-sunrise/480/360" },
  { label: "Du lịch", url: "https://picsum.photos/seed/vision-freedom-travel/480/360" },
  { label: "Nhà", url: "https://picsum.photos/seed/vision-dream-home/480/360" },
  { label: "Vận động", url: "https://picsum.photos/seed/vision-fitness-run/480/360" },
  { label: "Thiên nhiên", url: "https://picsum.photos/seed/vision-nature-forest/480/360" },
  { label: "Thành phố", url: "https://picsum.photos/seed/vision-city-skyline/480/360" },
  { label: "Biển", url: "https://picsum.photos/seed/vision-ocean-beach/480/360" },
  { label: "Sách", url: "https://picsum.photos/seed/vision-books-study/480/360" },
  { label: "Ẩm thực", url: "https://picsum.photos/seed/vision-healthy-food/480/360" },
  { label: "Nghệ thuật", url: "https://picsum.photos/seed/vision-creative-art/480/360" },
  { label: "Vườn", url: "https://picsum.photos/seed/vision-garden-bloom/480/360" },
];

function createImageItem(
  content: string,
  items: VisionBoardItem[],
  lifeArea: string | null,
  frame: ImageFrameId,
): VisionBoardItem {
  return {
    id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: "image",
    content,
    x: 10 + (items.length * 6) % 48,
    y: 12 + (items.length * 5) % 42,
    width: SIZE_PRESETS.M.width,
    height: SIZE_PRESETS.M.width,
    lifeAreaId: lifeArea ?? undefined,
    style: { sizePreset: "M", imageFrame: frame },
  };
}

function formatShortDate(iso: string): string | null {
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return null;
  }
}

// Upload hardening constants — module scope so they are not recreated on each render
const MAX_SOURCE_BYTES = 5 * 1024 * 1024; // 5 MB source file limit (compression handles reduction)
const MAX_COMPRESSED_CHARS = 600_000;     // ~450 KB actual image data after base64 overhead
const CANVAS_MAX_WIDTH = 1200;
const CANVAS_MAX_HEIGHT = 900;

/**
 * Compress an image File to a JPEG data URL via an offscreen canvas.
 * Rejects with a typed error string if the file cannot be decoded or if
 * the result is still too large after compression.
 */
function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read_failed"));
    reader.onload = (evt) => {
      const raw = evt.target?.result;
      if (typeof raw !== "string") {
        reject(new Error("invalid_result"));
        return;
      }
      const img = new window.Image();
      img.onerror = () => reject(new Error("decode_failed"));
      img.onload = () => {
        const scale = Math.min(1, CANVAS_MAX_WIDTH / img.width, CANVAS_MAX_HEIGHT / img.height);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("canvas_unavailable"));
          return;
        }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        const compressed = canvas.toDataURL("image/jpeg", 0.82);
        if (compressed.length > MAX_COMPRESSED_CHARS) {
          reject(new Error("too_large_after_compress"));
          return;
        }
        resolve(compressed);
      };
      img.src = raw;
    };
    reader.readAsDataURL(file);
  });
}

export function VisionBoardEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const [board, setBoard] = useState<VisionBoard | null>(null);
  const [isResolvingBoard, setIsResolvingBoard] = useState(Boolean(id));
  const [boardName, setBoardName] = useState("");
  const [boardYear, setBoardYear] = useState(new Date().getFullYear().toString());
  const [themeId, setThemeId] = useState<VisionBoardThemeId>("aurora");
  const [showZones, setShowZones] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [quoteText, setQuoteText] = useState("");
  const [iconName, setIconName] = useState<IconName>("Sparkles");
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [selectedLifeArea, setSelectedLifeArea] = useState<string | null>(null);
  const [selectedImageFrame, setSelectedImageFrame] = useState<ImageFrameId>("shadow");
  const [selectedQuoteFont, setSelectedQuoteFont] = useState<QuoteFontId>("default");
  const [selectedIconSize, setSelectedIconSize] = useState<IconSizePreset>("M");
  const [isSearching, setIsSearching] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isVisionBoardLimitPaywallOpen, setIsVisionBoardLimitPaywallOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const blocker = useBlocker(hasUnsavedChanges);

  const handleBeforeUnload = useCallback(
    (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    },
    [hasUnsavedChanges],
  );

  useBeforeUnload(handleBeforeUnload);

  useEffect(() => {
    if (!isAddingItem) {
      setSelectedGoalId(null);
      setSelectedLifeArea(null);
      setSelectedImageFrame("shadow");
      setSelectedQuoteFont("default");
      setSelectedIconSize("M");
    }
  }, [isAddingItem]);

  useEffect(() => {
    if (id) {
      const userData = getUserData();
      const existingBoard = userData.visionBoards.find((item) => item.id === id);
      if (existingBoard) {
        setBoard(existingBoard);
        setBoardName(existingBoard.name);
        setBoardYear(existingBoard.year);
        setThemeId(existingBoard.theme ?? "aurora");
        setIsResolvingBoard(false);
        return;
      }

      toast.info("Vision board này không còn tồn tại. Đang đưa bạn về thư viện.");
      navigate("/gallery", { replace: true });
      return;
    }

    setBoard({
      id: "temp",
      name: "",
      year: new Date().getFullYear().toString(),
      items: [],
      createdAt: new Date().toISOString(),
    });
    setThemeId("aurora");
    setIsResolvingBoard(false);
  }, [id, navigate]);

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

  const goalsById = Object.fromEntries(
    getUserData().goals.map((goal) => [
      goal.id,
      {
        title: goal.title,
        category: goal.category,
        deadline: goal.deadline,
        progress: calculateGoalProgress(goal),
      },
    ]),
  );

  const handleSave = () => {
    if (!board || !boardName.trim()) return;

    const beforeData = getUserData();
    if (!id && hasReachedLimit(beforeData, "maxVisionBoards")) {
      setIsVisionBoardLimitPaywallOpen(true);
      return;
    }

    let savedBoardId = id ?? "";
    const payload = {
      name: boardName.trim(),
      year: boardYear.trim(),
      items: board.items,
      theme: themeId,
    };

    if (id) {
      const updated = updateVisionBoard(id, payload);
      if (!updated) return;
      savedBoardId = id;
    } else {
      const newId = addVisionBoard(payload);
      if (!newId) return;
      savedBoardId = newId;
    }

    // Fire-and-forget backend sync
    if (user) {
      const itemsPayload = board.items.map(({ type, content, x, y, width, height, lifeAreaId, style }) => ({
        type,
        content,
        x,
        y,
        width,
        height,
        lifeAreaId,
        style,
      }));

      const backendId = getBackendVisionBoardId(savedBoardId);
      if (backendId) {
        void backendUpdateVisionBoard(backendId, {
          name: boardName.trim(),
          year: boardYear.trim(),
          items: itemsPayload,
          theme: themeId,
        }).catch((err: unknown) => {
          console.warn("Backend vision board update failed silently.", err);
        });
      } else {
        void backendCreateVisionBoard({
          name: boardName.trim(),
          year: boardYear.trim(),
          items: itemsPayload,
          theme: themeId,
        })
          .then((created) => {
            saveVisionBoardLink(savedBoardId, created.id);
          })
          .catch((err: unknown) => {
            console.warn("Backend vision board creation failed silently.", err);
          });
      }
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

    toast.success(id ? "Bảng đã được làm mới." : "Vision board đã vào thư viện.", {
      description:
        achievementCopy?.title
          ? `${achievementCopy.title}. ${achievementCopy.description}`
          : id
            ? "Phiên bản mới nhất của bảng này đã sẵn sàng để bạn tiếp tục nuôi cảm hứng."
            : "Vision board mới của bạn đã được lưu và sẽ được nổi bật ngay trong thư viện.",
    });

    setHasUnsavedChanges(false);
    navigate("/gallery", { state: { spotlightBoardId: savedBoardId } });
  };

  const handleAddImage = async () => {
    if (!searchQuery.trim() || !board) return;

    setIsSearching(true);
    const seed = encodeURIComponent(searchQuery.trim()) + Date.now();
    const imageUrl = `https://picsum.photos/seed/${seed}/480/360`;

    const newItem = createImageItem(imageUrl, board.items, selectedLifeArea, selectedImageFrame);

    setBoard({ ...board, items: [...board.items, newItem] });
    setSearchQuery("");
    setIsSearching(false);
    setIsAddingItem(false);
    setHasUnsavedChanges(true);
  };

  const handleAddImageFromUrl = () => {
    if (!board) return;
    const trimmed = imageUrl.trim();
    if (!trimmed) return;

    if (!/^https?:\/\/.+\..+/i.test(trimmed)) {
      toast.error("URL không hợp lệ. Vui lòng nhập link bắt đầu bằng https://");
      return;
    }

    const newItem = createImageItem(trimmed, board.items, selectedLifeArea, selectedImageFrame);

    setBoard({ ...board, items: [...board.items, newItem] });
    setImageUrl("");
    setIsAddingItem(false);
    setHasUnsavedChanges(true);
  };

  const handleAddCuratedImage = (url: string) => {
    if (!board) return;

    const newItem = createImageItem(url, board.items, selectedLifeArea, selectedImageFrame);

    setBoard({ ...board, items: [...board.items, newItem] });
    setIsAddingItem(false);
    setHasUnsavedChanges(true);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset input so the same file can be re-selected later
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("File không hợp lệ. Vui lòng chọn file ảnh (JPG, PNG, WEBP...).");
      return;
    }

    if (file.size > MAX_SOURCE_BYTES) {
      toast.error("Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 5 MB.");
      return;
    }

    void compressImageFile(file)
      .then((dataUrl) => {
        setBoard((prev) => {
          if (!prev) return prev;
          const newItem = createImageItem(dataUrl, prev.items, selectedLifeArea, selectedImageFrame);
          return { ...prev, items: [...prev.items, newItem] };
        });
        setIsAddingItem(false);
        setHasUnsavedChanges(true);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "";
        if (msg === "too_large_after_compress") {
          toast.error("Ảnh vẫn còn quá lớn sau khi nén. Vui lòng thử ảnh nhỏ hơn hoặc ảnh có độ nét thấp hơn.");
        } else {
          toast.error("Không thể xử lý ảnh. Vui lòng thử lại với ảnh khác.");
        }
      });
  };

  const handleAddQuote = () => {
    if (!quoteText.trim() || !board) return;

    const newItem: VisionBoardItem = {
      id: `item_${Date.now()}`,
      type: "quote",
      content: quoteText.trim(),
      x: 12 + (board.items.length * 5) % 50,
      y: 14 + (board.items.length * 4) % 40,
      width: SIZE_PRESETS.L.width,
      height: 120,
      lifeAreaId: selectedLifeArea ?? undefined,
      style: { sizePreset: "L", quoteFont: selectedQuoteFont },
    };

    setBoard({ ...board, items: [...board.items, newItem] });
    setQuoteText("");
    setIsAddingItem(false);
    setHasUnsavedChanges(true);
  };

  const handleAddGoalCard = () => {
    if (!board || !selectedGoalId) return;

    const goal = getUserData().goals.find((item) => item.id === selectedGoalId);
    if (!goal) {
      toast.error("Mục tiêu không còn tồn tại.");
      return;
    }

    const newItem: VisionBoardItem = {
      id: `item_${Date.now()}`,
      type: "goal_card",
      content: selectedGoalId,
      x: 10 + (board.items.length * 6) % 48,
      y: 12 + (board.items.length * 5) % 42,
      width: SIZE_PRESETS.M.width,
      height: 140,
      lifeAreaId: goal.category,
      style: { sizePreset: "M" },
    };

    setBoard({ ...board, items: [...board.items, newItem] });
    setSelectedGoalId(null);
    setIsAddingItem(false);
    setHasUnsavedChanges(true);
    toast.success(`Đã ghim mục tiêu "${goal.title}" lên bảng.`);
  };

  const handleAddIcon = () => {
    if (!board) return;

    const iconWidth = SIZE_PRESETS[selectedIconSize].width;
    const newItem: VisionBoardItem = {
      id: `item_${Date.now()}`,
      type: "icon",
      content: iconName,
      x: 16 + (board.items.length * 5) % 50,
      y: 16 + (board.items.length * 4) % 42,
      width: iconWidth,
      height: iconWidth,
      style: { sizePreset: selectedIconSize },
    };

    setBoard({ ...board, items: [...board.items, newItem] });
    setIsAddingItem(false);
    setHasUnsavedChanges(true);
  };

  const handleUpdateItemPosition = (itemId: string, x: number, y: number) => {
    if (!board) return;

    setBoard({
      ...board,
      items: board.items.map((item) => (item.id === itemId ? { ...item, x, y } : item)),
    });
    setHasUnsavedChanges(true);
  };

  const handleDeleteItem = (itemId: string) => {
    if (!board) return;
    setBoard({ ...board, items: board.items.filter((item) => item.id !== itemId) });
    setSelectedItemId((current) => (current === itemId ? null : current));
    setHasUnsavedChanges(true);
  };

  if (isResolvingBoard) return null;

  if (!board) return null;

  return (
      <div className="stack-section pb-12">
        <UpgradePaywallDialog
          open={isVisionBoardLimitPaywallOpen}
          onOpenChange={setIsVisionBoardLimitPaywallOpen}
          context="plan"
          currentPlan={getCurrentPlan(getUserData())}
          title="Bạn đã có 1 bảng tầm nhìn"
          description="Nâng cấp Plus để tạo thêm bảng tầm nhìn. Dữ liệu hiện có vẫn được giữ nguyên."
          source="paywall_dialog"
        />
        <AlertDialog
          open={blocker.state === "blocked"}
          onOpenChange={(open) => {
            if (!open && blocker.state === "blocked") {
              blocker.reset();
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Rời khỏi bảng khi chưa lưu?</AlertDialogTitle>
              <AlertDialogDescription>
                Bạn đang có thay đổi chưa được lưu. Nếu rời trang bây giờ, các thay đổi trên bảng sẽ bị mất.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  if (blocker.state === "blocked") blocker.reset();
                }}
              >
                Ở lại
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={() => {
                  if (blocker.state === "blocked") blocker.proceed();
                }}
              >
                Rời khỏi trang
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={isAddingItem} onOpenChange={setIsAddingItem}>
          <Card className="overflow-hidden">
            <CardContent className="relative p-5 sm:p-6 lg:p-8">
              <div className="relative z-10 grid gap-[var(--space-section)] xl:grid-cols-[minmax(0,1.15fr)_360px]">
                <div className="stack-section">
                  <div className="inline-flex items-center gap-2 rounded-[var(--r-pill)] border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-1.5 text-sm text-muted-foreground">
                    <Wand2 className="h-4 w-4" />
                    Dear Our Future Studio
                  </div>

                  <div className="stack-stack">
                    <h1 className="max-w-3xl text-3xl font-semibold leading-[1.1] tracking-[-0.018em] text-foreground sm:text-4xl md:text-5xl">
                      Dựng một <span className="text-gradient-vibrant">không gian hình ảnh</span> khiến mục tiêu của bạn trở nên chạm được mỗi ngày.
                    </h1>
                    <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                      Kéo thả hình ảnh, câu nói và biểu tượng để tạo một bảng giàu cảm xúc,
                      rõ định hướng và đủ đẹp để bạn muốn quay lại thường xuyên.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_120px]">
                    <Input
                      placeholder="Tên vision board của bạn"
                      value={boardName}
                      onChange={(event) => { setBoardName(event.target.value); setHasUnsavedChanges(true); }}
                      className="text-lg font-semibold"
                    />
                    <Input
                      type="number"
                      placeholder="Năm"
                      value={boardYear}
                      onChange={(event) => { setBoardYear(event.target.value); setHasUnsavedChanges(true); }}
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button glow onClick={() => setIsAddingItem(true)}>
                      <Plus className="h-4 w-4" />
                      Thêm phần tử
                    </Button>
                    <Button variant="outline" onClick={handleSave} disabled={!boardName.trim()}>
                      <Save className="h-4 w-4" />
                      Lưu bảng
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Không gian</span>
                    {VISION_BOARD_THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => {
                          setThemeId(theme.id);
                          setHasUnsavedChanges(true);
                        }}
                        className={`h-7 w-7 rounded-full border-2 transition-all ${
                          themeId === theme.id ? "scale-110 border-foreground" : "border-slate-300 hover:border-slate-500"
                        }`}
                        style={{ background: theme.preview.gradient }}
                        aria-label={theme.label}
                        title={theme.label}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => setShowZones((prev) => !prev)}
                      className={`ml-2 rounded-full border px-3 py-1 text-xs font-medium ${
                        showZones
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-300 bg-white/70 text-slate-600 hover:bg-white"
                      }`}
                    >
                      {showZones ? "Ẩn vùng life area" : "Hiện vùng life area"}
                    </button>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Trên điện thoại, bạn có thể chạm giữ rồi rê để di chuyển các phần tử trên bảng.
                  </p>
                </div>

                <div className="hidden xl:block rounded-[var(--r-card)] border border-[color:var(--border)] bg-[color:var(--muted)] p-6 shadow-sm">
                  <ProductVisual variant="vision" className="mb-5 min-h-[180px]" />
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    Tóm tắt bảng
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                    {[
                      { label: "Tổng phần tử", value: board.items.length, note: "đang có trên bảng" },
                      { label: "Hình ảnh", value: boardStats.images, note: "nguồn cảm hứng trực quan" },
                      { label: "Trích dẫn + biểu tượng", value: boardStats.quotes + boardStats.icons, note: "điểm nhấn cảm xúc" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-[var(--r-card)] border border-[color:var(--border)] bg-card px-4 py-4"
                      >
                        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{item.label}</p>
                        <p className="mt-2 text-3xl font-bold text-foreground">{item.value}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{item.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <DialogContent className="max-w-3xl overflow-y-auto max-h-[85vh]">
            <DialogHeader>
              <DialogTitle>Thêm vào vision board</DialogTitle>
              <DialogDescription>
                Chọn loại phần tử phù hợp để làm bảng của bạn sống động và giàu ý nghĩa hơn.
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="image" className="mt-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="image">
                  <Image className="h-4 w-4" />
                  Hình ảnh
                </TabsTrigger>
                <TabsTrigger value="quote">
                  <MessageSquareQuote className="h-4 w-4" />
                  Câu nói
                </TabsTrigger>
                <TabsTrigger value="goal_card">
                  <Target className="h-4 w-4" />
                  Mục tiêu
                </TabsTrigger>
                <TabsTrigger value="icon">
                  <Sparkles className="h-4 w-4" />
                  Biểu tượng
                </TabsTrigger>
              </TabsList>

              <TabsContent value="image" className="stack-stack pt-4">
                <div className="stack-tight">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Upload className="h-4 w-4" />
                    Tải ảnh từ thiết bị
                  </div>
                  <input
                    ref={uploadInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => uploadInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4" />
                    Chọn ảnh từ máy / điện thoại
                  </Button>
                  <p className="text-xs text-slate-400">Hỗ trợ JPG, PNG, WEBP, GIF — tối đa 5 MB (ảnh sẽ được nén tự động)</p>
                </div>

                <div className="stack-tight">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Link2 className="h-4 w-4" />
                    Dán URL hình ảnh
                  </div>
                  <Input
                    placeholder="https://example.com/my-image.jpg"
                    value={imageUrl}
                    onChange={(event) => setImageUrl(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && handleAddImageFromUrl()}
                  />
                  <Button className="w-full" onClick={handleAddImageFromUrl} disabled={!imageUrl.trim()}>
                    Thêm ảnh từ URL
                  </Button>
                </div>

                <div className="stack-tight">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Image className="h-4 w-4" />
                    Chọn từ thư viện gợi ý
                  </div>
                  <div className="grid max-h-52 grid-cols-3 gap-2 overflow-y-auto rounded-[var(--r-tile)] sm:grid-cols-4">
                    {CURATED_IMAGES.map((img) => (
                      <button
                        key={img.label}
                        type="button"
                        className="group relative overflow-hidden rounded-[var(--r-tile)] border border-white/70 transition-colors transition-shadow duration-150 hover:border-violet-300 hover:shadow-md"
                        onClick={() => handleAddCuratedImage(img.url)}
                      >
                        <ImageWithFallback
                          src={img.url}
                          alt={img.label}
                          className="aspect-[4/3] w-full object-cover"
                        />
                        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5 text-xs font-medium text-white">
                          {img.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="stack-tight">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Globe className="h-4 w-4" />
                    Tìm theo cảm giác
                  </div>
                  <Input
                    placeholder="Tìm một cảm giác hình ảnh, ví dụ: văn phòng mơ ước, sống khỏe..."
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
                  <div className="stack-tight border-t border-slate-100 pt-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <LayoutGrid className="h-4 w-4" />
                      Gắn ảnh vào vùng nào? <span className="text-xs font-normal text-slate-400">(tùy chọn)</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {LIFE_AREAS.map((area) => (
                        <button
                          key={area.name}
                          type="button"
                          onClick={() => setSelectedLifeArea((prev) => (prev === area.name ? null : area.name))}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                            selectedLifeArea === area.name
                              ? "border-violet-400 bg-violet-50 text-violet-700"
                              : "border-slate-200 bg-white text-slate-600 hover:border-violet-200"
                          }`}
                        >
                          {LIFE_AREA_LABELS[area.name]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="stack-tight">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <Palette className="h-4 w-4" />
                      Khung ảnh
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {IMAGE_FRAME_STYLES.map((frame) => (
                        <button
                          key={frame.id}
                          type="button"
                          onClick={() => setSelectedImageFrame(frame.id)}
                          className={`rounded-md border px-3 py-1.5 text-xs font-medium ${
                            selectedImageFrame === frame.id
                              ? "border-violet-400 bg-violet-50 text-violet-700"
                              : "border-slate-200 bg-white text-slate-600 hover:border-violet-200"
                          }`}
                        >
                          {frame.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button variant="outline" className="w-full" onClick={handleAddImage} disabled={isSearching || !searchQuery.trim()}>
                    {isSearching ? "Đang thêm hình..." : "Thêm hình theo cảm giác"}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="quote" className="stack-stack pt-4">
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
                <div className="stack-tight">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Type className="h-4 w-4" />
                    Kiểu chữ
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {QUOTE_FONT_STYLES.map((font) => (
                      <button
                        key={font.id}
                        type="button"
                        onClick={() => setSelectedQuoteFont(font.id)}
                        className={`rounded-lg border p-3 text-left transition ${
                          selectedQuoteFont === font.id
                            ? "border-violet-400 bg-violet-50"
                            : "border-slate-200 bg-white hover:border-violet-200"
                        }`}
                      >
                        <p
                          className={`text-base ${font.className}`}
                          style={font.fontFamily ? { fontFamily: font.fontFamily } : undefined}
                        >
                          Aa
                        </p>
                        <p className="mt-1 text-xs text-slate-500">{font.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <Button className="w-full" onClick={handleAddQuote} disabled={!quoteText.trim()}>
                  Thêm câu nói vào bảng
                </Button>
              </TabsContent>

              <TabsContent value="goal_card" className="stack-stack pt-4">
                {(() => {
                  const userData = getUserData();
                  const goals = userData.goals;

                  if (goals.length === 0) {
                    return (
                      <div className="rounded-[var(--r-card)] border border-violet-100 bg-violet-50/40 p-6 text-center">
                        <Target className="mx-auto h-10 w-10 text-violet-400" />
                        <p className="mt-3 text-base font-semibold text-slate-900">
                          Bạn chưa có mục tiêu nào để ghim lên bảng
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Hãy tạo một SMART goal trước, rồi quay lại để ghim mục tiêu thành phần tử trên Vision Board.
                        </p>
                        <Button
                          className="mt-4"
                          onClick={() => {
                            setIsAddingItem(false);
                            navigate("/goals");
                          }}
                        >
                          Đi tới Mục tiêu
                        </Button>
                      </div>
                    );
                  }

                  const pinnedGoalIds = new Set(
                    board?.items.filter((item) => item.type === "goal_card").map((item) => item.content) ?? [],
                  );
                  const availableGoals = goals.filter((goal) => !pinnedGoalIds.has(goal.id));

                  return (
                    <>
                      <p className="text-sm text-slate-500">
                        Chọn một mục tiêu để ghim lên bảng. Card sẽ tự cập nhật khi tiến độ thay đổi.
                      </p>
                      <div className="grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                        {availableGoals.map((goal) => {
                          const area = LIFE_AREAS.find((item) => item.name === goal.category);
                          const areaLabel = LIFE_AREA_LABELS[goal.category] ?? goal.category;
                          const progress = calculateGoalProgress(goal);
                          const isActive = selectedGoalId === goal.id;

                          return (
                            <button
                              key={goal.id}
                              type="button"
                              onClick={() => setSelectedGoalId(goal.id)}
                              className={`rounded-[var(--r-card)] border p-3 text-left transition ${
                                isActive
                                  ? "border-violet-400 bg-violet-50 ring-1 ring-violet-300"
                                  : "border-slate-200 bg-white hover:border-violet-200"
                              }`}
                            >
                              {area && (
                                <span
                                  className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                                  style={{ backgroundColor: `${area.color}22`, color: area.color }}
                                >
                                  {areaLabel}
                                </span>
                              )}
                              <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-900">{goal.title}</p>
                              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                                <span>HSD: {formatShortDate(goal.deadline)}</span>
                                <span className="font-semibold">{progress}%</span>
                              </div>
                              <div className="mt-1 h-1 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full bg-gradient-to-r from-violet-500 to-pink-500"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </button>
                          );
                        })}
                        {availableGoals.length === 0 && (
                          <p className="col-span-full rounded-[var(--r-card)] border border-amber-200 bg-amber-50/50 p-4 text-center text-sm text-amber-700">
                            Tất cả mục tiêu đã được ghim trên bảng này.
                          </p>
                        )}
                      </div>
                      <Button className="w-full" onClick={handleAddGoalCard} disabled={!selectedGoalId}>
                        Ghim mục tiêu vào bảng
                      </Button>
                    </>
                  );
                })()}
              </TabsContent>

              <TabsContent value="icon" className="stack-stack pt-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {ICON_OPTIONS.map((item) => {
                    const Icon = ICON_COMPONENTS[item];
                    const isActive = iconName === item;

                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setIconName(item)}
                        className={`rounded-[var(--r-card)] border p-4 transition-colors transition-shadow duration-150 ${
                          isActive
                            ? "border-violet-300 bg-violet-50 text-violet-700 shadow-lg"
                            : "border-white/80 bg-white/72 text-slate-500 hover:border-violet-200 hover:text-violet-700"
                        }`}
                      >
                        <div className="flex h-12 w-12 items-center justify-center rounded-[var(--r-tile)] gradient-brand-subtle">
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="mt-[var(--space-inline)] text-sm font-semibold">{item}</div>
                      </button>
                    );
                  })}
                </div>
                <div className="stack-tight">
                  <span className="text-sm font-semibold text-slate-700">Kích thước</span>
                  <div className="flex gap-2">
                    {(["S", "M", "L", "XL"] as const).map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedIconSize(size)}
                        className={`flex-1 rounded-md border px-3 py-2 text-sm ${
                          selectedIconSize === size
                            ? "border-violet-400 bg-violet-50 text-violet-700"
                            : "border-slate-200 bg-white text-slate-600"
                        }`}
                      >
                        {SIZE_PRESETS[size].label}
                      </button>
                    ))}
                  </div>
                </div>
                <Button className="w-full" onClick={handleAddIcon}>
                  Thêm biểu tượng vào bảng
                </Button>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        <div className="grid min-w-0 items-start gap-[var(--space-section)] xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="min-w-0 overflow-hidden">
            <CardContent className="p-0">
              <VisionBoardCanvas
                items={board.items}
                themeId={themeId}
                showZones={showZones}
                focusAreaIds={board.storyAnswers?.focusAreas}
                goalsById={goalsById}
                selectedItemId={selectedItemId}
                onItemPositionChange={handleUpdateItemPosition}
                onItemDelete={handleDeleteItem}
                onItemSelect={setSelectedItemId}
                emptyStateSlot={
                  board.items.length === 0 ? (
                    <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-8">
                      <div className="w-full max-w-md rounded-[var(--r-card)] border border-white/80 bg-white/86 p-5 text-center shadow-2xl sm:p-7">
                        <EmptyOrdersIllustration className="mx-auto mb-4 w-32 text-violet-500 opacity-70 sm:w-40" />
                        <ProductVisual variant="vision" className="mx-auto mb-5 min-h-[150px] max-w-sm" />
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[var(--r-tile)] bg-violet-50 text-violet-700 sm:h-20 sm:w-20 sm:rounded-[var(--r-tile)]">
                          <Sparkles className="h-8 w-8 sm:h-9 sm:w-9" />
                        </div>
                        <h2 className="mt-[var(--space-stack)] text-2xl font-bold text-slate-900 sm:mt-6 sm:text-3xl">
                          Bảng của bạn đang chờ câu chuyện đầu tiên
                        </h2>
                        <p className="mt-[var(--space-inline)] text-base text-slate-500">
                          Hãy bắt đầu bằng một hình ảnh đại diện, một câu nói khiến bạn rung động hoặc một biểu tượng để neo cảm xúc cho mục tiêu của mình.
                        </p>
                        <Button className="mt-6 w-full sm:mt-8 sm:w-auto" onClick={() => setIsAddingItem(true)}>
                          <Plus className="h-4 w-4" />
                          Bắt đầu Story Mode
                        </Button>
                        <button
                          type="button"
                          className="mt-2 text-sm text-slate-500 underline-offset-2 hover:underline"
                          onClick={() => setIsAddingItem(true)}
                        >
                          Hoặc tự thêm phần tử
                        </button>
                      </div>
                    </div>
                  ) : null
                }
              />
            </CardContent>
          </Card>

          <SectionBlock title="Công cụ bảng" headerVisuallyHidden className="xl:sticky xl:top-28">
            <div className="stack-stack">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[var(--r-tile)] bg-violet-50 text-violet-700">
                    <LayoutGrid className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Thành phần bảng</h3>
                    <p className="text-sm text-slate-500">
                      Một bảng tốt có đủ hình ảnh, biểu tượng và câu chữ nhắc hướng đi.
                    </p>
                  </div>
                </div>

                <div className="mt-[var(--space-stack)] stack-tight">
                  {[
                    { label: "Hình ảnh", value: boardStats.images, color: "bg-violet-50 text-violet-700" },
                    { label: "Trích dẫn", value: boardStats.quotes, color: "bg-amber-50 text-amber-700" },
                    { label: "Biểu tượng", value: boardStats.icons, color: "bg-sky-50 text-sky-700" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-[var(--r-card)] border border-white/70 bg-white/72 px-4 py-3"
                    >
                      <span className="text-sm font-medium text-slate-600">{item.label}</span>
                      <span className={`rounded-[var(--r-pill)] px-3 py-1 text-sm font-semibold ${item.color}`}>
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
                  <div className="flex h-12 w-12 items-center justify-center rounded-[var(--r-tile)] bg-sky-50 text-sky-700">
                    <Palette className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Gợi ý bố cục</h3>
                    <p className="text-sm text-slate-500">
                      Một vài nguyên tắc nhỏ để bảng nhìn sang hơn và dễ chạm cảm xúc hơn.
                    </p>
                  </div>
                </div>

                <div className="mt-[var(--space-stack)] stack-tight">
                  {[
                    "Đặt hình ảnh quan trọng nhất ở trung tâm hoặc góc trái trên.",
                    "Dùng 1-2 câu nói đủ mạnh thay vì quá nhiều chữ trên bảng.",
                    "Xen biểu tượng ở các khoảng trống để bảng có nhịp và điểm nhấn.",
                    "Giữ khoảng thở giữa các phần tử để tổng thể trông cao cấp hơn.",
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-[var(--r-tile)] border border-white/70 bg-white/72 px-4 py-3 text-sm leading-7 text-slate-600"
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
                  <div className="flex h-12 w-12 items-center justify-center rounded-[var(--r-tile)] bg-emerald-50 text-emerald-700">
                    <Save className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">Hoàn tất</h3>
                    <p className="text-sm text-slate-500">
                      Lưu bảng để xuất hiện trong thư viện và trở thành một phần của hành trình.
                    </p>
                  </div>
                </div>

                <div className="mt-[var(--space-stack)] flex flex-col gap-3">
                  <Button onClick={handleSave} disabled={!boardName.trim()}>
                    <Save className="h-4 w-4" />
                    Lưu vision board
                  </Button>
                  <Button variant="outline" onClick={() => setIsAddingItem(true)}>
                    <Plus className="h-4 w-4" />
                    Thêm phần tử mới
                  </Button>
                </div>
              </CardContent>
            </Card>
            </div>
          </SectionBlock>
        </div>
      </div>
  );
}
