import {
  AlertTriangle,
  Calendar,
  Edit,
  Eye,
  Heart,
  Images,
  Moon,
  Plus,
  Sparkles,
  Star,
  Sun,
  Target,
  Trash2,
  Trophy,
  Zap,
  Search,
  LayoutGrid,
  List as ListIcon,
  Cloud,
  CloudOff,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { type NavigateFunction, useLocation, useNavigate } from "react-router";
import { EmptyState } from "@/app/components/states/EmptyState";
import { getBackendVisionBoardId, getLocalVisionBoardId, saveVisionBoardLink } from "@/lib/api/visionBoardLinkStore";
import { useAuthContext } from "@/lib/auth/AuthContext";
import {
  deleteVisionBoard as backendDeleteVisionBoard,
  getVisionBoards as backendGetVisionBoards,
} from "@/services/visionBoardService";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { VisionMapIllustration } from "../components/illustrations";
import { PageHero } from "../components/layout/PageHero";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { useSyncedUserData } from "../hooks/useSyncedUserData";
import { deleteVisionBoard, getUserData, saveUserData, type VisionBoard } from "../utils/storage";
import {
  computeGalleryStats,
  filterAndSortBoards,
  groupBoardsByYear,
  resolveGroupedByYear,
} from "./vision-board-gallery/gallerySelectors";
import { formatDisplayDate } from "../utils/storage-date-utils";
import { generateId } from "../utils/storage-types";
import { cn } from "../components/ui/utils";

const ICON_COMPONENTS = {
  Sparkles,
  Trophy,
  Zap,
  Heart,
  Star,
  Sun,
  Moon,
  Target,
};

type IconName = keyof typeof ICON_COMPONENTS;

function BoardPreviewIcon({ content }: { content: string }) {
  const Icon = ICON_COMPONENTS[content as IconName] ?? Sparkles;

  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-[var(--r-pill)] gradient-brand text-primary-foreground shadow-[var(--shadow-2)]">
      <Icon className="h-4 w-4" />
    </div>
  );
}

