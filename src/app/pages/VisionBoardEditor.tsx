import {
  Download,
  Globe,
  Heart,
  Image,
  LayoutGrid,
  Link2,
  MessageSquareQuote,
  Moon,
  Palette,
  Plus,
  Save,
  Sparkles,
  Map as MapIcon,
  Sticker,
  Star,
  Sun,
  Target,
  Trophy,
  Type,
  Upload,
  Wand2,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useBeforeUnload, useBlocker, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { getBackendVisionBoardId, saveVisionBoardLink } from "@/lib/api/visionBoardLinkStore";
import { useAuthContext } from "@/lib/auth/AuthContext";
import {
  createVisionBoard as backendCreateVisionBoard,
  updateVisionBoard as backendUpdateVisionBoard,
} from "@/services/visionBoardService";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { ScreenGuide } from "../components/ScreenGuide";
import { SCREEN_GUIDES } from "../components/screen-guides";
import { UpgradePaywallDialog } from "../components/UpgradePaywallDialog";
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
import { ItemControlsPopover } from "../components/visionBoard/ItemControlsPopover";
import { StickerSVG } from "../components/visionBoard/StickerSVGs";
import { VisionBoardCanvas } from "../components/visionBoard/VisionBoardCanvas";
import { VisionBoardSidebar } from "../components/visionBoard/VisionBoardSidebar";
import { type VisionBoardStorySeed, VisionBoardStoryWizard } from "../components/visionBoard/VisionBoardStoryWizard";
import {
  celebrateAchievementUnlock,
  celebrateSpotlight,
  getAchievementCelebrationCopy,
  getUnlockedAchievements,
} from "../utils/experience";
import { hasReachedLimit } from "../utils/feature-entitlements";
import {
  addVisionBoard,
  calculateGoalProgress,
  getCurrentPlan,
  getUserData,
  updateVisionBoard,
  type VisionBoard,
  type VisionBoardItem,
  type VisionBoardThemeId,
} from "../utils/storage";
import type { VisionBoardStickerId } from "../utils/storage-types";
import { LIFE_AREA_LABELS, LIFE_AREAS } from "../utils/storage-constants";
import {
  IMAGE_FRAME_STYLES,
  QUOTE_BACKGROUNDS,
  QUOTE_FONT_STYLES,
  SIZE_PRESETS,
  STICKER_DEFS,
  VISION_BOARD_THEMES,
} from "../utils/vision-board-config";
import {
  downloadDataUrl,
  EXPORT_RATIOS,
  type ExportOptions,
  exportVisionBoardToPng,
  getRatioLabel,
} from "../utils/vision-board-export";
import { VISION_BOARD_TEMPLATES, type VisionBoardTemplate } from "../utils/vision-board-templates";

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
type QuoteBackgroundId = NonNullable<VisionBoardItemStyle["quoteBackground"]>;

const ICON_OPTIONS = Object.keys(ICON_COMPONENTS) as IconName[];
const IMAGE_SUGGESTIONS = ["không gian làm việc đẹp", "buổi sáng khỏe mạnh", "du lịch tự do", "ngôi nhà mơ ước"];
const QUOTE_SUGGESTIONS = [
  "Mỗi ngày tiến một chút vẫn là tiến lên.",
  "Kỷ luật là cây cầu nối tầm nhìn với kết quả.",
  "Tôi đang xây một cuộc sống mình thật sự muốn thức dậy mỗi sáng.",
];

function getExportRatioDescription(ratio: ExportOptions["ratio"]): string {
  if (ratio === "wallpaper") return "Để làm hình nền điện thoại - gợi nhắc mỗi lần mở máy.";
  if (ratio === "desktop") return "Để làm hình nền máy tính.";
  return "Để chia sẻ lên Instagram, Facebook.";
}

const CURATED_IMAGES: Array<{ label: string; url: string }> = [
  {
    label: "Không gian",
    url: "/curated/vision-board/khong-gian.webp",
  },
  { label: "Bình minh", url: "/curated/vision-board/binh-minh.webp" },
  { label: "Du lịch", url: "/curated/vision-board/du-lich.webp" },
  { label: "Nhà", url: "/curated/vision-board/nha.webp" },
  { label: "Vận động", url: "/curated/vision-board/van-dong.webp" },
  {
    label: "Thiên nhiên",
    url: "/curated/vision-board/thien-nhien.webp",
  },
  { label: "Thành phố", url: "/curated/vision-board/thanh-pho.webp" },
  { label: "Biển", url: "/curated/vision-board/bien.webp" },
  { label: "Sách", url: "/curated/vision-board/sach.webp" },
  { label: "Ẩm thực", url: "/curated/vision-board/am-thuc.webp" },
  {
    label: "Nghệ thuật",
    url: "/curated/vision-board/nghe-thuat.webp",
  },
  { label: "Vườn", url: "/curated/vision-board/vuon.webp" },
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
    x: 10 + ((items.length * 6) % 48),
    y: 12 + ((items.length * 5) % 42),
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
const MAX_COMPRESSED_CHARS = 600_000; // ~450 KB actual image data after base64 overhead
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
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isInitDialogOpen, setIsInitDialogOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedRatio, setSelectedRatio] = useState<ExportOptions["ratio"]>("wallpaper");
  const [searchQuery, setSearchQuery] = useState("");
  const [quoteText, setQuoteText] = useState("");
  const [iconName, setIconName] = useState<IconName>("Sparkles");
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [selectedLifeArea, setSelectedLifeArea] = useState<string | null>(null);
  const [selectedImageFrame, setSelectedImageFrame] = useState<ImageFrameId>("shadow");
  const [selectedQuoteFont, setSelectedQuoteFont] = useState<QuoteFontId>("default");
  const [selectedIconSize, setSelectedIconSize] = useState<IconSizePreset>("M");
  const [selectedStickerId, setSelectedStickerId] = useState<VisionBoardStickerId>("flower-pink");
  const [selectedQuoteBg, setSelectedQuoteBg] = useState<QuoteBackgroundId>("none");
  const [isSearching, setIsSearching] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isVisionBoardLimitPaywallOpen, setIsVisionBoardLimitPaywallOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [showAdvancedImageOptions, setShowAdvancedImageOptions] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const canvasExportRef = useRef<HTMLDivElement>(null);
  const boardNameInputRef = useRef<HTMLInputElement>(null);
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
    setIsInitDialogOpen(true);
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
    if (!board) return;

    if (!boardName.trim()) {
      toast.error("Hãy đặt tên cho vision board trước khi lưu.", {
        description: "Tên bảng giúp bạn nhận ra bảng này trong thư viện.",
      });
      boardNameInputRef.current?.focus();
      boardNameInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

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
      storyAnswers: board.storyAnswers,
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
    const unlockedAchievements = getUnlockedAchievements(beforeData.achievements, afterData.achievements);
    const achievementCopy = getAchievementCelebrationCopy(unlockedAchievements);

    celebrateSpotlight({ x: 0.84, y: 0.14 });
    if (achievementCopy) {
      window.setTimeout(() => {
        celebrateAchievementUnlock({ x: 0.5, y: 0.16 });
      }, 140);
    }

    toast.success(id ? "Bảng đã được làm mới." : "Vision board đã vào thư viện.", {
      description: achievementCopy?.title
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
    const keyword = encodeURIComponent(searchQuery.trim());
    const imageUrl = `https://source.unsplash.com/480x360/?${keyword}`;

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
      x: 12 + ((board.items.length * 5) % 50),
      y: 14 + ((board.items.length * 4) % 40),
      width: SIZE_PRESETS.L.width,
      height: 120,
      lifeAreaId: selectedLifeArea ?? undefined,
      style: { sizePreset: "L", quoteFont: selectedQuoteFont, quoteBackground: selectedQuoteBg },
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
      x: 10 + ((board.items.length * 6) % 48),
      y: 12 + ((board.items.length * 5) % 42),
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
      x: 16 + ((board.items.length * 5) % 50),
      y: 16 + ((board.items.length * 4) % 42),
      width: iconWidth,
      height: iconWidth,
      style: { sizePreset: selectedIconSize },
    };

    setBoard({ ...board, items: [...board.items, newItem] });
    setIsAddingItem(false);
    setHasUnsavedChanges(true);
  };

  const handleAddSticker = () => {
    if (!board) return;

    const iconWidth = SIZE_PRESETS[selectedIconSize].width;
    const newItem: VisionBoardItem = {
      id: `item_${Date.now()}`,
      type: "sticker",
      content: selectedStickerId,
      x: 16 + ((board.items.length * 5) % 50),
      y: 16 + ((board.items.length * 4) % 42),
      width: iconWidth,
      height: iconWidth,
      style: { sizePreset: selectedIconSize },
    };

    setBoard({ ...board, items: [...board.items, newItem] });
    setIsAddingItem(false);
    setHasUnsavedChanges(true);
  };

  const handleWizardComplete = (seed: VisionBoardStorySeed) => {
    if (!board) return;

    setThemeId(seed.themeId);
    setBoard({
      ...board,
      items: [...board.items, ...seed.items],
      theme: seed.themeId,
      storyAnswers: seed.storyAnswers,
    });
    setHasUnsavedChanges(true);
    setIsWizardOpen(false);
    toast.success("Đã tạo bảng theo câu chuyện của bạn. Kéo thả để chỉnh nếu muốn.");
  };

  const handleSelectTemplate = (template: VisionBoardTemplate) => {
    if (!board) return;

    const ts = Date.now();
    const itemsWithIds = template.items.map((item, idx) => ({
      ...item,
      id: `tmpl_${template.id}_${ts}_${idx}`,
    })) as VisionBoardItem[];

    setBoard({
      ...board,
      name: template.name,
      items: itemsWithIds,
      theme: template.themeId,
    });
    setBoardName(template.name);
    setThemeId(template.themeId);
    setHasUnsavedChanges(true);
    setIsInitDialogOpen(false);
    toast.success(`Đã áp dụng template "${template.name}". Bạn có thể tự do kéo thả, sửa đổi các phần tử!`);
  };

  const handleExport = async () => {
    if (!canvasExportRef.current || !board) return;

    setIsExporting(true);
    try {
      setSelectedItemId(null);
      await new Promise((resolve) => window.setTimeout(resolve, 50));

      const dataUrl = await exportVisionBoardToPng(canvasExportRef.current, {
        ratio: selectedRatio,
        pixelRatio: 2,
      });
      const filename = `${boardName.trim() || board.name || "vision-board"}-${boardYear.trim() || board.year || "2026"}-${selectedRatio}.png`;
      downloadDataUrl(dataUrl, filename);
      toast.success("Đã tải bảng về máy. Đặt làm hình nền điện thoại nhé!");
      setIsExportDialogOpen(false);
    } catch (error) {
      console.error("Export failed", error);
      toast.error("Không thể xuất ảnh. Vui lòng thử lại hoặc thử trình duyệt khác.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleUpdateItemPosition = (itemId: string, x: number, y: number) => {
    if (!board) return;

    setBoard({
      ...board,
      items: board.items.map((item) => (item.id === itemId ? { ...item, x, y } : item)),
    });
    setHasUnsavedChanges(true);
  };

  const handleUpdateItem = (itemId: string, updates: Partial<VisionBoardItem>) => {
    if (!board) return;

    setBoard({
      ...board,
      items: board.items.map((item) => (item.id === itemId ? { ...item, ...updates } : item)),
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

  const selectedItem = selectedItemId ? board.items.find((item) => item.id === selectedItemId) : undefined;

  return (
    <div className="stack-section mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 lg:px-8" style={{ background: "var(--app-bg-subtle)" }}>
      <ScreenGuide {...SCREEN_GUIDES.visionBoardEditor} autoOpen className="mb-4" />
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
              className="bg-[color:var(--color-danger-fg)] text-white hover:bg-[color:var(--color-danger-fg)]/90"
              onClick={() => {
                if (blocker.state === "blocked") blocker.proceed();
              }}
            >
              Rời khỏi trang
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <VisionBoardStoryWizard
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        onComplete={handleWizardComplete}
        availableGoals={getUserData().goals.map((goal) => ({
          id: goal.id,
          title: goal.title,
          category: goal.category,
        }))}
        year={boardYear}
      />

      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tải bảng về máy</DialogTitle>
            <DialogDescription>
              Chọn tỉ lệ phù hợp với mục đích sử dụng. Bảng sẽ được render thành ảnh PNG chất lượng cao.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {EXPORT_RATIOS.map((ratio) => (
              <button
                key={ratio}
                type="button"
                onClick={() => setSelectedRatio(ratio)}
                className={`w-full rounded-card border p-3 text-left transition ${
                  selectedRatio === ratio
                    ? "border-app-accent bg-app-accent-soft"
                    : "border-app-line bg-app-surface hover:border-app-accent/50"
                }`}
              >
                <p className="text-sm font-semibold text-app-ink">{getRatioLabel(ratio)}</p>
                <p className="text-xs text-app-ink-soft">{getExportRatioDescription(ratio)}</p>
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsExportDialogOpen(false)} disabled={isExporting}>
              Hủy
            </Button>
            <Button onClick={handleExport} disabled={isExporting}>
              {isExporting ? "Đang xuất..." : "Tải về"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isInitDialogOpen} onOpenChange={setIsInitDialogOpen}>
        <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl text-app-ink">Khởi tạo Vision Board của bạn</DialogTitle>
            <DialogDescription className="text-app-ink-soft">
              Chọn một cách bắt đầu phù hợp để truyền cảm hứng và hình ảnh hóa mục tiêu của bạn.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4 md:grid-cols-2">
            {/* Cột trái: Chọn Template mẫu */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-app-ink-muted">
                1. Dùng Template theo chủ đề
              </h3>
              <p className="text-xs text-app-ink-soft">
                Nạp sẵn bố cục ảnh mẫu, câu nói truyền cảm hứng và biểu tượng phù hợp với chủ đề lựa chọn.
              </p>
              <div className="grid gap-2.5">
                {VISION_BOARD_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => handleSelectTemplate(tmpl)}
                    className="w-full text-left rounded-card border border-app-line bg-app-surface p-3 transition hover:border-app-accent hover:bg-app-accent-soft group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-app-ink group-hover:text-app-accent">{tmpl.name}</span>
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-white"
                        style={{ background: VISION_BOARD_THEMES.find((t) => t.id === tmpl.themeId)?.preview.gradient }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-app-ink-muted leading-relaxed">{tmpl.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Cột phải: Các cách khởi tạo khác */}
            <div className="space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-app-ink-muted">
                  2. Chế độ kể chuyện (Story Mode)
                </h3>
                <div className="rounded-card border border-app-line bg-app-surface p-4 flex flex-col gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-app-accent-soft text-app-accent">
                    <Wand2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-app-ink">Tự động sinh bảng</h4>
                    <p className="mt-1 text-xs text-app-ink-muted leading-relaxed">
                      Trả lời 4 câu hỏi cực nhanh về cảm xúc và lĩnh vực tập trung để hệ thống tự động thiết kế bảng
                      riêng cho bạn.
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      setIsInitDialogOpen(false);
                      setIsWizardOpen(true);
                    }}
                    className="w-full mt-1.5"
                  >
                    Bắt đầu Story Mode
                  </Button>
                </div>
              </div>

              <div className="pt-4 border-t border-app-line space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-app-ink-muted">
                  3. Bắt đầu từ trang trắng
                </h3>
                <p className="text-xs text-app-ink-soft">
                  Nếu bạn đã có sẵn ý tưởng, hãy bắt đầu thiết kế thủ công từ đầu.
                </p>
                <Button type="button" variant="outline" onClick={() => setIsInitDialogOpen(false)} className="w-full">
                  Tạo bảng trống
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card className="overflow-hidden rounded-[20px] border-app-line/60 bg-app-surface shadow-app-lg">
        <CardContent className="relative p-6 sm:p-7 lg:p-8">
          <div className="relative z-10 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_312px]">
            <div className="flex flex-col gap-5">
              <span className="inline-flex items-center gap-[8px] self-start rounded-full bg-app-accent-subtle px-[13px] py-[6px] text-[10px] font-extrabold uppercase tracking-[0.14em] text-app-accent whitespace-nowrap" style={{ marginBottom: 18 }}>
                <Sparkles className="h-[13px] w-[13px]" aria-hidden="true" />
                Dear Our Future Studio
              </span>

              <div>
                <h1 className="max-w-3xl font-serif text-[clamp(26px,3vw,36px)] font-extrabold leading-[1.04] -tracking-[0.02em] text-app-ink">
                  {boardName || "Bức tranh tương lai"}
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-app-ink-soft">
                  Kéo thả hình ảnh, câu nói và biểu tượng để tạo một bảng giàu cảm xúc, rõ định hướng và đủ đẹp để bạn
                  muốn quay lại thường xuyên.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_96px]">
                <Input
                  ref={boardNameInputRef}
                  placeholder="Tên vision board của bạn"
                  value={boardName}
                  onChange={(event) => {
                    setBoardName(event.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="h-[46px] rounded-[12px] border-app-line/20 bg-[#FAF8F3] dark:bg-app-bg-subtle text-[13.5px] font-medium"
                />
                <Input
                  type="number"
                  placeholder="Năm"
                  value={boardYear}
                  onChange={(event) => {
                    setBoardYear(event.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="h-[46px] rounded-[12px] border-app-line/20 bg-[#FAF8F3] dark:bg-app-bg-subtle text-center font-mono text-[13.5px] font-semibold"
                />
              </div>

              <div className="flex flex-wrap gap-2.5">
                <Button onClick={handleSave} className="bg-app-accent text-white hover:bg-app-accent-hover rounded-[11px] text-[13px] font-bold">
                  <Save className="h-3.5 w-3.5" />
                  Lưu bảng
                </Button>
                <Button variant="outline" onClick={() => setIsAddingItem(true)} className="rounded-[11px] text-[13px] font-semibold">
                  <Plus className="h-3.5 w-3.5" />
                  Thêm phần tử
                </Button>
                <Button variant="outline" onClick={() => setIsWizardOpen(true)} className="rounded-[11px] text-[13px] font-semibold">
                  <Wand2 className="h-3.5 w-3.5" />
                  Story Mode
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsExportDialogOpen(true)}
                  disabled={board.items.length === 0}
                  className="rounded-[11px] text-[13px] font-semibold"
                >
                  <Download className="h-3.5 w-3.5" />
                  Tải về wallpaper
                </Button>
              </div>
              {!boardName.trim() ? (
                <p className="text-[11.5px] text-app-ink-muted">
                  Đặt tên bảng (ví dụ "Vision 2026") rồi bấm <span className="font-semibold text-app-ink-soft">Lưu bảng</span>.
                </p>
              ) : null}

              <div className="flex flex-wrap items-center gap-3 border-t border-app-line/10 pt-5">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-app-ink-muted">Không gian</span>
                <div className="flex items-center gap-2">
                  {VISION_BOARD_THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => {
                        setThemeId(theme.id);
                        setHasUnsavedChanges(true);
                      }}
                      className="h-[26px] w-[26px] rounded-full border-2 transition-all duration-150"
                      style={{
                        background: theme.preview.gradient,
                        borderColor: themeId === theme.id ? "#fff" : theme.preview.gradient.includes("#F7F4ED") ? "rgba(23,21,15,0.14)" : "transparent",
                        boxShadow: themeId === theme.id ? "0 0 0 2px #fff, 0 0 0 4px #0C5E3A" : "none",
                      }}
                      aria-label={theme.label}
                      title={theme.label}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowZones((prev) => !prev)}
                  className={`ml-auto inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11.5px] font-bold transition-all duration-150 ${
                    showZones
                      ? "border-[rgba(12,94,58,0.25)] bg-[#EDF7E0] text-[#0C5E3A] dark:border-app-accent/25 dark:bg-app-accent-soft dark:text-app-accent"
                      : "border-[rgba(23,21,15,0.12)] bg-white text-[#5C574B] dark:border-app-line dark:bg-app-surface dark:text-app-ink-soft"
                  }`}
                >
                  <span
                    className={`h-[7px] w-[7px] rounded-full ${showZones ? "bg-[#0C5E3A] dark:bg-app-accent" : "bg-[#C7C2B5] dark:bg-app-ink-muted"}`}
                  />
                  {showZones ? "Ẩn vùng life area" : "Hiện vùng life area"}
                </button>
              </div>

              <p className="text-[11.5px] text-app-ink-muted">
                Trên điện thoại, bạn có thể chạm giữ rồi rê để di chuyển các phần tử trên bảng.
              </p>
            </div>

            <div className="hidden flex-col gap-4 xl:flex">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-app-ink">Tóm tắt bảng</p>
              <div className="flex flex-col gap-3">
                <div className="rounded-[13px] border border-app-line/10 dark:border-app-line bg-[#FAF8F3] dark:bg-app-bg-subtle px-4 py-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-app-ink-muted">Tổng phần tử</p>
                    <p className="text-[11.5px] text-app-ink-soft">đang có trên bảng</p>
                  </div>
                  <span className="font-serif text-[30px] font-extrabold leading-none text-app-ink">{board.items.length}</span>
                </div>
                <div className="rounded-[13px] border border-app-line/10 dark:border-app-line bg-[#FAF8F3] dark:bg-app-bg-subtle px-4 py-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-app-ink-muted">Hình ảnh</p>
                    <p className="text-[11.5px] text-app-ink-soft">nguồn cảm hứng trực quan</p>
                  </div>
                  <span className="font-serif text-[30px] font-extrabold leading-none text-app-accent">{boardStats.images}</span>
                </div>
                <div className="rounded-[13px] border border-app-line/10 dark:border-app-line bg-[#FAF8F3] dark:bg-app-bg-subtle px-4 py-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-app-ink-muted">Trích dẫn + biểu tượng</p>
                    <p className="text-[11.5px] text-app-ink-soft">điểm nhấn cảm xúc</p>
                  </div>
                  <span className="font-serif text-[30px] font-extrabold leading-none text-app-ink">{boardStats.quotes + boardStats.icons}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAddingItem} onOpenChange={setIsAddingItem}>
        <DialogContent className="max-w-3xl overflow-y-auto max-h-[85vh]">
          <DialogHeader>
            <DialogTitle>Thêm vào vision board</DialogTitle>
            <DialogDescription>
              Chọn loại phần tử phù hợp để làm bảng của bạn sống động và giàu ý nghĩa hơn.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="image" className="mt-4">
            <TabsList className="mb-3 inline-flex rounded-full border border-app-line bg-app-bg p-1">
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
              <TabsTrigger value="sticker">
                <Sticker className="h-4 w-4" />
                Sticker
              </TabsTrigger>
              <TabsTrigger value="icon">
                <Sparkles className="h-4 w-4" />
                Biểu tượng
              </TabsTrigger>
            </TabsList>

            <TabsContent value="image" className="stack-stack pt-4">
              <div className="stack-tight">
                <div className="flex items-center gap-2 text-sm font-semibold text-app-ink-soft">
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
                <Button variant="outline" className="w-full" onClick={() => uploadInputRef.current?.click()}>
                  <Upload className="h-4 w-4" />
                  Chọn ảnh từ máy / điện thoại
                </Button>
                <p className="text-xs text-app-ink-muted">
                  Hỗ trợ JPG, PNG, WEBP, GIF — tối đa 5 MB (ảnh sẽ được nén tự động)
                </p>
              </div>

              <div className="stack-tight">
                <div className="flex items-center gap-2 text-sm font-semibold text-app-ink-soft">
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
                <div className="flex items-center gap-2 text-sm font-semibold text-app-ink-soft">
                  <Image className="h-4 w-4" />
                  Chọn từ thư viện gợi ý
                </div>
                <div className="grid max-h-52 grid-cols-3 gap-2 overflow-y-auto rounded-card sm:grid-cols-4">
                  {CURATED_IMAGES.map((img) => (
                    <button
                      key={img.label}
                      type="button"
                      className="group relative overflow-hidden rounded-card border border-app-line transition-colors transition-shadow duration-150 hover:border-app-accent hover:shadow-app-sm"
                      onClick={() => handleAddCuratedImage(img.url)}
                    >
                      <ImageWithFallback src={img.url} alt={img.label} className="aspect-[4/3] w-full object-cover" />
                      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/45 to-transparent px-2 py-1.5 text-xs font-medium text-white">
                        {img.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="stack-tight">
                <div className="flex items-center gap-2 text-sm font-semibold text-app-ink">
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
                    <Button key={item} variant="outline" size="sm" onClick={() => setSearchQuery(item)}>
                      {item}
                    </Button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setShowAdvancedImageOptions(!showAdvancedImageOptions)}
                  className="text-xs font-semibold text-app-accent hover:underline flex items-center gap-1 mt-2 self-start"
                >
                  {showAdvancedImageOptions
                    ? "Ẩn tùy chọn nâng cao"
                    : "Hiển thị tùy chọn nâng cao (Life area, Khung ảnh)..."}
                </button>

                {showAdvancedImageOptions && (
                  <div className="space-y-4 pt-4 border-t border-app-line mt-2 animate-in fade-in duration-200">
                    <div className="stack-tight">
                      <div className="flex items-center gap-2 text-sm font-semibold text-app-ink">
                        <LayoutGrid className="h-4 w-4" />
                        Gắn ảnh vào vùng nào? <span className="text-xs font-normal text-app-ink-soft">(tùy chọn)</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {LIFE_AREAS.map((area) => (
                          <button
                            key={area.name}
                            type="button"
                            onClick={() => setSelectedLifeArea((prev) => (prev === area.name ? null : area.name))}
                            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                              selectedLifeArea === area.name
                                ? "border-app-accent bg-app-accent-soft text-app-accent"
                                : "border-app-line bg-app-surface text-app-ink-soft hover:border-app-accent/50"
                            }`}
                          >
                            {LIFE_AREA_LABELS[area.name]}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="stack-tight">
                      <div className="flex items-center gap-2 text-sm font-semibold text-app-ink">
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
                                ? "border-app-accent bg-app-accent-soft text-app-accent"
                                : "border-app-line bg-app-surface text-app-ink-soft hover:border-app-accent/50"
                            }`}
                          >
                            {frame.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={handleAddImage}
                  disabled={isSearching || !searchQuery.trim()}
                >
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
                  <Button key={item} variant="outline" size="sm" onClick={() => setQuoteText(item)}>
                    {item}
                  </Button>
                ))}
              </div>
              <div className="stack-tight">
                <div className="flex items-center gap-2 text-sm font-semibold text-app-ink">
                  <Type className="h-4 w-4" />
                  Kiểu chữ
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {QUOTE_FONT_STYLES.map((font) => (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() => setSelectedQuoteFont(font.id)}
                      className={`rounded-card border p-3 text-left transition ${
                        selectedQuoteFont === font.id
                          ? "border-app-accent bg-app-accent-soft"
                          : "border-app-line bg-app-surface hover:border-app-accent/50"
                      }`}
                    >
                      <p
                        className={`text-base ${font.className}`}
                        style={font.fontFamily ? { fontFamily: font.fontFamily } : undefined}
                      >
                        Aa
                      </p>
                      <p className="mt-1 text-xs text-app-ink-soft">{font.label}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div className="stack-tight">
                <div className="flex items-center gap-2 text-sm font-semibold text-app-ink">
                  <Palette className="h-4 w-4" />
                  Nền câu nói
                </div>
                <div className="flex flex-wrap gap-2">
                  {QUOTE_BACKGROUNDS.map((bg) => (
                    <button
                      key={bg.id}
                      type="button"
                      onClick={() => setSelectedQuoteBg(bg.id)}
                      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                        selectedQuoteBg === bg.id
                          ? "border-app-accent bg-app-accent-soft text-app-accent"
                          : "border-app-line bg-app-surface text-app-ink-soft hover:border-app-accent/50"
                      }`}
                    >
                      {bg.label}
                    </button>
                  ))}
                </div>
              </div>
              <Button className="w-full" onClick={handleAddQuote} disabled={!quoteText.trim()}>
                Thêm câu nói vào bảng
              </Button>
            </TabsContent>

            <TabsContent value="sticker" className="stack-stack pt-4">
              <p className="text-sm text-app-ink-soft">Chọn sticker để trang trí bảng tầm nhìn.</p>
              <div className="grid max-h-56 grid-cols-5 gap-3 overflow-y-auto sm:grid-cols-5">
                {STICKER_DEFS.map((sticker) => {
                  const isActive = selectedStickerId === sticker.id;
                  return (
                    <button
                      key={sticker.id}
                      type="button"
                      onClick={() => setSelectedStickerId(sticker.id)}
                      className={`flex flex-col items-center gap-1 rounded-card border p-3 transition-colors duration-150 ${
                        isActive
                          ? "border-app-accent bg-app-accent-soft text-app-accent shadow-app-sm"
                          : "border-app-line bg-app-surface hover:border-app-accent/50"
                      }`}
                    >
                      <StickerSVG id={sticker.id} className="h-10 w-10" />
                      <span className="mt-1 text-[10px] leading-tight text-app-ink-muted">{sticker.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="stack-tight">
                <span className="text-sm font-semibold text-app-ink">Kích thước</span>
                <div className="flex gap-2">
                  {(["S", "M", "L", "XL"] as const).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedIconSize(size)}
                      className={`flex-1 rounded-md border px-3 py-2 text-sm ${
                        selectedIconSize === size
                          ? "border-app-accent bg-app-accent-soft text-app-accent"
                          : "border-app-line bg-app-surface text-app-ink-soft"
                      }`}
                    >
                      {SIZE_PRESETS[size].label}
                    </button>
                  ))}
                </div>
              </div>
              <Button className="w-full" onClick={handleAddSticker}>
                Thêm sticker vào bảng
              </Button>
            </TabsContent>

            <TabsContent value="goal_card" className="stack-stack pt-4">
              {(() => {
                const userData = getUserData();
                const goals = userData.goals;

                if (goals.length === 0) {
                  return (
                    <div className="surface-empty rounded-card border border-dashed border-app-line bg-app-bg/50 p-6 text-center">
                      <Target className="mx-auto h-10 w-10 text-app-ink-muted" />
                      <p className="mt-3 text-base font-semibold text-app-ink">
                        Bạn chưa có mục tiêu nào để ghim lên bảng
                      </p>
                      <p className="mt-1 text-sm text-app-ink-soft">
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
                    <p className="text-sm text-app-ink-soft">
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
                            className={`rounded-card border p-3 text-left transition ${
                              isActive
                                ? "border-app-accent bg-app-accent-soft ring-1 ring-app-accent/30"
                                : "border-app-line bg-app-surface hover:bg-app-bg"
                            }`}
                          >
                            {area && (
                              <span
                                className="inline-flex rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wider"
                                style={{ backgroundColor: `${area.color}22`, color: area.color }}
                              >
                                {areaLabel}
                              </span>
                            )}
                            <p className="mt-2 line-clamp-2 text-sm font-semibold text-app-ink">{goal.title}</p>
                            <div className="mt-2 flex items-center justify-between text-xs text-app-ink-soft">
                              <span>HSD: {formatShortDate(goal.deadline)}</span>
                              <span className="font-semibold">{progress}%</span>
                            </div>
                            <div className="mt-1 h-1 overflow-hidden rounded-full bg-app-bg">
                              <div className="h-full bg-app-accent" style={{ width: `${progress}%` }} />
                            </div>
                          </button>
                        );
                      })}
                      {availableGoals.length === 0 && (
                        <p className="col-span-full rounded-card border border-app-warm-border bg-app-warm-soft p-4 text-center text-sm text-app-warm">
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
                      className={`rounded-card border p-4 transition-colors transition-shadow duration-150 ${
                        isActive
                          ? "border-app-accent bg-app-accent-soft text-app-accent shadow-app-sm"
                          : "border-app-line bg-app-surface text-app-ink-soft hover:border-app-accent/50 hover:text-app-accent"
                      }`}
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-card bg-app-accent-soft">
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="mt-[var(--space-inline)] text-sm font-semibold text-app-ink">{item}</div>
                    </button>
                  );
                })}
              </div>
              <div className="stack-tight">
                <span className="text-sm font-semibold text-app-ink">Kích thước</span>
                <div className="flex gap-2">
                  {(["S", "M", "L", "XL"] as const).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedIconSize(size)}
                      className={`flex-1 rounded-md border px-3 py-2 text-sm ${
                        selectedIconSize === size
                          ? "border-app-accent bg-app-accent-soft text-app-accent"
                          : "border-app-line bg-app-surface text-app-ink-soft"
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

      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_312px]">
        <Card className="min-w-0 overflow-hidden rounded-[20px] border-app-line/10 bg-transparent shadow-app-lg">
          <CardContent className="p-0">
            <VisionBoardCanvas
              items={board.items}
              themeId={themeId}
              showZones={showZones}
              focusAreaIds={board.storyAnswers?.focusAreas}
              goalsById={goalsById}
              selectedItemId={selectedItemId}
              exportRef={canvasExportRef}
              onItemPositionChange={handleUpdateItemPosition}
              onItemDelete={handleDeleteItem}
              onItemSelect={setSelectedItemId}
              emptyStateSlot={
                board.items.length === 0 ? (
                  <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-8">
                    <div className="relative z-10 w-full max-w-[380px] rounded-[18px] dark:border-app-line bg-white dark:bg-app-surface px-9 py-10 text-center shadow-[0_30px_60px_-30px_rgba(0,0,0,0.5)] dark:shadow-[0_30px_60px_-30px_rgba(0,0,0,0.8)]">
                      <div className="mx-auto mb-5 flex h-[78px] w-[78px] items-center justify-center rounded-[20px] bg-app-accent-subtle text-app-accent animate-[dof-float_5s_ease-in-out_infinite]">
                        <MapIcon className="h-[38px] w-[38px]" strokeWidth={1.6} aria-hidden="true" />
                      </div>
                      <h2 className="font-serif text-[21px] font-bold leading-tight text-app-ink">
                        Bảng của bạn đang chờ câu chuyện đầu tiên
                      </h2>
                      <p className="mt-2.5 text-[13px] leading-relaxed text-app-ink-soft">
                        Hãy bắt đầu bằng một hình ảnh đại diện, một câu nói khiến bạn rung động hoặc một biểu tượng để
                        neo cảm xúc cho mục tiêu của mình.
                      </p>
                      <Button
                        className="mt-6 rounded-full px-6 py-3 text-[13.5px] font-bold"
                        onClick={() => setIsWizardOpen(true)}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Bắt đầu Story Mode
                      </Button>
                      <button
                        type="button"
                        className="mt-3.5 block w-full text-[12.5px] font-semibold text-app-ink-soft underline-offset-2 hover:text-app-ink hover:underline"
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

        <aside className="space-y-4 xl:sticky xl:top-28">
          {selectedItem && (
            <ItemControlsPopover
              item={selectedItem}
              onUpdate={handleUpdateItem}
              onDelete={handleDeleteItem}
              onClose={() => setSelectedItemId(null)}
            />
          )}
          <VisionBoardSidebar items={board.items} focusAreaIds={board.storyAnswers?.focusAreas} />
        </aside>
      </div>
    </div>
  );
}
