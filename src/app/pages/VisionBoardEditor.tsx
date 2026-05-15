import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
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
  Trash2,
  Trophy,
  Upload,
  Wand2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { EmptyOrdersIllustration } from "../components/illustrations";
import { UpgradePaywallDialog } from "../components/UpgradePaywallDialog";
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
  addVisionBoard,
  getCurrentPlan,
  getUserData,
  updateVisionBoard,
} from "../utils/storage";
import { hasReachedLimit } from "../utils/feature-entitlements";
import { useAuthContext } from "@/lib/auth/AuthContext";
import {
  createVisionBoard as backendCreateVisionBoard,
  updateVisionBoard as backendUpdateVisionBoard,
} from "@/services/visionBoardService";
import {
  getBackendVisionBoardId,
  saveVisionBoardLink,
} from "@/lib/api/visionBoardLinkStore";

interface DraggableItemProps {
  item: VisionBoardItem;
  onUpdate: (id: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
}

interface DragState {
  offsetX: number;
  offsetY: number;
  pointerId: number;
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

function DraggableItem({ item, onUpdate, onDelete }: DraggableItemProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragStateRef = useRef<DragState | null>(null);

  const updatePosition = (clientX: number, clientY: number, container: HTMLElement) => {
    const dragState = dragStateRef.current;
    if (!dragState) return;

    const rect = container.getBoundingClientRect();
    const x = ((clientX - rect.left - dragState.offsetX) / rect.width) * 100;
    const y = ((clientY - rect.top - dragState.offsetY) / rect.height) * 100;

    onUpdate(item.id, Math.max(0, Math.min(95, x)), Math.max(0, Math.min(95, y)));
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;

    const container = event.currentTarget.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const offsetX = event.clientX - rect.left - (rect.width * item.x) / 100;
    const offsetY = event.clientY - rect.top - (rect.height * item.y) / 100;

    dragStateRef.current = {
      offsetX,
      offsetY,
      pointerId: event.pointerId,
    };

    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    updatePosition(event.clientX, event.clientY, container);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current || dragStateRef.current.pointerId !== event.pointerId) return;

    const container = event.currentTarget.parentElement;
    if (!container) return;

    updatePosition(event.clientX, event.clientY, container);
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current || dragStateRef.current.pointerId !== event.pointerId) return;

    dragStateRef.current = null;
    setIsDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const Icon = ICON_COMPONENTS[item.content as IconName] ?? Sparkles;

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      className="absolute cursor-move touch-none select-none transition-transform duration-300 hover:scale-[1.015]"
      style={{
        left: `${item.x}%`,
        top: `${item.y}%`,
        width: `${item.width}px`,
        opacity: isDragging ? 0.56 : 1,
      }}
    >
      <div className="group relative">
        {item.type === "image" && (
          <div className="overflow-hidden rounded-[var(--r-card)] border border-white/85 bg-white/90 p-2 shadow-2xl">
            <ImageWithFallback
              src={item.content}
              alt="Phần tử vision board"
              className="rounded-[var(--r-tile)] shadow-sm"
              style={{ width: `${item.width - 16}px` }}
            />
          </div>
        )}

        {item.type === "quote" && (
          <div
            className="rounded-[var(--r-card)] border border-white/80 gradient-white-panel p-5 shadow-2xl"
            style={{ width: `${item.width}px` }}
          >
            <div className="flex items-center gap-2 text-violet-600">
              <MessageSquareQuote className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                Câu nói
              </span>
            </div>
            <p className="mt-[var(--space-inline)] text-sm leading-7 text-slate-700">{item.content}</p>
          </div>
        )}

        {item.type === "icon" && (
          <div className="flex h-24 w-24 items-center justify-center rounded-[var(--r-tile)] gradient-violet-pink text-white shadow-2xl">
            <Icon className="h-10 w-10" />
          </div>
        )}