// Bố cục Scrapbook Polaroid Preview cho thẻ Vision Board
function BoardCollagePreview({ board }: { board: VisionBoard }) {
  const images = useMemo(() => board.items.filter((item) => item.type === "image"), [board.items]);
  const quotes = useMemo(() => board.items.filter((item) => item.type === "quote"), [board.items]);
  const icons = useMemo(() => board.items.filter((item) => item.type === "icon"), [board.items]);

  const hasImages = images.length > 0;

  if (!hasImages) {
    const firstQuote = quotes[0]?.content;
    return (
      <div className="w-full h-full relative overflow-hidden bg-app-bg-subtle flex flex-col items-center justify-center p-4">
        {/* Subtle grid pattern */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--app-line)_1px,transparent_1px)] bg-[size:16px_16px] opacity-25" />
        <div className="text-center max-w-[85%] z-10 space-y-2">
          {firstQuote ? (
            <p className="font-serif italic text-xs leading-relaxed text-app-ink-soft line-clamp-3">
              "{firstQuote}"
            </p>
          ) : (
            <p className="text-xs text-app-ink-muted uppercase tracking-[0.15em] font-medium">
              Bảng trống
            </p>
          )}
          <div className="flex justify-center gap-1.5 pt-1">
            {icons.slice(0, 3).map((ico) => (
              <BoardPreviewIcon key={ico.id} content={ico.content} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative overflow-hidden bg-app-bg-subtle p-3">
      {/* Grid background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--app-line)_1px,transparent_1px)] bg-[size:16px_16px] opacity-40" />
      
      {/* Polaroid 1 (Dưới cùng bên trái) */}
      {images[1] && (
        <div 
          className="absolute rounded bg-app-surface p-1 pb-3 shadow-app-sm border border-app-line overflow-hidden"
          style={{
            left: "8%",
            top: "16%",
            width: "38%",
          }}
        >
          <div className="aspect-[4/3] bg-app-bg-subtle overflow-hidden rounded-sm">
            <ImageWithFallback src={images[1].content} alt="Polaroid component" className="w-full h-full object-cover" />
          </div>
        </div>
      )}

      {/* Polaroid 2 (Dưới cùng bên phải) */}
      {images[2] && (
        <div 
          className="absolute rounded bg-app-surface p-1 pb-3 shadow-app-sm border border-app-line overflow-hidden"
          style={{
            right: "8%",
            top: "22%",
            width: "36%",
          }}
        >
          <div className="aspect-[4/3] bg-app-bg-subtle overflow-hidden rounded-sm">
            <ImageWithFallback src={images[2].content} alt="Polaroid component" className="w-full h-full object-cover" />
          </div>
        </div>
      )}

      {/* Polaroid 3 (Ở trên cùng, trung tâm) */}
      {images[0] && (
        <div 
          className={cn(
            "absolute rounded bg-app-surface p-1.5 pb-4 shadow-app-md border border-app-line overflow-hidden z-10",
            images.length === 1 ? "left-[28%] top-[12%] w-[44%]" : "left-[26%] top-[10%] w-[46%]"
          )}
        >
          <div className="aspect-[4/3] bg-app-bg-subtle overflow-hidden rounded-sm">
            <ImageWithFallback src={images[0].content} alt="Polaroid component" className="w-full h-full object-cover" />
          </div>
          <div className="mt-1.5 text-center">
            <div className="h-1 w-8 bg-app-line/40 mx-auto rounded-full" />
          </div>
        </div>
      )}

      {/* Ribbon Quote Overlaid (Nếu có quote) */}
      {quotes[0] && (
        <div 
          className="absolute bottom-[6%] left-1/2 -translate-x-1/2 w-[78%] bg-app-surface border border-app-line px-2 py-1 rounded shadow-app-sm text-center z-15"
        >
          <p className="font-serif italic text-[10px] leading-tight text-app-ink-soft truncate">
            "{quotes[0].content}"
          </p>
        </div>
      )}

      {/* Floating icon */}
      {icons[0] && (
        <div className="absolute right-[12%] top-[8%] z-15">
          <BoardPreviewIcon content={icons[0].content} />
        </div>
      )}
    </div>
  );
}

// Bảng dữ liệu List View
type VisionBoardSort = "newest" | "oldest" | "name" | "items";

function BoardListView({ boards, navigate, onDeleteClick }: { boards: VisionBoard[]; navigate: NavigateFunction; onDeleteClick: (id: string) => void }) {
  const { user } = useAuthContext();
  
  return (
    <Card className="overflow-hidden border border-app-line/60 rounded-card shadow-app-sm bg-app-surface">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-app-line bg-app-bg-subtle/50">
              <th className="py-3 px-4 font-semibold text-xs text-app-ink-muted uppercase tracking-wider">Bảng tầm nhìn</th>
              <th className="py-3 px-4 font-semibold text-xs text-app-ink-muted uppercase tracking-wider">Năm</th>
              <th className="py-3 px-4 font-semibold text-xs text-app-ink-muted uppercase tracking-wider">Ngày tạo</th>
              <th className="py-3 px-4 font-semibold text-xs text-app-ink-muted uppercase tracking-wider">Chi tiết</th>
              <th className="py-3 px-4 font-semibold text-xs text-app-ink-muted uppercase tracking-wider">Đồng bộ</th>
              <th className="py-3 px-4 font-semibold text-xs text-app-ink-muted uppercase tracking-wider text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app-line/50">
            {boards.map((board) => {
              const imageCount = board.items.filter((item) => item.type === "image").length;
              const quoteCount = board.items.filter((item) => item.type === "quote").length;
              const iconCount = board.items.filter((item) => item.type === "icon").length;
              const backendId = getBackendVisionBoardId(board.id);
              const isSynced = Boolean(backendId);

              const firstImage = board.items.find((item) => item.type === "image")?.content;

              return (
                <tr key={board.id} className="hover:bg-app-accent-subtle/25 transition-colors group">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {/* Mini Thumbnail */}
                      <div className="w-12 h-9 rounded border border-app-line bg-app-bg-subtle overflow-hidden relative flex-shrink-0 flex items-center justify-center">
                        {firstImage ? (
                          <ImageWithFallback src={firstImage} alt={board.name} className="w-full h-full object-cover" />
                        ) : (
                          <Sparkles className="h-4 w-4 text-app-ink-muted/50" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-app-ink group-hover:text-app-accent transition-colors">
                          {board.name}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-sm text-app-ink-soft">
                    <Badge variant="outline" className="border-app-line/60 bg-app-bg-subtle text-app-ink-soft font-semibold text-xs px-2.5 py-0.5 rounded-[var(--r-pill)]">
                      {board.year}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-sm text-app-ink-soft">
                    {formatDisplayDate(board.createdAt)}
                  </td>
                  <td className="py-3 px-4 text-xs text-app-ink-muted">
                    <div className="flex gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-app-line/45">{imageCount} ảnh</span>
                      <span className="px-1.5 py-0.5 rounded bg-app-line/45">{quoteCount} câu nói</span>
                      <span className="px-1.5 py-0.5 rounded bg-app-line/45">{iconCount} icon</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {user ? (
                      isSynced ? (
                        <div className="flex items-center gap-1.5 text-xs text-app-status-success font-medium" title="Đã đồng bộ lên tài khoản Cloud">
                          <Cloud className="h-3.5 w-3.5" />
                          <span className="hidden md:inline">Đã đồng bộ</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-app-status-warning font-medium" title="Chỉ lưu ở trình duyệt này">
                          <CloudOff className="h-3.5 w-3.5" />
                          <span className="hidden md:inline">Chỉ lưu cục bộ</span>
                        </div>
                      )
                    ) : (
                      <div className="flex items-center gap-1.5 text-xs text-app-ink-muted" title="Đăng nhập để đồng bộ đám mây">
                        <CloudOff className="h-3.5 w-3.5 opacity-60" />
                        <span className="hidden md:inline">Chưa đăng nhập</span>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-app-ink-soft hover:text-app-accent hover:bg-app-accent-soft/50"
                        onClick={() => navigate(`/vision-board/${board.id}`)}
                        title="Xem chi tiết"
                        aria-label={`Xem chi tiết bảng ${board.name}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-app-ink-soft hover:text-app-accent hover:bg-app-accent-soft/50"
                        onClick={() => navigate(`/vision-board/${board.id}`)}
                        title="Chỉnh sửa"
                        aria-label={`Chỉnh sửa bảng ${board.name}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-app-status-error hover:text-app-status-error hover:bg-app-status-error/10"
                        onClick={() => onDeleteClick(board.id)}
                        title="Xóa"
                        aria-label={`Xóa bảng ${board.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// Thẻ board dạng lưới (tĩnh, không InteractiveSurface/3D)
function BoardGridCard({
  board,
  isSpotlight,
  user,
  navigate,
  onDeleteClick,
}: {
  board: VisionBoard;
  isSpotlight: boolean;
  user: ReturnType<typeof useAuthContext>["user"];
  navigate: NavigateFunction;
  onDeleteClick: (id: string) => void;
}) {
  const backendId = getBackendVisionBoardId(board.id);
  const isSynced = Boolean(backendId);

  return (
    <div className="relative group">
      <Card
        className={cn(
          "w-full h-full flex flex-col justify-between overflow-hidden rounded-card-lg border border-app-line bg-app-surface transition-shadow duration-300 hover:shadow-app-lg",
          isSpotlight ? "ring-2 ring-app-accent shadow-app-lg" : "",
        )}
      >
        {/* Top Card Header */}
        <CardHeader className="p-4 pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <CardTitle className="text-base font-bold text-app-ink truncate">{board.name}</CardTitle>
                {isSpotlight && (
                  <Badge className="bg-app-accent text-[var(--app-ink-on-accent)] border-0 text-[9px] px-2 py-0.5 rounded-[var(--r-pill)]">
                    Vừa lưu
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs text-app-ink-muted mt-0.5">
                {formatDisplayDate(board.createdAt)} • {board.items.length} phần tử
              </CardDescription>
            </div>
            <div className="flex items-center gap-1">
              {user &&
                (isSynced ? (
                  <span title="Đã đồng bộ lên Cloud">
                    <Cloud className="h-4 w-4 text-app-status-success" />
                  </span>
                ) : (
                  <span title="Chỉ lưu trữ cục bộ">
                    <CloudOff className="h-4 w-4 text-app-ink-muted/50" />
                  </span>
                ))}
              <Badge variant="outline" className="border-app-line bg-app-bg-subtle text-[10px] text-app-ink-soft font-semibold px-2 py-0.5 rounded-[var(--r-pill)]">
                {board.year}
              </Badge>
            </div>
          </div>
        </CardHeader>

        {/* Central Scrapbook Collage Preview */}
        <CardContent className="p-3 pt-0 flex-1 flex flex-col justify-end">
          <div
            className="relative overflow-hidden rounded-card border border-app-line bg-app-bg-subtle"
            style={{ aspectRatio: "16/10" }}
          >
            {/* Scrapbook view */}
            <BoardCollagePreview board={board} />

            {/* Hover/Focus Action Overlay (tĩnh: chỉ đổi opacity) */}
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-app-surface/85 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-control text-xs font-semibold h-9 px-3.5"
                  onClick={() => navigate(`/vision-board/${board.id}`)}
                  aria-label={`Mở xem bảng ${board.name}`}
                >
                  <Eye className="h-3.5 w-3.5 mr-1" /> Mở xem
                </Button>
                <Button
                  size="sm"
                  className="rounded-control text-xs font-semibold h-9 px-3.5"
                  onClick={() => navigate(`/vision-board/${board.id}`)}
                  aria-label={`Thiết kế bảng ${board.name}`}
                >
                  <Edit className="h-3.5 w-3.5 mr-1" /> Thiết kế
                </Button>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 h-8 w-8 p-0 rounded-full text-app-status-error hover:text-app-status-error hover:bg-app-status-error/10"
                onClick={() => onDeleteClick(board.id)}
                title="Xóa"
                aria-label={`Xóa bảng ${board.name}`}
              >
                <Trash2 className="h-4.5 w-4.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function VisionBoardGallery() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthContext();
  const { userData, reloadUserData } = useSyncedUserData();
  const [boardToDelete, setBoardToDelete] = useState<string | null>(null);
  // Nhánh lỗi tải ở mức trình bày (Req 7.5). Không đổi Data_Behavior: chỉ dò đọc
  // an toàn qua getUserData() để quyết định hiển thị. Nếu đọc dữ liệu ném lỗi thì
  // hiển thị trạng thái lỗi + "Thử lại" thay cho skeleton.
  const [loadError, setLoadError] = useState(false);

  // States cho bộ lọc & Toolbar
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [sortBy, setSortBy] = useState<VisionBoardSort>("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Hydrate from backend: import any backend boards that have no local counterpart.
  // Runs once per mount for authenticated users. Backend failures are silent.
  useEffect(() => {
    if (!user) return;

    void backendGetVisionBoards()
      .then((backendBoards) => {
        if (backendBoards.length === 0) return;

        const localData = getUserData();
        let didHydrate = false;

        for (const backendBoard of backendBoards) {
          const existingLocalId = getLocalVisionBoardId(backendBoard.id);
          if (existingLocalId) continue;

          const localBoard: VisionBoard = {
            id: generateId("board"),
            name: backendBoard.name,
            year: backendBoard.year,
            items: backendBoard.items.map((item) => ({
              id: generateId("item"),
              type: item.type,
              content: item.content,
              x: item.x,
              y: item.y,
              width: item.width,
              height: item.height,
            })),
            createdAt: backendBoard.createdAt,
          };

          localData.visionBoards.push(localBoard);
          saveVisionBoardLink(localBoard.id, backendBoard.id);
          didHydrate = true;
        }

        if (didHydrate) {
          saveUserData(localData);
          reloadUserData();
        }
      })
      .catch((err: unknown) => {
        console.warn("Backend vision board hydration failed silently.", err);
      });
  }, [user, reloadUserData]);

  // Dò đọc an toàn ở mức trình bày: khi dữ liệu chưa sẵn sàng, thử đọc getUserData()
  // trong try/catch. Nếu ném lỗi -> bật nhánh lỗi tải; nếu đọc được -> tắt cờ lỗi.
  // Không ghi/không reset dữ liệu, giữ nguyên Data_Behavior.
  useEffect(() => {
    if (userData) {
      setLoadError(false);
      return;
    }
    try {
      getUserData();
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, [userData]);

  const handleRetryLoad = () => {
    setLoadError(false);
    reloadUserData();
  };

  const handleDeleteBoard = (boardId: string) => {
    setBoardToDelete(boardId);
  };

  const confirmDeleteBoard = () => {
    if (!boardToDelete) return;
    deleteVisionBoard(boardToDelete);

    if (user) {
      const backendId = getBackendVisionBoardId(boardToDelete);
      if (backendId) {
        void backendDeleteVisionBoard(backendId).catch(() => {});
      }
    }

    setBoardToDelete(null);
    reloadUserData();
  };

  // Danh sách năm có trong dữ liệu ban đầu
  const originalYears = useMemo(() => {
    if (!userData) return [];
    const yrs = userData.visionBoards.map(b => b.year);
    return Array.from(new Set(yrs)).sort((a, b) => parseInt(b, 10) - parseInt(a, 10));
  }, [userData]);

  // Bộ lọc & Sắp xếp dữ liệu (Danh sách phẳng)
  const filteredAndSortedBoards = useMemo(() => {
    if (!userData) return [];
    return filterAndSortBoards(userData.visionBoards, searchTerm, selectedYear, sortBy);
  }, [userData, searchTerm, selectedYear, sortBy]);

  // Gom nhóm dữ liệu lọc được theo năm nếu dùng Group view
  const isGroupedByYear = resolveGroupedByYear(viewMode, searchTerm, sortBy);

  const boardsByYear = useMemo(() => {
    return groupBoardsByYear(filteredAndSortedBoards);
  }, [filteredAndSortedBoards]);

  const activeYears = useMemo(() => {
    return Object.keys(boardsByYear).sort((a, b) => parseInt(b, 10) - parseInt(a, 10));
  }, [boardsByYear]);

  // Bento Stats calculations (giữ nguyên hành vi: tính trên toàn bộ visionBoards)
  const stats = useMemo(() => {
    if (!userData) return { total: 0, yearsCount: 0, totalItemsCount: 0, avgItems: 0, distribution: { image: 0, quote: 0, icon: 0 } };
    return computeGalleryStats(userData.visionBoards);
  }, [userData]);

  // Nhánh lỗi tải (Req 7.5): thay skeleton bằng trạng thái lỗi + hành động thử lại.
  // Không giữ skeleton sau khi vào lỗi.
  if (loadError) {
    return (
      <div className="stack-section mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">
        <EmptyState
          icon={<AlertTriangle className="h-10 w-10 text-app-status-error" />}
          title="Không tải được dữ liệu thư viện"
          description="Đã xảy ra sự cố khi đọc dữ liệu thư viện trên thiết bị này. Vui lòng thử lại."
          actions={<Button onClick={handleRetryLoad}>Thử lại</Button>}
        />
      </div>
    );
  }

  if (!userData) return <VisionBoardGallerySkeleton />;

  const spotlightBoardId =
    typeof location.state === "object" && location.state && "spotlightBoardId" in location.state
      ? (location.state as { spotlightBoardId?: string }).spotlightBoardId
      : undefined;

  return (
    <div className="stack-section mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">
      <ScreenGuide {...SCREEN_GUIDES.visionBoardGallery} className="mb-4" />
      <AlertDialog
        open={Boolean(boardToDelete)}
        onOpenChange={(open) => {
          if (!open) setBoardToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa vision board này?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Toàn bộ hình ảnh, câu nói và biểu tượng trong bảng sẽ bị xóa vĩnh viễn khỏi thiết bị này và máy chủ.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteBoard}
              className="bg-[color:var(--color-danger-fg)] text-white hover:bg-[color:var(--color-danger-fg)]/90"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Page Hero */}
      <PageHero
        serif
        className="page-enter shadow-app-md border border-app-line/60 bg-app-surface"
        eyebrow="Thư viện Bản vẽ Tương lai"
        eyebrowIcon={<Images className="h-3.5 w-3.5 text-app-accent" />}
        title={
          <>
            Đắm mình trong <span className="text-app-accent">ước mơ</span> lớn của chính bạn.
          </>
        }
        description="Lưu giữ các vision board qua từng năm, nhìn lại hành trình lớn và tiếp tục cập nhật các mục tiêu mới."
        primaryCta={
          <Button onClick={() => navigate("/vision-board")} className="shadow-md shadow-app-accent/15">
            <Plus className="h-4 w-4" />
            Tạo bảng mới
          </Button>
        }
        secondaryCta={
          <Button variant="outline" onClick={() => navigate("/")}>
            Trang chủ
          </Button>
        }
        aside={
          <div aria-hidden="true">
            <VisionMapIllustration className="mx-auto h-auto w-full max-w-[340px] text-app-accent" />
          </div>
        }
      />

      {/* Bento Stats Grid */}
      {userData.visionBoards.length > 0 && (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3 lg:grid-cols-4 mt-6">
          {/* Card 1: Tổng số Board */}
          <Card className="md:col-span-2 rounded-card border border-app-line bg-app-surface shadow-app-sm transition-shadow duration-300 hover:shadow-app-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardDescription className="text-xs uppercase tracking-wider text-app-ink-muted">Tâm điểm Tầm nhìn</CardDescription>
                <CardTitle className="mt-1 text-3xl font-bold font-serif text-app-ink">{stats.total} bảng hiện có</CardTitle>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-[var(--r-tile)] bg-app-accent text-[var(--app-ink-on-accent)] shadow-app-sm">
                <Images className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="pt-2 pb-5">
              <p className="text-sm text-app-ink-soft">
                Mỗi bảng là một mốc thời gian chánh niệm, chứa đựng những tầm nhìn sống động định hình tương lai.
              </p>
              <div className="mt-4">
                <Button 
                  size="sm" 
                  className="h-8 rounded-control bg-app-accent text-[var(--app-ink-on-accent)] hover:bg-app-accent-hover text-xs font-semibold"
                  onClick={() => navigate("/vision-board")}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Kiến tạo tương lai
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Số năm bao quát */}
          <Card className="rounded-card border border-app-line bg-app-surface shadow-app-sm transition-shadow duration-300 hover:shadow-app-md">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div className="space-y-1">
                <CardDescription className="text-xs uppercase tracking-wider text-app-ink-muted">Trải qua</CardDescription>
                <CardTitle className="text-3xl font-bold font-serif text-app-warm">{stats.yearsCount}</CardTitle>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-[var(--r-tile)] bg-app-warm-soft text-app-warm">
                <Calendar className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="pt-2 pb-5">
              <p className="text-xs text-app-ink-soft font-medium leading-relaxed mb-1">
                Mốc thời gian ghi nhận:
              </p>
              <p className="text-xs text-app-ink-muted line-clamp-2">
                {originalYears.join(", ") || "Chưa ghi nhận"}
              </p>
            </CardContent>
          </Card>

          {/* Card 3: Tổng phần tử */}
          <Card className="rounded-card border border-app-line bg-app-surface shadow-app-sm transition-shadow duration-300 hover:shadow-app-md">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div className="space-y-1">
                <CardDescription className="text-xs uppercase tracking-wider text-app-ink-muted">Tích lũy</CardDescription>
                <CardTitle className="text-3xl font-bold font-serif text-app-accent">{stats.totalItemsCount}</CardTitle>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-[var(--r-tile)] bg-app-accent-soft text-app-accent">
                <Sparkles className="h-5 w-5" />
              </div>
            </CardHeader>
            <CardContent className="pt-2 pb-5">
              <p className="text-xs text-app-ink-muted leading-relaxed">
                Mỗi ảnh hay câu trích dẫn là một viên gạch đắp xây giấc mơ. Trung bình {stats.avgItems} phần tử/bảng.
              </p>
            </CardContent>
          </Card>

          {/* Card 4: Tỷ lệ phân bổ sáng tạo */}
          <Card className="md:col-span-3 lg:col-span-4 rounded-card border border-app-line bg-app-surface shadow-app-sm transition-shadow duration-300 hover:shadow-app-md">
            <CardHeader className="pb-1 pt-4 flex flex-row items-center justify-between">
              <div className="space-y-0.5">
                <CardDescription className="text-xs uppercase tracking-wider text-app-ink-muted">Phong cách Sáng tạo</CardDescription>
                <CardTitle className="text-sm font-semibold text-app-ink">Tỉ lệ phân bổ các loại phần tử trên bảng</CardTitle>
              </div>
              <Badge variant="outline" className="border-app-line bg-app-bg-subtle text-app-ink-soft text-[10px] uppercase font-bold tracking-wider">
                Khám phá
              </Badge>
            </CardHeader>
            <CardContent className="pt-2 pb-4 space-y-3">
              <div className="h-2 w-full rounded-full bg-app-line/45 overflow-hidden flex">
                <div style={{ width: `${stats.distribution.image}%` }} className="h-full bg-app-accent transition-all duration-300" title={`Hình ảnh: ${stats.distribution.image}%`} />
                <div style={{ width: `${stats.distribution.quote}%` }} className="h-full bg-app-warm transition-all duration-300" title={`Câu nói: ${stats.distribution.quote}%`} />
                <div style={{ width: `${stats.distribution.icon}%` }} className="h-full bg-app-status-info transition-all duration-300" title={`Biểu tượng: ${stats.distribution.icon}%`} />
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-app-ink-soft font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-app-accent" />
                  <span>Hình ảnh ({stats.distribution.image}%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-app-warm" />
                  <span>Câu truyền cảm hứng ({stats.distribution.quote}%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-app-status-info" />
                  <span>Biểu tượng cảm xúc ({stats.distribution.icon}%)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Advanced Premium Toolbar */}
      {userData.visionBoards.length > 0 && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border border-app-line/50 rounded-card p-3 bg-app-surface shadow-app-sm mt-6">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            {/* Search Input */}
            <div className="relative w-full sm:max-w-[280px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-app-ink-muted" />
              <input
                type="text"
                aria-label="Tìm bảng tầm nhìn theo tên"
                placeholder="Tìm tên bảng tầm nhìn..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm rounded-[var(--r-input)] border border-app-line bg-app-surface text-app-ink placeholder-app-ink-muted focus:border-app-accent/40 focus:ring-2 focus:ring-app-accent/14 outline-none transition-all"
              />
            </div>

            {/* Year selector */}
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-3.5 w-3.5 text-app-ink-muted hidden md:inline" />
              <select
                aria-label="Lọc bảng theo năm"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="rounded-[var(--r-input)] border border-app-line bg-app-surface px-3 py-2 text-sm font-semibold text-app-ink-soft focus:border-app-accent/40 focus:ring-2 focus:ring-app-accent/14 outline-none transition-all"
              >
                <option value="all">Tất cả năm</option>
                {originalYears.map(y => (
                  <option key={y} value={y}>Năm {y}</option>
                ))}
              </select>
            </div>

            {/* Sort selector */}
            <div className="flex items-center gap-2">
              <select
                aria-label="Sắp xếp danh sách bảng"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as VisionBoardSort)}
                className="rounded-[var(--r-input)] border border-app-line bg-app-surface px-3 py-2 text-sm font-semibold text-app-ink-soft focus:border-app-accent/40 focus:ring-2 focus:ring-app-accent/14 outline-none transition-all"
              >
                <option value="newest">Mới nhất trước</option>
                <option value="oldest">Cũ nhất trước</option>
                <option value="name">Tên A - Z</option>
                <option value="items">Nhiều phần tử nhất</option>
              </select>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 border border-app-line bg-app-bg-subtle p-0.5 rounded-[var(--r-input)] self-end sm:self-center">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-3 rounded-[var(--r-input)] text-xs font-semibold transition-all",
                viewMode === "grid" 
                  ? "bg-app-surface text-app-accent shadow-sm border border-app-line/20" 
                  : "text-app-ink-muted hover:text-app-ink"
              )}
              aria-label="Xem dạng lưới"
              aria-pressed={viewMode === "grid"}
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid className="h-3.5 w-3.5 mr-1" /> Lưới
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 px-3 rounded-[var(--r-input)] text-xs font-semibold transition-all",
                viewMode === "list" 
                  ? "bg-app-surface text-app-accent shadow-sm border border-app-line/20" 
                  : "text-app-ink-muted hover:text-app-ink"
              )}
              aria-label="Xem dạng danh sách"
              aria-pressed={viewMode === "list"}
              onClick={() => setViewMode("list")}
            >
              <ListIcon className="h-3.5 w-3.5 mr-1" /> Danh sách
            </Button>
          </div>
        </div>
      )}

      {/* Main Boards List/Grid Content */}
      {userData.visionBoards.length === 0 ? (
        <EmptyState
          illustration={<VisionMapIllustration className="w-56 text-app-accent sm:w-64" />}
          icon={<Images className="h-10 w-10" />}
          title="Thư viện của bạn vẫn còn trống"
          description="Hãy tạo vision board đầu tiên để lưu lại và biến những hình dung trong đầu thành một không gian trực quan thật sự."
          actions={
            <Button onClick={() => navigate("/vision-board")} className="shadow-md shadow-app-accent/15">
              <Plus className="h-4 w-4 mr-1.5" />
              Tạo vision board đầu tiên
            </Button>
          }
        />
      ) : filteredAndSortedBoards.length === 0 ? (
        <EmptyState
          icon={<Search className="h-10 w-10 text-app-ink-muted" />}
          title="Không tìm thấy bảng phù hợp"
          description="Thử đổi từ khóa tìm kiếm hoặc lọc các năm khác."
          actions={
            <Button variant="outline" onClick={() => { setSearchTerm(""); setSelectedYear("all"); setSortBy("newest"); }}>
              Thiết lập lại bộ lọc
            </Button>
          }
        />
      ) : viewMode === "list" ? (
        <div className="mt-6">
          <BoardListView boards={filteredAndSortedBoards} navigate={navigate} onDeleteClick={handleDeleteBoard} />
        </div>
      ) : isGroupedByYear ? (
        /* Nhóm theo năm (Giao diện Grid mặc định) */
        <div className="space-y-10 mt-6">
          {activeYears.map((year) => (
            <section key={year} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-[var(--r-tile)] bg-app-accent-soft text-app-accent">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold font-serif text-app-ink">Năm {year}</h2>
                  <p className="text-xs text-app-ink-muted">{boardsByYear[year].length} bảng tầm nhìn được lưu trong năm này.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {boardsByYear[year].map((board) => (
                  <BoardGridCard
                    key={board.id}
                    board={board}
                    isSpotlight={spotlightBoardId === board.id}
                    user={user}
                    navigate={navigate}
                    onDeleteClick={handleDeleteBoard}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        /* Phẳng - Không gom nhóm (Khi Search/Sort được áp dụng) */
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 mt-6">
          {filteredAndSortedBoards.map((board) => (
            <BoardGridCard
              key={board.id}
              board={board}
              isSpotlight={spotlightBoardId === board.id}
              user={user}
              navigate={navigate}
              onDeleteClick={handleDeleteBoard}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function VisionBoardGallerySkeleton() {
  return (
    <div
      className="stack-section mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-6 lg:px-8"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <span className="sr-only">Đang tải bộ sưu tập tầm nhìn...</span>

      {/* Vùng hero: đúng một nhóm skeleton */}
      <Skeleton className="h-44 rounded-card-lg bg-app-line/60" />

      {/* Vùng thống kê (bento): đúng một nhóm skeleton */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-4">
        <Skeleton className="h-32 md:col-span-2 rounded-card bg-app-line/40" />
        <Skeleton className="h-32 rounded-card bg-app-line/40" />
        <Skeleton className="h-32 rounded-card bg-app-line/40" />
      </div>

      {/* Vùng toolbar: đúng một nhóm skeleton */}
      <Skeleton className="h-12 rounded-card bg-app-line/40" />

      {/* Vùng lưới thẻ: đúng một nhóm skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <Skeleton key={index} className="aspect-[16/11] rounded-card bg-app-line/50" />
        ))}
      </div>
    </div>
  );
}
