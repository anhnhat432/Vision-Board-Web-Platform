import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  Calendar,
  Edit,
  Eye,
  Image as ImageIcon,
  Images,
  Package,
  Plus,
  Sparkles,
  Trash2,
  Trophy,
  Zap,
  Heart,
  Star,
  Sun,
  Moon,
  Target,
} from "lucide-react";

import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import { VisionMapIllustration } from "../components/illustrations";
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
import { InteractiveSurface } from "../components/ui/interactive-surface";
import { useSyncedUserData } from "../hooks/useSyncedUserData";
import { deleteVisionBoard, getUserData, saveUserData, type VisionBoard } from "../utils/storage";
import { useAuthContext } from "@/lib/auth/AuthContext";
import {
  deleteVisionBoard as backendDeleteVisionBoard,
  getVisionBoards as backendGetVisionBoards,
} from "@/services/visionBoardService";
import { getBackendVisionBoardId, getLocalVisionBoardId, saveVisionBoardLink } from "@/lib/api/visionBoardLinkStore";
import { generateId } from "../utils/storage-types";

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
    <div className="flex h-9 w-9 items-center justify-center rounded-[var(--r-pill)] gradient-brand text-primary-foreground shadow-[var(--shadow-2)]">
      <Icon className="h-4 w-4" />
    </div>
  );
}

