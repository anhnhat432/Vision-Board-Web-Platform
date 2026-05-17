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
import { PageHero } from "../components/layout/PageHero";
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
    <div className="flex h-9 w-9 items-center justify-center rounded-[var(--r-tile)] bg-app-accent-soft text-app-accent shadow-sm">
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
              Hành d?ng này không th? hoàn tác. Toàn b? hình ?nh, câu nói và bi?u tu?ng trong b?ng s? b? xóa vinh vi?n.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>H?y</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteBoard} className="bg-red-600 hover:bg-red-700">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PageHero
        className="page-enter"
        eyebrow="Thu vi?n Dear Our Future"
        eyebrowIcon={<Images className="h-3.5 w-3.5" />}
        title={
          <>
            M?i <span className="text-gradient-vibrant">vision board</span> du?c luu l?i nhu nh?ng phiên b?n tuong lai.
          </>
        }
        description="Xem l?i các vision board theo t?ng nam, ti?p t?c ch?nh s?a và gi? c?m h?ng luôn ? g?n mình."
        primaryCta={
          <Button glow onClick={() => navigate("/vision-board")}>
            <Plus className="h-4 w-4" />
            T?o b?ng m?i
          </Button>
        }
        secondaryCta={
          orderSourceBoard ? (
            <Button
              variant="outline"
              onClick={() => navigate("/order", { state: { visionBoardId: orderSourceBoard.id } })}
            >
              <Package className="h-4 w-4" />
              {spotlightBoardId ? "T?o b? in t? b?ng v?a luu" : "T?o b? in t? b?ng g?n nh?t"}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => navigate("/")}>
              V? Trang chính
            </Button>
          )
        }
        aside={
          <div className="rounded-[var(--r-tile)] border border-app-line bg-app-bg p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-ink-muted">Snapshot thu vi?n</p>
            <div className="mt-3 grid gap-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-[var(--r-control)] border border-app-line bg-app-surface px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-app-ink-muted">T?ng b?ng</p>
                  <p className="mt-1 text-2xl font-bold text-app-ink">{userData.visionBoards.length}</p>
                </div>
                <div className="rounded-[var(--r-control)] border border-app-line bg-app-surface px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-[0.12em] text-app-ink-muted">Ph?n t?</p>
                  <p className="mt-1 text-2xl font-bold text-app-ink">{totalItems}</p>
                </div>
              </div>
              <div className="rounded-[var(--r-control)] border border-app-line bg-app-surface px-3 py-2.5">
                <p className="text-[11px] uppercase tracking-[0.12em] text-app-ink-muted">B?ng g?n nh?t</p>
                <p className="mt-1 truncate text-sm font-semibold text-app-ink">
                  {latestBoard ? latestBoard.name : "Chua có b?ng nào"}
                </p>
                <p className="text-xs text-app-ink-soft">
                  {latestBoard ? `Nam ${latestBoard.year}` : "B?t d?u v?i b?ng d?u tiên."}
                </p>
              </div>
            </div>
          </div>
        }
      />

      {userData.visionBoards.length > 0 && (
      <div className="stagger-hover-grid grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: "T?ng s? vision board",
            value: userData.visionBoards.length,
            note: "b?ng dang luu",
            icon: Images,
          },
          {
            title: "Nam bao quát",
            value: years.length,
            note: "m?c th?i gian có b?ng",
            icon: Calendar,
          },
          {
            title: "T?ng ph?n t?",
            value: totalItems,
            note: "?nh, câu nói và bi?u tu?ng",
            icon: Sparkles,
          },
          {
            title: "Trung bình m?i b?ng",
            value: userData.visionBoards.length ? Math.round(totalItems / userData.visionBoards.length) : 0,
            note: "m?c d? phong phú c?a b?ng",
            icon: ImageIcon,
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div key={item.title}>
              <Card className="relative gap-4 overflow-hidden">
                <CardHeader className="relative flex flex-row items-start justify-between pb-0">
                  <div>
                    <CardDescription>{item.title}</CardDescription>
                    <CardTitle className="mt-2 text-4xl text-app-ink">{item.value}</CardTitle>
                  </div>
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-[var(--r-tile)] bg-app-accent-soft text-app-accent"
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </CardHeader>
                <CardContent className="relative pt-0">
                  <p className="text-sm text-app-ink-soft">{item.note}</p>
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
            <VisionMapIllustration className="mx-auto mb-4 w-56 text-app-ink-muted sm:w-64" />
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[var(--r-tile)] bg-app-accent-soft text-app-accent">
              <Images className="h-10 w-10" />
            </div>
            <h2 className="mt-6 text-3xl font-medium text-app-ink">Thu vi?n c?a b?n v?n còn tr?ng</h2>
            <p className="mx-auto mt-[var(--space-inline)] max-w-2xl text-base text-app-ink-soft">
              Hãy t?o vision board d?u tiên d? bi?n nh?ng hình dung trong d?u thành m?t không gian tr?c quan th?t s?.
            </p>
            <Button className="mt-8" onClick={() => navigate("/vision-board")}>
              <Plus className="h-4 w-4" />
              T?o vision board d?u tiên
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="stack-section">
          {years.map((year) => (
            <section key={year} className="stack-stack">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-[var(--r-tile)] bg-app-accent-soft text-app-accent">
                  <Calendar className="h-6 w-6" />
                </div>
                <div className="stack-tight">
                  <h2 className="text-2xl font-bold text-app-ink">{year}</h2>
                  <p className="text-sm text-app-ink-soft">{boardsByYear[year].length} b?ng du?c luu trong nam này.</p>
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
                                      V?a luu
                                    </Badge>
                                  )}
                                </div>
                                <CardDescription>
                                  {new Date(board.createdAt).toLocaleDateString("vi-VN")} • {board.items.length} ph?n t?
                                </CardDescription>
                              </div>
                              <Badge
                                variant="outline"
                                className="rounded-[var(--r-pill)] border-app-line bg-app-surface px-3 py-1.5 text-app-ink-soft"
                              >
                                {board.year}
                              </Badge>
                            </div>
                          </CardHeader>

                          <CardContent className="stack-stack pt-0">
                            <div
                              className="relative overflow-hidden rounded-[var(--r-card)] border border-app-line bg-[linear-gradient(180deg,_rgba(248,250,252,0.98)_0%,_rgba(241,245,249,0.96)_100%)]"
                              style={{ aspectRatio: "16/10" }}
                            >
                              <div className="pointer-events-none absolute inset-0 gradient-grid bg-[size:30px_30px] opacity-28" />
                              <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,_rgba(15,23,42,0)_24%,_rgba(15,23,42,0.05)_100%)]" />

                              {board.items.length === 0 ? (
                                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                                  <Sparkles className="h-12 w-12 text-app-ink-muted" />
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
                                        <div className="rounded-[var(--r-card)] border border-app-line bg-app-surface p-1.5 shadow-sm">
                                          <ImageWithFallback
                                            src={item.content}
                                            alt="Ph?n t? b?ng"
                                            className="rounded-[var(--r-tile)] shadow-sm w-full h-auto"
                                          />
                                        </div>
                                      )}
                                      {item.type === "quote" && (
                                        <div className="rounded-[var(--r-tile)] border border-app-line bg-app-surface px-3 py-2 text-[11px] italic leading-4 text-slate-700 shadow-sm">
                                          {item.content}
                                        </div>
                                      )}
                                      {item.type === "icon" && <BoardPreviewIcon content={item.content} />}
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="preview-hover-overlay absolute inset-x-4 bottom-4 rounded-[var(--r-tile)] border border-app-line bg-slate-900/38 px-4 py-3 text-white shadow-lg">
                                <div className="flex items-center justify-between gap-4">
                                  <div>
                                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-white/58">
                                      Preview s?ng
                                    </p>
                                    <p className="mt-1 text-sm font-semibold">
                                      {imageCount} ?nh • {quoteCount} câu nói • {iconCount} bi?u tu?ng
                                    </p>
                                  </div>
                                  <div className="flex h-10 w-10 items-center justify-center rounded-[var(--r-tile)] border border-app-line bg-app-surface">
                                    <Eye className="h-4 w-4" />
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                              <div className="rounded-[var(--r-tile)] border border-app-line bg-app-surface p-3 text-center">
                                <p className="text-xs uppercase tracking-[0.12em] text-app-ink-muted">?nh</p>
                                <p className="mt-2 text-xl font-bold text-app-ink">{imageCount}</p>
                              </div>
                              <div className="rounded-[var(--r-tile)] border border-app-line bg-app-surface p-3 text-center">
                                <p className="text-xs uppercase tracking-[0.12em] text-app-ink-muted">Câu nói</p>
                                <p className="mt-2 text-xl font-bold text-app-ink">{quoteCount}</p>
                              </div>
                              <div className="rounded-[var(--r-tile)] border border-app-line bg-app-surface p-3 text-center">
                                <p className="text-xs uppercase tracking-[0.12em] text-app-ink-muted">Icon</p>
                                <p className="mt-2 text-xl font-bold text-app-ink">{iconCount}</p>
                              </div>
                            </div>

                            <div className="flex gap-2 border-t border-app-line pt-4">
                              <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => navigate(`/vision-board/${board.id}`)}
                              >
                                <Edit className="h-4 w-4" />
                                Ch?nh s?a
                              </Button>
                              <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => navigate(`/vision-board/${board.id}`)}
                              >
                                <Eye className="h-4 w-4" />
                                M?
                              </Button>
                              <Button
                                variant="outline"
                                className="border-app-line text-app-ink-soft hover:bg-app-bg"
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