        <Button
          size="icon"
          variant="destructive"
          className="absolute -right-2 -top-2 h-8 w-8 rounded-[var(--r-pill)] opacity-0 transition-opacity group-hover:opacity-100"
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
  const { user } = useAuthContext();
  const [board, setBoard] = useState<VisionBoard | null>(null);
  const [isResolvingBoard, setIsResolvingBoard] = useState(Boolean(id));
  const [boardName, setBoardName] = useState("");
  const [boardYear, setBoardYear] = useState(new Date().getFullYear().toString());
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [quoteText, setQuoteText] = useState("");
  const [iconName, setIconName] = useState<IconName>("Sparkles");
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
    if (id) {
      const userData = getUserData();
      const existingBoard = userData.visionBoards.find((item) => item.id === id);
      if (existingBoard) {
        setBoard(existingBoard);
        setBoardName(existingBoard.name);
        setBoardYear(existingBoard.year);
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

  const handleSave = () => {
    if (!board || !boardName.trim()) return;

    const beforeData = getUserData();
    if (!id && hasReachedLimit(beforeData, "maxVisionBoards")) {
      setIsVisionBoardLimitPaywallOpen(true);
      return;
    }

    let savedBoardId = id ?? "";

    if (id) {
      const updated = updateVisionBoard(id, {
        name: boardName.trim(),
        year: boardYear.trim(),
        items: board.items,
      });
      if (!updated) return;
      savedBoardId = id;
    } else {
      const newId = addVisionBoard({
        name: boardName.trim(),
        year: boardYear.trim(),
        items: board.items,
      });
      if (!newId) return;
      savedBoardId = newId;
    }

    // Fire-and-forget backend sync
    if (user) {
      const itemsPayload = board.items.map(({ type, content, x, y, width, height }) => ({
        type,
        content,
        x,
        y,
        width,
        height,
      }));

      const backendId = getBackendVisionBoardId(savedBoardId);
      if (backendId) {
        void backendUpdateVisionBoard(backendId, {
          name: boardName.trim(),
          year: boardYear.trim(),
          items: itemsPayload,
        }).catch((err: unknown) => {
          console.warn("Backend vision board update failed silently.", err);
        });
      } else {
        void backendCreateVisionBoard({
          name: boardName.trim(),
          year: boardYear.trim(),
          items: itemsPayload,
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

    const newItem: VisionBoardItem = {
      id: `item_${Date.now()}`,
      type: "image",
      content: trimmed,
      x: 10 + (board.items.length * 6) % 48,
      y: 12 + (board.items.length * 5) % 42,
      width: 220,
      height: 220,
    };

    setBoard({ ...board, items: [...board.items, newItem] });
    setImageUrl("");
    setIsAddingItem(false);
    setHasUnsavedChanges(true);
  };

  const handleAddCuratedImage = (url: string) => {
    if (!board) return;

    const newItem: VisionBoardItem = {
      id: `item_${Date.now()}`,
      type: "image",
      content: url,
      x: 10 + (board.items.length * 6) % 48,
      y: 12 + (board.items.length * 5) % 42,
      width: 220,
      height: 220,
    };

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
          const newItem: VisionBoardItem = {
            id: `item_${Date.now()}`,
            type: "image",
            content: dataUrl,
            x: 10 + (prev.items.length * 6) % 48,
            y: 12 + (prev.items.length * 5) % 42,
            width: 220,
            height: 220,
          };
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
      width: 280,
      height: 120,
    };

    setBoard({ ...board, items: [...board.items, newItem] });
    setQuoteText("");
    setIsAddingItem(false);
    setHasUnsavedChanges(true);
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
          <Card className="hero-surface surface-aurora ring-soft-glow overflow-hidden border-0 text-white">
            <CardContent className="relative p-5 sm:p-6 lg:p-8">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.16),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.12),_transparent_22%)] opacity-90" />

              <div className="relative z-10 grid gap-[var(--space-section)] xl:grid-cols-[minmax(0,1.15fr)_360px]">
                <div className="stack-section">
                  <div className="inline-flex items-center gap-2 rounded-[var(--r-pill)] border border-white/18 bg-white/10 px-4 py-1.5 text-sm text-white/82">
                    <Wand2 className="h-4 w-4" />
                    Dear Our Future Studio
                  </div>

                  <div className="stack-stack">
                    <h1 className="max-w-3xl text-3xl font-semibold leading-[1.15] tracking-tight sm:text-4xl md:text-5xl">
                      Dựng một không gian hình ảnh khiến mục tiêu của bạn trở nên chạm được mỗi ngày.
                    </h1>
                    <p className="max-w-2xl text-base leading-8 text-white/82 lg:text-lg">
                      Kéo thả hình ảnh, câu nói và biểu tượng để tạo một bảng giàu cảm xúc,
                      rõ định hướng và đủ đẹp để bạn muốn quay lại thường xuyên.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_120px]">
                    <Input
                      placeholder="Tên vision board của bạn"
                      value={boardName}
                      onChange={(event) => { setBoardName(event.target.value); setHasUnsavedChanges(true); }}
                      className="border-white/20 bg-white/14 text-lg font-semibold text-white placeholder:text-white/52"
                    />
                    <Input
                      type="number"
                      placeholder="Năm"
                      value={boardYear}
                      onChange={(event) => { setBoardYear(event.target.value); setHasUnsavedChanges(true); }}
                      className="border-white/20 bg-white/14 text-white placeholder:text-white/52"
                    />
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      className="hero-cta border-white/18 bg-white text-slate-900 hover:bg-white/92"
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
                      Lưu bảng
                    </Button>
                  </div>

                  <p className="text-sm text-white/70">
                    Trên điện thoại, bạn có thể chạm giữ rồi rê để di chuyển các phần tử trên bảng.
                  </p>
                </div>

                <div className="hidden xl:block rounded-[var(--r-card)] border border-white/14 bg-white/12 p-6 shadow-sm">
                  <ProductVisual variant="vision" className="mb-5 min-h-[180px]" />
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/60">
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
                        className="rounded-[var(--r-card)] border border-white/10 bg-black/12 px-4 py-4"
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

          <DialogContent className="max-w-3xl overflow-y-auto max-h-[85vh]">
            <DialogHeader>
              <DialogTitle>Thêm vào vision board</DialogTitle>
              <DialogDescription>
                Chọn loại phần tử phù hợp để làm bảng của bạn sống động và giàu ý nghĩa hơn.
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
                        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5 text-[11px] font-medium text-white">
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
                <Button className="w-full" onClick={handleAddQuote} disabled={!quoteText.trim()}>
                  Thêm câu nói vào bảng
                </Button>
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
              <div
                className="relative h-[520px] min-w-0 overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.82),_transparent_24%),linear-gradient(135deg,_rgba(244,244,255,0.96)_0%,_rgba(251,244,255,0.94)_48%,_rgba(239,246,255,0.96)_100%)] sm:h-[580px] lg:h-[620px] xl:h-[600px]"
              >
                <div className="pointer-events-none absolute inset-0 gradient-grid bg-[size:36px_36px] opacity-70" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(168,85,247,0.14),_transparent_24%),radial-gradient(circle_at_bottom_left,_rgba(56,189,248,0.14),_transparent_22%)]" />

                {board.items.length === 0 ? (
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