export function VisionBoardGallery() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthContext();
  const { userData, reloadUserData } = useSyncedUserData();
  const [boardToDelete, setBoardToDelete] = useState<string | null>(null);

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
          // If a link already exists, this board was previously known locally.
          // Skip it — even if the local copy was deleted (intentional deletion).
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

  const handleDeleteBoard = (boardId: string) => {
    setBoardToDelete(boardId);
  };

  const confirmDeleteBoard = () => {
    if (!boardToDelete) return;
    deleteVisionBoard(boardToDelete);

    // Fire-and-forget backend delete
    if (user) {
      const backendId = getBackendVisionBoardId(boardToDelete);
      if (backendId) {
        void backendDeleteVisionBoard(backendId).catch(() => {});
      }
    }

    setBoardToDelete(null);
    reloadUserData();
  };

  const boardsByYear = useMemo(() => {
    if (!userData) return {};
    return userData.visionBoards.reduce(
      (acc, board) => {
        if (!acc[board.year]) acc[board.year] = [];
        acc[board.year].push(board);
        return acc;
      },
      {} as Record<string, typeof userData.visionBoards>,
    );
  }, [userData]);

  const years = useMemo(
    () => Object.keys(boardsByYear).sort((a, b) => parseInt(b, 10) - parseInt(a, 10)),
    [boardsByYear],
  );

  if (!userData) return null;

  const totalItems = userData.visionBoards.reduce((sum, board) => sum + board.items.length, 0);
  const latestBoard = userData.visionBoards[userData.visionBoards.length - 1];
  const spotlightBoardId =
    typeof location.state === "object" && location.state && "spotlightBoardId" in location.state
      ? (location.state as { spotlightBoardId?: string }).spotlightBoardId
      : undefined;
  const orderSourceBoard =
    (spotlightBoardId ? userData.visionBoards.find((board) => board.id === spotlightBoardId) : undefined) ??
    latestBoard;

  return (
    <div className="stack-section pb-12">
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
              Hành động này không thể hoàn tác. Toàn bộ hình ảnh, câu nói và biểu tượng trong bảng sẽ bị xóa vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteBoard} className="bg-red-600 hover:bg-red-700">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="overflow-hidden">
        <CardContent className="relative p-5 sm:p-6 lg:p-8">
          <div className="relative z-10 grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_360px]">
            <div className="stack-section">
              <div className="inline-flex items-center gap-2 rounded-[var(--r-pill)] border border-[color:var(--border)] bg-[color:var(--muted)] px-4 py-1.5 text-sm text-muted-foreground">
                <Images className="h-4 w-4" />
                Thư viện Dear Our Future
              </div>

              <div className="stack-stack">
                <h1 className="max-w-3xl text-2xl font-bold leading-[1.1] tracking-[-0.018em] text-foreground sm:text-3xl lg:text-4xl">
                  Một thư viện nơi mọi <span className="text-gradient-vibrant">vision board</span> của bạn được lưu lại như những phiên bản của tương lai.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                  Tại đây bạn có thể xem lại các vision board theo từng năm, tiếp tục chỉnh sửa, so sánh độ phong phú của
                  từng bảng và giữ cảm hứng luôn ở gần mình.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button glow onClick={() => navigate("/vision-board")}>
                  <Plus className="h-4 w-4" />
                  Tạo bảng mới
                </Button>
                {orderSourceBoard ? (
                  <Button
                    variant="outline"
                    onClick={() => navigate("/order", { state: { visionBoardId: orderSourceBoard.id } })}
                  >
                    <Package className="h-4 w-4" />
                    {spotlightBoardId ? "Tạo bộ in từ bảng vừa lưu" : "Tạo bộ in từ bảng gần nhất"}
                  </Button>
                ) : null}
                <Button variant="outline" onClick={() => navigate("/")}>
                  Về Trang chính
                </Button>
              </div>
            </div>

            <div className="hidden xl:block rounded-[var(--r-card)] border border-[color:var(--border)] bg-[color:var(--muted)] p-5 shadow-sm">
              <VisionMapIllustration className="mb-5 w-full text-[color:var(--tone-shell-primary)] opacity-70" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Snapshot thư viện</p>

              <div className="mt-4 stack-tight">
                <div className="rounded-[var(--r-card)] border border-[color:var(--border)] bg-card p-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Tổng số vision board</p>
                  <p className="mt-2 text-3xl font-bold text-foreground">{userData.visionBoards.length}</p>
                </div>
                <div className="rounded-[var(--r-card)] border border-[color:var(--border)] bg-card p-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Tổng số phần tử</p>
                  <p className="mt-2 text-3xl font-bold text-foreground">{totalItems}</p>
                </div>
                <div className="rounded-[var(--r-card)] border border-[color:var(--border)] bg-card p-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Vision board gần nhất</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {latestBoard ? latestBoard.name : "Chưa có bảng nào"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {latestBoard ? `Năm ${latestBoard.year}` : "Bắt đầu với bảng đầu tiên của bạn."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {userData.visionBoards.length > 0 && (
      <div className="stagger-hover-grid grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: "Tổng số vision board",
            value: userData.visionBoards.length,
            note: "bảng đang lưu",
            icon: Images,
            color: "from-violet-500/18 to-fuchsia-500/10 text-violet-700",
          },
          {
            title: "Năm bao quát",
            value: years.length,
            note: "mốc thời gian có bảng",
            icon: Calendar,
            color: "from-sky-500/18 to-cyan-500/10 text-sky-700",
          },
          {
            title: "Tổng phần tử",
            value: totalItems,
            note: "ảnh, câu nói và biểu tượng",
            icon: Sparkles,
            color: "from-amber-500/18 to-orange-500/10 text-amber-700",
          },
          {
            title: "Trung bình mỗi bảng",
            value: userData.visionBoards.length ? Math.round(totalItems / userData.visionBoards.length) : 0,
            note: "mức độ phong phú của bảng",
            icon: ImageIcon,
            color: "from-emerald-500/18 to-teal-500/10 text-emerald-700",
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.title}>
              <Card className="relative gap-4 overflow-hidden">
                <div
                  className={`pointer-events-none absolute inset-x-6 top-0 h-14 rounded-b-[24px] bg-gradient-to-br ${item.color} opacity-65 blur-xl`}
                />
                <CardHeader className="relative flex flex-row items-start justify-between pb-0">
                  <div>
                    <CardDescription>{item.title}</CardDescription>
                    <CardTitle className="mt-2 text-4xl">{item.value}</CardTitle>
                  </div>
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-[var(--r-tile)] bg-gradient-to-br ${item.color} opacity-90`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </CardHeader>
                <CardContent className="relative pt-0">
                  <p className="text-sm text-slate-500">{item.note}</p>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>
      )}

      {userData.visionBoards.length === 0 ? (
        <Card className="overflow-hidden">
          <CardContent className="p-10 text-center lg:p-14">
            <VisionMapIllustration className="mx-auto mb-4 w-56 text-violet-500 sm:w-64" />
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[var(--r-tile)] bg-violet-50 text-violet-700">
              <Images className="h-10 w-10" />
            </div>
            <h2 className="mt-6 text-3xl font-bold text-slate-900">Thư viện của bạn vẫn còn trống</h2>
            <p className="mx-auto mt-[var(--space-inline)] max-w-2xl text-base text-slate-500">
              Hãy tạo vision board đầu tiên để biến những hình dung trong đầu thành một không gian trực quan thật sự.
            </p>
            <Button className="mt-8" onClick={() => navigate("/vision-board")}>
              <Plus className="h-4 w-4" />
              Tạo vision board đầu tiên
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="stack-section">
          {years.map((year) => (
            <section key={year} className="stack-stack">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-[var(--r-tile)] bg-violet-50 text-violet-700">
                  <Calendar className="h-6 w-6" />
                </div>
                <div className="stack-tight">
                  <h2 className="text-2xl font-bold text-slate-900">{year}</h2>
                  <p className="text-sm text-slate-500">{boardsByYear[year].length} bảng được lưu trong năm này.</p>
                </div>
              </div>

              <div className="stagger-hover-grid grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {boardsByYear[year].map((board) => {
                  const imageCount = board.items.filter((item) => item.type === "image").length;
                  const quoteCount = board.items.filter((item) => item.type === "quote").length;
                  const iconCount = board.items.filter((item) => item.type === "icon").length;
                  const isSpotlight = spotlightBoardId === board.id;

                  return (
                    <div key={board.id}>
                      <InteractiveSurface
                        className="preview-hover-card group rounded-[var(--r-card)]"
                        intensity={4}
                        translate={8}
                        shine={false}
                      >
                        <Card className={isSpotlight ? "spotlight-card gap-5 overflow-hidden" : "gap-5 overflow-hidden"}>
                          <CardHeader className="pb-0">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <CardTitle>{board.name}</CardTitle>
                                  {isSpotlight && (
                                    <Badge
                                      variant="outline"
                                      className="spotlight-badge rounded-[var(--r-pill)] border-0 px-3 py-1.5"
                                    >
                                      Vừa lưu
                                    </Badge>
                                  )}
                                </div>
                                <CardDescription>
                                  {new Date(board.createdAt).toLocaleDateString("vi-VN")} • {board.items.length} phần tử
                                </CardDescription>
                              </div>
                              <Badge
                                variant="outline"
                                className="rounded-[var(--r-pill)] border-white/70 bg-white/72 px-3 py-1.5 text-slate-600"
                              >
                                {board.year}
                              </Badge>
                            </div>
                          </CardHeader>

                          <CardContent className="stack-stack pt-0">
                            <div
                              className="relative overflow-hidden rounded-[var(--r-card)] border border-white/80 bg-[linear-gradient(180deg,_rgba(248,250,252,0.98)_0%,_rgba(241,245,249,0.96)_100%)]"
                              style={{ aspectRatio: "16/10" }}
                            >
                              <div className="pointer-events-none absolute inset-0 gradient-grid bg-[size:30px_30px] opacity-28" />
                              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,_rgba(15,23,42,0)_24%,_rgba(15,23,42,0.05)_100%)]" />

                              {board.items.length === 0 ? (
                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                  <Sparkles className="h-12 w-12 text-slate-300" />
                                </div>
                              ) : (
                                <div className="preview-hover-media relative h-full w-full interactive-layer interactive-layer--strong">
                                  {board.items.slice(0, 6).map((item) => (
                                    <div
                                      key={item.id}
                                      className="absolute"
                                      style={{
                                        left: `${item.x}%`,
                                        top: `${item.y}%`,
                                        width: `${item.width * 0.44}px`,
                                      }}
                                    >
                                      {item.type === "image" && (
                                        <div className="rounded-[var(--r-card)] border border-white/80 bg-white/88 p-1.5 shadow-sm">
                                          <ImageWithFallback
                                            src={item.content}
                                            alt="Phần tử bảng"
                                            className="rounded-[var(--r-tile)] shadow-sm w-full h-auto"
                                          />
                                        </div>
                                      )}
                                      {item.type === "quote" && (
                                        <div className="rounded-[var(--r-tile)] border border-white/80 bg-white/90 px-3 py-2 text-[10px] italic leading-4 text-slate-700 shadow-sm">
                                          {item.content}
                                        </div>
                                      )}
                                      {item.type === "icon" && <BoardPreviewIcon content={item.content} />}
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="preview-hover-overlay absolute inset-x-4 bottom-4 rounded-[var(--r-tile)] border border-white/18 bg-slate-900/38 px-4 py-3 text-white shadow-lg">
                                <div className="flex items-center justify-between gap-4">
                                  <div>
                                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-white/58">
                                      Preview sống
                                    </p>
                                    <p className="mt-1 text-sm font-semibold">
                                      {imageCount} ảnh • {quoteCount} câu nói • {iconCount} biểu tượng
                                    </p>
                                  </div>
                                  <div className="flex h-10 w-10 items-center justify-center rounded-[var(--r-tile)] border border-white/16 bg-white/10">
                                    <Eye className="h-4 w-4" />
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                              <div className="rounded-[var(--r-tile)] border border-white/70 bg-white/72 p-3 text-center">
                                <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Ảnh</p>
                                <p className="mt-2 text-xl font-bold text-slate-900">{imageCount}</p>
                              </div>
                              <div className="rounded-[var(--r-tile)] border border-white/70 bg-white/72 p-3 text-center">
                                <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Câu nói</p>
                                <p className="mt-2 text-xl font-bold text-slate-900">{quoteCount}</p>
                              </div>
                              <div className="rounded-[var(--r-tile)] border border-white/70 bg-white/72 p-3 text-center">
                                <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Icon</p>
                                <p className="mt-2 text-xl font-bold text-slate-900">{iconCount}</p>
                              </div>
                            </div>

                            <div className="flex gap-2 border-t border-slate-100 pt-4">
                              <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => navigate(`/vision-board/${board.id}`)}
                              >
                                <Edit className="h-4 w-4" />
                                Chỉnh sửa
                              </Button>
                              <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => navigate(`/vision-board/${board.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                                Mở
                              </Button>
                              <Button
                                variant="outline"
                                className="border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
                                onClick={() => handleDeleteBoard(board.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </InteractiveSurface>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
