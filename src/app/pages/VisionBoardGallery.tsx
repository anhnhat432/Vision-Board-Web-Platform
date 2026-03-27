import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  Calendar,
  Edit,
  Eye,
  Image as ImageIcon,
  Images,
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
import { deleteVisionBoard, getUserData, type UserData } from "../utils/storage";

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
    <div className="flex h-9 w-9 items-center justify-center rounded-full gradient-violet-pink text-white shadow-[0_14px_28px_-20px_rgba(109,40,217,0.62)]">
      <Icon className="h-4 w-4" />
    </div>
  );
}

export function VisionBoardGallery() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [boardToDelete, setBoardToDelete] = useState<string | null>(null);

  const loadData = useCallback(() => {
    const data = getUserData();
    setUserData(data);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteBoard = (boardId: string) => {
    setBoardToDelete(boardId);
  };

  const confirmDeleteBoard = () => {
    if (!boardToDelete) return;
    deleteVisionBoard(boardToDelete);
    setBoardToDelete(null);
    loadData();
  };

  const boardsByYear = useMemo(() => {
    if (!userData) return {};
    return userData.visionBoards.reduce((acc, board) => {
      if (!acc[board.year]) acc[board.year] = [];
      acc[board.year].push(board);
      return acc;
    }, {} as Record<string, typeof userData.visionBoards>);
  }, [userData]);

  const years = useMemo(
    () => Object.keys(boardsByYear).sort((a, b) => parseInt(b, 10) - parseInt(a, 10)),
    [boardsByYear],
  );

  if (!userData) return null;

  const totalItems = userData.visionBoards.reduce((sum, board) => sum + board.items.length, 0);
  const latestBoard = userData.visionBoards[userData.visionBoards.length - 1];
  const spotlightBoardId =
    typeof location.state === "object" &&
    location.state &&
    "spotlightBoardId" in location.state
      ? (location.state as { spotlightBoardId?: string }).spotlightBoardId
      : undefined;

  return (
    <div className="space-y-8 pb-12">
      <AlertDialog open={Boolean(boardToDelete)} onOpenChange={(open) => { if (!open) setBoardToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa bảng tầm nhìn này?</AlertDialogTitle>
            <AlertDialogDescription>
              Hành động này không thể hoàn tác. Toàn bộ hình ảnh, quote và biểu tượng trong board sẽ bị xóa vĩnh viễn.
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

      <InteractiveSurface className="rounded-[28px]" intensity={9} translate={22}>
        <Card interactive={false} className="hero-surface overflow-hidden border-0 text-white">
        <CardContent className="interactive-layer interactive-layer--medium relative p-5 sm:p-6 lg:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.12),_transparent_24%)] opacity-90" />

          <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_360px]">
            <div className="space-y-6">
              <div className="interactive-layer interactive-layer--soft inline-flex items-center gap-2 rounded-full border border-white/18 bg-white/10 px-4 py-1.5 text-sm text-white/82">
                <Images className="h-4 w-4" />
                Dear Our Future Library
              </div>

              <div className="space-y-4">
                <h1 className="max-w-3xl text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
                  Một thư viện nơi mọi bảng tầm nhìn của bạn được lưu lại như những phiên bản của tương lai.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-white/82 lg:text-lg">
                  Tại đây bạn có thể xem lại các board theo từng năm, tiếp tục chỉnh sửa, so sánh độ phong phú
                  của từng canvas và giữ cảm hứng luôn ở gần mình.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  className="hero-cta border-white/18 bg-white text-slate-900 hover:bg-white/92"
                  onClick={() => navigate("/vision-board")}
                >
                  <Plus className="h-4 w-4" />
                  Tạo bảng mới
                </Button>
                <Button
                  variant="outline"
                  className="border-white/18 bg-white/12 text-white hover:bg-white/18 hover:text-white"
                  onClick={() => navigate("/")}
                >
                  Về bảng điều khiển
                </Button>
              </div>
            </div>

            <div className="hidden xl:block interactive-layer interactive-layer--strong rounded-[32px] border border-white/14 bg-white/12 p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)] backdrop-blur-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/60">
                Snapshot thư viện
              </p>

              <div className="mt-6 space-y-4">
                <div className="rounded-[24px] border border-white/10 bg-black/12 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/55">Tổng số bảng</p>
                  <p className="mt-2 text-3xl font-bold text-white">{userData.visionBoards.length}</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/12 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/55">Tổng số phần tử</p>
                  <p className="mt-2 text-3xl font-bold text-white">{totalItems}</p>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/12 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/55">Board gần nhất</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {latestBoard ? latestBoard.name : "Chưa có board nào"}
                  </p>
                  <p className="mt-1 text-sm text-white/68">
                    {latestBoard ? `Năm ${latestBoard.year}` : "Bắt đầu với board đầu tiên của bạn."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      </InteractiveSurface>

      <div className="stagger-hover-grid grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: "Tổng số bảng",
            value: userData.visionBoards.length,
            note: "canvas đang lưu",
            icon: Images,
            color: "from-violet-500/18 to-fuchsia-500/10 text-violet-700",
          },
          {
            title: "Năm bao quát",
            value: years.length,
            note: "mốc thời gian có board",
            icon: Calendar,
            color: "from-sky-500/18 to-cyan-500/10 text-sky-700",
          },
          {
            title: "Tổng phần tử",
            value: totalItems,
            note: "ảnh, quote và icon",
            icon: Sparkles,
            color: "from-amber-500/18 to-orange-500/10 text-amber-700",
          },
          {
            title: "Trung bình mỗi board",
            value: userData.visionBoards.length ? Math.round(totalItems / userData.visionBoards.length) : 0,
            note: "mức độ phong phú của canvas",
            icon: ImageIcon,
            color: "from-emerald-500/18 to-teal-500/10 text-emerald-700",
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
                    <CardTitle className="mt-2 text-4xl">{item.value}</CardTitle>
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

      {userData.visionBoards.length === 0 ? (
        <Card className="overflow-hidden">
          <CardContent className="p-10 text-center lg:p-14">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-violet-50 text-violet-700">
              <Images className="h-10 w-10" />
            </div>
            <h2 className="mt-6 text-3xl font-bold text-slate-900">Thư viện của bạn vẫn còn trống</h2>
            <p className="mx-auto mt-3 max-w-2xl text-base text-slate-500">
              Hãy tạo bảng tầm nhìn đầu tiên để biến những hình dung trong đầu thành một không gian trực quan thật sự.
            </p>
            <Button className="mt-8" onClick={() => navigate("/vision-board")}>
              <Plus className="h-4 w-4" />
              Tạo bảng tầm nhìn đầu tiên
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {years.map((year) => (
            <section key={year} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-violet-50 text-violet-700">
                  <Calendar className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{year}</h2>
                  <p className="text-sm text-slate-500">
                    {boardsByYear[year].length} bảng được lưu trong năm này.
                  </p>
                </div>
              </div>

              <div className="stagger-hover-grid grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {boardsByYear[year].map((board, index) => {
                  const imageCount = board.items.filter((item) => item.type === "image").length;
                  const quoteCount = board.items.filter((item) => item.type === "quote").length;
                  const iconCount = board.items.filter((item) => item.type === "icon").length;
                  const isSpotlight = spotlightBoardId === board.id;

                  return (
                    <motion.div
                      key={board.id}
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={
                        isSpotlight
                          ? { opacity: 1, scale: [0.97, 1.02, 1], y: [12, -4, 0] }
                          : { opacity: 1, scale: 1, y: 0 }
                      }
                      transition={{ delay: index * 0.05, duration: isSpotlight ? 0.55 : 0.32 }}
                    >
                      <InteractiveSurface
                        className="preview-hover-card group rounded-[28px]"
                        intensity={7}
                        translate={16}
                      >
                      <Card
                        interactive={false}
                        className={isSpotlight ? "spotlight-card overflow-hidden" : "overflow-hidden"}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <CardTitle>{board.name}</CardTitle>
                                {isSpotlight && (
                                  <Badge
                                    variant="outline"
                                    className="spotlight-badge rounded-full border-0 px-3 py-1.5"
                                  >
                                    Vừa lưu
                                  </Badge>
                                )}
                              </div>
                              <CardDescription>
                                {new Date(board.createdAt).toLocaleDateString("vi-VN")} • {board.items.length} phần tử
                              </CardDescription>
                            </div>
                            <Badge variant="outline" className="rounded-full border-white/70 bg-white/72 px-3 py-1.5 text-slate-600">
                              {board.year}
                            </Badge>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                          <div
                            className="relative overflow-hidden rounded-[24px] border border-white/80 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.84),_transparent_24%),linear-gradient(135deg,_rgba(244,244,255,0.96)_0%,_rgba(251,244,255,0.94)_48%,_rgba(239,246,255,0.96)_100%)]"
                            style={{ aspectRatio: "16/10" }}
                          >
                            <div className="absolute inset-0 gradient-grid bg-[size:30px_30px] opacity-60" />
                            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,_rgba(15,23,42,0)_20%,_rgba(15,23,42,0.08)_100%)]" />

                            {board.items.length === 0 ? (
                              <div className="absolute inset-0 flex items-center justify-center">
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
                                      <div className="rounded-[16px] border border-white/80 bg-white/86 p-1.5 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.38)] backdrop-blur-xl">
                                        <ImageWithFallback
                                          src={item.content}
                                          alt="Phần tử bảng"
                                          className="rounded-[12px] shadow-sm w-full h-auto"
                                        />
                                      </div>
                                    )}
                                    {item.type === "quote" && (
                                      <div className="rounded-[14px] border border-white/80 bg-white/88 px-3 py-2 text-[10px] italic leading-4 text-slate-700 shadow-[0_14px_28px_-24px_rgba(15,23,42,0.38)]">
                                        {item.content}
                                      </div>
                                    )}
                                    {item.type === "icon" && <BoardPreviewIcon content={item.content} />}
                                  </div>
                                ))}
                              </div>
                            )}

                            <div className="preview-hover-overlay absolute inset-x-4 bottom-4 rounded-[20px] border border-white/22 bg-slate-950/52 px-4 py-3 text-white shadow-[0_20px_40px_-28px_rgba(15,23,42,0.72)] backdrop-blur-xl">
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <p className="text-[0.65rem] font-semibold uppercase tracking-[0.22em] text-white/58">
                                    Preview sống
                                  </p>
                                  <p className="mt-1 text-sm font-semibold">
                                    {imageCount} ảnh • {quoteCount} quote • {iconCount} biểu tượng
                                  </p>
                                </div>
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/16 bg-white/10">
                                  <Eye className="h-4 w-4" />
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            <div className="rounded-[20px] border border-white/70 bg-white/72 p-3 text-center">
                              <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Ảnh</p>
                              <p className="mt-2 text-xl font-bold text-slate-900">{imageCount}</p>
                            </div>
                            <div className="rounded-[20px] border border-white/70 bg-white/72 p-3 text-center">
                              <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Quote</p>
                              <p className="mt-2 text-xl font-bold text-slate-900">{quoteCount}</p>
                            </div>
                            <div className="rounded-[20px] border border-white/70 bg-white/72 p-3 text-center">
                              <p className="text-xs uppercase tracking-[0.12em] text-slate-400">Icon</p>
                              <p className="mt-2 text-xl font-bold text-slate-900">{iconCount}</p>
                            </div>
                          </div>

                          <div className="flex gap-2">
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
                    </motion.div>
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
